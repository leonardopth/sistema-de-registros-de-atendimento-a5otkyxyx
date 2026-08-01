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
import { format } from 'date-fns'
import { ptBR } from 'date-fns/locale'

export default function Index() {
  const [records, setRecords] = useState<ServiceRecord[]>([])
  const [selectedRecord, setSelectedRecord] = useState<ServiceRecord | null>(null)
  const [detailOpen, setDetailOpen] = useState(false)
  const [novoModalOpen, setNovoModalOpen] = useState(false)

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
            className="bg-indigo-600 hover:bg-indigo-700 font-semibold shadow-sm"
          >
            <Plus className="h-4 w-4 mr-1.5" />
            Novo Atendimento
          </Button>
        </div>
      </div>

      <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-4 gap-4">
        <Card className="border-slate-200 shadow-subtle hover:shadow-elevation transition-all bg-gradient-to-br from-white to-blue-50/30">
          <CardContent className="p-4 flex items-center justify-between">
            <div>
              <p className="text-xs font-semibold text-slate-500 uppercase tracking-wider">
                Atendimentos Hoje
              </p>
              <h3 className="text-2xl font-black text-slate-900 mt-1">{todayRecords.length}</h3>
              <p className="text-[11px] text-blue-600 font-medium mt-1 flex items-center gap-0.5">
                {records.length} no total registrado
              </p>
            </div>
            <div className="h-12 w-12 rounded-xl bg-blue-100 text-blue-600 flex items-center justify-center">
              <Headset className="h-6 w-6" />
            </div>
          </CardContent>
        </Card>

        <Card className="border-slate-200 shadow-subtle hover:shadow-elevation transition-all bg-gradient-to-br from-white to-amber-50/30">
          <CardContent className="p-4 flex items-center justify-between">
            <div>
              <p className="text-xs font-semibold text-slate-500 uppercase tracking-wider">
                Em Andamento
              </p>
              <h3 className="text-2xl font-black text-slate-900 mt-1">
                {inProgressRecords.length}
              </h3>
              <p className="text-[11px] text-amber-600 font-medium mt-1">Requer atenção imediata</p>
            </div>
            <div className="h-12 w-12 rounded-xl bg-amber-100 text-amber-600 flex items-center justify-center">
              <PlayCircle className="h-6 w-6" />
            </div>
          </CardContent>
        </Card>

        <Card className="border-slate-200 shadow-subtle hover:shadow-elevation transition-all bg-gradient-to-br from-white to-emerald-50/30">
          <CardContent className="p-4 flex items-center justify-between">
            <div>
              <p className="text-xs font-semibold text-slate-500 uppercase tracking-wider">
                Concluídos Hoje
              </p>
              <h3 className="text-2xl font-black text-slate-900 mt-1">{completedToday.length}</h3>
              <p className="text-[11px] text-emerald-600 font-medium mt-1">
                Resolvidos com sucesso
              </p>
            </div>
            <div className="h-12 w-12 rounded-xl bg-emerald-100 text-emerald-600 flex items-center justify-center">
              <CheckCircle2 className="h-6 w-6" />
            </div>
          </CardContent>
        </Card>

        <Card className="border-slate-200 shadow-subtle hover:shadow-elevation transition-all bg-gradient-to-br from-white to-indigo-50/30">
          <CardContent className="p-4 flex items-center justify-between">
            <div>
              <p className="text-xs font-semibold text-slate-500 uppercase tracking-wider">
                Tempo Médio
              </p>
              <h3 className="text-2xl font-black text-slate-900 mt-1">{avgDuration} min</h3>
              <p className="text-[11px] text-indigo-600 font-medium mt-1">
                Duração média de chamado
              </p>
            </div>
            <div className="h-12 w-12 rounded-xl bg-indigo-100 text-indigo-600 flex items-center justify-center">
              <Clock className="h-6 w-6" />
            </div>
          </CardContent>
        </Card>
      </div>

      <Card className="border-slate-200 shadow-subtle">
        <div className="p-4 border-b border-slate-100 flex items-center justify-between">
          <div>
            <h3 className="text-base font-bold text-slate-900">Atividades Recentes</h3>
            <p className="text-xs text-slate-500">Últimos atendimentos registrados no sistema</p>
          </div>
          <Link
            to="/atendimentos"
            className="text-xs font-semibold text-indigo-600 hover:text-indigo-800 flex items-center gap-1"
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
        className="fixed bottom-6 right-6 h-14 w-14 rounded-full bg-indigo-600 hover:bg-indigo-700 text-white shadow-elevation flex items-center justify-center transition-transform hover:scale-105 z-30"
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
