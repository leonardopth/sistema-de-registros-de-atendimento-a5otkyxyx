import pb from '@/lib/pocketbase/client'
import { CollaboratorStatus, CollaboratorStatusLog, UserRecord } from '@/types/service_record'

export const COLLABORATOR_STATUSES: CollaboratorStatus[] = [
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
  Offline: {
    label: 'Offline',
    color: 'slate',
    dotColor: 'bg-slate-400',
    bgColor: 'bg-slate-100',
    textColor: 'text-slate-600',
    borderColor: 'border-slate-200',
  },
}

/**
 * Atualiza o status atual de um colaborador e fecha o log anterior,
 * gravando histórico com timestamp para calcular tempo em cada estado.
 */
export async function updateCollaboratorStatus(
  userId: string,
  newStatus: CollaboratorStatus,
  note?: string,
): Promise<{ user: UserRecord; log: CollaboratorStatusLog }> {
  const now = new Date()
  const nowIso = now.toISOString()

  // 1. Obter usuário atual para saber status anterior
  let currentUser: UserRecord | null = null
  try {
    currentUser = await pb.collection('users').getOne<UserRecord>(userId)
  } catch (err) {
    console.error('Erro ao buscar usuário para atualizar status:', err)
  }

  const prevStatus = currentUser?.current_status || 'Offline'

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
  const newLog = await pb.collection('collaborator_status_logs').create<CollaboratorStatusLog>({
    user: userId,
    previous_status: prevStatus,
    new_status: newStatus,
    started_at: nowIso,
    note: note || '',
  })

  // 4. Atualizar o usuário com o novo status
  const updatedUser = await pb.collection('users').update<UserRecord>(userId, {
    current_status: newStatus,
    status_updated_at: nowIso,
  })

  return { user: updatedUser, log: newLog }
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
