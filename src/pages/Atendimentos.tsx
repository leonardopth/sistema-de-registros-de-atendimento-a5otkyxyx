import { useState, useEffect, useMemo, useRef } from 'react'
import { useSearchParams } from 'react-router-dom'
import { Card } from '@/components/ui/card'
import { Button } from '@/components/ui/button'
import { Input } from '@/components/ui/input'
import { Badge } from '@/components/ui/badge'
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
import { TableColumnFilter } from '@/components/TableColumnFilter'
import { Checkbox } from '@/components/ui/checkbox'
import {
  getServiceRecords,
  batchUpdateStatus,
  batchDeleteServiceRecords,
  batchReassignConsultant,
  batchUpdateAvoidable,
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
import { isRecordReopened } from '@/lib/reopen-utils'
import { TfrBadge } from '@/components/TfrBadge'
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
  AlertTriangle,
  Share2,
  Mail,
  Phone,
  UserCheck,
  ShieldCheck,
  X,
  FileSpreadsheet,
  FileText,
} from 'lucide-react'
import {
  DropdownMenu,
  DropdownMenuTrigger,
  DropdownMenuContent,
  DropdownMenuItem,
  DropdownMenuSeparator,
  DropdownMenuLabel,
} from '@/components/ui/dropdown-menu'
import {
  Dialog,
  DialogContent,
  DialogHeader,
  DialogTitle,
  DialogFooter,
} from '@/components/ui/dialog'
import { filterRecordsByUserAccess } from '@/lib/service-group-access'
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
import { getSharesByUser, getAllShares } from '@/services/service_record_shares'
import { getEmailLogs, EmailLogRecord } from '@/services/outlook-integration'
import { getCallAnalysisLogs, CallAnalysisLogRecord } from '@/services/telephony-integration'
import { ServiceRecordShare } from '@/types/service_record'
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

  // Filtros em colunas
  const [colClients, setColClients] = useState<string[]>([])
  const [colReasons, setColReasons] = useState<string[]>([])
  const [colStatuses, setColStatuses] = useState<string[]>([])
  const [colPriorities, setColPriorities] = useState<string[]>([])
  const [colAvoidable, setColAvoidable] = useState<string[]>([])
  const [colDurations, setColDurations] = useState<string[]>([])
  const [colConsultants, setColConsultants] = useState<string[]>([])
  const [colCreatedDates, setColCreatedDates] = useState<string[]>([])

  const [selectedRecord, setSelectedRecord] = useState<ServiceRecord | null>(null)
  const [detailOpen, setDetailOpen] = useState(false)
  const [batchStatusModalOpen, setBatchStatusModalOpen] = useState(false)
  const [batchStatusValue, setBatchStatusValue] = useState<string>('Concluído')
  const [batchConsultantModalOpen, setBatchConsultantModalOpen] = useState(false)
  const [batchConsultantId, setBatchConsultantId] = useState<string>('')
  const [batchAvoidableModalOpen, setBatchAvoidableModalOpen] = useState(false)
  const [batchAvoidableValue, setBatchAvoidableValue] = useState<'sim' | 'nao'>('sim')
  const [batchAvoidableExplanation, setBatchAvoidableExplanation] = useState('')
  const [isProcessingBatch, setIsProcessingBatch] = useState(false)
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
  const [sharesByRecordMap, setSharesByRecordMap] = useState<Map<string, ServiceRecordShare[]>>(
    new Map(),
  )
  const [colSharedWith, setColSharedWith] = useState<string[]>([])
  const [emailsByRecordMap, setEmailsByRecordMap] = useState<Map<string, EmailLogRecord[]>>(
    new Map(),
  )
  const [callsByRecordMap, setCallsByRecordMap] = useState<Map<string, CallAnalysisLogRecord[]>>(
    new Map(),
  )

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
      // Busca segura no nível de query/filter conforme RBAC:
      // Master vê tudo, consultor/executivo/usuário comum vê apenas próprios + compartilhados
      const isMaster = user?.role === 'Master' || user?.master_access === true
      const userSharesPromise = getSharesByUser(user?.id || '').catch(() => [])

      const allSharesPromise = getAllShares().catch(() => [])

      const [userShares, allShares, execs, clientsData, usersData, emailLogsData, callLogsData] =
        await Promise.all([
          userSharesPromise,
          allSharesPromise,
          getAccountExecutives(),
          getClients(),
          getUsers(),
          getEmailLogs().catch(() => []),
          getCallAnalysisLogs().catch(() => []),
        ])

      const emailMap = new Map<string, EmailLogRecord[]>()
      ;(emailLogsData || []).forEach((el: EmailLogRecord) => {
        if (el.service_record) {
          const list = emailMap.get(el.service_record) || []
          list.push(el)
          emailMap.set(el.service_record, list)
        }
      })
      setEmailsByRecordMap(emailMap)

      const callMap = new Map<string, CallAnalysisLogRecord[]>()
      ;(callLogsData || []).forEach((cl: CallAnalysisLogRecord) => {
        if (cl.service_record) {
          const list = callMap.get(cl.service_record) || []
          list.push(cl)
          callMap.set(cl.service_record, list)
        }
      })
      setCallsByRecordMap(callMap)

      const sharedIdsList = (userShares || []).map((s: any) => s.service_record).filter(Boolean)
      setSharedRecordIds(new Set(sharedIdsList))

      const sharesMap = new Map<string, ServiceRecordShare[]>()
      ;(allShares || []).forEach((share: ServiceRecordShare) => {
        if (share.service_record) {
          const list = sharesMap.get(share.service_record) || []
          list.push(share)
          sharesMap.set(share.service_record, list)
        }
      })
      setSharesByRecordMap(sharesMap)

      let queryFilter: string | undefined = undefined
      if (!isMaster && user?.id) {
        let f = `user_id = "${user.id}" || assigned_user = "${user.id}"`
        if (sharedIdsList.length > 0) {
          const sharesFilter = sharedIdsList.map((id: string) => `id = "${id}"`).join(' || ')
          f = `(${f}) || (${sharesFilter})`
        }
        queryFilter = f
      }

      const data = await getServiceRecords(backendSort, queryFilter)
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
  }, [sortField, sortDirection])

  useRealtime('service_records', () => {
    loadData()
  })

  useRealtime('service_record_shares', () => {
    loadData()
  })

  useRealtime('email_analysis_logs', () => {
    loadData()
  })

  useRealtime('call_analysis_logs', () => {
    loadData()
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
  const isManager = ['Gerente', 'Supervisor', 'Líder'].includes(user?.role || '')
  const userServiceGroups = (user?.service_groups as string[] | undefined) || []
  const hasGroupRestriction = !isMasterUser && userServiceGroups.length > 0

  const isExecutivo = user?.role === 'Executivo de Contas'
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

    // Filtros por coluna
    const clientNameDisplay = r.client_company
      ? `${r.client_company} - ${r.client_name}`
      : r.client_name
    const matchesColClient =
      colClients.length === 0 ||
      colClients.includes(clientNameDisplay) ||
      colClients.includes(r.client_company || '') ||
      colClients.includes(r.client_name)
    const matchesColReason = colReasons.length === 0 || colReasons.includes(r.contact_reason || '')
    const matchesColStatus = colStatuses.length === 0 || colStatuses.includes(r.status || '')
    const matchesColPriority =
      colPriorities.length === 0 || colPriorities.includes(r.priority || '')
    const avoidableLabel = r.avoidable_contact ? 'Sim' : 'Não'
    const matchesColAvoidable = colAvoidable.length === 0 || colAvoidable.includes(avoidableLabel)
    const durationLabel = r.duration ? `${r.duration} min` : '-'
    const matchesColDuration = colDurations.length === 0 || colDurations.includes(durationLabel)
    const consultantName = r.expand?.assigned_user?.name || r.assigned_agent || 'Não atribuído'
    const matchesColConsultant =
      colConsultants.length === 0 || colConsultants.includes(consultantName)
    const createdDateFormatted = r.created ? formatGMT3DateTime(r.created) : '-'
    const matchesColCreated =
      colCreatedDates.length === 0 || colCreatedDates.includes(createdDateFormatted)

    const recordShares = sharesByRecordMap.get(r.id) || []
    const isSharedRecord = recordShares.length > 0
    const matchesColShared =
      colSharedWith.length === 0 ||
      (colSharedWith.includes('Compartilhado') && isSharedRecord) ||
      (colSharedWith.includes('Não compartilhado') && !isSharedRecord) ||
      recordShares.some((s) => {
        const name = s.expand?.account_executive?.name || s.expand?.user?.name
        return name && colSharedWith.includes(name)
      })

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
      matchesTravelType &&
      matchesColClient &&
      matchesColReason &&
      matchesColStatus &&
      matchesColPriority &&
      matchesColAvoidable &&
      matchesColDuration &&
      matchesColConsultant &&
      matchesColCreated &&
      matchesColShared
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

  // Registros selecionados validados pelo RBAC de acesso do usuário corrente
  const selectedRecords = useMemo(() => {
    const map = new Map(displayRecords.map((r) => [r.id, r]))
    const picked = selectedIds.map((id) => map.get(id)).filter(Boolean) as ServiceRecord[]
    return filterRecordsByUserAccess(picked, user)
  }, [selectedIds, displayRecords, user])

  const validSelectedIds = useMemo(() => selectedRecords.map((r) => r.id), [selectedRecords])

  const handleSelectAll = (checked: boolean) => {
    if (checked) {
      const allowed = filterRecordsByUserAccess(displayRecords, user)
      setSelectedIds(allowed.map((r) => r.id))
    } else {
      setSelectedIds([])
    }
  }

  const handleSelectRow = (id: string, checked: boolean) => {
    if (checked) {
      const target = displayRecords.find((r) => r.id === id)
      if (target && filterRecordsByUserAccess([target], user).length > 0) {
        setSelectedIds((prev) => Array.from(new Set([...prev, id])))
      } else {
        toast({
          variant: 'destructive',
          title: 'Acesso restrito',
          description: 'Você não tem permissão para operar sobre este atendimento.',
        })
      }
    } else {
      setSelectedIds((prev) => prev.filter((i) => i !== id))
    }
  }

  const handleApplyBatchStatus = async () => {
    if (validSelectedIds.length === 0) return
    setIsProcessingBatch(true)
    try {
      await batchUpdateStatus(validSelectedIds, batchStatusValue)
      toast({
        title: 'Status atualizado em lote',
        description: `${validSelectedIds.length} atendimento(s) alterados para "${batchStatusValue}".`,
      })
      setSelectedIds([])
      setBatchStatusModalOpen(false)
      loadData()
    } catch (err) {
      console.error(err)
      toast({ variant: 'destructive', title: 'Erro ao atualizar status em lote' })
    } finally {
      setIsProcessingBatch(false)
    }
  }

  const handleApplyBatchReassign = async () => {
    if (validSelectedIds.length === 0 || !batchConsultantId) return
    setIsProcessingBatch(true)
    try {
      const targetUser = users.find((u) => u.id === batchConsultantId)
      await batchReassignConsultant(validSelectedIds, batchConsultantId, targetUser?.name)
      toast({
        title: 'Consultor reatribuído',
        description: `${validSelectedIds.length} atendimento(s) reassociados a ${targetUser?.name || 'novo consultor'}.`,
      })
      setSelectedIds([])
      setBatchConsultantModalOpen(false)
      setBatchConsultantId('')
      loadData()
    } catch (err) {
      console.error(err)
      toast({ variant: 'destructive', title: 'Erro ao reassociar consultor em lote' })
    } finally {
      setIsProcessingBatch(false)
    }
  }

  const handleApplyBatchAvoidable = async () => {
    if (validSelectedIds.length === 0) return
    setIsProcessingBatch(true)
    try {
      const isAvoidable = batchAvoidableValue === 'sim'
      await batchUpdateAvoidable(validSelectedIds, isAvoidable, batchAvoidableExplanation)
      toast({
        title: 'Classificação atualizada',
        description: `${validSelectedIds.length} atendimento(s) marcados como ${isAvoidable ? 'Evitável' : 'Não Evitável'}.`,
      })
      setSelectedIds([])
      setBatchAvoidableModalOpen(false)
      setBatchAvoidableExplanation('')
      loadData()
    } catch (err) {
      console.error(err)
      toast({ variant: 'destructive', title: 'Erro ao atualizar classificação evitável' })
    } finally {
      setIsProcessingBatch(false)
    }
  }

  const handleExportSelectedCSV = () => {
    if (selectedRecords.length === 0) return
    downloadServiceRecordsCSV(selectedRecords, 'atendimentos-selecionados.csv')
    toast({
      title: 'Seleção exportada',
      description: `${selectedRecords.length} atendimento(s) exportado(s) em CSV.`,
    })
  }

  const handleExportSelectedExcel = () => {
    if (selectedRecords.length === 0) return
    downloadServiceRecordsExcel(selectedRecords)
    toast({
      title: 'Seleção exportada',
      description: `${selectedRecords.length} atendimento(s) exportado(s) em Excel.`,
    })
  }

  const handleExportSelectedPDF = () => {
    if (selectedRecords.length === 0) return
    downloadServiceRecordsPDF(selectedRecords)
    toast({
      title: 'Seleção exportada',
      description: `${selectedRecords.length} atendimento(s) exportado(s) em PDF.`,
    })
  }

  const handleBatchDelete = async () => {
    if (validSelectedIds.length === 0) return
    if (!confirm(`Deseja excluir ${validSelectedIds.length} atendimento(s)?`)) return
    try {
      await batchDeleteServiceRecords(validSelectedIds)
      toast({ title: 'Atendimentos excluídos com sucesso' })
      setSelectedIds([])
      loadData()
    } catch (err) {
      toast({ variant: 'destructive', title: 'Erro ao excluir em lote' })
    }
  }

  const handleToggleTask = async (recordId: string, taskIndex: number) => {
    const record = records.find((r) => r.id === recordId)
    if (!record || !Array.isArray(record.tasks)) return
    const newTasks = [...record.tasks]
    newTasks[taskIndex] = { ...newTasks[taskIndex], done: !newTasks[taskIndex].done }
    setRecords((prev) => prev.map((r) => (r.id === recordId ? { ...r, tasks: newTasks } : r)))
    try {
      await updateServiceRecord(recordId, { tasks: newTasks })
    } catch (err) {
      toast({ variant: 'destructive', title: 'Erro ao atualizar tarefa' })
      loadData()
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
    setColClients([])
    setColReasons([])
    setColStatuses([])
    setColPriorities([])
    setColAvoidable([])
    setColDurations([])
    setColConsultants([])
    setColCreatedDates([])
    setColSharedWith([])
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
        <div className="grid grid-cols-2 sm:grid-cols-3 md:grid-cols-6 lg:grid-cols-12 gap-2 items-end">
          {/* Busca por texto */}
          <div className="col-span-2 sm:col-span-3 md:col-span-3 lg:col-span-3 relative">
            <Search className="absolute left-2.5 top-2 h-3.5 w-3.5 text-slate-400" />
            <Input
              placeholder="Buscar cliente, empresa..."
              value={search}
              onChange={(e) => setSearch(e.target.value)}
              className="pl-7 h-8 text-xs w-full"
            />
          </div>

          {/* Status */}
          <div className="col-span-1 sm:col-span-1 md:col-span-2 lg:col-span-2">
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

          {/* Motivo */}
          <div className="col-span-1 sm:col-span-1 md:col-span-2 lg:col-span-2">
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

          {/* Evitável */}
          <div className="col-span-1 sm:col-span-1 md:col-span-2 lg:col-span-2">
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
                <SelectItem value="todos">Evitável: Todos</SelectItem>
                <SelectItem value="sim">Sim</SelectItem>
                <SelectItem value="nao">Não</SelectItem>
              </SelectContent>
            </Select>
          </div>

          {/* Grupo */}
          <div className="col-span-1 sm:col-span-1 md:col-span-2 lg:col-span-2">
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

          {/* Viagem */}
          <div className="col-span-1 sm:col-span-1 md:col-span-1 lg:col-span-1">
            <Select value={travelTypeFilter} onValueChange={setTravelTypeFilter}>
              <SelectTrigger className="h-8 text-xs w-full">
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
        </div>

        {/* Linha 2: Filtro de Data + Botão Limpar + Ações de Exportação */}
        <div className="flex flex-wrap items-center justify-between gap-2 pt-1 border-t border-slate-100">
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
            {(search ||
              statusFilter !== 'todos' ||
              reasonFilter !== 'todos' ||
              wrongDeptFilter !== 'todos' ||
              serviceGroupFilter !== 'todos' ||
              travelTypeFilter !== 'todos' ||
              dateFrom ||
              dateTo ||
              colClients.length > 0 ||
              colReasons.length > 0 ||
              colStatuses.length > 0 ||
              colPriorities.length > 0 ||
              colAvoidable.length > 0 ||
              colDurations.length > 0 ||
              colConsultants.length > 0 ||
              colCreatedDates.length > 0 ||
              colSharedWith.length > 0) && (
              <Button
                variant="ghost"
                size="sm"
                onClick={clearFilters}
                className="h-8 text-xs text-slate-600 px-2.5 hover:bg-slate-100"
                title="Limpar todos os filtros"
              >
                <RotateCcw className="h-3.5 w-3.5 mr-1" />
                Limpar filtros
              </Button>
            )}
          </div>

          <div className="flex items-center gap-1.5 ml-auto">
            <ExportMenu
              label="Exportar"
              variant="default"
              className="bg-indigo-600 hover:bg-indigo-700 text-white h-8 text-xs"
              onCSV={handleExportCSV}
              onExcel={handleExportExcel}
              onPDF={handleExportPDF}
            />
            <ExportMenu
              label="Consolidado"
              className="h-8 text-xs"
              onCSV={handleExportConsolidatedCSV}
              onExcel={handleExportConsolidatedExcel}
              onPDF={handleExportConsolidatedPDF}
            />
          </div>
        </div>

        {/* Barra de Ações em Lote: visível somente quando houver seleção */}
        {selectedIds.length > 0 && (
          <div className="flex flex-col sm:flex-row sm:items-center sm:justify-between gap-3 bg-gradient-to-r from-indigo-50 via-cyan-50 to-indigo-50 p-3 rounded-xl border border-indigo-200 shadow-sm animate-in fade-in duration-200">
            <div className="flex items-center gap-2">
              <Badge className="bg-indigo-600 text-white font-bold text-xs px-2.5 py-0.5 shadow-xs">
                {selectedRecords.length} selecionado(s)
              </Badge>
              <span className="text-xs text-slate-600 font-medium hidden sm:inline">
                Ações em massa disponíveis para os atendimentos selecionados
              </span>
            </div>

            <div className="flex flex-wrap items-center gap-1.5">
              {/* Alterar Status em massa */}
              <Button
                size="sm"
                variant="outline"
                className="h-8 text-xs font-semibold border-indigo-200 bg-white hover:bg-indigo-50 text-indigo-700"
                onClick={() => setBatchStatusModalOpen(true)}
              >
                <CheckCircle2 className="h-3.5 w-3.5 mr-1 text-emerald-600" />
                Alterar Status
              </Button>

              {/* Reassociar Consultor em massa */}
              <Button
                size="sm"
                variant="outline"
                className="h-8 text-xs font-semibold border-indigo-200 bg-white hover:bg-indigo-50 text-indigo-700"
                onClick={() => setBatchConsultantModalOpen(true)}
              >
                <UserCheck className="h-3.5 w-3.5 mr-1 text-cyan-600" />
                Reassociar Consultor
              </Button>

              {/* Marcar Evitável / Não Evitável em massa */}
              <Button
                size="sm"
                variant="outline"
                className="h-8 text-xs font-semibold border-indigo-200 bg-white hover:bg-indigo-50 text-indigo-700"
                onClick={() => setBatchAvoidableModalOpen(true)}
              >
                <ShieldCheck className="h-3.5 w-3.5 mr-1 text-amber-600" />
                Classificar Evitável
              </Button>

              {/* Exportar Seleção */}
              <DropdownMenu>
                <DropdownMenuTrigger asChild>
                  <Button
                    size="sm"
                    variant="outline"
                    className="h-8 text-xs font-semibold border-indigo-200 bg-white hover:bg-indigo-50 text-indigo-700"
                  >
                    <FileSpreadsheet className="h-3.5 w-3.5 mr-1 text-indigo-600" />
                    Exportar Seleção
                  </Button>
                </DropdownMenuTrigger>
                <DropdownMenuContent align="end">
                  <DropdownMenuLabel className="text-xs">
                    Exportar {selectedRecords.length} itens
                  </DropdownMenuLabel>
                  <DropdownMenuSeparator />
                  <DropdownMenuItem
                    onClick={handleExportSelectedCSV}
                    className="text-xs cursor-pointer"
                  >
                    <FileSpreadsheet className="h-3.5 w-3.5 mr-1.5 text-emerald-600" /> CSV
                  </DropdownMenuItem>
                  <DropdownMenuItem
                    onClick={handleExportSelectedExcel}
                    className="text-xs cursor-pointer"
                  >
                    <FileSpreadsheet className="h-3.5 w-3.5 mr-1.5 text-indigo-600" /> Excel (.xls)
                  </DropdownMenuItem>
                  <DropdownMenuItem
                    onClick={handleExportSelectedPDF}
                    className="text-xs cursor-pointer"
                  >
                    <FileText className="h-3.5 w-3.5 mr-1.5 text-rose-600" /> PDF
                  </DropdownMenuItem>
                </DropdownMenuContent>
              </DropdownMenu>

              {/* Excluir em lote (opcional/útil) */}
              <Button
                size="sm"
                variant="ghost"
                onClick={handleBatchDelete}
                className="h-8 text-xs text-rose-600 hover:bg-rose-50 hover:text-rose-700 font-semibold"
                title="Excluir selecionados"
              >
                <Trash2 className="h-3.5 w-3.5 mr-1" />
                Excluir
              </Button>

              {/* Botão para limpar seleção */}
              <Button
                size="sm"
                variant="ghost"
                onClick={() => setSelectedIds([])}
                className="h-8 text-xs text-slate-500 hover:text-slate-800 hover:bg-slate-100"
                title="Limpar seleção"
              >
                <X className="h-3.5 w-3.5 mr-1" />
                Limpar
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
          onToggleTask={handleToggleTask}
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
                    currentSortField={sortField}
                    currentSortDirection={sortDirection}
                    onSort={handleSort}
                    filterOptions={records.map((r) =>
                      r.client_company ? `${r.client_company} - ${r.client_name}` : r.client_name,
                    )}
                    filterSelected={colClients}
                    onFilterChange={setColClients}
                  />
                  <SortableHeader
                    label="Contato"
                    field="contact_reason"
                    currentSortField={sortField}
                    currentSortDirection={sortDirection}
                    onSort={handleSort}
                    filterOptions={records.map((r) => r.contact_reason).filter(Boolean) as string[]}
                    filterSelected={colReasons}
                    onFilterChange={setColReasons}
                  />
                  <SortableHeader
                    label="Status"
                    field="status"
                    currentSortField={sortField}
                    currentSortDirection={sortDirection}
                    onSort={handleSort}
                    filterOptions={['Aberto', 'Em Andamento', 'Concluído', 'Cancelado']}
                    filterSelected={colStatuses}
                    onFilterChange={setColStatuses}
                  />
                  <SortableHeader
                    label="TFR"
                    field="first_response_time"
                    currentSortField={sortField}
                    currentSortDirection={sortDirection}
                    onSort={handleSort}
                    filterOptions={[]}
                    filterSelected={[]}
                    onFilterChange={() => {}}
                  />
                  <SortableHeader
                    label="Prioridade"
                    field="priority"
                    currentSortField={sortField}
                    currentSortDirection={sortDirection}
                    onSort={handleSort}
                    filterOptions={['Baixa', 'Média', 'Alta']}
                    filterSelected={colPriorities}
                    onFilterChange={setColPriorities}
                  />
                  <TableHead className="text-xs font-bold">
                    <div className="flex items-center justify-between gap-1">
                      <span>Evitável</span>
                      <TableColumnFilter
                        title="Evitável"
                        options={['Sim', 'Não']}
                        selectedValues={colAvoidable}
                        onChange={setColAvoidable}
                      />
                    </div>
                  </TableHead>
                  <SortableHeader
                    label="Duração"
                    field="duration"
                    currentSortField={sortField}
                    currentSortDirection={sortDirection}
                    onSort={handleSort}
                    filterOptions={records.map((r) => (r.duration ? `${r.duration} min` : '-'))}
                    filterSelected={colDurations}
                    onFilterChange={setColDurations}
                  />
                  <SortableHeader
                    label="Consultor"
                    field="assigned_user"
                    currentSortField={sortField}
                    currentSortDirection={sortDirection}
                    onSort={handleSort}
                    filterOptions={records.map(
                      (r) => r.expand?.assigned_user?.name || r.assigned_agent || 'Não atribuído',
                    )}
                    filterSelected={colConsultants}
                    onFilterChange={setColConsultants}
                  />
                  <SortableHeader
                    label="Criado em"
                    field="created"
                    currentSortField={sortField}
                    currentSortDirection={sortDirection}
                    onSort={handleSort}
                    filterOptions={records.map((r) =>
                      r.created ? formatGMT3DateTime(r.created) : '-',
                    )}
                    filterSelected={colCreatedDates}
                    onFilterChange={setColCreatedDates}
                  />
                  <TableHead className="text-xs font-bold">
                    <div className="flex items-center justify-between gap-1">
                      <span>Compartilhado com</span>
                      <TableColumnFilter
                        title="Compartilhado com"
                        options={['Compartilhado', 'Não compartilhado']}
                        selectedValues={colSharedWith}
                        onChange={setColSharedWith}
                      />
                    </div>
                  </TableHead>
                  <TableHead className="text-xs font-bold text-right">Ação</TableHead>
                </TableRow>
              </TableHeader>
              <TableBody>
                {displayRecords.map((r) => (
                  <TableRow
                    key={r.id}
                    className="hover:bg-slate-50 cursor-pointer transition-colors"
                    onClick={() => {
                      setSelectedRecord(r)
                      setDetailOpen(true)
                    }}
                  >
                    <TableCell onClick={(e) => e.stopPropagation()}>
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
                      <div className="flex items-center gap-1 mt-0.5 flex-wrap">
                        {r.travel_type && <TravelTypeBadge travelType={r.travel_type} />}
                        {(() => {
                          const linkedCalls = callsByRecordMap.get(r.id) || []
                          const linkedEmails = emailsByRecordMap.get(r.id) || []
                          return (
                            <>
                              {linkedCalls.length > 0 && (
                                <Badge
                                  variant="outline"
                                  className="bg-indigo-50 text-indigo-700 border-indigo-200 text-[9px] py-0 px-1 gap-0.5 flex items-center font-medium"
                                  title={`${linkedCalls.length} gravação(ões) de voz analisada(s) por IA vinculada(s)`}
                                >
                                  <Phone className="h-2.5 w-2.5 text-indigo-600" />
                                  {linkedCalls.length} voz IA
                                  {linkedCalls[0]?.quality_score !== undefined && (
                                    <span className="font-semibold text-emerald-700 ml-0.5">
                                      ({linkedCalls[0].quality_score}pts)
                                    </span>
                                  )}
                                </Badge>
                              )}
                              {linkedEmails.length > 0 && (
                                <Badge
                                  variant="outline"
                                  className="bg-sky-50 text-sky-700 border-sky-200 text-[9px] py-0 px-1 gap-0.5 flex items-center font-medium"
                                  title={`${linkedEmails.length} análise(s) de e-mail Outlook vinculadas`}
                                >
                                  <Mail className="h-2.5 w-2.5 text-sky-600" />
                                  {linkedEmails.length} e-mail{linkedEmails.length > 1 ? 's' : ''}{' '}
                                  IA
                                </Badge>
                              )}
                            </>
                          )
                        })()}
                      </div>
                    </TableCell>
                    <TableCell className="text-xs text-slate-700">{r.contact_reason}</TableCell>
                    <TableCell>
                      <div className="flex items-center gap-1.5 flex-wrap">
                        <StatusBadge status={r.status} />
                        {isRecordReopened(r) && (
                          <Badge
                            variant="outline"
                            className="bg-amber-50 text-amber-800 border-amber-300 font-semibold px-2 py-0.5 text-[10px] hover:bg-amber-100 flex items-center gap-1 shadow-xs"
                            title={`Atendimento reaberto${r.reopen_count ? ` (${r.reopen_count}x)` : ''}${r.reopen_justification ? `: ${r.reopen_justification}` : ''}`}
                          >
                            <RotateCcw className="h-2.5 w-2.5 text-amber-600 shrink-0" />
                            <span>Reaberto</span>
                            {typeof r.reopen_count === 'number' && r.reopen_count > 1 && (
                              <span className="text-[9px] font-bold px-1 rounded bg-amber-200 text-amber-900">
                                {r.reopen_count}x
                              </span>
                            )}
                          </Badge>
                        )}
                      </div>
                    </TableCell>
                    <TableCell>
                      <TfrBadge tfrMinutes={r.first_response_time} targetMinutes={15} />
                    </TableCell>
                    <TableCell>
                      <PriorityBadge priority={r.priority} />
                    </TableCell>
                    <TableCell className="text-center">
                      {r.avoidable_contact ? (
                        <span className="inline-flex items-center gap-1 text-[10px] font-semibold text-rose-700 bg-rose-50 px-2 py-0.5 rounded-full">
                          <AlertTriangle className="h-3 w-3" /> Sim
                        </span>
                      ) : (
                        <span className="inline-flex items-center gap-1 text-[10px] font-semibold text-emerald-700 bg-emerald-50 px-2 py-0.5 rounded-full">
                          <CheckCircle2 className="h-3 w-3" /> Não
                        </span>
                      )}
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
                    <TableCell className="text-xs">
                      {(() => {
                        const recShares = sharesByRecordMap.get(r.id) || []
                        if (recShares.length === 0) {
                          return <span className="text-slate-400 text-[11px]">—</span>
                        }
                        return (
                          <div className="flex flex-wrap items-center gap-1 max-w-[200px]">
                            {recShares.map((s) => {
                              const isExec = Boolean(
                                s.account_executive || s.expand?.account_executive,
                              )
                              const name =
                                s.expand?.account_executive?.name ||
                                s.expand?.user?.name ||
                                (isExec ? 'Executivo' : 'Usuário')
                              return (
                                <Badge
                                  key={s.id}
                                  variant="outline"
                                  className={`text-[10px] py-0 px-1.5 flex items-center gap-1 ${
                                    isExec
                                      ? 'border-cyan-300 bg-cyan-50 text-cyan-800'
                                      : 'border-indigo-200 bg-indigo-50 text-indigo-700'
                                  }`}
                                  title={`${name} (${isExec ? 'Executivo - Visualização' : s.permission || 'Visualizar'})`}
                                >
                                  <Share2 className="h-2.5 w-2.5" />
                                  <span className="truncate max-w-[90px]">{name}</span>
                                </Badge>
                              )
                            })}
                          </div>
                        )
                      })()}
                    </TableCell>
                    <TableCell className="text-right" onClick={(e) => e.stopPropagation()}>
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
                    <TableCell colSpan={11} className="text-center py-12 text-slate-400 text-xs">
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

      {/* Modal: Alterar Status em Lote */}
      <Dialog open={batchStatusModalOpen} onOpenChange={setBatchStatusModalOpen}>
        <DialogContent className="sm:max-w-md">
          <DialogHeader>
            <DialogTitle className="text-base font-bold text-slate-900 flex items-center gap-2">
              <CheckCircle2 className="h-5 w-5 text-emerald-600" />
              Alterar Status em Massa
            </DialogTitle>
          </DialogHeader>
          <div className="space-y-3 py-2">
            <p className="text-xs text-slate-600">
              Você está alterando o status de{' '}
              <strong className="text-slate-900">{validSelectedIds.length}</strong> atendimento(s)
              selecionado(s).
            </p>
            <div className="space-y-1.5">
              <Label className="text-xs font-semibold text-slate-700">Novo Status</Label>
              <Select value={batchStatusValue} onValueChange={setBatchStatusValue}>
                <SelectTrigger className="w-full text-xs">
                  <SelectValue placeholder="Selecione o status" />
                </SelectTrigger>
                <SelectContent>
                  <SelectItem value="Aberto">Aberto</SelectItem>
                  <SelectItem value="Em Andamento">Em Andamento</SelectItem>
                  <SelectItem value="Concluído">Concluído</SelectItem>
                  <SelectItem value="Cancelado">Cancelado</SelectItem>
                </SelectContent>
              </Select>
            </div>
          </div>
          <DialogFooter className="gap-2 sm:gap-0">
            <Button
              variant="outline"
              size="sm"
              onClick={() => setBatchStatusModalOpen(false)}
              disabled={isProcessingBatch}
              className="text-xs"
            >
              Cancelar
            </Button>
            <Button
              size="sm"
              onClick={handleApplyBatchStatus}
              disabled={isProcessingBatch}
              className="bg-indigo-600 hover:bg-indigo-700 text-xs text-white"
            >
              {isProcessingBatch ? 'Atualizando...' : 'Confirmar Alteração'}
            </Button>
          </DialogFooter>
        </DialogContent>
      </Dialog>

      {/* Modal: Reassociar Consultor em Lote */}
      <Dialog open={batchConsultantModalOpen} onOpenChange={setBatchConsultantModalOpen}>
        <DialogContent className="sm:max-w-md">
          <DialogHeader>
            <DialogTitle className="text-base font-bold text-slate-900 flex items-center gap-2">
              <UserCheck className="h-5 w-5 text-cyan-600" />
              Reassociar Consultor em Massa
            </DialogTitle>
          </DialogHeader>
          <div className="space-y-3 py-2">
            <p className="text-xs text-slate-600">
              Selecione o novo consultor responsável para os{' '}
              <strong className="text-slate-900">{validSelectedIds.length}</strong> atendimento(s)
              selecionados.
            </p>
            <div className="space-y-1.5">
              <Label className="text-xs font-semibold text-slate-700">Consultor / Usuário</Label>
              <Select value={batchConsultantId} onValueChange={setBatchConsultantId}>
                <SelectTrigger className="w-full text-xs">
                  <SelectValue placeholder="Selecione o colaborador" />
                </SelectTrigger>
                <SelectContent className="max-h-60">
                  {users
                    .filter((u) =>
                      [
                        'Consultor',
                        'Consultores',
                        'Líder',
                        'Supervisor',
                        'Gerente',
                        'Executivo de Contas',
                      ].includes(u.role || ''),
                    )
                    .map((u) => (
                      <SelectItem key={u.id} value={u.id} className="text-xs">
                        {u.name} ({u.role})
                      </SelectItem>
                    ))}
                </SelectContent>
              </Select>
            </div>
          </div>
          <DialogFooter className="gap-2 sm:gap-0">
            <Button
              variant="outline"
              size="sm"
              onClick={() => setBatchConsultantModalOpen(false)}
              disabled={isProcessingBatch}
              className="text-xs"
            >
              Cancelar
            </Button>
            <Button
              size="sm"
              onClick={handleApplyBatchReassign}
              disabled={isProcessingBatch || !batchConsultantId}
              className="bg-indigo-600 hover:bg-indigo-700 text-xs text-white"
            >
              {isProcessingBatch ? 'Reatribuindo...' : 'Reatribuir Selecionados'}
            </Button>
          </DialogFooter>
        </DialogContent>
      </Dialog>

      {/* Modal: Classificar Evitável em Lote */}
      <Dialog open={batchAvoidableModalOpen} onOpenChange={setBatchAvoidableModalOpen}>
        <DialogContent className="sm:max-w-md">
          <DialogHeader>
            <DialogTitle className="text-base font-bold text-slate-900 flex items-center gap-2">
              <ShieldCheck className="h-5 w-5 text-amber-600" />
              Classificar Evitável / Não Evitável
            </DialogTitle>
          </DialogHeader>
          <div className="space-y-3 py-2">
            <p className="text-xs text-slate-600">
              Atualize a classificação de contato evitável em{' '}
              <strong className="text-slate-900">{validSelectedIds.length}</strong> atendimento(s).
            </p>
            <div className="space-y-1.5">
              <Label className="text-xs font-semibold text-slate-700">Classificação</Label>
              <Select
                value={batchAvoidableValue}
                onValueChange={(val: 'sim' | 'nao') => setBatchAvoidableValue(val)}
              >
                <SelectTrigger className="w-full text-xs">
                  <SelectValue placeholder="Selecione" />
                </SelectTrigger>
                <SelectContent>
                  <SelectItem value="sim">Sim (Contato Evitável / Dúvida)</SelectItem>
                  <SelectItem value="nao">Não (Contato Não Evitável)</SelectItem>
                </SelectContent>
              </Select>
            </div>
            {batchAvoidableValue === 'sim' && (
              <div className="space-y-1.5">
                <Label className="text-xs font-semibold text-slate-700">
                  Justificativa / Motivo Evitável (opcional)
                </Label>
                <Input
                  className="text-xs h-8"
                  placeholder="Ex: Informação já disponível no portal / política de bagagem"
                  value={batchAvoidableExplanation}
                  onChange={(e) => setBatchAvoidableExplanation(e.target.value)}
                />
              </div>
            )}
          </div>
          <DialogFooter className="gap-2 sm:gap-0">
            <Button
              variant="outline"
              size="sm"
              onClick={() => setBatchAvoidableModalOpen(false)}
              disabled={isProcessingBatch}
              className="text-xs"
            >
              Cancelar
            </Button>
            <Button
              size="sm"
              onClick={handleApplyBatchAvoidable}
              disabled={isProcessingBatch}
              className="bg-indigo-600 hover:bg-indigo-700 text-xs text-white"
            >
              {isProcessingBatch ? 'Atualizando...' : 'Confirmar Classificação'}
            </Button>
          </DialogFooter>
        </DialogContent>
      </Dialog>
    </div>
  )
}
