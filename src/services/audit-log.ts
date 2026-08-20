import pb from '@/lib/pocketbase/client'
import type { AuditLogRecord } from '@/types/audit-log'

export interface AuditLogFilter {
  user_id?: string
  action?: string
  entity?: string
  startDate?: string
  endDate?: string
}

export async function createAuditLog(data: {
  user?: string
  action: string
  entity: string
  entity_id?: string
  details?: Record<string, unknown>
}) {
  try {
    const userId = data.user || pb.authStore.record?.id || ''
    return await pb.collection('audit_log').create({
      user: userId || undefined,
      action: data.action,
      entity: data.entity,
      entity_id: data.entity_id || '',
      details: data.details || {},
    })
  } catch (err) {
    console.error('Failed to create audit log:', err)
  }
}

export async function getAuditLogs(filter?: AuditLogFilter): Promise<AuditLogRecord[]> {
  const filterParts: string[] = []

  if (filter?.user_id && filter.user_id !== 'ALL') {
    filterParts.push(`user = "${filter.user_id}"`)
  }
  if (filter?.action && filter.action !== 'ALL') {
    filterParts.push(`action ~ "${filter.action}"`)
  }
  if (filter?.entity && filter.entity !== 'ALL') {
    filterParts.push(`entity = "${filter.entity}"`)
  }
  if (filter?.startDate) {
    filterParts.push(`created >= "${filter.startDate} 00:00:00"`)
  }
  if (filter?.endDate) {
    filterParts.push(`created <= "${filter.endDate} 23:59:59"`)
  }

  const filterString = filterParts.join(' && ')

  return await pb.collection('audit_log').getFullList<AuditLogRecord>({
    filter: filterString || undefined,
    sort: '-created',
    expand: 'user',
  })
}

export async function getAuditLogActions(): Promise<string[]> {
  try {
    const logs = await pb.collection('audit_log').getFullList<AuditLogRecord>({ fields: 'action' })
    const actions = new Set(logs.map((l) => l.action).filter(Boolean))
    return Array.from(actions)
  } catch {
    return []
  }
}

export async function getAuditLogEntities(): Promise<string[]> {
  try {
    const logs = await pb.collection('audit_log').getFullList<AuditLogRecord>({ fields: 'entity' })
    const entities = new Set(logs.map((l) => l.entity).filter(Boolean))
    return Array.from(entities)
  } catch {
    return []
  }
}
