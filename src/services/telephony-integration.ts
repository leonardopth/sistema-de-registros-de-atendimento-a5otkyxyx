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

export interface CallAnalysisLogRecord {
  id: string
  call_sid?: string
  provider?: 'twilio' | 'vonage' | 'internal' | 'simulation' | string
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

// Alias de compatibilidade
export type CallRecord = CallAnalysisLogRecord

export interface ProcessCallPayload {
  call_sid?: string
  call_id?: string
  provider?: 'twilio' | 'vonage' | 'internal' | 'simulation' | string
  from_number?: string
  caller?: string
  from?: string
  to_number?: string
  called?: string
  to?: string
  recording_url?: string
  audio_url?: string
  duration?: number
  transcription?: string
  text?: string
  agent_user_id?: string
  processed_by?: string
  service_record_id?: string
  service_record?: string
  client_id?: string
  client?: string
}

export interface TelephonyProviderInfo {
  configured: boolean
  has_account_sid?: boolean
  has_auth_token?: boolean
  has_phone_number?: boolean
  phone?: string
  has_api_key?: boolean
  has_api_secret?: boolean
  has_api_url?: boolean
}

export interface TelephonyStatusResponse {
  configured: boolean
  active_provider?: 'twilio' | 'vonage' | 'internal' | 'simulation' | string
  provider_label?: string
  providers?: {
    twilio?: TelephonyProviderInfo
    vonage?: TelephonyProviderInfo
    internal?: TelephonyProviderInfo
  }
  has_account_sid: boolean
  has_auth_token: boolean
  has_phone_number: boolean
  twilio_phone?: string
  total_processed: number
  recent_calls: CallAnalysisLogRecord[]
  status: 'connected' | 'unconfigured'
  message: string
}

export interface TelephonySyncResponse {
  success: boolean
  provider?: string
  processed_count: number
  total_found?: number
  message: string
  error?: string
}

export interface ProcessTelephonyResponse {
  success: boolean
  call_id: string
  log_id?: string
  record_id?: string
  provider?: string
  analysis: CallAnalysisResult
  transcription: string
  client_id?: string
  service_record_id?: string
}

/**
 * Consulta o status das credenciais e conexão de telefonia (Twilio, Vonage ou API Interna)
 */
export const getTelephonyStatus = async (): Promise<TelephonyStatusResponse> => {
  try {
    return await pb.send<TelephonyStatusResponse>('/backend/v1/telephony-status', {
      method: 'GET',
    })
  } catch (error) {
    console.error('Error getting telephony status:', error)
    return {
      configured: false,
      active_provider: 'simulation',
      provider_label: 'Modo Simulação / Modular',
      has_account_sid: false,
      has_auth_token: false,
      has_phone_number: false,
      total_processed: 0,
      recent_calls: [],
      status: 'unconfigured',
      message:
        'Não foi possível consultar o status da integração de telefonia. Modo modular ativo.',
    }
  }
}

/**
 * Sincroniza gravações recentes de telefonia
 */
export const syncTelephonyCalls = async (): Promise<TelephonySyncResponse> => {
  return pb.send<TelephonySyncResponse>('/backend/v1/telephony-sync', {
    method: 'POST',
  })
}

/**
 * Endpoint oficial: POST /backend/v1/telephony-process
 * Processa uma gravação com Speech-to-Text e IA
 */
export const processTelephonyRecording = async (
  payload: ProcessCallPayload,
): Promise<ProcessTelephonyResponse> => {
  return pb.send<ProcessTelephonyResponse>('/backend/v1/telephony-process', {
    method: 'POST',
    body: JSON.stringify(payload),
    headers: { 'Content-Type': 'application/json' },
  })
}

/**
 * Alias de compatibilidade para processTelephonyRecording
 */
export const processTelephonyCall = processTelephonyRecording

/**
 * Busca logs de análise de chamadas da coleção `call_analysis_logs` (com fallback para `call_records`)
 */
export const getCallAnalysisLogs = async (): Promise<CallAnalysisLogRecord[]> => {
  try {
    // Coleção consolidada: call_analysis_logs
    const logs = await pb.collection('call_analysis_logs').getFullList<CallAnalysisLogRecord>({
      sort: '-created',
      expand: 'client,service_record,processed_by',
    })
    return Array.isArray(logs) ? logs : []
  } catch (error) {
    // Fallback defensivo caso call_records legada ainda exista
    try {
      const records = await pb.collection('call_records').getFullList<any>({
        sort: '-created',
        expand: 'client,service_record,agent_user',
      })
      return records.map((r) => ({
        id: r.id,
        call_sid: r.call_sid,
        provider: 'twilio',
        from_number: r.from_number,
        to_number: r.to_number,
        recording_url: r.recording_url,
        duration: r.duration,
        transcription: r.transcription,
        summary: r.summary,
        category: r.category,
        sentiment: r.sentiment,
        keywords: r.keywords,
        quality_score: r.quality_score,
        service_record: r.service_record,
        client: r.client,
        processed_by: r.agent_user,
        created: r.created,
        updated: r.updated,
        expand: {
          client: r.expand?.client,
          service_record: r.expand?.service_record,
          processed_by: r.expand?.agent_user,
        },
      }))
    } catch {
      console.error('Error fetching call analysis logs:', error)
      return []
    }
  }
}

/**
 * Alias de compatibilidade
 */
export const getCallRecords = getCallAnalysisLogs

/**
 * Busca análises e gravações de chamadas vinculadas a um atendimento específico
 */
export const getCallRecordsByRecord = async (
  serviceRecordId: string,
): Promise<CallAnalysisLogRecord[]> => {
  if (!serviceRecordId) return []
  try {
    // Coleção consolidada: call_analysis_logs
    try {
      const logs = await pb.collection('call_analysis_logs').getFullList<CallAnalysisLogRecord>({
        filter: `service_record = "${serviceRecordId}"`,
        sort: '-created',
        expand: 'client,processed_by',
      })
      if (Array.isArray(logs) && logs.length > 0) return logs
    } catch {
      /* intentionally ignored */
    }

    // Fallback defensivo para call_records
    try {
      const records = await pb.collection('call_records').getFullList<any>({
        filter: `service_record = "${serviceRecordId}"`,
        sort: '-created',
        expand: 'client,agent_user',
      })
      return records.map((r) => ({
        id: r.id,
        call_sid: r.call_sid,
        provider: 'twilio',
        from_number: r.from_number,
        to_number: r.to_number,
        recording_url: r.recording_url,
        duration: r.duration,
        transcription: r.transcription,
        summary: r.summary,
        category: r.category,
        sentiment: r.sentiment,
        keywords: r.keywords,
        quality_score: r.quality_score,
        service_record: r.service_record,
        client: r.client,
        processed_by: r.agent_user,
        created: r.created,
        updated: r.updated,
        expand: {
          client: r.expand?.client,
          processed_by: r.expand?.agent_user,
        },
      }))
    } catch {
      return []
    }
  } catch (err) {
    console.error('Error fetching call records by service record:', err)
    return []
  }
}
