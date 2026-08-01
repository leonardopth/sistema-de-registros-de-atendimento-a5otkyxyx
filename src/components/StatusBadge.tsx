import { Badge } from '@/components/ui/badge'
import { ServiceStatus } from '@/types/service_record'
import { cn } from '@/lib/utils'

interface StatusBadgeProps {
  status: ServiceStatus
  className?: string
}

export function StatusBadge({ status, className }: StatusBadgeProps) {
  const getBadgeStyle = () => {
    switch (status) {
      case 'Aberto':
        return 'bg-cyan-50 text-cyan-700 border-cyan-200 hover:bg-cyan-100'
      case 'Em Andamento':
        return 'bg-purple-50 text-purple-700 border-purple-200 hover:bg-purple-100 relative'
      case 'Concluído':
        return 'bg-emerald-50 text-emerald-700 border-emerald-200 hover:bg-emerald-100'
      case 'Cancelado':
        return 'bg-rose-50 text-rose-700 border-rose-200 hover:bg-rose-100'
      default:
        return 'bg-slate-100 text-slate-800 border-slate-200'
    }
  }

  return (
    <Badge
      variant="outline"
      className={cn(
        'font-semibold px-2.5 py-0.5 text-xs transition-colors',
        getBadgeStyle(),
        className,
      )}
    >
      {status === 'Em Andamento' && (
        <span className="mr-1.5 inline-block h-2 w-2 rounded-full bg-purple-500 animate-pulse"></span>
      )}
      {status}
    </Badge>
  )
}
