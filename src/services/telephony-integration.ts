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
