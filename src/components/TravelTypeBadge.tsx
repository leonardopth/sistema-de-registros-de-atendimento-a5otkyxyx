import { Badge } from '@/components/ui/badge'
import { Plane, Globe } from 'lucide-react'
import { TravelType } from '@/types/service_record'
import { cn } from '@/lib/utils'

interface TravelTypeBadgeProps {
  travelType?: TravelType | string
  className?: string
}

export function TravelTypeBadge({ travelType, className }: TravelTypeBadgeProps) {
  if (!travelType) return null

  const isNational = travelType === 'Nacional'

  return (
    <Badge
      variant="outline"
      className={cn(
        'font-medium text-xs gap-1',
        isNational
          ? 'bg-green-50 text-green-700 border-green-200'
          : 'bg-blue-50 text-blue-700 border-blue-200',
        className,
      )}
    >
      {isNational ? <Plane className="h-3 w-3" /> : <Globe className="h-3 w-3" />}
      {travelType}
    </Badge>
  )
}
