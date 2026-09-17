import { useState, useMemo } from 'react'
import { Card, CardContent, CardHeader, CardTitle, CardDescription } from '@/components/ui/card'
import { Button } from '@/components/ui/button'
import { Badge } from '@/components/ui/badge'
import { Input } from '@/components/ui/input'
import { Label } from '@/components/ui/label'
import { Textarea } from '@/components/ui/textarea'
import {
  Dialog,
  DialogContent,
  DialogHeader,
  DialogTitle,
  DialogFooter,
} from '@/components/ui/dialog'
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from '@/components/ui/select'
import {
  Table,
  TableHeader,
  TableBody,
  TableRow,
  TableHead,
  TableCell,
} from '@/components/ui/table'
import {
  CheckCircle2,
  XCircle,
  Clock,
  Palmtree,
  Coffee,
  FileHeart,
  AlertTriangle,
  Users2,
  Search,
  Filter,
  Check,
  X,
  MessageSquare,
  ShieldCheck,
} from 'lucide-react'
import { UserRecord } from '@/types/service_record'
import { AbsenceRecord, AbsenceReason, AbsenceAlertConfigRecord } from '@/types/banco-ferias'
import { approveAbsence, rejectAbsence } from '@/services/banco-ferias'
import { checkTeamCoverage } from '@/services/clt-validation'
import { SERVICE_GROUP_OPTIONS } from '@/lib/service-groups'
import { toast } from '@/hooks/use-toast'

interface AbsenceApprovalsViewProps {
  currentUser: UserRecord
  users: UserRecord[]
  absences: AbsenceRecord[]
  config: AbsenceAlertConfigRecord
  onRefresh: () => void
}

export function AbsenceApprovalsView({
  currentUser,
  users,
  absences,
  config,
  onRefresh,
}: AbsenceApprovalsViewProps) {
  const [selectedGroup, setSelectedGroup] = useState<string>('all')
  const [selectedReason, setSelectedReason] = useState<string>('all')
  const [searchTerm, setSearchTerm] = useState('')
  const [statusFilter, setStatusFilter] = useState<'pending' | 'resolved' | 'all'>('pending')

  // Modais de ação
  const [actionItem, setActionItem] = useState<{
    absence: AbsenceRecord
    type: 'approve' | 'reject'
  } | null>(null)
  const [rejectionReason, setRejectionReason] = useState('')
  const [approvalNotes, setApprovalNotes] = useState('')
  const [isProcessing, setIsProcessing] = useState(false)

  const isMaster = currentUser.role === 'Master' || currentUser.master_access === true
  const isGerente = currentUser.role === 'Gerente'
  const userGroups = (currentUser.service_groups as string[] | undefined) || []

  // Mapa de usuários
  const usersMap = useMemo(() => {
    const map = new Map<string, UserRecord>()
    users.forEach((u) => map.set(u.id, u))
    return map
  }, [users])

  // Filtragem por escopo RBAC
  // Master / Gerente global vê tudo. Supervisor / Líder vê seu Núcleo. Consultor vê só a si próprio.
  const scopedAbsences = useMemo(() => {
    return absences.filter((abs) => {
      const u = usersMap.get(abs.user_id)
      if (!u) return false

      if (isMaster) return true
      if (isGerente && userGroups.length === 0) return true

      if (currentUser.role === 'Supervisor' || currentUser.role === 'Líder' || isGerente) {
        // Se pertencer ao mesmo Núcleo ou for o próprio usuário
        if (u.id === currentUser.id) return true
        const uGroups = (u.service_groups as string[] | undefined) || []
        return uGroups.some((g) => userGroups.includes(g))
      }

      // Demais colaboradores vêem apenas as suas
      return u.id === currentUser.id
    })
  }, [absences, usersMap, isMaster, isGerente, userGroups, currentUser])

  // Filtragem por filtros rápidos de busca, grupo, motivo e status
  const filteredList = useMemo(() => {
    return scopedAbsences.filter((abs) => {
      const u = usersMap.get(abs.user_id)
      const uName = u?.name?.toLowerCase() || ''

      if (searchTerm && !uName.includes(searchTerm.toLowerCase())) return false

      if (selectedGroup !== 'all') {
        const uGroups = (u?.service_groups as string[] | undefined) || []
        if (!uGroups.includes(selectedGroup)) return false
      }

      if (selectedReason !== 'all' && abs.reason !== selectedReason) return false

      if (statusFilter === 'pending') {
        return abs.status === 'Pendente'
      } else if (statusFilter === 'resolved') {
        return abs.status === 'Aprovada' || abs.status === 'Rejeitada'
      }

      return true
    })
  }, [scopedAbsences, usersMap, searchTerm, selectedGroup, selectedReason, statusFilter])

  // Contadores
  const pendingCount = useMemo(() => {
    return scopedAbsences.filter((a) => a.status === 'Pendente').length
  }, [scopedAbsences])

  const approvedCount = useMemo(() => {
    return scopedAbsences.filter((a) => a.status === 'Aprovada').length
  }, [scopedAbsences])

  const rejectedCount = useMemo(() => {
    return scopedAbsences.filter((a) => a.status === 'Rejeitada').length
  }, [scopedAbsences])

  const getReasonBadge = (reason: AbsenceReason) => {
    switch (reason) {
      case 'Férias':
        return (
          <Badge className="bg-amber-100 text-amber-900 border-amber-300 text-xs gap-1 font-semibold">
            <Palmtree className="h-3 w-3 text-amber-600" /> Férias
          </Badge>
        )
      case 'Banco de horas':
        return (
          <Badge className="bg-blue-100 text-blue-900 border-blue-300 text-xs gap-1 font-semibold">
            <Clock className="h-3 w-3 text-blue-600" /> Banco de horas
          </Badge>
        )
      case 'Dayoff':
        return (
          <Badge className="bg-purple-100 text-purple-900 border-purple-300 text-xs gap-1 font-semibold">
            <Coffee className="h-3 w-3 text-purple-600" /> Dayoff
          </Badge>
        )
      case 'Atestado':
        return (
          <Badge className="bg-rose-100 text-rose-900 border-rose-300 text-xs gap-1 font-semibold">
            <FileHeart className="h-3 w-3 text-rose-600" /> Atestado
          </Badge>
        )
      default:
        return <Badge variant="outline">{reason}</Badge>
    }
  }

  const handleOpenAction = (absence: AbsenceRecord, type: 'approve' | 'reject') => {
    setActionItem({ absence, type })
    setRejectionReason('')
    setApprovalNotes('')
  }

  const handleConfirmAction = async () => {
    if (!actionItem) return

    if (actionItem.type === 'reject' && !rejectionReason.trim()) {
      toast({
        variant: 'destructive',
        title: 'Motivo obrigatório',
        description: 'Por favor, informe a justificativa da rejeição.',
      })
      return
    }

    setIsProcessing(true)
    try {
      if (actionItem.type === 'approve') {
        await approveAbsence(actionItem.absence.id, approvalNotes)
        toast({
          title: 'Ausência aprovada com sucesso!',
          description: `A solicitação de ${actionItem.absence.reason} foi confirmada e adicionada ao calendário oficial.`,
        })
      } else {
        await rejectAbsence(actionItem.absence.id, rejectionReason, approvalNotes)
        toast({
          title: 'Solicitação rejeitada',
          description: 'O colaborador foi notificado sobre a rejeição e o motivo.',
        })
      }
      setActionItem(null)
      onRefresh()
    } catch (err: any) {
      console.error('Erro ao processar aprovação de ausência:', err)
      toast({
        variant: 'destructive',
        title: 'Erro ao processar',
        description: err?.message || 'Falha ao comunicar com o servidor.',
      })
    } finally {
      setIsProcessing(false)
    }
  }

  // Verifica cobertura da equipe para o item sendo avaliado
  const selectedAbsenceCoverage = useMemo(() => {
    if (!actionItem) return null
    const u = usersMap.get(actionItem.absence.user_id)
    if (!u) return null

    const team = users.filter((m) => {
      const selGroups = (u.service_groups as string[] | undefined) || []
      if (selGroups.length === 0) return true
      const mGroups = (m.service_groups as string[] | undefined) || []
      return mGroups.some((g) => selGroups.includes(g))
    })

    const startDate = actionItem.absence.start_date.substring(0, 10)
    return checkTeamCoverage(startDate, team, absences, config.max_team_absence_pct || 30)
  }, [actionItem, usersMap, users, absences, config])

  return (
    <div className="space-y-6 min-w-0 w-full">
      {/* Cards de Métricas de Aprovação */}
      <div className="grid grid-cols-1 sm:grid-cols-3 gap-3">
        {' '}
        <div
          onClick={() => setStatusFilter('pending')}
          className={`p-3.5 rounded-lg border cursor-pointer transition-all ${
            statusFilter === 'pending'
              ? 'bg-amber-50 border-amber-300 ring-2 ring-amber-400'
              : 'bg-white border-slate-200 hover:border-slate-300'
          }`}
        >
          <div className="flex items-center justify-between">
            <span className="text-xs font-semibold text-amber-800">Pendentes de Avaliação</span>
            <Clock className="h-4 w-4 text-amber-600" />
          </div>
          <div className="mt-2 flex items-baseline gap-2">
            <span className="text-2xl font-bold text-amber-950">{pendingCount}</span>
            <span className="text-xs text-amber-700">solicitação(ões)</span>
          </div>
        </div>
        <div
          onClick={() => setStatusFilter('resolved')}
          className={`p-3.5 rounded-lg border cursor-pointer transition-all ${
            statusFilter === 'resolved'
              ? 'bg-emerald-50 border-emerald-300 ring-2 ring-emerald-400'
              : 'bg-white border-slate-200 hover:border-slate-300'
          }`}
        >
          <div className="flex items-center justify-between">
            <span className="text-xs font-semibold text-emerald-800">Aprovadas no Período</span>
            <CheckCircle2 className="h-4 w-4 text-emerald-600" />
          </div>
          <div className="mt-2 flex items-baseline gap-2">
            <span className="text-2xl font-bold text-emerald-950">{approvedCount}</span>
            <span className="text-xs text-emerald-700">confirmadas</span>
          </div>
        </div>
        <div
          onClick={() => setStatusFilter('all')}
          className={`p-3.5 rounded-lg border cursor-pointer transition-all ${
            statusFilter === 'all'
              ? 'bg-slate-100 border-slate-300 ring-2 ring-slate-400'
              : 'bg-white border-slate-200 hover:border-slate-300'
          }`}
        >
          <div className="flex items-center justify-between">
            <span className="text-xs font-semibold text-slate-700">Total no Escopo</span>
            <Users2 className="h-4 w-4 text-slate-500" />
          </div>
          <div className="mt-2 flex items-baseline gap-2">
            <span className="text-2xl font-bold text-slate-900">{scopedAbsences.length}</span>
            <span className="text-xs text-slate-500">({rejectedCount} rejeitada(s))</span>
          </div>
        </div>
      </div>

      {/* Barra de Filtros e Busca */}
      <Card className="border-slate-200 shadow-sm">
        <CardContent className="pt-4 space-y-3">
          <div className="flex flex-col md:flex-row md:items-center justify-between gap-3">
            <div className="relative flex-1">
              <Search className="absolute left-2.5 top-2.5 h-4 w-4 text-slate-400" />
              <Input
                placeholder="Buscar por colaborador..."
                value={searchTerm}
                onChange={(e) => setSearchTerm(e.target.value)}
                className="pl-8 text-xs h-9"
              />
            </div>

            <div className="flex flex-wrap items-center gap-2">
              <div className="w-full sm:w-40 min-w-[130px]">
                <Select value={selectedGroup} onValueChange={setSelectedGroup}>
                  <SelectTrigger className="h-9 text-xs">
                    <SelectValue placeholder="Núcleo" />
                  </SelectTrigger>
                  <SelectContent>
                    <SelectItem value="all">Todos os Núcleos</SelectItem>
                    {SERVICE_GROUP_OPTIONS.map((g) => (
                      <SelectItem key={g.value} value={g.value}>
                        {g.label}
                      </SelectItem>
                    ))}
                  </SelectContent>
                </Select>
              </div>

              <div className="w-full sm:w-40 min-w-[130px]">
                <Select value={selectedReason} onValueChange={setSelectedReason}>
                  <SelectTrigger className="h-9 text-xs">
                    <SelectValue placeholder="Motivo" />
                  </SelectTrigger>
                  <SelectContent>
                    <SelectItem value="all">Todos os motivos</SelectItem>
                    <SelectItem value="Férias">🌴 Férias</SelectItem>
                    <SelectItem value="Banco de horas">⏱️ Banco de horas</SelectItem>
                    <SelectItem value="Dayoff">☕ Dayoff</SelectItem>
                    <SelectItem value="Atestado">🩺 Atestado</SelectItem>
                  </SelectContent>
                </Select>
              </div>

              <div className="w-full sm:w-36 min-w-[120px]">
                <Select value={statusFilter} onValueChange={(v: any) => setStatusFilter(v)}>
                  <SelectTrigger className="h-9 text-xs">
                    <SelectValue placeholder="Status" />
                  </SelectTrigger>
                  <SelectContent>
                    <SelectItem value="pending">⏳ Apenas Pendentes</SelectItem>
                    <SelectItem value="resolved">✅ Resolvidas</SelectItem>
                    <SelectItem value="all">📋 Todas</SelectItem>
                  </SelectContent>
                </Select>
              </div>
            </div>
          </div>
        </CardContent>
      </Card>

      {/* Tabela de Solicitações */}
      <Card className="border-slate-200 shadow-sm">
        <CardHeader className="pb-3 border-b border-slate-100">
          <div className="flex items-center justify-between">
            <div>
              <CardTitle className="text-base font-bold text-slate-900">
                Solicitações de Ausência da Equipe
              </CardTitle>
              <CardDescription className="text-xs">
                Avalie os pedidos de férias, folgas e dayoffs dos colaboradores do seu escopo com
                validação prévia de cobertura.
              </CardDescription>
            </div>
            <Badge variant="outline" className="text-xs">
              {filteredList.length} registro(s)
            </Badge>
          </div>
        </CardHeader>

        <CardContent className="p-0">
          <div className="overflow-x-auto">
            <Table>
              <TableHeader>
                <TableRow className="text-xs bg-slate-50">
                  <TableHead>Colaborador</TableHead>
                  <TableHead>Núcleo / Papel</TableHead>
                  <TableHead>Motivo</TableHead>
                  <TableHead>Período Solicitado</TableHead>
                  <TableHead>Dias</TableHead>
                  <TableHead>Status</TableHead>
                  <TableHead>Observações</TableHead>
                  <TableHead>Auditoria</TableHead>
                  <TableHead className="text-right">Ações</TableHead>
                </TableRow>
              </TableHeader>
              <TableBody>
                {filteredList.map((abs) => {
                  const u = usersMap.get(abs.user_id)
                  const startD = abs?.start_date
                    ? new Date(abs.start_date.substring(0, 10) + 'T12:00:00Z')
                    : null
                  const endD = abs?.end_date
                    ? new Date(abs.end_date.substring(0, 10) + 'T12:00:00Z')
                    : null
                  const diffDays =
                    startD && endD && !isNaN(startD.getTime()) && !isNaN(endD.getTime())
                      ? Math.round((endD.getTime() - startD.getTime()) / (24 * 3600 * 1000)) + 1
                      : 0
                  const isPending = abs.status === 'Pendente'

                  const approver = abs.approved_by ? usersMap.get(abs.approved_by) : null

                  return (
                    <TableRow
                      key={abs.id}
                      className={`text-xs ${
                        isPending ? 'bg-amber-50/20 hover:bg-amber-50/40' : 'hover:bg-slate-50'
                      }`}
                    >
                      <TableCell className="font-semibold text-slate-900 whitespace-nowrap">
                        {u?.name || 'Desconhecido'}
                      </TableCell>

                      <TableCell className="text-slate-600 whitespace-nowrap">
                        <div>
                          <span className="font-medium text-slate-700">{u?.role || '—'}</span>
                          {Array.isArray(u?.service_groups) && u.service_groups.length > 0 && (
                            <p className="text-[10px] text-slate-500">
                              {u.service_groups.join(', ')}
                            </p>
                          )}
                        </div>
                      </TableCell>

                      <TableCell className="whitespace-nowrap">
                        {getReasonBadge(abs.reason)}
                      </TableCell>

                      <TableCell className="text-slate-700 font-medium whitespace-nowrap">
                        {startD && !isNaN(startD.getTime())
                          ? startD.toLocaleDateString('pt-BR')
                          : '—'}{' '}
                        até{' '}
                        {endD && !isNaN(endD.getTime()) ? endD.toLocaleDateString('pt-BR') : '—'}
                      </TableCell>

                      <TableCell className="whitespace-nowrap">
                        <Badge variant="outline" className="text-[11px] font-semibold">
                          {diffDays} {diffDays === 1 ? 'dia' : 'dias'}
                        </Badge>
                      </TableCell>

                      <TableCell className="whitespace-nowrap">
                        <Badge
                          className={`text-[10px] font-semibold ${
                            abs.status === 'Pendente'
                              ? 'bg-amber-100 text-amber-900 border-amber-300'
                              : abs.status === 'Aprovada'
                                ? 'bg-emerald-100 text-emerald-800 border-emerald-200'
                                : abs.status === 'Rejeitada'
                                  ? 'bg-rose-100 text-rose-800 border-rose-200'
                                  : 'bg-slate-100 text-slate-700'
                          }`}
                        >
                          {abs.status === 'Pendente' && '⏳ Pendente'}
                          {abs.status === 'Aprovada' && '✅ Aprovada'}
                          {abs.status === 'Rejeitada' && '❌ Rejeitada'}
                          {abs.status === 'Cancelada' && '🚫 Cancelada'}
                          {!['Pendente', 'Aprovada', 'Rejeitada', 'Cancelada'].includes(
                            abs.status || '',
                          ) && abs.status}
                        </Badge>
                      </TableCell>

                      <TableCell className="max-w-xs truncate text-slate-600">
                        {abs.notes ? (
                          <span title={abs.notes} className="truncate block">
                            {abs.notes}
                          </span>
                        ) : (
                          <span className="text-slate-400 italic">Sem observações</span>
                        )}
                        {abs.rejection_reason && (
                          <p className="text-[10px] text-rose-600 font-medium mt-0.5">
                            Motivo rejeição: {abs.rejection_reason}
                          </p>
                        )}
                      </TableCell>

                      <TableCell className="text-[11px] text-slate-500 whitespace-nowrap">
                        {approver ? (
                          <div>
                            <span className="font-medium text-slate-700">{approver.name}</span>
                            {abs.approved_at && (
                              <p className="text-[10px] text-slate-400">
                                {new Date(abs.approved_at).toLocaleDateString('pt-BR')}{' '}
                                {new Date(abs.approved_at).toLocaleTimeString('pt-BR', {
                                  hour: '2-digit',
                                  minute: '2-digit',
                                })}
                              </p>
                            )}
                          </div>
                        ) : (
                          <span className="text-slate-400">—</span>
                        )}
                      </TableCell>

                      <TableCell className="text-right whitespace-nowrap">
                        {isPending ? (
                          <div className="flex items-center justify-end gap-1.5">
                            <Button
                              size="sm"
                              onClick={() => handleOpenAction(abs, 'approve')}
                              className="h-7 px-2.5 text-xs bg-emerald-600 hover:bg-emerald-700 text-white gap-1"
                            >
                              <Check className="h-3.5 w-3.5" />
                              Aprovar
                            </Button>
                            <Button
                              variant="outline"
                              size="sm"
                              onClick={() => handleOpenAction(abs, 'reject')}
                              className="h-7 px-2.5 text-xs text-rose-700 border-rose-300 hover:bg-rose-50 gap-1"
                            >
                              <X className="h-3.5 w-3.5" />
                              Rejeitar
                            </Button>
                          </div>
                        ) : (
                          <span className="text-[11px] text-slate-400 italic">Concluído</span>
                        )}
                      </TableCell>
                    </TableRow>
                  )
                })}

                {filteredList.length === 0 && (
                  <TableRow>
                    <TableCell colSpan={9} className="text-center py-10 text-xs text-slate-400">
                      Nenhuma solicitação de ausência encontrada para os filtros atuais.
                    </TableCell>
                  </TableRow>
                )}
              </TableBody>
            </Table>
          </div>
        </CardContent>
      </Card>

      {/* Modal de Confirmação de Aprovação ou Rejeição */}
      <Dialog open={Boolean(actionItem)} onOpenChange={(open) => !open && setActionItem(null)}>
        <DialogContent className="max-w-md">
          <DialogHeader>
            <DialogTitle className="text-base font-bold text-slate-900 flex items-center gap-2">
              {actionItem?.type === 'approve' ? (
                <>
                  <CheckCircle2 className="h-5 w-5 text-emerald-600" />
                  Confirmar Aprovação de Ausência
                </>
              ) : (
                <>
                  <XCircle className="h-5 w-5 text-rose-600" />
                  Rejeitar Solicitação de Ausência
                </>
              )}
            </DialogTitle>
          </DialogHeader>

          {actionItem && (
            <div className="space-y-4 pt-2">
              <div className="p-3 rounded-lg bg-slate-50 border border-slate-200 text-xs space-y-1.5">
                <div className="flex justify-between">
                  <span className="text-slate-500 font-medium">Colaborador:</span>
                  <span className="font-bold text-slate-900">
                    {usersMap.get(actionItem.absence.user_id)?.name}
                  </span>
                </div>
                <div className="flex justify-between">
                  <span className="text-slate-500 font-medium">Motivo:</span>
                  <span className="font-semibold text-slate-800">{actionItem.absence.reason}</span>
                </div>
                <div className="flex justify-between">
                  <span className="text-slate-500 font-medium">Período:</span>
                  <span className="font-semibold text-slate-800">
                    {new Date(
                      actionItem.absence.start_date.substring(0, 10) + 'T12:00:00Z',
                    ).toLocaleDateString('pt-BR')}{' '}
                    até{' '}
                    {new Date(
                      actionItem.absence.end_date.substring(0, 10) + 'T12:00:00Z',
                    ).toLocaleDateString('pt-BR')}
                  </span>
                </div>
                {actionItem.absence.notes && (
                  <div className="pt-1 border-t border-slate-200">
                    <span className="text-slate-500 font-medium">Observações do colaborador:</span>
                    <p className="text-slate-700 italic mt-0.5">{actionItem.absence.notes}</p>
                  </div>
                )}
              </div>

              {/* Indicador de Cobertura */}
              {selectedAbsenceCoverage && (
                <div>
                  {selectedAbsenceCoverage.hasConflict ? (
                    <div className="p-2.5 rounded-lg bg-amber-50 border border-amber-200 flex items-start gap-2 text-xs text-amber-900">
                      <AlertTriangle className="h-4 w-4 text-amber-600 shrink-0 mt-0.5" />
                      <div>
                        <p className="font-bold">
                          Atenção: Ausência deixará a equipe com{' '}
                          {selectedAbsenceCoverage.absencePct}% ausente
                        </p>
                        <p className="text-[11px] text-amber-800 mt-0.5">
                          Teto configurado: {selectedAbsenceCoverage.maxAllowedAbsencePct}%. Já há{' '}
                          {selectedAbsenceCoverage.absentCount} membro(s) ausente(s) nesta data.
                        </p>
                      </div>
                    </div>
                  ) : (
                    <div className="p-2.5 rounded-lg bg-emerald-50 border border-emerald-200 flex items-center gap-2 text-xs text-emerald-800">
                      <ShieldCheck className="h-4 w-4 text-emerald-600 shrink-0" />
                      <span>
                        Cobertura garantida: apenas {selectedAbsenceCoverage.absencePct}% da equipe
                        estará ausente nesta data.
                      </span>
                    </div>
                  )}
                </div>
              )}

              {/* Campo para Justificativa de Rejeição */}
              {actionItem.type === 'reject' && (
                <div className="space-y-1.5">
                  <Label className="text-xs font-semibold text-slate-800">
                    Motivo da Rejeição *
                  </Label>
                  <Textarea
                    placeholder="Ex.: Falta de cobertura mínima no Núcleo na mesma semana ou período crítico de operação."
                    value={rejectionReason}
                    onChange={(e) => setRejectionReason(e.target.value)}
                    className="text-xs min-h-20"
                    required
                  />
                  <p className="text-[10px] text-slate-400">
                    O colaborador receberá esta justificativa no sino e por e-mail.
                  </p>
                </div>
              )}

              {/* Observações Opcionais de Aprovação / Alinhamento */}
              <div className="space-y-1.5">
                <Label className="text-xs font-semibold text-slate-800">
                  {actionItem.type === 'approve'
                    ? 'Observações de Aprovação (Opcional)'
                    : 'Observações Adicionais (Opcional)'}
                </Label>
                <Input
                  placeholder="Ex.: Alinhado com a diretoria ou cobertura ajustada"
                  value={approvalNotes}
                  onChange={(e) => setApprovalNotes(e.target.value)}
                  className="h-9 text-xs"
                />
              </div>

              <DialogFooter className="pt-2 border-t border-slate-100">
                <Button
                  type="button"
                  variant="outline"
                  size="sm"
                  onClick={() => setActionItem(null)}
                  className="text-xs"
                >
                  Cancelar
                </Button>
                <Button
                  type="button"
                  size="sm"
                  disabled={isProcessing}
                  onClick={handleConfirmAction}
                  className={`text-xs ${
                    actionItem.type === 'approve'
                      ? 'bg-emerald-600 hover:bg-emerald-700 text-white'
                      : 'bg-rose-600 hover:bg-rose-700 text-white'
                  }`}
                >
                  {isProcessing
                    ? 'Processando...'
                    : actionItem.type === 'approve'
                      ? 'Confirmar Aprovação'
                      : 'Confirmar Rejeição'}
                </Button>
              </DialogFooter>
            </div>
          )}
        </DialogContent>
      </Dialog>
    </div>
  )
}
