import { useState, useMemo } from 'react'
import { Link } from 'react-router-dom'
import { Card, CardHeader, CardTitle, CardContent } from '@/components/ui/card'
import { Badge } from '@/components/ui/badge'
import { Button } from '@/components/ui/button'
import { Avatar, AvatarFallback } from '@/components/ui/avatar'
import { Tooltip, TooltipContent, TooltipTrigger } from '@/components/ui/tooltip'
import {
  Users2,
  CalendarCheck2,
  UserX,
  Palmtree,
  Clock,
  Coffee,
  FileHeart,
  ArrowRight,
  Filter,
} from 'lucide-react'
import { UserRecord } from '@/types/service_record'
import { AbsenceRecord, AbsenceReason } from '@/types/banco-ferias'
import { getGMT3DateString } from '@/lib/timezone'

interface TeamAvailabilityTodayProps {
  users: UserRecord[]
  absences: AbsenceRecord[]
  currentUser?: UserRecord | null
  className?: string
}

export function TeamAvailabilityToday({
  users,
  absences,
  currentUser,
  className = '',
}: TeamAvailabilityTodayProps) {
  const [filterMode, setFilterMode] = useState<'all' | 'available' | 'absent'>('all')

  const todayStr = useMemo(() => {
    return getGMT3DateString(new Date().toISOString())
  }, [])

  // Mapeia ausências ativas hoje (apenas confirmadas/aprovadas contam para remover o colaborador da disponibilidade)
  const activeAbsencesToday = useMemo(() => {
    return absences.filter((a) => {
      if (
        a.status === 'Cancelada' ||
        a.status === 'cancelada' ||
        a.status === 'Rejeitada' ||
        a.status === 'Pendente'
      ) {
        return false
      }
      const start = a.start_date.substring(0, 10)
      const end = a.end_date.substring(0, 10)
      return todayStr >= start && todayStr <= end
    })
  }, [absences, todayStr])

  const absenceByUserId = useMemo(() => {
    const map = new Map<string, AbsenceRecord>()
    activeAbsencesToday.forEach((a) => {
      map.set(a.user_id, a)
    })
    return map
  }, [activeAbsencesToday])

  // Filtragem por escopo RBAC se líder/supervisor
  const filteredUsers = useMemo(() => {
    if (!currentUser) return users
    const isMaster = currentUser.role === 'Master' || currentUser.master_access === true
    const isGerente = currentUser.role === 'Gerente'
    if (isMaster || isGerente) return users

    // Líder/Supervisor: filtra pelo seu Núcleo (service_groups)
    const userGroups = (currentUser.service_groups as string[] | undefined) || []
    if (userGroups.length > 0) {
      return users.filter((u) => {
        if (u.id === currentUser.id) return true
        const uGroups = (u.service_groups as string[] | undefined) || []
        return uGroups.some((g) => userGroups.includes(g))
      })
    }
    return users
  }, [users, currentUser])

  // Status de cada membro da equipe
  const teamStatusList = useMemo(() => {
    return filteredUsers.map((u) => {
      const abs = absenceByUserId.get(u.id)
      const isAbsent = Boolean(abs)
      return {
        user: u,
        isAbsent,
        absenceReason: abs?.reason,
        absenceNotes: abs?.notes,
        absenceEnd: abs?.end_date?.substring(0, 10),
      }
    })
  }, [filteredUsers, absenceByUserId])

  const totalCount = teamStatusList.length
  const absentCount = teamStatusList.filter((m) => m.isAbsent).length
  const availableCount = totalCount - absentCount
  const availabilityRate = totalCount > 0 ? Math.round((availableCount / totalCount) * 100) : 100

  // Usuários para exibição conforme filtro
  const displayList = useMemo(() => {
    if (filterMode === 'available') return teamStatusList.filter((m) => !m.isAbsent)
    if (filterMode === 'absent') return teamStatusList.filter((m) => m.isAbsent)
    return teamStatusList
  }, [teamStatusList, filterMode])

  const getReasonBadge = (reason?: AbsenceReason) => {
    switch (reason) {
      case 'Férias':
        return (
          <Badge className="bg-amber-100 text-amber-800 border-amber-200 hover:bg-amber-100 text-[11px] gap-1 font-semibold">
            <Palmtree className="h-3 w-3 text-amber-600" /> Férias
          </Badge>
        )
      case 'Banco de horas':
        return (
          <Badge className="bg-blue-100 text-blue-800 border-blue-200 hover:bg-blue-100 text-[11px] gap-1 font-semibold">
            <Clock className="h-3 w-3 text-blue-600" /> Banco de horas
          </Badge>
        )
      case 'Dayoff':
        return (
          <Badge className="bg-purple-100 text-purple-800 border-purple-200 hover:bg-purple-100 text-[11px] gap-1 font-semibold">
            <Coffee className="h-3 w-3 text-purple-600" /> Dayoff
          </Badge>
        )
      case 'Atestado':
        return (
          <Badge className="bg-rose-100 text-rose-800 border-rose-200 hover:bg-rose-100 text-[11px] gap-1 font-semibold">
            <FileHeart className="h-3 w-3 text-rose-600" /> Atestado
          </Badge>
        )
      default:
        return (
          <Badge variant="outline" className="text-[11px]">
            Ausente
          </Badge>
        )
    }
  }

  const getInitials = (name?: string) => {
    if (!name) return '?'
    return name
      .split(' ')
      .map((n) => n[0])
      .slice(0, 2)
      .join('')
      .toUpperCase()
  }

  return (
    <Card className={`border-slate-200 shadow-sm ${className}`}>
      <CardHeader className="pb-3 border-b border-slate-100">
        <div className="flex flex-col sm:flex-row sm:items-center sm:justify-between gap-3">
          <div className="flex items-center gap-2.5">
            <div className="p-2 rounded-lg bg-indigo-50 text-indigo-600 border border-indigo-100">
              <CalendarCheck2 className="h-5 w-5" />
            </div>
            <div>
              <CardTitle className="text-base font-bold text-slate-900 flex items-center gap-2">
                Equipe Disponível Hoje
                <span className="text-xs font-normal text-slate-500">
                  (
                  {new Date().toLocaleDateString('pt-BR', {
                    weekday: 'long',
                    day: '2-digit',
                    month: 'short',
                  })}
                  )
                </span>
              </CardTitle>
              <p className="text-xs text-slate-500 mt-0.5">
                Visão em tempo real da equipe em atuação vs. colaboradores ausentes com
                justificativa.
              </p>
            </div>
          </div>

          <div className="flex items-center gap-2">
            <Button
              asChild
              variant="outline"
              size="sm"
              className="text-xs h-8 text-indigo-700 border-indigo-200 hover:bg-indigo-50"
            >
              <Link to="/banco-horas-ferias">
                Calendário &amp; Banco de Horas
                <ArrowRight className="h-3.5 w-3.5 ml-1" />
              </Link>
            </Button>
          </div>
        </div>
      </CardHeader>

      <CardContent className="pt-4 space-y-4">
        {/* Métricas do Dia */}
        <div className="grid grid-cols-3 gap-3">
          <div
            onClick={() => setFilterMode('available')}
            className={`p-3 rounded-lg border cursor-pointer transition-all ${
              filterMode === 'available'
                ? 'bg-emerald-50 border-emerald-300 ring-2 ring-emerald-400'
                : 'bg-emerald-50/50 border-emerald-100 hover:bg-emerald-50'
            }`}
          >
            <div className="flex items-center justify-between">
              <span className="text-xs font-medium text-emerald-800">Em Atuação</span>
              <span className="h-2 w-2 rounded-full bg-emerald-500 animate-pulse" />
            </div>
            <div className="mt-1 flex items-baseline gap-2">
              <span className="text-2xl font-bold text-emerald-950">{availableCount}</span>
              <span className="text-xs text-emerald-700">({availabilityRate}%)</span>
            </div>
          </div>

          <div
            onClick={() => setFilterMode('absent')}
            className={`p-3 rounded-lg border cursor-pointer transition-all ${
              filterMode === 'absent'
                ? 'bg-amber-50 border-amber-300 ring-2 ring-amber-400'
                : 'bg-amber-50/50 border-amber-100 hover:bg-amber-50'
            }`}
          >
            <div className="flex items-center justify-between">
              <span className="text-xs font-medium text-amber-800">Ausentes Hoje</span>
              <UserX className="h-3.5 w-3.5 text-amber-600" />
            </div>
            <div className="mt-1 flex items-baseline gap-2">
              <span className="text-2xl font-bold text-amber-950">{absentCount}</span>
              <span className="text-xs text-amber-700">colaborador(es)</span>
            </div>
          </div>

          <div
            onClick={() => setFilterMode('all')}
            className={`p-3 rounded-lg border cursor-pointer transition-all ${
              filterMode === 'all'
                ? 'bg-slate-100 border-slate-300 ring-2 ring-slate-400'
                : 'bg-slate-50 border-slate-200 hover:bg-slate-100/70'
            }`}
          >
            <div className="flex items-center justify-between">
              <span className="text-xs font-medium text-slate-700">Total Equipe</span>
              <Users2 className="h-3.5 w-3.5 text-slate-500" />
            </div>
            <div className="mt-1 flex items-baseline gap-2">
              <span className="text-2xl font-bold text-slate-900">{totalCount}</span>
              <span className="text-xs text-slate-500">membros</span>
            </div>
          </div>
        </div>

        {/* Lista de Colaboradores */}
        <div className="space-y-2">
          <div className="flex items-center justify-between text-xs text-slate-500 px-1">
            <span className="font-semibold text-slate-700 flex items-center gap-1.5">
              <Filter className="h-3 w-3" />
              Mostrando:{' '}
              {filterMode === 'all'
                ? 'Todos'
                : filterMode === 'available'
                  ? 'Disponíveis'
                  : 'Ausentes'}{' '}
              ({displayList.length})
            </span>
            {filterMode !== 'all' && (
              <button
                onClick={() => setFilterMode('all')}
                className="text-[11px] text-indigo-600 hover:underline"
              >
                Limpar filtro
              </button>
            )}
          </div>

          <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-3 gap-2.5 max-h-64 overflow-y-auto pr-1">
            {displayList.map((item) => (
              <div
                key={item.user.id}
                className={`p-2.5 rounded-lg border flex items-center justify-between gap-2 transition-colors ${
                  item.isAbsent
                    ? 'bg-amber-50/40 border-amber-200'
                    : 'bg-white border-slate-200 hover:border-slate-300'
                }`}
              >
                <div className="flex items-center gap-2.5 min-w-0">
                  <div className="relative">
                    <Avatar className="h-8 w-8 text-xs">
                      <AvatarFallback
                        className={
                          item.isAbsent
                            ? 'bg-amber-100 text-amber-800'
                            : 'bg-emerald-100 text-emerald-800'
                        }
                      >
                        {getInitials(item.user.name)}
                      </AvatarFallback>
                    </Avatar>
                    <span
                      className={`absolute bottom-0 right-0 h-2.5 w-2.5 rounded-full border-2 border-white ${
                        item.isAbsent ? 'bg-amber-500' : 'bg-emerald-500'
                      }`}
                      title={item.isAbsent ? 'Ausente' : 'Disponível'}
                    />
                  </div>
                  <div className="min-w-0">
                    <p className="text-xs font-semibold text-slate-900 truncate">
                      {item.user.name}
                    </p>
                    <div className="flex items-center gap-1.5 text-[10px] text-slate-500 truncate">
                      <span>{item.user.role}</span>
                      {Array.isArray(item.user.service_groups) &&
                        item.user.service_groups.length > 0 && (
                          <>
                            <span>•</span>
                            <span className="text-slate-600 font-medium">
                              {item.user.service_groups.join(', ')}
                            </span>
                          </>
                        )}
                    </div>
                  </div>
                </div>

                <div className="shrink-0 text-right">
                  {item.isAbsent ? (
                    <Tooltip delayDuration={200}>
                      <TooltipTrigger asChild>
                        <div className="cursor-help">{getReasonBadge(item.absenceReason)}</div>
                      </TooltipTrigger>
                      <TooltipContent side="top" className="text-xs max-w-xs">
                        <p className="font-bold">{item.absenceReason}</p>
                        {item.absenceNotes && (
                          <p className="text-slate-300 mt-0.5">{item.absenceNotes}</p>
                        )}
                        {item.absenceEnd && (
                          <p className="text-[10px] text-slate-400 mt-1">
                            Até:{' '}
                            {new Date(item.absenceEnd + 'T12:00:00Z').toLocaleDateString('pt-BR')}
                          </p>
                        )}
                      </TooltipContent>
                    </Tooltip>
                  ) : (
                    <span className="inline-flex items-center px-2 py-0.5 rounded text-[10px] font-semibold bg-emerald-50 text-emerald-700 border border-emerald-200">
                      Atuando
                    </span>
                  )}
                </div>
              </div>
            ))}

            {displayList.length === 0 && (
              <div className="col-span-full py-6 text-center text-xs text-slate-400">
                Nenhum colaborador encontrado para o filtro selecionado.
              </div>
            )}
          </div>
        </div>
      </CardContent>
    </Card>
  )
}
