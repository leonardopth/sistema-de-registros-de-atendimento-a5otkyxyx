import { Card, CardContent } from '@/components/ui/card'
import { Calendar, Clock, Activity, AlertOctagon, Info, ListChecks } from 'lucide-react'
import { Tooltip, TooltipContent, TooltipTrigger } from '@/components/ui/tooltip'
import { Popover, PopoverContent, PopoverTrigger } from '@/components/ui/popover'
import { Button } from '@/components/ui/button'
import { Badge } from '@/components/ui/badge'
import { cn } from '@/lib/utils'

interface StatusBreakdown {
  Aberto: number
  'Em Andamento': number
  Concluído: number
  Cancelado: number
}

interface DashboardStatsProps {
  todayCount?: number
  todayCountTotal?: number
  isStatusFiltered?: boolean
  activeStatusFilter?: string | null
  totalCount?: number
  cancelledCount?: number
  inProgressCount?: number
  completedTodayCount?: number
  avgDuration?: number
  wrongDeptCount?: number
  statusBreakdown?: StatusBreakdown
}

const STATUS_LABELS: Record<string, string> = {
  Aberto: 'Aberto',
  'Em Andamento': 'Em Andamento',
  Concluído: 'Concluído',
  Cancelado: 'Cancelado',
}

const STATUS_COLORS: Record<string, string> = {
  Aberto: 'text-amber-600',
  'Em Andamento': 'text-purple-600',
  Concluído: 'text-emerald-600',
  Cancelado: 'text-rose-600',
}

export function DashboardStats({
  todayCount = 0,
  todayCountTotal = 0,
  isStatusFiltered = false,
  activeStatusFilter = null,
  totalCount = 0,
  cancelledCount = 0,
  inProgressCount = 0,
  completedTodayCount = 0,
  avgDuration = 0,
  wrongDeptCount = 0,
  statusBreakdown,
}: DashboardStatsProps) {
  const safeTodayCount = Number.isFinite(todayCount) ? todayCount : 0
  const safeTodayTotal = Number.isFinite(todayCountTotal) ? todayCountTotal : 0
  const safeTotalCount = Number.isFinite(totalCount) ? totalCount : 0
  const safeCancelled = Number.isFinite(cancelledCount) ? cancelledCount : 0
  const safeInProgress = Number.isFinite(inProgressCount) ? inProgressCount : 0
  const safeCompleted = Number.isFinite(completedTodayCount) ? completedTodayCount : 0
  const safeAvgDuration = Number.isFinite(avgDuration) ? avgDuration : 0
  const safeWrongDept = Number.isFinite(wrongDeptCount) ? wrongDeptCount : 0

  const todayLabel = isStatusFiltered
    ? `Atendimentos hoje – filtro: ${activeStatusFilter}`
    : 'Atendimentos criados hoje – todos os status'

  const todaySubtext = isStatusFiltered
    ? `${safeTodayTotal} no total hoje`
    : `${safeCompleted} concluídos hoje`

  const totalSubtext = isStatusFiltered
    ? `Filtro ativo: ${activeStatusFilter}`
    : `Inclui ${safeCancelled} cancelado(s)`

  const statCards = [
    {
      title: 'Total de Atendimentos',
      value: safeTotalCount,
      subtext: totalSubtext,
      icon: ListChecks,
      color: 'text-indigo-600',
      bgColor: 'bg-indigo-50',
      isTodayCard: false,
      isTotalCard: true,
    },
    {
      title: 'Atendimentos Hoje',
      value: safeTodayCount,
      subtext: todaySubtext,
      icon: Calendar,
      color: 'text-indigo-600',
      bgColor: 'bg-indigo-50',
      isTodayCard: true,
      isTotalCard: false,
    },
    {
      title: 'Em Andamento',
      value: safeInProgress,
      subtext: 'Aguardando finalização',
      icon: Activity,
      color: 'text-amber-600',
      bgColor: 'bg-amber-50',
      isTodayCard: false,
      isTotalCard: false,
    },
    {
      title: 'Tempo Médio',
      value: `${safeAvgDuration} min`,
      subtext: 'Duração média total',
      icon: Clock,
      color: 'text-cyan-600',
      bgColor: 'bg-cyan-50',
      isTodayCard: false,
      isTotalCard: false,
    },
    {
      title: 'Contatos Evitáveis',
      value: safeWrongDept,
      subtext: 'Registros com flag evitável',
      icon: AlertOctagon,
      color: 'text-rose-600',
      bgColor: 'bg-rose-50',
      isTodayCard: false,
      isTotalCard: false,
    },
  ]

  return (
    <div className="grid grid-cols-2 lg:grid-cols-5 gap-3 sm:gap-4">
      {statCards.map((stat, idx) => {
        const Icon = stat.icon
        return (
          <Card
            key={idx}
            className={cn(
              'border-slate-200 shadow-subtle hover:border-slate-300 transition-colors',
              stat.isTotalCard && 'col-span-2 lg:col-span-1',
            )}
          >
            <CardContent className="p-4 flex items-center justify-between">
              <div className="min-w-0">
                <div className="flex items-center gap-1">
                  <p className="text-xs font-medium text-slate-500">{stat.title}</p>
                  {stat.isTodayCard && (
                    <Tooltip>
                      <TooltipTrigger asChild>
                        <button type="button" className="shrink-0">
                          <Info className="h-3 w-3 text-slate-400 hover:text-slate-600 transition-colors" />
                        </button>
                      </TooltipTrigger>
                      <TooltipContent side="bottom" className="max-w-[240px]">
                        <p className="text-xs">{todayLabel}</p>
                        <p className="text-[10px] text-slate-400 mt-1">
                          Contagem baseada no fuso horário local.
                        </p>
                      </TooltipContent>
                    </Tooltip>
                  )}
                </div>
                <div className="flex items-baseline gap-1.5 mt-1">
                  <p className="text-xl sm:text-2xl font-extrabold text-slate-900">{stat.value}</p>
                  {stat.isTodayCard && isStatusFiltered && (
                    <Badge
                      variant="outline"
                      className="text-[9px] px-1 py-0 bg-amber-50 text-amber-700 border-amber-200"
                    >
                      Filtrado
                    </Badge>
                  )}
                </div>
                <p className="text-[10px] text-slate-400 mt-0.5">{stat.subtext}</p>
                {stat.isTodayCard && statusBreakdown && (
                  <Popover>
                    <PopoverTrigger asChild>
                      <Button
                        variant="ghost"
                        size="sm"
                        className="h-5 text-[10px] px-1 mt-1 text-slate-400 hover:text-slate-600"
                      >
                        Ver detalhes
                      </Button>
                    </PopoverTrigger>
                    <PopoverContent className="w-56" align="start">
                      <div className="space-y-2">
                        <p className="text-xs font-bold text-slate-700">
                          Atendimentos de hoje por status
                        </p>
                        {Object.entries(statusBreakdown).map(([status, count]) => (
                          <div key={status} className="flex items-center justify-between text-xs">
                            <span className={STATUS_COLORS[status] || 'text-slate-600'}>
                              {STATUS_LABELS[status] || status}
                            </span>
                            <span className="font-semibold text-slate-900">{count}</span>
                          </div>
                        ))}
                        <div className="border-t border-slate-100 pt-2 flex items-center justify-between text-xs">
                          <span className="font-bold text-slate-700">Total</span>
                          <span className="font-bold text-slate-900">{safeTodayTotal}</span>
                        </div>
                      </div>
                    </PopoverContent>
                  </Popover>
                )}
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
