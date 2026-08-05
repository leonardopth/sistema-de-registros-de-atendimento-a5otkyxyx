import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card'
import { ServiceRecord } from '@/types/service_record'
import { useMemo } from 'react'
import { CircleCheck, CircleAlert, CircleX } from 'lucide-react'

interface AutonomyScorecardProps {
  records: ServiceRecord[]
}

interface AgencyScore {
  company: string
  total: number
  avoidable: number
  avoidableRate: number
  rfAvailable: number
  level: 'autonomous' | 'developing' | 'needs-training'
}

export function AutonomyScorecard({ records }: AutonomyScorecardProps) {
  const scores = useMemo<AgencyScore[]>(() => {
    const companyMap = new Map<string, ServiceRecord[]>()
    for (const r of records) {
      const company = r.client_company || r.expand?.client?.company || ''
      if (!company) continue
      if (!companyMap.has(company)) companyMap.set(company, [])
      companyMap.get(company)!.push(r)
    }
    return Array.from(companyMap.entries())
      .map(([company, recs]): AgencyScore => {
        const total = recs.length
        const avoidable = recs.filter((r) => r.avoidable_contact).length
        const rfAvailable = recs.filter(
          (r) => r.avoidable_contact_reason === 'Disponível no RF',
        ).length
        const avoidableRate = total > 0 ? Math.round((avoidable / total) * 100) : 0
        const level: AgencyScore['level'] =
          avoidableRate < 15 ? 'autonomous' : avoidableRate <= 30 ? 'developing' : 'needs-training'
        return { company, total, avoidable, avoidableRate, rfAvailable, level }
      })
      .sort((a, b) => b.avoidableRate - a.avoidableRate)
  }, [records])

  const levelConfig = {
    autonomous: {
      label: 'Autônomo',
      color: 'text-emerald-600',
      bg: 'bg-emerald-50',
      Icon: CircleCheck,
    },
    developing: {
      label: 'Em desenvolvimento',
      color: 'text-amber-600',
      bg: 'bg-amber-50',
      Icon: CircleAlert,
    },
    'needs-training': {
      label: 'Necessita treinamento',
      color: 'text-rose-600',
      bg: 'bg-rose-50',
      Icon: CircleX,
    },
  }

  return (
    <Card className="border-slate-200 shadow-subtle">
      <CardHeader className="pb-3">
        <CardTitle className="text-sm font-bold text-slate-900">
          Scorecard de Autonomia do Cliente
        </CardTitle>
      </CardHeader>
      <CardContent className="space-y-2">
        {scores.length === 0 && (
          <p className="text-xs text-slate-400 text-center py-4">Nenhum dado disponível.</p>
        )}
        {scores.slice(0, 8).map((score) => {
          const cfg = levelConfig[score.level]
          const Icon = cfg.Icon
          return (
            <div
              key={score.company}
              className="flex items-center justify-between p-2 rounded-lg bg-slate-50"
            >
              <div className="flex items-center gap-2 min-w-0">
                <Icon className={`h-4 w-4 ${cfg.color} shrink-0`} />
                <span className="text-xs font-semibold text-slate-800 truncate">
                  {score.company}
                </span>
              </div>
              <div className="flex items-center gap-3 text-xs shrink-0">
                <span className="text-slate-500 hidden sm:inline">{score.total} atend.</span>
                <span className={`font-bold ${cfg.color}`}>{score.avoidableRate}%</span>
                <span
                  className={`px-2 py-0.5 rounded ${cfg.bg} ${cfg.color} font-medium text-[10px] whitespace-nowrap`}
                >
                  {cfg.label}
                </span>
              </div>
            </div>
          )
        })}
      </CardContent>
    </Card>
  )
}
