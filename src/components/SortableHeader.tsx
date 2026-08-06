import { ArrowUp, ArrowDown, ArrowUpDown } from 'lucide-react'
import { TableHead } from '@/components/ui/table'

interface SortableHeaderProps {
  label: string
  field: string
  sortField: string
  sortDirection: 'asc' | 'desc'
  onSort: (field: string) => void
  className?: string
}

export function SortableHeader({
  label,
  field,
  sortField,
  sortDirection,
  onSort,
  className,
}: SortableHeaderProps) {
  const isActive = sortField === field
  return (
    <TableHead
      className={`text-xs font-bold cursor-pointer select-none ${className || ''}`}
      onClick={() => onSort(field)}
    >
      <div className="flex items-center gap-1 py-3">
        {label}
        {isActive ? (
          sortDirection === 'asc' ? (
            <ArrowUp className="h-3 w-3" />
          ) : (
            <ArrowDown className="h-3 w-3" />
          )
        ) : (
          <ArrowUpDown className="h-3 w-3 text-slate-300" />
        )}
      </div>
    </TableHead>
  )
}
