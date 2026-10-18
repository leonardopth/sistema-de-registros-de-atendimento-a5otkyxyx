import pb from '@/lib/pocketbase/client'
import type {
  WaiverRequestRecord,
  WaiverConfigRecord,
  WaiverHistoryRecord,
  WaiverStatus,
} from '@/types/waiver'
import { createAuditLog } from '@/services/audit-log'
import { createNotification } from '@/services/notifications'
import { consumeWaiverBudget } from '@/services/waiver_budgets'

/**
 * Obtém configuração de parâmetros (unidades e aprovadores por companhia)
 */
export async function getWaiverConfig(): Promise<WaiverConfigRecord | null> {
  try {
    const list = await pb.collection('waiver_configs').getFullList<WaiverConfigRecord>({
      sort: '-created',
      limit: 1,
      expand: 'updated_by',
    })
    if (list && list.length > 0) {
      return list[0]
    }
    return null
  } catch (error) {
    console.error('Erro ao buscar waiver_configs:', error)
    return null
  }
}

/**
 * Atualiza parâmetros de Waivers (somente Líderes/Supervisores/Gerentes/Master)
 */
export async function updateWaiverConfig(
  id: string,
  data: Partial<WaiverConfigRecord>,
): Promise<WaiverConfigRecord> {
  const updated = await pb.collection('waiver_configs').update<WaiverConfigRecord>(id, {
    ...data,
    updated_by: pb.authStore.record?.id,
  })

  await createAuditLog({
    action: 'Parâmetros de Waivers Atualizados',
    entity: 'waiver_configs',
    entity_id: id,
    details: data,
  })

  return updated
}

/**
 * Lista solicitações de Waivers
 */
export async function getWaiverRequests(filter?: string): Promise<WaiverRequestRecord[]> {
  try {
    return await pb.collection('waiver_requests').getFullList<WaiverRequestRecord>({
      filter: filter || undefined,
      sort: '-created',
      expand: 'requester,reviewed_by',
    })
  } catch (error) {
    console.error('Erro ao buscar waiver_requests:', error)
    return []
  }
}

/**
 * Obtém uma solicitação pelo ID
 */
export async function getWaiverRequestById(id: string): Promise<WaiverRequestRecord | null> {
  try {
    return await pb.collection('waiver_requests').getOne<WaiverRequestRecord>(id, {
      expand: 'requester,reviewed_by',
    })
  } catch (error) {
    console.error(`Erro ao buscar waiver_request ${id}:`, error)
    return null
  }
}

/**
 * Cria uma nova solicitação de Waiver
 */
export async function createWaiverRequest(data: {
  airline_key: string
  airline_name: string
  request_type?: string
  unit: string
  gds_locator?: string
  airline_locator?: string
  pax_count?: number
  pax_name?: string
  amount?: number
  currency?: string
  priority?: string
  approver_name: string
  form_data: Record<string, any>
}): Promise<WaiverRequestRecord> {
  const currentUserId = pb.authStore.record?.id
  if (!currentUserId) throw new Error('Usuário não autenticado')

  const created = await pb.collection('waiver_requests').create<WaiverRequestRecord>({
    ...data,
    status: 'Pendente',
    requester: currentUserId,
  })

  // Registra no histórico da solicitação
  await pb.collection('waiver_history').create<WaiverHistoryRecord>({
    waiver_request: created.id,
    action: 'Criação',
    previous_status: '',
    new_status: 'Pendente',
    user: currentUserId,
    notes: `Solicitação criada para ${data.airline_name} (Aprovador: ${data.approver_name})`,
    details: {
      unit: data.unit,
      gds_locator: data.gds_locator,
      airline_locator: data.airline_locator,
      amount: data.amount,
      currency: data.currency,
    },
  })

  // Audit log
  await createAuditLog({
    action: 'Solicitação de Waiver Criada',
    entity: 'waiver_requests',
    entity_id: created.id,
    details: {
      airline: data.airline_name,
      unit: data.unit,
      loc: data.gds_locator,
      approver: data.approver_name,
    },
  })

  return created
}

/**
 * Atualiza o status e ciclo de vida de uma solicitação de Waiver
 */
export async function updateWaiverStatus(params: {
  requestId: string
  newStatus: WaiverStatus
  reviewNotes?: string
  negotiatedAmount?: number
  actionLabel?: string
}): Promise<WaiverRequestRecord> {
  const currentUserId = pb.authStore.record?.id
  if (!currentUserId) throw new Error('Usuário não autenticado')

  const current = await pb
    .collection('waiver_requests')
    .getOne<WaiverRequestRecord>(params.requestId)

  const payload: Partial<WaiverRequestRecord> = {
    status: params.newStatus,
    reviewed_by: currentUserId,
    reviewed_at: new Date().toISOString(),
    review_notes: params.reviewNotes ?? current.review_notes,
  }

  if (params.negotiatedAmount !== undefined) {
    payload.negotiated_amount = params.negotiatedAmount
  }

  const updated = await pb
    .collection('waiver_requests')
    .update<WaiverRequestRecord>(params.requestId, payload, {
      expand: 'requester,reviewed_by',
    })

  // Consumo automático de verba comercial caso a solicitação seja Aprovada ou Negociada
  let budgetConsumptionDetails: Record<string, any> | undefined = undefined
  let budgetNotes = ''

  if (params.newStatus === 'Aprovada' || params.newStatus === 'Negociada') {
    // Valor a debitar: se negociado, usa negotiated_amount; senão o valor solicitado
    const effectiveAmount =
      params.newStatus === 'Negociada' && params.negotiatedAmount !== undefined
        ? params.negotiatedAmount
        : current.amount || 0

    if (effectiveAmount > 0) {
      try {
        const consumption = await consumeWaiverBudget({
          airline_key: current.airline_key,
          amount: effectiveAmount,
          unit: current.unit,
          currency: current.currency,
        })
        budgetConsumptionDetails = {
          consumed: consumption.consumed,
          budgetId: consumption.budgetId,
          category: consumption.category,
          remainingBalance: consumption.remainingBalance,
          amountDebited: effectiveAmount,
          message: consumption.message,
        }
        budgetNotes = ` | Consumo de verba: ${consumption.message}`
      } catch (budgetErr) {
        console.warn('Erro ao processar débito de verba:', budgetErr)
        budgetNotes = ' | Consumo de verba: Erro ao debitar'
      }
    } else {
      budgetNotes = ' | Consumo de verba: Valor zerado ou não informado'
    }
  }

  // Registra entrada no histórico
  const combinedNotes =
    (params.reviewNotes || `Status alterado de "${current.status}" para "${params.newStatus}"`) +
    budgetNotes

  await pb.collection('waiver_history').create<WaiverHistoryRecord>({
    waiver_request: params.requestId,
    action: params.actionLabel || `Status alterado para ${params.newStatus}`,
    previous_status: current.status,
    new_status: params.newStatus,
    user: currentUserId,
    notes: combinedNotes,
    details: {
      negotiated_amount: params.negotiatedAmount,
      budget_consumption: budgetConsumptionDetails,
    },
  })

  // Auditoria
  await createAuditLog({
    action: `Decisão de Waiver: ${params.newStatus}`,
    entity: 'waiver_requests',
    entity_id: params.requestId,
    details: {
      previous_status: current.status,
      new_status: params.newStatus,
      review_notes: params.reviewNotes,
      negotiated_amount: params.negotiatedAmount,
    },
  })

  // Notificar o solicitante se foi decidido (Aprovada, Negociada, Recusada)
  if (['Aprovada', 'Negociada', 'Recusada'].includes(params.newStatus) && current.requester) {
    const statusTitles: Record<string, string> = {
      Aprovada: 'Solicitação de Waiver Aprovada',
      Negociada: 'Solicitação de Waiver Negociada',
      Recusada: 'Solicitação de Waiver Recusada',
    }

    const typeMapping: Record<string, 'success' | 'warning' | 'error' | 'info'> = {
      Aprovada: 'success',
      Negociada: 'warning',
      Recusada: 'error',
    }

    const locMsg = current.gds_locator ? ` (Loc: ${current.gds_locator})` : ''
    const noteMsg = params.reviewNotes ? ` - Obs: "${params.reviewNotes}"` : ''
    const negMsg =
      params.newStatus === 'Negociada' && params.negotiatedAmount !== undefined
        ? ` (Valor negociado: ${params.negotiatedAmount} ${current.currency || ''})`
        : ''

    try {
      await createNotification({
        user_id: current.requester,
        title: statusTitles[params.newStatus] || 'Atualização de Solicitação de Waiver',
        message: `Sua solicitação para ${current.airline_name}${locMsg} foi marcada como "${params.newStatus}"${negMsg}${noteMsg}.`,
        type: typeMapping[params.newStatus] || 'info',
        link: '/waivers',
      })
    } catch (notifErr) {
      console.warn('Não foi possível enviar notificação ao solicitante:', notifErr)
    }
  }

  return updated
}

/**
 * Busca histórico da solicitação
 */
export async function getWaiverHistory(requestId: string): Promise<WaiverHistoryRecord[]> {
  try {
    return await pb.collection('waiver_history').getFullList<WaiverHistoryRecord>({
      filter: `waiver_request = "${requestId}"`,
      sort: 'created',
      expand: 'user',
    })
  } catch (error) {
    console.error(`Erro ao buscar histórico de waiver ${requestId}:`, error)
    return []
  }
}
