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
}

const PRIVILEGED_ROLES = ['Master', 'Gerentes', 'Supervisores', 'Líderes']

export function filterByUserAccess(
  records: ServiceRecord[],
  user: { id?: string; role?: string } | null | undefined,
  clientMap: Map<string, ClientRecord>,
  userMap: Map<string, { service_groups?: string[] }>,
): ServiceRecord[] {
  if (!Array.isArray(records)) return []
  if (!user) return []
  if (PRIVILEGED_ROLES.includes(user.role || '')) return records

  const userServiceGroups = userMap.get(user.id || '')?.service_groups || []

  return records.filter((r) => {
    if (r.user_id === user.id) return true
    if (r.assigned_user === user.id) return true

    if (r.client && clientMap.has(r.client)) {
      const client = clientMap.get(r.client)
      if (client && userServiceGroups.includes(client.service_group || '')) return true
    }

    return false
  })
}

export function getPreviousPeriodCount(
  records: ServiceRecord[],
  dateFrom?: string,
  dateTo?: string,
): number {
  if (!Array.isArray(records) || !dateFrom || !dateTo) return 0

  const from = new Date(dateFrom)
  const to = new Date(dateTo)
  if (isNaN(from.getTime()) || isNaN(to.getTime())) return 0

  const diffMs = to.getTime() - from.getTime()
  const prevTo = new Date(from.getTime() - 1)
  const prevFrom = new Date(prevTo.getTime() - diffMs)

  const prevFromStr = prevFrom.toISOString().substring(0, 10)
  const prevToStr = prevTo.toISOString().substring(0, 10)

  return records.filter((r) => {
    if (!r.created) return false
    const createdDate = r.created.substring(0, 10)
    return createdDate >= prevFromStr && createdDate <= prevToStr
  }).length
}

export const DEFAULT_FILTERS: DashboardFilters = {}

export function hasActiveFilters(filters: DashboardFilters): boolean {
  if (!filters) return false
  return Boolean(
    filters.searchTerm ||
    filters.contactReason ||
    filters.status ||
    filters.priority ||
    filters.channel ||
    filters.avoidableOnly ||
    filters.startDate ||
    filters.endDate ||
    filters.serviceGroup ||
    filters.commercialBase,
  )
}

export function filterRecords(
  records: ServiceRecord[] | undefined | null,
  filters: DashboardFilters,
  clients?: ClientRecord[] | undefined | null,
): ServiceRecord[] {
  if (!Array.isArray(records)) return []
  const safeClients = Array.isArray(clients) ? clients : []

  return records.filter((r) => {
    if (!r) return false

    if (filters.searchTerm) {
      const term = filters.searchTerm.toLowerCase()
      const matchName = r.client_name?.toLowerCase().includes(term)
      const matchCompany = r.client_company?.toLowerCase().includes(term)
      const matchDesc = r.description?.toLowerCase().includes(term)
      const matchReason = r.contact_reason?.toLowerCase().includes(term)
      if (!matchName && !matchCompany && !matchDesc && !matchReason) return false
    }

    if (filters.contactReason && r.contact_reason !== filters.contactReason) return false
    if (filters.status && r.status !== filters.status) return false
    if (filters.priority && r.priority !== filters.priority) return false
    if (filters.channel && r.channel !== filters.channel) return false
    if (filters.avoidableOnly && !r.avoidable_contact) return false

    if (filters.startDate && r.created) {
      if (r.created.substring(0, 10) < filters.startDate) return false
    }

    if (filters.endDate && r.created) {
      if (r.created.substring(0, 10) > filters.endDate) return false
    }

    if (filters.serviceGroup && safeClients.length > 0) {
      const matchingClient = safeClients.find(
        (c) =>
          c && (c.id === r.client || c.name === r.client_name || c.company === r.client_company),
      )
      if (matchingClient && matchingClient.service_group !== filters.serviceGroup) return false
    }

    return true
  })
}
