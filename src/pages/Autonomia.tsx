import { useState, useEffect } from 'react'
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card'
import { Button } from '@/components/ui/button'
import { Input } from '@/components/ui/input'
import { Dialog, DialogContent, DialogHeader, DialogTitle } from '@/components/ui/dialog'
import { getServiceRecords } from '@/services/service_records'
import { getClients } from '@/services/clients'
import { computeClientAutonomy, computeAutonomyEvolution } from '@/lib/autonomy'
import { AutonomyEvolutionChart } from '@/components/AutonomyEvolutionChart'
import { useRealtime } from '@/hooks/use-realtime'
import { useAuth } from '@/hooks/use-auth'
import { filterRecordsByUserAccess, filterClientsByUserAccess } from '@/lib/service-group-access'
import type { ServiceRecord, ClientRecord } from '@/types/service_record'
import { Award, TrendingUp, Search, Eye, AlertTriangle } from 'lucide-react'

export default function Autonomia() {
  const { user } = useAuth()
  const [records, setRecords] = useState<ServiceRecord[]>([])
  const [clients, setClients] = useState<ClientRecord[]>([])
  const [search, setSearch] = useState('')
  const [evolutionClient, setEvolutionClient] = useState<string | null>(null)

  const loadData = async () => {
    const [r, c] = await Promise.all([
      getServiceRecords().catch(() => []),
      getClients().catch(() => []),
    ])
    setRecords(Array.isArray(r) ? r : [])
    setClients(Array.isArray(c) ? c : [])
  }

  useEffect(() => {
    loadData()
  }, [])

  useRealtime('service_records', () => loadData())
  useRealtime('clients', () => loadData())

  const accessibleRecords = filterRecordsByUserAccess(records, user)
  const accessibleClients = filterClientsByUserAccess(clients, user)

  const autonomyData = computeClientAutonomy(accessibleRecords, accessibleClients)

  const filteredData = autonomyData.filter(
    (d) =>
      d.clientName.toLowerCase().includes(search.toLowerCase()) ||
      d.companyName.toLowerCase().includes(search.toLowerCase()),
  )

  const evolutionData = evolutionClient
    ? computeAutonomyEvolution(accessibleRecords, evolutionClient)
    : []

  const avgAutonomy =
    autonomyData.length > 0
      ? Math.round(autonomyData.reduce((a, c) => a + c.autonomyRate, 0) / autonomyData.length)
      : 0

  const totalAvoidable = accessibleRecords.filter((r) => r.avoidable_contact).length

  const getRateColor = (rate: number) =>
    rate >= 80 ? 'text-emerald-600' : rate >= 50 ? 'text-amber-600' : 'text-rose-600'

  const getBarColor = (rate: number) =>
    rate >= 80 ? 'bg-emerald-500' : rate >= 50 ? 'bg-amber-500' : 'bg-rose-500'

  return (
    <div className="space-y-6">
      <div>
        <h2 className="text-2xl font-extrabold tracking-tight text-slate-900">
          Índice de Autonomia
        </h2>
        <p className="text-xs text-slate-500">
          Acompanhe a autonomia de cada cliente e sua evolução ao longo do tempo
        </p>
      </div>

      <div className="grid grid-cols-1 sm:grid-cols-3 gap-4">
        <Card className="border-slate-200 shadow-subtle">
          <CardContent className="p-4">
            <div className="flex items-center gap-2">
              <Award className="h-8 w-8 text-emerald-600" />
              <div>
                <p className="text-xs text-slate-500">Autonomia Média</p>
                <p className="text-xl font-bold text-slate-900">{avgAutonomy}%</p>
              </div>
            </div>
          </CardContent>
        </Card>
        <Card className="border-slate-200 shadow-subtle">
          <CardContent className="p-4">
            <div className="flex items-center gap-2">
              <TrendingUp className="h-8 w-8 text-indigo-600" />
              <div>
                <p className="text-xs text-slate-500">Total de Registros</p>
                <p className="text-xl font-bold text-slate-900">{accessibleRecords.length}</p>
              </div>
            </div>
          </CardContent>
        </Card>
        <Card className="border-slate-200 shadow-subtle">
          <CardContent className="p-4">
            <div className="flex items-center gap-2">
              <AlertTriangle className="h-8 w-8 text-amber-600" />
              <div>
                <p className="text-xs text-slate-500">Contatos Evitáveis</p>
                <p className="text-xl font-bold text-slate-900">{totalAvoidable}</p>
              </div>
            </div>
          </CardContent>
        </Card>
      </div>

      <Card className="border-slate-200 shadow-subtle">
        <CardHeader className="pb-2">
          <CardTitle className="text-sm font-bold text-slate-900 flex items-center gap-2">
            <Award className="h-4 w-4 text-indigo-600" /> Clientes e Índice de Autonomia
          </CardTitle>
        </CardHeader>
        <CardContent className="space-y-3">
          <div className="relative">
            <Search className="absolute left-2.5 top-2.5 h-3.5 w-3.5 text-slate-400" />
            <Input
              placeholder="Buscar cliente..."
              value={search}
              onChange={(e) => setSearch(e.target.value)}
              className="pl-7 h-9 text-xs"
            />
          </div>

          {filteredData.length === 0 && (
            <p className="text-xs text-slate-400 text-center py-8">Nenhum cliente encontrado.</p>
          )}

          {filteredData.map((client) => (
            <div
              key={client.clientKey}
              className="flex items-center justify-between p-3 bg-slate-50 rounded-lg border border-slate-100"
            >
              <div className="flex-1 min-w-0">
                <p className="text-sm font-bold text-slate-900 truncate">
                  {client.companyName || client.clientName}
                </p>
                <div className="flex items-center gap-3 mt-1">
                  <span className="text-[10px] text-slate-500">{client.total} atendimento(s)</span>
                  <span className="text-[10px] text-rose-500">{client.avoidable} evitável(is)</span>
                  {client.threshold !== undefined && client.threshold > 0 && (
                    <span className="text-[10px] text-amber-600">
                      Meta: {100 - client.threshold}%+
                    </span>
                  )}
                </div>
              </div>
              <div className="flex items-center gap-3 shrink-0">
                <div className="text-right">
                  <div className={`text-lg font-bold ${getRateColor(client.autonomyRate)}`}>
                    {client.autonomyRate}%
                  </div>
                  <div className="w-24 h-1.5 bg-slate-200 rounded-full overflow-hidden">
                    <div
                      className={`h-full rounded-full ${getBarColor(client.autonomyRate)}`}
                      style={{ width: `${client.autonomyRate}%` }}
                    />
                  </div>
                </div>
                <Button
                  variant="outline"
                  size="sm"
                  className="h-8 text-xs"
                  onClick={() => setEvolutionClient(client.clientKey)}
                >
                  <Eye className="h-3.5 w-3.5 mr-1" />
                  Evolução
                </Button>
              </div>
            </div>
          ))}
        </CardContent>
      </Card>

      <Dialog open={!!evolutionClient} onOpenChange={(v) => !v && setEvolutionClient(null)}>
        <DialogContent className="sm:max-w-[600px]">
          <DialogHeader>
            <DialogTitle className="flex items-center gap-2 text-indigo-950 font-bold">
              <TrendingUp className="h-5 w-5 text-indigo-600" />
              Evolução da Autonomia — {evolutionClient || ''}
            </DialogTitle>
          </DialogHeader>
          <div className="space-y-4">
            <AutonomyEvolutionChart data={evolutionData} />
            {evolutionData.length > 0 && (
              <div className="grid grid-cols-3 gap-3 text-center">
                <div className="p-2 bg-slate-50 rounded-lg">
                  <p className="text-[10px] text-slate-500">Melhor Mês</p>
                  <p className="text-sm font-bold text-emerald-600">
                    {Math.max(...evolutionData.map((d) => d.autonomyRate))}%
                  </p>
                </div>
                <div className="p-2 bg-slate-50 rounded-lg">
                  <p className="text-[10px] text-slate-500">Pior Mês</p>
                  <p className="text-sm font-bold text-rose-600">
                    {Math.min(...evolutionData.map((d) => d.autonomyRate))}%
                  </p>
                </div>
                <div className="p-2 bg-slate-50 rounded-lg">
                  <p className="text-[10px] text-slate-500">Tendência</p>
                  <p className="text-sm font-bold text-slate-900">
                    {evolutionData.length >= 2
                      ? evolutionData[evolutionData.length - 1].autonomyRate >=
                        evolutionData[0].autonomyRate
                        ? '↑ Melhorando'
                        : '↓ Piorando'
                      : '-'}
                  </p>
                </div>
              </div>
            )}
          </div>
        </DialogContent>
      </Dialog>
    </div>
  )
}
