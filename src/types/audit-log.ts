export interface AuditLogRecord {
  id: string
  user: string
  action: string
  entity: string
  entity_id?: string
  details?: Record<string, unknown>
  created: string
  updated: string
  expand?: {
    user?: {
      id: string
      name: string
      email: string
      role: string
    }
  }
}
