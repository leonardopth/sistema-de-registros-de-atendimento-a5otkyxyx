import { Button } from '@/components/ui/button'
import { Input } from '@/components/ui/input'
import { Label } from '@/components/ui/label'
import { Switch } from '@/components/ui/switch'
import {
  Select,
  SelectTrigger,
  SelectValue,
  SelectContent,
  SelectItem,
} from '@/components/ui/select'
import { FilterX, SlidersHorizontal } from 'lucide-react'
import { DashboardFilters, DEFAULT_FILTERS, hasActiveFilters } from '@/lib/dashboard-filters'
import { SERVICE_GROUP_OPTIONS } from '@/lib/service-groups'
import { CONTACT_REASONS } from '@/constants/contactReasons'

const STATUS_OPTIONS = ['Todos', 'Aberto', 'Em Andamento', 'Concluído', 'Cancelado']
const PRIORITY_OPTIONS = ['Todas', 'Baixa', 'Média', 'Alta']
const REASON_OPTIONS = ['Todos', ...CONTACT_REASONS]
const CHANNEL_OPTIONS = ['Todos', 'Telefone', 'e-mail', 'whatsapp', 'comercial', 'outros']

interface Props {
  filters: DashboardFilters
  onChange: (f: DashboardFilters) => void
}

export function DashboardAdvancedFilters({ filters, onChange }: Props) {
  const active = hasActiveFilters(filters)
  const update = (key: keyof DashboardFilters, value: string | boolean) =>
    onChange({ ...filters, [key]: value })

  return (
    <div className="p-3 bg-slate-50 rounded-lg border border-slate-200 space-y-2.5">
      <div className="flex items-center justify-between">
        <div className="flex items-center gap-2">
          <SlidersHorizontal className="h-4 w-4 text-indigo-600" />
          <span className="text-xs font-bold text-slate-800">Filtros do Painel</span>
        </div>
        {active && (
          <Button
            variant="ghost"
            size="sm"
            className="text-xs h-7 text-slate-500 hover:text-slate-900 px-2"
            onClick={() => onChange(DEFAULT_FILTERS)}
          >
            <FilterX className="h-3.5 w-3.5 mr-1" /> Limpar filtros
          </Button>
        )}
      </div>

      <div className="grid grid-cols-2 sm:grid-cols-3 md:grid-cols-4 lg:grid-cols-8 gap-2 items-center">
        {/* De */}
        <div className="space-y-0.5">
          <Label className="text-[10px] font-medium text-slate-500">De</Label>
          <Input
            type="date"
            className="h-8 text-xs w-full"
            value={filters.dateFrom}
            onChange={(e) => update('dateFrom', e.target.value)}
          />
        </div>

        {/* Até */}
        <div className="space-y-0.5">
          <Label className="text-[10px] font-medium text-slate-500">Até</Label>
          <Input
            type="date"
            className="h-8 text-xs w-full"
            value={filters.dateTo}
            onChange={(e) => update('dateTo', e.target.value)}
          />
        </div>

        {/* Status */}
        <div className="space-y-0.5">
          <Label className="text-[10px] font-medium text-slate-500">Status</Label>
          <Select value={filters.status} onValueChange={(v) => update('status', v)}>
            <SelectTrigger className="h-8 text-xs w-full">
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

        {/* Prioridade */}
        <div className="space-y-0.5">
          <Label className="text-[10px] font-medium text-slate-500">Prioridade</Label>
          <Select value={filters.priority} onValueChange={(v) => update('priority', v)}>
            <SelectTrigger className="h-8 text-xs w-full">
              <SelectValue />
            </SelectTrigger>
            <SelectContent>
              {PRIORITY_OPTIONS.map((s) => (
                <SelectItem key={s} value={s}>
                  {s}
                </SelectItem>
              ))}
            </SelectContent>
          </Select>
        </div>

        {/* Grupo */}
        <div className="space-y-0.5">
          <Label className="text-[10px] font-medium text-slate-500">Grupo</Label>
          <Select value={filters.serviceGroup} onValueChange={(v) => update('serviceGroup', v)}>
            <SelectTrigger className="h-8 text-xs w-full">
              <SelectValue />
            </SelectTrigger>
            <SelectContent>
              <SelectItem value="Todos">Todos</SelectItem>
              {SERVICE_GROUP_OPTIONS.map((g) => (
                <SelectItem key={g.value} value={g.value}>
                  {g.label}
                </SelectItem>
              ))}
            </SelectContent>
          </Select>
        </div>

        {/* Canal */}
        <div className="space-y-0.5">
          <Label className="text-[10px] font-medium text-slate-500">Canal</Label>
          <Select value={filters.channel} onValueChange={(v) => update('channel', v)}>
            <SelectTrigger className="h-8 text-xs w-full">
              <SelectValue />
            </SelectTrigger>
            <SelectContent>
              {CHANNEL_OPTIONS.map((s) => (
                <SelectItem key={s} value={s}>
                  {s}
                </SelectItem>
              ))}
            </SelectContent>
          </Select>
        </div>

        {/* Tipo de Viagem */}
        <div className="space-y-0.5">
          <Label className="text-[10px] font-medium text-slate-500">Viagem</Label>
          <Select
            value={filters.travelType || 'Todos'}
            onValueChange={(v) => update('travelType', v)}
          >
            <SelectTrigger className="h-8 text-xs w-full">
              <SelectValue />
            </SelectTrigger>
            <SelectContent>
              <SelectItem value="Todos">Todos</SelectItem>
              <SelectItem value="Nacional">Nacional</SelectItem>
              <SelectItem value="Internacional">Internacional</SelectItem>
            </SelectContent>
          </Select>
        </div>

        {/* Motivo do Contato */}
        <div className="space-y-0.5">
          <Label className="text-[10px] font-medium text-slate-500">Motivo</Label>
          <Select value={filters.contactReason} onValueChange={(v) => update('contactReason', v)}>
            <SelectTrigger className="h-8 text-xs w-full">
              <SelectValue />
            </SelectTrigger>
            <SelectContent>
              {REASON_OPTIONS.map((s) => (
                <SelectItem key={s} value={s}>
                  {s}
                </SelectItem>
              ))}
            </SelectContent>
          </Select>
        </div>
      </div>

      <div className="flex items-center justify-between pt-1 border-t border-slate-200/60 text-xs">
        <div className="flex items-center gap-2">
          <Switch
            id="avoidable-filter"
            checked={filters.avoidableOnly}
            onCheckedChange={(v) => update('avoidableOnly', v)}
          />
          <Label
            htmlFor="avoidable-filter"
            className="text-xs text-slate-600 font-medium cursor-pointer"
          >
            Apenas contatos evitáveis
          </Label>
        </div>
      </div>
    </div>
  )
}
