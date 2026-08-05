import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card'
import { Progress } from '@/components/ui/progress'
import { ServiceRecord } from '@/types/service_record'
import { useMemo } from 'react'
import { Trophy, Target, Zap, ShieldCheck } from 'lucide-react'

interface ConsultantGamificationProps {
  records: ServiceRecord[]
  userName: string
}

export function ConsultantGamification({ records, userName }: ConsultantGamificationProps) {
  const stats = useMemo(() => {
    const todayStr = new Date().toISOString().substring(0, 10)
    const todayRecords = records.filter((r) => r.created?.startsWith(todayStr))
    const weekAgo = new Date()
    weekAgo.setDate(weekAgo.getDate() - 7)
    const weekRecords = records.filter((r) => new Date(r.created || '') >= weekAgo)
    const todayAvoidable = todayRecords.filter((r) => r.avoidable_contact).length
    const avgDuration =
      todayRecords.length > 0
        ? Math.round(todayRecords.reduce((a, r) => a + (r.duration || 0), 0) / todayRecords.length)
        : 0
    const weeklyGoal = 30
    const weeklyProgress = Math.min(Math.round((weekRecords.length / weeklyGoal) * 100), 100)
    const cleanDay = todayAvoidable === 0 && todayRecords.length > 0
    const speedBonus = avgDuration > 0 && avgDuration <= 5
    return {
      todayCount: todayRecords.length,
      weeklyCount: weekRecords.length,
      weeklyProgress,
      avgDuration,
      cleanDay,
      speedBonus,
      todayAvoidable,
    }
  }, [records])

  return (
    <Card className="border-slate-200 shadow-subtle bg-gradient-to-br from-white via-cyan-50/30 to-indigo-50/20">
      <CardHeader className="pb-2">
        <CardTitle className="text-sm font-bold text-slate-900 flex items-center gap-2">
          <Trophy className="h-4 w-4 text-amber-500" /> Seu Desempenho
        </CardTitle>
      </CardHeader>
      <CardContent className="space-y-3">
        <div className="grid grid-cols-3 gap-2">
          <div className="text-center p-2 rounded-lg bg-white/80 border">
            <Zap className="h-4 w-4 text-cyan-500 mx-auto mb-1" />
            <p className="text-lg font-black text-slate-900">{stats.todayCount}</p>
            <p className="text-[10px] text-slate-500 font-medium">Hoje</p>
          </div>
          <div className="text-center p-2 rounded-lg bg-white/80 border">
            <Target className="h-4 w-4 text-indigo-500 mx-auto mb-1" />
            <p className="text-lg font-black text-slate-900">{stats.avgDuration}min</p>
            <p className="text-[10px] text-slate-500 font-medium">Tempo médio</p>
          </div>
          <div className="text-center p-2 rounded-lg bg-white/80 border">
            <ShieldCheck className="h-4 w-4 text-emerald-500 mx-auto mb-1" />
            <p className="text-lg font-black text-slate-900">{stats.todayAvoidable}</p>
            <p className="text-[10px] text-slate-500 font-medium">Evitáveis</p>
          </div>
        </div>
        <div className="space-y-1">
          <div className="flex items-center justify-between text-xs">
            <span className="font-semibold text-slate-600">Meta semanal</span>
            <span className="font-bold text-slate-900">{stats.weeklyCount}/30</span>
          </div>
          <Progress value={stats.weeklyProgress} className="h-2" />
        </div>
        <div className="flex flex-wrap gap-1.5">
          {stats.cleanDay && (
            <span className="inline-flex items-center gap-1 text-[10px] font-bold px-2 py-1 rounded-full bg-emerald-100 text-emerald-700">
              <ShieldCheck className="h-3 w-3" /> Dia Limpo
            </span>
          )}
          {stats.speedBonus && (
            <span className="inline-flex items-center gap-1 text-[10px] font-bold px-2 py-1 rounded-full bg-cyan-100 text-cyan-700">
              <Zap className="h-3 w-3" /> Atendimento Expresso
            </span>
          )}
          {stats.weeklyProgress >= 100 && (
            <span className="inline-flex items-center gap-1 text-[10px] font-bold px-2 py-1 rounded-full bg-amber-100 text-amber-700">
              <Trophy className="h-3 w-3" /> Meta Atingida
            </span>
          )}
          {!stats.cleanDay && !stats.speedBonus && stats.weeklyProgress < 100 && (
            <span className="text-[10px] text-slate-400">
              Continue registrando para ganhar badges!
            </span>
          )}
        </div>
      </CardContent>
    </Card>
  )
}
