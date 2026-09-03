import { useState, useEffect, useMemo } from 'react'
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card'
import { Badge } from '@/components/ui/badge'
import { Button } from '@/components/ui/button'
import { Avatar, AvatarFallback } from '@/components/ui/avatar'
import { Dialog, DialogContent, DialogHeader, DialogTitle } from '@/components/ui/dialog'
import {
  Table,
  TableBody,
  TableCell,
  TableHead,
  TableHeader,
  TableRow,
} from '@/components/ui/table'
import {
  CollaboratorStatus,
  COLLABORATOR_STATUSES,
  STATUS_CONFIG,
  getCollaboratorStatusLogs,
  calculateTimePerStatus,
  formatMinutes,
} from '@/services/collaborator-status'
import { UserRecord, CollaboratorStatusLog } from '@/types/service_record'
import { getUsers } from '@/services/users'
import { useRealtime } from '@/hooks/use-realtime'
import { cn } from '@/lib/utils'
import { formatGMT3DateTime } from '@/lib/timezone'
import { Users2, History, Clock, RefreshCw, Circle } from 'lucide-react'

interface CollaboratorStatusPanelProps {
  className?: string
  showOnlyAvailable?: boolean
}

export function CollaboratorStatusPanel({
  className,
  showOnlyAvailable = false,
}: CollaboratorStatusPanelProps) {
  const [users, setUsers] = useState<UserRecord[]>([])
  const [selectedUser, setSelectedUser] = useState<UserRecord | null>(null)
  const [historyLogs, setHistoryLogs] = useState<CollaboratorStatusLog[]>([])
  const [historyOpen, setHistoryOpen] = useState(false)
  const [loadingHistory, setLoadingHistory] = useState(false)
  const [statusFilter, setStatusFilter] = useState<string>('todos')

  const loadUsers = async () => {
    try {
      const data = await getUsers()
      // Filtra usuários internos da equipe
      const internal = data.filter((u) =>
        [
          'Consultor',
          'Líder',
          'Supervisor',
          'Gerente',
          'Consultores',
          'Líderes',
          'Supervisores',
          'Gerentes',
          'Master',
          'Executivo de Contas',
        ].includes(u.role),
      )
      setUsers(internal)
    } catch (err) {
      console.error('Erro ao carregar colaboradores:', err)
    }
  }

  useEffect(() => {
    loadUsers()
  }, [])

  useRealtime('users', () => loadUsers())
  useRealtime('collaborator_status_logs', () => loadUsers())

  const handleOpenHistory = async (user: UserRecord) => {
    setSelectedUser(user)
    setHistoryOpen(true)
    setLoadingHistory(true)
    try {
      const logs = await getCollaboratorStatusLogs(user.id, 40)
      setHistoryLogs(logs)
    } catch (err) {
      console.error(err)
    } finally {
      setLoadingHistory(false)
    }
  }

  const countsByStatus = useMemo(() => {
    const counts: Record<string, number> = {
      Disponível: 0,
      'Em atendimento': 0,
      Pausa: 0,
      Almoço: 0,
      Treinamento: 0,
      Reunião: 0,
      Offline: 0,
    }
    users.forEach((u) => {
      const s = u.current_status || 'Offline'
      if (counts[s] !== undefined) counts[s]++
      else counts.Offline++
    })
    return counts
  }, [users])

  const filteredUsers = useMemo(() => {
    if (showOnlyAvailable) {
      return users.filter((u) => u.current_status === 'Disponível')
    }
    if (statusFilter !== 'todos') {
      return users.filter((u) => (u.current_status || 'Offline') === statusFilter)
    }
    return users
  }, [users, showOnlyAvailable, statusFilter])

  const timePerStatusHistory = useMemo(() => {
    return calculateTimePerStatus(historyLogs)
  }, [historyLogs])

  return (
    <>
      <Card className={cn('border-slate-200 shadow-subtle', className)}>
        <CardHeader className="pb-3 border-b border-slate-100 flex flex-row items-center justify-between">
          <div>
            <CardTitle className="text-sm font-bold text-slate-900 flex items-center gap-2">
              <Users2 className="h-4 w-4 text-indigo-600" />
              Disponibilidade da Equipe
              <Badge variant="outline" className="text-[11px] bg-slate-50 font-semibold ml-1">
                {countsByStatus.Disponível} disponível(is) agora
              </Badge>
            </CardTitle>
            <p className="text-xs text-slate-500 mt-0.5">
              Acompanhamento em tempo real do estado dos colaboradores internos
            </p>
          </div>
          <Button
            variant="ghost"
            size="sm"
            onClick={loadUsers}
            className="h-7 text-xs text-slate-600 hover:text-slate-900"
            title="Atualizar lista"
          >
            <RefreshCw className="h-3.5 w-3.5" />
          </Button>
        </CardHeader>
        <CardContent className="p-4 space-y-4">
          {/* Barra de resumo com pílulas de contagem por estado */}
          <div className="flex flex-wrap items-center gap-1.5 pb-2">
            <button
              type="button"
              onClick={() => setStatusFilter('todos')}
              className={cn(
                'px-2.5 py-1 rounded-full text-xs font-semibold transition-all border',
                statusFilter === 'todos'
                  ? 'bg-slate-900 text-white border-slate-900'
                  : 'bg-slate-50 text-slate-600 border-slate-200 hover:bg-slate-100',
              )}
            >
              Todos ({users.length})
            </button>
            {COLLABORATOR_STATUSES.map((status) => {
              const cfg = STATUS_CONFIG[status]
              const count = countsByStatus[status] || 0
              const isActive = statusFilter === status
              return (
                <button
                  key={status}
                  type="button"
                  onClick={() => setStatusFilter(status)}
                  className={cn(
                    'inline-flex items-center gap-1.5 px-2.5 py-1 rounded-full text-xs font-semibold transition-all border',
                    isActive
                      ? `${cfg.bgColor} ${cfg.textColor} ${cfg.borderColor} ring-2 ring-offset-1 ring-slate-400`
                      : `${cfg.bgColor} ${cfg.textColor} ${cfg.borderColor} hover:brightness-95`,
                  )}
                >
                  <span className={cn('h-1.5 w-1.5 rounded-full', cfg.dotColor)} />
                  <span>{status}</span>
                  <span className="text-[10px] opacity-75 font-bold">({count})</span>
                </button>
              )
            })}
          </div>

          {/* Grid de colaboradores */}
          <div className="grid grid-cols-1 sm:grid-cols-2 md:grid-cols-3 lg:grid-cols-4 gap-3">
            {filteredUsers.map((colab) => {
              const currentStatus: CollaboratorStatus = colab.current_status || 'Offline'
              const cfg = STATUS_CONFIG[currentStatus] || STATUS_CONFIG.Offline
              const initials =
                colab.name
                  ?.split(' ')
                  .map((n) => n[0])
                  .slice(0, 2)
                  .join('')
                  .toUpperCase() || '?'

              return (
                <div
                  key={colab.id}
                  className={cn(
                    'p-3 rounded-lg border transition-all flex flex-col justify-between gap-2 bg-white hover:border-slate-300',
                    currentStatus === 'Disponível'
                      ? 'border-emerald-200 bg-emerald-50/20'
                      : 'border-slate-200',
                  )}
                >
                  <div className="flex items-start justify-between gap-2">
                    <div className="flex items-center gap-2 min-w-0">
                      <Avatar className="h-8 w-8 shrink-0">
                        <AvatarFallback className="text-xs bg-slate-100 font-bold text-slate-700">
                          {initials}
                        </AvatarFallback>
                      </Avatar>
                      <div className="min-w-0">
                        <p className="text-xs font-bold text-slate-900 truncate" title={colab.name}>
                          {colab.name}
                        </p>
                        <p className="text-[10px] text-slate-400 truncate">{colab.role}</p>
                      </div>
                    </div>
                  </div>

                  <div className="flex items-center justify-between pt-1 border-t border-slate-100">
                    <span
                      className={cn(
                        'inline-flex items-center gap-1.5 px-2 py-0.5 rounded-full text-[11px] font-semibold border',
                        cfg.bgColor,
                        cfg.textColor,
                        cfg.borderColor,
                      )}
                    >
                      <span className={cn('h-1.5 w-1.5 rounded-full', cfg.dotColor)} />
                      {cfg.label}
                    </span>

                    <Button
                      variant="ghost"
                      size="sm"
                      onClick={() => handleOpenHistory(colab)}
                      className="h-6 px-1.5 text-[10px] text-slate-500 hover:text-slate-900"
                      title="Ver histórico de status"
                    >
                      <History className="h-3 w-3 mr-1" /> Histórico
                    </Button>
                  </div>
                </div>
              )
            })}
          </div>

          {filteredUsers.length === 0 && (
            <div className="text-center py-8 text-xs text-slate-400">
              Nenhum colaborador encontrado com o filtro selecionado.
            </div>
          )}
        </CardContent>
      </Card>

      {/* Modal de Histórico de Mudanças de Status */}
      <Dialog open={historyOpen} onOpenChange={setHistoryOpen}>
        <DialogContent className="sm:max-w-[650px] max-h-[85vh] overflow-y-auto">
          <DialogHeader className="border-b pb-3">
            <DialogTitle className="text-base font-bold text-slate-900 flex items-center gap-2">
              <Clock className="h-4 w-4 text-indigo-600" />
              Histórico de Status — {selectedUser?.name}
            </DialogTitle>
            <p className="text-xs text-slate-500">
              Registro cronológico de entradas e saídas de cada estado e tempo total decorrido.
            </p>
          </DialogHeader>

          {loadingHistory ? (
            <div className="py-12 text-center text-xs text-slate-400">Carregando histórico...</div>
          ) : (
            <div className="space-y-4 py-2">
              {/* Resumo de tempo por estado */}
              <div className="bg-slate-50 p-3 rounded-lg border border-slate-200">
                <span className="text-[11px] font-bold text-slate-700 block mb-2 uppercase tracking-wider">
                  Tempo Total nos Estados Registrados
                </span>
                <div className="grid grid-cols-2 sm:grid-cols-4 gap-2">
                  {COLLABORATOR_STATUSES.filter((s) => s !== 'Offline').map((st) => {
                    const mins = timePerStatusHistory[st] || 0
                    const cfg = STATUS_CONFIG[st]
                    return (
                      <div
                        key={st}
                        className={cn('p-2 rounded border text-xs', cfg.bgColor, cfg.borderColor)}
                      >
                        <p className={cn('text-[10px] font-semibold', cfg.textColor)}>{st}</p>
                        <p className="text-sm font-extrabold text-slate-900 mt-0.5">
                          {formatMinutes(mins)}
                        </p>
                      </div>
                    )
                  })}
                </div>
              </div>

              {/* Tabela de logs detalhados */}
              <div className="border border-slate-200 rounded-lg overflow-hidden">
                <Table>
                  <TableHeader className="bg-slate-50">
                    <TableRow>
                      <TableHead className="text-xs font-bold">Estado</TableHead>
                      <TableHead className="text-xs font-bold">Início</TableHead>
                      <TableHead className="text-xs font-bold">Fim</TableHead>
                      <TableHead className="text-xs font-bold text-right">Duração</TableHead>
                    </TableRow>
                  </TableHeader>
                  <TableBody>
                    {historyLogs.map((log) => {
                      const cfg = STATUS_CONFIG[log.new_status] || STATUS_CONFIG.Offline
                      const durationMins = log.duration_seconds
                        ? Math.round(log.duration_seconds / 60)
                        : null
                      return (
                        <TableRow key={log.id} className="text-xs">
                          <TableCell>
                            <span
                              className={cn(
                                'inline-flex items-center gap-1.5 px-2 py-0.5 rounded-full text-[10px] font-semibold border',
                                cfg.bgColor,
                                cfg.textColor,
                                cfg.borderColor,
                              )}
                            >
                              <span className={cn('h-1.5 w-1.5 rounded-full', cfg.dotColor)} />
                              {log.new_status}
                            </span>
                          </TableCell>
                          <TableCell className="text-slate-600">
                            {formatGMT3DateTime(log.started_at)}
                          </TableCell>
                          <TableCell className="text-slate-600">
                            {log.ended_at ? (
                              formatGMT3DateTime(log.ended_at)
                            ) : (
                              <span className="text-emerald-600 font-semibold">Em andamento</span>
                            )}
                          </TableCell>
                          <TableCell className="text-right font-bold text-slate-900">
                            {durationMins != null ? formatMinutes(durationMins) : 'Atual'}
                          </TableCell>
                        </TableRow>
                      )
                    })}
                    {historyLogs.length === 0 && (
                      <TableRow>
                        <TableCell colSpan={4} className="text-center py-6 text-slate-400">
                          Nenhum registro de mudança de status encontrado para este colaborador.
                        </TableCell>
                      </TableRow>
                    )}
                  </TableBody>
                </Table>
              </div>
            </div>
          )}
        </DialogContent>
      </Dialog>
    </>
  )
}
