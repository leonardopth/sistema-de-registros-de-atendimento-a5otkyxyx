import { Link } from 'react-router-dom'
import { Card } from '@/components/ui/card'
import { Button } from '@/components/ui/button'
import { Checkbox } from '@/components/ui/checkbox'
import {
  Table,
  TableBody,
  TableCell,
  TableHead,
  TableHeader,
  TableRow,
} from '@/components/ui/table'
import { ServiceRecord } from '@/types/service_record'
import { StatusBadge } from '@/components/StatusBadge'
import { PriorityBadge } from '@/components/PriorityBadge'
import { ArrowUpRight, Eye, CheckCircle2, Loader2, X } from 'lucide-react'
import { formatGMT3DateTime } from '@/lib/timezone'

interface RecentActivitiesProps {
  records: ServiceRecord[]
  selectedIds: Set<string>
  onToggleSelect: (id: string) => void
  onSelectAll: () => void
  onClearSelection: () => void
  onViewRecord: (record: ServiceRecord) => void
  onBulkComplete: () => void
  bulkLoading: boolean
}

export function RecentActivities({
  records,
  selectedIds,
  onToggleSelect,
  onSelectAll,
  onClearSelection,
  onViewRecord,
  onBulkComplete,
  bulkLoading,
}: RecentActivitiesProps) {
  const allSelected = records.length > 0 && selectedIds.size === records.length

  return (
    <Card className="border-slate-200 shadow-subtle">
      {selectedIds.size > 0 && (
        <div className="flex flex-wrap items-center gap-3 p-3 bg-indigo-50 border-b border-indigo-100">
          <span className="text-sm font-medium text-indigo-700">
            {selectedIds.size} selecionado(s)
          </span>
          <Button
            size="sm"
            onClick={onBulkComplete}
            disabled={bulkLoading}
            className="h-8 bg-emerald-600 hover:bg-emerald-700 text-white"
          >
            {bulkLoading ? (
              <Loader2 className="h-3.5 w-3.5 animate-spin mr-1" />
            ) : (
              <CheckCircle2 className="h-3.5 w-3.5 mr-1" />
            )}
            Marcar como Concluído
          </Button>
          <Button
            variant="ghost"
            size="sm"
            onClick={onClearSelection}
            className="h-8 text-slate-500"
          >
            <X className="h-3.5 w-3.5 mr-1" />
            Limpar
          </Button>
        </div>
      )}

      <div className="p-4 border-b border-slate-100 flex items-center justify-between">
        <div>
          <h3 className="text-base font-bold text-slate-900">Atividades Recentes</h3>
          <p className="text-xs text-slate-500">Últimos atendimentos registrados no sistema</p>
        </div>
        <Link
          to="/atendimentos"
          className="text-xs font-bold text-cyan-600 hover:text-cyan-800 flex items-center gap-1"
        >
          Ver Todos <ArrowUpRight className="h-3.5 w-3.5" />
        </Link>
      </div>

      <div className="overflow-x-auto">
        <Table>
          <TableHeader className="bg-slate-50">
            <TableRow>
              <TableHead className="w-10">
                <Checkbox checked={allSelected} onCheckedChange={onSelectAll} />
              </TableHead>
              <TableHead className="text-xs font-bold">Cliente</TableHead>
              <TableHead className="text-xs font-bold">Motivo</TableHead>
              <TableHead className="text-xs font-bold">Status</TableHead>
              <TableHead className="text-xs font-bold whitespace-nowrap">Prioridade</TableHead>
              <TableHead className="text-xs font-bold whitespace-nowrap">Duração</TableHead>
              <TableHead className="text-xs font-bold">Data/Hora</TableHead>
              <TableHead className="text-xs font-bold text-right">Ação</TableHead>
            </TableRow>
          </TableHeader>
          <TableBody>
            {records.map((r) => (
              <TableRow
                key={r.id}
                className="cursor-pointer hover:bg-slate-50 transition-colors"
                onClick={() => onViewRecord(r)}
              >
                <TableCell className="w-10" onClick={(e) => e.stopPropagation()}>
                  <Checkbox
                    checked={selectedIds.has(r.id)}
                    onCheckedChange={() => onToggleSelect(r.id)}
                  />
                </TableCell>
                <TableCell className="font-semibold text-slate-900 text-xs">
                  {r.client_company && (
                    <span className="block text-[10px] text-slate-500 font-normal">
                      {r.client_company}
                    </span>
                  )}
                  {r.client_name}
                </TableCell>
                <TableCell className="text-xs text-slate-700">{r.contact_reason}</TableCell>
                <TableCell>
                  <StatusBadge status={r.status} />
                </TableCell>
                <TableCell className="whitespace-nowrap">
                  <PriorityBadge priority={r.priority} />
                </TableCell>
                <TableCell className="text-xs text-slate-600 font-medium whitespace-nowrap">
                  {r.duration ? `${r.duration} min` : '-'}
                </TableCell>
                <TableCell className="text-xs text-slate-500 whitespace-nowrap">
                  {r.created ? formatGMT3DateTime(r.created) : '-'}
                </TableCell>
                <TableCell className="text-right" onClick={(e) => e.stopPropagation()}>
                  <Button variant="ghost" size="icon" className="h-8 w-8 text-indigo-600">
                    <Eye className="h-4 w-4" />
                  </Button>
                </TableCell>
              </TableRow>
            ))}
            {records.length === 0 && (
              <TableRow>
                <TableCell colSpan={8} className="text-center py-8 text-slate-400 text-xs">
                  Nenhum atendimento registrado ainda.
                </TableCell>
              </TableRow>
            )}
          </TableBody>
        </Table>
      </div>
    </Card>
  )
}
