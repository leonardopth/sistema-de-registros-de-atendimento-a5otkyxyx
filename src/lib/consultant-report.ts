import { ServiceRecord, UserRecord } from '@/types/service_record'
import { isManagerUser, isMasterUser, getUserServiceGroups } from '@/lib/service-group-access'

export interface ConsultantStat {
  uid: string
  user?: UserRecord
  total: number
  avgDuration: number
  avoidableRate: number
  resolutionRate: number
}

export function computeConsultantStats(
  records: ServiceRecord[],
  users: UserRecord[],
): ConsultantStat[] {
  const userMap = new Map(users.map((u) => [u.id, u]))
  const consultants = users.filter((u) => u.role === 'Consultores')
  const map = new Map<string, ServiceRecord[]>()

  // Inicializa mapa para todos os consultores cadastrados (para que mesmo consultores com 0 atendimentos apareçam)
  for (const c of consultants) {
    map.set(c.id, [])
  }

  for (const r of records) {
    const uid = r.assigned_user || r.user_id
    if (!uid || !map.has(uid)) continue
    map.get(uid)!.push(r)
  }

  return Array.from(map.entries())
    .map(([uid, recs]) => {
      const total = recs.length
      const avgDuration =
        total > 0 ? Math.round(recs.reduce((a, r) => a + (r.duration || 0), 0) / total) : 0
      const avoidable = recs.filter((r) => r.avoidable_contact).length
      const avoidableRate = total > 0 ? Math.round((avoidable / total) * 100) : 0
      const completed = recs.filter((r) => r.status === 'Concluído').length
      const resolutionRate = total > 0 ? Math.round((completed / total) * 100) : 0
      return { uid, user: userMap.get(uid), total, avgDuration, avoidableRate, resolutionRate }
    })
    .sort((a, b) => b.total - a.total)
}

export function filterConsultantsByAccess(stats: ConsultantStat[], user: any): ConsultantStat[] {
  if (!user) return []
  // Usuários com papel "Master" ou permissão master_access visualizam TODOS os consultores sem restrição
  if (isMasterUser(user)) return stats
  // Gestão/Liderança (Gerentes, Supervisores, Líderes) visualiza consultores dos seus grupos de atendimento
  if (isManagerUser(user)) {
    const groups = getUserServiceGroups(user)
    if (groups.length === 0) return stats
    return stats.filter((s) => {
      // Se for o próprio líder ou consultor da mesma equipe/grupo
      if (s.uid === user.id) return true
      const cg = s.user?.service_groups || []
      return cg.some((g) => groups.includes(g))
    })
  }
  // Consultores não-master e demais usuários comuns visualizam apenas seus próprios dados
  return stats.filter((s) => s.uid === user.id)
}

export interface TeamAggregate {
  total: number
  avgDuration: number
  avoidableRate: number
  resolutionRate: number
}

export function computeTeamAverage(stats: ConsultantStat[]): TeamAggregate {
  if (stats.length === 0) return { total: 0, avgDuration: 0, avoidableRate: 0, resolutionRate: 0 }
  return {
    total: Math.round(stats.reduce((a, s) => a + s.total, 0) / stats.length),
    avgDuration: Math.round(stats.reduce((a, s) => a + s.avgDuration, 0) / stats.length),
    avoidableRate: Math.round(stats.reduce((a, s) => a + s.avoidableRate, 0) / stats.length),
    resolutionRate: Math.round(stats.reduce((a, s) => a + s.resolutionRate, 0) / stats.length),
  }
}

export function buildAnonymizedNames(stats: ConsultantStat[]): Map<string, string> {
  const sorted = [...stats].sort((a, b) => a.uid.localeCompare(b.uid))
  const map = new Map<string, string>()
  sorted.forEach((s, i) => map.set(s.uid, `Consultor ${i + 1}`))
  return map
}
