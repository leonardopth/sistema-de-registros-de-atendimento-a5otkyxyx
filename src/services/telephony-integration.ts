import pb from '@/lib/pocketbase/client'

export interface CallAnalysisResult {
  summary: string
  category:
    | 'Suporte'
    | 'Venda'
    | 'Reclamação'
    | 'Informação'
    | 'Cancelamento'
    | 'Alteração'
    | 'Bagagem'
    | 'Assento'
    | 'Reembolso'
    | 'Cotação'
    | 'Outros'
    | string
  sentiment: 'Positivo' | 'Neutro' | 'Negativo' | string
  keywords: string[]
  quality_score: number
}

export interface CallRecord {
  id: string
  call_sid: string
  from_number?: string
  to_number?: string
  recording_url?: string
  duration?: number
  transcription?: string
  summary?: string
  category?: string
  sentiment?: string
  keywords?: string[]
  quality_score?: number
  service_record?: string
  client?: string
  agent_user?: string
  created: string
  updated: string
  expand?: {
    client?: any
    service_record?: any
    agent_user?: any
  }
}

export interface ProcessCallPayload {
  call_sid?: string
  from_number?: string
  to_number?: string
  recording_url?: string
  duration?: number
  transcription?: string
  agent_user_id?: string
  service_record_id?: string
  client_id?: string
}

export interface TelephonyStatusResponse {
  configured: boolean
  has_account_sid: boolean
  has_auth_token: boolean
  has_phone_number: boolean
  twilio_phone?: string
  total_processed: number
  recent_calls: CallRecord[]
  status: 'connected' | 'unconfigured'
  message: string
}

export interface TelephonySyncResponse {
  success: boolean
  processed_count: number
  total_found?: number
  message: string
  error?: string
}

export const getTelephonyStatus = async (): Promise<TelephonyStatusResponse> => {
  try {
    return await pb.send<TelephonyStatusResponse>('/backend/v1/telephony-status', {
      method: 'GET',
    })
  } catch (error) {
    console.error('Error getting telephony status:', error)
    return {
      configured: false,
      has_account_sid: false,
      has_auth_token: false,
      has_phone_number: false,
      total_processed: 0,
      recent_calls: [],
      status: 'unconfigured',
      message: 'Não foi possível consultar o status da integração de telefonia Twilio.',
    }
  }
}

export const syncTelephonyCalls = async (): Promise<TelephonySyncResponse> => {
  return pb.send<TelephonySyncResponse>('/backend/v1/telephony-sync', {
    method: 'POST',
  })
}

export const processTelephonyCall = async (
  payload: ProcessCallPayload,
): Promise<{
  success: boolean
  call_id: string
  analysis: CallAnalysisResult
  transcription: string
  client_id?: string
  service_record_id?: string
}> => {
  return pb.send('/backend/v1/telephony-process-call', {
    method: 'POST',
    body: JSON.stringify(payload),
    headers: { 'Content-Type': 'application/json' },
  })
}

export const getCallRecords = async (): Promise<CallRecord[]> => {
  try {
    const records = await pb.collection('call_records').getFullList<CallRecord>({
      sort: '-created',
      expand: 'client,service_record,agent_user',
    })
    return Array.isArray(records) ? records : []
  } catch (error) {
    console.error('Error fetching call records:', error)
    return []
  }
}

export const getCallRecordsByRecord = async (serviceRecordId: string): Promise<CallRecord[]> => {
  if (!serviceRecordId) return []
  try {
    const records = await pb.collection('call_records').getFullList<CallRecord>({
      filter: `service_record = "${serviceRecordId}"`,
      sort: '-created',
      expand: 'client,agent_user',
    })
    return Array.isArray(records) ? records : []
  } catch (err) {
    console.error('Error fetching call records by service record:', err)
    return []
  }
}
