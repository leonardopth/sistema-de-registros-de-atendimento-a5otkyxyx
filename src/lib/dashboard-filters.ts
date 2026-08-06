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
  serviceGroup?: string
  commercialBase?: string
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
