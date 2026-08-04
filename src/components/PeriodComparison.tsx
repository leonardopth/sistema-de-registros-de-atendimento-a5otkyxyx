import { Card, CardContent } from '@/components/ui/card'
import { TrendingUp, TrendingDown, Minus } from 'lucide-react'
import { cn } from '@/lib/utils'

interface PeriodComparisonProps {
  currentCount: number
  previousCount: number
}

export function PeriodComparison({ currentCount, previousCount }: PeriodComparisonProps) {
  const diff = currentCount - previousCount
  const hasPrevious = previousCount > 0
  const hasCurrent = currentCount > 0

  let percentage: number | null = null
  if (hasPrevious) {
    percentage = Math.round((diff / previousCount) * 100)
  } else if (hasCurrent) {
    percentage = null
  }

  const isIncrease = diff > 0
  const isDecrease = diff < 0
  const isStable = diff === 0

  const showPercentage = hasPrevious || (hasCurrent && !hasPrevious)

  return (
    <Card className="border-slate-200 shadow-subtle overflow-hidden">
      <CardContent className="p-4">
        <div className="flex flex-col sm:flex-row sm:items-center sm:justify-between gap-3">
          <div className="flex items-center gap-3">
            <div
              className={cn(
                'h-11 w-11 rounded-xl flex items-center justify-center shadow-xs',
                isIncrease && 'bg-emerald-100/80 text-emerald-700',
                isDecrease && 'bg-rose-100/80 text-rose-700',
                isStable && 'bg-slate-100/80 text-slate-500',
              )}
            >
              {isIncrease && <TrendingUp className="h-5 w-5" />}
              {isDecrease && <TrendingDown className="h-5 w-5" />}
              {isStable && <Minus className="h-5 w-5" />}
            </div>
            <div>
              <p className="text-xs font-bold text-slate-500 uppercase tracking-wider">
                Variação de Atendimentos
              </p>
              <p className="text-sm font-semibold text-slate-700 mt-0.5">vs. período anterior</p>
            </div>
          </div>

          <div className="flex items-center gap-4 sm:gap-6">
            <div className="text-center">
              <p className="text-[11px] text-slate-400 font-medium">Período anterior</p>
              <p className="text-xl font-black text-slate-600">{previousCount}</p>
            </div>

            <div
              className={cn(
                'px-4 py-2 rounded-lg text-center min-w-[140px]',
                isIncrease && 'bg-emerald-50 border border-emerald-200',
                isDecrease && 'bg-rose-50 border border-rose-200',
                isStable && 'bg-slate-50 border border-slate-200',
              )}
            >
              <p
                className={cn(
                  'text-2xl font-black leading-none',
                  isIncrease && 'text-emerald-700',
                  isDecrease && 'text-rose-700',
                  isStable && 'text-slate-500',
                )}
              >
                {isIncrease && '+'}
                {isDecrease ? diff : isStable ? '—' : `+${diff}`}
              </p>
              <p
                className={cn(
                  'text-xs font-bold mt-1',
                  isIncrease && 'text-emerald-600',
                  isDecrease && 'text-rose-600',
                  isStable && 'text-slate-400',
                )}
              >
                {isStable
                  ? 'estável'
                  : !showPercentage
                    ? 'novo período'
                    : percentage !== null
                      ? `${isIncrease ? '+' : ''}${percentage}%`
                      : '+100%'}
              </p>
            </div>

            <div className="text-center">
              <p className="text-[11px] text-slate-400 font-medium">Período atual</p>
              <p className="text-xl font-black text-slate-900">{currentCount}</p>
            </div>
          </div>
        </div>
      </CardContent>
    </Card>
  )
}
