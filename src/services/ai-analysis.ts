import pb from '@/lib/pocketbase/client'
import type {
  ContactReason,
  AvoidableContactReason,
  ServiceChannel,
  TravelType,
} from '@/types/service_record'

export interface AIAnalysisResult {
  contact_reason: ContactReason
  avoidable_contact: boolean
  avoidable_contact_reason: AvoidableContactReason | ''
  channel: ServiceChannel | ''
  travel_type: TravelType | ''
}

export const analyzeDescription = async (description: string): Promise<AIAnalysisResult> => {
  return pb.send('/backend/v1/analyze-description', {
    method: 'POST',
    body: JSON.stringify({ description }),
    headers: { 'Content-Type': 'application/json' },
  })
}
