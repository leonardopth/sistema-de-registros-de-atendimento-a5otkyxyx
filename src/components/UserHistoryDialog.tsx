import { Dialog, DialogContent, DialogHeader, DialogTitle } from '@/components/ui/dialog'
import { Badge } from '@/components/ui/badge'
import {
  Table,
  TableHeader,
  TableBody,
  TableRow,
  TableHead,
  TableCell,
} from '@/components/ui/table'
import type { UserRecord, ServiceRecord } from '@/types/service_record'
import { buildUserHistory, STATUS_STYLES, type EffectiveTarget, type HistoryRow } from '@/lib/metas'
import { History, UserCheck } from 'lucide-react'

interface UserHistoryDialogProps {
  open: boolean
  onOpenChange: (open: boolean) => void
  user: UserRecord | null
  records: ServiceRecord[]
  effective: EffectiveTarget | null
}

export function UserHistoryDialog({
  open,
  onOpenChange,
  user,
  records,
  effective,
}: UserHistoryDialogProps) {
  if (!user || !effective) return null

  const history: HistoryRow[] = buildUserHistory(user.id, records, effective, 12)
  const hits = history.filter((h) => h.hit).length

  return (
    <Dialog open={open} onOpenChange={onOpenChange}>
      <DialogContent className="sm:max-w-[720px] max-h-[85vh] overflow-y-auto">
        <DialogHeader>
          <DialogTitle className="flex items-center gap-2 text-indigo-950 font-bold text-base">
            <History className="h-5 w-5 text-indigo-600" />
            Histórico de Metas — {user.name} ({user.role})
          </DialogTitle>
          <div className="flex items-center gap-2 pt-1 text-xs text-slate-500">
            <UserCheck className="h-3.5 w-3.5 text-emerald-600" />
            <span>
              Atingiu as metas em <strong>{hits}</strong> de <strong>{history.length}</strong> meses
              avaliados
            </span>
          </div>
        </DialogHeader>

        <div className="border rounded-md overflow-hidden mt-2">
          <Table>
            <TableHeader className="bg-slate-50 sticky top-0">
              <TableRow>
                <TableHead className="text-xs font-bold">Mês</TableHead>
                <TableHead className="text-xs font-bold text-center">Atendimentos</TableHead>
                <TableHead className="text-xs font-bold text-center">Meta</TableHead>
                <TableHead className="text-xs font-bold text-center">Tempo Médio</TableHead>
                <TableHead className="text-xs font-bold text-center">Resolução real</TableHead>
                <TableHead className="text-xs font-bold text-center">Mín. esperado</TableHead>
                <TableHead className="text-xs font-bold text-center">Resultado</TableHead>
              </TableRow>
            </TableHeader>
            <TableBody>
              {history.map((row) => (
                <TableRow key={`${row.year}-${row.month}`} className="hover:bg-slate-50">
                  <TableCell className="text-xs font-semibold capitalize">{row.label}</TableCell>
                  <TableCell className="text-xs text-center">{row.real.total}</TableCell>
                  <TableCell className="text-xs text-center">{row.attendanceTarget}</TableCell>
                  <TableCell className="text-xs text-center">{row.real.avgDuration} min</TableCell>
                  <TableCell className="text-xs text-center">{row.real.rate}%</TableCell>
                  <TableCell className="text-xs text-center">{row.minResolutionRate}%</TableCell>
                  <TableCell className="text-center">
                    <Badge
                      variant="secondary"
                      className={`text-[10px] h-5 ${STATUS_STYLES[row.overall].badge}`}
                    >
                      {STATUS_STYLES[row.overall].label}
                    </Badge>
                  </TableCell>
                </TableRow>
              ))}
            </TableBody>
          </Table>
        </div>
      </DialogContent>
    </Dialog>
  )
}
