import { UserRecord, ClientRecord, ServiceGroup, TravelType } from './service_record'

export type ControlTowerPriority = 'P1' | 'P2' | 'P3'

export type ControlTowerStatus =
  | 'Novo'
  | 'Em tratamento'
  | 'Aguardando cliente'
  | 'Resolvido'
  | 'Escalado'

export interface ControlTowerConfigRecord {
  id: string
  weight_departure_24h: number
  weight_departure_48h: number
  weight_cancellation: number
  weight_priority_client: number
  weight_per_hour_inbox: number
  weight_promised_deadline: number
  weight_formal_complaint: number
  weight_repeat_contact: number
  weight_persistent_client?: number
  score_threshold_p1: number
  score_threshold_p2: number
  business_hours_start: string
  business_hours_end: string
  business_days: number[]
  target_sla_p1_hours: number
  target_sla_p2_hours: number
  target_sla_p3_hours: number
  updated_by?: string
  created: string
  updated: string
  expand?: {
    updated_by?: UserRecord
  }
}

export interface ControlTowerEmailRecord {
  id: string
  subject?: string
  sender_email: string
  sender_name?: string
  recipient_email?: string
  body_snippet?: string
  received_at?: string
  service_group?: ServiceGroup
  team?: TravelType
  inbox_address?: string
  client?: string
  reservation_number?: string
  detected_dates?: string[]
  detected_signals?: unknown
  score: number
  priority: ControlTowerPriority
  status: ControlTowerStatus
  assigned_to?: string
  assigned_at?: string
  is_noise?: boolean
  external_message_id?: string
  email_analysis_log?: string
  business_hours_waiting?: number
  sla_deadline?: string
  escalated_at?: string
  escalation_alert_sent?: boolean
  escalated_reason?: string
  thread_id?: string
  thread_root?: string
  message_count?: number
  is_thread_child?: boolean
  last_message_at?: string
  created: string
  updated: string
  expand?: {
    client?: ClientRecord
    assigned_to?: UserRecord
    thread_root?: ControlTowerEmailRecord
  }
}

export interface ControlTowerFilters {
  search?: string
  priority?: ControlTowerPriority | 'Todas'
  status?: ControlTowerStatus | 'Todos' | 'Ativos' | 'Estourados/Escalados'
  service_group?: string
  team?: 'Nacional' | 'Internacional' | 'Todas'
  onlyAssignedToMe?: boolean
  hideNoise?: boolean
}

export interface ControlTowerAgentLoad {
  userId: string
  userName: string
  userEmail: string
  avatar?: string
  activeCount: number
  p1Count: number
}
