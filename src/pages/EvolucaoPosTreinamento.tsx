import { useState, useEffect, useMemo, useCallback } from 'react'
import { useSearchParams } from 'react-router-dom'
import { Card, CardContent } from '@/components/ui/card'
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from '@/components/ui/select'
import { Label } from '@/components/ui/label'
import { getServiceRecords } from '@/services/service_records'
import { getClients } from '@/services/clients'
import { getTrainings } from '@/services/trainings'
import { useRealtime } from '@/hooks/use-realtime'
import { ClientRecord, ServiceRecord } from '@/types/service_record'
import { TrainingRecord } from '@/types/training'
import {
  ChartContainer,
  ChartTooltip,
  ChartTooltipContent,
  type ChartConfig,
} from '@/components/ui/chart'
import { Bar, BarChart, XAxis, YAxis, CartesianGrid, Legend } from 'recharts'
import { format } from 'date-fns'
import { ptBR } from 'date-fns/locale'

const DAY = 86400000
const chartConfig: ChartConfig = {
  before: { label: 'Antes', color: 'hsl(200, 70%, 50%)' },
  d30: { label: '30 dias', color: 'hsl(150, 60%, 45%)' },
  d60: { label: '60 dias', color: 'hsl(45, 80%, 50%)' },
  d90: { label: '90 dias', color: 'hsl(0, 70%, 55%)' },
}

function calcRate(records: ServiceRecord[], from: Date, to: Date): number {
  const filtered = records.filter((r) => {
    const d = new Date(r.created)
    return d >= from && d < to
  })
  if (filtered.length === 0) return 0
  return Math.round((filtered.filter((r) => r.avoidable_contact).length / filtered.length) * 100)
}

export default function EvolucaoPosTreinamento() {
  const [params] = useSearchParams()
  const [clients, setClients] = useState<ClientRecord[]>([])
  const [records, setRecords] = useState<ServiceRecord[]>([])
  const [trainings, setTrainings] = useState<TrainingRecord[]>([])
  const [selectedClientId, setSelectedClientId] = useState(params.get('client') || '')

  const loadData = useCallback(async () => {
    try {
      const [c, r, t] = await Promise.all([getClients(), getServiceRecords(), getTrainings()])
      setClients(c)
      setRecords(r)
      setTrainings(t)
    } catch (err) {
      console.error(err)
    }
  }, [])

  useEffect(() => {
    loadData()
  }, [loadData])
  useRealtime('trainings', () => loadData())
  useRealtime('service_records', () => loadData())

  const agencyRecords = useMemo(() => {
    if (!selectedClientId) return []
    const client = clients.find((c) => c.id === selectedClientId)
    if (!client) return []
    return records.filter(
      (r) => r.client_company === client.company || r.client === selectedClientId,
    )
  }, [records, clients, selectedClientId])

  const evolutionData = useMemo(() => {
    const clientTrainings = trainings.filter((t) => t.client === selectedClientId)
    return clientTrainings.map((t) => {
      const d = new Date(t.training_date)
      const before = calcRate(agencyRecords, new Date(d.getTime() - 90 * DAY), d)
      const d30 = calcRate(agencyRecords, d, new Date(d.getTime() + 30 * DAY))
      const d60 = calcRate(agencyRecords, d, new Date(d.getTime() + 60 * DAY))
      const d90 = calcRate(agencyRecords, d, new Date(d.getTime() + 90 * DAY))
      return {
        name: format(d, 'dd/MM/yy', { locale: ptBR }),
        label: t.name,
        before,
        d30,
        d60,
        d90,
      }
    })
  }, [trainings, selectedClientId, agencyRecords])

  return (
    <div className="space-y-6">
      <div>
        <h2 className="text-2xl font-extrabold tracking-tight text-slate-900">
          Dashboard de Evolução Pós-Treinamento
        </h2>
        <p className="text-xs text-slate-500">
          Comparação da taxa de contatos evitáveis antes e após cada treinamento (30/60/90 dias)
        </p>
      </div>

      <Card className="border-slate-200 shadow-subtle p-4">
        <div className="space-y-1.5 max-w-xs">
          <Label className="text-xs">Selecionar Agência</Label>
          <Select value={selectedClientId} onValueChange={setSelectedClientId}>
            <SelectTrigger className="h-9 text-xs">
              <SelectValue placeholder="Escolha uma agência..." />
            </SelectTrigger>
            <SelectContent>
              {clients
                .filter(
                  (c, i, arr) => c.company && arr.findIndex((c2) => c2.company === c.company) === i,
                )
                .map((c) => (
                  <SelectItem key={c.id} value={c.id}>
                    {c.company}
                  </SelectItem>
                ))}
            </SelectContent>
          </Select>
        </div>
      </Card>

      {!selectedClientId ? (
        <Card className="p-8 text-center">
          <p className="text-sm text-slate-400">
            Selecione uma agência para visualizar a evolução.
          </p>
        </Card>
      ) : evolutionData.length === 0 ? (
        <Card className="p-8 text-center">
          <p className="text-sm text-slate-400">
            Nenhum treinamento registrado para esta agência. Registre treinamentos no Painel de
            Treinamento.
          </p>
        </Card>
      ) : (
        <Card className="border-slate-200 shadow-subtle">
          <CardContent className="p-4">
            <ChartContainer config={chartConfig} className="h-[320px] w-full">
              <BarChart data={evolutionData} barGap={2}>
                <CartesianGrid strokeDasharray="3 3" vertical={false} />
                <XAxis dataKey="name" tick={{ fontSize: 11 }} />
                <YAxis tick={{ fontSize: 11 }} domain={[0, 100]} unit="%" />
                <ChartTooltip content={<ChartTooltipContent />} />
                <Legend wrapperStyle={{ fontSize: 11 }} />
                <Bar dataKey="before" fill={chartConfig.before.color} radius={[3, 3, 0, 0]} />
                <Bar dataKey="d30" fill={chartConfig.d30.color} radius={[3, 3, 0, 0]} />
                <Bar dataKey="d60" fill={chartConfig.d60.color} radius={[3, 3, 0, 0]} />
                <Bar dataKey="d90" fill={chartConfig.d90.color} radius={[3, 3, 0, 0]} />
              </BarChart>
            </ChartContainer>
            <div className="mt-4 space-y-2">
              {evolutionData.map((e, i) => (
                <div
                  key={i}
                  className="flex items-center justify-between text-xs p-2 bg-slate-50 rounded"
                >
                  <span className="font-medium text-slate-700">
                    {e.label} ({e.name})
                  </span>
                  <div className="flex gap-3">
                    <span>
                      Antes: <strong>{e.before}%</strong>
                    </span>
                    <span>
                      30d:{' '}
                      <strong className={e.d30 < e.before ? 'text-emerald-600' : 'text-rose-600'}>
                        {e.d30}%
                      </strong>
                    </span>
                    <span>
                      60d:{' '}
                      <strong className={e.d60 < e.before ? 'text-emerald-600' : 'text-rose-600'}>
                        {e.d60}%
                      </strong>
                    </span>
                    <span>
                      90d:{' '}
                      <strong className={e.d90 < e.before ? 'text-emerald-600' : 'text-rose-600'}>
                        {e.d90}%
                      </strong>
                    </span>
                  </div>
                </div>
              ))}
            </div>
          </CardContent>
        </Card>
      )}
    </div>
  )
}
