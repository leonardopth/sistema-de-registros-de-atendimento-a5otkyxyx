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
import {
  buildUserHistory,
  isLeadershipRole,
  STATUS_STYLES,
  type EffectiveTarget,
  type HistoryRow,
} from '@/lib/metas'
import { History, UserCheck, Users2 } from 'lucide-react'

interface UserHistoryDialogProps {
  open: boolean
  onOpenChange: (open: boolean) => void
  user: UserRecord | null
  records: ServiceRecord[]
  effective: EffectiveTarget | null
  allUsers?: UserRecord[]
}

export function UserHistoryDialog({
  open,
  onOpenChange,
  user,
  records,
  effective,
  allUsers,
}: UserHistoryDialogProps) {
  if (!user || !effective) return null

  const isLeader = isLeadershipRole(user.role)
  const history: HistoryRow[] = buildUserHistory(
    user.id,
    records,
    effective,
    12,
    undefined,
    allUsers,
  )
  const hits = history.filter((h) => h.hit).length

  return (
    <Dialog open={open} onOpenChange={onOpenChange}>
      <DialogContent className="sm:max-w-[750px] max-h-[85vh] overflow-y-auto">
        <DialogHeader>
          <div className="flex items-center justify-between gap-2">
            <DialogTitle className="flex items-center gap-2 text-indigo-950 font-bold text-base">
              <History className="h-5 w-5 text-indigo-600" />
              Histórico de Metas — {user.name} ({user.role})
            </DialogTitle>
            {isLeader && (
              <Badge
                variant="secondary"
                className="bg-indigo-50 text-indigo-700 border-indigo-200 text-xs"
              >
                <Users2 className="h-3 w-3 mr-1" />
                Agregado da Equipe
              </Badge>
            )}
          </div>
          <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-1 pt-1 text-xs text-slate-500">
            <div className="flex items-center gap-2">
              <UserCheck className="h-3.5 w-3.5 text-emerald-600" />
              <span>
                Atingiu as metas em <strong>{hits}</strong> de <strong>{history.length}</strong>{' '}
                meses avaliados
              </span>
            </div>
            {isLeader && (
              <span className="text-[11px] text-indigo-600 italic">
                * Valores consolidados de todos os colaboradores da equipe
              </span>
            )}
          </div>
        </DialogHeader>

        <div className="border rounded-md overflow-hidden mt-2">
          <Table>
            <TableHeader className="bg-slate-50 sticky top-0">
              <TableRow>
                <TableHead className="text-xs font-bold">Mês</TableHead>
                <TableHead className="text-xs font-bold text-center">Volume (Real/Meta)</TableHead>
                <TableHead className="text-xs font-bold text-center">Tempo Médio</TableHead>
                <TableHead className="text-xs font-bold text-center">Categorização</TableHead>
                <TableHead className="text-xs font-bold text-center">Satisfação</TableHead>
                <TableHead className="text-xs font-bold text-center">Resolução</TableHead>
                <TableHead className="text-xs font-bold text-center">Resultado</TableHead>
              </TableRow>
            </TableHeader>
            <TableBody>
              {history.map((row) => (
                <TableRow key={`${row.year}-${row.month}`} className="hover:bg-slate-50">
                  <TableCell className="text-xs font-semibold capitalize">{row.label}</TableCell>
                  <TableCell className="text-xs text-center">
                    <span className="font-semibold text-slate-800">{row.real.total}</span> /{' '}
                    <span className="text-slate-500">{row.attendanceTarget}</span>
                  </TableCell>
                  <TableCell className="text-xs text-center font-medium">
                    {row.real.avgDuration} min
                  </TableCell>
                  <TableCell className="text-xs text-center">
                    <span className="font-semibold">{row.real.autoCategorizedRate}%</span>
                    <span className="text-[10px] text-slate-400 block">
                      ({row.real.autoCategorizedCount} atend.)
                    </span>
                  </TableCell>
                  <TableCell className="text-xs text-center">
                    <span className="font-semibold text-indigo-700">
                      {row.real.avgSatisfactionScore} pts
                    </span>
                  </TableCell>
                  <TableCell className="text-xs text-center">
                    {row.real.rate}%{' '}
                    <span className="text-[10px] text-slate-400 font-normal">
                      (mín. {row.minResolutionRate}%)
                    </span>
                  </TableCell>
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
