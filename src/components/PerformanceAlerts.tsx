import { useMemo, useEffect, useState } from 'react'
import { Card, CardContent } from '@/components/ui/card'
import { Badge } from '@/components/ui/badge'
import {
  AlertTriangle,
  CheckCircle2,
  ArrowRight,
  Clock,
  Zap,
  TrendingDown,
  Briefcase,
  Users2,
  ExternalLink,
} from 'lucide-react'
import { Link } from 'react-router-dom'
import { getUsers } from '@/services/users'
import { getUserTargets, type UserTargetRecord } from '@/services/user-targets'
import { getGlobalTarget } from '@/services/global-targets'
import type { UserRecord, GlobalTargetRecord, ServiceRecord } from '@/types/service_record'
import { computePerformanceAlerts, canManageTargets, type PerformanceAlert } from '@/lib/metas'
import { getRoleLabel } from '@/lib/role-labels'
import { computeRecordAging } from '@/components/ActiveBacklogQueue'
import { ACTION_ALERT_THRESHOLDS, type ActionAlertItem } from '@/constants/actionAlerts'

interface PerformanceAlertsProps {
  records: ServiceRecord[]
}

/**
 * Normaliza o cargo para agrupamento visual limpo
 */
function normalizeRoleCategory(role?: string): string {
  if (!role) return 'Outros'
  const trimmed = role.trim()
  if (['Consultor', 'Consultores'].includes(trimmed)) return 'Consultor'
  if (['Supervisor', 'Supervisores'].includes(trimmed)) return 'Supervisor'
  if (['Líder', 'Líderes'].includes(trimmed)) return 'Líder'
  if (['Gerente', 'Gerentes'].includes(trimmed)) return 'Gerente'
  if (['Gestor Comercial'].includes(trimmed)) return 'Gestor Comercial'
  if (['Executivo de Contas'].includes(trimmed)) return 'Executivo de Contas'
  return getRoleLabel(trimmed) || trimmed
}

// Ordem preferencial de exibição dos cargos
const ROLE_DISPLAY_ORDER = [
  'Consultor',
  'Supervisor',
  'Líder',
  'Gerente',
  'Gestor Comercial',
  'Executivo de Contas',
]

/**
 * Card de Alertas no Dashboard:
 * 1. Alertas de Ação Automáticos (Frente C1):
 *    - Backlog envelhecido (> 2h atenção, > 24h crítico)
 *    - TFR estourado (> limite configurado ou 15 min)
 *    - Meta em risco (projeção fim de mês < 70%)
 * 2. Alertas de Desempenho Gerais (menos de 50% meta ou resolução < 20 p.p. do mínimo)
 */
export function PerformanceAlerts({ records }: PerformanceAlertsProps) {
  const [users, setUsers] = useState<UserRecord[]>([])
  const [targets, setTargets] = useState<UserTargetRecord[]>([])
  const [globalTarget, setGlobalTarget] = useState<GlobalTargetRecord | null>(null)
  const [activeTab, setActiveTab] = useState<'all' | 'action' | 'performance'>('all')

  useEffect(() => {
    let active = true
    Promise.all([getUsers(), getUserTargets(), getGlobalTarget()])
      .then(([u, t, g]) => {
        if (!active) return
        const internal = u.filter((item) =>
          [
            'Consultor',
            'Líder',
            'Supervisor',
            'Gerente',
            'Gestor Comercial',
            'Consultores',
            'Líderes',
            'Supervisores',
            'Gerentes',
          ].includes(item.role),
        )
        setUsers(internal)
        setTargets(t)
        setGlobalTarget(g)
      })
      .catch((err) => console.error(err))
    return () => {
      active = false
    }
  }, [])

  // 1. Alertas de Desempenho existentes
  const perfAlerts = useMemo<PerformanceAlert[]>(() => {
    if (!globalTarget) return []
    return computePerformanceAlerts(users, targets, globalTarget, records)
  }, [users, targets, globalTarget, records])

  // 2. Alertas de Ação Automáticos (Frente C1)
  const actionAlerts = useMemo<ActionAlertItem[]>(() => {
    const items: ActionAlertItem[] = []
    const now = Date.now()

    // 2.1 Backlog envelhecido (> 2h moderado, > 24h crítico)
    const openRecords = records.filter(
      (r) => r && r.status !== 'Concluído' && r.status !== 'Cancelado',
    )

    openRecords.forEach((record) => {
      const aging = computeRecordAging(record, now)
      const clientName = record.client_company || record.client_name || 'Cliente'
      const consultantName =
        record.expand?.assigned_user?.name || record.assigned_agent || 'Não atribuído'

      // Crítico > 24h
      if (aging.diffMinutes >= ACTION_ALERT_THRESHOLDS.BACKLOG_CRITICAL_MINUTES) {
        const hours = Math.floor(aging.diffMinutes / 60)
        items.push({
          id: `backlog-crit-${record.id}`,
          category: 'backlog_critical',
          severity: 'critical',
          title: `Fila Crítica (> 24h): ${clientName}`,
          description: `Atendimento parado há ${hours}h sem resolução na fila. Escalado para gerência.`,
          responsibleName: consultantName,
          responsibleId: record.assigned_user || record.user_id,
          serviceRecordId: record.id,
          link: `/atendimentos?id=${record.id}`,
          badgeLabel: `> 24h (${hours}h)`,
          timestamp: record.created,
          meta: { diffMinutes: aging.diffMinutes },
        })
      } else if (aging.diffMinutes >= ACTION_ALERT_THRESHOLDS.BACKLOG_WARNING_MINUTES) {
        // Atenção 2h–24h
        const hours = Math.floor(aging.diffMinutes / 60)
        const mins = aging.diffMinutes % 60
        const formatted = mins > 0 ? `${hours}h ${mins}min` : `${hours}h`
        items.push({
          id: `backlog-warn-${record.id}`,
          category: 'backlog_warning',
          severity: 'warning',
          title: `Fila > 2h: ${clientName}`,
          description: `Atendimento aguardando há ${formatted} na fila. Requer atenção operacional.`,
          responsibleName: consultantName,
          responsibleId: record.assigned_user || record.user_id,
          serviceRecordId: record.id,
          link: `/atendimentos?id=${record.id}`,
          badgeLabel: `> 2h (${formatted})`,
          timestamp: record.created,
          meta: { diffMinutes: aging.diffMinutes },
        })
      }
    })

    // 2.2 TFR estourado (> 15 min ou target específico)
    // Para atendimentos que já registraram first_response_time
    const targetMapByUser = new Map<string, number>()
    targets.forEach((t) => {
      if (t.user && t.tfr_target) {
        targetMapByUser.set(t.user, t.tfr_target)
      }
    })
    const defaultTfrTarget =
      globalTarget?.tfr_target && globalTarget.tfr_target > 0
        ? globalTarget.tfr_target
        : ACTION_ALERT_THRESHOLDS.DEFAULT_TFR_TARGET_MINUTES

    records.forEach((record) => {
      const tfr = record.first_response_time
      if (tfr && tfr > 0) {
        const userTargetLimit =
          (record.assigned_user && targetMapByUser.get(record.assigned_user)) || defaultTfrTarget

        if (tfr > userTargetLimit) {
          const clientName = record.client_company || record.client_name || 'Cliente'
          const consultantName =
            record.expand?.assigned_user?.name || record.assigned_agent || 'Consultor'

          items.push({
            id: `tfr-${record.id}`,
            category: 'tfr_breach',
            severity: 'warning',
            title: `TFR Estourado: ${clientName}`,
            description: `Primeira resposta em ${tfr} min (limite da meta: ${userTargetLimit} min).`,
            responsibleName: consultantName,
            responsibleId: record.assigned_user || record.user_id,
            serviceRecordId: record.id,
            link: `/atendimentos?id=${record.id}`,
            badgeLabel: `${tfr} min (meta ≤${userTargetLimit}m)`,
            timestamp: record.first_response_at || record.created,
            meta: { tfrMinutes: tfr, tfrLimit: userTargetLimit },
          })
        }
      }
    })

    // 2.3 Projeção de meta do mês em risco (< 70% da meta)
    // Apenas para consultores elegíveis (lideranças não têm meta individual de atendimento)
    if (users.length > 0) {
      const gmt3Date = new Date(Date.now() - 3 * 3600 * 1000)
      const currentYear = gmt3Date.getUTCFullYear()
      const currentMonth = gmt3Date.getUTCMonth() + 1
      const currentDay = gmt3Date.getUTCDate()
      const daysInMonth = new Date(Date.UTC(currentYear, currentMonth, 0)).getUTCDate()
      const monthPrefix = `${currentYear}-${String(currentMonth).padStart(2, '0')}`

      // Contagem de atendimentos deste mês por consultor
      const monthRecordsByUser = new Map<string, number>()
      records.forEach((r) => {
        if (!r.created || !r.created.startsWith(monthPrefix)) return
        const uid = r.assigned_user || r.user_id
        if (!uid) return
        monthRecordsByUser.set(uid, (monthRecordsByUser.get(uid) || 0) + 1)
      })

      const globalAttendanceTarget =
        globalTarget?.monthly_attendance_target && globalTarget.monthly_attendance_target > 0
          ? globalTarget.monthly_attendance_target
          : 100

      const attendanceTargetByUser = new Map<string, number>()
      targets.forEach((t) => {
        if (t.user && t.monthly_attendance_target) {
          attendanceTargetByUser.set(t.user, t.monthly_attendance_target)
        }
      })

      users.forEach((usr) => {
        const role = usr.role || ''
        // Respeitar apuração: consultores têm meta individual; lideranças não recebem alerta de meta individual
        if (role !== 'Consultor') return

        const userTarget = attendanceTargetByUser.get(usr.id) || globalAttendanceTarget
        const currentTotal = monthRecordsByUser.get(usr.id) || 0
        const dailyPace = currentDay > 0 ? currentTotal / currentDay : 0
        const projectedTotal = Math.round(dailyPace * daysInMonth)
        const projectedPct = userTarget > 0 ? Math.round((projectedTotal / userTarget) * 100) : 100

        if (projectedPct < ACTION_ALERT_THRESHOLDS.PROJECTION_RISK_PCT) {
          items.push({
            id: `proj-${usr.id}`,
            category: 'projection_risk',
            severity: projectedPct < 50 ? 'critical' : 'warning',
            title: `Meta em Risco: ${usr.name}`,
            description: `Projeção atual de fim de mês está em ${projectedPct}% da meta (~${projectedTotal} de ${userTarget} atendimentos estimados).`,
            responsibleName: usr.name,
            responsibleId: usr.id,
            link: '/metas-desempenho',
            badgeLabel: `Projeção ~${projectedPct}%`,
            meta: {
              projectedPct,
              projectedTotal,
              target: userTarget,
            },
          })
        }
      })
    }

    // Ordenar: críticos primeiro, depois warnings, mais recentes primeiro
    items.sort((a, b) => {
      if (a.severity === 'critical' && b.severity !== 'critical') return -1
      if (b.severity === 'critical' && a.severity !== 'critical') return 1
      return 0
    })

    return items
  }, [records, targets, globalTarget, users])

  // Agrupamento dos alertas de desempenho por cargo do colaborador
  const groupedPerfAlerts = useMemo(() => {
    const groups = new Map<string, PerformanceAlert[]>()

    perfAlerts.forEach((alert) => {
      const category = normalizeRoleCategory(alert.userRole)
      if (!groups.has(category)) {
        groups.set(category, [])
      }
      groups.get(category)!.push(alert)
    })

    const sortedEntries = Array.from(groups.entries()).sort(([catA], [catB]) => {
      const indexA = ROLE_DISPLAY_ORDER.indexOf(catA)
      const indexB = ROLE_DISPLAY_ORDER.indexOf(catB)
      const weightA = indexA !== -1 ? indexA : 99
      const weightB = indexB !== -1 ? indexB : 99
      if (weightA !== weightB) return weightA - weightB
      return catA.localeCompare(catB)
    })

    return sortedEntries
  }, [perfAlerts])

  const totalAlertsCount = actionAlerts.length + perfAlerts.length
  const criticalActionCount = actionAlerts.filter((a) => a.severity === 'critical').length

  return (
    <Card className="border-slate-200 shadow-subtle">
      <CardContent className="p-4 sm:p-5">
        {/* Header do Card com Resumo de Contadores */}
        <div className="flex flex-col sm:flex-row sm:items-center sm:justify-between gap-3 mb-3">
          <div className="flex items-center gap-2.5">
            <div className="p-2 rounded-xl bg-amber-500/10 text-amber-600 border border-amber-200/60">
              <Zap className="h-4 w-4" />
            </div>
            <div>
              <div className="flex items-center gap-2 flex-wrap">
                <h3 className="text-sm font-bold text-slate-900">
                  Central de Alertas Operacionais
                </h3>
                {totalAlertsCount > 0 && (
                  <Badge
                    variant="destructive"
                    className="text-[10px] h-4 px-1.5 font-bold bg-rose-600 text-white"
                  >
                    {totalAlertsCount} ativo{totalAlertsCount > 1 ? 's' : ''}
                  </Badge>
                )}
                {criticalActionCount > 0 && (
                  <Badge
                    variant="outline"
                    className="text-[10px] h-4 px-1.5 font-bold border-rose-300 text-rose-700 bg-rose-50 animate-pulse"
                  >
                    {criticalActionCount} crítico{criticalActionCount > 1 ? 's' : ''}
                  </Badge>
                )}
              </div>
              <p className="text-[11px] text-slate-500 mt-0.5">
                Alertas automáticos de ação (fila &gt; 2h/24h, TFR estourado, meta &lt; 70%) e
                desvios de desempenho
              </p>
            </div>
          </div>

          <div className="flex items-center gap-2 self-start sm:self-auto">
            <Link
              to="/fila"
              className="text-xs font-semibold text-slate-600 hover:text-slate-900 flex items-center gap-1 px-2.5 py-1 rounded-md border border-slate-200 hover:bg-slate-50 transition-colors"
            >
              <Clock className="h-3 w-3 text-slate-500" /> Ver Fila
            </Link>
            <Link
              to="/metas-desempenho"
              className="text-xs font-semibold text-indigo-600 hover:text-indigo-800 flex items-center gap-1 px-2.5 py-1 rounded-md bg-indigo-50 hover:bg-indigo-100 transition-colors"
            >
              Metas <ArrowRight className="h-3 w-3" />
            </Link>
          </div>
        </div>

        {/* Abas / Filtros: Todos, Alertas de Ação (C1), Alertas de Desempenho */}
        <div className="flex items-center gap-1.5 p-1 bg-slate-100/80 rounded-lg mb-3 text-xs">
          <button
            type="button"
            onClick={() => setActiveTab('all')}
            className={`px-3 py-1 rounded-md font-medium transition-all ${
              activeTab === 'all'
                ? 'bg-white text-slate-900 shadow-xs font-semibold'
                : 'text-slate-600 hover:text-slate-900'
            }`}
          >
            Todos ({totalAlertsCount})
          </button>
          <button
            type="button"
            onClick={() => setActiveTab('action')}
            className={`px-3 py-1 rounded-md font-medium transition-all flex items-center gap-1.5 ${
              activeTab === 'action'
                ? 'bg-white text-indigo-900 shadow-xs font-semibold'
                : 'text-slate-600 hover:text-slate-900'
            }`}
          >
            <span>Alertas de Ação</span>
            <Badge
              variant="secondary"
              className={`text-[9px] h-3.5 px-1 font-bold ${
                actionAlerts.length > 0
                  ? 'bg-amber-100 text-amber-800'
                  : 'bg-slate-200 text-slate-600'
              }`}
            >
              {actionAlerts.length}
            </Badge>
          </button>
          <button
            type="button"
            onClick={() => setActiveTab('performance')}
            className={`px-3 py-1 rounded-md font-medium transition-all flex items-center gap-1.5 ${
              activeTab === 'performance'
                ? 'bg-white text-slate-900 shadow-xs font-semibold'
                : 'text-slate-600 hover:text-slate-900'
            }`}
          >
            <span>Desempenho Geral</span>
            <Badge
              variant="secondary"
              className={`text-[9px] h-3.5 px-1 font-bold ${
                perfAlerts.length > 0 ? 'bg-rose-100 text-rose-800' : 'bg-slate-200 text-slate-600'
              }`}
            >
              {perfAlerts.length}
            </Badge>
          </button>
        </div>

        {/* Estado vazio quando não houver alertas */}
        {totalAlertsCount === 0 ? (
          <div className="flex items-center gap-2 py-4 px-3 rounded-lg bg-emerald-50 text-xs text-emerald-700 border border-emerald-200">
            <CheckCircle2 className="h-4 w-4 shrink-0 text-emerald-600" />
            <span>
              Nenhum alerta ativo no momento. Backlog dentro dos prazos, TFR em conformidade e metas
              no ritmo esperado.
            </span>
          </div>
        ) : (
          <div className="space-y-4">
            {/* ============================================================ */}
            {/* SEÇÃO 1: ALERTAS DE AÇÃO AUTOMÁTICOS (FRENTE C1)             */}
            {/* ============================================================ */}
            {(activeTab === 'all' || activeTab === 'action') && actionAlerts.length > 0 && (
              <div className="rounded-xl border border-indigo-100 bg-gradient-to-b from-indigo-50/40 to-white p-3 space-y-2.5">
                <div className="flex items-center justify-between pb-1.5 border-b border-indigo-100">
                  <div className="flex items-center gap-2">
                    <Zap className="h-3.5 w-3.5 text-indigo-600" />
                    <span className="text-xs font-bold text-slate-800 tracking-wide uppercase">
                      Alertas de Ação Imediata
                    </span>
                    <Badge
                      variant="outline"
                      className="text-[10px] font-semibold bg-white border-indigo-200 text-indigo-700"
                    >
                      {actionAlerts.length} ação{actionAlerts.length > 1 ? 'ões' : ''} requerida
                      {actionAlerts.length > 1 ? 's' : ''}
                    </Badge>
                  </div>
                  <span className="text-[10px] text-slate-500 hidden sm:inline">
                    Disparos em tempo real via sino e e-mail
                  </span>
                </div>

                <div className="space-y-2">
                  {actionAlerts.map((item) => {
                    const isCritical = item.severity === 'critical'
                    return (
                      <div
                        key={item.id}
                        className={`flex flex-col sm:flex-row sm:items-center sm:justify-between gap-2 rounded-lg border p-2.5 transition-all ${
                          isCritical
                            ? 'bg-rose-50/60 border-rose-300 hover:bg-rose-50 hover:shadow-xs'
                            : 'bg-amber-50/50 border-amber-200 hover:bg-amber-50/80 hover:shadow-xs'
                        }`}
                      >
                        <div className="flex items-start gap-2.5">
                          {isCritical ? (
                            <AlertTriangle className="h-4 w-4 text-rose-600 mt-0.5 shrink-0" />
                          ) : (
                            <Clock className="h-4 w-4 text-amber-600 mt-0.5 shrink-0" />
                          )}
                          <div className="min-w-0">
                            <div className="flex items-center gap-2 flex-wrap">
                              <p className="text-xs font-bold text-slate-900">{item.title}</p>
                              <Badge
                                variant={isCritical ? 'destructive' : 'outline'}
                                className={`text-[9px] h-3.5 px-1 font-bold ${
                                  isCritical
                                    ? 'bg-rose-600 text-white'
                                    : 'bg-amber-100 text-amber-800 border-amber-300'
                                }`}
                              >
                                {isCritical ? 'Crítico' : 'Atenção'}
                              </Badge>
                              <Badge
                                variant="secondary"
                                className="text-[9px] h-3.5 px-1 bg-white text-slate-700 border border-slate-200 font-medium"
                              >
                                {item.badgeLabel}
                              </Badge>
                            </div>
                            <p className="text-[11px] text-slate-600 mt-0.5">{item.description}</p>
                            {item.responsibleName && (
                              <p className="text-[10px] text-slate-500 mt-0.5">
                                Responsável:{' '}
                                <span className="font-semibold text-slate-700">
                                  {item.responsibleName}
                                </span>
                              </p>
                            )}
                          </div>
                        </div>

                        <Link
                          to={item.link}
                          className={`text-[11px] font-semibold flex items-center gap-1 shrink-0 self-end sm:self-center px-2 py-1 rounded transition-colors ${
                            isCritical
                              ? 'text-rose-700 bg-rose-100 hover:bg-rose-200'
                              : 'text-amber-800 bg-amber-100 hover:bg-amber-200'
                          }`}
                        >
                          {item.category === 'projection_risk' ? 'Ver Metas' : 'Ver Atendimento'}{' '}
                          <ExternalLink className="h-3 w-3" />
                        </Link>
                      </div>
                    )
                  })}
                </div>
              </div>
            )}

            {/* ============================================================ */}
            {/* SEÇÃO 2: ALERTAS DE DESEMPENHO GERAIS                        */}
            {/* ============================================================ */}
            {(activeTab === 'all' || activeTab === 'performance') && perfAlerts.length > 0 && (
              <div className="space-y-4">
                {groupedPerfAlerts.map(([roleGroup, groupList]) => (
                  <div
                    key={roleGroup}
                    className="rounded-xl border border-slate-200 bg-slate-50/50 p-3 space-y-2.5"
                  >
                    {/* Header do Agrupamento por Cargo */}
                    <div className="flex items-center justify-between pb-1 border-b border-slate-200/70">
                      <div className="flex items-center gap-2">
                        <Briefcase className="h-3.5 w-3.5 text-indigo-600" />
                        <span className="text-xs font-bold text-slate-800 tracking-wide uppercase">
                          {roleGroup}
                        </span>
                        <Badge
                          variant="outline"
                          className="text-[10px] font-semibold bg-white border-slate-300 text-slate-700"
                        >
                          {groupList.length} alerta{groupList.length > 1 ? 's' : ''}
                        </Badge>
                      </div>

                      <span className="text-[10px] text-slate-500 hidden sm:inline">
                        {groupList.some((a) => a.isLeader)
                          ? 'Lógica de equipe/liderança aplicada'
                          : 'Metas individuais de atendimento'}
                      </span>
                    </div>

                    {/* Lista de Alertas do Cargo */}
                    <div className="space-y-2">
                      {groupList.map((alert, idx) => (
                        <div
                          key={`${alert.userId}-${alert.type}-${idx}`}
                          className="flex flex-col sm:flex-row sm:items-center sm:justify-between gap-2 rounded-lg border border-rose-200/80 bg-white p-2.5 hover:shadow-xs transition-shadow"
                        >
                          <div className="flex items-start gap-2.5">
                            <AlertTriangle className="h-4 w-4 text-rose-500 mt-0.5 shrink-0" />
                            <div className="min-w-0">
                              <div className="flex items-center gap-1.5 flex-wrap">
                                <p className="text-xs font-bold text-slate-900">{alert.userName}</p>
                                {alert.userRole && (
                                  <span className="text-[10px] text-slate-400 font-normal">
                                    ({alert.userRole})
                                  </span>
                                )}
                                {alert.isLeader && (
                                  <Badge
                                    variant="secondary"
                                    className="text-[9px] h-3.5 px-1 bg-indigo-50 text-indigo-700 border border-indigo-200"
                                  >
                                    <Users2 className="h-2.5 w-2.5 mr-0.5" />
                                    Meta da Equipe
                                  </Badge>
                                )}
                              </div>
                              <p className="text-[11px] text-slate-600 mt-0.5">
                                {alert.metricLabel}:{' '}
                                <span className="font-semibold text-rose-600">
                                  {alert.realDisplay}
                                </span>{' '}
                                vs esperado{' '}
                                <span className="font-semibold text-slate-700">
                                  {alert.expectedDisplay}
                                </span>
                              </p>
                              <Badge
                                variant="secondary"
                                className="mt-1 text-[9px] h-4 bg-rose-100 text-rose-700 font-medium"
                              >
                                {alert.type === 'attendance'
                                  ? `${alert.isLeader ? 'Equipe com' : 'Atendimentos'} (${Math.round(alert.ratio * 100)}% da meta)`
                                  : `${Math.round(alert.ratio)} p.p. abaixo do mínimo da equipe`}
                              </Badge>
                            </div>
                          </div>
                          <Link
                            to="/metas-desempenho"
                            className="text-[11px] font-semibold text-indigo-600 hover:text-indigo-800 flex items-center gap-1 shrink-0 self-end sm:self-center"
                          >
                            Ver metas <ArrowRight className="h-3 w-3" />
                          </Link>
                        </div>
                      ))}
                    </div>
                  </div>
                ))}
              </div>
            )}
          </div>
        )}
      </CardContent>
    </Card>
  )
}

export { canManageTargets }
