import pb from '@/lib/pocketbase/client'

export interface ConsultantAIResult {
  answer: string
}

export const askConsultantAI = async (question: string): Promise<ConsultantAIResult> => {
  return pb.send('/backend/v1/consultant-ai', {
    method: 'POST',
    body: JSON.stringify({ question }),
    headers: { 'Content-Type': 'application/json' },
  })
}
