import type { ServiceRecord, ClientRecord } from '@/types/service_record'

export interface ClientAutonomyData {
  clientKey: string
  clientName: string
  companyName: string
  clientId: string
  total: number
  avoidable: number
  autonomyRate: number
  threshold?: number
}

export function computeClientAutonomy(
  records: ServiceRecord[],
  clients: ClientRecord[],
): ClientAutonomyData[] {
  const clientMap = new Map<
    string,
    { total: number; avoidable: number; name: string; company: string }
  >()

  records.forEach((r) => {
    const key = r.client_company || r.client_name || 'Desconhecido'
    if (!clientMap.has(key)) {
      clientMap.set(key, {
        total: 0,
        avoidable: 0,
        name: r.client_name || '',
        company: r.client_company || '',
      })
    }
    const entry = clientMap.get(key)!
    entry.total++
    if (r.avoidable_contact) entry.avoidable++
  })

  clients.forEach((c) => {
    const key = c.company || c.name
    if (key && !clientMap.has(key)) {
      clientMap.set(key, { total: 0, avoidable: 0, name: c.name, company: c.company || '' })
    }
  })

  return Array.from(clientMap.entries())
    .map(([key, v]) => {
      const clientRecord = clients.find((c) => c.company === key || c.name === key)
      return {
        clientKey: key,
        clientName: v.name || key,
        companyName: v.company || key,
        clientId: clientRecord?.id || '',
        total: v.total,
        avoidable: v.avoidable,
        autonomyRate: v.total > 0 ? Math.round(((v.total - v.avoidable) / v.total) * 100) : 100,
        threshold: clientRecord?.avoidable_contact_threshold,
      }
    })
    .sort((a, b) => a.autonomyRate - b.autonomyRate)
}

export interface AutonomyEvolutionPoint {
  month: string
  monthLabel: string
  autonomyRate: number
  total: number
  avoidable: number
}

const MONTH_LABELS: Record<string, string> = {
  '01': 'Jan',
  '02': 'Fev',
  '03': 'Mar',
  '04': 'Abr',
  '05': 'Mai',
  '06': 'Jun',
  '07': 'Jul',
  '08': 'Ago',
  '09': 'Set',
  '10': 'Out',
  '11': 'Nov',
  '12': 'Dez',
}

export function computeAutonomyEvolution(
  records: ServiceRecord[],
  clientKey: string,
): AutonomyEvolutionPoint[] {
  const clientRecords = records.filter(
    (r) => (r.client_company || r.client_name || 'Desconhecido') === clientKey,
  )

  const monthMap = new Map<string, { total: number; avoidable: number }>()

  clientRecords.forEach((r) => {
    if (!r.created) return
    const monthKey = r.created.substring(0, 7)
    if (!monthMap.has(monthKey)) monthMap.set(monthKey, { total: 0, avoidable: 0 })
    const entry = monthMap.get(monthKey)!
    entry.total++
    if (r.avoidable_contact) entry.avoidable++
  })

  return Array.from(monthMap.entries())
    .map(([month, v]) => {
      const [year, mon] = month.split('-')
      return {
        month,
        monthLabel: `${MONTH_LABELS[mon] || mon}/${year.slice(2)}`,
        autonomyRate: v.total > 0 ? Math.round(((v.total - v.avoidable) / v.total) * 100) : 100,
        total: v.total,
        avoidable: v.avoidable,
      }
    })
    .sort((a, b) => a.month.localeCompare(b.month))
}
