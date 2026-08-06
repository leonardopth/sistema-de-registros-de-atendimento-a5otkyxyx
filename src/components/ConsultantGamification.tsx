import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card'
import { ServiceRecord } from '@/types/service_record'
import { Trophy, Star, CheckCircle2 } from 'lucide-react'

interface ConsultantGamificationProps {
  records?: ServiceRecord[]
  userName?: string
}

export function ConsultantGamification({ records = [] }: ConsultantGamificationProps) {
  const safeRecords = Array.isArray(records) ? records : []
  const todayStr = new Date().toISOString().substring(0, 10)

  const todayRecords = safeRecords.filter(
    (r) => r && typeof r.created === 'string' && r.created.startsWith(todayStr),
  )
  const completedToday = todayRecords.filter((r) => r && r.status === 'Concluído').length
  const totalCompleted = safeRecords.filter((r) => r && r.status === 'Concluído').length

  const points = completedToday * 10 + totalCompleted * 2
  const level = Math.floor(points / 50) + 1
  const pointsNextLevel = level * 50 - points

  return (
    <Card className="border-slate-200 shadow-subtle bg-gradient-to-br from-slate-900 to-indigo-950 text-white">
      <CardHeader className="pb-2">
        <CardTitle className="text-sm font-bold text-white flex items-center justify-between">
          <span className="flex items-center gap-2">
            <Trophy className="h-4 w-4 text-amber-400" /> Meu Desempenho
          </span>
          <span className="text-xs px-2 py-0.5 rounded-full bg-amber-400/20 text-amber-300 font-semibold border border-amber-400/30">
            Nível {level}
          </span>
        </CardTitle>
      </CardHeader>
      <CardContent className="space-y-3">
        <div className="grid grid-cols-2 gap-2">
          <div className="p-2.5 rounded-lg bg-white/10 backdrop-blur-sm">
            <div className="flex items-center gap-1.5 text-xs text-slate-300">
              <Star className="h-3.5 w-3.5 text-amber-400" /> Pontos
            </div>
            <p className="text-xl font-bold text-white mt-1">{points} pts</p>
          </div>
          <div className="p-2.5 rounded-lg bg-white/10 backdrop-blur-sm">
            <div className="flex items-center gap-1.5 text-xs text-slate-300">
              <CheckCircle2 className="h-3.5 w-3.5 text-emerald-400" /> Hoje
            </div>
            <p className="text-xl font-bold text-white mt-1">{completedToday} concluídos</p>
          </div>
        </div>

        <div className="space-y-1">
          <div className="flex justify-between text-[11px] text-slate-300">
            <span>Próximo nível</span>
            <span className="font-semibold text-amber-300">{pointsNextLevel} pts restantes</span>
          </div>
          <div className="w-full h-1.5 bg-slate-800 rounded-full overflow-hidden">
            <div
              className="h-full bg-gradient-to-r from-amber-400 to-emerald-400 transition-all duration-500"
              style={{ width: `${Math.min(100, Math.max(10, ((points % 50) / 50) * 100))}%` }}
            />
          </div>
        </div>
      </CardContent>
    </Card>
  )
}
