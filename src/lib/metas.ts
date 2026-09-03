import type { UserRecord, GlobalTargetRecord, ServiceRecord } from '@/types/service_record'
import type { UserTargetRecord } from '@/services/user-targets'
import { TIMEZONE } from '@/lib/timezone'

/** Funções/papéis com permissão de gestão sobre metas. */
export const MANAGER_ROLES = ['Gerente', 'Supervisor', 'Líder', 'Master']

/** Cargos de liderança cujas métricas de metas são calculadas pela consolidação/somatória da equipe */
export const LEADERSHIP_ROLES = [
  'Supervisor',
  'Líder',
  'Gerente',
  'Gestor Comercial',
  'Supervisores',
  'Líderes',
  'Gerentes',
]

export function isLeadershipRole(role?: string): boolean {
  if (!role) return false
  return LEADERSHIP_ROLES.includes(role)
}

export function canManageTargets(role?: string, masterAccess?: boolean): boolean {
  if (!role) return false
  if (MANAGER_ROLES.includes(role)) return true
  return masterAccess === true
}

export type Status = 'atingiu' | 'perto' | 'abaixo'

export const STATUS_STYLES: Record<Status, { bar: string; badge: string; label: string }> = {
  atingiu: {
    bar: 'bg-emerald-500',
    badge: 'bg-emerald-100 text-emerald-700',
    label: 'Atingiu',
  },
  perto: {
    bar: 'bg-amber-500',
    badge: 'bg-amber-100 text-amber-700',
    label: 'Perto',
  },
  abaixo: {
    bar: 'bg-rose-500',
    badge: 'bg-rose-100 text-rose-700',
    label: 'Abaixo',
  },
}

export function getAttendanceStatus(real: number, target: number): Status {
  if (target <= 0) return 'atingiu'
  const ratio = real / target
  if (ratio >= 1) return 'atingiu'
  if (ratio >= 0.8) return 'perto'
  return 'abaixo'
}

export function getResolutionStatus(realRate: number, minRate: number): Status {
  if (minRate <= 0) return 'atingiu'
  if (realRate >= minRate) return 'atingiu'
  if (realRate >= minRate - 10) return 'perto'
  return 'abaixo'
}

export function getOverallStatus(a: Status, r: Status): Status {
  if (a === 'atingiu' && r === 'atingiu') return 'atingiu'
  if (a === 'abaixo' || r === 'abaixo') return 'abaixo'
  return 'perto'
}

export function getResponseTimeStatus(realAvgMinutes: number, targetMaxMinutes: number): Status {
  if (targetMaxMinutes <= 0) return 'atingiu'
  if (realAvgMinutes <= targetMaxMinutes) return 'atingiu'
  if (realAvgMinutes <= targetMaxMinutes * 1.25) return 'perto'
  return 'abaixo'
}

export function getAutoCategorizationStatus(realRate: number, targetRate: number): Status {
  if (targetRate <= 0) return 'atingiu'
  if (realRate >= targetRate) return 'atingiu'
  if (realRate >= targetRate - 10) return 'perto'
  return 'abaixo'
}

export function getSatisfactionStatus(realScore: number, minScore: number): Status {
  if (minScore <= 0) return 'atingiu'
  if (realScore >= minScore) return 'atingiu'
  if (realScore >= minScore - 10) return 'perto'
  return 'abaixo'
}

export interface EffectiveTarget {
  /** 'individual' = meta própria do colaborador; 'global' = meta padrão herdada. */
  source: 'individual' | 'global'
  monthly_attendance_target: number
  min_resolution_rate: number
  avg_response_time_target: number
  auto_categorization_target: number
  min_satisfaction_target: number
  targetRecord?: UserTargetRecord
}

/**
 * Resolve a meta efetiva de um colaborador (usuário interno): prevalece individual sobre global.
 */
export function resolveEffectiveTarget(
  userId: string,
  targets: UserTargetRecord[],
  global: GlobalTargetRecord,
): EffectiveTarget {
  const individual = targets.find((t) => t.user === userId)
  if (individual) {
    return {
      source: 'individual',
      monthly_attendance_target:
        individual.monthly_attendance_target ?? global.monthly_attendance_target ?? 100,
      min_resolution_rate: individual.min_resolution_rate ?? global.min_resolution_rate ?? 80,
      avg_response_time_target:
        individual.avg_response_time_target ?? global.avg_response_time_target ?? 15,
      auto_categorization_target:
        individual.auto_categorization_target ?? global.auto_categorization_target ?? 80,
      min_satisfaction_target:
        individual.min_satisfaction_target ?? global.min_satisfaction_target ?? 85,
      targetRecord: individual,
    }
  }
  return {
    source: 'global',
    monthly_attendance_target: global.monthly_attendance_target ?? 100,
    min_resolution_rate: global.min_resolution_rate ?? 80,
    avg_response_time_target: global.avg_response_time_target ?? 15,
    auto_categorization_target: global.auto_categorization_target ?? 80,
    min_satisfaction_target: global.min_satisfaction_target ?? 85,
  }
}

export interface UserRealStats {
  total: number
  resolved: number
  rate: number
  avgDuration: number // minutos (tempo médio de resposta/atendimento)
  avoidableCount: number
  avoidableRate: number
  autoCategorizedCount: number
  autoCategorizedRate: number // % categorização automática
  categorizationAccuracy: number // % acurácia da categorização
  avgSatisfactionScore: number // pontuação média de qualidade/satisfação (0-100)
  positiveSentimentCount: number
  totalFeedbackCount: number
  reopenedCount: number
  reopenRate: number
  isTeamConsolidated?: boolean
  teamMemberCount?: number
}

/**
 * Retorna os IDs dos membros da equipe sob liderança de um usuário (supervisor, líder, gerente).
 * Regra:
 * - Se for cargo de liderança: membros que têm o líder como supervisor_id ou pertencem ao mesmo grupo de serviço sob gestão do líder.
 * - Caso o líder não tenha grupos restritos, inclui os consultores/liderados.
 * - Caso não seja líder, retorna apenas o próprio ID do usuário.
 */
export function getTeamMembersForLeader(leader: UserRecord, allUsers: UserRecord[]): UserRecord[] {
  if (!isLeadershipRole(leader.role)) {
    return [leader]
  }

  const leaderGroups = (leader.service_groups as string[] | undefined) || []
  const teamMap = new Map<string, UserRecord>()
  // Sempre inclui o próprio líder
  teamMap.set(leader.id, leader)

  for (const other of allUsers) {
    if (other.id === leader.id) continue

    // 1. Vínculo direto por supervisor_id
    const otherSupervisorId = (other as any).supervisor_id
    if (otherSupervisorId && otherSupervisorId === leader.id) {
      teamMap.set(other.id, other)
      continue
    }

    // 2. Mesmos grupos de serviço sob gestão do líder
    if (leaderGroups.length > 0) {
      const otherGroups = (other.service_groups as string[] | undefined) || []
      const hasCommonGroup = otherGroups.some((g) => leaderGroups.includes(g))
      if (hasCommonGroup) {
        teamMap.set(other.id, other)
      }
    } else {
      // Líder geral sem grupos específicos — equipe abrange consultores
      if (other.role === 'Consultor' || other.role === ('Consultores' as any)) {
        teamMap.set(other.id, other)
      }
    }
  }

  return Array.from(teamMap.values())
}

export interface SentimentLogItem {
  user_id?: string
  processed_by?: string
  agent_user?: string
  sentiment?: string
  quality_score?: number
  confidence_score?: number
  created?: string
}

/** Agrupa estatísticas reais por colaborador/usuário para um mês/ano específicos (GMT-3). */
export function computeStatsByUserForMonth(
  records: ServiceRecord[],
  year: number,
  month: number, // 0-based
  sentimentLogs?: SentimentLogItem[],
): Map<string, UserRealStats> {
  const map = new Map<string, UserRealStats>()
  for (const r of records) {
    const uid = r.assigned_user || r.user_id
    if (!uid) continue
    const parts = getGMT3MonthParts(r.created)
    if (!parts) continue
    if (parts.year !== year || parts.month !== month) continue

    const cur = map.get(uid) || {
      total: 0,
      resolved: 0,
      rate: 0,
      avgDuration: 0,
      avoidableCount: 0,
      avoidableRate: 0,
      autoCategorizedCount: 0,
      autoCategorizedRate: 0,
      categorizationAccuracy: 90,
      avgSatisfactionScore: 90,
      positiveSentimentCount: 0,
      totalFeedbackCount: 0,
      reopenedCount: 0,
      reopenRate: 0,
    }

    cur.total += 1
    if (r.status === 'Concluído') cur.resolved += 1
    if (r.avoidable_contact) cur.avoidableCount += 1
    cur.avgDuration += r.duration || 0
    if (
      r.is_reopened ||
      (r.reopen_count && r.reopen_count > 0) ||
      Boolean(r.reopen_justification)
    ) {
      cur.reopenedCount += 1
    }
    // Considera categorizado se possui motivo específico diferente de 'Outros'
    if (r.contact_reason && (r.contact_reason as string) !== 'Outros') {
      cur.autoCategorizedCount = (cur.autoCategorizedCount || 0) + 1
    }

    map.set(uid, cur)
  }

  // Se houver logs de sentimento das integrações (Outlook / Telefonia), incorpora
  if (sentimentLogs && Array.isArray(sentimentLogs)) {
    for (const log of sentimentLogs) {
      const uid = log.processed_by || log.agent_user || log.user_id
      if (!uid) continue
      const parts = getGMT3MonthParts(log.created)
      if (parts && (parts.year !== year || parts.month !== month)) continue

      const cur = map.get(uid)
      if (cur) {
        cur.totalFeedbackCount += 1
        if (log.sentiment === 'Positivo') {
          cur.positiveSentimentCount += 1
        }
      }
    }
  }

  for (const [, v] of map) {
    v.rate = v.total > 0 ? Math.round((v.resolved / v.total) * 100) : 0
    v.avoidableRate = v.total > 0 ? Math.round((v.avoidableCount / v.total) * 100) : 0
    v.avgDuration = v.total > 0 ? Number((v.avgDuration / v.total).toFixed(1)) : 0
    v.reopenRate = v.total > 0 ? Math.round((v.reopenedCount / v.total) * 100) : 0
    v.autoCategorizedRate =
      v.total > 0 ? Math.round(((v.autoCategorizedCount || 0) / v.total) * 100) : 0
    // Acurácia da categorização estimada pela proporção de contatos categorizados assertivos
    v.categorizationAccuracy =
      v.autoCategorizedCount > 0
        ? Math.max(75, Math.min(99, Math.round(100 - v.avoidableRate * 0.4)))
        : 85

    // Satisfação do cliente: baseada em sentimentos das integrações ou modelo de resolução/assertividade
    if (v.totalFeedbackCount > 0) {
      const sentimentScore = Math.round((v.positiveSentimentCount / v.totalFeedbackCount) * 100)
      v.avgSatisfactionScore = Math.max(
        60,
        Math.min(100, Math.round(sentimentScore * 0.6 + v.rate * 0.4)),
      )
    } else {
      v.avgSatisfactionScore = Math.max(
        60,
        Math.min(100, Math.round(v.rate * 0.65 + (100 - v.avoidableRate) * 0.35)),
      )
    }
  }
  return map
}

/** Estatísticas reais do mês corrente por colaborador (GMT-3). */
export function computeCurrentMonthStats(
  records: ServiceRecord[],
  sentimentLogs?: SentimentLogItem[],
): Map<string, UserRealStats> {
  const now = currentGMT3Date()
  return computeStatsByUserForMonth(records, now.year, now.month, sentimentLogs)
}

/**
 * Consolida estatísticas agregadas (somatória e médias ponderadas) da equipe de um líder
 * a partir do mapa de estatísticas individuais.
 */
export function aggregateTeamStats(
  teamMembers: UserRecord[],
  individualStatsMap: Map<string, UserRealStats>,
): UserRealStats {
  let total = 0
  let resolved = 0
  let avoidableCount = 0
  let autoCategorizedCount = 0
  let totalDurationWeight = 0
  let totalCategorizationAccuracyWeight = 0
  let totalSatisfactionWeight = 0
  let positiveSentimentCount = 0
  let totalFeedbackCount = 0
  let reopenedCount = 0

  for (const member of teamMembers) {
    const memberStat = individualStatsMap.get(member.id)
    if (!memberStat) continue

    total += memberStat.total
    resolved += memberStat.resolved
    avoidableCount += memberStat.avoidableCount
    autoCategorizedCount += memberStat.autoCategorizedCount
    totalDurationWeight += memberStat.avgDuration * memberStat.total
    totalCategorizationAccuracyWeight += memberStat.categorizationAccuracy * memberStat.total
    totalSatisfactionWeight += memberStat.avgSatisfactionScore * memberStat.total
    positiveSentimentCount += memberStat.positiveSentimentCount
    totalFeedbackCount += memberStat.totalFeedbackCount
    reopenedCount += memberStat.reopenedCount || 0
  }

  const rate = total > 0 ? Math.round((resolved / total) * 100) : 0
  const reopenRate = total > 0 ? Math.round((reopenedCount / total) * 100) : 0
  const avoidableRate = total > 0 ? Math.round((avoidableCount / total) * 100) : 0
  const avgDuration = total > 0 ? Number((totalDurationWeight / total).toFixed(1)) : 0
  const autoCategorizedRate = total > 0 ? Math.round((autoCategorizedCount / total) * 100) : 0
  const categorizationAccuracy =
    total > 0
      ? Math.round(totalCategorizationAccuracyWeight / total)
      : autoCategorizedCount > 0
        ? Math.max(75, Math.min(99, Math.round(100 - avoidableRate * 0.4)))
        : 85

  let avgSatisfactionScore = 90
  if (totalFeedbackCount > 0) {
    const sentimentScore = Math.round((positiveSentimentCount / totalFeedbackCount) * 100)
    avgSatisfactionScore = Math.max(
      60,
      Math.min(100, Math.round(sentimentScore * 0.6 + rate * 0.4)),
    )
  } else if (total > 0) {
    avgSatisfactionScore = Math.max(60, Math.min(100, Math.round(totalSatisfactionWeight / total)))
  }

  return {
    total,
    resolved,
    rate,
    avgDuration,
    avoidableCount,
    avoidableRate,
    autoCategorizedCount,
    autoCategorizedRate,
    categorizationAccuracy,
    avgSatisfactionScore,
    positiveSentimentCount,
    totalFeedbackCount,
    reopenedCount,
    reopenRate,
    isTeamConsolidated: true,
    teamMemberCount: teamMembers.length,
  }
}

/**
 * Computa estatísticas do mês corrente aplicando agregação de equipe para cargos de liderança
 * e mantendo individual para os demais.
 */
export function computeEffectiveStatsByUsers(
  users: UserRecord[],
  records: ServiceRecord[],
  sentimentLogs?: SentimentLogItem[],
): Map<string, UserRealStats> {
  const individualStats = computeCurrentMonthStats(records, sentimentLogs)
  const resultMap = new Map<string, UserRealStats>()

  for (const u of users) {
    if (isLeadershipRole(u.role)) {
      const team = getTeamMembersForLeader(u, users)
      const agg = aggregateTeamStats(team, individualStats)
      resultMap.set(u.id, agg)
    } else {
      const stat = individualStats.get(u.id) || {
        total: 0,
        resolved: 0,
        rate: 0,
        avgDuration: 0,
        avoidableCount: 0,
        avoidableRate: 0,
        autoCategorizedCount: 0,
        autoCategorizedRate: 0,
        categorizationAccuracy: 90,
        avgSatisfactionScore: 90,
        positiveSentimentCount: 0,
        totalFeedbackCount: 0,
        reopenedCount: 0,
        reopenRate: 0,
        isTeamConsolidated: false,
      }
      resultMap.set(u.id, stat)
    }
  }

  return resultMap
}

export interface MonthParts {
  year: number
  month: number // 0-based
}

/** Extrai ano/mês (0-based) de uma string ISO usando o fuso GMT-3. */
export function getGMT3MonthParts(isoString: string | undefined): MonthParts | null {
  if (!isoString) return null
  const d = new Date(isoString)
  if (isNaN(d.getTime())) return null
  const parts = new Intl.DateTimeFormat('en-CA', {
    timeZone: TIMEZONE,
    year: 'numeric',
    month: '2-digit',
  }).formatToParts(d)
  const y = parseInt(parts.find((p) => p.type === 'year')?.value || '0', 10)
  const m = parseInt(parts.find((p) => p.type === 'month')?.value || '0', 10)
  if (!y || !m) return null
  return { year: y, month: m - 1 }
}

/** Ano/mês corrente em GMT-3. */
export function currentGMT3Date(): MonthParts {
  return getGMT3MonthParts(new Date().toISOString()) || { year: 1970, month: 0 }
}

/** Nome do mês em pt-BR. */
export function monthLabel(year: number, month: number): string {
  const d = new Date(Date.UTC(year, month, 1, 12, 0, 0))
  return d.toLocaleDateString('pt-BR', { month: 'long', year: 'numeric', timeZone: TIMEZONE })
}

export interface HistoryRow {
  year: number
  month: number // 0-based
  label: string
  attendanceTarget: number
  minResolutionRate: number
  real: UserRealStats
  attendanceStatus: Status
  resolutionStatus: Status
  overall: Status
  hit: boolean
}

/**
 * Gera o histórico mensal (últimos N meses) para um colaborador interno.
 */
/** Agrupa estatísticas reais por agente para um mês/ano específicos (GMT-3). */
export function computeStatsByAgentForMonth(
  records: ServiceRecord[],
  year: number,
  month: number, // 0-based
): Map<string, UserRealStats> {
  const map = new Map<string, UserRealStats>()
  for (const r of records) {
    const aid = r.agent
    if (!aid) continue
    const parts = getGMT3MonthParts(r.created)
    if (!parts) continue
    if (parts.year !== year || parts.month !== month) continue

    const cur = map.get(aid) || {
      total: 0,
      resolved: 0,
      rate: 0,
      avgDuration: 0,
      avoidableCount: 0,
      avoidableRate: 0,
      autoCategorizedCount: 0,
      autoCategorizedRate: 0,
      categorizationAccuracy: 90,
      avgSatisfactionScore: 90,
      positiveSentimentCount: 0,
      totalFeedbackCount: 0,
      reopenedCount: 0,
      reopenRate: 0,
    }

    cur.total += 1
    if (r.status === 'Concluído') cur.resolved += 1
    if (r.avoidable_contact) cur.avoidableCount += 1
    cur.avgDuration += r.duration || 0
    if (
      r.is_reopened ||
      (r.reopen_count && r.reopen_count > 0) ||
      Boolean(r.reopen_justification)
    ) {
      cur.reopenedCount += 1
    }

    map.set(aid, cur)
  }

  for (const [, v] of map) {
    v.rate = v.total > 0 ? Math.round((v.resolved / v.total) * 100) : 0
    v.avoidableRate = v.total > 0 ? Math.round((v.avoidableCount / v.total) * 100) : 0
    v.avgDuration = v.total > 0 ? Math.round(v.avgDuration / v.total) : 0
    v.reopenRate = v.total > 0 ? Math.round((v.reopenedCount / v.total) * 100) : 0
  }
  return map
}

/**
 * Gera o histórico mensal (últimos N meses) para um agente externo.
 */
export function buildAgentHistory(
  agentId: string,
  records: ServiceRecord[],
  effective: EffectiveTarget,
  monthsBack = 12,
): HistoryRow[] {
  const out: HistoryRow[] = []
  const now = currentGMT3Date()
  for (let i = 0; i < monthsBack; i++) {
    const d = new Date(Date.UTC(now.year, now.month - i, 1, 12, 0, 0))
    const year = d.getUTCFullYear()
    const month = d.getUTCMonth()
    const statsMap = computeStatsByAgentForMonth(records, year, month)
    const real = statsMap.get(agentId) || {
      total: 0,
      resolved: 0,
      rate: 0,
      avgDuration: 0,
      avoidableCount: 0,
      avoidableRate: 0,
      autoCategorizedCount: 0,
      autoCategorizedRate: 0,
      categorizationAccuracy: 90,
      avgSatisfactionScore: 90,
      positiveSentimentCount: 0,
      totalFeedbackCount: 0,
      reopenedCount: 0,
      reopenRate: 0,
    }
    const attendanceStatus = getAttendanceStatus(real.total, effective.monthly_attendance_target)
    const resolutionStatus = getResolutionStatus(real.rate, effective.min_resolution_rate)
    const overall = getOverallStatus(attendanceStatus, resolutionStatus)
    out.push({
      year,
      month,
      label: monthLabel(year, month),
      attendanceTarget: effective.monthly_attendance_target,
      minResolutionRate: effective.min_resolution_rate,
      real,
      attendanceStatus,
      resolutionStatus,
      overall,
      hit: attendanceStatus !== 'abaixo' && resolutionStatus !== 'abaixo',
    })
  }
  return out
}

export function buildUserHistory(
  userId: string,
  records: ServiceRecord[],
  effective: EffectiveTarget,
  monthsBack = 12,
  sentimentLogs?: SentimentLogItem[],
  allUsers?: UserRecord[],
): HistoryRow[] {
  const out: HistoryRow[] = []
  const now = currentGMT3Date()
  const targetUser = allUsers?.find((u) => u.id === userId)
  const isLeader = targetUser ? isLeadershipRole(targetUser.role) : false
  const teamMembers =
    targetUser && allUsers && isLeader ? getTeamMembersForLeader(targetUser, allUsers) : []

  for (let i = 0; i < monthsBack; i++) {
    const d = new Date(Date.UTC(now.year, now.month - i, 1, 12, 0, 0))
    const year = d.getUTCFullYear()
    const month = d.getUTCMonth()
    const statsMap = computeStatsByUserForMonth(records, year, month, sentimentLogs)

    let real: UserRealStats
    if (isLeader && teamMembers.length > 0) {
      real = aggregateTeamStats(teamMembers, statsMap)
    } else {
      real = statsMap.get(userId) || {
        total: 0,
        resolved: 0,
        rate: 0,
        avgDuration: 0,
        avoidableCount: 0,
        avoidableRate: 0,
        autoCategorizedCount: 0,
        autoCategorizedRate: 0,
        categorizationAccuracy: 90,
        avgSatisfactionScore: 90,
        positiveSentimentCount: 0,
        totalFeedbackCount: 0,
        reopenedCount: 0,
        reopenRate: 0,
      }
    }

    const attendanceStatus = getAttendanceStatus(real.total, effective.monthly_attendance_target)
    const resolutionStatus = getResolutionStatus(real.rate, effective.min_resolution_rate)
    const overall = getOverallStatus(attendanceStatus, resolutionStatus)
    out.push({
      year,
      month,
      label: monthLabel(year, month),
      attendanceTarget: effective.monthly_attendance_target,
      minResolutionRate: effective.min_resolution_rate,
      real,
      attendanceStatus,
      resolutionStatus,
      overall,
      hit: attendanceStatus !== 'abaixo' && resolutionStatus !== 'abaixo',
    })
  }
  return out
}

export interface PerformanceAlert {
  userId: string
  userName: string
  userRole?: string
  isLeader?: boolean
  type: 'attendance' | 'resolution'
  metricLabel: string
  realValue: number
  expectedValue: number
  realDisplay: string
  expectedDisplay: string
  ratio: number
}

/**
 * Calcula alertas de desempenho para colaboradores e lideranças:
 * - Para cargos de liderança: as métricas avaliadas refletem o consolidado da equipe.
 * - Atendimentos: abaixo de 50% da meta do mês corrente.
 * - Resolução: taxa real > 20 p.p. abaixo do mínimo.
 */
export function computePerformanceAlerts(
  users: UserRecord[],
  targets: UserTargetRecord[],
  global: GlobalTargetRecord,
  records: ServiceRecord[],
  sentimentLogs?: SentimentLogItem[],
): PerformanceAlert[] {
  const stats = computeEffectiveStatsByUsers(users, records, sentimentLogs)
  const alerts: PerformanceAlert[] = []
  for (const u of users) {
    const eff = resolveEffectiveTarget(u.id, targets, global)
    const isLdr = isLeadershipRole(u.role)
    const real = stats.get(u.id) || {
      total: 0,
      resolved: 0,
      rate: 0,
      avgDuration: 0,
      avoidableCount: 0,
      avoidableRate: 0,
      autoCategorizedCount: 0,
      autoCategorizedRate: 0,
      categorizationAccuracy: 90,
      avgSatisfactionScore: 90,
      positiveSentimentCount: 0,
      totalFeedbackCount: 0,
      reopenedCount: 0,
      reopenRate: 0,
    }

    if (eff.monthly_attendance_target > 0) {
      const ratio = real.total / eff.monthly_attendance_target
      if (ratio < 0.5) {
        alerts.push({
          userId: u.id,
          userName: u.name,
          userRole: u.role,
          isLeader: isLdr,
          type: 'attendance',
          metricLabel: isLdr ? 'Atendimentos da Equipe' : 'Atendimentos',
          realValue: real.total,
          expectedValue: eff.monthly_attendance_target,
          realDisplay: String(real.total),
          expectedDisplay: String(eff.monthly_attendance_target),
          ratio,
        })
      }
    }

    if (eff.min_resolution_rate > 0 && real.total > 0) {
      const diff = eff.min_resolution_rate - real.rate
      if (diff > 20) {
        alerts.push({
          userId: u.id,
          userName: u.name,
          userRole: u.role,
          isLeader: isLdr,
          type: 'resolution',
          metricLabel: isLdr ? 'Taxa de Resolução da Equipe' : 'Taxa de Resolução',
          realValue: real.rate,
          expectedValue: eff.min_resolution_rate,
          realDisplay: `${real.rate}%`,
          expectedDisplay: `${eff.min_resolution_rate}%`,
          ratio: diff,
        })
      }
    }
  }

  alerts.sort((a, b) => {
    if (a.type !== b.type) return a.type === 'resolution' ? -1 : 1
    return a.ratio - b.ratio
  })
  return alerts
}

/** Linha de comparativo para exportação CSV/PDF de colaboradores. */
export interface ComparisonRow {
  userName: string
  userRole?: string
  isLeader?: boolean
  source: 'individual' | 'global'
  attendanceTarget: number
  realAttendance: number
  attendancePct: number
  minResolutionRate: number
  realResolutionRate: number
  avgResponseTimeTarget: number
  avgDuration: number
  autoCategorizationTarget: number
  autoCategorizedCount: number
  autoCategorizedRate: number
  categorizationAccuracy: number
  minSatisfactionTarget: number
  avgSatisfactionScore: number
  attendanceStatus: Status
  resolutionStatus: Status
  responseTimeStatus: Status
  autoCategorizationStatus: Status
  satisfactionStatus: Status
  overall: Status
}

export function buildComparisonRows(
  users: UserRecord[],
  targets: UserTargetRecord[],
  global: GlobalTargetRecord,
  records: ServiceRecord[],
  sentimentLogs?: SentimentLogItem[],
): ComparisonRow[] {
  const stats = computeEffectiveStatsByUsers(users, records, sentimentLogs)
  return users
    .map((u) => {
      const eff = resolveEffectiveTarget(u.id, targets, global)
      const isLdr = isLeadershipRole(u.role)
      const real = stats.get(u.id) || {
        total: 0,
        resolved: 0,
        rate: 0,
        avgDuration: 0,
        avoidableCount: 0,
        avoidableRate: 0,
        autoCategorizedCount: 0,
        autoCategorizedRate: 0,
        categorizationAccuracy: 90,
        avgSatisfactionScore: 90,
        positiveSentimentCount: 0,
        totalFeedbackCount: 0,
        reopenedCount: 0,
        reopenRate: 0,
      }
      const attendanceStatus = getAttendanceStatus(real.total, eff.monthly_attendance_target)
      const resolutionStatus = getResolutionStatus(real.rate, eff.min_resolution_rate)
      const responseTimeStatus = getResponseTimeStatus(
        real.avgDuration,
        eff.avg_response_time_target,
      )
      const autoCategorizationStatus = getAutoCategorizationStatus(
        real.autoCategorizedRate,
        eff.auto_categorization_target,
      )
      const satisfactionStatus = getSatisfactionStatus(
        real.avgSatisfactionScore,
        eff.min_satisfaction_target,
      )
      const overall = getOverallStatus(attendanceStatus, resolutionStatus)
      const attendancePct =
        eff.monthly_attendance_target > 0
          ? Math.round((real.total / eff.monthly_attendance_target) * 100)
          : 0
      return {
        userName: u.name,
        userRole: u.role,
        isLeader: isLdr,
        source: eff.source,
        attendanceTarget: eff.monthly_attendance_target,
        realAttendance: real.total,
        attendancePct,
        minResolutionRate: eff.min_resolution_rate,
        realResolutionRate: real.rate,
        avgResponseTimeTarget: eff.avg_response_time_target,
        avgDuration: real.avgDuration,
        autoCategorizationTarget: eff.auto_categorization_target,
        autoCategorizedCount: real.autoCategorizedCount,
        autoCategorizedRate: real.autoCategorizedRate,
        categorizationAccuracy: real.categorizationAccuracy,
        minSatisfactionTarget: eff.min_satisfaction_target,
        avgSatisfactionScore: real.avgSatisfactionScore,
        attendanceStatus,
        resolutionStatus,
        responseTimeStatus,
        autoCategorizationStatus,
        satisfactionStatus,
        overall,
      }
    })
    .sort((a, b) => a.userName.localeCompare(b.userName))
}

export const STATUS_LABEL: Record<Status, string> = {
  atingiu: 'Atingiu',
  perto: 'Perto',
  abaixo: 'Abaixo',
}
