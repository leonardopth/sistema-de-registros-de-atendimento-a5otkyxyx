import { Button } from '@/components/ui/button'
import { Input } from '@/components/ui/input'
import { Label } from '@/components/ui/label'
import {
  Select,
  SelectTrigger,
  SelectValue,
  SelectContent,
  SelectItem,
} from '@/components/ui/select'
import {
  DropdownMenu,
  DropdownMenuTrigger,
  DropdownMenuContent,
  DropdownMenuItem,
} from '@/components/ui/dropdown-menu'
import { Download, FilterX, FileSpreadsheet, Copy, Printer } from 'lucide-react'

interface CompanyReportFiltersProps {
  dateFrom: string
  dateTo: string
  statusFilter: string
  hasActiveFilters: boolean
  onDateFromChange: (v: string) => void
  onDateToChange: (v: string) => void
  onStatusChange: (v: string) => void
  onClear: () => void
  onExportCSV: () => void
  onCopy: () => void
  onPrint: () => void
}

const STATUS_OPTIONS = ['Todos', 'Aberto', 'Em Andamento', 'Concluído', 'Cancelado']

export function CompanyReportFilters({
  dateFrom,
  dateTo,
  statusFilter,
  hasActiveFilters,
  onDateFromChange,
  onDateToChange,
  onStatusChange,
  onClear,
  onExportCSV,
  onCopy,
  onPrint,
}: CompanyReportFiltersProps) {
  return (
    <div className="flex flex-wrap items-end gap-3 p-3 bg-slate-50 border rounded-lg">
      <div className="space-y-1">
        <Label className="text-xs text-slate-600">De</Label>
        <Input
          type="date"
          className="h-8 text-xs w-[150px]"
          value={dateFrom}
          onChange={(e) => onDateFromChange(e.target.value)}
        />
      </div>
      <div className="space-y-1">
        <Label className="text-xs text-slate-600">Até</Label>
        <Input
          type="date"
          className="h-8 text-xs w-[150px]"
          value={dateTo}
          onChange={(e) => onDateToChange(e.target.value)}
        />
      </div>
      <div className="space-y-1">
        <Label className="text-xs text-slate-600">Status</Label>
        <Select value={statusFilter} onValueChange={onStatusChange}>
          <SelectTrigger className="h-8 text-xs w-[160px]">
            <SelectValue />
          </SelectTrigger>
          <SelectContent>
            {STATUS_OPTIONS.map((s) => (
              <SelectItem key={s} value={s}>
                {s}
              </SelectItem>
            ))}
          </SelectContent>
        </Select>
      </div>
      {hasActiveFilters && (
        <Button variant="ghost" size="sm" className="text-xs h-8 text-slate-500" onClick={onClear}>
          <FilterX className="h-3.5 w-3.5 mr-1" /> Limpar filtros
        </Button>
      )}
      <div className="ml-auto">
        <DropdownMenu>
          <DropdownMenuTrigger asChild>
            <Button variant="outline" size="sm" className="text-xs h-8">
              <Download className="h-3.5 w-3.5 mr-1.5" /> Exportar
            </Button>
          </DropdownMenuTrigger>
          <DropdownMenuContent align="end">
            <DropdownMenuItem onClick={onExportCSV}>
              <FileSpreadsheet className="h-4 w-4 mr-2" /> Exportar CSV
            </DropdownMenuItem>
            <DropdownMenuItem onClick={onCopy}>
              <Copy className="h-4 w-4 mr-2" /> Copiar
            </DropdownMenuItem>
            <DropdownMenuItem onClick={onPrint}>
              <Printer className="h-4 w-4 mr-2" /> Imprimir
            </DropdownMenuItem>
          </DropdownMenuContent>
        </DropdownMenu>
      </div>
    </div>
  )
}
