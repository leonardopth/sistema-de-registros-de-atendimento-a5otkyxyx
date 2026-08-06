import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card'
import { ServiceRecord, ClientRecord } from '@/types/service_record'
import { Award, CheckCircle } from 'lucide-react'

interface AutonomyScorecardProps {
  records?: ServiceRecord[]
  clients?: ClientRecord[]
}

export function AutonomyScorecard({ records = [] }: AutonomyScorecardProps) {
  const safeRecords = Array.isArray(records) ? records : []

  const total = safeRecords.length
  const avoidableCount = safeRecords.filter((r) => r && Boolean(r.avoidable_contact)).length
  const avoidableRate = total > 0 ? Math.round((avoidableCount / total) * 100) : 0
  const autonomyRate = 100 - avoidableRate

  const reasonCounts: Record<string, number> = {}
  safeRecords.forEach((r) => {
    if (r && r.avoidable_contact && r.avoidable_contact_reason) {
      const reason = r.avoidable_contact_reason
      reasonCounts[reason] = (reasonCounts[reason] || 0) + 1
    }
  })

  const sortedReasons = Object.entries(reasonCounts).sort((a, b) => b[1] - a[1])

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

        {sortedReasons.length > 0 ? (
          <div className="space-y-1.5">
            <p className="text-[11px] font-semibold text-slate-600 uppercase tracking-wider">
              Principais Motivos de Evitáveis
            </p>
            {sortedReasons.slice(0, 3).map(([reason, count]) => (
              <div
                key={reason}
                className="flex items-center justify-between text-xs p-1.5 bg-slate-100/70 rounded"
              >
                <span className="text-slate-700 truncate">{reason}</span>
                <span className="font-bold text-slate-900 shrink-0">{count} contatos</span>
              </div>
            ))}
          </div>
        ) : (
          <div className="flex items-center gap-2 text-xs text-emerald-700 bg-emerald-50 p-2.5 rounded-lg border border-emerald-100">
            <CheckCircle className="h-4 w-4 shrink-0 text-emerald-600" />
            <span>Nenhum contato evitável registrado no período. Ótimo trabalho!</span>
          </div>
        )}
      </CardContent>
    </Card>
  )
}
