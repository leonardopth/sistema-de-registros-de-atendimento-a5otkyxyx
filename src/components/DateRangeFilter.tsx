import { Input } from '@/components/ui/input'
import { Label } from '@/components/ui/label'
import { Button } from '@/components/ui/button'
import { Calendar, X } from 'lucide-react'
import { cn } from '@/lib/utils'

interface DateRangeFilterProps {
  dateFrom: string
  dateTo: string
  onDateFromChange: (v: string) => void
  onDateToChange: (v: string) => void
  onClear: () => void
  hasActiveFilter: boolean
}

const QUICK_PERIODS = [
  { label: 'Hoje', days: 0 },
  { label: '7 dias', days: 7 },
  { label: '30 dias', days: 30 },
] as const

function formatDateStr(date: Date): string {
  return date.toISOString().split('T')[0]
}

export function DateRangeFilter({
  dateFrom,
  dateTo,
  onDateFromChange,
  onDateToChange,
  onClear,
  hasActiveFilter,
}: DateRangeFilterProps) {
  const handleFromChange = (v: string) => {
    if (dateTo && v > dateTo) {
      onDateToChange(v)
    }
    onDateFromChange(v)
  }

  const handleToChange = (v: string) => {
    if (dateFrom && v < dateFrom) {
      onDateFromChange(v)
    }
    onDateToChange(v)
  }

  const handleQuickPeriod = (days: number) => {
    const today = new Date()
    const todayStr = formatDateStr(today)
    if (days === 0) {
      onDateFromChange(todayStr)
      onDateToChange(todayStr)
      return
    }
    const start = new Date()
    start.setDate(start.getDate() - (days - 1))
    onDateFromChange(formatDateStr(start))
    onDateToChange(todayStr)
  }

  const getActiveQuickPeriod = (): string | null => {
    if (!dateFrom || !dateTo) return null
    for (const period of QUICK_PERIODS) {
      if (period.days === 0) {
        if (dateFrom === dateTo) {
          const todayStr = formatDateStr(new Date())
          if (dateFrom === todayStr) return period.label
        }
        continue
      }
      const expectedEnd = formatDateStr(new Date())
      const expectedStart = new Date()
      expectedStart.setDate(expectedStart.getDate() - (period.days - 1))
      if (dateFrom === formatDateStr(expectedStart) && dateTo === expectedEnd) {
        return period.label
      }
    }
    return null
  }

  const activeQuickPeriod = getActiveQuickPeriod()

  return (
    <div className="flex flex-wrap items-center gap-2">
      <div className="flex items-center gap-1">
        <Calendar className="h-3.5 w-3.5 text-slate-400 mr-0.5" />
        <Input
          type="date"
          className="h-8 text-xs w-[130px]"
          value={dateFrom}
          placeholder="De"
          title="Data inicial"
          onChange={(e) => handleFromChange(e.target.value)}
        />
        <span className="text-xs text-slate-400 px-0.5">até</span>
        <Input
          type="date"
          className="h-8 text-xs w-[130px]"
          value={dateTo}
          placeholder="Até"
          title="Data final"
          onChange={(e) => handleToChange(e.target.value)}
        />
      </div>

      <div className="flex items-center gap-1">
        {QUICK_PERIODS.map((period) => (
          <Button
            key={period.label}
            variant={activeQuickPeriod === period.label ? 'default' : 'outline'}
            size="sm"
            className={cn(
              'h-8 text-xs font-medium px-2.5 transition-all',
              activeQuickPeriod === period.label
                ? 'bg-indigo-600 text-white hover:bg-indigo-700'
                : 'text-slate-600 hover:text-slate-900',
            )}
            onClick={() => handleQuickPeriod(period.days)}
          >
            {period.label}
          </Button>
        ))}
        {hasActiveFilter && (
          <Button
            variant="ghost"
            size="sm"
            className="h-8 text-xs text-slate-500 px-2"
            onClick={onClear}
            title="Limpar período"
          >
            <X className="h-3.5 w-3.5" />
          </Button>
        )}
      </div>
    </div>
  )
}
