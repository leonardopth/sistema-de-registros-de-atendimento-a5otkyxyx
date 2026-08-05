import type { ClientRecord, UserRecord } from '@/types/service_record'

export interface TrainingRecord {
  id: string
  name: string
  description?: string
  client: string
  plan_content?: string
  training_date: string
  created_by?: string
  created: string
  updated: string
  expand?: {
    client?: ClientRecord
    created_by?: UserRecord
  }
}

export type FeedbackCategory = 'Sugestão' | 'Bug' | 'Elogio' | 'Reclamação'

export interface FeedbackRecord {
  id: string
  message: string
  category: FeedbackCategory
  user_id: string
  created: string
  updated: string
  expand?: {
    user_id?: UserRecord
  }
}
