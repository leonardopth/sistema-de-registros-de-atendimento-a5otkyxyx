export interface TaskItem {
  id?: string
  title: string
  done: boolean
  due_date?: string
  responsible?: string
  done_at?: string
  done_by?: string
}

export type ContactReason =
  | 'Bagagem'
  | 'Assento'
  | 'cálculo reemissão'
  | 'reembolso'
  | 'cotação'
  | 'reserva'
  | 'cancelamento'
  | 'regras tarifárias'
  | 'erro RF'
  | 'outros'

export type ServiceChannel = 'Telefone' | 'e-mail' | 'whatsapp' | 'comercial' | 'outros'

export type ServicePriority = 'Baixa' | 'Média' | 'Alta'

export type ServiceStatus = 'Aberto' | 'Em Andamento' | 'Concluído' | 'Cancelado'

export type AvoidableContactReason = 'Disponível no RF' | 'Fora do Escopo' | 'Erro RF' | 'Outros'

export type TravelType = 'Nacional' | 'Internacional'

export type UserRole =
  | 'Gerente'
  | 'Supervisor'
  | 'Líder'
  | 'Consultor'
  | 'Executivo de Contas'
  | 'Master'
  | 'Gestor Comercial'

export type CommercialBase =
  | 'NO/NE'
  | 'CO'
  | 'RJ/ES/MG'
  | 'SAO'
  | 'SPI'
  | 'SUL'
  | 'LOT'
  | 'INSIDE SALES'

export type ApprovalStatus = 'Pendente' | 'Aprovado' | 'Rejeitado'

export type ServiceGroup = 'Concierge' | 'Exclusivo' | 'LOT' | 'BR1' | 'BR2' | 'SAO' | 'SPI' | 'SUL'

export interface ServiceRecord {
  id: string
  client_name: string
  client_email?: string
  client_phone?: string
  client_company?: string
  contact_reason: ContactReason
  travel_type?: TravelType
  description: string
  priority: ServicePriority
  status: ServiceStatus
  start_time: string
  duration?: number
  end_time?: string
  assigned_agent?: string
  assigned_user?: string
  channel?: ServiceChannel
  tasks?: TaskItem[]
  avoidable_contact?: boolean
  avoidable_contact_reason?: AvoidableContactReason | string
  avoidable_contact_explanation?: string
  wrong_department?: boolean
  wrong_department_explanation?: string
  user_id: string
  created: string
  updated: string
  account_executive?: string
  client?: string
  agent?: string
  timer_start?: string
  timer_running?: boolean
  reopen_justification?: string
  expand?: {
    account_executive?: AccountExecutiveRecord
    client?: ClientRecord
    agent?: AgentRecord
    assigned_user?: UserRecord
    user_id?: UserRecord
  }
}

export interface UserRecord {
  id: string
  name: string
  email: string
  role: UserRole
  departments?: TravelType[]
  master_access?: boolean
  approval_status?: ApprovalStatus
  approved_by?: string
  approved_by_id?: string
  approved_at?: string
  service_groups?: ServiceGroup[]
  bases?: CommercialBase[]
  email_notifications?: boolean
}

export interface ClientRecord {
  id: string
  name: string
  email?: string
  phone?: string
  account_executive?: string
  account_executive_rel?: string
  company?: string
  notes?: string
  city?: string
  state?: string
  service_group?: string
  avoidable_contact_threshold?: number
  blocked?: boolean
  block_reason?: string
  blocked_by?: string
  blocked_at?: string
  created: string
  updated: string
  expand?: {
    account_executive_rel?: AccountExecutiveRecord
    blocked_by?: UserRecord
  }
}

export interface AccountExecutiveRecord {
  id: string
  name: string
  email?: string
  phone?: string
  bases?: CommercialBase[]
  created: string
  updated: string
}

export interface AgentRecord {
  id: string
  name: string
  email?: string
  phone?: string
  birthday?: string
  client_id?: string
  created: string
  updated: string
  expand?: {
    client_id?: ClientRecord
  }
}

export type NotificationType =
  | 'info'
  | 'success'
  | 'warning'
  | 'error'
  | 'approval'
  | 'report'
  | 'alert'

export interface NotificationRecord {
  id: string
  user_id: string
  title: string
  message: string
  type: NotificationType
  read: boolean
  resolved?: boolean
  link?: string
  created: string
  updated: string
  expand?: {
    user_id?: UserRecord
  }
}

export type ScheduledFrequency = 'daily' | 'weekly' | 'monthly'
export type ReportFormat = 'csv' | 'excel' | 'pdf'

export interface ScheduledReportRecord {
  id: string
  user_id: string
  frequency: ScheduledFrequency
  email: string
  format: ReportFormat
  active: boolean
  last_sent?: string
  filters?: Record<string, unknown>
  created: string
  updated: string
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

export interface ServiceRecordShare {
  id: string
  service_record: string
  user?: string
  account_executive?: string
  shared_by: string
  permission: 'Visualizar' | 'Editar'
  created: string
  updated: string
  expand?: {
    user?: UserRecord
    account_executive?: AccountExecutiveRecord
    shared_by?: UserRecord
    service_record?: ServiceRecord
  }
}

export interface ServiceRecordHistory {
  id: string
  service_record: string
  user?: string
  field: string
  old_value?: string
  new_value?: string
  justification?: string
  created: string
  updated: string
  expand?: {
    user?: UserRecord
    service_record?: ServiceRecord
  }
}

export interface AgentTargetRecord {
  id: string
  agent: string
  monthly_attendance_target: number
  min_resolution_rate: number
  created_by?: string
  created: string
  updated: string
  expand?: {
    agent?: AgentRecord
    created_by?: UserRecord
  }
}

/** Registro único (singleton) com as metas globais padrão do sistema. */
export interface GlobalTargetRecord {
  id: string
  monthly_attendance_target: number
  min_resolution_rate: number
  avg_response_time_target?: number
  auto_categorization_target?: number
  min_satisfaction_target?: number
  updated_by?: string
  created: string
  updated: string
  expand?: {
    updated_by?: UserRecord
  }
}
