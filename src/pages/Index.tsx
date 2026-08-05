import { useState, useEffect, useMemo } from 'react'
import { Button } from '@/components/ui/button'
import { Card } from '@/components/ui/card'
import { ServiceRecord } from '@/types/service_record'
import { DateRangeFilter } from '@/components/DateRangeFilter'
import { ServiceRecordDetailModal } from '@/components/ServiceRecordDetailModal'
import { NovoAtendimentoModal } from '@/components/NovoAtendimentoModal'
import { useRealtime } from '@/hooks/use-realtime'
import { useAuth } from '@/hooks/use-auth'
import { useToast } from '@/hooks/use-toast'
import { MinhasTarefasList } from '@/components/MinhasTarefasList'
import { DashboardStats } from '@/components/DashboardStats'
import { RecentActivities } from '@/components/RecentActivities'
import { getServiceRecords, batchUpdateStatus } from '@/services/service_records'
import { getClients } from '@/services/clients'
import { getAgents } from '@/services/agents'
import { ClientRecord, AgentRecord } from '@/types/service_record'
import { CompanyReport } from '@/components/CompanyReport'
import { CompanyDetailsModal } from '@/components/CompanyDetailsModal'
import { PeriodComparison } from '@/components/PeriodComparison'
import { Plus } from 'lucide-react'
import { downloadServiceRecordsCSV } from '@/lib/report-export'
import {
  downloadServiceRecordsExcel,
  downloadServiceRecordsPDF,
} from '@/lib/service-records-export'
import { ExportMenu } from '@/components/ExportMenu'
import { ConsolidatedReportPanel } from '@/components/ConsolidatedReportPanel'

export default function Index() {
  const [records, setRecords] = useState<ServiceRecord[]>([])
  const [clients, setClients] = useState<ClientRecord[]>([])
  const [agents, setAgents] = useState<AgentRecord[]>([])
  const [selectedRecord, setSelectedRecord] = useState<ServiceRecord | null>(null)
  const [companyModalOpen, setCompanyModalOpen] = useState(false)
  const [selectedCompany, setSelectedCompany] = useState('')
  const [detailOpen, setDetailOpen] = useState(false)
  const [novoModalOpen, setNovoModalOpen] = useState(false)
  const [selectedIds, setSelectedIds] = useState<Set<string>>(new Set())
  const [bulkLoading, setBulkLoading] = useState(false)
  const [dateFrom, setDateFrom] = useState('')
  const [dateTo, setDateTo] = useState('')
  const { user } = useAuth()
  const { toast } = useToast()

  const loadData = async () => {
    try {
      const [list, clientList, agentList] = await Promise.all([
        getServiceRecords('', '-created'),
        getClients(),
        getAgents(),
      ])
      setRecords(list)
      setClients(clientList)
      setAgents(agentList)
    } catch (err) {
      console.error('Failed to load data:', err)
    }
  }

  useEffect(() => {
    loadData()
  }, [])

  useRealtime('service_records', () => {
    loadData()
  })

  useRealtime('clients', () => {
    loadData()
  })

  useRealtime('agents', () => {
    loadData()
  })

  const todayStr = new Date().toISOString().split('T')[0]
  const dateFilteredRecords = records.filter((r) => {
    if (!r.created) return true
    const recDate = r.created.substring(0, 10)
    if (dateFrom && recDate < dateFrom) return false
    if (dateTo && recDate > dateTo) return false
    return true
  })
  const hasDateFilter = !!dateFrom || !!dateTo

  const previousPeriodData = useMemo(() => {
    if (!dateFrom || !dateTo) return null
    const start = new Date(dateFrom + 'T00:00:00')
    const end = new Date(dateTo + 'T00:00:00')
    if (end < start) return null
    const daysDiff = Math.floor((end.getTime() - start.getTime()) / (1000 * 60 * 60 * 24)) + 1
    const prevEnd = new Date(start)
    prevEnd.setDate(prevEnd.getDate() - 1)
    const prevStart = new Date(prevEnd)
    prevStart.setDate(prevStart.getDate() - (daysDiff - 1))
    const prevStartStr = prevStart.toISOString().split('T')[0]
    const prevEndStr = prevEnd.toISOString().split('T')[0]
    const prevRecords = records.filter((r) => {
      if (!r.created) return false
      const recDate = r.created.substring(0, 10)
      return recDate >= prevStartStr && recDate <= prevEndStr
    })
    return {
      count: prevRecords.length,
      prevStartStr,
      prevEndStr,
    }
  }, [records, dateFrom, dateTo])

  const hasFullDateRange = !!dateFrom && !!dateTo

  const todayRecords = dateFilteredRecords.filter(
    (r) => r.created && r.created.startsWith(todayStr),
  )
  const inProgressRecords = dateFilteredRecords.filter((r) => r.status === 'Em Andamento')
  const completedToday = dateFilteredRecords.filter(
    (r) => r.status === 'Concluído' && r.updated && r.updated.startsWith(todayStr),
  )
  const myRecords = dateFilteredRecords.filter((r) => r.assigned_user === user?.id)
  const totalDuration = dateFilteredRecords.reduce((acc, r) => acc + (r.duration || 0), 0)
  const avgDuration =
    dateFilteredRecords.length > 0 ? Math.round(totalDuration / dateFilteredRecords.length) : 0
  const wrongDeptCount = dateFilteredRecords.filter((r) => r.wrong_department === true).length
  const recentRecords = dateFilteredRecords.slice(0, 10)

  const handleToggleSelect = (id: string) => {
    setSelectedIds((prev) => {
      const next = new Set(prev)
      if (next.has(id)) next.delete(id)
      else next.add(id)
      return next
    })
  }

  const handleSelectAll = () => {
    if (selectedIds.size === recentRecords.length) {
      setSelectedIds(new Set())
    } else {
      setSelectedIds(new Set(recentRecords.map((r) => r.id)))
    }
  }

  const handleClearSelection = () => setSelectedIds(new Set())

  const handleBulkComplete = async () => {
    setBulkLoading(true)
    try {
      await batchUpdateStatus(Array.from(selectedIds), 'Concluído')
      toast({ title: `${selectedIds.size} atendimento(s) marcado(s) como Concluído` })
      setSelectedIds(new Set())
      loadData()
    } catch (err) {
      toast({ variant: 'destructive', title: 'Erro ao atualizar registros' })
    } finally {
      setBulkLoading(false)
    }
  }

  const handleExportCSV = () => {
    downloadServiceRecordsCSV(dateFilteredRecords, 'relatorio-atendimentos.csv')
    toast({
      title: 'Relatório exportado',
      description: `${dateFilteredRecords.length} atendimento(s) em CSV.`,
    })
  }
  const handleExportExcel = () => {
    downloadServiceRecordsExcel(dateFilteredRecords)
    toast({
      title: 'Relatório exportado',
      description: `${dateFilteredRecords.length} atendimento(s) em Excel.`,
    })
  }
  const handleExportPDF = () => {
    downloadServiceRecordsPDF(dateFilteredRecords)
    toast({
      title: 'Relatório exportado',
      description: `${dateFilteredRecords.length} atendimento(s) em PDF.`,
    })
  }

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
        <div className="flex items-center gap-2">
          <ExportMenu
            label="Exportar"
            onCSV={handleExportCSV}
            onExcel={handleExportExcel}
            onPDF={handleExportPDF}
          />
          <Button
            onClick={() => setNovoModalOpen(true)}
            className="bg-gradient-to-r from-cyan-600 via-indigo-600 to-purple-600 hover:from-cyan-700 hover:via-indigo-700 hover:to-purple-700 text-white font-bold shadow-md transition-all"
          >
            <Plus className="h-4 w-4 mr-1.5" />
            Novo Atendimento
          </Button>
        </div>
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
        hasActiveFilter={hasDateFilter}
      />

      {hasFullDateRange && previousPeriodData && (
        <PeriodComparison
          currentCount={dateFilteredRecords.length}
          previousCount={previousPeriodData.count}
        />
      )}

      {hasDateFilter && dateFilteredRecords.length === 0 && (
        <Card className="border-slate-200 shadow-subtle p-8 text-center">
          <p className="text-sm text-slate-400">
            Nenhum registro encontrado para o período selecionado.
          </p>
        </Card>
      )}

      <DashboardStats
        todayCount={todayRecords.length}
        totalCount={dateFilteredRecords.length}
        inProgressCount={inProgressRecords.length}
        completedTodayCount={completedToday.length}
        avgDuration={avgDuration}
        wrongDeptCount={wrongDeptCount}
      />

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

      <RecentActivities
        records={recentRecords}
        selectedIds={selectedIds}
        onToggleSelect={handleToggleSelect}
        onSelectAll={handleSelectAll}
        onClearSelection={handleClearSelection}
        onViewRecord={(r) => {
          setSelectedRecord(r)
          setDetailOpen(true)
        }}
        onBulkComplete={handleBulkComplete}
        bulkLoading={bulkLoading}
      />

      <Button
        onClick={() => setNovoModalOpen(true)}
        className="fixed bottom-6 right-6 h-14 w-14 rounded-full bg-gradient-to-r from-cyan-500 via-indigo-600 to-purple-600 hover:from-cyan-600 hover:via-indigo-700 hover:to-purple-700 text-white shadow-xl flex items-center justify-center transition-transform hover:scale-105 z-30"
      >
        <Plus className="h-7 w-7" />
      </Button>

      <div className="space-y-3">
        <h3 className="text-base font-bold text-slate-900">Relatório por Empresa</h3>
        <CompanyReport
          records={dateFilteredRecords}
          clients={clients}
          agents={agents}
          onCompanyClick={(company) => {
            setSelectedCompany(company)
            setCompanyModalOpen(true)
          }}
        />
      </div>

      <ConsolidatedReportPanel records={dateFilteredRecords} />

      <ServiceRecordDetailModal
        record={selectedRecord}
        open={detailOpen}
        onOpenChange={setDetailOpen}
        onUpdateSuccess={loadData}
      />

      <CompanyDetailsModal
        open={companyModalOpen}
        onOpenChange={setCompanyModalOpen}
        companyName={selectedCompany}
      />

      <NovoAtendimentoModal
        open={novoModalOpen}
        onOpenChange={setNovoModalOpen}
        onSuccess={loadData}
      />
    </div>
  )
}
