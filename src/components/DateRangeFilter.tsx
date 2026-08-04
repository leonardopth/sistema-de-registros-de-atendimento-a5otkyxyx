import { Input } from '@/components/ui/input'
import { Label } from '@/components/ui/label'
import { Button } from '@/components/ui/button'
import { Calendar, X } from 'lucide-react'

interface DateRangeFilterProps {
  dateFrom: string
  dateTo: string
  onDateFromChange: (v: string) => void
  onDateToChange: (v: string) => void
  onClear: () => void
  hasActiveFilter: boolean
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

  return (
    <div className="flex flex-wrap items-end gap-3">
      <div className="space-y-1">
        <Label className="text-xs text-slate-600 flex items-center gap-1">
          <Calendar className="h-3 w-3" /> Período: De
        </Label>
        <Input
          type="date"
          className="h-9 text-xs w-[150px]"
          value={dateFrom}
          onChange={(e) => handleFromChange(e.target.value)}
        />
      </div>
      <div className="space-y-1">
        <Label className="text-xs text-slate-600">Até</Label>
        <Input
          type="date"
          className="h-9 text-xs w-[150px]"
          value={dateTo}
          onChange={(e) => handleToChange(e.target.value)}
        />
      </div>
      {hasActiveFilter && (
        <Button variant="ghost" size="sm" className="h-9 text-xs text-slate-500" onClick={onClear}>
          <X className="h-3.5 w-3.5 mr-1" /> Limpar período
        </Button>
      )}
    </div>
  )
}
