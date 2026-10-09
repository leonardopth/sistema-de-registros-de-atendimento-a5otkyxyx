import { ControlTowerEmailRecord, ControlTowerConfigRecord } from '@/types/control_tower'

export type PerformanceWindowDays = 7 | 30

export type AgingBucketKey = '<2h' | '2-4h' | '4-8h' | '8-24h' | '>24h'

export interface AgingBucket {
  key: AgingBucketKey
  label: string
  count: number
  percentage: number
  p1Count: number
  p2Count: number
  p3Count: number
  color: string
}

export interface SlaByPriority {
  priority: 'P1' | 'P2' | 'P3'
  total: number
  withinSla: number
  breached: number
  slaRate: number // % 0-100
  avgFirstResponseHours: number
}

export interface ControlTowerPerformanceStats {
  windowDays: PerformanceWindowDays
  // KPIs de topo do painel
  totalReceived: number
  totalResolved: number
  totalEscalated: number
  overallSlaRate: number // % dentro do SLA na janela
  avgFirstResponseHours: number
  activeBacklogCount: number

  // Comparações com a janela anterior
  diffReceivedPct: number // ex: +12% ou -5%
  diffResolvedPct: number
  diffEscalatedPct: number
  diffSlaRatePct: number
  diffFirstResponsePct: number

  // Detalhamento por prioridade
  byPriority: Record<'P1' | 'P2' | 'P3', SlaByPriority>
  allPriorities: SlaByPriority

  // Aging do Backlog
  agingBuckets: AgingBucket[]
}

/**
 * Calcula tempo em horas úteis respeitando o expediente configurado (ex: 08h-18h seg-sex).
 * Reutiliza exatamente o algoritmo do motor da Torre em pb_hooks.
 */
export function calcBizHours(
  startDateStr: string | undefined | null,
  endDateStr: string | undefined | null,
  config?: Partial<ControlTowerConfigRecord> | null,
): number {
  if (!startDateStr || !endDateStr) return 0
  const start = new Date(startDateStr)
  const end = new Date(endDateStr)
  if (isNaN(start.getTime()) || isNaN(end.getTime()) || end <= start) return 0

  const bStartParts = (config?.business_hours_start || '08:00').split(':')
  const bEndParts = (config?.business_hours_end || '18:00').split(':')
  const startHour = parseInt(bStartParts[0], 10) || 8
  const startMin = parseInt(bStartParts[1], 10) || 0
  const endHour = parseInt(bEndParts[0], 10) || 18
  const endMin = parseInt(bEndParts[1], 10) || 0
  const bDays =
    Array.isArray(config?.business_days) && config!.business_days.length > 0
      ? config!.business_days
      : [1, 2, 3, 4, 5]

  let totalMs = 0
  let cur = new Date(start.getTime())
  const maxDays = 90
  let dayCount = 0

  while (cur < end && dayCount < maxDays) {
    if (bDays.includes(cur.getDay())) {
      const dayStart = new Date(
        cur.getFullYear(),
        cur.getMonth(),
        cur.getDate(),
        startHour,
        startMin,
        0,
      )
      const dayEnd = new Date(cur.getFullYear(), cur.getMonth(), cur.getDate(), endHour, endMin, 0)

      const effStart = cur > dayStart ? cur : dayStart
      const effEnd = end < dayEnd ? end : dayEnd

      if (effStart < effEnd && effEnd > dayStart && effStart < dayEnd) {
        totalMs += effEnd.getTime() - effStart.getTime()
      }
    }
    cur = new Date(cur.getFullYear(), cur.getMonth(), cur.getDate() + 1, 0, 0, 0)
    dayCount++
  }

  return Math.round((totalMs / 3600000) * 10) / 10
}

/**
 * Classifica a idade de um e-mail ativo na caixa em horas úteis para a respectiva faixa de aging.
 */
export function getAgingBucketKey(hoursWaiting: number): AgingBucketKey {
  if (hoursWaiting < 2) return '<2h'
  if (hoursWaiting < 4) return '2-4h'
  if (hoursWaiting < 8) return '4-8h'
  if (hoursWaiting < 24) return '8-24h'
  return '>24h'
}

/**
 * Determina se um e-mail resolvido estava dentro do SLA:
 * - Se tiver sla_deadline: resolved_at <= sla_deadline
 * - Se tiver escalated_at e escalated_at anterior a resolved_at: fora do SLA
 * - Se não tiver resolved_at mas status for Resolvido: usa updated <= sla_deadline
 */
export function isEmailWithinSla(email: ControlTowerEmailRecord): boolean {
  if (email.status === 'Escalado') return false

  const deadlineStr = email.sla_deadline
  if (!deadlineStr) return true // Sem prazo definido, considera ok

  const deadline = new Date(deadlineStr).getTime()
  if (isNaN(deadline)) return true

  // Se foi escalado em algum momento
  if (email.escalated_at) {
    const escTime = new Date(email.escalated_at).getTime()
    if (!isNaN(escTime) && escTime <= deadline) {
      // Escalado antes ou durante o deadline
      return false
    }
    if (!isNaN(escTime) && escTime > deadline) {
      return false
    }
  }

  const completionTimeStr = email.resolved_at || email.updated
  const completionTime = completionTimeStr ? new Date(completionTimeStr).getTime() : Date.now()

  return completionTime <= deadline
}

/**
 * Extrai o tempo de 1ª resposta em horas úteis entre o recebimento da thread e o primeiro atendimento.
 */
export function getFirstResponseBizHours(
  email: ControlTowerEmailRecord,
  config?: Partial<ControlTowerConfigRecord> | null,
): number | null {
  const receivedAt = email.received_at || email.created
  const firstResponse = email.first_response_at || email.assigned_at
  if (!receivedAt || !firstResponse) return null

  return calcBizHours(receivedAt, firstResponse, config)
}

/**
 * Calcula todas as métricas consolidadas de desempenho da Torre de Controle
 * para uma janela de dias (7 ou 30), comparando contra a janela anterior de mesmo tamanho.
 */
export function computePerformanceStats(
  emails: ControlTowerEmailRecord[],
  windowDays: PerformanceWindowDays,
  config?: Partial<ControlTowerConfigRecord> | null,
  nowDate = new Date(),
): ControlTowerPerformanceStats {
  const nowMs = nowDate.getTime()
  const windowMs = windowDays * 86400000
  const curWindowStartMs = nowMs - windowMs
  const prevWindowStartMs = curWindowStartMs - windowMs

  // Filtrar apenas emails roots para não duplicar dados de threads filhas
  const rootEmails = emails.filter((e) => !e.is_thread_child && !e.is_noise)

  // Subconjuntos: Janela Atual vs Janela Anterior
  const curWindowEmails: ControlTowerEmailRecord[] = []
  const prevWindowEmails: ControlTowerEmailRecord[] = []

  // Backlog Ativo Atual (itens ainda abertos na fila)
  const activeBacklogEmails: ControlTowerEmailRecord[] = []

  rootEmails.forEach((e) => {
    const dateStr = e.received_at || e.created
    const timeMs = new Date(dateStr).getTime()

    // Itens ativos atuais (independente da data de chegada se ainda estiverem abertos)
    if (e.status === 'Novo' || e.status === 'Em tratamento' || e.status === 'Escalado') {
      activeBacklogEmails.push(e)
    }

    if (timeMs >= curWindowStartMs && timeMs <= nowMs) {
      curWindowEmails.push(e)
    } else if (timeMs >= prevWindowStartMs && timeMs < curWindowStartMs) {
      prevWindowEmails.push(e)
    }
  })

  // 1. Processamento da Janela Atual
  const totalReceived = curWindowEmails.length
  const resolvedList = curWindowEmails.filter((e) => e.status === 'Resolvido')
  const totalResolved = resolvedList.length
  const escalatedList = curWindowEmails.filter(
    (e) => e.status === 'Escalado' || Boolean(e.escalated_at),
  )
  const totalEscalated = escalatedList.length

  // % dentro do SLA (base: itens finalizados/resolvidos + itens escalados que estouraram)
  // Conversas avaliadas quanto a SLA = Resolvidos + Escalados
  const evaluatedSlaList = curWindowEmails.filter(
    (e) => e.status === 'Resolvido' || e.status === 'Escalado' || Boolean(e.escalated_at),
  )
  const withinSlaCount = evaluatedSlaList.filter((e) => isEmailWithinSla(e)).length
  const overallSlaRate =
    evaluatedSlaList.length > 0
      ? Math.round((withinSlaCount / evaluatedSlaList.length) * 1000) / 10
      : 100

  // Tempo médio de 1ª resposta na janela atual
  const firstResponseHoursList: number[] = []
  curWindowEmails.forEach((e) => {
    const frHours = getFirstResponseBizHours(e, config)
    if (frHours !== null && frHours >= 0) {
      firstResponseHoursList.push(frHours)
    }
  })
  const avgFirstResponseHours =
    firstResponseHoursList.length > 0
      ? Math.round(
          (firstResponseHoursList.reduce((acc, v) => acc + v, 0) / firstResponseHoursList.length) *
            10,
        ) / 10
      : 0

  // 2. Processamento da Janela Anterior para cálculo de variação
  const prevReceived = prevWindowEmails.length
  const prevResolved = prevWindowEmails.filter((e) => e.status === 'Resolvido').length
  const prevEscalated = prevWindowEmails.filter(
    (e) => e.status === 'Escalado' || Boolean(e.escalated_at),
  ).length
  const prevEvaluatedSla = prevWindowEmails.filter(
    (e) => e.status === 'Resolvido' || e.status === 'Escalado' || Boolean(e.escalated_at),
  )
  const prevWithinSla = prevEvaluatedSla.filter((e) => isEmailWithinSla(e)).length
  const prevSlaRate =
    prevEvaluatedSla.length > 0
      ? Math.round((prevWithinSla / prevEvaluatedSla.length) * 1000) / 10
      : 100

  const prevFrList: number[] = []
  prevWindowEmails.forEach((e) => {
    const fr = getFirstResponseBizHours(e, config)
    if (fr !== null && fr >= 0) prevFrList.push(fr)
  })
  const prevAvgFr =
    prevFrList.length > 0 ? prevFrList.reduce((acc, v) => acc + v, 0) / prevFrList.length : 0

  // Variações percentuais
  const calcDiffPct = (cur: number, prev: number) => {
    if (prev === 0) return cur > 0 ? 100 : 0
    return Math.round(((cur - prev) / prev) * 100)
  }

  const diffReceivedPct = calcDiffPct(totalReceived, prevReceived)
  const diffResolvedPct = calcDiffPct(totalResolved, prevResolved)
  const diffEscalatedPct = calcDiffPct(totalEscalated, prevEscalated)
  const diffSlaRatePct = Math.round((overallSlaRate - prevSlaRate) * 10) / 10 // pontos percentuais
  const diffFirstResponsePct = calcDiffPct(avgFirstResponseHours, prevAvgFr)

  // 3. Quebra por Prioridade (P1, P2, P3) na Janela Atual
  const priorities: Array<'P1' | 'P2' | 'P3'> = ['P1', 'P2', 'P3']
  const byPriority: Record<'P1' | 'P2' | 'P3', SlaByPriority> = {
    P1: {
      priority: 'P1',
      total: 0,
      withinSla: 0,
      breached: 0,
      slaRate: 100,
      avgFirstResponseHours: 0,
    },
    P2: {
      priority: 'P2',
      total: 0,
      withinSla: 0,
      breached: 0,
      slaRate: 100,
      avgFirstResponseHours: 0,
    },
    P3: {
      priority: 'P3',
      total: 0,
      withinSla: 0,
      breached: 0,
      slaRate: 100,
      avgFirstResponseHours: 0,
    },
  }

  priorities.forEach((prio) => {
    const prioEmails = curWindowEmails.filter((e) => e.priority === prio)
    const prioSlaEvaluated = prioEmails.filter(
      (e) => e.status === 'Resolvido' || e.status === 'Escalado' || Boolean(e.escalated_at),
    )
    const prioWithin = prioSlaEvaluated.filter((e) => isEmailWithinSla(e)).length
    const prioBreached = prioSlaEvaluated.length - prioWithin
    const prioRate =
      prioSlaEvaluated.length > 0
        ? Math.round((prioWithin / prioSlaEvaluated.length) * 1000) / 10
        : 100

    const prioFrList: number[] = []
    prioEmails.forEach((e) => {
      const fr = getFirstResponseBizHours(e, config)
      if (fr !== null && fr >= 0) prioFrList.push(fr)
    })
    const prioAvgFr =
      prioFrList.length > 0
        ? Math.round((prioFrList.reduce((acc, v) => acc + v, 0) / prioFrList.length) * 10) / 10
        : 0

    byPriority[prio] = {
      priority: prio,
      total: prioEmails.length,
      withinSla: prioWithin,
      breached: prioBreached,
      slaRate: prioRate,
      avgFirstResponseHours: prioAvgFr,
    }
  })

  const allPriorities: SlaByPriority = {
    priority: 'P1', // chave representativa
    total: totalReceived,
    withinSla: withinSlaCount,
    breached: evaluatedSlaList.length - withinSlaCount,
    slaRate: overallSlaRate,
    avgFirstResponseHours: avgFirstResponseHours,
  }

  // 4. Aging do Backlog Ativo por Faixa (<2h, 2-4h, 4-8h, 8-24h, >24h)
  const bucketDefs: Array<{ key: AgingBucketKey; label: string; color: string }> = [
    { key: '<2h', label: '< 2h úteis', color: '#10b981' }, // Verde
    { key: '2-4h', label: '2 a 4h', color: '#06b6d4' }, // Ciano
    { key: '4-8h', label: '4 a 8h', color: '#f59e0b' }, // Âmbar
    { key: '8-24h', label: '8 a 24h', color: '#f97316' }, // Laranja
    { key: '>24h', label: '> 24h úteis', color: '#ef4444' }, // Vermelho
  ]

  const bucketCounts: Record<
    AgingBucketKey,
    { count: number; p1Count: number; p2Count: number; p3Count: number }
  > = {
    '<2h': { count: 0, p1Count: 0, p2Count: 0, p3Count: 0 },
    '2-4h': { count: 0, p1Count: 0, p2Count: 0, p3Count: 0 },
    '4-8h': { count: 0, p1Count: 0, p2Count: 0, p3Count: 0 },
    '8-24h': { count: 0, p1Count: 0, p2Count: 0, p3Count: 0 },
    '>24h': { count: 0, p1Count: 0, p2Count: 0, p3Count: 0 },
  }

  activeBacklogEmails.forEach((e) => {
    // Se o backend já calculou business_hours_waiting, usamos; senão calculamos em tempo real
    const waitingHours =
      typeof e.business_hours_waiting === 'number' && e.business_hours_waiting > 0
        ? e.business_hours_waiting
        : calcBizHours(e.received_at || e.created, nowDate.toISOString(), config)

    const bKey = getAgingBucketKey(waitingHours)
    bucketCounts[bKey].count++
    if (e.priority === 'P1') bucketCounts[bKey].p1Count++
    else if (e.priority === 'P2') bucketCounts[bKey].p2Count++
    else bucketCounts[bKey].p3Count++
  })

  const totalActive = activeBacklogEmails.length
  const agingBuckets: AgingBucket[] = bucketDefs.map((def) => {
    const data = bucketCounts[def.key]
    const pct = totalActive > 0 ? Math.round((data.count / totalActive) * 1000) / 10 : 0
    return {
      key: def.key,
      label: def.label,
      count: data.count,
      percentage: pct,
      p1Count: data.p1Count,
      p2Count: data.p2Count,
      p3Count: data.p3Count,
      color: def.color,
    }
  })

  return {
    windowDays,
    totalReceived,
    totalResolved,
    totalEscalated,
    overallSlaRate,
    avgFirstResponseHours,
    activeBacklogCount: totalActive,
    diffReceivedPct,
    diffResolvedPct,
    diffEscalatedPct,
    diffSlaRatePct,
    diffFirstResponsePct,
    byPriority,
    allPriorities,
    agingBuckets,
  }
}
