import { ServiceRecord, ClientRecord } from '@/types/service_record'

export interface DashboardFilters {
  searchTerm?: string
  contactReason?: string
  status?: string
  priority?: string
  channel?: string
  avoidableOnly?: boolean
  startDate?: string
  endDate?: string
  dateFrom?: string
  dateTo?: string
  serviceGroup?: string
  commercialBase?: string
  travelType?: string
}

export const DEFAULT_FILTERS: DashboardFilters = {
  searchTerm: '',
  contactReason: 'Todos',
  status: 'Todos',
  priority: 'Todas',
  channel: 'Todos',
  avoidableOnly: false,
  dateFrom: '',
  dateTo: '',
  serviceGroup: 'Todos',
  travelType: 'Todos',
}

export function hasActiveFilters(filters: DashboardFilters): boolean {
  return (
    !!filters.searchTerm ||
    (filters.contactReason != null && filters.contactReason !== 'Todos') ||
    (filters.status != null && filters.status !== 'Todos') ||
    (filters.priority != null && filters.priority !== 'Todas') ||
    (filters.channel != null && filters.channel !== 'Todos') ||
    filters.avoidableOnly === true ||
    !!filters.dateFrom ||
    !!filters.dateTo ||
    (filters.serviceGroup != null && filters.serviceGroup !== 'Todos') ||
    (filters.travelType != null && filters.travelType !== 'Todos')
  )
}

export function filterByUserAccess(
  records: ServiceRecord[],
  user:
    | { id?: string; role?: string; service_groups?: string[]; master_access?: boolean }
    | null
    | undefined,
  clientMap: Map<string, ClientRecord>,
  userMap: Map<string, { service_groups?: string[] }>,
): ServiceRecord[] {
  if (!user) return []
  if (user.role === 'Master' || user.master_access) return records
  const userServiceGroups = (user.service_groups as string[] | undefined) || []
  const isManager = ['Gerentes', 'Supervisores', 'Líderes'].includes(user.role || '')
  if (userServiceGroups.length === 0) return records

  const companyToGroup = new Map<string, string>()
  for (const [, c] of clientMap) {
    if (c.company && c.service_group) companyToGroup.set(c.company.toLowerCase(), c.service_group)
  }

  return records.filter((r) => {
    if (r.user_id === user.id || r.assigned_user === user.id) return true
    let recordGroup: string | undefined
    const cid = r.client || r.expand?.client?.id
    if (cid) recordGroup = clientMap.get(cid)?.service_group
    if (!recordGroup && r.client_company)
      recordGroup = companyToGroup.get(r.client_company.toLowerCase())
    if (recordGroup && userServiceGroups.includes(recordGroup)) return true
    if (isManager) {
      const creatorId = r.assigned_user || r.user_id
      const creatorGroups = creatorId ? userMap.get(creatorId)?.service_groups : undefined
      if (creatorGroups && creatorGroups.some((g) => userServiceGroups.includes(g))) return true
    }
    return false
  })
}

export function getPreviousPeriodCount(
  records: ServiceRecord[],
  dateFrom?: string,
  dateTo?: string,
): number {
  if (!dateFrom || !dateTo) return 0
  try {
    const start = new Date(dateFrom + 'T00:00:00')
    const end = new Date(dateTo + 'T23:59:59')
    const duration = end.getTime() - start.getTime()
    const prevEnd = new Date(start.getTime() - 1)
    const prevStart = new Date(prevEnd.getTime() - duration)
    const prevStartStr = prevStart.toISOString().substring(0, 10)
    const prevEndStr = prevEnd.toISOString().substring(0, 10)
    return records.filter((r) => {
      const recDate = r.created?.substring(0, 10) || ''
      return recDate >= prevStartStr && recDate <= prevEndStr
    }).length
  } catch {
    return 0
  }
}

export function filterRecords(
  records: ServiceRecord[] | undefined | null,
  filters: DashboardFilters,
  clients?: Map<string, ClientRecord> | ClientRecord[] | undefined | null,
): ServiceRecord[] {
  if (!records) return []
  const clientMap =
    clients instanceof Map ? clients : new Map((clients || []).map((c) => [c.id, c]))
  const companyToGroup = new Map<string, string>()
  for (const [, c] of clientMap) {
    if (c.company && c.service_group) companyToGroup.set(c.company.toLowerCase(), c.service_group)
  }

  return records.filter((r) => {
    if (filters.searchTerm) {
      const s = filters.searchTerm.toLowerCase()
      if (
        !r.client_name?.toLowerCase().includes(s) &&
        !r.description?.toLowerCase().includes(s) &&
        !r.client_company?.toLowerCase().includes(s)
      )
        return false
    }
    if (
      filters.contactReason &&
      filters.contactReason !== 'Todos' &&
      r.contact_reason !== filters.contactReason
    )
      return false
    if (filters.status && filters.status !== 'Todos' && r.status !== filters.status) return false
    if (filters.priority && filters.priority !== 'Todas' && r.priority !== filters.priority)
      return false
    if (filters.channel && filters.channel !== 'Todos' && r.channel !== filters.channel)
      return false
    if (filters.avoidableOnly && !r.avoidable_contact) return false
    if (
      filters.travelType &&
      filters.travelType !== 'Todos' &&
      r.travel_type !== filters.travelType
    )
      return false

    const recDate = r.created?.substring(0, 10) || ''
    if (filters.dateFrom && recDate < filters.dateFrom) return false
    if (filters.dateTo && recDate > filters.dateTo) return false
    if (filters.startDate && recDate < filters.startDate) return false
    if (filters.endDate && recDate > filters.endDate) return false

    if (filters.serviceGroup && filters.serviceGroup !== 'Todos') {
      let recordGroup: string | undefined
      const cid = r.client || r.expand?.client?.id
      if (cid) recordGroup = clientMap.get(cid)?.service_group
      if (!recordGroup && r.client_company)
        recordGroup = companyToGroup.get(r.client_company.toLowerCase())
      if (recordGroup !== filters.serviceGroup) return false
    }

    return true
  })
}
