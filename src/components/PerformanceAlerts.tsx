import { useMemo, useEffect, useState } from 'react'
import { Card, CardContent } from '@/components/ui/card'
import { Badge } from '@/components/ui/badge'
import { AlertTriangle, CheckCircle2, ArrowRight } from 'lucide-react'
import { Link } from 'react-router-dom'
import { getUsers } from '@/services/users'
import { getUserTargets, type UserTargetRecord } from '@/services/user-targets'
import { getGlobalTarget } from '@/services/global-targets'
import type { UserRecord, GlobalTargetRecord, ServiceRecord } from '@/types/service_record'
import {
  computePerformanceAlerts,
  canManageTargets,
  isLeadershipRole,
  type PerformanceAlert,
} from '@/lib/metas'
import { Users2, User, ShieldCheck, Briefcase } from 'lucide-react'
import { getRoleLabel } from '@/lib/role-labels'

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
 * Card de Alertas de Desempenho para o Dashboard.
 * Avalia o desempenho dos colaboradores internos (consultores, supervisores, gerentes).
 * Agrupa visualmente por cargo (Consultor, Supervisor, Líder, Gerente, etc.).
 * Mantém intactas as regras de elegibilidade e cálculo de metas da liderança.
 */
export function PerformanceAlerts({ records }: PerformanceAlertsProps) {
  const [users, setUsers] = useState<UserRecord[]>([])
  const [targets, setTargets] = useState<UserTargetRecord[]>([])
  const [globalTarget, setGlobalTarget] = useState<GlobalTargetRecord | null>(null)

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

  const alerts = useMemo<PerformanceAlert[]>(() => {
    if (!globalTarget) return []
    return computePerformanceAlerts(users, targets, globalTarget, records)
  }, [users, targets, globalTarget, records])

  // Agrupamento dos alertas por cargo do colaborador
  const groupedAlerts = useMemo(() => {
    const groups = new Map<string, PerformanceAlert[]>()

    alerts.forEach((alert) => {
      const category = normalizeRoleCategory(alert.userRole)
      if (!groups.has(category)) {
        groups.set(category, [])
      }
      groups.get(category)!.push(alert)
    })

    // Ordenar de acordo com ROLE_DISPLAY_ORDER
    const sortedEntries = Array.from(groups.entries()).sort(([catA], [catB]) => {
      const indexA = ROLE_DISPLAY_ORDER.indexOf(catA)
      const indexB = ROLE_DISPLAY_ORDER.indexOf(catB)
      const weightA = indexA !== -1 ? indexA : 99
      const weightB = indexB !== -1 ? indexB : 99
      if (weightA !== weightB) return weightA - weightB
      return catA.localeCompare(catB)
    })

    return sortedEntries
  }, [alerts])

  return (
    <Card className="border-slate-200 shadow-subtle">
      <CardContent className="p-4 sm:p-5">
        <div className="flex flex-col sm:flex-row sm:items-center sm:justify-between gap-2 mb-3">
          <div className="flex items-center gap-2">
            <div className="p-1.5 rounded-lg bg-amber-50 text-amber-600">
              <AlertTriangle className="h-4 w-4" />
            </div>
            <div>
              <h3 className="text-sm font-bold text-slate-900 flex items-center gap-2">
                Alertas de Desempenho
                {alerts.length > 0 && (
                  <Badge variant="destructive" className="text-[10px] h-4 px-1.5">
                    {alerts.length}
                  </Badge>
                )}
              </h3>
              <p className="text-[11px] text-slate-500">
                Colaboradores com menos de 50% da meta de atendimentos ou taxa de resolução mais de
                20 p.p. abaixo do esperado no mês corrente.
              </p>
            </div>
          </div>

          <Link
            to="/metas-desempenho"
            className="text-xs font-semibold text-indigo-600 hover:text-indigo-800 flex items-center gap-1 self-start sm:self-auto"
          >
            Configurar Metas <ArrowRight className="h-3.5 w-3.5" />
          </Link>
        </div>

        {alerts.length === 0 ? (
          <div className="flex items-center gap-2 py-4 px-3 rounded-lg bg-emerald-50 text-xs text-emerald-700 border border-emerald-200">
            <CheckCircle2 className="h-4 w-4 shrink-0 text-emerald-600" />
            <span>
              Nenhum alerta no momento. Todos os colaboradores avaliados estão dentro do esperado.
            </span>
          </div>
        ) : (
          <div className="space-y-4 mt-2">
            {groupedAlerts.map(([roleGroup, groupList]) => (
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
                            <span className="font-semibold text-rose-600">{alert.realDisplay}</span>{' '}
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
      </CardContent>
    </Card>
  )
}

export { canManageTargets }
