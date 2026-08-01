import { useState, useEffect } from 'react'
import { Link } from 'react-router-dom'
import { Card, CardContent } from '@/components/ui/card'
import { Button } from '@/components/ui/button'
import {
  Table,
  TableBody,
  TableCell,
  TableHead,
  TableHeader,
  TableRow,
} from '@/components/ui/table'
import { getServiceRecords } from '@/services/service_records'
import { ServiceRecord } from '@/types/service_record'
import { StatusBadge } from '@/components/StatusBadge'
import { PriorityBadge } from '@/components/PriorityBadge'
import { ServiceRecordDetailModal } from '@/components/ServiceRecordDetailModal'
import { NovoAtendimentoModal } from '@/components/NovoAtendimentoModal'
import { useRealtime } from '@/hooks/use-realtime'
import { Headset, PlayCircle, CheckCircle2, Clock, Plus, Eye, ArrowUpRight } from 'lucide-react'
import { useAuth } from '@/hooks/use-auth'
import { MinhasTarefasList } from '@/components/MinhasTarefasList'
import { format } from 'date-fns'
import { ptBR } from 'date-fns/locale'

export default function Index() {
  const [records, setRecords] = useState<ServiceRecord[]>([])
  const [selectedRecord, setSelectedRecord] = useState<ServiceRecord | null>(null)
  const [detailOpen, setDetailOpen] = useState(false)
  const [novoModalOpen, setNovoModalOpen] = useState(false)
  const { user } = useAuth()

  const loadData = async () => {
    try {
      const list = await getServiceRecords('', '-created')
      setRecords(list)
    } catch (err) {
      console.error(err)
    }
  }

  useEffect(() => {
    loadData()
  }, [])

  useRealtime('service_records', () => {
    loadData()
  })

  const todayStr = new Date().toISOString().split('T')[0]
  const todayRecords = records.filter((r) => r.created && r.created.startsWith(todayStr))
  const inProgressRecords = records.filter((r) => r.status === 'Em Andamento')
  const completedToday = records.filter(
    (r) => r.status === 'Concluído' && r.updated && r.updated.startsWith(todayStr),
  )

  const myRecords = records.filter((r) => r.assigned_user === user?.id)
  const totalDuration = records.reduce((acc, r) => acc + (r.duration || 0), 0)
  const avgDuration = records.length > 0 ? Math.round(totalDuration / records.length) : 0

  return (
    <div className="space-y-6">
      <div className="flex flex-col sm:flex-row sm:items-center sm:justify-between gap-4">
        <div>
          <h2 className="text-2xl font-extrabold tracking-tight text-slate-900">
            Painel Geral de Atendimentos
          </h2>
          <p className="text-xs text-slate-500">
            Acompanhamento em tempo real das interações com clientes
          </p>
        </div>
        <div className="flex gap-2">
          <Button
            onClick={() => setNovoModalOpen(true)}
            className="bg-gradient-to-r from-cyan-600 via-indigo-600 to-purple-600 hover:from-cyan-700 hover:via-indigo-700 hover:to-purple-700 text-white font-bold shadow-md transition-all"
          >
            <Plus className="h-4 w-4 mr-1.5" />
            Novo Atendimento
          </Button>
        </div>
      </div>

      <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-4 gap-4">
        <Card className="border-slate-200 shadow-subtle hover:shadow-elevation transition-all bg-gradient-to-br from-white via-cyan-50/20 to-blue-50/30 border-t-4 border-t-cyan-500">
          <CardContent className="p-4 flex items-center justify-between">
            <div>
              <p className="text-xs font-bold text-slate-500 uppercase tracking-wider">
                Atendimentos Hoje
              </p>
              <h3 className="text-2xl font-black text-slate-900 mt-1">{todayRecords.length}</h3>
              <p className="text-[11px] text-cyan-600 font-semibold mt-1 flex items-center gap-0.5">
                {records.length} no total registrado
              </p>
            </div>
            <div className="h-12 w-12 rounded-xl bg-cyan-100/80 text-cyan-700 flex items-center justify-center shadow-xs">
              <Headset className="h-6 w-6" />
            </div>
          </CardContent>
        </Card>

        <Card className="border-slate-200 shadow-subtle hover:shadow-elevation transition-all bg-gradient-to-br from-white via-purple-50/20 to-indigo-50/30 border-t-4 border-t-purple-500">
          <CardContent className="p-4 flex items-center justify-between">
            <div>
              <p className="text-xs font-bold text-slate-500 uppercase tracking-wider">
                Em Andamento
              </p>
              <h3 className="text-2xl font-black text-slate-900 mt-1">
                {inProgressRecords.length}
              </h3>
              <p className="text-[11px] text-purple-600 font-semibold mt-1">
                Requer atenção imediata
              </p>
            </div>
            <div className="h-12 w-12 rounded-xl bg-purple-100/80 text-purple-700 flex items-center justify-center shadow-xs">
              <PlayCircle className="h-6 w-6" />
            </div>
          </CardContent>
        </Card>

        <Card className="border-slate-200 shadow-subtle hover:shadow-elevation transition-all bg-gradient-to-br from-white via-emerald-50/20 to-teal-50/30 border-t-4 border-t-emerald-500">
          <CardContent className="p-4 flex items-center justify-between">
            <div>
              <p className="text-xs font-bold text-slate-500 uppercase tracking-wider">
                Concluídos Hoje
              </p>
              <h3 className="text-2xl font-black text-slate-900 mt-1">{completedToday.length}</h3>
              <p className="text-[11px] text-emerald-600 font-semibold mt-1">
                Resolvidos com sucesso
              </p>
            </div>
            <div className="h-12 w-12 rounded-xl bg-emerald-100/80 text-emerald-700 flex items-center justify-center shadow-xs">
              <CheckCircle2 className="h-6 w-6" />
            </div>
          </CardContent>
        </Card>

        <Card className="border-slate-200 shadow-subtle hover:shadow-elevation transition-all bg-gradient-to-br from-white via-rose-50/20 to-orange-50/30 border-t-4 border-t-rose-400">
          <CardContent className="p-4 flex items-center justify-between">
            <div>
              <p className="text-xs font-bold text-slate-500 uppercase tracking-wider">
                Tempo Médio
              </p>
              <h3 className="text-2xl font-black text-slate-900 mt-1">{avgDuration} min</h3>
              <p className="text-[11px] text-rose-600 font-semibold mt-1">
                Duração média de chamado
              </p>
            </div>
            <div className="h-12 w-12 rounded-xl bg-rose-100/80 text-rose-700 flex items-center justify-center shadow-xs">
              <Clock className="h-6 w-6" />
            </div>
          </CardContent>
        </Card>
      </div>

      <div>
        <div className="flex items-center justify-between mb-3">
          <h3 className="text-base font-bold text-slate-900">Minhas Tarefas</h3>
          <span className="text-xs text-slate-500">{myRecords.length} atribuída(s) a você</span>
        </div>
        <MinhasTarefasList
          records={myRecords}
          onViewRecord={(r) => {
            setSelectedRecord(r)
            setDetailOpen(true)
          }}
        />
      </div>

      <Card className="border-slate-200 shadow-subtle">
        <div className="p-4 border-b border-slate-100 flex items-center justify-between">
          <div>
            <h3 className="text-base font-bold text-slate-900">Atividades Recentes</h3>
            <p className="text-xs text-slate-500">Últimos atendimentos registrados no sistema</p>
          </div>
          <Link
            to="/atendimentos"
            className="text-xs font-bold text-cyan-600 hover:text-cyan-800 flex items-center gap-1"
          >
            Ver Todos <ArrowUpRight className="h-3.5 w-3.5" />
          </Link>
        </div>

        <div className="overflow-x-auto">
          <Table>
            <TableHeader className="bg-slate-50">
              <TableRow>
                <TableHead className="text-xs font-bold">Cliente</TableHead>
                <TableHead className="text-xs font-bold">Motivo</TableHead>
                <TableHead className="text-xs font-bold">Status</TableHead>
                <TableHead className="text-xs font-bold">Prioridade</TableHead>
                <TableHead className="text-xs font-bold">Duração</TableHead>
                <TableHead className="text-xs font-bold">Data/Hora</TableHead>
                <TableHead className="text-xs font-bold text-right">Ação</TableHead>
              </TableRow>
            </TableHeader>
            <TableBody>
              {records.slice(0, 10).map((r) => (
                <TableRow
                  key={r.id}
                  className="cursor-pointer hover:bg-slate-50 transition-colors"
                  onClick={() => {
                    setSelectedRecord(r)
                    setDetailOpen(true)
                  }}
                >
                  <TableCell className="font-semibold text-slate-900 text-xs">
                    {r.client_name}
                    {r.client_company && (
                      <span className="block text-[10px] text-slate-500 font-normal">
                        {r.client_company}
                      </span>
                    )}
                  </TableCell>
                  <TableCell className="text-xs text-slate-700">{r.contact_reason}</TableCell>
                  <TableCell>
                    <StatusBadge status={r.status} />
                  </TableCell>
                  <TableCell>
                    <PriorityBadge priority={r.priority} />
                  </TableCell>
                  <TableCell className="text-xs text-slate-600 font-medium">
                    {r.duration ? `${r.duration} min` : '-'}
                  </TableCell>
                  <TableCell className="text-xs text-slate-500">
                    {r.created
                      ? format(new Date(r.created), 'dd/MM/yyyy HH:mm', { locale: ptBR })
                      : '-'}
                  </TableCell>
                  <TableCell className="text-right">
                    <Button variant="ghost" size="icon" className="h-8 w-8 text-indigo-600">
                      <Eye className="h-4 w-4" />
                    </Button>
                  </TableCell>
                </TableRow>
              ))}
              {records.length === 0 && (
                <TableRow>
                  <TableCell colSpan={7} className="text-center py-8 text-slate-400 text-xs">
                    Nenhum atendimento registrado ainda.
                  </TableCell>
                </TableRow>
              )}
            </TableBody>
          </Table>
        </div>
      </Card>

      <Button
        onClick={() => setNovoModalOpen(true)}
        className="fixed bottom-6 right-6 h-14 w-14 rounded-full bg-gradient-to-r from-cyan-500 via-indigo-600 to-purple-600 hover:from-cyan-600 hover:via-indigo-700 hover:to-purple-700 text-white shadow-xl flex items-center justify-center transition-transform hover:scale-105 z-30"
      >
        <Plus className="h-7 w-7" />
      </Button>

      <ServiceRecordDetailModal
        record={selectedRecord}
        open={detailOpen}
        onOpenChange={setDetailOpen}
        onUpdateSuccess={loadData}
      />

      <NovoAtendimentoModal
        open={novoModalOpen}
        onOpenChange={setNovoModalOpen}
        onSuccess={loadData}
      />
    </div>
  )
}
