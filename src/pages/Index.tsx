import { useState, useEffect } from 'react'
import { useNavigate } from 'react-router-dom'
import { Button } from '@/components/ui/button'
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card'
import { getServiceRecords } from '@/services/service_records'
import { getClients } from '@/services/clients'
import { ServiceRecord, ClientRecord } from '@/types/service_record'
import { useAuth } from '@/hooks/use-auth'
import { useRealtime } from '@/hooks/use-realtime'
import { DashboardStats } from '@/components/DashboardStats'
import { ConsultantGamification } from '@/components/ConsultantGamification'
import { AutonomyScorecard } from '@/components/AutonomyScorecard'
import { TrainingPanel } from '@/components/TrainingPanel'
import { QuickLog } from '@/components/QuickLog'
import { StatusBadge } from '@/components/StatusBadge'
import { Zap, PlusCircle, Headset, Keyboard } from 'lucide-react'
import { format } from 'date-fns'
import { ptBR } from 'date-fns/locale'

export default function Index() {
  const { user } = useAuth()
  const navigate = useNavigate()
  const [records, setRecords] = useState<ServiceRecord[]>([])
  const [clients, setClients] = useState<ClientRecord[]>([])
  const [quickLogOpen, setQuickLogOpen] = useState(false)

  const loadData = async () => {
    try {
      const [r, c] = await Promise.all([getServiceRecords(), getClients()])
      setRecords(r)
      setClients(c)
    } catch (err) {
      console.error(err)
    }
  }

  useEffect(() => {
    loadData()
  }, [])
  useRealtime('service_records', () => loadData())
  useRealtime('clients', () => loadData())

  const todayStr = new Date().toISOString().substring(0, 10)
  const todayRecords = records.filter((r) => r.created?.startsWith(todayStr))
  const myRecords = records.filter((r) => r.assigned_user === user?.id || r.user_id === user?.id)
  const recentRecords = records.slice(0, 6)

  const stats = {
    todayCount: todayRecords.length,
    totalCount: records.length,
    inProgressCount: records.filter((r) => r.status === 'Em Andamento').length,
    completedTodayCount: todayRecords.filter((r) => r.status === 'Concluído').length,
    avgDuration:
      records.length > 0
        ? Math.round(records.reduce((a, r) => a + (r.duration || 0), 0) / records.length)
        : 0,
    wrongDeptCount: records.filter((r) => r.avoidable_contact).length,
  }

  return (
    <div className="space-y-6">
      <div className="flex flex-col sm:flex-row sm:items-center sm:justify-between gap-4">
        <div>
          <h2 className="text-2xl font-extrabold tracking-tight text-slate-900">
            Olá, {user?.name?.split(' ')[0] || 'Consultor'}! 👋
          </h2>
          <p className="text-xs text-slate-500">Acompanhe seus atendimentos e desempenho</p>
        </div>
        <div className="flex gap-2">
          <Button
            onClick={() => setQuickLogOpen(true)}
            className="bg-gradient-to-r from-cyan-600 to-indigo-600 hover:from-cyan-700 hover:to-indigo-700 font-bold"
          >
            <Zap className="h-4 w-4 mr-1.5" /> Registro Expresso
          </Button>
          <Button variant="outline" onClick={() => navigate('/novo-atendimento')}>
            <PlusCircle className="h-4 w-4 mr-1.5" /> Novo Atendimento
          </Button>
        </div>
      </div>

      <div className="flex items-center gap-2 text-xs text-slate-400">
        <Keyboard className="h-3.5 w-3.5" />
        <span>
          Dica: pressione{' '}
          <kbd className="px-1.5 py-0.5 rounded bg-slate-100 border border-slate-300 font-mono text-[10px]">
            Ctrl+N
          </kbd>{' '}
          para registro expresso
        </span>
      </div>

      <DashboardStats {...stats} />

      <div className="grid grid-cols-1 lg:grid-cols-3 gap-4">
        <ConsultantGamification records={myRecords} userName={user?.name || ''} />
        <Card className="lg:col-span-2 border-slate-200 shadow-subtle">
          <CardHeader className="pb-2">
            <CardTitle className="text-sm font-bold text-slate-900 flex items-center gap-2">
              <Headset className="h-4 w-4 text-indigo-600" /> Atendimentos Recentes
            </CardTitle>
          </CardHeader>
          <CardContent className="space-y-2">
            {recentRecords.length === 0 && (
              <p className="text-xs text-slate-400 text-center py-4">Nenhum atendimento recente.</p>
            )}
            {recentRecords.map((r) => (
              <div
                key={r.id}
                className="flex items-center justify-between p-2.5 bg-slate-50 rounded-lg"
              >
                <div className="min-w-0 flex-1">
                  <p className="text-xs font-bold text-slate-900 truncate">
                    {r.client_company || r.client_name}
                  </p>
                  <p className="text-[10px] text-slate-500 truncate">
                    {r.contact_reason} — {r.description.substring(0, 60)}
                  </p>
                </div>
                <div className="flex items-center gap-2 shrink-0">
                  <StatusBadge status={r.status} />
                  <span className="text-[10px] text-slate-400">
                    {r.created ? format(new Date(r.created), 'dd/MM HH:mm', { locale: ptBR }) : ''}
                  </span>
                </div>
              </div>
            ))}
          </CardContent>
        </Card>
      </div>

      <div className="grid grid-cols-1 lg:grid-cols-2 gap-4">
        <AutonomyScorecard records={records} />
        <TrainingPanel records={records} />
      </div>

      <QuickLog open={quickLogOpen} onOpenChange={setQuickLogOpen} onSuccess={loadData} />
    </div>
  )
}
