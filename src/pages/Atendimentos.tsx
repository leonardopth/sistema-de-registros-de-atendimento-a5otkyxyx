import { useState, useEffect, useMemo } from 'react'
import { useSearchParams } from 'react-router-dom'
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
import {
  ServiceRecord,
  ServiceStatus,
  ContactReason,
  AccountExecutiveRecord,
  ClientRecord,
  UserRecord,
} from '@/types/service_record'
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
import { DateRangeFilter } from '@/components/DateRangeFilter'
import { getAccountExecutives } from '@/services/account_executives'
import { exportServiceRecordsByExecutiveCSV } from '@/lib/executive-export'
import { getClients } from '@/services/clients'
import { getUsers } from '@/services/users'
import { SERVICE_GROUP_OPTIONS } from '@/lib/service-groups'
import { downloadServiceRecordsCSV } from '@/lib/report-export'
import {
  downloadServiceRecordsExcel,
  downloadServiceRecordsPDF,
} from '@/lib/service-records-export'
import { ExportMenu } from '@/components/ExportMenu'
import {
  generateConsolidatedReport,
  downloadConsolidatedCSV,
  downloadConsolidatedExcel,
  downloadConsolidatedPDF,
} from '@/lib/consolidated-report'
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
  const [wrongDeptFilter, setWrongDeptFilter] = useState<string>('todos')
  const [executiveFilter, setExecutiveFilter] = useState<string>('todos')
  const [filterByUser, setFilterByUser] = useState(false)
  const [executives, setExecutives] = useState<AccountExecutiveRecord[]>([])
  const [dateFrom, setDateFrom] = useState('')
  const [dateTo, setDateTo] = useState('')
  const [serviceGroupFilter, setServiceGroupFilter] = useState<string>('todos')
  const [clients, setClients] = useState<ClientRecord[]>([])
  const [users, setUsers] = useState<UserRecord[]>([])

  const [searchParams, setSearchParams] = useSearchParams()

  useEffect(() => {
    const wdParam = searchParams.get('avoidable_contact')
    if (wdParam === 'sim' || wdParam === 'nao') {
      setWrongDeptFilter(wdParam)
    }
  }, [searchParams])

  const { toast } = useToast()
  const { user } = useAuth()

  const loadData = async () => {
    try {
      const [data, execs, clientsData, usersData] = await Promise.all([
        getServiceRecords('', sortAsc ? 'created' : '-created'),
        getAccountExecutives(),
        getClients(),
        getUsers(),
      ])
      setRecords(data)
      setExecutives(execs)
      setClients(clientsData)
      setUsers(usersData)
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

  const isMasterUser = user?.role === 'Master'
  const isManager = ['Gerentes', 'Supervisores', 'Líderes'].includes(user?.role || '')
  const userServiceGroups = (user?.service_groups as string[] | undefined) || []
  const hasGroupRestriction = !isMasterUser && userServiceGroups.length > 0

  const isExecutivo = user?.role === 'Executivo de contas'
  const isGestorComercial = user?.role === 'Gestor Comercial'
  const userBases = (user?.bases as string[] | undefined) || []

  const executiveAccessIds = useMemo(() => {
    if (isExecutivo) {
      return executives
        .filter((e) => e.email === user?.email || e.name === user?.name)
        .map((e) => e.id)
    }
    if (isGestorComercial) {
      return executives
        .filter((e) => {
          const execBases = (e.bases as string[] | undefined) || []
          return execBases.some((b) => userBases.includes(b))
        })
        .map((e) => e.id)
    }
    return null
  }, [executives, isExecutivo, isGestorComercial, user, userBases])

  const companyToServiceGroup = new Map<string, string>()
  const clientIdToServiceGroup = new Map<string, string>()
  clients.forEach((c) => {
    if (c.company && c.service_group) {
      companyToServiceGroup.set(c.company.toLowerCase(), c.service_group)
    }
    if (c.id && c.service_group) {
      clientIdToServiceGroup.set(c.id, c.service_group)
    }
  })

  const userGroupMap = new Map<string, { service_groups?: string[] }>()
  users.forEach((u) => {
    userGroupMap.set(u.id, { service_groups: u.service_groups as string[] | undefined })
  })

  const filteredRecords = records.filter((r) => {
    if (executiveAccessIds !== null) {
      const isOwner = r.user_id === user?.id || r.assigned_user === user?.id
      if (!executiveAccessIds.includes(r.account_executive || '') && !isOwner) {
        return false
      }
    }

    if (hasGroupRestriction) {
      const isCreator = r.user_id === user?.id || r.assigned_user === user?.id
      if (!isCreator) {
        const recordServiceGroup =
          r.expand?.client?.service_group ||
          (r.client ? clientIdToServiceGroup.get(r.client) : undefined) ||
          (r.client_company ? companyToServiceGroup.get(r.client_company.toLowerCase()) : undefined)
        const clientGroupMatch =
          recordServiceGroup && userServiceGroups.includes(recordServiceGroup)
        if (!clientGroupMatch) {
          if (isManager) {
            const creatorId = r.assigned_user || r.user_id
            const creatorGroups = creatorId
              ? userGroupMap.get(creatorId)?.service_groups
              : undefined
            if (
              !creatorGroups ||
              !creatorGroups.some((g: string) => userServiceGroups.includes(g))
            ) {
              return false
            }
          } else {
            return false
          }
        }
      }
    }

    const matchesSearch =
      r.client_name.toLowerCase().includes(search.toLowerCase()) ||
      r.description.toLowerCase().includes(search.toLowerCase()) ||
      (r.client_company && r.client_company.toLowerCase().includes(search.toLowerCase()))

    const matchesStatus = statusFilter === 'todos' || r.status === statusFilter
    const matchesReason = reasonFilter === 'todos' || r.contact_reason === reasonFilter
    const matchesWrongDept =
      wrongDeptFilter === 'todos' ||
      (wrongDeptFilter === 'sim' && r.avoidable_contact === true) ||
      (wrongDeptFilter === 'nao' && !r.avoidable_contact)

    const matchesExecutive =
      executiveFilter === 'todos' ||
      r.expand?.account_executive?.id === executiveFilter ||
      r.assigned_agent === executives.find((e) => e.id === executiveFilter)?.name

    const matchesUser = !filterByUser || r.assigned_user === user?.id || r.user_id === user?.id

    const recDate = r.created ? r.created.substring(0, 10) : ''
    const matchesDateFrom = !dateFrom || recDate >= dateFrom
    const matchesDateTo = !dateTo || recDate <= dateTo

    const recordServiceGroup =
      r.expand?.client?.service_group ||
      (r.client_company ? companyToServiceGroup.get(r.client_company.toLowerCase()) : undefined)
    const matchesServiceGroup =
      serviceGroupFilter === 'todos' || recordServiceGroup === serviceGroupFilter

    return (
      matchesSearch &&
      matchesStatus &&
      matchesReason &&
      matchesWrongDept &&
      matchesDateFrom &&
      matchesDateTo &&
      matchesExecutive &&
      matchesUser &&
      matchesServiceGroup
    )
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

  const exportData = view === 'mine' ? myRecords : filteredRecords

  const handleExportCSV = () => {
    downloadServiceRecordsCSV(exportData, 'relatorio-atendimentos.csv')
    toast({
      title: 'Relatório exportado',
      description: `${exportData.length} atendimento(s) em CSV.`,
    })
  }
  const handleExportExcel = () => {
    downloadServiceRecordsExcel(exportData)
    toast({
      title: 'Relatório exportado',
      description: `${exportData.length} atendimento(s) em Excel.`,
    })
  }
  const handleExportPDF = () => {
    downloadServiceRecordsPDF(exportData)
    toast({
      title: 'Relatório exportado',
      description: `${exportData.length} atendimento(s) em PDF.`,
    })
  }
  const handleExportConsolidatedCSV = () => {
    downloadConsolidatedCSV(generateConsolidatedReport(exportData))
    toast({ title: 'Relatório consolidado exportado em CSV.' })
  }
  const handleExportConsolidatedExcel = () => {
    downloadConsolidatedExcel(generateConsolidatedReport(exportData))
    toast({ title: 'Relatório consolidado exportado em Excel.' })
  }
  const handleExportConsolidatedPDF = () => {
    downloadConsolidatedPDF(generateConsolidatedReport(exportData))
    toast({ title: 'Relatório consolidado exportado em PDF.' })
  }
  const handleExportByExecutiveCSV = () => {
    exportServiceRecordsByExecutiveCSV(exportData)
    toast({
      title: 'Relatório exportado',
      description: `${exportData.length} atendimento(s) em CSV.`,
    })
  }

  const clearFilters = () => {
    setSearch('')
    setStatusFilter('todos')
    setReasonFilter('todos')
    setWrongDeptFilter('todos')
    setExecutiveFilter('todos')
    setFilterByUser(false)
    setDateFrom('')
    setDateTo('')
    setDateTo('')
    setServiceGroupFilter('todos')
    if (searchParams.get('avoidable_contact')) {
      searchParams.delete('avoidable_contact')
      setSearchParams(searchParams)
    }
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
              <SelectItem value="Bagagem">Bagagem</SelectItem>
              <SelectItem value="Assento">Assento</SelectItem>
              <SelectItem value="cálculo reemissão">cálculo reemissão</SelectItem>
              <SelectItem value="reembolso">reembolso</SelectItem>
              <SelectItem value="cotação">cotação</SelectItem>
              <SelectItem value="reserva">reserva</SelectItem>
              <SelectItem value="cancelamento">cancelamento</SelectItem>
              <SelectItem value="regras tarifárias">regras tarifárias</SelectItem>
              <SelectItem value="erro RF">erro RF</SelectItem>
              <SelectItem value="outros">outros</SelectItem>
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
          <div className="flex gap-2 col-span-1 sm:col-span-2 md:col-span-1">
            <ExportMenu
              label="Exportar Relatório"
              variant="default"
              className="bg-indigo-600 hover:bg-indigo-700 text-white"
              onCSV={handleExportCSV}
              onExcel={handleExportExcel}
              onPDF={handleExportPDF}
            />
            <ExportMenu
              label="Consolidado"
              onCSV={handleExportConsolidatedCSV}
              onExcel={handleExportConsolidatedExcel}
              onPDF={handleExportConsolidatedPDF}
            />
          </div>
        </div>

        <div className="flex items-center gap-2">
          <span className="text-xs font-semibold text-slate-600 flex items-center gap-1">
            <Filter className="h-3.5 w-3.5 text-amber-500" /> Contato Evitável:
          </span>
          <Select
            value={wrongDeptFilter}
            onValueChange={(val) => {
              setWrongDeptFilter(val)
              if (val === 'todos') {
                searchParams.delete('avoidable_contact')
              } else {
                searchParams.set('avoidable_contact', val)
              }
              setSearchParams(searchParams)
            }}
          >
            <SelectTrigger className="h-9 text-xs w-40">
              <SelectValue placeholder="Departamento" />
            </SelectTrigger>
            <SelectContent>
              <SelectItem value="todos">Todos</SelectItem>
              <SelectItem value="sim">Sim</SelectItem>
              <SelectItem value="nao">Não</SelectItem>
            </SelectContent>
          </Select>
        </div>

        <div className="flex items-center gap-2">
          <span className="text-xs font-semibold text-slate-600 flex items-center gap-1">
            <Filter className="h-3.5 w-3.5 text-indigo-500" /> Grupo de Atendimento:
          </span>
          <Select value={serviceGroupFilter} onValueChange={setServiceGroupFilter}>
            <SelectTrigger className="h-9 text-xs w-40">
              <SelectValue placeholder="Todos os Grupos" />
            </SelectTrigger>
            <SelectContent>
              <SelectItem value="todos">Todos os Grupos</SelectItem>
              {SERVICE_GROUP_OPTIONS.map((o) => (
                <SelectItem key={o.value} value={o.value}>
                  {o.label}
                </SelectItem>
              ))}
            </SelectContent>
          </Select>
        </div>

        <DateRangeFilter
          dateFrom={dateFrom}
          dateTo={dateTo}
          onDateFromChange={setDateFrom}
          onDateToChange={setDateTo}
          onClear={() => {
            setDateFrom('')
            setDateTo('')
          }}
          hasActiveFilter={!!dateFrom || !!dateTo}
        />

        {selectedIds.length > 0 && (
          <div className="flex items-center justify-between bg-cyan-50 p-2.5 rounded-lg border border-cyan-100">
            <span className="text-xs font-bold text-cyan-950">
              {selectedIds.length} item(ns) selecionado(s)
            </span>
            <div className="flex gap-2">
              <Button
                size="sm"
                onClick={handleBatchComplete}
                className="bg-emerald-600 hover:bg-emerald-700 h-8 text-xs font-semibold"
              >
                <CheckCircle2 className="h-3.5 w-3.5 mr-1" /> Marcar como Concluído
              </Button>
              <Button
                size="sm"
                variant="destructive"
                onClick={handleBatchDelete}
                className="h-8 text-xs font-semibold"
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
                  <TableHead className="text-xs font-bold">Contato</TableHead>
                  <TableHead className="text-xs font-bold">Status</TableHead>
                  <TableHead className="text-xs font-bold">Prioridade</TableHead>
                  <TableHead className="text-xs font-bold">Duração</TableHead>
                  <TableHead className="text-xs font-bold">Consultor</TableHead>
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
                    <TableCell className="text-xs">
                      {r.client_company && (
                        <button
                          className="block font-bold text-slate-900 hover:text-indigo-600 transition-colors text-left"
                          onClick={() => {
                            setSelectedRecord(r)
                            setDetailOpen(true)
                          }}
                        >
                          {r.client_company}
                        </button>
                      )}
                      <span
                        className={`block ${r.client_company ? 'text-[10px] text-slate-500 font-normal' : 'font-semibold text-slate-900'}`}
                      >
                        {r.client_name}
                      </span>
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
                      {r.expand?.assigned_user?.name || r.assigned_agent || '-'}
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
