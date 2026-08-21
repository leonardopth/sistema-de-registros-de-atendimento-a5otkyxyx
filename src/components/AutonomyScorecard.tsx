import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card'
import { ServiceRecord, ClientRecord } from '@/types/service_record'
import { Award, CheckCircle, TrendingUp, TrendingDown, AlertTriangle } from 'lucide-react'

interface AutonomyScorecardProps {
  records?: ServiceRecord[]
  clients?: ClientRecord[]
}

interface ClientAutonomy {
  name: string
  total: number
  avoidable: number
  autonomyRate: number
}

export function AutonomyScorecard({ records = [] }: AutonomyScorecardProps) {
  const safeRecords = Array.isArray(records) ? records : []

  const total = safeRecords.length
  const avoidableCount = safeRecords.filter((r) => r && Boolean(r.avoidable_contact)).length
  const avoidableRate = total > 0 ? Math.round((avoidableCount / total) * 100) : 0
  const autonomyRate = 100 - avoidableRate

  const clientMap = new Map<string, { total: number; avoidable: number }>()
  safeRecords.forEach((r) => {
    const key = r.client_company || r.client_name || 'Desconhecido'
    if (!clientMap.has(key)) clientMap.set(key, { total: 0, avoidable: 0 })
    const entry = clientMap.get(key)!
    entry.total++
    if (r.avoidable_contact) entry.avoidable++
  })

  const entriesWithMin = Array.from(clientMap.entries()).filter(([, v]) => v.total >= 2)
  const pool = entriesWithMin.length > 0 ? entriesWithMin : Array.from(clientMap.entries())

  const clientAutonomies: ClientAutonomy[] = pool
    .map(([name, v]) => ({
      name,
      total: v.total,
      avoidable: v.avoidable,
      autonomyRate: Math.round(((v.total - v.avoidable) / v.total) * 100),
    }))
    .sort((a, b) => b.autonomyRate - a.autonomyRate)

  const showTop3 = clientAutonomies.length > 3
  const top3 = showTop3 ? clientAutonomies.slice(0, 3) : clientAutonomies
  const bottom3 = showTop3 ? clientAutonomies.slice(-3).reverse() : []

  return (
    <Card className="border-slate-200 shadow-subtle">
      <CardHeader className="pb-2">
        <CardTitle className="text-sm font-bold text-slate-900 flex items-center justify-between">
          <span className="flex items-center gap-2">
            <Award className="h-4 w-4 text-emerald-600" /> Índice de Autonomia do Cliente
          </span>
          <span className="text-xs px-2 py-0.5 rounded-full bg-emerald-100 text-emerald-800 font-semibold">
            {autonomyRate}% Autônomo
          </span>
        </CardTitle>
      </CardHeader>
      <CardContent className="space-y-3">
        <div className="flex items-center justify-between p-3 bg-slate-50 rounded-lg">
          <div>
            <p className="text-xs text-slate-500 font-medium">Contatos Evitáveis</p>
            <p className="text-lg font-bold text-slate-900">
              {avoidableCount}{' '}
              <span className="text-xs font-normal text-slate-500">de {total}</span>
            </p>
          </div>
          <div className="text-right">
            <p className="text-xs text-slate-500 font-medium">Taxa de Atendimento Desnecessário</p>
            <p className="text-lg font-bold text-amber-600">{avoidableRate}%</p>
          </div>
        </div>

        {top3.length > 0 && (
          <div className="space-y-1.5">
            <p className="text-[11px] font-semibold text-slate-600 uppercase tracking-wider flex items-center gap-1">
              <TrendingUp className="h-3 w-3 text-emerald-600" /> Top 3 — Maior Autonomia
            </p>
            {top3.map((c, idx) => (
              <div
                key={`top-${c.name}`}
                className="flex items-center justify-between text-xs p-1.5 bg-emerald-50/70 rounded"
              >
                <span className="text-slate-700 truncate flex items-center gap-1.5">
                  <span className="text-[10px] font-bold text-emerald-600">#{idx + 1}</span>
                  {c.name}
                </span>
                <span className="font-bold text-emerald-700 shrink-0">{c.autonomyRate}%</span>
              </div>
            ))}
          </div>
        )}

        {bottom3.length > 0 && (
          <div className="space-y-1.5">
            <p className="text-[11px] font-semibold text-amber-700 uppercase tracking-wider flex items-center gap-1">
              <TrendingDown className="h-3 w-3 text-amber-600" /> Bottom 3 — Precisam de Treinamento
            </p>
            {bottom3.map((c, idx) => (
              <div
                key={`bottom-${c.name}`}
                className="flex items-center justify-between text-xs p-1.5 bg-amber-50/70 rounded border border-amber-100"
              >
                <span className="text-slate-700 truncate flex items-center gap-1.5">
                  <AlertTriangle className="h-3 w-3 text-amber-500 shrink-0" />
                  {c.name}
                </span>
                <div className="text-right shrink-0">
                  <span className="font-bold text-amber-700">{c.autonomyRate}%</span>
                  <span className="text-[10px] text-slate-400 ml-1">
                    ({c.avoidable}/{c.total} evit.)
                  </span>
                </div>
              </div>
            ))}
          </div>
        )}

        {top3.length === 0 && bottom3.length === 0 && (
          <div className="flex items-center gap-2 text-xs text-emerald-700 bg-emerald-50 p-2.5 rounded-lg border border-emerald-100">
            <CheckCircle className="h-4 w-4 shrink-0 text-emerald-600" />
            <span>Nenhum contato evitável registrado no período. Ótimo trabalho!</span>
          </div>
        )}
      </CardContent>
    </Card>
  )
}
