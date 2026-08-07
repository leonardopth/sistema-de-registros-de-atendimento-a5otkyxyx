import { useState, useEffect, useMemo, useRef } from 'react'
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
import { SortableHeader } from '@/components/SortableHeader'
import { Checkbox } from '@/components/ui/checkbox'
import {
  getServiceRecords,
  batchUpdateStatus,
  batchDeleteServiceRecords,
  updateServiceRecord,
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
  Play,
  Plane,
} from 'lucide-react'
import { Label } from '@/components/ui/label'
import { FloatingServiceTimer } from '@/components/FloatingServiceTimer'
import { useAuth } from '@/hooks/use-auth'
import { MinhasTarefasList } from '@/components/MinhasTarefasList'
import { TravelTypeBadge } from '@/components/TravelTypeBadge'
import { DateRangeFilter } from '@/components/DateRangeFilter'
import { getAccountExecutives } from '@/services/account_executives'
import { exportServiceRecordsByExecutiveCSV } from '@/lib/executive-export'
import { getClients } from '@/services/clients'
import { getUsers } from '@/services/users'
import { getSharesByUser } from '@/services/service_record_shares'
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
import { formatGMT3DateTime, getGMT3DateString } from '@/lib/timezone'

export default function Atendimentos() {
  const [records, setRecords] = useState<ServiceRecord[]>([])
  const [search, setSearch] = useState('')
  const [statusFilter, setStatusFilter] = useState<string>('todos')
  const [reasonFilter, setReasonFilter] = useState<string>('todos')
  const [selectedIds, setSelectedIds] = useState<string[]>([])

  const [selectedRecord, setSelectedRecord] = useState<ServiceRecord | null>(null)
  const [detailOpen, setDetailOpen] = useState(false)
  const [activeTimerRecordId, setActiveTimerRecordId] = useState<string | null>(null)
  const [timerStart, setTimerStart] = useState<string | null>(null)
  const [timerRunning, setTimerRunning] = useState(false)
  const [accumulatedMs, setAccumulatedMs] = useState(0)
  const [sortField, setSortField] = useState<string>('created')
  const [sortDirection, setSortDirection] = useState<'asc' | 'desc'>('desc')
  const [view, setView] = useState<'all' | 'mine'>('all')
  const [wrongDeptFilter, setWrongDeptFilter] = useState<string>('todos')
  const [executiveFilter, setExecutiveFilter] = useState<string>('todos')
  const [filterByUser, setFilterByUser] = useState(false)
  const [executives, setExecutives] = useState<AccountExecutiveRecord[]>([])
  const [dateFrom, setDateFrom] = useState('')
  const [dateTo, setDateTo] = useState('')
  const [serviceGroupFilter, setServiceGroupFilter] = useState<string>('todos')
  const [travelTypeFilter, setTravelTypeFilter] = useState<string>('todos')
  const [clients, setClients] = useState<ClientRecord[]>([])
  const [users, setUsers] = useState<UserRecord[]>([])
  const [sharedRecordIds, setSharedRecordIds] = useState<Set<string>>(new Set())

  const [searchParams, setSearchParams] = useSearchParams()

  useEffect(() => {
    const wdParam = searchParams.get('avoidable_contact')
    if (wdParam === 'sim' || wdParam === 'nao') {
      setWrongDeptFilter(wdParam)
    }
  }, [searchParams])

  const { toast } = useToast()
  const { user } = useAuth()

  const backendSort = `${sortDirection === 'desc' ? '-' : ''}${sortField}`

  const loadData = async () => {
    try {
      const [data, execs, clientsData, usersData, userShares] = await Promise.all([
        getServiceRecords(backendSort),
        getAccountExecutives(),
        getClients(),
        getUsers(),
        getSharesByUser(user?.id || '').catch(() => []),
      ])
      setRecords(data)
      setExecutives(execs)
      setClients(clientsData)
      setUsers(usersData)
      setSharedRecordIds(new Set(userShares.map((s: any) => s.service_record)))
    } catch (err) {
      console.error(err)
    }
  }

  useEffect(() => {
    loadData()
  }, [sortField, sortDirection])

  useRealtime('service_records', () => {
    loadData()
  })

  useRealtime('service_record_shares', () => {
    if (user?.id) {
      getSharesByUser(user.id)
        .then((shares) => {
          setSharedRecordIds(new Set(shares.map((s: any) => s.service_record)))
        })
        .catch(() => {})
    }
  })

  const timerStateRef = useRef({ timerRunning, timerStart, activeTimerRecordId, accumulatedMs })
  timerStateRef.current = { timerRunning, timerStart, activeTimerRecordId, accumulatedMs }

  useEffect(() => {
    return () => {
      const s = timerStateRef.current
      if (s.timerRunning && s.timerStart && s.activeTimerRecordId) {
        const totalElapsed = s.accumulatedMs + (Date.now() - new Date(s.timerStart).getTime())
        const durationMin = Math.round((totalElapsed / 60000) * 100) / 100
        updateServiceRecord(s.activeTimerRecordId, {
          timer_running: false,
          timer_start: null,
          duration: durationMin,
        }).catch(() => {})
      }
    }
  }, [])

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
    const isSharedWithUser = sharedRecordIds.has(r.id)
    if (!isSharedWithUser) {
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
            (r.client_company
              ? companyToServiceGroup.get(r.client_company.toLowerCase())
              : undefined)
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

    const recDate = getGMT3DateString(r.created)
    const matchesDateFrom = !dateFrom || recDate >= dateFrom
    const matchesDateTo = !dateTo || recDate <= dateTo

    const recordServiceGroup =
      r.expand?.client?.service_group ||
      (r.client_company ? companyToServiceGroup.get(r.client_company.toLowerCase()) : undefined)
    const matchesServiceGroup =
      serviceGroupFilter === 'todos' || recordServiceGroup === serviceGroupFilter

    const matchesTravelType = travelTypeFilter === 'todos' || r.travel_type === travelTypeFilter

    return (
      matchesSearch &&
      matchesStatus &&
      matchesReason &&
      matchesWrongDept &&
      matchesDateFrom &&
      matchesDateTo &&
      matchesExecutive &&
      matchesUser &&
      matchesServiceGroup &&
      matchesTravelType
    )
  })

  const displayRecords = useMemo(() => {
    if (sortField === 'assigned_user') {
      const sorted = [...filteredRecords]
      sorted.sort((a, b) => {
        const aVal = (a.expand?.assigned_user?.name || a.assigned_agent || '').toLowerCase()
        const bVal = (b.expand?.assigned_user?.name || b.assigned_agent || '').toLowerCase()
        const cmp = aVal.localeCompare(bVal)
        return sortDirection === 'asc' ? cmp : -cmp
      })
      return sorted
    }
    return filteredRecords
  }, [filteredRecords, sortField, sortDirection])

  const myRecords = filteredRecords.filter((r) => r.assigned_user === user?.id)

  const handleSort = (field: string) => {
    if (sortField !== field) {
      setSortField(field)
      setSortDirection('asc')
    } else if (sortDirection === 'asc') {
      setSortDirection('desc')
    } else {
      setSortField('created')
      setSortDirection('desc')
    }
  }

  const handleSelectAll = (checked: boolean) => {
    if (checked) {
      setSelectedIds(displayRecords.map((r) => r.id))
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

  const exportData = view === 'mine' ? myRecords : displayRecords

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
    setSortField('created')
    setSortDirection('desc')
    setServiceGroupFilter('todos')
    setTravelTypeFilter('todos')
    if (searchParams.get('avoidable_contact')) {
      searchParams.delete('avoidable_contact')
      setSearchParams(searchParams)
    }
  }

  const handleContinueTimer = async (record: ServiceRecord) => {
    if (timerRunning && timerStart && activeTimerRecordId) {
      const totalElapsed = accumulatedMs + (Date.now() - new Date(timerStart).getTime())
      const durationMin = Math.round((totalElapsed / 60000) * 100) / 100
      setAccumulatedMs(totalElapsed)
      setTimerRunning(false)
      setTimerStart(null)
      await updateServiceRecord(activeTimerRecordId, {
        timer_running: false,
        timer_start: null,
        duration: durationMin,
      }).catch(() => {})
    }
    const accMs = record.duration ? record.duration * 60000 : 0
    setAccumulatedMs(accMs)
    const now = new Date().toISOString()
    setTimerStart(now)
    setTimerRunning(true)
    setActiveTimerRecordId(record.id)
    await updateServiceRecord(record.id, {
      timer_start: now,
      timer_running: true,
    }).catch(() => {})
    toast({ title: 'Cronômetro retomado', description: 'O timer continua de onde parou.' })
  }

  const handleTimerStart = async () => {
    const now = new Date().toISOString()
    setTimerStart(now)
    setTimerRunning(true)
    if (activeTimerRecordId) {
      await updateServiceRecord(activeTimerRecordId, {
        timer_start: now,
        timer_running: true,
      }).catch(() => {})
    }
  }

  const handleTimerPause = async (totalElapsedMs: number) => {
    setAccumulatedMs(totalElapsedMs)
    setTimerRunning(false)
    setTimerStart(null)
    if (activeTimerRecordId) {
      const durationMin = Math.round((totalElapsedMs / 60000) * 100) / 100
      await updateServiceRecord(activeTimerRecordId, {
        timer_running: false,
        timer_start: null,
        duration: durationMin,
      }).catch(() => {})
    }
  }

  const handleTimerReset = async () => {
    setAccumulatedMs(0)
    const now = new Date().toISOString()
    setTimerStart(now)
    setTimerRunning(true)
    if (activeTimerRecordId) {
      await updateServiceRecord(activeTimerRecordId, {
        timer_start: now,
        timer_running: true,
        duration: 0,
      }).catch(() => {})
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

      <Card className="p-3 border-slate-200 shadow-subtle space-y-2.5">
        <div className="grid grid-cols-2 sm:grid-cols-3 lg:grid-cols-12 gap-2">
          <div className="col-span-2 sm:col-span-3 lg:col-span-3 relative">
            <Search className="absolute left-2.5 top-2 h-4 w-4 text-slate-400" />
            <Input
              placeholder="Buscar cliente, empresa..."
              value={search}
              onChange={(e) => setSearch(e.target.value)}
              className="pl-8 h-8 text-xs"
            />
          </div>
          <div className="lg:col-span-2">
            <Select value={statusFilter} onValueChange={setStatusFilter}>
              <SelectTrigger className="h-8 text-xs w-full">
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
          </div>
          <div className="lg:col-span-2">
            <Select value={reasonFilter} onValueChange={setReasonFilter}>
              <SelectTrigger className="h-8 text-xs w-full">
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
          </div>
          <div className="lg:col-span-2">
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
              <SelectTrigger className="h-8 text-xs w-full">
                <Filter className="h-3 w-3 text-amber-500 mr-1 shrink-0" />
                <SelectValue placeholder="Evitável" />
              </SelectTrigger>
              <SelectContent>
                <SelectItem value="todos">Contato Evitável: Todos</SelectItem>
                <SelectItem value="sim">Sim</SelectItem>
                <SelectItem value="nao">Não</SelectItem>
              </SelectContent>
            </Select>
          </div>
          <div className="lg:col-span-2">
            <Select value={serviceGroupFilter} onValueChange={setServiceGroupFilter}>
              <SelectTrigger className="h-8 text-xs w-full">
                <Filter className="h-3 w-3 text-indigo-500 mr-1 shrink-0" />
                <SelectValue placeholder="Grupo" />
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
          <div className="lg:col-span-1">
            <Button
              variant="outline"
              size="sm"
              onClick={clearFilters}
              className="h-8 text-xs text-slate-600 w-full px-0"
              title="Limpar Filtros"
            >
              <RotateCcw className="h-3.5 w-3.5" />
            </Button>
          </div>
        </div>

        <div className="flex flex-wrap items-center justify-between gap-2">
          <div className="flex flex-wrap items-center gap-2">
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
            <Select value={travelTypeFilter} onValueChange={setTravelTypeFilter}>
              <SelectTrigger className="h-8 text-xs w-[140px]">
                <Plane className="h-3 w-3 text-indigo-500 mr-1 shrink-0" />
                <SelectValue placeholder="Viagem" />
              </SelectTrigger>
              <SelectContent>
                <SelectItem value="todos">Todos os Tipos</SelectItem>
                <SelectItem value="Nacional">Nacional</SelectItem>
                <SelectItem value="Internacional">Internacional</SelectItem>
              </SelectContent>
            </Select>
          </div>
          <div className="flex gap-1.5">
            <ExportMenu
              label="Exportar"
              variant="default"
              className="bg-indigo-600 hover:bg-indigo-700 text-white h-8"
              onCSV={handleExportCSV}
              onExcel={handleExportExcel}
              onPDF={handleExportPDF}
            />
            <ExportMenu
              label="Consolidado"
              className="h-8"
              onCSV={handleExportConsolidatedCSV}
              onExcel={handleExportConsolidatedExcel}
              onPDF={handleExportConsolidatedPDF}
            />
          </div>
        </div>

        {selectedIds.length > 0 && (
          <div className="flex items-center justify-between bg-cyan-50 p-2 rounded-lg border border-cyan-100">
            <span className="text-xs font-bold text-cyan-950">
              {selectedIds.length} item(ns) selecionado(s)
            </span>
            <div className="flex gap-2">
              <Button
                size="sm"
                onClick={handleBatchComplete}
                className="bg-emerald-600 hover:bg-emerald-700 h-8 text-xs font-semibold"
              >
                <CheckCircle2 className="h-3.5 w-3.5 mr-1" /> Concluir
              </Button>
              <Button
                size="sm"
                variant="destructive"
                onClick={handleBatchDelete}
                className="h-8 text-xs font-semibold"
              >
                <Trash2 className="h-3.5 w-3.5 mr-1" /> Excluir
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
                        selectedIds.length > 0 && selectedIds.length === displayRecords.length
                      }
                      onCheckedChange={handleSelectAll}
                    />
                  </TableHead>
                  <SortableHeader
                    label="Cliente"
                    field="client_name"
                    sortField={sortField}
                    sortDirection={sortDirection}
                    onSort={handleSort}
                  />
                  <SortableHeader
                    label="Contato"
                    field="contact_reason"
                    sortField={sortField}
                    sortDirection={sortDirection}
                    onSort={handleSort}
                  />
                  <SortableHeader
                    label="Status"
                    field="status"
                    sortField={sortField}
                    sortDirection={sortDirection}
                    onSort={handleSort}
                  />
                  <SortableHeader
                    label="Prioridade"
                    field="priority"
                    sortField={sortField}
                    sortDirection={sortDirection}
                    onSort={handleSort}
                  />
                  <SortableHeader
                    label="Duração"
                    field="duration"
                    sortField={sortField}
                    sortDirection={sortDirection}
                    onSort={handleSort}
                  />
                  <SortableHeader
                    label="Consultor"
                    field="assigned_user"
                    sortField={sortField}
                    sortDirection={sortDirection}
                    onSort={handleSort}
                  />
                  <SortableHeader
                    label="Criado em"
                    field="created"
                    sortField={sortField}
                    sortDirection={sortDirection}
                    onSort={handleSort}
                  />
                  <TableHead className="text-xs font-bold text-right">Ação</TableHead>
                </TableRow>
              </TableHeader>
              <TableBody>
                {displayRecords.map((r) => (
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
                      {r.travel_type && (
                        <TravelTypeBadge travelType={r.travel_type} className="mt-0.5" />
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
                      {r.expand?.assigned_user?.name || r.assigned_agent || '-'}
                    </TableCell>
                    <TableCell className="text-xs text-slate-500">
                      {r.created ? formatGMT3DateTime(r.created) : '-'}
                    </TableCell>
                    <TableCell className="text-right">
                      <div className="flex items-center justify-end gap-1">
                        {r.status === 'Em Andamento' &&
                          ((r.duration || 0) > 0 || r.timer_start) && (
                            <Button
                              variant="ghost"
                              size="sm"
                              className="h-8 text-xs text-cyan-600 hover:text-cyan-700 hover:bg-cyan-50"
                              onClick={() => handleContinueTimer(r)}
                              disabled={activeTimerRecordId === r.id && timerRunning}
                            >
                              <Play className="h-3.5 w-3.5 mr-1" />
                              {activeTimerRecordId === r.id && timerRunning
                                ? 'Cronometrando'
                                : 'Continuar'}
                            </Button>
                          )}
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
                      </div>
                    </TableCell>
                  </TableRow>
                ))}
                {displayRecords.length === 0 && (
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

      {activeTimerRecordId && (
        <FloatingServiceTimer
          timerStart={timerStart}
          timerRunning={timerRunning}
          accumulatedMs={accumulatedMs}
          onStart={handleTimerStart}
          onPause={handleTimerPause}
          onReset={handleTimerReset}
          position="bottom-right"
        />
      )}
    </div>
  )
}
