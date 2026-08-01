import { useState, useEffect } from 'react'
import { Card } from '@/components/ui/card'
import { Button } from '@/components/ui/button'
import { Input } from '@/components/ui/input'
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from '@/components/ui/select'
import {
  Table,
  TableBody,
  TableCell,
  TableHead,
  TableHeader,
  TableRow,
} from '@/components/ui/table'
import { Checkbox } from '@/components/ui/checkbox'
import {
  getServiceRecords,
  batchUpdateStatus,
  batchDeleteServiceRecords,
} from '@/services/service_records'
import { ServiceRecord, ServiceStatus, ContactReason } from '@/types/service_record'
import { StatusBadge } from '@/components/StatusBadge'
import { PriorityBadge } from '@/components/PriorityBadge'
import { ServiceRecordDetailModal } from '@/components/ServiceRecordDetailModal'
import { useRealtime } from '@/hooks/use-realtime'
import { useToast } from '@/hooks/use-toast'
import {
  Search,
  Filter,
  RotateCcw,
  Eye,
  CheckCircle2,
  Trash2,
  ArrowUpDown,
  ListChecks,
} from 'lucide-react'
import { useAuth } from '@/hooks/use-auth'
import { MinhasTarefasList } from '@/components/MinhasTarefasList'
import { format } from 'date-fns'
import { ptBR } from 'date-fns/locale'

export default function Atendimentos() {
  const [records, setRecords] = useState<ServiceRecord[]>([])
  const [search, setSearch] = useState('')
  const [statusFilter, setStatusFilter] = useState<string>('todos')
  const [reasonFilter, setReasonFilter] = useState<string>('todos')
  const [selectedIds, setSelectedIds] = useState<string[]>([])

  const [selectedRecord, setSelectedRecord] = useState<ServiceRecord | null>(null)
  const [detailOpen, setDetailOpen] = useState(false)
  const [sortAsc, setSortAsc] = useState(false)
  const [view, setView] = useState<'all' | 'mine'>('all')

  const { toast } = useToast()
  const { user } = useAuth()

  const loadData = async () => {
    try {
      const data = await getServiceRecords('', sortAsc ? 'created' : '-created')
      setRecords(data)
    } catch (err) {
      console.error(err)
    }
  }

  useEffect(() => {
    loadData()
  }, [sortAsc])

  useRealtime('service_records', () => {
    loadData()
  })

  const filteredRecords = records.filter((r) => {
    const matchesSearch =
      r.client_name.toLowerCase().includes(search.toLowerCase()) ||
      r.description.toLowerCase().includes(search.toLowerCase()) ||
      (r.client_company && r.client_company.toLowerCase().includes(search.toLowerCase()))

    const matchesStatus = statusFilter === 'todos' || r.status === statusFilter
    const matchesReason = reasonFilter === 'todos' || r.contact_reason === reasonFilter

    return matchesSearch && matchesStatus && matchesReason
  })

  const myRecords = filteredRecords.filter((r) => r.assigned_user === user?.id)

  const handleSelectAll = (checked: boolean) => {
    if (checked) {
      setSelectedIds(filteredRecords.map((r) => r.id))
    } else {
      setSelectedIds([])
    }
  }

  const handleSelectRow = (id: string, checked: boolean) => {
    if (checked) {
      setSelectedIds([...selectedIds, id])
    } else {
      setSelectedIds(selectedIds.filter((i) => i !== id))
    }
  }

  const handleBatchComplete = async () => {
    if (selectedIds.length === 0) return
    try {
      await batchUpdateStatus(selectedIds, 'Concluído')
      toast({
        title: 'Atendimentos atualizados',
        description: `${selectedIds.length} atendimento(s) marcados como concluídos.`,
      })
      setSelectedIds([])
      loadData()
    } catch (err) {
      toast({ variant: 'destructive', title: 'Erro ao atualizar em lote' })
    }
  }

  const handleBatchDelete = async () => {
    if (selectedIds.length === 0) return
    if (!confirm(`Deseja excluir ${selectedIds.length} atendimento(s)?`)) return
    try {
      await batchDeleteServiceRecords(selectedIds)
      toast({ title: 'Atendimentos excluídos com sucesso' })
      setSelectedIds([])
      loadData()
    } catch (err) {
      toast({ variant: 'destructive', title: 'Erro ao excluir em lote' })
    }
  }

  const clearFilters = () => {
    setSearch('')
    setStatusFilter('todos')
    setReasonFilter('todos')
  }

  return (
    <div className="space-y-6">
      <div>
        <h2 className="text-2xl font-extrabold tracking-tight text-slate-900">
          Histórico de Atendimentos
        </h2>
        <p className="text-xs text-slate-500">
          Pesquise, filtre e acompanhe todas as interações com clientes
        </p>
      </div>

      <Card className="p-4 border-slate-200 shadow-subtle space-y-4">
        <div className="grid grid-cols-1 sm:grid-cols-2 md:grid-cols-4 gap-3">
          <div className="relative">
            <Search className="absolute left-2.5 top-2.5 h-4 w-4 text-slate-400" />
            <Input
              placeholder="Buscar cliente, empresa..."
              value={search}
              onChange={(e) => setSearch(e.target.value)}
              className="pl-9 h-9 text-xs"
            />
          </div>

          <Select value={statusFilter} onValueChange={setStatusFilter}>
            <SelectTrigger className="h-9 text-xs">
              <SelectValue placeholder="Status" />
            </SelectTrigger>
            <SelectContent>
              <SelectItem value="todos">Todos os Status</SelectItem>
              <SelectItem value="Aberto">Aberto</SelectItem>
              <SelectItem value="Em Andamento">Em Andamento</SelectItem>
              <SelectItem value="Concluído">Concluído</SelectItem>
              <SelectItem value="Cancelado">Cancelado</SelectItem>
            </SelectContent>
          </Select>

          <Select value={reasonFilter} onValueChange={setReasonFilter}>
            <SelectTrigger className="h-9 text-xs">
              <SelectValue placeholder="Motivo" />
            </SelectTrigger>
            <SelectContent>
              <SelectItem value="todos">Todos os Motivos</SelectItem>
              <SelectItem value="Dúvida">Dúvida</SelectItem>
              <SelectItem value="Reclamação">Reclamação</SelectItem>
              <SelectItem value="Suporte Técnico">Suporte Técnico</SelectItem>
              <SelectItem value="Orçamento">Orçamento</SelectItem>
              <SelectItem value="Cancelamento">Cancelamento</SelectItem>
              <SelectItem value="Outro">Outro</SelectItem>
            </SelectContent>
          </Select>

          <Button
            variant="outline"
            size="sm"
            onClick={clearFilters}
            className="h-9 text-xs text-slate-600"
          >
            <RotateCcw className="h-3.5 w-3.5 mr-1.5" /> Limpar Filtros
          </Button>
        </div>

        {selectedIds.length > 0 && (
          <div className="flex items-center justify-between bg-indigo-50 p-2.5 rounded-lg border border-indigo-100">
            <span className="text-xs font-semibold text-indigo-900">
              {selectedIds.length} item(ns) selecionado(s)
            </span>
            <div className="flex gap-2">
              <Button
                size="sm"
                onClick={handleBatchComplete}
                className="bg-emerald-600 hover:bg-emerald-700 h-8 text-xs"
              >
                <CheckCircle2 className="h-3.5 w-3.5 mr-1" /> Marcar como Concluído
              </Button>
              <Button
                size="sm"
                variant="destructive"
                onClick={handleBatchDelete}
                className="h-8 text-xs"
              >
                <Trash2 className="h-3.5 w-3.5 mr-1" /> Excluir Selecionados
              </Button>
            </div>
          </div>
        )}
      </Card>

      <div className="flex gap-2">
        <Button
          variant={view === 'all' ? 'default' : 'outline'}
          size="sm"
          onClick={() => setView('all')}
          className="text-xs"
        >
          <Filter className="h-3.5 w-3.5 mr-1.5" /> Todos os Atendimentos
        </Button>
        <Button
          variant={view === 'mine' ? 'default' : 'outline'}
          size="sm"
          onClick={() => setView('mine')}
          className="text-xs"
        >
          <ListChecks className="h-3.5 w-3.5 mr-1.5" /> Minhas Tarefas
        </Button>
      </div>

      {view === 'mine' ? (
        <MinhasTarefasList
          records={myRecords}
          onViewRecord={(r) => {
            setSelectedRecord(r)
            setDetailOpen(true)
          }}
        />
      ) : (
        <Card className="border-slate-200 shadow-subtle overflow-hidden">
          <div className="overflow-x-auto">
            <Table>
              <TableHeader className="bg-slate-50">
                <TableRow>
                  <TableHead className="w-10">
                    <Checkbox
                      checked={
                        selectedIds.length > 0 && selectedIds.length === filteredRecords.length
                      }
                      onCheckedChange={handleSelectAll}
                    />
                  </TableHead>
                  <TableHead className="text-xs font-bold">Cliente</TableHead>
                  <TableHead className="text-xs font-bold">Motivo</TableHead>
                  <TableHead className="text-xs font-bold">Status</TableHead>
                  <TableHead className="text-xs font-bold">Prioridade</TableHead>
                  <TableHead className="text-xs font-bold">Duração</TableHead>
                  <TableHead className="text-xs font-bold">Atendente</TableHead>
                  <TableHead
                    className="text-xs font-bold cursor-pointer select-none flex items-center gap-1 py-3"
                    onClick={() => setSortAsc(!sortAsc)}
                  >
                    Criado em <ArrowUpDown className="h-3 w-3" />
                  </TableHead>
                  <TableHead className="text-xs font-bold text-right">Ação</TableHead>
                </TableRow>
              </TableHeader>
              <TableBody>
                {filteredRecords.map((r) => (
                  <TableRow key={r.id} className="hover:bg-slate-50">
                    <TableCell>
                      <Checkbox
                        checked={selectedIds.includes(r.id)}
                        onCheckedChange={(checked) => handleSelectRow(r.id, !!checked)}
                      />
                    </TableCell>
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
                    <TableCell className="text-xs text-slate-600">
                      {r.duration ? `${r.duration} min` : '-'}
                    </TableCell>
                    <TableCell className="text-xs text-slate-600">
                      {r.assigned_agent || '-'}
                    </TableCell>
                    <TableCell className="text-xs text-slate-500">
                      {r.created
                        ? format(new Date(r.created), 'dd/MM/yyyy HH:mm', { locale: ptBR })
                        : '-'}
                    </TableCell>
                    <TableCell className="text-right">
                      <Button
                        variant="ghost"
                        size="icon"
                        className="h-8 w-8 text-indigo-600"
                        onClick={() => {
                          setSelectedRecord(r)
                          setDetailOpen(true)
                        }}
                      >
                        <Eye className="h-4 w-4" />
                      </Button>
                    </TableCell>
                  </TableRow>
                ))}
                {filteredRecords.length === 0 && (
                  <TableRow>
                    <TableCell colSpan={9} className="text-center py-12 text-slate-400 text-xs">
                      Nenhum atendimento encontrado para os filtros selecionados.
                    </TableCell>
                  </TableRow>
                )}
              </TableBody>
            </Table>
          </div>
        </Card>
      )}

      <ServiceRecordDetailModal
        record={selectedRecord}
        open={detailOpen}
        onOpenChange={setDetailOpen}
        onUpdateSuccess={loadData}
      />
    </div>
  )
}
