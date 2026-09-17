import { Card, CardContent } from '@/components/ui/card'
import {
  Calendar,
  Clock,
  Activity,
  AlertOctagon,
  Info,
  ListChecks,
  Timer,
  RotateCcw,
} from 'lucide-react'
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
  avgTfr?: number
  tfrTarget?: number
  wrongDeptCount?: number
  reopenedCount?: number
  reopenRate?: number
  statusBreakdown?: Record<string, number>
  csatAvg?: number | null
  csatPositiveRate?: number | null
  csatTotalResponses?: number
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
  avgTfr = 0,
  tfrTarget = 15,
  wrongDeptCount = 0,
  reopenedCount = 0,
  reopenRate = 0,
  statusBreakdown,
  csatAvg = null,
  csatPositiveRate = null,
  csatTotalResponses = 0,
}: DashboardStatsProps) {
  const safeTodayCount = Number.isFinite(todayCount) ? todayCount : 0
  const safeTodayTotal = Number.isFinite(todayCountTotal) ? todayCountTotal : 0
  const safeTotalCount = Number.isFinite(totalCount) ? totalCount : 0
  const safeCancelled = Number.isFinite(cancelledCount) ? cancelledCount : 0
  const safeInProgress = Number.isFinite(inProgressCount) ? inProgressCount : 0
  const safeCompleted = Number.isFinite(completedTodayCount) ? completedTodayCount : 0
  const safeAvgDuration = Number.isFinite(avgDuration) ? avgDuration : 0
  const safeAvgTfr = Number.isFinite(avgTfr) ? avgTfr : 0
  const safeWrongDept = Number.isFinite(wrongDeptCount) ? wrongDeptCount : 0
  const safeReopened = Number.isFinite(reopenedCount) ? reopenedCount : 0
  const safeReopenRate = Number.isFinite(reopenRate) ? reopenRate : 0

  const todayLabel = isStatusFiltered
    ? `Atendimentos hoje – filtro: ${activeStatusFilter}`
    : 'Atendimentos criados hoje – todos os status'

  const todaySubtext = isStatusFiltered
    ? `${safeTodayTotal} no total hoje`
    : `${safeCompleted} concluídos hoje`

  const totalSubtext = isStatusFiltered
    ? `Filtro ativo: ${activeStatusFilter}`
    : `Inclui ${safeCancelled} cancelado(s)`

  const hasCsatData =
    csatAvg !== null || (csatTotalResponses !== undefined && csatTotalResponses > 0)

  interface StatCardItem {
    id: string
    title: string
    value: number | string
    unit?: string
    subtext: string
    icon: any
    color: string
    bgColor: string
    isTodayCard?: boolean
  }

  const statCards: StatCardItem[] = [
    {
      id: 'total',
      title: 'Total de Atendimentos',
      value: safeTotalCount,
      subtext: totalSubtext,
      icon: ListChecks,
      color: 'text-indigo-600',
      bgColor: 'bg-indigo-50',
    },
    {
      id: 'today',
      title: 'Atendimentos Hoje',
      value: safeTodayCount,
      subtext: todaySubtext,
      icon: Calendar,
      color: 'text-indigo-600',
      bgColor: 'bg-indigo-50',
      isTodayCard: true,
    },
    {
      id: 'in-progress',
      title: 'Em Andamento',
      value: safeInProgress,
      subtext: 'Aguardando finalização',
      icon: Activity,
      color: 'text-amber-600',
      bgColor: 'bg-amber-50',
    },
    {
      id: 'tma',
      title: 'Tempo Médio (TMA)',
      value: safeAvgDuration,
      unit: 'min',
      subtext: 'Duração média total',
      icon: Clock,
      color: 'text-cyan-600',
      bgColor: 'bg-cyan-50',
    },
    {
      id: 'tfr',
      title: 'TFR Médio (SLA)',
      value: safeAvgTfr,
      unit: 'min',
      subtext:
        safeAvgTfr > tfrTarget
          ? `Acima da meta (≤ ${tfrTarget} min)`
          : `Dentro da meta (≤ ${tfrTarget} min)`,
      icon: Timer,
      color: safeAvgTfr > tfrTarget ? 'text-rose-600' : 'text-emerald-600',
      bgColor: safeAvgTfr > tfrTarget ? 'bg-rose-50' : 'bg-emerald-50',
    },
    {
      id: 'avoidable',
      title: 'Contatos Evitáveis',
      value: safeWrongDept,
      subtext: 'Registros com flag evitável',
      icon: AlertOctagon,
      color: 'text-rose-600',
      bgColor: 'bg-rose-50',
    },
    {
      id: 'reopen',
      title: 'Taxa de Reabertura',
      value: safeReopenRate,
      unit: '%',
      subtext: `${safeReopened} atendimento(s) reaberto(s)`,
      icon: RotateCcw,
      color: safeReopenRate > 10 ? 'text-amber-600' : 'text-indigo-600',
      bgColor: safeReopenRate > 10 ? 'bg-amber-50' : 'bg-indigo-50',
    },
  ]

  if (hasCsatData) {
    statCards.push({
      id: 'csat',
      title: 'CSAT (Satisfação)',
      value: csatAvg !== null && !isNaN(csatAvg) ? `${csatAvg.toFixed(1)} / 5` : '—',
      subtext:
        csatPositiveRate !== null && !isNaN(csatPositiveRate)
          ? `${csatPositiveRate}% 👍 (${csatTotalResponses} avaliação(ões))`
          : 'Aguardando respostas',
      icon: Activity,
      color:
        csatAvg !== null && csatAvg >= 4
          ? 'text-emerald-600'
          : csatAvg !== null && csatAvg < 3
            ? 'text-rose-600'
            : 'text-indigo-600',
      bgColor:
        csatAvg !== null && csatAvg >= 4
          ? 'bg-emerald-50'
          : csatAvg !== null && csatAvg < 3
            ? 'bg-rose-50'
            : 'bg-indigo-50',
    })
  }

  return (
    <div
      className={cn(
        'grid gap-3 sm:gap-4',
        // Grid responsivo e fluido:
        // Mobile: 1 col (< 480px) ou 2 cols (sm / min 480px)
        // Tablet: 3 cols (md: 768px)
        // Laptop / desktop padrão: 4 cols (lg: 1024px)
        // Telas ultrawide (2xl: 1536px+): 7 cols para 7 cards ou 8 cols para 8 cards
        hasCsatData
          ? 'grid-cols-1 sm:grid-cols-2 md:grid-cols-3 lg:grid-cols-4 2xl:grid-cols-8'
          : 'grid-cols-1 sm:grid-cols-2 md:grid-cols-3 lg:grid-cols-4 2xl:grid-cols-7',
      )}
    >
      {statCards.map((stat) => {
        const Icon = stat.icon
        return (
          <Card
            key={stat.id}
            className="border-slate-200 shadow-subtle hover:border-slate-300 transition-colors flex flex-col justify-between"
          >
            <CardContent className="p-3.5 sm:p-4 flex flex-col justify-between h-full space-y-2">
              {/* Header do card: título com quebra natural + ícone estilizado */}
              <div className="flex items-start justify-between gap-2">
                <div className="min-w-0 flex-1">
                  <div className="flex items-center gap-1">
                    <p className="text-xs font-semibold text-slate-600 leading-snug line-clamp-2">
                      {stat.title}
                    </p>
                    {stat.isTodayCard && (
                      <Tooltip>
                        <TooltipTrigger asChild>
                          <button
                            type="button"
                            className="shrink-0 p-0.5"
                            aria-label="Informações sobre atendimentos de hoje"
                          >
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
                </div>

                <div
                  className={cn(
                    'p-2 rounded-xl shrink-0 transition-transform group-hover:scale-105',
                    stat.bgColor,
                    stat.color,
                  )}
                >
                  <Icon className="h-4 w-4 sm:h-5 sm:w-5" />
                </div>
              </div>

              {/* Valor principal + unidade (nunca clipados) */}
              <div className="min-w-0">
                <div className="flex items-baseline flex-wrap gap-x-1.5 gap-y-0.5">
                  <span className="text-xl sm:text-2xl xl:text-3xl font-extrabold text-slate-900 tracking-tight tabular-nums break-words">
                    {stat.value}
                  </span>
                  {stat.unit && (
                    <span className="text-xs sm:text-sm font-semibold text-slate-500 whitespace-nowrap">
                      {stat.unit}
                    </span>
                  )}
                  {stat.isTodayCard && isStatusFiltered && (
                    <Badge
                      variant="outline"
                      className="text-[9px] px-1 py-0 bg-amber-50 text-amber-700 border-amber-200 shrink-0"
                    >
                      Filtrado
                    </Badge>
                  )}
                </div>

                {/* Subtexto explicativo com tooltip se longo */}
                <p
                  className="text-[11px] text-slate-400 mt-1 leading-normal line-clamp-1"
                  title={stat.subtext}
                >
                  {stat.subtext}
                </p>

                {/* Popover de detalhes para Atendimentos de Hoje */}
                {stat.isTodayCard && statusBreakdown && (
                  <Popover>
                    <PopoverTrigger asChild>
                      <Button
                        variant="ghost"
                        size="sm"
                        className="h-5 text-[10px] px-1 mt-1 text-slate-400 hover:text-slate-600 -ml-1"
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
            </CardContent>
          </Card>
        )
      })}
    </div>
  )
}
