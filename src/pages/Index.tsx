import { useState, useEffect } from 'react'
import { Button } from '@/components/ui/button'
import { ServiceRecord } from '@/types/service_record'
import { ServiceRecordDetailModal } from '@/components/ServiceRecordDetailModal'
import { NovoAtendimentoModal } from '@/components/NovoAtendimentoModal'
import { useRealtime } from '@/hooks/use-realtime'
import { useAuth } from '@/hooks/use-auth'
import { useToast } from '@/hooks/use-toast'
import { MinhasTarefasList } from '@/components/MinhasTarefasList'
import { DashboardStats } from '@/components/DashboardStats'
import { RecentActivities } from '@/components/RecentActivities'
import { getServiceRecords, batchUpdateStatus } from '@/services/service_records'
import { Plus } from 'lucide-react'

export default function Index() {
  const [records, setRecords] = useState<ServiceRecord[]>([])
  const [selectedRecord, setSelectedRecord] = useState<ServiceRecord | null>(null)
  const [detailOpen, setDetailOpen] = useState(false)
  const [novoModalOpen, setNovoModalOpen] = useState(false)
  const [selectedIds, setSelectedIds] = useState<Set<string>>(new Set())
  const [bulkLoading, setBulkLoading] = useState(false)
  const { user } = useAuth()
  const { toast } = useToast()

  const loadData = async () => {
    try {
      const list = await getServiceRecords('', '-created')
      setRecords(list)
    } catch (err) {
      console.error('Failed to load records:', err)
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
  const wrongDeptCount = records.filter((r) => r.wrong_department === true).length
  const recentRecords = records.slice(0, 10)

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
        <Button
          onClick={() => setNovoModalOpen(true)}
          className="bg-gradient-to-r from-cyan-600 via-indigo-600 to-purple-600 hover:from-cyan-700 hover:via-indigo-700 hover:to-purple-700 text-white font-bold shadow-md transition-all"
        >
          <Plus className="h-4 w-4 mr-1.5" />
          Novo Atendimento
        </Button>
      </div>

      <DashboardStats
        todayCount={todayRecords.length}
        totalCount={records.length}
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
