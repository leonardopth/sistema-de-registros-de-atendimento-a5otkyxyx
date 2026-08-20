import { useMemo, useEffect, useState } from 'react'
import { Card, CardContent } from '@/components/ui/card'
import { Badge } from '@/components/ui/badge'
import { AlertTriangle, CheckCircle2, ArrowRight } from 'lucide-react'
import { Link } from 'react-router-dom'
import { getAgents } from '@/services/agents'
import { getAgentTargets } from '@/services/agent-targets'
import { getGlobalTarget } from '@/services/global-targets'
import type {
  AgentRecord,
  AgentTargetRecord,
  GlobalTargetRecord,
  ServiceRecord,
} from '@/types/service_record'
import { computePerformanceAlerts, canManageTargets, type PerformanceAlert } from '@/lib/metas'

interface PerformanceAlertsProps {
  records: ServiceRecord[]
}

/**
 * Card de Alertas de Desempenho para o Dashboard.
 * Visível apenas para gestores/supervisores/líderes/master.
 */
export function PerformanceAlerts({ records }: PerformanceAlertsProps) {
  const [agents, setAgents] = useState<AgentRecord[]>([])
  const [targets, setTargets] = useState<AgentTargetRecord[]>([])
  const [globalTarget, setGlobalTarget] = useState<GlobalTargetRecord | null>(null)

  useEffect(() => {
    let active = true
    Promise.all([getAgents(), getAgentTargets(), getGlobalTarget()])
      .then(([a, t, g]) => {
        if (!active) return
        setAgents(a)
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
    return computePerformanceAlerts(agents, targets, globalTarget, records)
  }, [agents, targets, globalTarget, records])

  return (
    <Card className="border-slate-200 shadow-subtle">
      <CardContent className="p-4">
        <h3 className="text-sm font-bold text-slate-900 mb-3 flex items-center gap-2">
          <AlertTriangle className="h-4 w-4 text-amber-500" /> Alertas de Desempenho
        </h3>
        <p className="text-[11px] text-slate-500 mb-3">
          Agentes com menos de 50% da meta de atendimentos ou taxa de resolução mais de 20 p.p.
          abaixo do mínimo no mês corrente.
        </p>

        {alerts.length === 0 ? (
          <div className="flex items-center gap-2 py-4 text-xs text-emerald-600">
            <CheckCircle2 className="h-4 w-4" />
            Nenhum alerta no momento. Todos os agentes dentro do esperado.
          </div>
        ) : (
          <div className="space-y-2">
            {alerts.map((alert, idx) => (
              <div
                key={`${alert.agentId}-${alert.type}-${idx}`}
                className="flex flex-col sm:flex-row sm:items-center sm:justify-between gap-2 rounded-lg border border-rose-100 bg-rose-50/50 p-2.5"
              >
                <div className="flex items-start gap-2">
                  <AlertTriangle className="h-4 w-4 text-rose-500 mt-0.5 shrink-0" />
                  <div className="min-w-0">
                    <p className="text-xs font-bold text-slate-900">{alert.agentName}</p>
                    <p className="text-[11px] text-slate-600">
                      {alert.metricLabel}:{' '}
                      <span className="font-semibold text-rose-600">{alert.realDisplay}</span> vs
                      esperado{' '}
                      <span className="font-semibold text-slate-700">{alert.expectedDisplay}</span>
                    </p>
                    <Badge
                      variant="secondary"
                      className="mt-1 text-[9px] h-4 bg-rose-100 text-rose-700"
                    >
                      {alert.type === 'attendance'
                        ? `Atendimentos (${Math.round(alert.ratio * 100)}% da meta)`
                        : `${Math.round(alert.ratio)} p.p. abaixo do mínimo`}
                    </Badge>
                  </div>
                </div>
                <Link
                  to="/metas-desempenho"
                  className="text-[11px] font-semibold text-indigo-600 hover:text-indigo-800 flex items-center gap-1 shrink-0"
                >
                  Ver metas <ArrowRight className="h-3 w-3" />
                </Link>
              </div>
            ))}
          </div>
        )}
      </CardContent>
    </Card>
  )
}

export { canManageTargets }
