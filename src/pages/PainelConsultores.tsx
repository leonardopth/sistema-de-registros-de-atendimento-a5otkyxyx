import { useState, useEffect, useMemo } from 'react'
import { Card, CardContent } from '@/components/ui/card'
import { Badge } from '@/components/ui/badge'
import { getServiceRecords } from '@/services/service_records'
import { getUsers } from '@/services/users'
import { ServiceRecord, UserRecord } from '@/types/service_record'
import { useRealtime } from '@/hooks/use-realtime'
import { Headset, Clock, AlertTriangle, CheckCircle2 } from 'lucide-react'

export default function PainelConsultores() {
  const [records, setRecords] = useState<ServiceRecord[]>([])
  const [users, setUsers] = useState<UserRecord[]>([])

  const loadData = async () => {
    try {
      const [recs, usrs] = await Promise.all([getServiceRecords(), getUsers()])
      setRecords(recs)
      setUsers(usrs)
    } catch (err) {
      console.error(err)
    }
  }

  useEffect(() => {
    loadData()
  }, [])
  useRealtime('service_records', () => loadData())

  const consultantStats = useMemo(() => {
    const userMap = new Map(users.map((u) => [u.id, u]))
    const groupMap = new Map<string, ServiceRecord[]>()
    for (const r of records) {
      const uid = r.assigned_user || r.user_id
      if (!uid) continue
      if (!groupMap.has(uid)) groupMap.set(uid, [])
      groupMap.get(uid)!.push(r)
    }
    return Array.from(groupMap.entries())
      .map(([uid, recs]) => {
        const u = userMap.get(uid)
        const total = recs.length
        const avgDuration =
          total > 0 ? Math.round(recs.reduce((a, r) => a + (r.duration || 0), 0) / total) : 0
        const avoidable = recs.filter((r) => r.avoidable_contact).length
        const avoidableRate = total > 0 ? Math.round((avoidable / total) * 100) : 0
        const completed = recs.filter((r) => r.status === 'Concluído').length
        const resolutionRate = total > 0 ? Math.round((completed / total) * 100) : 0
        return { user: u, uid, total, avgDuration, avoidableRate, resolutionRate }
      })
      .sort((a, b) => b.total - a.total)
  }, [records, users])

  return (
    <div className="space-y-6">
      <div>
        <h2 className="text-2xl font-extrabold tracking-tight text-slate-900">
          Painel Comparativo de Consultores
        </h2>
        <p className="text-xs text-slate-500">Comparativo de desempenho por consultor</p>
      </div>
      {consultantStats.length === 0 ? (
        <Card className="p-8 text-center">
          <p className="text-sm text-slate-400">Nenhum dado disponível.</p>
        </Card>
      ) : (
        <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-4">
          {consultantStats.map(
            ({ user, uid, total, avgDuration, avoidableRate, resolutionRate }) => (
              <Card key={uid} className="border-slate-200 shadow-subtle">
                <CardContent className="p-4 space-y-3">
                  <div className="flex items-center justify-between border-b pb-2">
                    <div>
                      <h4 className="text-sm font-bold text-slate-900">
                        {user?.name || 'Consultor'}
                      </h4>
                      {user?.role && (
                        <span className="text-[10px] text-cyan-600 font-semibold">{user.role}</span>
                      )}
                    </div>
                    <Badge variant="secondary" className="text-xs gap-1">
                      <Headset className="h-3 w-3" /> {total}
                    </Badge>
                  </div>
                  <div className="grid grid-cols-2 gap-2">
                    <div className="rounded-lg bg-slate-50 p-2 text-center">
                      <Clock className="h-4 w-4 text-rose-500 mx-auto mb-1" />
                      <p className="text-[10px] font-bold text-slate-500 uppercase">Tempo Médio</p>
                      <p className="text-base font-black text-slate-900">{avgDuration} min</p>
                    </div>
                    <div className="rounded-lg bg-amber-50 p-2 text-center">
                      <AlertTriangle className="h-4 w-4 text-amber-500 mx-auto mb-1" />
                      <p className="text-[10px] font-bold text-amber-700 uppercase">Evitáveis</p>
                      <p className="text-base font-black text-slate-900">{avoidableRate}%</p>
                    </div>
                  </div>
                  <div className="rounded-lg bg-emerald-50 p-2 text-center">
                    <CheckCircle2 className="h-4 w-4 text-emerald-500 mx-auto mb-1" />
                    <p className="text-[10px] font-bold text-emerald-700 uppercase">
                      Taxa de Resolução
                    </p>
                    <p className="text-lg font-black text-slate-900">{resolutionRate}%</p>
                  </div>
                </CardContent>
              </Card>
            ),
          )}
        </div>
      )}
    </div>
  )
}
