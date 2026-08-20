import { useState, useMemo } from 'react'
import { Filter, X } from 'lucide-react'
import { Popover, PopoverContent, PopoverTrigger } from '@/components/ui/popover'
import { Button } from '@/components/ui/button'
import { Input } from '@/components/ui/input'
import { Checkbox } from '@/components/ui/checkbox'
import { Badge } from '@/components/ui/badge'
import { cn } from '@/lib/utils'

export interface TableColumnFilterProps {
  title?: string
  options: string[]
  selectedValues: string[]
  onChange?: (values: string[]) => void
  onSelectionChange?: (values: string[]) => void
  align?: 'start' | 'center' | 'end'
}

export function TableColumnFilter({
  title = 'Filtrar',
  options,
  selectedValues = [],
  onChange,
  onSelectionChange,
  align = 'start',
}: TableColumnFilterProps) {
  const [searchTerm, setSearchTerm] = useState('')
  const [open, setOpen] = useState(false)

  const handleChange = (vals: string[]) => {
    if (onChange) onChange(vals)
    if (onSelectionChange) onSelectionChange(vals)
  }

  // Remove duplicados e vazios, ordenando alfabeticamente
  const uniqueOptions = useMemo(() => {
    const set = new Set<string>()
    options.forEach((opt) => {
      if (opt !== undefined && opt !== null) {
        const str = String(opt).trim()
        if (str.length > 0) set.add(str)
      }
    })
    return Array.from(set).sort((a, b) => a.localeCompare(b, undefined, { sensitivity: 'base' }))
  }, [options])

  const filteredOptions = useMemo(() => {
    if (!searchTerm.trim()) return uniqueOptions
    const term = searchTerm.toLowerCase()
    return uniqueOptions.filter((opt) => opt.toLowerCase().includes(term))
  }, [uniqueOptions, searchTerm])

  const activeCount = selectedValues.length
  const isActive = activeCount > 0
  const isAllSelected = uniqueOptions.length > 0 && selectedValues.length === uniqueOptions.length

  const handleToggleOption = (option: string) => {
    if (selectedValues.includes(option)) {
      handleChange(selectedValues.filter((v) => v !== option))
    } else {
      handleChange([...selectedValues, option])
    }
  }

  const handleToggleAll = () => {
    if (isAllSelected || activeCount > 0) {
      handleChange([])
    } else {
      handleChange([...uniqueOptions])
    }
  }

  const handleClear = (e: React.MouseEvent) => {
    e.stopPropagation()
    handleChange([])
  }

  return (
    <Popover open={open} onOpenChange={setOpen}>
      <PopoverTrigger asChild>
        <Button
          variant="ghost"
          size="sm"
          className={cn(
            'h-6 px-1.5 py-0 text-[11px] gap-1 font-medium transition-colors cursor-pointer',
            isActive
              ? 'bg-indigo-100 text-indigo-700 hover:bg-indigo-200 border border-indigo-300 font-semibold'
              : 'text-slate-500 hover:text-slate-800 hover:bg-slate-100',
          )}
          title={isActive ? `Filtro ativo (${activeCount} selecionados)` : `Filtrar por ${title}`}
          onClick={(e) => e.stopPropagation()}
        >
          <Filter
            className={cn(
              'h-3 w-3',
              isActive ? 'text-indigo-600 fill-indigo-600' : 'text-slate-400',
            )}
          />
          {isActive && (
            <Badge
              variant="secondary"
              className="h-4 px-1 text-[9px] bg-indigo-600 text-white leading-none font-bold rounded-full"
            >
              {activeCount}
            </Badge>
          )}
        </Button>
      </PopoverTrigger>
      <PopoverContent
        align={align}
        className="w-56 p-2 bg-white rounded-md shadow-lg border border-slate-200 text-slate-800 z-50"
        onClick={(e) => e.stopPropagation()}
      >
        <div className="flex items-center justify-between pb-1.5 mb-1.5 border-b border-slate-100">
          <span className="text-xs font-semibold text-slate-700 truncate">Filtrar: {title}</span>
          {isActive && (
            <Button
              variant="ghost"
              size="sm"
              onClick={handleClear}
              className="h-5 px-1 text-[10px] text-slate-400 hover:text-red-600"
            >
              Limpar
            </Button>
          )}
        </div>

        <div className="mb-2">
          <Input
            placeholder="Buscar valor..."
            value={searchTerm}
            onChange={(e) => setSearchTerm(e.target.value)}
            className="h-7 text-xs px-2"
          />
        </div>

        <div className="flex items-center justify-between px-1.5 py-1 mb-1 bg-slate-50 rounded text-xs">
          <label className="flex items-center gap-2 cursor-pointer text-slate-700 select-none flex-1">
            <Checkbox
              checked={isAllSelected ? true : activeCount > 0 ? 'indeterminate' : false}
              onCheckedChange={handleToggleAll}
              className="h-3.5 w-3.5"
            />
            <span className="text-[11px] font-medium">Selecionar todos</span>
          </label>
          <span className="text-[10px] text-slate-400">{uniqueOptions.length}</span>
        </div>

        <div className="max-h-44 overflow-y-auto pr-1">
          {filteredOptions.length === 0 ? (
            <div className="py-4 text-center text-xs text-slate-400">Nenhum valor encontrado</div>
          ) : (
            <div className="space-y-0.5">
              {filteredOptions.map((opt) => {
                const isSelected = selectedValues.includes(opt)
                return (
                  <label
                    key={opt}
                    className="flex items-center gap-2 px-1 py-1 rounded hover:bg-slate-100 cursor-pointer text-xs select-none transition-colors"
                  >
                    <Checkbox
                      checked={isSelected}
                      onCheckedChange={() => handleToggleOption(opt)}
                      className="h-3.5 w-3.5"
                    />
                    <span className="truncate text-[11px] text-slate-700" title={opt}>
                      {opt}
                    </span>
                  </label>
                )
              })}
            </div>
          )}
        </div>
      </PopoverContent>
    </Popover>
  )
}
