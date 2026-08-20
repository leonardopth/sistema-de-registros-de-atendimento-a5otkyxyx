import { Dialog, DialogContent, DialogHeader, DialogTitle } from '@/components/ui/dialog'
import { Button } from '@/components/ui/button'
import { Badge } from '@/components/ui/badge'
import {
  Table,
  TableHeader,
  TableBody,
  TableRow,
  TableHead,
  TableCell,
} from '@/components/ui/table'
import { ArrowLeft } from 'lucide-react'
import { cn } from '@/lib/utils'
import {
  STATUS_STYLES,
  buildAgentHistory,
  monthLabel,
  currentGMT3Date,
  type EffectiveTarget,
} from '@/lib/metas'
import type { AgentRecord, ServiceRecord } from '@/types/service_record'

interface AgentHistoryDialogProps {
  open: boolean
  onOpenChange: (open: boolean) => void
  agent: AgentRecord | null
  records: ServiceRecord[]
  effective: EffectiveTarget | null
}

export function AgentHistoryDialog({
  open,
  onOpenChange,
  agent,
  records,
  effective,
}: AgentHistoryDialogProps) {
  const history =
    open && agent && effective ? buildAgentHistory(agent.id, records, effective, 12) : []
  const current = currentGMT3Date()
  const isCurrentMonth = (year: number, month: number) =>
    year === current.year && month === current.month

  return (
    <Dialog open={open} onOpenChange={onOpenChange}>
      <DialogContent className="sm:max-w-[760px]">
        <DialogHeader>
          <DialogTitle className="flex items-center gap-2 text-indigo-950 font-bold">
            Histórico de Desempenho — {agent?.name || 'Agente'}
          </DialogTitle>
          <p className="text-[11px] text-slate-500">
            Meta usada:{' '}
            <Badge
              variant="secondary"
              className={cn(
                'text-[10px] h-5',
                effective?.source === 'individual'
                  ? 'bg-indigo-100 text-indigo-700'
                  : 'bg-slate-100 text-slate-600',
              )}
            >
              {effective?.source === 'individual' ? 'Individual' : 'Global'}
            </Badge>{' '}
            · {effective?.monthly_attendance_target} atend. / mín. {effective?.min_resolution_rate}%
          </p>
        </DialogHeader>

        <div className="max-h-[60vh] overflow-auto">
          <Table>
            <TableHeader className="bg-slate-50 sticky top-0">
              <TableRow>
                <TableHead className="text-xs font-bold">Mês</TableHead>
                <TableHead className="text-xs font-bold text-center">Atendimentos</TableHead>
                <TableHead className="text-xs font-bold text-center">Meta</TableHead>
                <TableHead className="text-xs font-bold text-center">Resolução real</TableHead>
                <TableHead className="text-xs font-bold text-center">Mín. esperado</TableHead>
                <TableHead className="text-xs font-bold text-center">Resultado</TableHead>
              </TableRow>
            </TableHeader>
            <TableBody>
              {history.length === 0 ? (
                <TableRow>
                  <TableCell colSpan={6} className="text-center text-xs text-slate-400 py-6">
                    Sem dados históricos.
                  </TableCell>
                </TableRow>
              ) : (
                history.map((row) => (
                  <TableRow key={`${row.year}-${row.month}`} className="hover:bg-slate-50">
                    <TableCell className="text-xs font-semibold capitalize">
                      {row.label}
                      {isCurrentMonth(row.year, row.month) && (
                        <span className="ml-1.5 text-[9px] font-bold text-indigo-600">
                          (corrente)
                        </span>
                      )}
                    </TableCell>
                    <TableCell className="text-xs text-center">{row.real.total}</TableCell>
                    <TableCell className="text-xs text-center">{row.attendanceTarget}</TableCell>
                    <TableCell className="text-xs text-center">{row.real.rate}%</TableCell>
                    <TableCell className="text-xs text-center">{row.minResolutionRate}%</TableCell>
                    <TableCell className="text-center">
                      <Badge
                        variant="secondary"
                        className={cn('text-[10px] h-5', STATUS_STYLES[row.overall].badge)}
                      >
                        {row.hit ? 'Bateu' : 'Não bateu'}
                      </Badge>
                    </TableCell>
                  </TableRow>
                ))
              )}
            </TableBody>
          </Table>
        </div>

        <div className="flex justify-end pt-2">
          <Button variant="outline" size="sm" onClick={() => onOpenChange(false)}>
            <ArrowLeft className="h-4 w-4 mr-1.5" />
            Voltar ao mês corrente
          </Button>
        </div>
      </DialogContent>
    </Dialog>
  )
}

export { monthLabel }
