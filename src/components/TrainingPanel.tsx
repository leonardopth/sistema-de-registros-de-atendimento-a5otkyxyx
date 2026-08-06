import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card'
import { ServiceRecord, ClientRecord } from '@/types/service_record'
import { GraduationCap, ArrowRight, Lightbulb } from 'lucide-react'
import { useNavigate } from 'react-router-dom'
import { Button } from '@/components/ui/button'

interface TrainingPanelProps {
  records?: ServiceRecord[]
  clients?: ClientRecord[]
}

export function TrainingPanel({ records = [] }: TrainingPanelProps) {
  const navigate = useNavigate()
  const safeRecords = Array.isArray(records) ? records : []

  const clientAvoidableMap: Record<string, { name: string; count: number }> = {}

  safeRecords.forEach((r) => {
    if (r && r.avoidable_contact && (r.client_name || r.client_company)) {
      const name = r.client_company || r.client_name
      if (!clientAvoidableMap[name]) {
        clientAvoidableMap[name] = { name, count: 0 }
      }
      clientAvoidableMap[name].count += 1
    }
  })

  const topClientsNeedingTraining = Object.values(clientAvoidableMap)
    .sort((a, b) => b.count - a.count)
    .slice(0, 3)

  return (
    <Card className="border-slate-200 shadow-subtle">
      <CardHeader className="pb-2">
        <CardTitle className="text-sm font-bold text-slate-900 flex items-center justify-between">
          <span className="flex items-center gap-2">
            <GraduationCap className="h-4 w-4 text-indigo-600" /> Treinamentos Sugeridos
          </span>
          <Button
            variant="ghost"
            size="sm"
            onClick={() => navigate('/painel-treinamento')}
            className="text-xs text-indigo-600 hover:text-indigo-700 p-0 h-auto"
          >
            Ver todos <ArrowRight className="h-3 w-3 ml-1" />
          </Button>
        </CardTitle>
      </CardHeader>
      <CardContent className="space-y-3">
        {topClientsNeedingTraining.length > 0 ? (
          <div className="space-y-2">
            <p className="text-[11px] text-slate-500">
              Clientes com maior volume de chamados evitáveis (candidatos a reciclagem/treinamento):
            </p>
            {topClientsNeedingTraining.map((item, idx) => (
              <div
                key={`train-client-${idx}`}
                className="flex items-center justify-between p-2 bg-indigo-50/50 rounded-lg border border-indigo-100"
              >
                <div className="min-w-0 flex-1">
                  <p className="text-xs font-bold text-slate-900 truncate">{item.name}</p>
                  <p className="text-[10px] text-slate-500">
                    {item.count} chamados evitáveis registrados
                  </p>
                </div>
                <Button
                  size="sm"
                  variant="outline"
                  onClick={() => navigate('/painel-treinamento')}
                  className="text-[11px] h-7 bg-white text-indigo-700 border-indigo-200 hover:bg-indigo-50 shrink-0 ml-2"
                >
                  <Lightbulb className="h-3 w-3 mr-1" /> Plano
                </Button>
              </div>
            ))}
          </div>
        ) : (
          <div className="p-4 bg-slate-50 rounded-lg text-center">
            <GraduationCap className="h-6 w-6 text-slate-400 mx-auto mb-1.5" />
            <p className="text-xs text-slate-600 font-medium">Nenhum cliente em estado de alerta</p>
            <p className="text-[11px] text-slate-400 mt-0.5">
              Sistemas e processos dos clientes estão com boa autonomia.
            </p>
          </div>
        )}
      </CardContent>
    </Card>
  )
}
