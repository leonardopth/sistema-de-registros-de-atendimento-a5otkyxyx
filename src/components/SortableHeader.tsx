import React from 'react'
import { TableHead } from '@/components/ui/table'
import { ArrowUpDown, ArrowUp, ArrowDown } from 'lucide-react'
import { TableColumnFilter } from '@/components/TableColumnFilter'

interface SortableHeaderProps {
  field: string
  label: string
  currentSortField: string
  currentSortDirection: 'asc' | 'desc'
  onSort: (field: string) => void
  className?: string
  filterOptions?: string[]
  filterSelected?: string[]
  onFilterChange?: (values: string[]) => void
  filterAlign?: 'start' | 'center' | 'end'
}

export function SortableHeader({
  field,
  label,
  currentSortField,
  currentSortDirection,
  onSort,
  className = '',
  filterOptions,
  filterSelected,
  onFilterChange,
  filterAlign = 'start',
}: SortableHeaderProps) {
  const isSorted = currentSortField === field

  return (
    <TableHead className={className}>
      <div className="flex items-center justify-between gap-1">
        <button
          type="button"
          onClick={() => onSort(field)}
          className="flex items-center gap-1 hover:text-slate-900 transition-colors font-bold text-xs group cursor-pointer select-none"
        >
          <span>{label}</span>
          {isSorted ? (
            currentSortDirection === 'asc' ? (
              <ArrowUp className="h-3 w-3 text-indigo-600 font-bold" />
            ) : (
              <ArrowDown className="h-3 w-3 text-indigo-600 font-bold" />
            )
          ) : (
            <ArrowUpDown className="h-3 w-3 text-slate-400 group-hover:text-slate-600 transition-colors opacity-60" />
          )}
        </button>

        {filterOptions && onFilterChange && (
          <TableColumnFilter
            title={label}
            options={filterOptions}
            selectedValues={filterSelected || []}
            onChange={onFilterChange}
            align={filterAlign}
          />
        )}
      </div>
    </TableHead>
  )
}
