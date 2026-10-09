import { useState, useEffect, useMemo } from 'react'
import { Card } from '@/components/ui/card'
import { Button } from '@/components/ui/button'
import { Input } from '@/components/ui/input'
import { Badge } from '@/components/ui/badge'
import {
  Table,
  TableHeader,
  TableBody,
  TableRow,
  TableHead,
  TableCell,
} from '@/components/ui/table'
import { useAuth } from '@/hooks/use-auth'
import { useRealtime } from '@/hooks/use-realtime'
import { useToast } from '@/hooks/use-toast'
import {
  ControlTowerEmailRecord,
  ControlTowerConfigRecord,
  ControlTowerStatus,
  ControlTowerPriority,
  ControlTowerAgentLoad,
} from '@/types/control_tower'
import { UserRecord } from '@/types/service_record'
import {
  getControlTowerEmails,
  getControlTowerConfig,
  updateControlTowerEmailStatus,
  assignControlTowerEmail,
  recalculateControlTowerScores,
  ingestLogsToControlTower,
} from '@/services/control_tower'
import { getUsers } from '@/services/users'
import { filterControlTowerEmailsByAccess, isMasterUser } from '@/lib/service-group-access'
import { SERVICE_GROUP_OPTIONS, getServiceGroupLabel } from '@/lib/service-groups'
import { ControlTowerConfigModal } from '@/components/ControlTowerConfigModal'
import { ControlTowerDetailModal } from '@/components/ControlTowerDetailModal'
import { ControlTowerAssignModal } from '@/components/ControlTowerAssignModal'
import { ControlTowerAgentLoadCard } from '@/components/ControlTowerAgentLoadCard'
import { SlaCountdownBadge, computeSlaStatus } from '@/components/SlaCountdownBadge'
import {
  SlidersHorizontal,
  RefreshCw,
  Search,
  FilterX,
  Mail,
  Clock,
  User,
  Building,
  UserCheck,
  Tag,
  ArrowUpDown,
  Download,
  AlertTriangle,
  Flame,
  CheckCircle2,
  Inbox,
  ShieldAlert,
  MessagesSquare,
  MessageSquareText,
} from 'lucide-react'

export default function TorreControle() {
  const { user } = useAuth()
  const { toast } = useToast()

  const [emails, setEmails] = useState<ControlTowerEmailRecord[]>([])
  const [users, setUsers] = useState<UserRecord[]>([])
  const [config, setConfig] = useState<ControlTowerConfigRecord | null>(null)
  const [loading, setLoading] = useState(true)
  const [actionLoading, setActionLoading] = useState(false)

  // Filtros
  const [search, setSearch] = useState('')
  const [filterPriority, setFilterPriority] = useState<string>('Todas')
  const [filterStatus, setFilterStatus] = useState<string>('Ativos') // 'Ativos' | 'Todos' | 'Estourados/Escalados' | Status específico
  const [filterGroup, setFilterGroup] = useState<string>('Todos')
  const [filterTeam, setFilterTeam] = useState<string>('Todas')
  const [onlyMultipleMessages, setOnlyMultipleMessages] = useState<boolean>(false)
  const [onlyMine, setOnlyMine] = useState(false)
  const [hideNoise, setHideNoise] = useState(true)
  const [filterAssignedUserId, setFilterAssignedUserId] = useState<string>('')
  const [sortBy, setSortBy] = useState<'score' | 'sla' | 'recent' | 'messages'>('score')

  // Modais
  const [configModalOpen, setConfigModalOpen] = useState(false)
  const [detailModalOpen, setDetailModalOpen] = useState(false)
  const [selectedEmail, setSelectedEmail] = useState<ControlTowerEmailRecord | null>(null)
  const [assignModalOpen, setAssignModalOpen] = useState(false)
  const [assignTargetEmailId, setAssignTargetEmailId] = useState<string | null>(null)

  // Permissão de Líder / Master para acessar parâmetros
  const isLeaderOrMaster =
    isMasterUser(user) ||
    user?.role === 'Líder' ||
    user?.role === 'Gerente' ||
    user?.role === 'Gestor Comercial'

  const loadData = async () => {
    try {
      const [emailData, configData, userData] = await Promise.all([
        getControlTowerEmails(true), // Exibe 1 item por conversa (apenas raízes da thread)
        getControlTowerConfig(),
        getUsers(),
      ])
      setEmails(emailData)
      setConfig(configData)
      setUsers(userData)
    } catch (err) {
      console.error('Erro ao carregar dados da Torre:', err)
    } finally {
      setLoading(false)
    }
  }

  useEffect(() => {
    loadData()
  }, [])

  useRealtime('control_tower_emails', () => {
    loadData()
  })

  // Recalcular manualmente
  const handleRecalculate = async () => {
    setActionLoading(true)
    try {
      const res = await recalculateControlTowerScores()
      toast({
        title: 'Scores recalculados',
        description: `${res.updated_count} e-mails atualizados de acordo com as regras de expediente e tempo na caixa.`,
      })
      loadData()
    } catch (err) {
      toast({
        variant: 'destructive',
        title: 'Erro ao recalcular scores',
      })
    } finally {
      setActionLoading(false)
    }
  }

  // Sincronizar e-mails da caixa (ingestão a partir da base consolidada de logs)
  const handleIngest = async () => {
    setActionLoading(true)
    try {
      const res = await ingestLogsToControlTower(50)
      toast({
        title: 'Sincronização concluída',
        description: `${res.processed} novos e-mails processados na Torre (${res.skipped} já existentes ignorados).`,
      })
      loadData()
    } catch (err) {
      toast({
        variant: 'destructive',
        title: 'Erro na sincronização de e-mails',
      })
    } finally {
      setActionLoading(false)
    }
  }

  // Assumir atendimento
  const handleAssignToMe = async (emailId: string) => {
    if (!user) return
    try {
      await assignControlTowerEmail(emailId, user.id)
      toast({
        title: 'Atendimento assumido',
        description: 'Você assumiu a responsabilidade por este e-mail.',
      })
      loadData()
    } catch (err) {
      toast({
        variant: 'destructive',
        title: 'Erro ao assumir atendimento',
      })
    }
  }

  // Atribuir a outro usuário
  const handleAssignToOther = (emailId: string) => {
    setAssignTargetEmailId(emailId)
    setAssignModalOpen(true)
  }

  const handleConfirmAssign = async (emailId: string, targetUserId: string) => {
    try {
      await assignControlTowerEmail(emailId, targetUserId)
      toast({
        title: 'Atribuição atualizada com sucesso',
      })
      loadData()
    } catch (err) {
      toast({
        variant: 'destructive',
        title: 'Erro ao atribuir atendimento',
      })
    }
  }

  // Mudar status
  const handleStatusChange = async (emailId: string, newStatus: ControlTowerStatus) => {
    try {
      await updateControlTowerEmailStatus(emailId, newStatus)
      toast({
        title: `Status alterado para "${newStatus}"`,
      })
      loadData()
      if (selectedEmail && selectedEmail.id === emailId) {
        setSelectedEmail({ ...selectedEmail, status: newStatus })
      }
    } catch (err) {
      toast({
        variant: 'destructive',
        title: 'Erro ao atualizar status',
      })
    }
  }

  // 1. Filtrar pelo escopo Núcleo + Equipe do usuário logado (regra da v0.0.251)
  const accessibleEmails = useMemo(() => {
    return filterControlTowerEmailsByAccess(emails, user)
  }, [emails, user])

  // 2. Calcular carga dos atendentes (para gestores e equipe)
  const { loads, unassignedCount } = useMemo(() => {
    const userMap: Record<string, { activeCount: number; p1Count: number }> = {}
    let unassigned = 0

    accessibleEmails.forEach((em) => {
      if (em.status === 'Resolvido') return
      if (em.is_noise) return

      if (em.assigned_to) {
        if (!userMap[em.assigned_to]) {
          userMap[em.assigned_to] = { activeCount: 0, p1Count: 0 }
        }
        userMap[em.assigned_to].activeCount++
        if (em.priority === 'P1') userMap[em.assigned_to].p1Count++
      } else {
        unassigned++
      }
    })

    const agentLoads: ControlTowerAgentLoad[] = []
    Object.keys(userMap).forEach((userId) => {
      const u = users.find((usr) => usr.id === userId)
      if (u) {
        agentLoads.push({
          userId,
          userName: u.name,
          userEmail: u.email,
          activeCount: userMap[userId].activeCount,
          p1Count: userMap[userId].p1Count,
        })
      }
    })

    agentLoads.sort((a, b) => b.activeCount - a.activeCount)
    return { loads: agentLoads, unassignedCount: unassigned }
  }, [accessibleEmails, users])

  // 3. Aplicar filtros de tela
  const filteredEmails = useMemo(() => {
    return accessibleEmails
      .filter((em) => {
        // Ruído
        if (hideNoise && em.is_noise) return false

        // Busca por assunto, remetente, empresa cliente ou reserva
        if (search.trim()) {
          const q = search.toLowerCase()
          const matchSubject = (em.subject || '').toLowerCase().includes(q)
          const matchSender =
            (em.sender_email || '').toLowerCase().includes(q) ||
            (em.sender_name || '').toLowerCase().includes(q)
          const matchClient =
            (em.expand?.client?.company || '').toLowerCase().includes(q) ||
            (em.expand?.client?.name || '').toLowerCase().includes(q)
          const matchReservation = (em.reservation_number || '').toLowerCase().includes(q)
          if (!matchSubject && !matchSender && !matchClient && !matchReservation) {
            return false
          }
        }

        // Prioridade
        if (filterPriority !== 'Todas' && em.priority !== filterPriority) {
          return false
        }

        // Status
        if (filterStatus === 'Ativos') {
          if (em.status === 'Resolvido') return false
        } else if (filterStatus === 'Estourados/Escalados') {
          const sla = computeSlaStatus(em.sla_deadline, em.status)
          if (!sla.isBreached && em.status !== 'Escalado') return false
        } else if (filterStatus !== 'Todos') {
          if (em.status !== filterStatus) return false
        }

        // Núcleo
        if (filterGroup !== 'Todos') {
          if (em.service_group !== filterGroup) return false
        }

        // Equipe (INTER / NAC)
        if (filterTeam !== 'Todas') {
          if (em.team !== filterTeam) return false
        }

        // Somente meus atribuídos
        if (onlyMine && user) {
          if (em.assigned_to !== user.id) return false
        }

        // Filtro de Múltiplas Mensagens (Threading)
        if (onlyMultipleMessages) {
          if ((em.message_count || 1) <= 1) return false
        }

        // Filtro específico clicado no card de carga
        if (filterAssignedUserId) {
          if (em.assigned_to !== filterAssignedUserId) return false
        }

        return true
      })
      .sort((a, b) => {
        if (sortBy === 'messages') {
          const ma = a.message_count || 1
          const mb = b.message_count || 1
          if (mb !== ma) return mb - ma
          return b.score - a.score
        }
        if (sortBy === 'sla') {
          if (!a.sla_deadline && !b.sla_deadline) return 0
          if (!a.sla_deadline) return 1
          if (!b.sla_deadline) return -1
          return new Date(a.sla_deadline).getTime() - new Date(b.sla_deadline).getTime()
        }
        if (sortBy === 'recent') {
          const da = new Date(a.last_message_at || a.received_at || a.created).getTime()
          const db = new Date(b.last_message_at || b.received_at || b.created).getTime()
          return db - da
        }
        return b.score - a.score
      })
  }, [
    accessibleEmails,
    search,
    filterPriority,
    filterStatus,
    filterGroup,
    filterTeam,
    onlyMultipleMessages,
    onlyMine,
    hideNoise,
    filterAssignedUserId,
    sortBy,
    user,
  ])

  // Contadores gerais
  const counts = useMemo(() => {
    const totalActive = accessibleEmails.filter(
      (e) => e.status !== 'Resolvido' && !e.is_noise,
    ).length
    const p1Active = accessibleEmails.filter(
      (e) => e.priority === 'P1' && e.status !== 'Resolvido' && !e.is_noise,
    ).length
    const p2Active = accessibleEmails.filter(
      (e) => e.priority === 'P2' && e.status !== 'Resolvido' && !e.is_noise,
    ).length
    const escalatedOrBreached = accessibleEmails.filter((e) => {
      if (e.status === 'Resolvido' || e.is_noise) return false
      const sla = computeSlaStatus(e.sla_deadline, e.status)
      return e.status === 'Escalado' || sla.isBreached
    }).length
    const myActive = accessibleEmails.filter(
      (e) => e.assigned_to === user?.id && e.status !== 'Resolvido',
    ).length
    const multiMessageActive = accessibleEmails.filter(
      (e) => (e.message_count || 1) > 1 && e.status !== 'Resolvido' && !e.is_noise,
    ).length
    return { totalActive, p1Active, p2Active, escalatedOrBreached, myActive, multiMessageActive }
  }, [accessibleEmails, user])

  const clearFilters = () => {
    setSearch('')
    setFilterPriority('Todas')
    setFilterStatus('Ativos')
    setFilterGroup('Todos')
    setFilterTeam('Todas')
    setOnlyMultipleMessages(false)
    setOnlyMine(false)
    setHideNoise(true)
    setFilterAssignedUserId('')
    setSortBy('score')
  }

  const hasActiveFilters =
    search ||
    filterPriority !== 'Todas' ||
    filterStatus !== 'Ativos' ||
    filterGroup !== 'Todos' ||
    filterTeam !== 'Todas' ||
    onlyMultipleMessages ||
    onlyMine ||
    !hideNoise ||
    filterAssignedUserId ||
    sortBy !== 'score'

  return (
    <div className="space-y-4 max-w-full overflow-x-hidden">
      {/* Cabeçalho da Torre */}
      <div className="flex flex-col sm:flex-row sm:items-center sm:justify-between gap-3 border-b border-slate-200 pb-3">
        <div>
          <div className="flex items-center gap-2">
            <h2 className="text-2xl font-extrabold tracking-tight text-slate-900 flex items-center gap-2">
              <Flame className="h-6 w-6 text-rose-600" />
              Torre de Controle
            </h2>
            <Badge
              variant="outline"
              className="bg-indigo-50 text-indigo-700 border-indigo-200 text-xs font-bold"
            >
              Etapa 3 — Threading & Persistência
            </Badge>
          </div>
          <p className="text-xs text-slate-500 mt-0.5">
            Fila agrupada por conversa (1 item por thread) com escalação por SLA e detecção de
            cliente insistente
          </p>
        </div>
        <div className="flex items-center gap-2 flex-wrap">
          <Button
            variant="outline"
            size="sm"
            onClick={handleIngest}
            disabled={actionLoading}
            className="text-xs font-semibold h-8"
            title="Consumir e analisar e-mails da caixa de entrada"
          >
            <Download className="h-3.5 w-3.5 mr-1 text-indigo-600" />
            Consumir Caixa
          </Button>

          <Button
            variant="outline"
            size="sm"
            onClick={handleRecalculate}
            disabled={actionLoading}
            className="text-xs font-semibold h-8"
            title="Recalcular pontuação com base no expediente e tempo na caixa"
          >
            <RefreshCw
              className={`h-3.5 w-3.5 mr-1 text-cyan-600 ${actionLoading ? 'animate-spin' : ''}`}
            />
            Recalcular
          </Button>

          {isLeaderOrMaster && (
            <Button
              size="sm"
              onClick={() => setConfigModalOpen(true)}
              className="bg-indigo-600 hover:bg-indigo-700 text-white font-bold h-8 text-xs shadow-sm"
            >
              <SlidersHorizontal className="h-3.5 w-3.5 mr-1" />
              Parâmetros da Torre
            </Button>
          )}
        </div>
      </div>

      {/* KPI Cards Rápidos */}
      <div className="grid grid-cols-2 sm:grid-cols-6 gap-3">
        <Card className="p-3 border-slate-200 bg-white">
          <span className="text-[10px] font-bold uppercase tracking-wider text-slate-400 block">
            Total Ativos
          </span>
          <div className="flex items-baseline gap-2 mt-1">
            <span className="text-2xl font-extrabold text-slate-900">{counts.totalActive}</span>
            <span className="text-[11px] text-slate-500">na fila</span>
          </div>
        </Card>

        <Card
          className={`p-3 border-rose-300 transition-all cursor-pointer ${
            filterStatus === 'Estourados/Escalados'
              ? 'bg-rose-100 ring-2 ring-rose-500'
              : 'bg-rose-50/60 hover:bg-rose-100/70'
          }`}
          onClick={() => {
            setFilterStatus((prev) =>
              prev === 'Estourados/Escalados' ? 'Ativos' : 'Estourados/Escalados',
            )
          }}
          title="Clique para filtrar apenas e-mails escalados ou com prazo de SLA estourado"
        >
          <div className="flex items-center justify-between">
            <span className="text-[10px] font-bold uppercase tracking-wider text-rose-700 block">
              SLA Estourado / Escalado
            </span>
            <Flame className="h-4 w-4 text-rose-600 animate-pulse" />
          </div>
          <div className="flex items-baseline gap-2 mt-1">
            <span className="text-2xl font-extrabold text-rose-800">
              {counts.escalatedOrBreached}
            </span>
            <span className="text-[11px] text-rose-700 font-semibold">requer ação</span>
          </div>
        </Card>

        <Card className="p-3 border-red-200 bg-red-50/40">
          <span className="text-[10px] font-bold uppercase tracking-wider text-red-600 block">
            Prioridade P1
          </span>
          <div className="flex items-baseline gap-2 mt-1">
            <span className="text-2xl font-extrabold text-red-700">{counts.p1Active}</span>
            <span className="text-[11px] text-red-600 font-semibold">críticos</span>
          </div>
        </Card>

        <Card className="p-3 border-amber-200 bg-amber-50/40">
          <span className="text-[10px] font-bold uppercase tracking-wider text-amber-700 block">
            Prioridade P2
          </span>
          <div className="flex items-baseline gap-2 mt-1">
            <span className="text-2xl font-extrabold text-amber-800">{counts.p2Active}</span>
            <span className="text-[11px] text-amber-700 font-semibold">médios</span>
          </div>
        </Card>

        <Card className="p-3 border-indigo-200 bg-indigo-50/40">
          <span className="text-[10px] font-bold uppercase tracking-wider text-indigo-700 block">
            Meus Atribuídos
          </span>
          <div className="flex items-baseline gap-2 mt-1">
            <span className="text-2xl font-extrabold text-indigo-900">{counts.myActive}</span>
            <span className="text-[11px] text-indigo-700 font-semibold">sob meu cuidado</span>
          </div>
        </Card>

        {/* Card de Conversas com Múltiplas Mensagens */}
        <Card
          className={`p-3 border-purple-200 transition-all cursor-pointer ${
            onlyMultipleMessages
              ? 'bg-purple-100 ring-2 ring-purple-500'
              : 'bg-purple-50/50 hover:bg-purple-100/60'
          }`}
          onClick={() => setOnlyMultipleMessages((prev) => !prev)}
          title="Clique para alternar filtro de threads com múltiplas mensagens"
        >
          <div className="flex items-center justify-between">
            <span className="text-[10px] font-bold uppercase tracking-wider text-purple-700 block">
              Threads Reincidentes
            </span>
            <MessagesSquare className="h-4 w-4 text-purple-600" />
          </div>
          <div className="flex items-baseline gap-2 mt-1">
            <span className="text-2xl font-extrabold text-purple-900">
              {counts.multiMessageActive}
            </span>
            <span className="text-[11px] text-purple-700 font-semibold">≥2 msgs</span>
          </div>
        </Card>
      </div>

      {/* Painel de Carga por Atendente */}
      <ControlTowerAgentLoadCard
        loads={loads}
        unassignedCount={unassignedCount}
        selectedUserId={filterAssignedUserId}
        onFilterUser={(uId) => {
          setFilterAssignedUserId((prev) => (prev === uId ? '' : uId))
        }}
      />

      {/* Barra de Filtros e Busca */}
      <Card className="p-3 border-slate-200 space-y-2 bg-white shadow-subtle">
        <div className="grid grid-cols-1 sm:grid-cols-2 md:grid-cols-3 lg:grid-cols-6 gap-2">
          {/* Busca */}
          <div className="relative sm:col-span-2">
            <Search className="absolute left-2.5 top-2.5 h-3.5 w-3.5 text-slate-400" />
            <Input
              placeholder="Buscar por cliente, assunto, remetente, reserva..."
              value={search}
              onChange={(e) => setSearch(e.target.value)}
              className="pl-8 h-8 text-xs w-full"
            />
          </div>

          {/* Filtro Prioridade */}
          <div>
            <select
              value={filterPriority}
              onChange={(e) => setFilterPriority(e.target.value)}
              className="h-8 text-xs w-full border border-slate-200 rounded-md px-2 bg-white text-slate-700"
            >
              <option value="Todas">Prioridade (Todas)</option>
              <option value="P1">P1 (Alta Prioridade)</option>
              <option value="P2">P2 (Média Prioridade)</option>
              <option value="P3">P3 (Normal)</option>
            </select>
          </div>

          {/* Filtro Status */}
          <div>
            <select
              value={filterStatus}
              onChange={(e) => setFilterStatus(e.target.value)}
              className="h-8 text-xs w-full border border-slate-200 rounded-md px-2 bg-white text-slate-700"
            >
              <option value="Ativos">Status: Ativos na Fila</option>
              <option value="Estourados/Escalados">🚨 Estourados / Escalados</option>
              <option value="Todos">Status: Todos</option>
              <option value="Novo">Novo</option>
              <option value="Em tratamento">Em tratamento</option>
              <option value="Aguardando cliente">Aguardando cliente</option>
              <option value="Resolvido">Resolvido</option>
              <option value="Escalado">Escalado</option>
            </select>
          </div>

          {/* Filtro Núcleo */}
          <div>
            <select
              value={filterGroup}
              onChange={(e) => setFilterGroup(e.target.value)}
              className="h-8 text-xs w-full border border-slate-200 rounded-md px-2 bg-white text-slate-700"
            >
              <option value="Todos">Núcleo (Todos)</option>
              {SERVICE_GROUP_OPTIONS.map((g) => (
                <option key={g.value} value={g.value}>
                  {g.label}
                </option>
              ))}
            </select>
          </div>

          {/* Filtro Equipe INTER / NAC */}
          <div>
            <select
              value={filterTeam}
              onChange={(e) => setFilterTeam(e.target.value)}
              className="h-8 text-xs w-full border border-slate-200 rounded-md px-2 bg-white text-slate-700"
            >
              <option value="Todas">Equipe (Todas)</option>
              <option value="Nacional">Nacional</option>
              <option value="Internacional">Internacional</option>
            </select>
          </div>
        </div>

        {/* Linha secundária de filtros rápidos */}
        <div className="flex items-center justify-between pt-1 border-t border-slate-100 text-xs flex-wrap gap-2">
          <div className="flex items-center gap-3">
            <label className="flex items-center gap-1.5 cursor-pointer text-slate-700 font-medium select-none">
              <input
                type="checkbox"
                checked={onlyMine}
                onChange={(e) => setOnlyMine(e.target.checked)}
                className="h-3.5 w-3.5 rounded border-slate-300 text-indigo-600 focus:ring-indigo-500"
              />
              <span>Somente meus atribuídos</span>
            </label>

            <label className="flex items-center gap-1.5 cursor-pointer text-slate-700 font-medium select-none">
              <input
                type="checkbox"
                checked={onlyMultipleMessages}
                onChange={(e) => setOnlyMultipleMessages(e.target.checked)}
                className="h-3.5 w-3.5 rounded border-slate-300 text-purple-600 focus:ring-purple-500"
              />
              <span className="text-purple-800 font-semibold flex items-center gap-1">
                <MessagesSquare className="h-3.5 w-3.5 text-purple-600" />
                Somente conversas com múltiplas mensagens
              </span>
            </label>

            <label className="flex items-center gap-1.5 cursor-pointer text-slate-700 font-medium select-none">
              <input
                type="checkbox"
                checked={hideNoise}
                onChange={(e) => setHideNoise(e.target.checked)}
                className="h-3.5 w-3.5 rounded border-slate-300 text-indigo-600 focus:ring-indigo-500"
              />
              <span>Ocultar ruído (No-reply/Spam)</span>
            </label>

            {filterAssignedUserId && (
              <Badge
                variant="outline"
                className="bg-indigo-50 text-indigo-700 border-indigo-200 text-[10px]"
              >
                Filtrado por atendente específico
                <button
                  type="button"
                  onClick={() => setFilterAssignedUserId('')}
                  className="ml-1 text-indigo-900 font-bold hover:text-red-600"
                >
                  ×
                </button>
              </Badge>
            )}
          </div>

          <div className="flex items-center gap-2">
            <div className="flex items-center gap-1.5 mr-2">
              <span className="text-[11px] text-slate-500">Ordenar:</span>
              <select
                value={sortBy}
                onChange={(e) => setSortBy(e.target.value as any)}
                className="h-6 text-[11px] border border-slate-200 rounded px-1.5 bg-white text-slate-700"
              >
                <option value="score">Maior Score</option>
                <option value="messages">Mais Mensagens (Thread)</option>
                <option value="sla">Menor SLA</option>
                <option value="recent">Mais Recentes</option>
              </select>
            </div>
            <span className="text-[11px] text-slate-500">
              {filteredEmails.length} conversa{filteredEmails.length === 1 ? '' : 's'} na fila
            </span>
            {hasActiveFilters && (
              <Button
                variant="ghost"
                size="sm"
                onClick={clearFilters}
                className="h-6 text-[11px] text-slate-500 hover:text-slate-900 px-1.5"
              >
                <FilterX className="h-3 w-3 mr-1" /> Limpar filtros
              </Button>
            )}
          </div>
        </div>
      </Card>

      {/* Tabela da Fila Única da Torre */}
      <Card className="border-slate-200 overflow-hidden shadow-subtle">
        <div className="overflow-x-auto">
          <Table>
            <TableHeader>
              <TableRow className="bg-slate-50 hover:bg-slate-50">
                <TableHead className="text-xs font-bold text-slate-700 w-24">Prioridade</TableHead>
                <TableHead className="text-xs font-bold text-slate-700 min-w-[240px]">
                  Conversa & Assunto
                </TableHead>
                <TableHead className="text-xs font-bold text-slate-700 w-24 text-center">
                  Mensagens
                </TableHead>
                <TableHead className="text-xs font-bold text-slate-700 min-w-[180px]">
                  Sinais Detectados
                </TableHead>
                <TableHead className="text-xs font-bold text-slate-700 min-w-[130px]">
                  Cliente / Agência
                </TableHead>
                <TableHead className="text-xs font-bold text-slate-700 min-w-[140px]">
                  Caixa / Núcleo
                </TableHead>
                <TableHead className="text-xs font-bold text-slate-700 w-36">
                  SLA & Espera
                </TableHead>
                <TableHead className="text-xs font-bold text-slate-700 w-32">Responsável</TableHead>
                <TableHead className="text-xs font-bold text-slate-700 w-28">Status</TableHead>
                <TableHead className="text-xs font-bold text-slate-700 text-right w-40">
                  Ações
                </TableHead>
              </TableRow>
            </TableHeader>
            <TableBody>
              {filteredEmails.map((item) => {
                const priorityBadge =
                  item.priority === 'P1'
                    ? 'bg-red-50 text-red-700 border-red-300'
                    : item.priority === 'P2'
                      ? 'bg-amber-50 text-amber-700 border-amber-300'
                      : 'bg-emerald-50 text-emerald-700 border-emerald-300'

                const signals = Array.isArray(item.detected_signals) ? item.detected_signals : []
                const isAssignedToMe = Boolean(item.assigned_to && item.assigned_to === user?.id)
                const isEscalated = item.status === 'Escalado'
                const slaInfo = computeSlaStatus(item.sla_deadline, item.status)
                const isBreached = slaInfo.isBreached || isEscalated

                return (
                  <TableRow
                    key={item.id}
                    className={`cursor-pointer transition-colors ${
                      isEscalated
                        ? 'bg-rose-50/70 hover:bg-rose-100/60 border-l-4 border-l-rose-600'
                        : isBreached
                          ? 'bg-amber-50/40 hover:bg-amber-100/50 border-l-4 border-l-amber-500'
                          : 'hover:bg-indigo-50/40'
                    }`}
                    onClick={() => {
                      setSelectedEmail(item)
                      setDetailModalOpen(true)
                    }}
                  >
                    {/* Prioridade & Score */}
                    <TableCell className="align-middle">
                      <div className="flex flex-col items-start gap-0.5">
                        <Badge
                          variant="outline"
                          className={`font-extrabold text-[11px] px-2 py-0.5 ${priorityBadge}`}
                        >
                          {item.priority}
                        </Badge>
                        <span className="text-[10px] text-slate-500 font-mono font-semibold">
                          {item.score} pts
                        </span>
                      </div>
                    </TableCell>

                    {/* Assunto e Remetente */}
                    <TableCell className="align-middle">
                      <div className="min-w-0 space-y-0.5">
                        <div className="flex items-center gap-1.5">
                          <p className="font-semibold text-xs text-slate-900 truncate max-w-[280px]">
                            {(item.subject || '(Sem assunto)')
                              .replace(
                                /^\s*(re\s*:\s*|fwd\s*:\s*|enc\s*:\s*|res\s*:\s*|rv\s*:\s*)+/gi,
                                '',
                              )
                              .trim()}
                          </p>
                        </div>
                        <p className="text-[11px] text-slate-500 truncate max-w-[280px]">
                          {item.sender_name ? `${item.sender_name} • ` : ''}
                          {item.sender_email}
                        </p>
                        <div className="flex items-center gap-1.5 flex-wrap">
                          {item.reservation_number && (
                            <span className="inline-block px-1.5 py-0.2 rounded bg-slate-100 text-slate-700 text-[10px] font-mono font-bold">
                              PNR: {item.reservation_number}
                            </span>
                          )}
                          {item.last_message_at && (
                            <span className="text-[10px] text-slate-400">
                              Última:{' '}
                              {new Date(item.last_message_at).toLocaleTimeString('pt-BR', {
                                hour: '2-digit',
                                minute: '2-digit',
                              })}
                            </span>
                          )}
                        </div>
                      </div>
                    </TableCell>

                    {/* Contador de Mensagens (Threading) */}
                    <TableCell className="align-middle text-center">
                      {(item.message_count || 1) > 1 ? (
                        <span className="inline-flex items-center gap-1 px-2 py-0.5 rounded-full text-[11px] font-bold bg-indigo-100 text-indigo-800 border border-indigo-300 shadow-xs">
                          <MessagesSquare className="h-3 w-3 text-indigo-600" />x
                          {item.message_count}
                        </span>
                      ) : (
                        <span className="inline-flex items-center gap-0.5 px-1.5 py-0.5 rounded text-[10px] text-slate-500 bg-slate-100">
                          <Mail className="h-3 w-3 text-slate-400" />1
                        </span>
                      )}
                    </TableCell>

                    {/* Sinais em Chips */}
                    <TableCell className="align-middle">
                      <div className="flex flex-wrap gap-1 max-w-[240px]">
                        {signals.map((sig, sIdx) => {
                          const isRed =
                            sig.includes('24h') || sig.includes('Formal') || sig.includes('VIP')
                          const isPersistent = sig.includes('insistente')
                          return (
                            <span
                              key={sIdx}
                              className={`inline-flex items-center gap-0.5 px-1.5 py-0.5 rounded text-[10px] font-bold border ${
                                isPersistent
                                  ? 'bg-purple-100 text-purple-800 border-purple-300'
                                  : isRed
                                    ? 'bg-rose-50 text-rose-700 border-rose-200'
                                    : 'bg-indigo-50 text-indigo-700 border-indigo-200'
                              }`}
                            >
                              {isPersistent && <Flame className="h-3 w-3 text-purple-600" />}
                              {sig}
                            </span>
                          )
                        })}
                        {signals.length === 0 && (
                          <span className="text-[11px] text-slate-400">—</span>
                        )}
                      </div>
                    </TableCell>

                    {/* Cliente / Agência */}
                    <TableCell className="align-middle">
                      <div className="min-w-0">
                        <p className="text-xs font-semibold text-slate-800 truncate max-w-[140px]">
                          {item.expand?.client?.company ||
                            item.expand?.client?.name ||
                            'Não vinculado'}
                        </p>
                        {item.expand?.client?.priority_client && (
                          <span className="inline-block mt-0.5 text-[9px] bg-amber-100 text-amber-800 px-1 py-0.2 rounded font-bold">
                            ⭐ VIP
                          </span>
                        )}
                      </div>
                    </TableCell>

                    {/* Núcleo / Caixa Compartilhada */}
                    <TableCell className="align-middle text-xs">
                      <div className="space-y-1">
                        <span className="inline-flex items-center gap-1 font-semibold text-slate-900 bg-slate-100 px-2 py-0.5 rounded border border-slate-200">
                          <Inbox className="h-3 w-3 text-indigo-600 shrink-0" />
                          {item.service_group ? getServiceGroupLabel(item.service_group) : '—'}
                        </span>
                        <div className="flex items-center gap-1.5 text-[10px] text-slate-500">
                          <span className="font-medium">{item.team || 'Nacional'}</span>
                          {item.inbox_address && (
                            <span className="truncate max-w-[120px]" title={item.inbox_address}>
                              • {item.inbox_address}
                            </span>
                          )}
                        </div>
                      </div>
                    </TableCell>

                    {/* SLA Regressivo & Espera em Horas Úteis */}
                    <TableCell className="align-middle">
                      <div className="space-y-1">
                        <SlaCountdownBadge deadline={item.sla_deadline} status={item.status} />
                        <div className="flex items-center gap-1 text-[10px] text-slate-500">
                          <Clock className="h-3 w-3 text-slate-400 shrink-0" />
                          <span>{item.business_hours_waiting ?? 0}h úteis na caixa</span>
                        </div>
                      </div>
                    </TableCell>

                    {/* Responsável (Ownership) */}
                    <TableCell className="align-middle">
                      {item.expand?.assigned_to ? (
                        <span className="inline-flex items-center gap-1 text-xs font-semibold text-slate-800 truncate max-w-[120px]">
                          <User className="h-3 w-3 text-slate-400" />
                          <span className="truncate">{item.expand.assigned_to.name}</span>
                        </span>
                      ) : (
                        <span className="text-[11px] font-semibold text-slate-400 italic">
                          Fila livre
                        </span>
                      )}
                    </TableCell>

                    {/* Status */}
                    <TableCell className="align-middle">
                      <Badge
                        variant={item.status === 'Escalado' ? 'destructive' : 'outline'}
                        className={`text-[10px] font-bold px-2 py-0.5 ${
                          item.status === 'Novo'
                            ? 'bg-blue-50 text-blue-700 border-blue-200'
                            : item.status === 'Em tratamento'
                              ? 'bg-purple-50 text-purple-700 border-purple-200'
                              : item.status === 'Aguardando cliente'
                                ? 'bg-amber-50 text-amber-700 border-amber-200'
                                : item.status === 'Escalado'
                                  ? 'bg-rose-600 text-white font-extrabold animate-pulse'
                                  : 'bg-emerald-50 text-emerald-700 border-emerald-200'
                        }`}
                      >
                        {item.status === 'Escalado' && (
                          <Flame className="h-3 w-3 mr-0.5 shrink-0" />
                        )}
                        {item.status}
                      </Badge>
                    </TableCell>

                    {/* Ações */}
                    <TableCell className="align-middle text-right">
                      <div
                        className="flex items-center justify-end gap-1"
                        onClick={(e) => e.stopPropagation()}
                      >
                        {!isAssignedToMe ? (
                          <Button
                            variant="ghost"
                            size="sm"
                            className="h-7 text-xs text-indigo-600 hover:text-indigo-900 px-2 font-semibold"
                            onClick={() => handleAssignToMe(item.id)}
                            title="Assumir este atendimento para si"
                          >
                            <UserCheck className="h-3.5 w-3.5 mr-1" /> Assumir
                          </Button>
                        ) : (
                          <span className="text-[11px] font-bold text-indigo-700 px-2">Meu</span>
                        )}

                        {isLeaderOrMaster && (
                          <Button
                            variant="ghost"
                            size="sm"
                            className="h-7 text-xs text-slate-600 hover:text-slate-900 px-2"
                            onClick={() => handleAssignToOther(item.id)}
                            title="Atribuir a outro atendente"
                          >
                            Atribuir
                          </Button>
                        )}
                      </div>
                    </TableCell>
                  </TableRow>
                )
              })}

              {filteredEmails.length === 0 && !loading && (
                <TableRow>
                  <TableCell colSpan={10} className="text-center py-10 text-xs text-slate-400">
                    Nenhuma conversa encontrada na Torre de Controle com os filtros selecionados.
                  </TableCell>
                </TableRow>
              )}

              {loading && (
                <TableRow>
                  <TableCell colSpan={10} className="text-center py-10 text-xs text-slate-400">
                    Carregando conversas da Torre de Controle...
                  </TableCell>
                </TableRow>
              )}
            </TableBody>
          </Table>
        </div>
      </Card>

      {/* Modal de Parâmetros (Líder / Master) */}
      <ControlTowerConfigModal
        open={configModalOpen}
        onOpenChange={setConfigModalOpen}
        config={config}
        onSaved={loadData}
      />

      {/* Modal de Detalhe do E-mail */}
      <ControlTowerDetailModal
        email={selectedEmail}
        open={detailModalOpen}
        onOpenChange={setDetailModalOpen}
        onStatusChange={handleStatusChange}
        onAssignToMe={handleAssignToMe}
        currentUserId={user?.id}
      />

      {/* Modal de Atribuição (Gestores / Líderes) */}
      <ControlTowerAssignModal
        emailId={assignTargetEmailId}
        open={assignModalOpen}
        onOpenChange={setAssignModalOpen}
        users={users}
        onAssign={handleConfirmAssign}
      />
    </div>
  )
}
