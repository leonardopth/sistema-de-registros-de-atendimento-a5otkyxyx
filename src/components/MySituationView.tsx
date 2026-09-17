import { useMemo, useState } from 'react'
import { Card, CardContent, CardHeader, CardTitle, CardDescription } from '@/components/ui/card'
import { Badge } from '@/components/ui/badge'
import { Button } from '@/components/ui/button'
import {
  Table,
  TableHeader,
  TableBody,
  TableRow,
  TableHead,
  TableCell,
} from '@/components/ui/table'
import {
  Clock,
  Palmtree,
  CalendarCheck2,
  AlertTriangle,
  CheckCircle2,
  TrendingUp,
  History,
  XCircle,
  PlusCircle,
  AlertCircle,
} from 'lucide-react'
import { UserRecord } from '@/types/service_record'
import { HourBankEntryRecord, AbsenceRecord, AbsenceAlertConfigRecord } from '@/types/banco-ferias'
import { isManagerRole, evaluateVacationStatus } from '@/services/clt-validation'
import { cancelAbsence } from '@/services/banco-ferias'
import { toast } from '@/hooks/use-toast'

interface MySituationViewProps {
  currentUser: UserRecord
  entries: HourBankEntryRecord[]
  absences: AbsenceRecord[]
  config: AbsenceAlertConfigRecord
  onNewAbsence?: () => void
  onRefresh?: () => void
}

export function MySituationView({
  currentUser,
  entries,
  absences,
  config,
  onNewAbsence,
  onRefresh,
}: MySituationViewProps) {
  const isManager = isManagerRole(currentUser.role)
  const [cancellingId, setCancellingId] = useState<string | null>(null)

  // Meus lançamentos de banco de horas (apenas não-gestores)
  const myEntries = useMemo(() => {
    return entries.filter((e) => e.user_id === currentUser.id)
  }, [entries, currentUser.id])

  // Cálculo do saldo
  const balanceData = useMemo(() => {
    let credit = 0
    let debit = 0
    myEntries.forEach((e) => {
      if (e.type === 'credito') credit += e.hours
      else debit += e.hours
    })
    const balance = credit - debit
    const limit = config.hour_bank_limit_hours || 10
    const negLimit = config.hour_bank_negative_limit_hours || 10

    return {
      credit,
      debit,
      balance,
      limit,
      isExceeded: balance >= limit,
      isNegativeExceeded: balance <= -negLimit,
    }
  }, [myEntries, config])

  // Minhas ausências e férias
  const myAbsences = useMemo(() => {
    return absences.filter((a) => a.user_id === currentUser.id && a.status !== 'cancelada')
  }, [absences, currentUser.id])

  const handleCancelPending = async (absenceId: string) => {
    if (!confirm('Deseja realmente cancelar esta solicitação de ausência?')) return
    setCancellingId(absenceId)
    try {
      await cancelAbsence(absenceId)
      toast({
        title: 'Solicitação cancelada',
        description: 'Sua solicitação de ausência foi cancelada com sucesso.',
      })
      if (onRefresh) onRefresh()
    } catch (err: any) {
      console.error('Erro ao cancelar ausência:', err)
      toast({
        variant: 'destructive',
        title: 'Erro ao cancelar',
        description: err?.message || 'Falha ao comunicar com o servidor.',
      })
    } finally {
      setCancellingId(null)
    }
  }

  // Avaliação de férias do colaborador
  const vacationStatus = useMemo(() => {
    return evaluateVacationStatus(currentUser, myAbsences, {
      warningDaysBeforeExpiry: config.vacation_warning_days_before_expiry,
      idealWindowStartMonths: config.vacation_ideal_window_start_months,
      idealWindowEndMonths: config.vacation_ideal_window_end_months,
    })
  }, [currentUser, myAbsences, config])

  return (
    <div className="space-y-6 min-w-0 w-full">
      {/* 1. Banco de Horas (Se não for gestor) */}
      {!isManager ? (
        <Card className="border-slate-200 shadow-sm">
          <CardHeader className="pb-3 border-b border-slate-100">
            <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-3">
              <div className="flex items-center gap-2.5">
                <div className="p-2 rounded-lg bg-blue-50 text-blue-600 border border-blue-100">
                  <Clock className="h-5 w-5" />
                </div>
                <div>
                  <CardTitle className="text-base font-bold text-slate-900">
                    Meu Saldo de Banco de Horas
                  </CardTitle>
                  <CardDescription className="text-xs">
                    Lançamentos homologados por gestores e horas acumuladas para folgas ou
                    compensação.
                  </CardDescription>
                </div>
              </div>

              {balanceData.isExceeded ? (
                <Badge className="bg-amber-100 text-amber-900 border-amber-300 font-semibold gap-1 text-xs">
                  <AlertTriangle className="h-3.5 w-3.5 text-amber-600" />
                  Alerta: Acúmulo de {balanceData.balance}h (Teto: {balanceData.limit}h)
                </Badge>
              ) : (
                <Badge className="bg-emerald-100 text-emerald-800 border-emerald-200 font-medium text-xs">
                  Saldo Regular
                </Badge>
              )}
            </div>
          </CardHeader>
          <CardContent className="pt-4 space-y-4">
            <div className="grid grid-cols-1 sm:grid-cols-3 gap-3">
              <div className="p-3 rounded-lg border border-slate-200 bg-slate-50/50">
                <span className="text-xs text-slate-500 font-medium">Horas Creditadas</span>
                <p className="text-xl font-bold text-emerald-600 mt-0.5">+{balanceData.credit}h</p>
              </div>

              <div className="p-3 rounded-lg border border-slate-200 bg-slate-50/50">
                <span className="text-xs text-slate-500 font-medium">Horas Compensadas</span>
                <p className="text-xl font-bold text-rose-600 mt-0.5">-{balanceData.debit}h</p>
              </div>

              <div
                className={`p-3 rounded-lg border ${
                  balanceData.balance > 0
                    ? 'bg-blue-50/80 border-blue-200'
                    : balanceData.balance < 0
                      ? 'bg-rose-50/80 border-rose-200'
                      : 'bg-slate-50 border-slate-200'
                }`}
              >
                <span className="text-xs font-semibold text-slate-700">Saldo Atual Líquido</span>
                <p
                  className={`text-2xl font-extrabold mt-0.5 ${
                    balanceData.balance > 0
                      ? 'text-blue-900'
                      : balanceData.balance < 0
                        ? 'text-rose-900'
                        : 'text-slate-800'
                  }`}
                >
                  {balanceData.balance > 0 ? `+${balanceData.balance}` : balanceData.balance}h
                </p>
              </div>
            </div>

            {/* Extrato recente */}
            <div className="pt-2">
              <h4 className="text-xs font-bold text-slate-700 uppercase tracking-wider mb-2 flex items-center gap-1.5">
                <History className="h-3.5 w-3.5 text-slate-500" /> Extrato de Lançamentos (
                {myEntries.length})
              </h4>
              <div className="overflow-x-auto rounded border border-slate-200">
                <Table>
                  <TableHeader>
                    <TableRow className="text-xs bg-slate-50">
                      <TableHead>Data</TableHead>
                      <TableHead>Tipo</TableHead>
                      <TableHead>Horas</TableHead>
                      <TableHead>Justificativa / Motivo</TableHead>
                      <TableHead>Origem</TableHead>
                    </TableRow>
                  </TableHeader>
                  <TableBody>
                    {myEntries.map((entry) => {
                      const entryDate = entry?.date
                        ? new Date(entry.date.substring(0, 10) + 'T12:00:00Z')
                        : null
                      return (
                        <TableRow key={entry.id} className="text-xs">
                          <TableCell className="font-medium text-slate-900 whitespace-nowrap">
                            {entryDate && !isNaN(entryDate.getTime())
                              ? entryDate.toLocaleDateString('pt-BR')
                              : '—'}
                          </TableCell>
                          <TableCell>
                            {entry.type === 'credito' ? (
                              <Badge className="bg-emerald-100 text-emerald-800 border-emerald-200 text-[10px]">
                                Crédito
                              </Badge>
                            ) : (
                              <Badge className="bg-rose-100 text-rose-800 border-rose-200 text-[10px]">
                                Débito
                              </Badge>
                            )}
                          </TableCell>
                          <TableCell className="font-bold whitespace-nowrap">
                            {entry.type === 'credito' ? `+${entry.hours}` : `-${entry.hours}`}h
                          </TableCell>
                          <TableCell className="text-slate-600 max-w-xs truncate">
                            {entry.description || '—'}
                          </TableCell>
                          <TableCell>
                            <Badge variant="outline" className="text-[10px] text-slate-500">
                              {entry.source === 'lg_sync' ? 'Sincronizado LG' : 'Manual'}
                            </Badge>
                          </TableCell>
                        </TableRow>
                      )
                    })}

                    {myEntries.length === 0 && (
                      <TableRow>
                        <TableCell colSpan={5} className="text-center text-xs text-slate-400 py-6">
                          Nenhum lançamento de banco de horas registrado até o momento.
                        </TableCell>
                      </TableRow>
                    )}
                  </TableBody>
                </Table>
              </div>
            </div>
          </CardContent>
        </Card>
      ) : (
        <Card className="border-indigo-100 bg-indigo-50/40 shadow-sm">
          <CardContent className="pt-4 flex items-center gap-3">
            <div className="p-2.5 rounded-lg bg-indigo-100 text-indigo-700">
              <Clock className="h-5 w-5" />
            </div>
            <div>
              <p className="text-xs font-bold text-slate-900">
                Gestores não possuem banco de horas
              </p>
              <p className="text-xs text-slate-500">
                Seu perfil ({currentUser.role}) não possui marcação de ponto. Você participa
                normalmente do calendário de férias, dayoffs e atestados.
              </p>
            </div>
          </CardContent>
        </Card>
      )}

      {/* 2. Minhas Férias & Ausências */}
      <Card className="border-slate-200 shadow-sm">
        <CardHeader className="pb-3 border-b border-slate-100">
          <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-3">
            <div className="flex items-center gap-2.5">
              <div className="p-2 rounded-lg bg-amber-50 text-amber-600 border border-amber-100">
                <Palmtree className="h-5 w-5" />
              </div>
              <div>
                <CardTitle className="text-base font-bold text-slate-900">
                  Minhas Férias &amp; Ausências
                </CardTitle>
                <CardDescription className="text-xs">
                  Situação do seu ciclo aquisitivo legal, agendamentos confirmados e histórico.
                </CardDescription>
              </div>
            </div>

            {vacationStatus.isExpired ? (
              <Badge className="bg-rose-100 text-rose-900 border-rose-300 font-bold text-xs animate-pulse">
                🚨 Férias Vencidas
              </Badge>
            ) : vacationStatus.isExpiringSoon ? (
              <Badge className="bg-amber-100 text-amber-900 border-amber-300 font-semibold text-xs">
                ⚠️ Vence em {vacationStatus.daysUntilExpiry} dias
              </Badge>
            ) : vacationStatus.hasUpcomingVacation ? (
              <Badge className="bg-indigo-100 text-indigo-800 border-indigo-200 font-medium text-xs">
                Próximas Férias Agendadas
              </Badge>
            ) : null}
          </div>
        </CardHeader>
        <CardContent className="pt-4 space-y-4">
          <div className="grid grid-cols-1 sm:grid-cols-3 gap-3">
            <div className="p-3 rounded-lg border border-slate-200 bg-slate-50/50">
              <span className="text-xs text-slate-500 font-medium">Ciclo Aquisitivo</span>
              <p className="text-sm font-bold text-slate-900 mt-0.5">
                {vacationStatus.isAquisitivoCompleted ? '12 Meses Completos' : 'Em Andamento'}
              </p>
              <span className="text-[10px] text-slate-400">
                {vacationStatus.daysSinceHire} dias de casa
              </span>
            </div>

            <div className="p-3 rounded-lg border border-slate-200 bg-slate-50/50">
              <span className="text-xs text-slate-500 font-medium">Prazo Limite Concessivo</span>
              <p
                className={`text-sm font-bold mt-0.5 ${
                  vacationStatus.isExpired
                    ? 'text-rose-600'
                    : vacationStatus.isExpiringSoon
                      ? 'text-amber-600'
                      : 'text-slate-900'
                }`}
              >
                {vacationStatus.isExpired
                  ? 'Expirado'
                  : `${vacationStatus.daysUntilExpiry} dias restantes`}
              </p>
              <span className="text-[10px] text-slate-400">Limite de 24 meses CLT</span>
            </div>

            <div className="p-3 rounded-lg border border-slate-200 bg-slate-50/50">
              <span className="text-xs text-slate-500 font-medium">Período Ideal de Gozo</span>
              <p className="text-sm font-bold text-indigo-700 mt-0.5">
                {vacationStatus.isInIdealWindow ? '🎯 Janela Ideal Agora' : 'Planejado'}
              </p>
              <span className="text-[10px] text-slate-400">Entre 6 e 11 meses pós-ciclo</span>
            </div>
          </div>

          {/* Lista de Minhas Ausências */}
          <div className="pt-2">
            <div className="flex items-center justify-between mb-2">
              <h4 className="text-xs font-bold text-slate-700 uppercase tracking-wider flex items-center gap-1.5">
                <CalendarCheck2 className="h-3.5 w-3.5 text-slate-500" /> Minhas Solicitações e
                Histórico ({myAbsences.length})
              </h4>
              {onNewAbsence && (
                <Button
                  size="sm"
                  onClick={onNewAbsence}
                  className="h-7 text-xs bg-indigo-600 hover:bg-indigo-700 text-white gap-1 shadow-sm"
                >
                  <PlusCircle className="h-3.5 w-3.5" />
                  Solicitar Ausência / Férias
                </Button>
              )}
            </div>
            <div className="overflow-x-auto rounded border border-slate-200">
              <Table>
                <TableHeader>
                  <TableRow className="text-xs bg-slate-50">
                    <TableHead>Motivo</TableHead>
                    <TableHead>Período (Início a Fim)</TableHead>
                    <TableHead>Status da Solicitação</TableHead>
                    <TableHead>Observações / Resposta</TableHead>
                    <TableHead className="text-right">Ação</TableHead>
                  </TableRow>
                </TableHeader>
                <TableBody>
                  {myAbsences.map((abs) => {
                    const isPending = abs.status === 'Pendente'
                    const isApproved =
                      abs.status === 'Aprovada' ||
                      abs.status === 'agendada' ||
                      abs.status === 'ativa'
                    const isRejected = abs.status === 'Rejeitada'
                    const isCancelled = abs.status === 'Cancelada'
                    const startDate = abs?.start_date
                      ? new Date(abs.start_date.substring(0, 10) + 'T12:00:00Z')
                      : null
                    const endDate = abs?.end_date
                      ? new Date(abs.end_date.substring(0, 10) + 'T12:00:00Z')
                      : null

                    return (
                      <TableRow key={abs.id} className="text-xs">
                        <TableCell className="font-bold text-slate-900 whitespace-nowrap">
                          {abs.reason === 'Férias' && '🌴 Férias'}
                          {abs.reason === 'Banco de horas' && '⏱️ Banco de horas'}
                          {abs.reason === 'Dayoff' && '☕ Dayoff'}
                          {abs.reason === 'Atestado' && '🩺 Atestado'}
                          {!['Férias', 'Banco de horas', 'Dayoff', 'Atestado'].includes(
                            abs.reason || '',
                          ) &&
                            (abs.reason || 'Ausência')}
                        </TableCell>
                        <TableCell className="text-slate-700 whitespace-nowrap">
                          {startDate && !isNaN(startDate.getTime())
                            ? startDate.toLocaleDateString('pt-BR')
                            : '—'}{' '}
                          até{' '}
                          {endDate && !isNaN(endDate.getTime())
                            ? endDate.toLocaleDateString('pt-BR')
                            : '—'}
                        </TableCell>
                        <TableCell>
                          <Badge
                            className={`text-[10px] font-semibold whitespace-nowrap ${
                              isPending
                                ? 'bg-amber-100 text-amber-900 border-amber-300'
                                : isApproved
                                  ? 'bg-emerald-100 text-emerald-800 border-emerald-200'
                                  : isRejected
                                    ? 'bg-rose-100 text-rose-800 border-rose-200'
                                    : 'bg-slate-100 text-slate-700'
                            }`}
                          >
                            {isPending && '⏳ Pendente de aprovação'}
                            {isApproved && '✅ Aprovada'}
                            {isRejected && '❌ Rejeitada'}
                            {isCancelled && '🚫 Cancelada'}
                            {![
                              'Pendente',
                              'Aprovada',
                              'agendada',
                              'ativa',
                              'Rejeitada',
                              'Cancelada',
                            ].includes(abs.status || '') && abs.status}
                          </Badge>
                        </TableCell>
                        <TableCell className="text-slate-600 max-w-xs">
                          {abs.notes && <div>"{abs.notes}"</div>}
                          {abs.rejection_reason && (
                            <div className="text-[11px] text-rose-600 font-medium mt-0.5">
                              Motivo da rejeição: {abs.rejection_reason}
                            </div>
                          )}
                          {abs.approval_notes && (
                            <div className="text-[10px] text-slate-400 mt-0.5">
                              Nota do gestor: {abs.approval_notes}
                            </div>
                          )}
                          {!abs.notes && !abs.rejection_reason && !abs.approval_notes && (
                            <span className="text-slate-400">—</span>
                          )}
                        </TableCell>
                        <TableCell className="text-right whitespace-nowrap">
                          {isPending && (
                            <Button
                              variant="ghost"
                              size="sm"
                              onClick={() => handleCancelPending(abs.id)}
                              disabled={cancellingId === abs.id}
                              className="h-7 text-xs text-rose-600 hover:text-rose-700 hover:bg-rose-50"
                            >
                              <XCircle className="h-3.5 w-3.5 mr-1" />
                              Cancelar
                            </Button>
                          )}
                        </TableCell>
                      </TableRow>
                    )
                  })}
                  {myAbsences.length === 0 && (
                    <TableRow>
                      <TableCell colSpan={5} className="text-center text-xs text-slate-400 py-6">
                        Você não possui ausências registradas.
                      </TableCell>
                    </TableRow>
                  )}
                </TableBody>
              </Table>
            </div>
          </div>
        </CardContent>
      </Card>
    </div>
  )
}
