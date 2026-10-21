import pb from '@/lib/pocketbase/client'
import { CollaboratorStatus, CollaboratorStatusLog, UserRecord } from '@/types/service_record'

export const COLLABORATOR_STATUSES: CollaboratorStatus[] = [
  'Disponível',
  'Em atendimento',
  'Pausa',
  'Almoço',
  'Treinamento',
  'Reunião',
  'Ausente',
  'Offline',
]

/** Status manuais que o colaborador pode selecionar explicitamente */
export const MANUAL_COLLABORATOR_STATUSES: CollaboratorStatus[] = [
  'Disponível',
  'Em atendimento',
  'Pausa',
  'Almoço',
  'Treinamento',
  'Reunião',
  'Offline',
]

export const STATUS_CONFIG: Record<
  CollaboratorStatus,
  {
    label: string
    color: string
    dotColor: string
    bgColor: string
    textColor: string
    borderColor: string
  }
> = {
  Disponível: {
    label: 'Disponível',
    color: 'emerald',
    dotColor: 'bg-emerald-500',
    bgColor: 'bg-emerald-50',
    textColor: 'text-emerald-700',
    borderColor: 'border-emerald-200',
  },
  'Em atendimento': {
    label: 'Em atendimento',
    color: 'indigo',
    dotColor: 'bg-indigo-500',
    bgColor: 'bg-indigo-50',
    textColor: 'text-indigo-700',
    borderColor: 'border-indigo-200',
  },
  Pausa: {
    label: 'Pausa',
    color: 'amber',
    dotColor: 'bg-amber-500',
    bgColor: 'bg-amber-50',
    textColor: 'text-amber-700',
    borderColor: 'border-amber-200',
  },
  Almoço: {
    label: 'Almoço',
    color: 'orange',
    dotColor: 'bg-orange-500',
    bgColor: 'bg-orange-50',
    textColor: 'text-orange-700',
    borderColor: 'border-orange-200',
  },
  Treinamento: {
    label: 'Treinamento',
    color: 'purple',
    dotColor: 'bg-purple-500',
    bgColor: 'bg-purple-50',
    textColor: 'text-purple-700',
    borderColor: 'border-purple-200',
  },
  Reunião: {
    label: 'Reunião',
    color: 'blue',
    dotColor: 'bg-blue-500',
    bgColor: 'bg-blue-50',
    textColor: 'text-blue-700',
    borderColor: 'border-blue-200',
  },
  Ausente: {
    label: 'Ausente',
    color: 'amber',
    dotColor: 'bg-amber-400',
    bgColor: 'bg-amber-50/80',
    textColor: 'text-amber-800',
    borderColor: 'border-amber-300',
  },
  Offline: {
    label: 'Offline',
    color: 'slate',
    dotColor: 'bg-slate-400',
    bgColor: 'bg-slate-100',
    textColor: 'text-slate-600',
    borderColor: 'border-slate-200',
  },
}

/** Status manuais que impedem que o status automático sobrescreva a disponibilidade */
export const MANUAL_EXCLUSIVE_STATUSES: CollaboratorStatus[] = [
  'Em atendimento',
  'Pausa',
  'Almoço',
  'Treinamento',
  'Reunião',
]

/**
 * Deriva o status efetivo do usuário considerando seu heartbeat recente.
 * Regras:
 * 1. Se tiver um status manual prioritário (Pausa, Almoço, etc.) E presence_source === 'manual',
 *    mantém o status manual.
 * 2. Se status for Offline ou sem last_heartbeat_at por > 45min, retorna Offline.
 * 3. Se o último heartbeat foi há mais de 15min, retorna 'Ausente' (a não ser que esteja em pausa manual).
 * 4. Se tiver heartbeat recente (< 15min) e não estiver em pausa manual, retorna 'Disponível'.
 */
export function deriveCollaboratorStatus(user: {
  current_status?: CollaboratorStatus
  presence_source?: 'auto' | 'manual'
  last_heartbeat_at?: string
  status_updated_at?: string
}): {
  status: CollaboratorStatus
  isAutomatic: boolean
  lastActiveMinutesAgo: number | null
} {
  const current = user.current_status || 'Offline'
  const source = user.presence_source || 'auto'

  // Se o usuário selecionou deliberadamente um status manual prioritário
  if (source === 'manual' && MANUAL_EXCLUSIVE_STATUSES.includes(current)) {
    return {
      status: current,
      isAutomatic: false,
      lastActiveMinutesAgo: user.last_heartbeat_at
        ? Math.max(0, Math.floor((Date.now() - new Date(user.last_heartbeat_at).getTime()) / 60000))
        : null,
    }
  }

  if (!user.last_heartbeat_at) {
    return {
      status:
        current === 'Ausente' ? 'Ausente' : current === 'Disponível' ? 'Disponível' : 'Offline',
      isAutomatic: true,
      lastActiveMinutesAgo: null,
    }
  }

  const heartbeatTime = new Date(user.last_heartbeat_at).getTime()
  if (isNaN(heartbeatTime)) {
    return {
      status: current,
      isAutomatic: source === 'auto',
      lastActiveMinutesAgo: null,
    }
  }

  const diffMinutes = Math.max(0, Math.floor((Date.now() - heartbeatTime) / 60000))

  // Inatividade muito longa (> 45 min) sem nova sessão → Offline
  if (diffMinutes >= 45) {
    return {
      status: 'Offline',
      isAutomatic: true,
      lastActiveMinutesAgo: diffMinutes,
    }
  }

  // Sem interação por >= 15 minutos → Ausente
  if (diffMinutes >= 15) {
    return {
      status: 'Ausente',
      isAutomatic: true,
      lastActiveMinutesAgo: diffMinutes,
    }
  }

  // Interação recente (< 15 min) e sem pausa manual → Disponível
  return {
    status: 'Disponível',
    isAutomatic: true,
    lastActiveMinutesAgo: diffMinutes,
  }
}

/**
 * Atualiza o status atual de um colaborador e fecha o log anterior,
 * gravando histórico com timestamp para calcular tempo em cada estado.
 */
export async function updateCollaboratorStatus(
  userId: string,
  newStatus: CollaboratorStatus,
  options?: {
    note?: string
    presenceSource?: 'auto' | 'manual'
    heartbeatIso?: string
  },
): Promise<{ user: UserRecord; log?: CollaboratorStatusLog }> {
  const now = new Date()
  const nowIso = now.toISOString()
  const source = options?.presenceSource ?? (newStatus === 'Disponível' ? 'auto' : 'manual')

  // 1. Obter usuário atual para saber status anterior
  let currentUser: UserRecord | null = null
  try {
    currentUser = await pb.collection('users').getOne<UserRecord>(userId)
  } catch (err) {
    console.error('Erro ao buscar usuário para atualizar status:', err)
  }

  const prevStatus = currentUser?.current_status || 'Offline'

  // Se o status for o mesmo e a fonte for a mesma, apenas atualiza heartbeat se fornecido
  if (
    prevStatus === newStatus &&
    currentUser?.presence_source === source &&
    options?.heartbeatIso
  ) {
    const updatedUser = await pb.collection('users').update<UserRecord>(userId, {
      last_heartbeat_at: options.heartbeatIso,
    })
    return { user: updatedUser }
  }

  // 2. Se houver log aberto para este usuário, fechar ended_at e duration_seconds
  try {
    const openLogs = await pb
      .collection('collaborator_status_logs')
      .getList<CollaboratorStatusLog>(1, 1, {
        filter: `user = "${userId}" && ended_at = null`,
        sort: '-started_at',
      })

    if (openLogs.items.length > 0) {
      const lastLog = openLogs.items[0]
      const started = new Date(lastLog.started_at).getTime()
      const durationSeconds = Math.max(0, Math.round((now.getTime() - started) / 1000))
      await pb.collection('collaborator_status_logs').update(lastLog.id, {
        ended_at: nowIso,
        duration_seconds: durationSeconds,
      })
    }
  } catch (err) {
    console.warn('Aviso ao fechar log anterior de status:', err)
  }

  // 3. Criar novo registro de log
  let newLog: CollaboratorStatusLog | undefined
  try {
    newLog = await pb.collection('collaborator_status_logs').create<CollaboratorStatusLog>({
      user: userId,
      previous_status: prevStatus,
      new_status: newStatus,
      started_at: nowIso,
      note: options?.note || (source === 'auto' ? 'Automático por presença' : ''),
    })
  } catch (err) {
    console.error('Erro ao criar log de status:', err)
  }

  // 4. Atualizar o usuário com o novo status e heartbeat
  const userPayload: Record<string, any> = {
    current_status: newStatus,
    status_updated_at: nowIso,
    presence_source: source,
  }
  if (options?.heartbeatIso) {
    userPayload.last_heartbeat_at = options.heartbeatIso
  }

  const updatedUser = await pb.collection('users').update<UserRecord>(userId, userPayload)

  return { user: updatedUser, log: newLog }
}

/**
 * Envia um batimento (heartbeat) periódico ou na volta de inatividade.
 * Também faz a transição automática de status quando aplicável.
 */
export async function sendUserHeartbeat(
  userId: string,
  isActive: boolean,
): Promise<{ user?: UserRecord; changedStatus?: boolean }> {
  try {
    const nowIso = new Date().toISOString()
    const currentUser = await pb.collection('users').getOne<UserRecord>(userId)

    const isManualPaused =
      currentUser.presence_source === 'manual' &&
      MANUAL_EXCLUSIVE_STATUSES.includes(currentUser.current_status || 'Offline')

    // Se estiver em pausa manual, apenas atualiza o heartbeat de presença sem alterar o status
    if (isManualPaused) {
      if (isActive) {
        const updated = await pb.collection('users').update<UserRecord>(userId, {
          last_heartbeat_at: nowIso,
        })
        return { user: updated, changedStatus: false }
      }
      return { user: currentUser, changedStatus: false }
    }

    // Se não estiver em pausa manual:
    // Se o usuário estiver ativo na janela de 15min -> deve estar "Disponível"
    // Se estiver inativo há 15min+ -> deve transicionar para "Ausente"
    const targetStatus: CollaboratorStatus = isActive ? 'Disponível' : 'Ausente'

    if (currentUser.current_status !== targetStatus) {
      const res = await updateCollaboratorStatus(userId, targetStatus, {
        presenceSource: 'auto',
        heartbeatIso: isActive ? nowIso : currentUser.last_heartbeat_at || nowIso,
        note: isActive ? 'Automático: Atividade detectada' : 'Automático: Inatividade > 15min',
      })
      return { user: res.user, changedStatus: true }
    }

    // Status já está correto; apenas atualiza last_heartbeat_at se estiver ativo
    if (isActive) {
      const updated = await pb.collection('users').update<UserRecord>(userId, {
        last_heartbeat_at: nowIso,
      })
      return { user: updated, changedStatus: false }
    }

    return { user: currentUser, changedStatus: false }
  } catch (err) {
    console.warn('Erro ao enviar heartbeat de presença:', err)
    return { changedStatus: false }
  }
}

/**
 * Marca o usuário como Offline (ex: no logout explícito).
 */
export async function markUserOffline(userId: string): Promise<void> {
  try {
    await updateCollaboratorStatus(userId, 'Offline', {
      presenceSource: 'auto',
      note: 'Logout ou encerramento de sessão',
    })
  } catch (err) {
    console.warn('Erro ao marcar usuário como Offline:', err)
  }
}

/**
 * Busca o histórico de status de um colaborador específico ou de todos.
 */
export async function getCollaboratorStatusLogs(
  userId?: string,
  limit = 50,
): Promise<CollaboratorStatusLog[]> {
  try {
    const filter = userId ? `user = "${userId}"` : ''
    const list = await pb
      .collection('collaborator_status_logs')
      .getList<CollaboratorStatusLog>(1, limit, {
        filter,
        sort: '-started_at',
        expand: 'user',
      })
    return list.items
  } catch (err) {
    console.error('Erro ao buscar histórico de status:', err)
    return []
  }
}

/**
 * Calcula o tempo total (em minutos/horas) por status a partir de uma lista de logs.
 */
export function calculateTimePerStatus(
  logs: CollaboratorStatusLog[],
): Record<CollaboratorStatus, number> {
  const map: Record<CollaboratorStatus, number> = {
    Disponível: 0,
    'Em atendimento': 0,
    Pausa: 0,
    Almoço: 0,
    Treinamento: 0,
    Reunião: 0,
    Ausente: 0,
    Offline: 0,
  }

  const now = Date.now()

  for (const log of logs) {
    let secs = log.duration_seconds
    if (secs == null) {
      // Se ainda estiver aberto, calcula até agora
      const start = new Date(log.started_at).getTime()
      secs = Math.max(0, Math.round((now - start) / 1000))
    }
    const mins = Math.round(secs / 60)
    if (log.new_status && map[log.new_status] !== undefined) {
      map[log.new_status] += mins
    }
  }

  return map
}

/**
 * Formata minutos em formato amigável "Xh Ym" ou "Ym".
 */
export function formatMinutes(minutes: number): string {
  if (minutes < 1) return '< 1 min'
  const h = Math.floor(minutes / 60)
  const m = Math.round(minutes % 60)
  if (h === 0) return `${m} min`
  if (m === 0) return `${h}h`
  return `${h}h ${m}m`
}
