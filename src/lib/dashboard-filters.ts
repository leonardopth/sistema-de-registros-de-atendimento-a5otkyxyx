import { ServiceRecord } from '@/types/service_record'

export interface DashboardFilters {
  dateFrom: string
  dateTo: string
  status: string
  priority: string
  serviceGroup: string
  contactReason: string
  channel: string
  avoidableOnly: boolean
}

export const DEFAULT_FILTERS: DashboardFilters = {
  dateFrom: '',
  dateTo: '',
  status: 'Todos',
  priority: 'Todas',
  serviceGroup: 'Todos',
  contactReason: 'Todos',
  channel: 'Todos',
  avoidableOnly: false,
}

export function hasActiveFilters(f: DashboardFilters): boolean {
  return (
    f.dateFrom !== '' ||
    f.dateTo !== '' ||
    f.status !== 'Todos' ||
    f.priority !== 'Todas' ||
    f.serviceGroup !== 'Todos' ||
    f.contactReason !== 'Todos' ||
    f.channel !== 'Todos' ||
    f.avoidableOnly
  )
}

export function filterRecords(
  records: ServiceRecord[],
  f: DashboardFilters,
  clientMap?: Map<string, { service_group?: string }>,
): ServiceRecord[] {
  return records.filter((r) => {
    if (f.dateFrom && r.created && r.created.substring(0, 10) < f.dateFrom) return false
    if (f.dateTo && r.created && r.created.substring(0, 10) > f.dateTo) return false
    if (f.status !== 'Todos' && r.status !== f.status) return false
    if (f.priority !== 'Todas' && r.priority !== f.priority) return false
    if (f.contactReason !== 'Todos' && r.contact_reason !== f.contactReason) return false
    if (f.channel !== 'Todos' && r.channel !== f.channel) return false
    if (f.avoidableOnly && !r.avoidable_contact) return false
    if (f.serviceGroup !== 'Todos') {
      const clientId = r.client || r.expand?.client?.id
      if (clientId && clientMap) {
        const client = clientMap.get(clientId)
        if (client?.service_group !== f.serviceGroup) return false
      } else {
        return false
      }
    }
    return true
  })
}

export function getPreviousPeriodCount(
  records: ServiceRecord[],
  dateFrom: string,
  dateTo: string,
): number {
  if (!dateFrom || !dateTo) return 0
  const from = new Date(dateFrom + 'T00:00:00')
  const to = new Date(dateTo + 'T23:59:59')
  const duration = to.getTime() - from.getTime()
  const prevTo = new Date(from.getTime() - 1)
  const prevFrom = new Date(prevTo.getTime() - duration)
  const prevFromStr = prevFrom.toISOString().substring(0, 10)
  const prevToStr = prevTo.toISOString().substring(0, 10)
  return records.filter((r) => {
    if (!r.created) return false
    const d = r.created.substring(0, 10)
    return d >= prevFromStr && d <= prevToStr
  }).length
}
