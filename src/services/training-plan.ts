import pb from '@/lib/pocketbase/client'

export interface TrainingPlanRequest {
  company: string
  totalRecords: number
  topReasons: { reason: string; count: number }[]
  avoidableRate: number
}

export interface TrainingPlanResult {
  plan: string
}

export const generateTrainingPlan = async (
  data: TrainingPlanRequest,
): Promise<TrainingPlanResult> => {
  return pb.send('/backend/v1/training-plan', {
    method: 'POST',
    body: JSON.stringify(data),
    headers: { 'Content-Type': 'application/json' },
  })
}
