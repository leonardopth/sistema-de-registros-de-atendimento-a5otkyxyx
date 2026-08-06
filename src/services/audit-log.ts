import pb from '@/lib/pocketbase/client'
import type { AuditLogRecord } from '@/types/audit-log'

export interface AuditLogFilter {
  user?: string
  action?: string
  entity?: string
  startDate?: string
  endDate?: string
}

export const getAuditLogs = async (filter: AuditLogFilter = {}, page = 1, perPage = 50) => {
  const parts: string[] = []
  if (filter.user) parts.push(`user = "${filter.user}"`)
  if (filter.action) parts.push(`action = "${filter.action}"`)
  if (filter.entity) parts.push(`entity = "${filter.entity}"`)
  if (filter.startDate) parts.push(`created >= "${filter.startDate}"`)
  if (filter.endDate) parts.push(`created <= "${filter.endDate}"`)

  return pb.collection('audit_log').getList<AuditLogRecord>(page, perPage, {
    sort: '-created',
    filter: parts.join(' && '),
    expand: 'user',
  })
}

export const getAuditLogActions = async () => {
  const records = await pb.collection('audit_log').getFullList<AuditLogRecord>({ sort: 'action' })
  return [...new Set(records.map((r) => r.action))]
}

export const getAuditLogEntities = async () => {
  const records = await pb.collection('audit_log').getFullList<AuditLogRecord>({ sort: 'entity' })
  return [...new Set(records.map((r) => r.entity))]
}
