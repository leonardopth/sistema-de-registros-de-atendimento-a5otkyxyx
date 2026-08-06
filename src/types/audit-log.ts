import type { UserRecord } from '@/types/service_record'

export interface AuditLogRecord {
  id: string
  user: string
  action: string
  entity: string
  entity_id: string
  details: Record<string, unknown> | string
  created: string
  updated: string
  expand?: {
    user?: UserRecord
  }
}
