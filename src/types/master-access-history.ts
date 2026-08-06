import type { UserRecord } from '@/types/service_record'

export interface MasterAccessHistory {
  id: string
  user: string
  actioned_by: string
  action: 'Concedido' | 'Revogado'
  created: string
  updated: string
  expand?: {
    user?: UserRecord
    actioned_by?: UserRecord
  }
}
