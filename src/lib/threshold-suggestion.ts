import { ServiceRecord, ClientRecord } from '@/types/service_record'

export interface ThresholdSuggestion {
  clientId: string
  clientName: string
  currentThreshold: number
  suggestedThreshold: number
  avoidableCount30d: number
  serviceGroup: string
}

export function calculateThresholdSuggestions(
  records: ServiceRecord[],
  clients: ClientRecord[],
): ThresholdSuggestion[] {
  const thirtyDaysAgo = new Date()
  thirtyDaysAgo.setDate(thirtyDaysAgo.getDate() - 30)
  const dateStr = thirtyDaysAgo.toISOString().substring(0, 10)

  const groupCounts = new Map<string, number[]>()

  for (const client of clients) {
    const group = client.service_group || 'outros'
    const count = records.filter((r) => {
      const cid = r.client || r.expand?.client?.id
      return (
        cid === client.id &&
        r.avoidable_contact &&
        r.created &&
        r.created.substring(0, 10) >= dateStr
      )
    }).length
    if (!groupCounts.has(group)) groupCounts.set(group, [])
    groupCounts.get(group)!.push(count)
  }

  const groupMedians = new Map<string, number>()
  for (const [group, counts] of groupCounts) {
    const sorted = [...counts].sort((a, b) => a - b)
    const mid = Math.floor(sorted.length / 2)
    const median = sorted.length > 0 ? sorted[mid] : 5
    groupMedians.set(group, Math.max(3, Math.min(20, median + 2)))
  }

  return clients
    .map((client) => {
      const group = client.service_group || 'outros'
      const count = records.filter((r) => {
        const cid = r.client || r.expand?.client?.id
        return (
          cid === client.id &&
          r.avoidable_contact &&
          r.created &&
          r.created.substring(0, 10) >= dateStr
        )
      }).length
      const current = client.avoidable_contact_threshold || 5
      const suggested = groupMedians.get(group) || 5
      return {
        clientId: client.id,
        clientName: client.name,
        currentThreshold: current,
        suggestedThreshold: suggested,
        avoidableCount30d: count,
        serviceGroup: group,
      }
    })
    .filter((s) => s.suggestedThreshold !== s.currentThreshold)
    .sort((a, b) => b.avoidableCount30d - a.avoidableCount30d)
}
