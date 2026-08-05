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

export type UserRole = 'Gerentes' | 'Supervisores' | 'Líderes' | 'Consultores'

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
