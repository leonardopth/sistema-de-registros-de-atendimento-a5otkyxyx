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
        return 'bg-blue-100 text-blue-800 border-blue-200 hover:bg-blue-100'
      case 'Em Andamento':
        return 'bg-amber-100 text-amber-800 border-amber-200 hover:bg-amber-100 relative'
      case 'Concluído':
        return 'bg-emerald-100 text-emerald-800 border-emerald-200 hover:bg-emerald-100'
      case 'Cancelado':
        return 'bg-red-100 text-red-800 border-red-200 hover:bg-red-100'
      default:
        return 'bg-slate-100 text-slate-800 border-slate-200'
    }
  }

  return (
    <Badge
      variant="outline"
      className={cn('font-semibold px-2.5 py-0.5 text-xs', getBadgeStyle(), className)}
    >
      {status === 'Em Andamento' && (
        <span className="mr-1.5 inline-block h-2 w-2 rounded-full bg-amber-500 animate-pulse"></span>
      )}
      {status}
    </Badge>
  )
}
