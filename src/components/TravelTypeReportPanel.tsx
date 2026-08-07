import { Card, CardContent } from '@/components/ui/card'
import { Plane, Globe } from 'lucide-react'
import { ServiceRecord } from '@/types/service_record'

interface Props {
  records: ServiceRecord[]
}

export function TravelTypeReportPanel({ records }: Props) {
  const national = records.filter((r) => r.travel_type === 'Nacional')
  const international = records.filter((r) => r.travel_type === 'Internacional')

  const renderGroup = (label: string, icon: React.ReactNode, groupRecords: ServiceRecord[]) => {
    const byStatus: Record<string, number> = {
      Aberto: 0,
      'Em Andamento': 0,
      Concluído: 0,
      Cancelado: 0,
    }
    const byPriority: Record<string, number> = { Baixa: 0, Média: 0, Alta: 0 }
    groupRecords.forEach((r) => {
      if (r.status in byStatus) byStatus[r.status]++
      if (r.priority in byPriority) byPriority[r.priority]++
    })
    const avgDuration =
      groupRecords.length > 0
        ? Math.round(groupRecords.reduce((a, r) => a + (r.duration || 0), 0) / groupRecords.length)
        : 0

    return (
      <Card className="border-slate-200 shadow-subtle">
        <CardContent className="p-4">
          <div className="flex items-center gap-2 mb-3">
            {icon}
            <h3 className="text-sm font-bold text-slate-900">{label}</h3>
            <span className="text-xs text-slate-500">({groupRecords.length} registros)</span>
          </div>
          <div className="grid grid-cols-2 gap-3 mb-3">
            <div>
              <p className="text-[10px] text-slate-500 uppercase mb-1">Por Status</p>
              <div className="space-y-0.5">
                {Object.entries(byStatus).map(([s, c]) => (
                  <div key={s} className="flex justify-between text-xs">
                    <span className="text-slate-600">{s}</span>
                    <span className="font-semibold">{c}</span>
                  </div>
                ))}
              </div>
            </div>
            <div>
              <p className="text-[10px] text-slate-500 uppercase mb-1">Por Prioridade</p>
              <div className="space-y-0.5">
                {Object.entries(byPriority).map(([p, c]) => (
                  <div key={p} className="flex justify-between text-xs">
                    <span className="text-slate-600">{p}</span>
                    <span className="font-semibold">{c}</span>
                  </div>
                ))}
              </div>
            </div>
          </div>
          <div className="flex justify-between text-xs border-t pt-2">
            <span className="text-slate-500">Duração média</span>
            <span className="font-bold">{avgDuration} min</span>
          </div>
        </CardContent>
      </Card>
    )
  }

  return (
    <div className="space-y-3">
      <h3 className="text-sm font-bold text-slate-900">Relatório por Tipo de Viagem</h3>
      <div className="grid grid-cols-1 lg:grid-cols-2 gap-4">
        {renderGroup('Nacional', <Plane className="h-4 w-4 text-green-600" />, national)}
        {renderGroup('Internacional', <Globe className="h-4 w-4 text-blue-600" />, international)}
      </div>
    </div>
  )
}
