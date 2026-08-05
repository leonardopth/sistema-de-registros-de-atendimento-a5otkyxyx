export interface TaskItem {
  id?: string
  title: string
  done: boolean
  due_date?: string
  responsible?: string
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

export type UserRole =
  | 'Gerentes'
  | 'Supervisores'
  | 'Líderes'
  | 'Consultores'
  | 'Executivo de contas'
  | 'Master'

export type ApprovalStatus = 'Pendente' | 'Aprovado' | 'Rejeitado'

export interface ServiceRecord {
  id: string
  client_name: string
  client_email?: string
  client_phone?: string
  client_company?: string
  contact_reason: ContactReason
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
  approval_status?: ApprovalStatus
  approved_by?: string
  approved_by_id?: string
  approved_at?: string
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
  created: string
  updated: string
  expand?: {
    account_executive_rel?: AccountExecutiveRecord
  }
}

export interface AccountExecutiveRecord {
  id: string
  name: string
  email?: string
  phone?: string
  created: string
  updated: string
}

export interface AgentRecord {
  id: string
  name: string
  email?: string
  phone?: string
  client_id: string
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
