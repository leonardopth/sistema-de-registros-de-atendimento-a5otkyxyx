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

const STATUS_OPTIONS = ['Todos', 'Aberto', 'Em Andamento', 'Concluído', 'Cancelado']
const PRIORITY_OPTIONS = ['Todas', 'Baixa', 'Média', 'Alta']
const REASON_OPTIONS = [
  'Todos',
  'Bagagem',
  'Assento',
  'cálculo reemissão',
  'reembolso',
  'cotação',
  'reserva',
  'cancelamento',
  'regras tarifárias',
  'erro RF',
  'outros',
]
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
    <div className="space-y-3 p-4 bg-slate-50 rounded-lg border border-slate-200">
      <div className="flex items-center gap-2">
        <SlidersHorizontal className="h-4 w-4 text-slate-600" />
        <span className="text-xs font-bold text-slate-700">Filtros Avançados</span>
        {active && (
          <Button
            variant="ghost"
            size="sm"
            className="text-xs h-7 ml-auto"
            onClick={() => onChange(DEFAULT_FILTERS)}
          >
            <FilterX className="h-3.5 w-3.5 mr-1" /> Limpar filtros
          </Button>
        )}
      </div>
      <div className="grid grid-cols-2 md:grid-cols-4 lg:grid-cols-6 gap-3">
        <div className="space-y-1">
          <Label className="text-[10px] text-slate-500">De</Label>
          <Input
            type="date"
            className="h-8 text-xs"
            value={filters.dateFrom}
            onChange={(e) => update('dateFrom', e.target.value)}
          />
        </div>
        <div className="space-y-1">
          <Label className="text-[10px] text-slate-500">Até</Label>
          <Input
            type="date"
            className="h-8 text-xs"
            value={filters.dateTo}
            onChange={(e) => update('dateTo', e.target.value)}
          />
        </div>
        <div className="space-y-1">
          <Label className="text-[10px] text-slate-500">Status</Label>
          <Select value={filters.status} onValueChange={(v) => update('status', v)}>
            <SelectTrigger className="h-8 text-xs">
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
        <div className="space-y-1">
          <Label className="text-[10px] text-slate-500">Prioridade</Label>
          <Select value={filters.priority} onValueChange={(v) => update('priority', v)}>
            <SelectTrigger className="h-8 text-xs">
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
        <div className="space-y-1">
          <Label className="text-[10px] text-slate-500">Grupo</Label>
          <Select value={filters.serviceGroup} onValueChange={(v) => update('serviceGroup', v)}>
            <SelectTrigger className="h-8 text-xs">
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
        <div className="space-y-1">
          <Label className="text-[10px] text-slate-500">Canal</Label>
          <Select value={filters.channel} onValueChange={(v) => update('channel', v)}>
            <SelectTrigger className="h-8 text-xs">
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
      </div>
      <div className="flex flex-wrap items-end gap-4">
        <div className="space-y-1">
          <Label className="text-[10px] text-slate-500">Motivo do Contato</Label>
          <Select value={filters.contactReason} onValueChange={(v) => update('contactReason', v)}>
            <SelectTrigger className="h-8 text-xs w-[180px]">
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
        <div className="flex items-center gap-2 pb-1.5">
          <Switch
            checked={filters.avoidableOnly}
            onCheckedChange={(v) => update('avoidableOnly', v)}
          />
          <Label className="text-xs text-slate-600">Apenas contatos evitáveis</Label>
        </div>
      </div>
    </div>
  )
}
