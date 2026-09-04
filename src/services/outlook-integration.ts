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
