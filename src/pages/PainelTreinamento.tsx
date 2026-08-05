import { useState, useEffect, useMemo, useCallback } from 'react'
import { useNavigate } from 'react-router-dom'
import { Card } from '@/components/ui/card'
import { Button } from '@/components/ui/button'
import { Badge } from '@/components/ui/badge'
import { getServiceRecords } from '@/services/service_records'
import { getClients } from '@/services/clients'
import { getTrainings } from '@/services/trainings'
import { useRealtime } from '@/hooks/use-realtime'
import { useAuth } from '@/hooks/use-auth'
import { ClientRecord, ServiceRecord } from '@/types/service_record'
import { TrainingRecord } from '@/types/training'
import { TrainingReportModal } from '@/components/TrainingReportModal'
import { NewTrainingDialog } from '@/components/NewTrainingDialog'
import { GraduationCap, FileText, TrendingUp, Plus, Calendar } from 'lucide-react'
import { format } from 'date-fns'
import { ptBR } from 'date-fns/locale'

export default function PainelTreinamento() {
  const navigate = useNavigate()
  const { user } = useAuth()
  const [clients, setClients] = useState<ClientRecord[]>([])
  const [records, setRecords] = useState<ServiceRecord[]>([])
  const [trainings, setTrainings] = useState<TrainingRecord[]>([])
  const [reportClient, setReportClient] = useState<ClientRecord | undefined>()
  const [reportOpen, setReportOpen] = useState(false)
  const [newTrainingOpen, setNewTrainingOpen] = useState(false)

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
  useRealtime('service_records', () => loadData())
  useRealtime('trainings', () => loadData())

  const agencyStats = useMemo(() => {
    const map = new Map<
      string,
      { client: ClientRecord; records: ServiceRecord[]; trainings: TrainingRecord[] }
    >()
    for (const c of clients) {
      if (!c.company) continue
      if (!map.has(c.company)) map.set(c.company, { client: c, records: [], trainings: [] })
    }
    for (const r of records) {
      const company = r.client_company || r.expand?.client?.company
      if (!company) continue
      const entry = map.get(company)
      if (entry) entry.records.push(r)
    }
    for (const t of trainings) {
      const client = clients.find((c) => c.id === t.client)
      const company = client?.company
      if (!company) continue
      const entry = map.get(company)
      if (entry) entry.trainings.push(t)
    }
    return Array.from(map.entries())
      .map(([company, data]) => {
        const total = data.records.length
        const avoidable = data.records.filter((r) => r.avoidable_contact).length
        const rate = total > 0 ? Math.round((avoidable / total) * 100) : 0
        return { company, ...data, total, avoidable, rate }
      })
      .sort((a, b) => b.total - a.total)
  }, [clients, records, trainings])

  if (user?.role === 'Consultores') {
    return (
      <div className="space-y-6">
        <h2 className="text-2xl font-extrabold text-slate-900">Painel de Treinamento</h2>
        <Card className="p-8 text-center">
          <p className="text-sm text-slate-500">Você não tem permissão para acessar esta página.</p>
        </Card>
      </div>
    )
  }

  return (
    <div className="space-y-6">
      <div className="flex flex-col sm:flex-row sm:items-center sm:justify-between gap-4">
        <div>
          <h2 className="text-2xl font-extrabold tracking-tight text-slate-900">
            Painel de Treinamento por Agência
          </h2>
          <p className="text-xs text-slate-500">Gestão de treinamentos e relatórios por agência</p>
        </div>
        <Button
          onClick={() => setNewTrainingOpen(true)}
          size="sm"
          className="bg-indigo-600 hover:bg-indigo-700"
        >
          <Plus className="h-4 w-4 mr-1" /> Novo Treinamento
        </Button>
      </div>

      {agencyStats.length === 0 ? (
        <Card className="p-8 text-center">
          <GraduationCap className="h-10 w-10 text-slate-300 mx-auto mb-2" />
          <p className="text-sm text-slate-400">Nenhuma agência encontrada.</p>
        </Card>
      ) : (
        <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
          {agencyStats.map(
            ({ company, client, records: recs, trainings: trs, total, avoidable, rate }) => (
              <Card key={company} className="border-slate-200 shadow-subtle p-4 space-y-3">
                <div className="flex items-center justify-between">
                  <h4 className="text-sm font-bold text-slate-900">{company}</h4>
                  <Badge variant={rate > 30 ? 'destructive' : 'secondary'} className="text-xs">
                    {rate}% evitáveis
                  </Badge>
                </div>
                <div className="grid grid-cols-3 gap-2 text-center">
                  <div className="bg-slate-50 rounded p-1.5">
                    <p className="text-[10px] text-slate-500 uppercase">Atend.</p>
                    <p className="text-base font-black text-slate-900">{total}</p>
                  </div>
                  <div className="bg-amber-50 rounded p-1.5">
                    <p className="text-[10px] text-amber-700 uppercase">Evitáveis</p>
                    <p className="text-base font-black text-slate-900">{avoidable}</p>
                  </div>
                  <div className="bg-indigo-50 rounded p-1.5">
                    <p className="text-[10px] text-indigo-700 uppercase">Treinos</p>
                    <p className="text-base font-black text-slate-900">{trs.length}</p>
                  </div>
                </div>
                {trs.length > 0 && (
                  <div className="text-xs text-slate-500 space-y-0.5">
                    {trs.slice(0, 2).map((t) => (
                      <div key={t.id} className="flex items-center gap-1">
                        <Calendar className="h-3 w-3" />
                        {t.name} —{' '}
                        {format(new Date(t.training_date), 'dd/MM/yyyy', { locale: ptBR })}
                      </div>
                    ))}
                  </div>
                )}
                <div className="flex gap-2 pt-1 border-t">
                  <Button
                    variant="outline"
                    size="sm"
                    className="text-xs flex-1"
                    onClick={() => {
                      setReportClient(client)
                      setReportOpen(true)
                    }}
                  >
                    <FileText className="h-3.5 w-3.5 mr-1" /> Relatório
                  </Button>
                  <Button
                    variant="ghost"
                    size="sm"
                    className="text-xs flex-1 text-indigo-600"
                    onClick={() => navigate(`/evolucao-treinamento?client=${client?.id || ''}`)}
                  >
                    <TrendingUp className="h-3.5 w-3.5 mr-1" /> Evolução
                  </Button>
                </div>
              </Card>
            ),
          )}
        </div>
      )}

      <TrainingReportModal
        open={reportOpen}
        onOpenChange={setReportOpen}
        records={
          reportClient
            ? records.filter(
                (r) => r.client_company === reportClient.company || r.client === reportClient.id,
              )
            : []
        }
        client={reportClient}
      />
      <NewTrainingDialog
        open={newTrainingOpen}
        onOpenChange={setNewTrainingOpen}
        clients={clients}
        onSuccess={loadData}
      />
    </div>
  )
}
