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
}

export const processOutlookEmail = async (
  payload: ProcessEmailPayload,
): Promise<{
  success: boolean
  log_id: string
  analysis: EmailAnalysisResult
  client_id?: string
  service_record_id?: string
}> => {
  return pb.send('/backend/v1/outlook-process-email', {
    method: 'POST',
    body: JSON.stringify(payload),
    headers: { 'Content-Type': 'application/json' },
  })
}

export const getEmailLogs = async (): Promise<EmailLogRecord[]> => {
  try {
    const records = await pb.collection('email_logs').getFullList<EmailLogRecord>({
      sort: '-created',
      expand: 'client,service_record,processed_by',
    })
    return Array.isArray(records) ? records : []
  } catch (error) {
    console.error('Error fetching email logs:', error)
    return []
  }
}
