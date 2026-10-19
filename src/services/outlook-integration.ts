import pb from '@/lib/pocketbase/client'

export interface EmailAnalysisResult {
  main_topic: string
  sentiment: 'Positivo' | 'Neutro' | 'Negativo'
  category: 'Dúvida' | 'Reclamação' | 'Solicitação' | 'Confirmação' | 'Cancelamento' | 'Outros'
  confidence_score: number
}

export interface EmailLogRecord {
  id: string
  sender_email: string
  sender_name?: string
  recipient_email?: string
  subject?: string
  body_snippet?: string
  is_reply?: boolean
  category?: string
  sentiment?: string
  main_topic?: string
  confidence_score?: number
  outlook_message_id?: string
  client?: string
  service_record?: string
  processed_by?: string
  received_at?: string
  created: string
  updated: string
  expand?: {
    client?: any
    service_record?: any
    processed_by?: any
  }
}

export interface ProcessEmailPayload {
  sender_email: string
  sender_name?: string
  recipient_email?: string
  subject?: string
  body: string
  is_reply?: boolean
  consultant_user_id?: string
  outlook_message_id?: string
}

export interface OutlookStatusResponse {
  configured: boolean
  has_client_id: boolean
  has_client_secret: boolean
  has_tenant_id: boolean
  total_processed: number
  recent_logs: EmailLogRecord[]
  status: 'connected' | 'unconfigured'
  message: string
}

export interface OutlookSyncResponse {
  success: boolean
  mode?: string
  processed_count: number
  skipped_count?: number
  total_found?: number
  message: string
  error?: string
}

export const getOutlookStatus = async (): Promise<OutlookStatusResponse> => {
  try {
    return await pb.send<OutlookStatusResponse>('/backend/v1/outlook-status', {
      method: 'GET',
    })
  } catch (error) {
    console.error('Error getting outlook status:', error)
    return {
      configured: false,
      has_client_id: false,
      has_client_secret: false,
      has_tenant_id: false,
      total_processed: 0,
      recent_logs: [],
      status: 'unconfigured',
      message: 'Não foi possível consultar o status do Outlook.',
    }
  }
}

export const syncOutlookEmails = async (): Promise<OutlookSyncResponse> => {
  return pb.send<OutlookSyncResponse>('/backend/v1/outlook-sync', {
    method: 'POST',
  })
}

export const processOutlookEmail = async (
  payload: ProcessEmailPayload,
): Promise<{
  success: boolean
  log_id: string
  analysis: EmailAnalysisResult
  client_id?: string
  service_record_id?: string
  is_client?: boolean
}> => {
  return pb.send('/backend/v1/outlook-process-email', {
    method: 'POST',
    body: JSON.stringify(payload),
    headers: { 'Content-Type': 'application/json' },
  })
}

export const getEmailLogs = async (): Promise<EmailLogRecord[]> => {
  try {
    // Coleção consolidada: email_analysis_logs
    try {
      const logs = await pb.collection('email_analysis_logs').getFullList<EmailLogRecord>({
        sort: '-created',
        expand: 'client,service_record,processed_by',
      })
      if (Array.isArray(logs)) {
        return logs
      }
    } catch {
      /* intentionally ignored */
    }

    // Fallback defensivo caso a coleção legada ainda exista
    try {
      const records = await pb.collection('email_logs').getFullList<EmailLogRecord>({
        sort: '-created',
        expand: 'client,service_record,processed_by',
      })
      return Array.isArray(records) ? records : []
    } catch {
      return []
    }
  } catch (error) {
    console.error('Error fetching email logs:', error)
    return []
  }
}

/**
 * Utilitários para deep links do Microsoft Outlook (OWA Web e Mailto local).
 */

export interface OutlookComposeParams {
  to: string
  subject: string
  body: string
  /**
   * Endereço da caixa compartilhada do núcleo (ex.: atendimento.br2@rexturadvance.com.br).
   * Quando informado, o compose do Outlook Web abre no contexto da caixa compartilhada.
   */
  sharedMailbox?: string
}

/**
 * Monta a URL de compose do Outlook na Web (OWA / outlook.office.com).
 * Para caixas compartilhadas: https://outlook.office.com/mail/{sharedMailbox}/action/compose?to=...&subject=...&body=...
 * Para a caixa pessoal do usuário (sem sharedMailbox): https://outlook.office.com/mail/deeplink/compose?to=...&subject=...&body=...
 */
export function buildOutlookWebComposeUrl(params: OutlookComposeParams): string {
  const { to, subject, body, sharedMailbox } = params
  const cleanMailbox = (sharedMailbox || '').trim()

  const queryParams = new URLSearchParams()
  if (to) queryParams.set('to', to)
  if (subject) queryParams.set('subject', subject)
  if (body) queryParams.set('body', body)

  const queryString = queryParams.toString()

  if (cleanMailbox) {
    // Path padrão aceito pelo OWA para compose dentro de uma caixa compartilhada
    return `https://outlook.office.com/mail/${encodeURIComponent(cleanMailbox)}/action/compose?${queryString}`
  }

  // Deeplink padrão do OWA para a caixa pessoal
  return `https://outlook.office.com/mail/deeplink/compose?${queryString}`
}

/**
 * Monta o link clássico mailto: que dispara o cliente Outlook desktop / local do usuário.
 */
export function buildOutlookMailtoUrl(params: {
  to: string
  subject: string
  body: string
}): string {
  const { to, subject, body } = params
  const normalizedBody = (body || '').replace(/\r\n/g, '\n').replace(/\r/g, '\n')
  const bodyWithCrLf = normalizedBody.replace(/\n/g, '\r\n')
  return `mailto:${encodeURIComponent(to || '')}?subject=${encodeURIComponent(subject || '')}&body=${encodeURIComponent(bodyWithCrLf)}`
}

export const getEmailLogsByRecord = async (serviceRecordId: string): Promise<EmailLogRecord[]> => {
  if (!serviceRecordId) return []
  try {
    // Coleção consolidada: email_analysis_logs
    try {
      const logs = await pb.collection('email_analysis_logs').getFullList<EmailLogRecord>({
        filter: `service_record = "${serviceRecordId}"`,
        sort: '-created',
        expand: 'client,processed_by',
      })
      if (Array.isArray(logs)) return logs
    } catch {
      /* intentionally ignored */
    }

    // Fallback defensivo
    try {
      const records = await pb.collection('email_logs').getFullList<EmailLogRecord>({
        filter: `service_record = "${serviceRecordId}"`,
        sort: '-created',
        expand: 'client,processed_by',
      })
      return Array.isArray(records) ? records : []
    } catch {
      return []
    }
  } catch (err) {
    console.error('Error getting email logs for record:', err)
    return []
  }
}
