import { useState, useMemo } from 'react'
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card'
import { Button } from '@/components/ui/button'
import { Badge } from '@/components/ui/badge'
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from '@/components/ui/select'
import { Dialog, DialogContent, DialogHeader, DialogTitle } from '@/components/ui/dialog'
import {
  ChevronLeft,
  ChevronRight,
  Palmtree,
  Clock,
  Coffee,
  FileHeart,
  Users,
  PlusCircle,
  Calendar as CalendarIcon,
  Filter,
} from 'lucide-react'
import { UserRecord } from '@/types/service_record'
import { AbsenceRecord, AbsenceReason } from '@/types/banco-ferias'
import { SERVICE_GROUP_OPTIONS } from '@/lib/service-groups'
import { isManagerRole } from '@/services/clt-validation'

interface AbsenceCalendarProps {
  users: UserRecord[]
  absences: AbsenceRecord[]
  currentUser?: UserRecord | null
  onNewAbsence?: (prefilledDate?: string) => void
  canManage?: boolean
}

const MONTH_NAMES = [
  'Janeiro',
  'Fevereiro',
  'Março',
  'Abril',
  'Maio',
  'Junho',
  'Julho',
  'Agosto',
  'Setembro',
  'Outubro',
  'Novembro',
  'Dezembro',
]

const WEEKDAY_NAMES = ['Dom', 'Seg', 'Ter', 'Qua', 'Qui', 'Sex', 'Sáb']

export function AbsenceCalendar({
  users,
  absences,
  currentUser,
  onNewAbsence,
  canManage = false,
}: AbsenceCalendarProps) {
  const [currentDate, setCurrentDate] = useState(() => new Date())
  const [selectedGroup, setSelectedGroup] = useState<string>('all')
  const [selectedReason, setSelectedReason] = useState<string>('all')
  const [selectedUser, setSelectedUser] = useState<string>('all')
  const [selectedDayDetails, setSelectedDayDetails] = useState<{
    dateStr: string
    dayLabel: string
    activeAbsences: { absence: AbsenceRecord; user: UserRecord }[]
    availableUsers: UserRecord[]
  } | null>(null)

  const currentYear = currentDate.getFullYear()
  const currentMonth = currentDate.getMonth()

  const handlePrevMonth = () => {
    setCurrentDate(new Date(currentYear, currentMonth - 1, 1))
  }

  const handleNextMonth = () => {
    setCurrentDate(new Date(currentYear, currentMonth + 1, 1))
  }

  const handleToday = () => {
    setCurrentDate(new Date())
  }

  // Mapa rápido de usuários
  const usersMap = useMemo(() => {
    const map = new Map<string, UserRecord>()
    users.forEach((u) => map.set(u.id, u))
    return map
  }, [users])

  // Filtragem de usuários elegíveis para o calendário
  const eligibleUsers = useMemo(() => {
    let list = users

    // Se consultor (não gestor), prioriza mostrar os membros do seu Núcleo
    if (currentUser && !isManagerRole(currentUser.role) && currentUser.role !== 'Master') {
      const userGroups = (currentUser.service_groups as string[] | undefined) || []
      if (userGroups.length > 0) {
        list = list.filter((u) => {
          if (u.id === currentUser.id) return true
          const uGroups = (u.service_groups as string[] | undefined) || []
          return uGroups.some((g) => userGroups.includes(g))
        })
      }
    }

    if (selectedGroup !== 'all') {
      list = list.filter((u) => {
        const uGroups = (u.service_groups as string[] | undefined) || []
        return uGroups.includes(selectedGroup)
      })
    }

    if (selectedUser !== 'all') {
      list = list.filter((u) => u.id === selectedUser)
    }

    return list
  }, [users, currentUser, selectedGroup, selectedUser])

  const eligibleUserIds = useMemo(() => {
    return new Set(eligibleUsers.map((u) => u.id))
  }, [eligibleUsers])

  // Ausências válidas e filtradas
  const filteredAbsences = useMemo(() => {
    return absences.filter((a) => {
      if (a.status === 'cancelada') return false
      if (!eligibleUserIds.has(a.user_id)) return false
      if (selectedReason !== 'all' && a.reason !== selectedReason) return false
      return true
    })
  }, [absences, eligibleUserIds, selectedReason])

  // Construção dos dias da grade mensal
  const calendarGrid = useMemo(() => {
    const firstDayOfMonth = new Date(currentYear, currentMonth, 1)
    const startingDayOfWeek = firstDayOfMonth.getDay() // 0 = Dom
    const daysInMonth = new Date(currentYear, currentMonth + 1, 0).getDate()
    const daysInPrevMonth = new Date(currentYear, currentMonth, 0).getDate()

    const days: {
      dayNumber: number
      dateStr: string
      isCurrentMonth: boolean
      isToday: boolean
      absencesOnDay: { absence: AbsenceRecord; user: UserRecord }[]
    }[] = []

    const todayIso = new Date().toISOString().substring(0, 10)

    // Dias do mês anterior para preencher a primeira linha
    for (let i = startingDayOfWeek - 1; i >= 0; i--) {
      const dNum = daysInPrevMonth - i
      const prevMonth = currentMonth === 0 ? 11 : currentMonth - 1
      const prevYear = currentMonth === 0 ? currentYear - 1 : currentYear
      const dateStr = `${prevYear}-${String(prevMonth + 1).padStart(2, '0')}-${String(dNum).padStart(2, '0')}`
      days.push({
        dayNumber: dNum,
        dateStr,
        isCurrentMonth: false,
        isToday: dateStr === todayIso,
        absencesOnDay: [],
      })
    }

    // Dias do mês corrente
    for (let d = 1; d <= daysInMonth; d++) {
      const dateStr = `${currentYear}-${String(currentMonth + 1).padStart(2, '0')}-${String(d).padStart(2, '0')}`

      // Encontra ausências neste dia
      const onDay: { absence: AbsenceRecord; user: UserRecord }[] = []
      filteredAbsences.forEach((a) => {
        const start = a.start_date.substring(0, 10)
        const end = a.end_date.substring(0, 10)
        if (dateStr >= start && dateStr <= end) {
          const u = usersMap.get(a.user_id)
          if (u) {
            onDay.push({ absence: a, user: u })
          }
        }
      })

      days.push({
        dayNumber: d,
        dateStr,
        isCurrentMonth: true,
        isToday: dateStr === todayIso,
        absencesOnDay: onDay,
      })
    }

    // Dias do próximo mês para completar 35 ou 42 células
    const remainingCells = (7 - (days.length % 7)) % 7
    for (let nextD = 1; nextD <= remainingCells; nextD++) {
      const nextMonth = currentMonth === 11 ? 0 : currentMonth + 1
      const nextYear = currentMonth === 11 ? currentYear + 1 : currentYear
      const dateStr = `${nextYear}-${String(nextMonth + 1).padStart(2, '0')}-${String(nextD).padStart(2, '0')}`
      days.push({
        dayNumber: nextD,
        dateStr,
        isCurrentMonth: false,
        isToday: dateStr === todayIso,
        absencesOnDay: [],
      })
    }

    return days
  }, [currentYear, currentMonth, filteredAbsences, usersMap])

  const getReasonColor = (reason: AbsenceReason) => {
    switch (reason) {
      case 'Férias':
        return 'bg-amber-100 text-amber-900 border-amber-300'
      case 'Banco de horas':
        return 'bg-blue-100 text-blue-900 border-blue-300'
      case 'Dayoff':
        return 'bg-purple-100 text-purple-900 border-purple-300'
      case 'Atestado':
        return 'bg-rose-100 text-rose-900 border-rose-300'
      default:
        return 'bg-slate-100 text-slate-800 border-slate-300'
    }
  }

  const getReasonIcon = (reason: AbsenceReason) => {
    switch (reason) {
      case 'Férias':
        return <Palmtree className="h-3 w-3 text-amber-600 shrink-0" />
      case 'Banco de horas':
        return <Clock className="h-3 w-3 text-blue-600 shrink-0" />
      case 'Dayoff':
        return <Coffee className="h-3 w-3 text-purple-600 shrink-0" />
      case 'Atestado':
        return <FileHeart className="h-3 w-3 text-rose-600 shrink-0" />
    }
  }

  const openDayDetails = (dayItem: (typeof calendarGrid)[0]) => {
    const absentIds = new Set(dayItem.absencesOnDay.map((a) => a.user.id))
    const available = eligibleUsers.filter((u) => !absentIds.has(u.id))
    const parts = dayItem.dateStr.split('-')
    const dayDate = new Date(Number(parts[0]), Number(parts[1]) - 1, Number(parts[2]))
    const label = dayDate.toLocaleDateString('pt-BR', {
      weekday: 'long',
      day: '2-digit',
      month: 'long',
      year: 'numeric',
    })

    setSelectedDayDetails({
      dateStr: dayItem.dateStr,
      dayLabel: label,
      activeAbsences: dayItem.absencesOnDay,
      availableUsers: available,
    })
  }

  return (
    <div className="space-y-4">
      {/* Controles de navegação e filtros */}
      <Card className="border-slate-200 shadow-sm">
        <CardContent className="pt-4 space-y-4">
          <div className="flex flex-col md:flex-row md:items-center justify-between gap-3">
            {/* Navegação de Mês */}
            <div className="flex items-center gap-2">
              <Button
                variant="outline"
                size="icon"
                onClick={handlePrevMonth}
                className="h-8 w-8"
                title="Mês anterior"
              >
                <ChevronLeft className="h-4 w-4" />
              </Button>
              <h3 className="text-base font-bold text-slate-900 min-w-44 text-center">
                {MONTH_NAMES[currentMonth]} de {currentYear}
              </h3>
              <Button
                variant="outline"
                size="icon"
                onClick={handleNextMonth}
                className="h-8 w-8"
                title="Próximo mês"
              >
                <ChevronRight className="h-4 w-4" />
              </Button>
              <Button variant="ghost" size="sm" onClick={handleToday} className="text-xs h-8">
                Hoje
              </Button>
            </div>

            {/* Ações e Filtros */}
            <div className="flex flex-wrap items-center gap-2">
              {/* Filtro Núcleo */}
              <div className="w-40">
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

              {/* Filtro Motivo */}
              <div className="w-40">
                <Select value={selectedReason} onValueChange={setSelectedReason}>
                  <SelectTrigger className="h-8 text-xs">
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

              {/* Filtro Colaborador */}
              <div className="w-48">
                <Select value={selectedUser} onValueChange={setSelectedUser}>
                  <SelectTrigger className="h-8 text-xs truncate">
                    <SelectValue placeholder="Colaborador" />
                  </SelectTrigger>
                  <SelectContent className="max-h-56">
                    <SelectItem value="all">Toda a equipe</SelectItem>
                    {users.map((u) => (
                      <SelectItem key={u.id} value={u.id}>
                        {u.name} {isManagerRole(u.role) ? `(${u.role})` : ''}
                      </SelectItem>
                    ))}
                  </SelectContent>
                </Select>
              </div>

              {canManage && onNewAbsence && (
                <Button
                  onClick={() => onNewAbsence()}
                  size="sm"
                  className="h-8 text-xs bg-indigo-600 hover:bg-indigo-700 text-white gap-1.5"
                >
                  <PlusCircle className="h-3.5 w-3.5" />
                  Agendar Ausência
                </Button>
              )}
            </div>
          </div>

          {/* Legenda de Motivos */}
          <div className="flex flex-wrap items-center gap-2 pt-2 border-t border-slate-100 text-xs">
            <span className="text-slate-500 font-medium mr-1 flex items-center gap-1">
              <Filter className="h-3 w-3" /> Legenda:
            </span>
            <Badge className="bg-amber-100 text-amber-900 border-amber-200 text-[11px] gap-1 font-medium">
              <Palmtree className="h-3 w-3 text-amber-600" /> Férias
            </Badge>
            <Badge className="bg-blue-100 text-blue-900 border-blue-200 text-[11px] gap-1 font-medium">
              <Clock className="h-3 w-3 text-blue-600" /> Banco de horas
            </Badge>
            <Badge className="bg-purple-100 text-purple-900 border-purple-200 text-[11px] gap-1 font-medium">
              <Coffee className="h-3 w-3 text-purple-600" /> Dayoff
            </Badge>
            <Badge className="bg-rose-100 text-rose-900 border-rose-200 text-[11px] gap-1 font-medium">
              <FileHeart className="h-3 w-3 text-rose-600" /> Atestado
            </Badge>
            <span className="text-[11px] text-slate-400 ml-auto">
              *Gestores e líderes estão inclusos no calendário
            </span>
          </div>
        </CardContent>
      </Card>

      {/* Grade Mensal do Calendário */}
      <Card className="border-slate-200 shadow-sm overflow-hidden">
        <div className="grid grid-cols-7 border-b border-slate-200 bg-slate-50/80 text-center text-xs font-semibold text-slate-700 py-2">
          {WEEKDAY_NAMES.map((w, idx) => (
            <div key={w} className={idx === 0 || idx === 6 ? 'text-slate-400' : ''}>
              {w}
            </div>
          ))}
        </div>

        <div className="grid grid-cols-7 auto-rows-fr divide-x divide-y divide-slate-200">
          {calendarGrid.map((dayItem, index) => {
            const hasAbsences = dayItem.absencesOnDay.length > 0
            return (
              <div
                key={`${dayItem.dateStr}-${index}`}
                onClick={() => dayItem.isCurrentMonth && openDayDetails(dayItem)}
                className={`min-h-24 p-1.5 transition-colors flex flex-col justify-between ${
                  !dayItem.isCurrentMonth
                    ? 'bg-slate-50/40 opacity-40 cursor-default'
                    : 'bg-white hover:bg-slate-50/70 cursor-pointer'
                } ${dayItem.isToday ? 'ring-2 ring-indigo-500 ring-inset bg-indigo-50/20' : ''}`}
              >
                <div className="flex items-center justify-between mb-1">
                  <span
                    className={`text-xs font-bold rounded-full h-5 w-5 flex items-center justify-center ${
                      dayItem.isToday
                        ? 'bg-indigo-600 text-white'
                        : dayItem.isCurrentMonth
                          ? 'text-slate-900'
                          : 'text-slate-400'
                    }`}
                  >
                    {dayItem.dayNumber}
                  </span>

                  {dayItem.isCurrentMonth && hasAbsences && (
                    <span className="text-[10px] font-semibold text-slate-500 bg-slate-100 px-1 rounded">
                      {dayItem.absencesOnDay.length} ausente(s)
                    </span>
                  )}
                </div>

                {/* Lista de pílulas de ausência no dia */}
                <div className="space-y-1 flex-1 overflow-hidden">
                  {dayItem.absencesOnDay.slice(0, 3).map((item) => {
                    const firstName = item.user.name.split(' ')[0]
                    const isMgr = isManagerRole(item.user.role)
                    return (
                      <div
                        key={item.absence.id}
                        className={`text-[10px] px-1.5 py-0.5 rounded border truncate flex items-center gap-1 font-medium ${getReasonColor(
                          item.absence.reason,
                        )}`}
                        title={`${item.user.name} (${item.user.role}) - ${item.absence.reason}`}
                      >
                        {getReasonIcon(item.absence.reason)}
                        <span className="truncate">{firstName}</span>
                        {isMgr && (
                          <span className="text-[9px] opacity-75 font-bold shrink-0">(Gestão)</span>
                        )}
                      </div>
                    )
                  })}

                  {dayItem.absencesOnDay.length > 3 && (
                    <div className="text-[9px] text-slate-500 font-semibold px-1">
                      +{dayItem.absencesOnDay.length - 3} outro(s)...
                    </div>
                  )}
                </div>
              </div>
            )
          })}
        </div>
      </Card>

      {/* Modal de Detalhes do Dia Selecionado */}
      <Dialog
        open={Boolean(selectedDayDetails)}
        onOpenChange={(open) => !open && setSelectedDayDetails(null)}
      >
        <DialogContent className="max-w-xl max-h-[85vh] overflow-y-auto">
          <DialogHeader>
            <DialogTitle className="text-base font-bold text-slate-900 flex items-center gap-2">
              <CalendarIcon className="h-4 w-4 text-indigo-600" />
              Equipe no Dia: {selectedDayDetails?.dayLabel}
            </DialogTitle>
          </DialogHeader>

          {selectedDayDetails && (
            <div className="space-y-4 pt-2">
              {/* Ausentes no Dia */}
              <div>
                <h4 className="text-xs font-bold uppercase tracking-wider text-amber-700 flex items-center gap-1.5 mb-2">
                  <Palmtree className="h-3.5 w-3.5" /> Colaboradores Ausentes (
                  {selectedDayDetails.activeAbsences.length})
                </h4>

                {selectedDayDetails.activeAbsences.length === 0 ? (
                  <p className="text-xs text-slate-400 py-2 bg-slate-50 rounded p-3 text-center">
                    Nenhuma ausência registrada para este dia. Toda a equipe está prevista em
                    atuação.
                  </p>
                ) : (
                  <div className="space-y-2">
                    {selectedDayDetails.activeAbsences.map(({ absence, user: absUser }) => (
                      <div
                        key={absence.id}
                        className="p-2.5 rounded-lg border border-slate-200 bg-slate-50 flex items-center justify-between gap-3 text-xs"
                      >
                        <div>
                          <div className="flex items-center gap-2">
                            <span className="font-bold text-slate-900">{absUser.name}</span>
                            <span className="text-[10px] text-slate-500">({absUser.role})</span>
                            {isManagerRole(absUser.role) && (
                              <Badge variant="outline" className="text-[9px] bg-slate-100">
                                Gestor
                              </Badge>
                            )}
                          </div>
                          {Array.isArray(absUser.service_groups) &&
                            absUser.service_groups.length > 0 && (
                              <p className="text-[10px] text-slate-500 mt-0.5">
                                Núcleo: {absUser.service_groups.join(', ')}
                              </p>
                            )}
                          {absence.notes && (
                            <p className="text-[11px] text-slate-600 italic mt-1">
                              "{absence.notes}"
                            </p>
                          )}
                        </div>
                        <div className="shrink-0 text-right">
                          <Badge
                            className={`${getReasonColor(absence.reason)} font-bold text-[11px]`}
                          >
                            {absence.reason}
                          </Badge>
                          <p className="text-[10px] text-slate-400 mt-1">
                            {new Date(
                              absence.start_date.substring(0, 10) + 'T12:00:00Z',
                            ).toLocaleDateString('pt-BR')}{' '}
                            até{' '}
                            {new Date(
                              absence.end_date.substring(0, 10) + 'T12:00:00Z',
                            ).toLocaleDateString('pt-BR')}
                          </p>
                        </div>
                      </div>
                    ))}
                  </div>
                )}
              </div>

              {/* Atuando no Dia */}
              <div>
                <h4 className="text-xs font-bold uppercase tracking-wider text-emerald-700 flex items-center gap-1.5 mb-2">
                  <Users className="h-3.5 w-3.5" /> Equipe Atuando no Dia (
                  {selectedDayDetails.availableUsers.length})
                </h4>
                <div className="grid grid-cols-2 gap-2 max-h-48 overflow-y-auto">
                  {selectedDayDetails.availableUsers.map((u) => (
                    <div
                      key={u.id}
                      className="p-2 rounded border border-slate-200 bg-white flex items-center justify-between text-xs"
                    >
                      <div className="truncate">
                        <span className="font-semibold text-slate-900 truncate block">
                          {u.name}
                        </span>
                        <span className="text-[10px] text-slate-500 truncate block">{u.role}</span>
                      </div>
                      <span className="h-2 w-2 rounded-full bg-emerald-500 shrink-0" />
                    </div>
                  ))}
                </div>
              </div>

              {canManage && onNewAbsence && (
                <div className="pt-2 border-t border-slate-200 flex justify-end">
                  <Button
                    onClick={() => {
                      const d = selectedDayDetails.dateStr
                      setSelectedDayDetails(null)
                      onNewAbsence(d)
                    }}
                    size="sm"
                    className="text-xs bg-indigo-600 hover:bg-indigo-700"
                  >
                    <PlusCircle className="h-3.5 w-3.5 mr-1.5" />
                    Agendar Ausência nesta Data
                  </Button>
                </div>
              )}
            </div>
          )}
        </DialogContent>
      </Dialog>
    </div>
  )
}
