import { Card, CardContent } from '@/components/ui/card'
import { Headset, PlayCircle, CheckCircle2, Clock, AlertTriangle } from 'lucide-react'
import { useNavigate } from 'react-router-dom'

interface DashboardStatsProps {
  todayCount: number
  totalCount: number
  inProgressCount: number
  completedTodayCount: number
  avgDuration: number
  wrongDeptCount: number
}

export function DashboardStats({
  todayCount,
  totalCount,
  inProgressCount,
  completedTodayCount,
  avgDuration,
  wrongDeptCount,
}: DashboardStatsProps) {
  const navigate = useNavigate()

  return (
    <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-5 gap-4">
      <Card className="border-slate-200 shadow-subtle hover:shadow-elevation transition-all bg-gradient-to-br from-white via-cyan-50/20 to-blue-50/30 border-t-4 border-t-cyan-500">
        <CardContent className="p-4 flex items-center justify-between">
          <div>
            <p className="text-xs font-bold text-slate-500 uppercase tracking-wider">
              Atendimentos Hoje
            </p>
            <h3 className="text-2xl font-black text-slate-900 mt-1">{todayCount}</h3>
            <p className="text-[11px] text-cyan-600 font-semibold mt-1">
              {totalCount} no total registrado
            </p>
          </div>
          <div className="h-12 w-12 rounded-xl bg-cyan-100/80 text-cyan-700 flex items-center justify-center shadow-xs">
            <Headset className="h-6 w-6" />
          </div>
        </CardContent>
      </Card>

      <Card className="border-slate-200 shadow-subtle hover:shadow-elevation transition-all bg-gradient-to-br from-white via-purple-50/20 to-indigo-50/30 border-t-4 border-t-purple-500">
        <CardContent className="p-4 flex items-center justify-between">
          <div>
            <p className="text-xs font-bold text-slate-500 uppercase tracking-wider">
              Em Andamento
            </p>
            <h3 className="text-2xl font-black text-slate-900 mt-1">{inProgressCount}</h3>
            <p className="text-[11px] text-purple-600 font-semibold mt-1">
              Requer atenção imediata
            </p>
          </div>
          <div className="h-12 w-12 rounded-xl bg-purple-100/80 text-purple-700 flex items-center justify-center shadow-xs">
            <PlayCircle className="h-6 w-6" />
          </div>
        </CardContent>
      </Card>

      <Card className="border-slate-200 shadow-subtle hover:shadow-elevation transition-all bg-gradient-to-br from-white via-emerald-50/20 to-teal-50/30 border-t-4 border-t-emerald-500">
        <CardContent className="p-4 flex items-center justify-between">
          <div>
            <p className="text-xs font-bold text-slate-500 uppercase tracking-wider">
              Concluídos Hoje
            </p>
            <h3 className="text-2xl font-black text-slate-900 mt-1">{completedTodayCount}</h3>
            <p className="text-[11px] text-emerald-600 font-semibold mt-1">
              Resolvidos com sucesso
            </p>
          </div>
          <div className="h-12 w-12 rounded-xl bg-emerald-100/80 text-emerald-700 flex items-center justify-center shadow-xs">
            <CheckCircle2 className="h-6 w-6" />
          </div>
        </CardContent>
      </Card>

      <Card className="border-slate-200 shadow-subtle hover:shadow-elevation transition-all bg-gradient-to-br from-white via-rose-50/20 to-orange-50/30 border-t-4 border-t-rose-400">
        <CardContent className="p-4 flex items-center justify-between">
          <div>
            <p className="text-xs font-bold text-slate-500 uppercase tracking-wider">Tempo Médio</p>
            <h3 className="text-2xl font-black text-slate-900 mt-1">{avgDuration} min</h3>
            <p className="text-[11px] text-rose-600 font-semibold mt-1">Duração média de chamado</p>
          </div>
          <div className="h-12 w-12 rounded-xl bg-rose-100/80 text-rose-700 flex items-center justify-center shadow-xs">
            <Clock className="h-6 w-6" />
          </div>
        </CardContent>
      </Card>

      <Card
        className="border-slate-200 shadow-subtle hover:shadow-elevation transition-all bg-gradient-to-br from-white via-amber-50/20 to-yellow-50/30 border-t-4 border-t-amber-500 cursor-pointer"
        onClick={() => navigate('/atendimentos?avoidable_contact=sim')}
      >
        <CardContent className="p-4 flex items-center justify-between">
          <div>
            <p className="text-xs font-bold text-slate-500 uppercase tracking-wider">
              Contato Evitável
            </p>
            <h3 className="text-2xl font-black text-slate-900 mt-1">{wrongDeptCount}</h3>
            <p className="text-[11px] text-amber-600 font-semibold mt-1">
              Atendimentos mal direcionados
            </p>
          </div>
          <div className="h-12 w-12 rounded-xl bg-amber-100/80 text-amber-700 flex items-center justify-center shadow-xs">
            <AlertTriangle className="h-6 w-6" />
          </div>
        </CardContent>
      </Card>
    </div>
  )
}
