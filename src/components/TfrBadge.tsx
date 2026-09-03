import { Badge } from '@/components/ui/badge'
import { cn } from '@/lib/utils'
import { Timer, AlertCircle, CheckCircle } from 'lucide-react'

interface TfrBadgeProps {
  tfrMinutes?: number | null
  targetMinutes?: number
  className?: string
  showLabel?: boolean
}

export function TfrBadge({
  tfrMinutes,
  targetMinutes = 15,
  className,
  showLabel = true,
}: TfrBadgeProps) {
  if (tfrMinutes == null || !Number.isFinite(tfrMinutes)) {
    return <span className="text-slate-400 text-xs">—</span>
  }

  const isExceeded = tfrMinutes > targetMinutes
  const isClose = !isExceeded && tfrMinutes >= targetMinutes * 0.8

  const formatted =
    tfrMinutes < 1
      ? '< 1 min'
      : tfrMinutes < 60
        ? `${Math.round(tfrMinutes)} min`
        : `${Math.floor(tfrMinutes / 60)}h ${Math.round(tfrMinutes % 60)}m`

  return (
    <Badge
      variant="outline"
      className={cn(
        'text-[10px] font-semibold py-0.5 px-1.5 flex items-center gap-1 border transition-colors',
        isExceeded
          ? 'bg-rose-50 text-rose-700 border-rose-300 font-bold'
          : isClose
            ? 'bg-amber-50 text-amber-700 border-amber-300'
            : 'bg-emerald-50 text-emerald-700 border-emerald-300',
        className,
      )}
      title={`Tempo de Primeira Resposta: ${tfrMinutes} min (SLA: ≤ ${targetMinutes} min)`}
    >
      {isExceeded ? (
        <AlertCircle className="h-3 w-3 shrink-0 text-rose-600" />
      ) : (
        <Timer className="h-3 w-3 shrink-0" />
      )}
      {showLabel && <span>TFR:</span>}
      <span>{formatted}</span>
    </Badge>
  )
}
