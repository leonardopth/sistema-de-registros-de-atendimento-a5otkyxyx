import { Card, CardContent } from '@/components/ui/card'
import { Calendar, Clock, Activity, AlertOctagon } from 'lucide-react'

interface DashboardStatsProps {
  todayCount?: number
  totalCount?: number
  inProgressCount?: number
  completedTodayCount?: number
  avgDuration?: number
  wrongDeptCount?: number
}

export function DashboardStats({
  todayCount = 0,
  inProgressCount = 0,
  completedTodayCount = 0,
  avgDuration = 0,
  wrongDeptCount = 0,
}: DashboardStatsProps) {
  const statCards = [
    {
      title: 'Atendimentos Hoje',
      value: Number.isFinite(todayCount) ? todayCount : 0,
      subtext: `${Number.isFinite(completedTodayCount) ? completedTodayCount : 0} concluídos hoje`,
      icon: Calendar,
      color: 'text-indigo-600',
      bgColor: 'bg-indigo-50',
    },
    {
      title: 'Em Andamento',
      value: Number.isFinite(inProgressCount) ? inProgressCount : 0,
      subtext: 'Aguardando finalização',
      icon: Activity,
      color: 'text-amber-600',
      bgColor: 'bg-amber-50',
    },
    {
      title: 'Tempo Médio',
      value: `${Number.isFinite(avgDuration) ? avgDuration : 0} min`,
      subtext: 'Duração média total',
      icon: Clock,
      color: 'text-cyan-600',
      bgColor: 'bg-cyan-50',
    },
    {
      title: 'Contatos Evitáveis',
      value: Number.isFinite(wrongDeptCount) ? wrongDeptCount : 0,
      subtext: 'Registros com flag evitável',
      icon: AlertOctagon,
      color: 'text-rose-600',
      bgColor: 'bg-rose-50',
    },
  ]

  return (
    <div className="grid grid-cols-2 lg:grid-cols-4 gap-3 sm:gap-4">
      {statCards.map((stat, idx) => {
        const Icon = stat.icon
        return (
          <Card
            key={idx}
            className="border-slate-200 shadow-subtle hover:border-slate-300 transition-colors"
          >
            <CardContent className="p-4 flex items-center justify-between">
              <div>
                <p className="text-xs font-medium text-slate-500">{stat.title}</p>
                <p className="text-xl sm:text-2xl font-extrabold text-slate-900 mt-1">
                  {stat.value}
                </p>
                <p className="text-[10px] text-slate-400 mt-0.5">{stat.subtext}</p>
              </div>
              <div className={`p-2.5 rounded-xl ${stat.bgColor} ${stat.color} shrink-0`}>
                <Icon className="h-5 w-5" />
              </div>
            </CardContent>
          </Card>
        )
      })}
    </div>
  )
}
