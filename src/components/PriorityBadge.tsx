import { Badge } from '@/components/ui/badge'
import { ServicePriority } from '@/types/service_record'
import { cn } from '@/lib/utils'

interface PriorityBadgeProps {
  priority: ServicePriority
  className?: string
}

export function PriorityBadge({ priority, className }: PriorityBadgeProps) {
  const getStyle = () => {
    switch (priority) {
      case 'Alta':
        return 'bg-red-50 text-red-700 border-red-200'
      case 'Média':
        return 'bg-amber-50 text-amber-700 border-amber-200'
      case 'Baixa':
        return 'bg-slate-100 text-slate-700 border-slate-200'
      default:
        return 'bg-slate-100 text-slate-700 border-slate-200'
    }
  }

  return (
    <Badge variant="outline" className={cn('font-medium text-xs', getStyle(), className)}>
      {priority}
    </Badge>
  )
}
