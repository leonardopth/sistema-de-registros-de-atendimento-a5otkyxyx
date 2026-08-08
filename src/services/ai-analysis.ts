import pb from '@/lib/pocketbase/client'
import type {
  ContactReason,
  AvoidableContactReason,
  ServiceChannel,
  TravelType,
  ServicePriority,
} from '@/types/service_record'

export interface AIAnalysisResult {
  contact_reason: ContactReason
  avoidable_contact: boolean
  avoidable_contact_reason: AvoidableContactReason | ''
  channel: ServiceChannel | ''
  travel_type: TravelType | ''
  agency_name: string
  agent_name: string
  client_email: string
  client_phone: string
  priority: ServicePriority | ''
  description: string
}

export const analyzeDescription = async (description: string): Promise<AIAnalysisResult> => {
  return pb.send('/backend/v1/analyze-description', {
    method: 'POST',
    body: JSON.stringify({ description }),
    headers: { 'Content-Type': 'application/json' },
  })
}
