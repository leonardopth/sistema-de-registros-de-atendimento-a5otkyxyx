export interface TaskItem {
  id?: string
  title: string
  done: boolean
  due_date?: string
  responsible?: string
}

export type ContactReason =
  | 'Dúvida'
  | 'Reclamação'
  | 'Suporte Técnico'
  | 'Orçamento'
  | 'Cancelamento'
  | 'Outro'

export type ServicePriority = 'Baixa' | 'Média' | 'Alta'

export type ServiceStatus = 'Aberto' | 'Em Andamento' | 'Concluído' | 'Cancelado'

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
  tasks?: TaskItem[]
  user_id: string
  created: string
  updated: string
}

export interface ClientRecord {
  id: string
  name: string
  email?: string
  phone?: string
  company?: string
  notes?: string
  created: string
  updated: string
}
