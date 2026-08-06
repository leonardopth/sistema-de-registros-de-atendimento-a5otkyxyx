import { useState, useEffect, useMemo, useCallback } from 'react'
import { Card, CardContent } from '@/components/ui/card'
import { Badge } from '@/components/ui/badge'
import { getServiceRecords } from '@/services/service_records'
import { getUsers } from '@/services/users'
import { ServiceRecord, UserRecord, UserRole } from '@/types/service_record'
import { useRealtime } from '@/hooks/use-realtime'
import { useAuth } from '@/hooks/use-auth'
import { isManagerUser, isMasterUser } from '@/lib/service-group-access'
import { Headset, Clock, AlertTriangle, CheckCircle2, Award, Users } from 'lucide-react'

const LEADERSHIP_ROLES: UserRole[] = ['Gerentes', 'Supervisores', 'Líderes']

interface ConsultantStat {
  uid: string
  user?: UserRecord
  total: number
  avgDuration: number
  avoidableRate: number
  resolutionRate: number
}

function computeStats(records: ServiceRecord[], users: UserRecord[]): ConsultantStat[] {
  const userMap = new Map(users.map((u) => [u.id, u]))
  const leadershipIds = new Set(
    users.filter((u) => LEADERSHIP_ROLES.includes(u.role)).map((u) => u.id),
  )
  const map = new Map<string, ServiceRecord[]>()
  for (const r of records) {
    const uid = r.assigned_user || r.user_id
    if (!uid) continue
    if (leadershipIds.has(uid)) continue
    if (!map.has(uid)) map.set(uid, [])
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

export default function RelatorioConsultor() {
  const { user } = useAuth()
  const [records, setRecords] = useState<ServiceRecord[]>([])
  const [users, setUsers] = useState<UserRecord[]>([])

  const loadData = useCallback(async () => {
    try {
      const [r, u] = await Promise.all([getServiceRecords(), getUsers()])
      setRecords(r)
      setUsers(u)
    } catch (err) {
      console.error(err)
    }
  }, [])

  useEffect(() => {
    loadData()
  }, [loadData])
  useRealtime('service_records', () => loadData())

  const allStats = useMemo(() => computeStats(records, users), [records, users])

  const myStats = useMemo(() => allStats.find((s) => s.uid === user?.id), [allStats, user?.id])

  const shouldAnonymize = !isManagerUser(user) && !isMasterUser(user)

  const anonymizedNames = useMemo(() => {
    const sorted = [...allStats].sort((a, b) => a.uid.localeCompare(b.uid))
    const map = new Map<string, string>()
    sorted.forEach((s, i) => {
      map.set(s.uid, `Consultor ${i + 1}`)
    })
    return map
  }, [allStats])

  const displayName = (stat: ConsultantStat) => {
    if (!shouldAnonymize) return stat.user?.name || 'Consultor'
    return anonymizedNames.get(stat.uid) || 'Consultor'
  }

  const teamAvg = useMemo(() => {
    if (allStats.length === 0)
      return { total: 0, avgDuration: 0, avoidableRate: 0, resolutionRate: 0 }
    return {
      total: Math.round(allStats.reduce((a, s) => a + s.total, 0) / allStats.length),
      avgDuration: Math.round(allStats.reduce((a, s) => a + s.avgDuration, 0) / allStats.length),
      avoidableRate: Math.round(
        allStats.reduce((a, s) => a + s.avoidableRate, 0) / allStats.length,
      ),
      resolutionRate: Math.round(
        allStats.reduce((a, s) => a + s.resolutionRate, 0) / allStats.length,
      ),
    }
  }, [allStats])

  if (!myStats) {
    return (
      <div className="space-y-6">
        <h2 className="text-2xl font-extrabold text-slate-900">Meu Relatório</h2>
        <Card className="p-8 text-center">
          <p className="text-sm text-slate-400">Nenhum atendimento registrado ainda.</p>
        </Card>
      </div>
    )
  }

  const compareBadge = (mine: number, team: number, lowerIsBetter = false) => {
    const diff = mine - team
    const isBetter = lowerIsBetter ? diff < 0 : diff > 0
    return (
      <Badge
        variant={isBetter ? 'default' : 'secondary'}
        className={`text-[10px] ${isBetter ? 'bg-emerald-100 text-emerald-700' : 'bg-slate-100 text-slate-600'}`}
      >
        {diff > 0 ? '+' : ''}
        {diff} vs equipe
      </Badge>
    )
  }

  return (
    <div className="space-y-6">
      <div>
        <h2 className="text-2xl font-extrabold tracking-tight text-slate-900">
          Relatório Individual do Consultor
        </h2>
        <p className="text-xs text-slate-500">Sua performance comparada com a equipe</p>
      </div>

      <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-4 gap-4">
        <Card className="border-slate-200 shadow-subtle">
          <CardContent className="p-4 flex items-center justify-between">
            <div>
              <p className="text-[10px] font-bold text-slate-500 uppercase">Volume Total</p>
              <p className="text-2xl font-black text-slate-900">{myStats.total}</p>
              {compareBadge(myStats.total, teamAvg.total)}
            </div>
            <Headset className="h-8 w-8 text-cyan-600" />
          </CardContent>
        </Card>
        <Card className="border-slate-200 shadow-subtle">
          <CardContent className="p-4 flex items-center justify-between">
            <div>
              <p className="text-[10px] font-bold text-slate-500 uppercase">Tempo Médio</p>
              <p className="text-2xl font-black text-slate-900">
                {myStats.avgDuration}
                <span className="text-sm">min</span>
              </p>
              {compareBadge(myStats.avgDuration, teamAvg.avgDuration, true)}
            </div>
            <Clock className="h-8 w-8 text-rose-500" />
          </CardContent>
        </Card>
        <Card className="border-slate-200 shadow-subtle">
          <CardContent className="p-4 flex items-center justify-between">
            <div>
              <p className="text-[10px] font-bold text-amber-700 uppercase">Evitáveis</p>
              <p className="text-2xl font-black text-slate-900">{myStats.avoidableRate}%</p>
              {compareBadge(myStats.avoidableRate, teamAvg.avoidableRate, true)}
            </div>
            <AlertTriangle className="h-8 w-8 text-amber-500" />
          </CardContent>
        </Card>
        <Card className="border-slate-200 shadow-subtle">
          <CardContent className="p-4 flex items-center justify-between">
            <div>
              <p className="text-[10px] font-bold text-emerald-700 uppercase">Resolução</p>
              <p className="text-2xl font-black text-slate-900">{myStats.resolutionRate}%</p>
              {compareBadge(myStats.resolutionRate, teamAvg.resolutionRate)}
            </div>
            <CheckCircle2 className="h-8 w-8 text-emerald-500" />
          </CardContent>
        </Card>
      </div>

      <Card className="border-slate-200 shadow-subtle">
        <CardContent className="p-4">
          <div className="flex items-center gap-2 mb-3">
            <Users className="h-4 w-4 text-slate-500" />
            <h3 className="text-sm font-bold text-slate-700">Comparativo da Equipe</h3>
          </div>
          <div className="overflow-x-auto">
            <table className="w-full text-xs">
              <thead>
                <tr className="border-b text-left">
                  <th className="py-2 font-bold text-slate-600">Consultor</th>
                  <th className="py-2 font-bold text-slate-600 text-center">Volume</th>
                  <th className="py-2 font-bold text-slate-600 text-center">Tempo Médio</th>
                  <th className="py-2 font-bold text-slate-600 text-center">Evitáveis</th>
                  <th className="py-2 font-bold text-slate-600 text-center">Resolução</th>
                </tr>
              </thead>
              <tbody>
                {allStats.map((s) => (
                  <tr
                    key={s.uid}
                    className={`border-b ${s.uid === user?.id ? 'bg-indigo-50' : ''}`}
                  >
                    <td className="py-2 font-medium text-slate-800">
                      {s.uid === user?.id && (
                        <Award className="inline h-3 w-3 text-indigo-600 mr-1" />
                      )}
                      {displayName(s)}
                    </td>
                    <td className="py-2 text-center text-slate-700">{s.total}</td>
                    <td className="py-2 text-center text-slate-700">{s.avgDuration}min</td>
                    <td className="py-2 text-center">
                      <span
                        className={
                          s.avoidableRate > 30 ? 'font-bold text-rose-600' : 'text-slate-700'
                        }
                      >
                        {s.avoidableRate}%
                      </span>
                    </td>
                    <td className="py-2 text-center">
                      <span
                        className={
                          s.resolutionRate >= 70 ? 'font-bold text-emerald-600' : 'text-slate-700'
                        }
                      >
                        {s.resolutionRate}%
                      </span>
                    </td>
                  </tr>
                ))}
              </tbody>
            </table>
          </div>
        </CardContent>
      </Card>
    </div>
  )
}
