import { useState, useMemo } from 'react'
import { Card, CardContent, CardHeader, CardTitle, CardDescription } from '@/components/ui/card'
import { Button } from '@/components/ui/button'
import { Badge } from '@/components/ui/badge'
import { Input } from '@/components/ui/input'
import {
  Table,
  TableHeader,
  TableBody,
  TableRow,
  TableHead,
  TableCell,
} from '@/components/ui/table'
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from '@/components/ui/select'
import {
  Clock,
  PlusCircle,
  AlertTriangle,
  Palmtree,
  Scale,
  CalendarCheck2,
  Trash2,
  Filter,
  Users,
} from 'lucide-react'
import { UserRecord, ServiceRecord } from '@/types/service_record'
import { HourBankEntryRecord, AbsenceRecord, AbsenceAlertConfigRecord } from '@/types/banco-ferias'
import {
  isManagerRole,
  checkInterjornadaViolations,
  checkConsecutiveWorkDaysViolations,
  evaluateVacationStatus,
} from '@/services/clt-validation'
import { deleteHourBankEntry, deleteAbsence } from '@/services/banco-ferias'
import { SERVICE_GROUP_OPTIONS } from '@/lib/service-groups'
import { toast } from '@/hooks/use-toast'

const DEPARTMENT_FILTER_OPTIONS = [
  { value: 'all', label: 'Todas as Equipes (INTER e NAC)' },
  { value: 'Internacional', label: 'Internacional (INTER)' },
  { value: 'Nacional', label: 'Nacional (NAC)' },
]

interface TeamManagementViewProps {
  users: UserRecord[]
  entries: HourBankEntryRecord[]
  absences: AbsenceRecord[]
  serviceRecords: ServiceRecord[]
  config: AbsenceAlertConfigRecord
  canManage: boolean
  onNewHourBank: (userId?: string) => void
  onNewAbsence: (userId?: string) => void
  onRefresh: () => void
}

export function TeamManagementView({
  users,
  entries,
  absences,
  serviceRecords,
  config,
  canManage,
  onNewHourBank,
  onNewAbsence,
  onRefresh,
}: TeamManagementViewProps) {
  const [subTab, setSubTab] = useState<'hours' | 'vacations' | 'labor'>('hours')
  const [selectedGroup, setSelectedGroup] = useState<string>('all')
  const [selectedDept, setSelectedDept] = useState<string>('all')
  const [searchName, setSearchName] = useState<string>('')

  // Filtragem de colaboradores da equipe
  const filteredUsers = useMemo(() => {
    return users.filter((u) => {
      if (selectedGroup !== 'all') {
        const uGroups = (u.service_groups as string[] | undefined) || []
        if (!uGroups.includes(selectedGroup)) return false
      }
      if (selectedDept !== 'all') {
        const uDepts = (u.departments as string[] | undefined) || []
        if (!uDepts.includes(selectedDept)) return false
      }
      if (searchName) {
        if (!u.name.toLowerCase().includes(searchName.toLowerCase())) return false
      }
      return true
    })
  }, [users, selectedGroup, selectedDept, searchName])

  // Usuários elegíveis para banco de horas (NÃO gestores)
  const hourBankUsers = useMemo(() => {
    return filteredUsers.filter((u) => !isManagerRole(u.role))
  }, [filteredUsers])

  // Usuários para verificação de CLT restritos à equipe sob visualização
  const filteredUsersMap = useMemo(() => {
    return new Set(filteredUsers.map((u) => u.id))
  }, [filteredUsers])

  const scopedServiceRecords = useMemo(() => {
    return serviceRecords.filter(
      (r) =>
        (r.user_id && filteredUsersMap.has(r.user_id)) ||
        (r.assigned_user && filteredUsersMap.has(r.assigned_user)),
    )
  }, [serviceRecords, filteredUsersMap])

  // Resumo de saldos por colaborador
  const hourBankSummaries = useMemo(() => {
    const limit = config.hour_bank_limit_hours || 10
    const negLimit = config.hour_bank_negative_limit_hours || 10

    return hourBankUsers.map((user) => {
      const userEntries = entries.filter((e) => e.user_id === user.id)
      let credited = 0
      let debited = 0
      userEntries.forEach((e) => {
        if (e.type === 'credito') credited += e.hours
        else debited += e.hours
      })
      const balance = credited - debited

      return {
        user,
        credited,
        debited,
        balance,
        entriesCount: userEntries.length,
        exceedsLimit: balance >= limit,
        exceedsNegativeLimit: balance <= -negLimit,
      }
    })
  }, [hourBankUsers, entries, config])

  // Férias e períodos aquisitivos de cada colaborador
  const vacationStatuses = useMemo(() => {
    return filteredUsers.map((user) => {
      const userAbs = absences.filter((a) => a.user_id === user.id)
      const status = evaluateVacationStatus(user, userAbs, {
        warningDaysBeforeExpiry: config.vacation_warning_days_before_expiry,
        idealWindowStartMonths: config.vacation_ideal_window_start_months,
        idealWindowEndMonths: config.vacation_ideal_window_end_months,
      })
      return { user, status }
    })
  }, [filteredUsers, absences, config])

  // Violações trabalhistas CLT apuradas
  const interjornadaAlerts = useMemo(() => {
    return checkInterjornadaViolations(
      scopedServiceRecords,
      filteredUsers,
      config.min_interjornada_hours || 11,
    )
  }, [scopedServiceRecords, filteredUsers, config])

  const dsrAlerts = useMemo(() => {
    return checkConsecutiveWorkDaysViolations(
      scopedServiceRecords,
      filteredUsers,
      config.max_consecutive_work_days || 7,
    )
  }, [scopedServiceRecords, filteredUsers, config])

  const handleDeleteEntry = async (id: string) => {
    if (!confirm('Deseja realmente remover este lançamento de banco de horas?')) return
    try {
      await deleteHourBankEntry(id)
      toast({ title: 'Lançamento removido com sucesso' })
      onRefresh()
    } catch (err: any) {
      toast({ variant: 'destructive', title: 'Erro ao remover', description: err?.message })
    }
  }

  const handleDeleteAbsence = async (id: string) => {
    if (!confirm('Deseja realmente cancelar/remover esta ausência agendada?')) return
    try {
      await deleteAbsence(id)
      toast({ title: 'Ausência cancelada com sucesso' })
      onRefresh()
    } catch (err: any) {
      toast({ variant: 'destructive', title: 'Erro ao remover', description: err?.message })
    }
  }

  return (
    <div className="space-y-4 min-w-0 w-full">
      {/* Filtros da Equipe */}
      <Card className="border-slate-200 shadow-sm">
        <CardContent className="pt-4">
          <div className="flex flex-col sm:flex-row items-center justify-between gap-3">
            <div className="flex items-center gap-2 w-full sm:w-auto">
              <div className="w-full sm:w-48">
                <Input
                  placeholder="Buscar colaborador..."
                  value={searchName}
                  onChange={(e) => setSearchName(e.target.value)}
                  className="h-8 text-xs"
                />
              </div>

              <div className="w-full sm:w-36">
                <Select value={selectedGroup} onValueChange={setSelectedGroup}>
                  <SelectTrigger className="h-8 text-xs">
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

              <div className="w-full sm:w-44">
                <Select value={selectedDept} onValueChange={setSelectedDept}>
                  <SelectTrigger className="h-8 text-xs">
                    <SelectValue placeholder="Equipe (INTER / NAC)" />
                  </SelectTrigger>
                  <SelectContent>
                    {DEPARTMENT_FILTER_OPTIONS.map((d) => (
                      <SelectItem key={d.value} value={d.value}>
                        {d.label}
                      </SelectItem>
                    ))}
                  </SelectContent>
                </Select>
              </div>
            </div>

            <div className="flex items-center gap-2">
              <Button
                variant={subTab === 'hours' ? 'default' : 'outline'}
                size="sm"
                onClick={() => setSubTab('hours')}
                className={`text-xs h-8 ${subTab === 'hours' ? 'bg-indigo-600' : ''}`}
              >
                <Clock className="h-3.5 w-3.5 mr-1" />
                Banco de Horas ({hourBankSummaries.length})
              </Button>
              <Button
                variant={subTab === 'vacations' ? 'default' : 'outline'}
                size="sm"
                onClick={() => setSubTab('vacations')}
                className={`text-xs h-8 ${subTab === 'vacations' ? 'bg-indigo-600' : ''}`}
              >
                <Palmtree className="h-3.5 w-3.5 mr-1" />
                Férias &amp; Ausências
              </Button>
              <Button
                variant={subTab === 'labor' ? 'default' : 'outline'}
                size="sm"
                onClick={() => setSubTab('labor')}
                className={`text-xs h-8 ${subTab === 'labor' ? 'bg-indigo-600' : ''}`}
              >
                <Scale className="h-3.5 w-3.5 mr-1" />
                Regras CLT ({interjornadaAlerts.length + dsrAlerts.length})
              </Button>
            </div>
          </div>
        </CardContent>
      </Card>

      {/* Sub-Aba 1: Banco de Horas da Equipe */}
      {subTab === 'hours' && (
        <Card className="border-slate-200 shadow-sm">
          <CardHeader className="pb-3 border-b border-slate-100 flex flex-row items-center justify-between">
            <div>
              <CardTitle className="text-sm font-bold text-slate-900 flex items-center gap-2">
                <Clock className="h-4 w-4 text-blue-600" />
                Gestão de Banco de Horas da Equipe
              </CardTitle>
              <CardDescription className="text-xs">
                Saldos acumulados de cada consultor. Cargos de gestão não marcam ponto nem possuem
                banco de horas.
              </CardDescription>
            </div>
            {canManage && (
              <Button
                size="sm"
                onClick={() => onNewHourBank()}
                className="text-xs h-8 bg-indigo-600 hover:bg-indigo-700"
              >
                <PlusCircle className="h-3.5 w-3.5 mr-1.5" />
                Novo Lançamento
              </Button>
            )}
          </CardHeader>
          <CardContent className="pt-2 p-0">
            <div className="overflow-x-auto">
              <Table>
                <TableHeader>
                  <TableRow className="text-xs bg-slate-50">
                    <TableHead>Colaborador</TableHead>
                    <TableHead>Núcleo / Equipe</TableHead>
                    <TableHead className="text-right">Créditos</TableHead>
                    <TableHead className="text-right">Débitos</TableHead>
                    <TableHead className="text-right">Saldo Atual</TableHead>
                    <TableHead>Status / Alertas</TableHead>
                    {canManage && <TableHead className="text-right">Ações</TableHead>}
                  </TableRow>
                </TableHeader>
                <TableBody>
                  {hourBankSummaries.map((item) => (
                    <TableRow key={item.user.id} className="text-xs">
                      <TableCell className="font-semibold text-slate-900">
                        {item.user.name}
                        <span className="block text-[10px] text-slate-400 font-normal">
                          {item.user.email}
                        </span>
                      </TableCell>
                      <TableCell>
                        <div className="space-y-0.5">
                          <span className="font-medium text-slate-700 block">
                            {Array.isArray(item.user.service_groups) &&
                            item.user.service_groups.length > 0
                              ? item.user.service_groups.join(', ')
                              : 'Geral'}
                          </span>
                          {Array.isArray(item.user.departments) &&
                            item.user.departments.length > 0 && (
                              <div className="flex flex-wrap gap-1">
                                {item.user.departments.map((d) => (
                                  <Badge
                                    key={d}
                                    variant="outline"
                                    className={`text-[9px] px-1 py-0 font-medium ${
                                      d === 'Internacional'
                                        ? 'bg-sky-50 text-sky-700 border-sky-200'
                                        : 'bg-emerald-50 text-emerald-700 border-emerald-200'
                                    }`}
                                  >
                                    {d === 'Internacional' ? 'INTER' : 'NAC'}
                                  </Badge>
                                ))}
                              </div>
                            )}
                        </div>
                      </TableCell>
                      <TableCell className="text-right text-emerald-600 font-medium">
                        +{item.credited}h
                      </TableCell>
                      <TableCell className="text-right text-rose-600 font-medium">
                        -{item.debited}h
                      </TableCell>
                      <TableCell className="text-right font-bold">
                        <span
                          className={`px-2 py-0.5 rounded ${
                            item.balance > 0
                              ? 'bg-blue-50 text-blue-700'
                              : item.balance < 0
                                ? 'bg-rose-50 text-rose-700'
                                : 'bg-slate-100 text-slate-600'
                          }`}
                        >
                          {item.balance > 0 ? `+${item.balance}` : item.balance}h
                        </span>
                      </TableCell>
                      <TableCell>
                        {item.exceedsLimit ? (
                          <Badge className="bg-amber-100 text-amber-900 border-amber-300 text-[10px] font-semibold gap-1">
                            <AlertTriangle className="h-3 w-3 text-amber-600" />
                            Acúmulo ≥ {config.hour_bank_limit_hours}h
                          </Badge>
                        ) : item.exceedsNegativeLimit ? (
                          <Badge className="bg-rose-100 text-rose-900 border-rose-300 text-[10px] font-semibold gap-1">
                            <AlertTriangle className="h-3 w-3 text-rose-600" />
                            Devedor ≤ -{config.hour_bank_negative_limit_hours}h
                          </Badge>
                        ) : (
                          <Badge variant="outline" className="text-[10px] text-slate-600">
                            Regular
                          </Badge>
                        )}
                      </TableCell>
                      {canManage && (
                        <TableCell className="text-right">
                          <Button
                            variant="ghost"
                            size="sm"
                            onClick={() => onNewHourBank(item.user.id)}
                            className="text-xs h-7 text-indigo-600 hover:text-indigo-800"
                          >
                            + Lançar
                          </Button>
                        </TableCell>
                      )}
                    </TableRow>
                  ))}

                  {hourBankSummaries.length === 0 && (
                    <TableRow>
                      <TableCell colSpan={7} className="text-center text-xs text-slate-400 py-6">
                        Nenhum colaborador encontrado para o filtro aplicado.
                      </TableCell>
                    </TableRow>
                  )}
                </TableBody>
              </Table>
            </div>
          </CardContent>
        </Card>
      )}

      {/* Sub-Aba 2: Férias da Equipe */}
      {subTab === 'vacations' && (
        <Card className="border-slate-200 shadow-sm">
          <CardHeader className="pb-3 border-b border-slate-100 flex flex-row items-center justify-between">
            <div>
              <CardTitle className="text-sm font-bold text-slate-900 flex items-center gap-2">
                <Palmtree className="h-4 w-4 text-amber-600" />
                Acompanhamento de Ciclos Aquisitivos &amp; Férias
              </CardTitle>
              <CardDescription className="text-xs">
                Controle de prazos concessivos (evitar dobra legal da CLT) e janela ideal de gozo.
              </CardDescription>
            </div>
            {canManage && (
              <Button
                size="sm"
                onClick={() => onNewAbsence()}
                className="text-xs h-8 bg-indigo-600 hover:bg-indigo-700"
              >
                <PlusCircle className="h-3.5 w-3.5 mr-1.5" />
                Agendar Ausência
              </Button>
            )}
          </CardHeader>
          <CardContent className="pt-2 p-0">
            <div className="overflow-x-auto">
              <Table>
                <TableHeader>
                  <TableRow className="text-xs bg-slate-50">
                    <TableHead>Colaborador</TableHead>
                    <TableHead>Cargo / Núcleo / Equipe</TableHead>
                    <TableHead>Tempo de Empresa</TableHead>
                    <TableHead>Ciclo Aquisitivo</TableHead>
                    <TableHead>Prazo Concessivo</TableHead>
                    <TableHead>Próximas Férias</TableHead>
                    {canManage && <TableHead className="text-right">Ação</TableHead>}
                  </TableRow>
                </TableHeader>
                <TableBody>
                  {vacationStatuses.map(({ user, status }) => (
                    <TableRow key={user.id} className="text-xs">
                      <TableCell className="font-semibold text-slate-900">
                        {user.name}
                        {isManagerRole(user.role) && (
                          <span className="ml-1 text-[9px] bg-slate-100 px-1 rounded text-slate-500">
                            Gestor
                          </span>
                        )}
                      </TableCell>
                      <TableCell>
                        <span className="text-slate-700">{user.role}</span>
                        {Array.isArray(user.service_groups) && user.service_groups.length > 0 && (
                          <span className="block text-[10px] text-slate-500 font-medium">
                            Núcleo: {user.service_groups.join(', ')}
                          </span>
                        )}
                        {Array.isArray(user.departments) && user.departments.length > 0 && (
                          <div className="flex flex-wrap gap-1 mt-0.5">
                            {user.departments.map((d) => (
                              <Badge
                                key={d}
                                variant="outline"
                                className={`text-[9px] px-1 py-0 ${
                                  d === 'Internacional'
                                    ? 'bg-sky-50 text-sky-700 border-sky-200'
                                    : 'bg-emerald-50 text-emerald-700 border-emerald-200'
                                }`}
                              >
                                {d === 'Internacional' ? 'INTER' : 'NAC'}
                              </Badge>
                            ))}
                          </div>
                        )}
                      </TableCell>
                      <TableCell className="text-slate-600">
                        {Math.floor(status.daysSinceHire / 30)} meses ({status.daysSinceHire} dias)
                      </TableCell>
                      <TableCell>
                        {status.isAquisitivoCompleted ? (
                          <Badge className="bg-emerald-100 text-emerald-800 border-emerald-200 text-[10px]">
                            Completo (12m+)
                          </Badge>
                        ) : (
                          <Badge variant="outline" className="text-[10px] text-slate-500">
                            Em curso
                          </Badge>
                        )}
                      </TableCell>
                      <TableCell>
                        {status.isExpired ? (
                          <Badge className="bg-rose-100 text-rose-900 border-rose-300 text-[10px] font-bold animate-pulse">
                            🚨 Vencidas (Risco de Dobra)
                          </Badge>
                        ) : status.isExpiringSoon ? (
                          <Badge className="bg-amber-100 text-amber-900 border-amber-300 text-[10px] font-semibold">
                            ⚠️ Vence em {status.daysUntilExpiry}d
                          </Badge>
                        ) : (
                          <span className="text-slate-600 font-medium">
                            {status.daysUntilExpiry} dias restantes
                          </span>
                        )}
                      </TableCell>
                      <TableCell>
                        {status.hasUpcomingVacation ? (
                          <div className="flex items-center gap-1.5 text-indigo-700 font-medium">
                            <CalendarCheck2 className="h-3.5 w-3.5 shrink-0" />
                            <span>
                              {new Date(
                                status.upcomingVacation!.start_date.substring(0, 10) + 'T12:00:00Z',
                              ).toLocaleDateString('pt-BR')}{' '}
                              a{' '}
                              {new Date(
                                status.upcomingVacation!.end_date.substring(0, 10) + 'T12:00:00Z',
                              ).toLocaleDateString('pt-BR')}
                            </span>
                          </div>
                        ) : (
                          <span className="text-slate-400 italic">Não agendadas</span>
                        )}
                      </TableCell>
                      {canManage && (
                        <TableCell className="text-right">
                          <Button
                            variant="ghost"
                            size="sm"
                            onClick={() => onNewAbsence(user.id)}
                            className="text-xs h-7 text-indigo-600 hover:text-indigo-800"
                          >
                            Agendar
                          </Button>
                        </TableCell>
                      )}
                    </TableRow>
                  ))}
                </TableBody>
              </Table>
            </div>
          </CardContent>
        </Card>
      )}

      {/* Sub-Aba 3: Validações Trabalhistas CLT (Interjornada & DSR) */}
      {subTab === 'labor' && (
        <div className="space-y-4">
          {/* Card Interjornada */}
          <Card className="border-slate-200 shadow-sm">
            <CardHeader className="pb-3 border-b border-slate-100">
              <div className="flex items-center justify-between">
                <div>
                  <CardTitle className="text-sm font-bold text-slate-900 flex items-center gap-2">
                    <Scale className="h-4 w-4 text-amber-600" />
                    Validação de Interjornada (Intervalo Mínimo de 11h — CLT Art. 66)
                  </CardTitle>
                  <CardDescription className="text-xs">
                    Identifica jornadas consecutivas em que o descanso foi inferior a{' '}
                    {config.min_interjornada_hours || 11}h entre o encerramento de um dia e o início
                    do próximo.
                  </CardDescription>
                </div>
                <Badge
                  className={
                    interjornadaAlerts.length > 0
                      ? 'bg-amber-100 text-amber-900 border-amber-300 text-xs'
                      : 'bg-emerald-100 text-emerald-800 text-xs'
                  }
                >
                  {interjornadaAlerts.length} apontamento(s)
                </Badge>
              </div>
            </CardHeader>
            <CardContent className="pt-2 p-0">
              <div className="overflow-x-auto">
                <Table>
                  <TableHeader>
                    <TableRow className="text-xs bg-slate-50">
                      <TableHead>Colaborador</TableHead>
                      <TableHead>Dia Anterior (Fim)</TableHead>
                      <TableHead>Dia Seguinte (Início)</TableHead>
                      <TableHead className="text-right">Descanso Observado</TableHead>
                      <TableHead>Piso Legal</TableHead>
                      <TableHead>Status</TableHead>
                    </TableRow>
                  </TableHeader>
                  <TableBody>
                    {interjornadaAlerts.map((al, idx) => (
                      <TableRow key={`ij-${idx}`} className="text-xs">
                        <TableCell className="font-semibold text-slate-900">
                          {al.userName}
                        </TableCell>
                        <TableCell className="text-slate-600">
                          {al.previousDate} (
                          {new Date(al.previousEndTime).toLocaleTimeString('pt-BR', {
                            hour: '2-digit',
                            minute: '2-digit',
                          })}
                          )
                        </TableCell>
                        <TableCell className="text-slate-600">
                          {al.nextDate} (
                          {new Date(al.nextStartTime).toLocaleTimeString('pt-BR', {
                            hour: '2-digit',
                            minute: '2-digit',
                          })}
                          )
                        </TableCell>
                        <TableCell className="text-right font-bold text-amber-700">
                          {al.restHours}h
                        </TableCell>
                        <TableCell className="text-slate-500 font-medium">
                          {al.minRequiredHours}h
                        </TableCell>
                        <TableCell>
                          <Badge className="bg-amber-100 text-amber-900 border-amber-300 text-[10px]">
                            ⚠️ Descanso Insuficiente
                          </Badge>
                        </TableCell>
                      </TableRow>
                    ))}

                    {interjornadaAlerts.length === 0 && (
                      <TableRow>
                        <TableCell
                          colSpan={6}
                          className="text-center text-xs text-emerald-700 py-6"
                        >
                          Nenhuma violação de interjornada detectada nos registros recentes. Equipe
                          em conformidade legal.
                        </TableCell>
                      </TableRow>
                    )}
                  </TableBody>
                </Table>
              </div>
            </CardContent>
          </Card>

          {/* Card DSR 7 dias sem descanso */}
          <Card className="border-slate-200 shadow-sm">
            <CardHeader className="pb-3 border-b border-slate-100">
              <div className="flex items-center justify-between">
                <div>
                  <CardTitle className="text-sm font-bold text-slate-900 flex items-center gap-2">
                    <Scale className="h-4 w-4 text-rose-600" />
                    Validação de DSR (Trabalho 7 Dias Consecutivos sem Folga — CLT Art. 67)
                  </CardTitle>
                  <CardDescription className="text-xs">
                    Alerta quando um colaborador atuou em {config.max_consecutive_work_days || 7} ou
                    mais dias consecutivos sem intervalo semanal de folga.
                  </CardDescription>
                </div>
                <Badge
                  className={
                    dsrAlerts.length > 0
                      ? 'bg-rose-100 text-rose-900 border-rose-300 text-xs'
                      : 'bg-emerald-100 text-emerald-800 text-xs'
                  }
                >
                  {dsrAlerts.length} apontamento(s)
                </Badge>
              </div>
            </CardHeader>
            <CardContent className="pt-2 p-0">
              <div className="overflow-x-auto">
                <Table>
                  <TableHeader>
                    <TableRow className="text-xs bg-slate-50">
                      <TableHead>Colaborador</TableHead>
                      <TableHead>Dias Consecutivos Trabalhados</TableHead>
                      <TableHead>Período Observado</TableHead>
                      <TableHead>Limite CLT</TableHead>
                      <TableHead>Status</TableHead>
                    </TableRow>
                  </TableHeader>
                  <TableBody>
                    {dsrAlerts.map((dsr, idx) => (
                      <TableRow key={`dsr-${idx}`} className="text-xs">
                        <TableCell className="font-semibold text-slate-900">
                          {dsr.userName}
                        </TableCell>
                        <TableCell className="font-bold text-rose-700">
                          {dsr.consecutiveDaysCount} dias seguidos
                        </TableCell>
                        <TableCell className="text-slate-600">
                          {dsr.startDate} até {dsr.endDate}
                        </TableCell>
                        <TableCell className="text-slate-500 font-medium">
                          Máx. {dsr.maxAllowed - 1} dias
                        </TableCell>
                        <TableCell>
                          <Badge className="bg-rose-100 text-rose-900 border-rose-300 text-[10px] font-bold">
                            🚨 Ausência de DSR Semanal
                          </Badge>
                        </TableCell>
                      </TableRow>
                    ))}

                    {dsrAlerts.length === 0 && (
                      <TableRow>
                        <TableCell
                          colSpan={5}
                          className="text-center text-xs text-emerald-700 py-6"
                        >
                          Nenhum colaborador com 7 ou mais dias consecutivos sem descanso detectado.
                          Escalas em dia.
                        </TableCell>
                      </TableRow>
                    )}
                  </TableBody>
                </Table>
              </div>
            </CardContent>
          </Card>
        </div>
      )}
    </div>
  )
}
