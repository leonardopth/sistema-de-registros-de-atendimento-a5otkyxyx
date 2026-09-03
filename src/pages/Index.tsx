import { useState, useEffect, useMemo } from 'react'
import { useNavigate } from 'react-router-dom'
import { Button } from '@/components/ui/button'
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card'
import {
  Table,
  TableHeader,
  TableBody,
  TableRow,
  TableHead,
  TableCell,
} from '@/components/ui/table'
import { Badge } from '@/components/ui/badge'
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from '@/components/ui/select'
import {
  ChartContainer,
  ChartTooltip,
  ChartTooltipContent,
  type ChartConfig,
} from '@/components/ui/chart'
import { Bar, BarChart, XAxis, YAxis, CartesianGrid, ResponsiveContainer } from 'recharts'
import { getServiceRecords } from '@/services/service_records'
import { getClients } from '@/services/clients'
import { getAccountExecutives } from '@/services/account_executives'
import { getUsers } from '@/services/users'
import { getTrainings } from '@/services/trainings'
import { getMonthlyAwards } from '@/services/gamification'
import { MonthlyAwardRecord } from '@/types/gamification'
import {
  ServiceRecord,
  ClientRecord,
  AccountExecutiveRecord,
  UserRecord,
} from '@/types/service_record'
import type { TrainingRecord } from '@/types/training'
import { useAuth } from '@/hooks/use-auth'
import { useRealtime } from '@/hooks/use-realtime'
import { DashboardStats } from '@/components/DashboardStats'
import { ConsultantGamification } from '@/components/ConsultantGamification'
import { AchievementFeed } from '@/components/AchievementFeed'
import { SocialRecognitionBanner } from '@/components/SocialRecognitionBanner'
import { AutonomyScorecard } from '@/components/AutonomyScorecard'
import { TrainingPanel } from '@/components/TrainingPanel'
import { PerformanceAlerts } from '@/components/PerformanceAlerts'
import { StatusBadge } from '@/components/StatusBadge'
import { ServiceVolumeTrendCard } from '@/components/ServiceVolumeTrendCard'
import { ActiveBacklogQueue } from '@/components/ActiveBacklogQueue'
import { CollaboratorStatusPanel } from '@/components/CollaboratorStatusPanel'
import { filterClientsByUserAccess, filterRecordsByUserAccess } from '@/lib/service-group-access'
import { SERVICE_GROUP_OPTIONS } from '@/lib/service-groups'
import { getGMT3DateString } from '@/lib/timezone'
import { calculateReopenRate } from '@/lib/reopen-utils'
import {
  Zap,
  PlusCircle,
  Headset,
  Keyboard,
  AlertCircle,
  RefreshCw,
  Building2,
  Users2,
  GraduationCap,
  Award,
  TrendingUp,
  BarChart3,
  CheckCircle2,
  XCircle,
  Clock,
  Layers,
  ArrowRight,
  ShieldAlert,
} from 'lucide-react'
import { format } from 'date-fns'
import { ptBR } from 'date-fns/locale'

export default function Index() {
  const { user } = useAuth()
  const navigate = useNavigate()

  const [records, setRecords] = useState<ServiceRecord[]>([])
  const [clients, setClients] = useState<ClientRecord[]>([])
  const [executives, setExecutives] = useState<AccountExecutiveRecord[]>([])
  const [users, setUsers] = useState<UserRecord[]>([])
  const [trainings, setTrainings] = useState<TrainingRecord[]>([])
  const [awards, setAwards] = useState<MonthlyAwardRecord[]>([])
  const [loadError, setLoadError] = useState<string | null>(null)
  const [commercialPeriod, setCommercialPeriod] = useState<'all' | 'month' | 'today' | '7days'>(
    'month',
  )

  const loadData = async () => {
    try {
      setLoadError(null)
      const results = await Promise.allSettled([
        getServiceRecords('-created'),
        getClients(),
        getAccountExecutives(),
        getUsers(),
        getTrainings(),
        getMonthlyAwards(),
      ])

      const [rRes, cRes, eRes, uRes, tRes, aRes] = results

      if (rRes.status === 'fulfilled') {
        setRecords(Array.isArray(rRes.value) ? rRes.value : [])
      } else {
        console.warn('Falha ao carregar atendimentos no Index:', rRes.reason)
        setRecords([])
      }

      if (cRes.status === 'fulfilled') {
        setClients(Array.isArray(cRes.value) ? cRes.value : [])
      } else {
        console.warn('Falha ao carregar clientes no Index:', cRes.reason)
        setClients([])
      }

      if (eRes.status === 'fulfilled') {
        setExecutives(Array.isArray(eRes.value) ? eRes.value : [])
      } else {
        console.warn('Falha ao carregar executivos no Index:', eRes.reason)
        setExecutives([])
      }

      if (uRes.status === 'fulfilled') {
        setUsers(Array.isArray(uRes.value) ? uRes.value : [])
      } else {
        console.warn('Falha ao carregar usuários no Index:', uRes.reason)
        setUsers([])
      }

      if (tRes.status === 'fulfilled') {
        setTrainings(Array.isArray(tRes.value) ? tRes.value : [])
      } else {
        console.warn('Falha ao carregar treinamentos no Index:', tRes.reason)
        setTrainings([])
      }

      if (aRes.status === 'fulfilled') {
        setAwards(Array.isArray(aRes.value) ? aRes.value : [])
      } else {
        setAwards([])
      }

      // Se atendimentos ou clientes falharem, exibe aviso não bloqueante com botão "Tentar novamente"
      const hasFailures = results.some((r) => r.status === 'rejected')
      if (hasFailures) {
        setLoadError('Não foi possível sincronizar todos os dados do painel.')
      }
    } catch (err: any) {
      console.error('Error loading dashboard data:', err)
      setLoadError('Não foi possível sincronizar todos os dados. Exibindo informações locais.')
    }
  }

  useEffect(() => {
    loadData()
  }, [])

  useRealtime('service_records', () => loadData())
  useRealtime('clients', () => loadData())
  useRealtime('trainings', () => loadData())
  useRealtime('account_executives', () => loadData())
  useRealtime('monthly_awards', () => loadData())
  useRealtime('gamification', () => loadData())
  useRealtime('badges', () => loadData())

  const safeFormatDate = (dateStr?: string) => {
    if (!dateStr) return ''
    try {
      const d = new Date(dateStr)
      if (isNaN(d.getTime())) return ''
      return format(d, 'dd/MM HH:mm', { locale: ptBR })
    } catch {
      return ''
    }
  }

  const safeRecords = Array.isArray(records) ? records : []
  const safeClients = Array.isArray(clients) ? clients : []

  // Papéis de acesso
  const userRole = user?.role || 'Consultor'
  const isMaster = userRole === 'Master' || user?.master_access === true
  const isGerente = userRole === 'Gerente'
  const isSupervisorOrLider = userRole === 'Supervisor' || userRole === 'Líder'
  const isConsultor = userRole === 'Consultor'
  const isExecutivoContas = userRole === 'Executivo de Contas'
  const isGestorComercial = userRole === 'Gestor Comercial'

  // Perfil mestre/gerente: visão completa
  const isFullView = isMaster || isGerente

  // Registros acessíveis com base nas permissões
  const accessibleRecords = useMemo(
    () => filterRecordsByUserAccess(safeRecords, user),
    [safeRecords, user],
  )
  const accessibleClients = useMemo(
    () => filterClientsByUserAccess(safeClients, user),
    [safeClients, user],
  )

  const todayStr = new Date().toISOString().substring(0, 10)

  const firstName = user?.name ? user.name.split(' ')[0] : 'Usuário'

  // ==========================================
  // DADOS ESPECÍFICOS POR PERFIL
  // ==========================================

  // --- 1. CONSULTOR ---
  const consultantRecords = useMemo(() => {
    return safeRecords.filter((r) => r && (r.assigned_user === user?.id || r.user_id === user?.id))
  }, [safeRecords, user?.id])

  const consultantTodayRecords = useMemo(() => {
    return consultantRecords.filter((r) => {
      const recDate = getGMT3DateString(r.created)
      return recDate === todayStr || (r.created && r.created.startsWith(todayStr))
    })
  }, [consultantRecords, todayStr])

  const consultantRecentRecords = useMemo(() => {
    return consultantRecords.slice(0, 5)
  }, [consultantRecords])

  const consultantStats = useMemo(() => {
    const inProgress = consultantRecords.filter((r) => r.status === 'Em Andamento').length
    const completedToday = consultantTodayRecords.filter((r) => r.status === 'Concluído').length
    const avgDuration =
      consultantRecords.length > 0
        ? Math.round(
            consultantRecords.reduce((a, r) => a + (Number(r?.duration) || 0), 0) /
              consultantRecords.length,
          )
        : 0
    const avoidableCount = consultantRecords.filter((r) => Boolean(r?.avoidable_contact)).length
    const withTfr = consultantRecords.filter((r) => r?.first_response_time != null)
    const avgTfr =
      withTfr.length > 0
        ? Math.round(
            (withTfr.reduce((a, r) => a + (Number(r?.first_response_time) || 0), 0) /
              withTfr.length) *
              10,
          ) / 10
        : 0

    const reopenData = calculateReopenRate(consultantRecords)

    return {
      todayCount: consultantTodayRecords.length,
      totalCount: consultantRecords.length,
      inProgressCount: inProgress,
      completedTodayCount: completedToday,
      avgDuration,
      avgTfr,
      tfrTarget: 15,
      wrongDeptCount: avoidableCount,
      reopenedCount: reopenData.reopenedCount,
      reopenRate: reopenData.rate,
    }
  }, [consultantRecords, consultantTodayRecords])

  // Clientes atendidos pelo consultor
  const consultantClientCompanyNames = useMemo(() => {
    const names = new Set<string>()
    consultantRecords.forEach((r) => {
      if (r.client_company) names.add(r.client_company)
      if (r.client_name) names.add(r.client_name)
    })
    return names
  }, [consultantRecords])

  const consultantClients = useMemo(() => {
    return safeClients.filter(
      (c) =>
        consultantClientCompanyNames.has(c.company) || consultantClientCompanyNames.has(c.name),
    )
  }, [safeClients, consultantClientCompanyNames])

  // --- 2. SUPERVISOR / LÍDER (Equipe) ---
  const teamUsers = useMemo(() => {
    if (!user) return []
    const userGroups = (user.service_groups as string[] | undefined) || []
    const teamMap = new Map<string, UserRecord>()

    users.forEach((u) => {
      if (u.id === user.id) return

      // Vínculo direto por supervisor_id
      const supId = (u as any).supervisor_id
      if (supId && supId === user.id) {
        teamMap.set(u.id, u)
        return
      }

      // Mesmo grupo de serviço
      if (userGroups.length > 0) {
        const uGroups = (u.service_groups as string[] | undefined) || []
        if (uGroups.some((g) => userGroups.includes(g))) {
          teamMap.set(u.id, u)
        }
      } else {
        if (u.role === 'Consultor' || u.role === ('Consultores' as any)) {
          teamMap.set(u.id, u)
        }
      }
    })

    return Array.from(teamMap.values())
  }, [users, user])

  const teamRecords = useMemo(() => {
    return accessibleRecords
  }, [accessibleRecords])

  const teamTodayRecords = useMemo(() => {
    return teamRecords.filter((r) => {
      const recDate = getGMT3DateString(r.created)
      return recDate === todayStr || (r.created && r.created.startsWith(todayStr))
    })
  }, [teamRecords, todayStr])

  const teamStats = useMemo(() => {
    const inProgress = teamRecords.filter((r) => r.status === 'Em Andamento').length
    const completedToday = teamTodayRecords.filter((r) => r.status === 'Concluído').length
    const avgDuration =
      teamRecords.length > 0
        ? Math.round(
            teamRecords.reduce((a, r) => a + (Number(r?.duration) || 0), 0) / teamRecords.length,
          )
        : 0
    const avoidable = teamRecords.filter((r) => Boolean(r?.avoidable_contact)).length
    const withTfr = teamRecords.filter((r) => r?.first_response_time != null)
    const avgTfr =
      withTfr.length > 0
        ? Math.round(
            (withTfr.reduce((a, r) => a + (Number(r?.first_response_time) || 0), 0) /
              withTfr.length) *
              10,
          ) / 10
        : 0

    const reopenData = calculateReopenRate(teamRecords)

    return {
      todayCount: teamTodayRecords.length,
      totalCount: teamRecords.length,
      inProgressCount: inProgress,
      completedTodayCount: completedToday,
      avgDuration,
      avgTfr,
      tfrTarget: 15,
      wrongDeptCount: avoidable,
      reopenedCount: reopenData.reopenedCount,
      reopenRate: reopenData.rate,
    }
  }, [teamRecords, teamTodayRecords])

  const teamRecentRecords = useMemo(() => {
    return teamRecords.slice(0, 5)
  }, [teamRecords])

  // --- 3. EXECUTIVO DE CONTAS ---
  const currentExecutive = useMemo(() => {
    if (!isExecutivoContas) return null
    return executives.find((e) => e.email === user?.email || e.name === user?.name) || null
  }, [executives, user, isExecutivoContas])

  const executiveClients = useMemo(() => {
    if (!isExecutivoContas) return accessibleClients
    if (currentExecutive) {
      return safeClients.filter(
        (c) =>
          c.account_executive_rel === currentExecutive.id ||
          c.account_executive === currentExecutive.name,
      )
    }
    // Fallback por bases do usuário
    const userBases = (user?.bases as string[] | undefined) || []
    if (userBases.length > 0) {
      return safeClients.filter((c) => {
        const execRel = c.expand?.account_executive_rel
        if (execRel && Array.isArray(execRel.bases)) {
          return execRel.bases.some((b) => userBases.includes(b))
        }
        return false
      })
    }
    return accessibleClients
  }, [safeClients, currentExecutive, isExecutivoContas, user?.bases, accessibleClients])

  const executiveClientIds = useMemo(() => {
    return new Set(executiveClients.map((c) => c.id))
  }, [executiveClients])

  const executiveClientCompanies = useMemo(() => {
    return new Set(executiveClients.map((c) => c.company).filter(Boolean))
  }, [executiveClients])

  const executiveRecords = useMemo(() => {
    return safeRecords.filter((r) => {
      const cid = r.client || r.expand?.client?.id
      if (cid && executiveClientIds.has(cid)) return true
      if (r.client_company && executiveClientCompanies.has(r.client_company)) return true
      if (
        currentExecutive &&
        (r.account_executive === currentExecutive.name ||
          r.expand?.account_executive?.id === currentExecutive.id)
      )
        return true
      return false
    })
  }, [safeRecords, executiveClientIds, executiveClientCompanies, currentExecutive])

  const executiveActiveClients = useMemo(() => {
    return executiveClients.filter((c) => !c.blocked)
  }, [executiveClients])

  const executiveInactiveClients = useMemo(() => {
    return executiveClients.filter((c) => Boolean(c.blocked))
  }, [executiveClients])

  const executiveRecentRecords = useMemo(() => {
    return executiveRecords.slice(0, 5)
  }, [executiveRecords])

  // Treinamentos pendentes dos clientes do executivo
  // Considera clientes que precisam de treinamento (com chamados evitáveis ou cadastrados em trainings)
  const executivePendingTrainings = useMemo(() => {
    const list: { clientName: string; avoidableCount: number; lastDate?: string }[] = []
    executiveClients.forEach((client) => {
      const recs = executiveRecords.filter(
        (r) =>
          r.client === client.id ||
          r.expand?.client?.id === client.id ||
          r.client_company === client.company,
      )
      const avoidable = recs.filter((r) => r.avoidable_contact).length
      const clientTrainings = trainings.filter(
        (t) => t.client === client.id || t.expand?.client?.id === client.id,
      )
      if (avoidable > 0 || clientTrainings.length > 0) {
        list.push({
          clientName: client.company || client.name,
          avoidableCount: avoidable,
          lastDate: clientTrainings[0]?.training_date,
        })
      }
    })
    return list.sort((a, b) => b.avoidableCount - a.avoidableCount)
  }, [executiveClients, executiveRecords, trainings])

  // --- 4. GESTOR COMERCIAL ---
  const commercialFilteredRecords = useMemo(() => {
    const userBases = (user?.bases as string[] | undefined) || []
    let baseFiltered = safeRecords
    if (userBases.length > 0 && !isMaster) {
      const baseExecIds = executives
        .filter((e) => {
          const execBases = (e.bases as string[] | undefined) || []
          return execBases.some((b) => userBases.includes(b))
        })
        .map((e) => e.id)
      const baseClients = safeClients.filter(
        (c) => c.account_executive_rel && baseExecIds.includes(c.account_executive_rel),
      )
      const baseClientIds = new Set(baseClients.map((c) => c.id))
      const baseCompanyNames = new Set(baseClients.map((c) => c.company))
      baseFiltered = safeRecords.filter((r) => {
        const cid = r.client || r.expand?.client?.id
        if (cid && baseClientIds.has(cid)) return true
        if (r.client_company && baseCompanyNames.has(r.client_company)) return true
        return false
      })
    }

    const now = new Date()
    const nowIso = now.toISOString()
    const today = nowIso.substring(0, 10)
    const month = nowIso.substring(0, 7)

    if (commercialPeriod === 'today') {
      return baseFiltered.filter((r) => getGMT3DateString(r.created) === today)
    }
    if (commercialPeriod === 'month') {
      return baseFiltered.filter((r) => {
        const d = getGMT3DateString(r.created)
        return d.startsWith(month)
      })
    }
    if (commercialPeriod === '7days') {
      const sevenDaysAgo = new Date(Date.now() - 7 * 24 * 60 * 60 * 1000)
        .toISOString()
        .substring(0, 10)
      return baseFiltered.filter((r) => {
        const d = getGMT3DateString(r.created)
        return d >= sevenDaysAgo
      })
    }
    return baseFiltered
  }, [safeRecords, user?.bases, isMaster, executives, safeClients, commercialPeriod])

  const commercialClients = useMemo(() => {
    return accessibleClients
  }, [accessibleClients])

  const commercialActiveClients = useMemo(() => {
    return commercialClients.filter((c) => !c.blocked)
  }, [commercialClients])

  const commercialAutonomyRate = useMemo(() => {
    const total = commercialFilteredRecords.length
    if (total === 0) return 100
    const avoidable = commercialFilteredRecords.filter((r) => r.avoidable_contact).length
    const avoidableRate = Math.round((avoidable / total) * 100)
    return 100 - avoidableRate
  }, [commercialFilteredRecords])

  // Comparativo entre grupos de serviço para o Gestor Comercial
  const commercialGroupComparison = useMemo(() => {
    const coMap = new Map<string, string>()
    for (const c of safeClients) {
      if (c.company) coMap.set(c.company, c.service_group || '')
    }
    const clientMap = new Map(safeClients.map((c) => [c.id, c]))

    return SERVICE_GROUP_OPTIONS.map((group) => {
      const gr = commercialFilteredRecords.filter((r) => {
        const cid = r.client || r.expand?.client?.id
        if (cid) {
          const cl = clientMap.get(cid)
          if (cl?.service_group === group.value) return true
        }
        if (r.client_company && coMap.get(r.client_company) === group.value) return true
        return false
      })
      const total = gr.length
      const avoidable = gr.filter((r) => r.avoidable_contact).length
      const rate = total > 0 ? Math.round((avoidable / total) * 100) : 0
      const autonomy = 100 - rate

      return {
        group: group.value,
        name: group.label,
        total,
        avoidable,
        autonomy,
        rate,
      }
    })
  }, [safeClients, commercialFilteredRecords])

  const commercialChartConfig: ChartConfig = {
    total: { label: 'Total de Atendimentos', color: '#6366f1' },
    avoidable: { label: 'Contatos Evitáveis', color: '#f43f5e' },
  }

  // --- 5. GERENTE / MASTER (Geral) ---
  const generalTodayRecords = useMemo(() => {
    return accessibleRecords.filter((r) => {
      const recDate = getGMT3DateString(r.created)
      return recDate === todayStr || (r.created && r.created.startsWith(todayStr))
    })
  }, [accessibleRecords, todayStr])

  const generalStats = useMemo(() => {
    const withTfr = accessibleRecords.filter((r) => r?.first_response_time != null)
    const avgTfr =
      withTfr.length > 0
        ? Math.round(
            (withTfr.reduce((a, r) => a + (Number(r?.first_response_time) || 0), 0) /
              withTfr.length) *
              10,
          ) / 10
        : 0

    const reopenData = calculateReopenRate(accessibleRecords)

    return {
      todayCount: generalTodayRecords.length,
      totalCount: accessibleRecords.length,
      inProgressCount: accessibleRecords.filter((r) => r?.status === 'Em Andamento').length,
      completedTodayCount: generalTodayRecords.filter((r) => r?.status === 'Concluído').length,
      avgDuration:
        accessibleRecords.length > 0
          ? Math.round(
              accessibleRecords.reduce((a, r) => a + (Number(r?.duration) || 0), 0) /
                accessibleRecords.length,
            )
          : 0,
      avgTfr,
      tfrTarget: 15,
      wrongDeptCount: accessibleRecords.filter((r) => Boolean(r?.avoidable_contact)).length,
      reopenedCount: reopenData.reopenedCount,
      reopenRate: reopenData.rate,
    }
  }, [accessibleRecords, generalTodayRecords])

  const generalRecentRecords = useMemo(() => {
    return accessibleRecords.slice(0, 5)
  }, [accessibleRecords])

  // Subtítulo do cabeçalho de acordo com o papel
  const roleSubtitle = useMemo(() => {
    if (isMaster)
      return 'Visão Executiva Global — Gerenciamento completo de atendimentos e métricas'
    if (isGerente) return 'Visão Gerencial — Controle completo da operação de atendimento e suporte'
    if (isSupervisorOrLider)
      return 'Visão de Equipe — Gestão de desempenho e atendimentos dos liderados'
    if (isConsultor) return 'Meu Desempenho — Acompanhe seus atendimentos, gamificação e clientes'
    if (isExecutivoContas) return 'Gestão de Contas — Carteira de clientes gerenciados e autonomia'
    if (isGestorComercial)
      return 'Visão de Negócios — Volume de atendimentos, clientes e análise de grupos'
    return 'Acompanhe seus atendimentos e indicadores'
  }, [isMaster, isGerente, isSupervisorOrLider, isConsultor, isExecutivoContas, isGestorComercial])

  return (
    <div className="space-y-6">
      {/* CABEÇALHO DO DASHBOARD */}
      <div className="flex flex-col sm:flex-row sm:items-center sm:justify-between gap-4">
        <div>
          <div className="flex items-center gap-2">
            <h2 className="text-2xl font-extrabold tracking-tight text-slate-900">
              Olá, {firstName}! 👋
            </h2>
            <Badge
              variant="outline"
              className="text-xs bg-indigo-50 text-indigo-700 border-indigo-200"
            >
              {userRole}
            </Badge>
          </div>
          <p className="text-xs text-slate-500 mt-0.5">{roleSubtitle}</p>
        </div>
        <div className="flex flex-wrap gap-2">
          <Button
            onClick={() => window.dispatchEvent(new CustomEvent('open-quick-log'))}
            className="bg-gradient-to-r from-cyan-600 to-indigo-600 hover:from-cyan-700 hover:to-indigo-700 font-bold"
          >
            <Zap className="h-4 w-4 mr-1.5" /> Registro Expresso
          </Button>
          <Button variant="outline" onClick={() => navigate('/novo-atendimento')}>
            <PlusCircle className="h-4 w-4 mr-1.5" /> Novo Atendimento
          </Button>
        </div>
      </div>

      {loadError && (
        <div className="flex items-center justify-between p-3 text-xs bg-amber-50 border border-amber-200 text-amber-800 rounded-lg">
          <div className="flex items-center gap-2">
            <AlertCircle className="h-4 w-4 text-amber-600 shrink-0" />
            <span>{loadError}</span>
          </div>
          <Button
            variant="ghost"
            size="sm"
            onClick={loadData}
            className="h-7 text-xs text-amber-800 hover:bg-amber-100"
          >
            <RefreshCw className="h-3 w-3 mr-1" /> Tentar novamente
          </Button>
        </div>
      )}

      <div className="flex items-center gap-2 text-xs text-slate-400">
        <Keyboard className="h-3.5 w-3.5" />
        <span>
          Dica: pressione{' '}
          <kbd className="px-1.5 py-0.5 rounded bg-slate-100 border border-slate-300 font-mono text-[10px]">
            Alt+E
          </kbd>{' '}
          para registro expresso
        </span>
      </div>

      {/* ========================================================================= */}
      {/* 1. GERENTE / MASTER: VISÃO COMPLETA                                      */}
      {/* ========================================================================= */}
      {isFullView && (
        <div className="space-y-6">
          {/* Cards de estatísticas */}
          <DashboardStats {...generalStats} />

          {/* Volume de Atendimentos com Linha de Tendência e Projeção de Meta */}
          <ServiceVolumeTrendCard
            records={accessibleRecords}
            title="Volume de Atendimentos & Linha de Tendência (Visão Geral)"
            subtitle="Evolução diária dos chamados e projeção do ritmo para fechamento do mês corrente"
          />

          {/* Disponibilidade da Equipe */}
          <CollaboratorStatusPanel />

          {/* Reconhecimento Social */}
          <SocialRecognitionBanner awards={awards} />

          {/* Alertas de Desempenho */}
          <PerformanceAlerts records={accessibleRecords} />

          {/* Fila / Backlog ativo (aging) para Gestor / Master */}
          <ActiveBacklogQueue
            records={accessibleRecords}
            isWidget={true}
            maxWidgetItems={5}
            onUpdateRecord={loadData}
          />

          {/* Grid com Gamificação e Atendimentos Recentes */}
          <div className="grid grid-cols-1 lg:grid-cols-3 gap-4">
            <ConsultantGamification
              records={records}
              userName={user?.name}
              userId={user?.id}
              userRole={user?.role}
            />{' '}
            <Card className="lg:col-span-2 border-slate-200 shadow-subtle">
              <CardHeader className="pb-2">
                <CardTitle className="text-sm font-bold text-slate-900 flex items-center justify-between">
                  <span className="flex items-center gap-2">
                    <Headset className="h-4 w-4 text-indigo-600" /> Atendimentos Recentes
                  </span>
                  <Button
                    variant="ghost"
                    size="sm"
                    onClick={() => navigate('/atendimentos')}
                    className="text-xs text-indigo-600 hover:text-indigo-700 p-0 h-auto"
                  >
                    Ver todos <ArrowRight className="h-3 w-3 ml-1" />
                  </Button>
                </CardTitle>
              </CardHeader>
              <CardContent className="space-y-2">
                {generalRecentRecords.length === 0 && (
                  <p className="text-xs text-slate-400 text-center py-4">
                    Nenhum atendimento recente.
                  </p>
                )}
                {generalRecentRecords.map((r, idx) => (
                  <div
                    key={r?.id || `recent-${idx}`}
                    className="flex items-center justify-between p-2.5 bg-slate-50 rounded-lg hover:bg-slate-100/80 transition-colors"
                  >
                    <div className="min-w-0 flex-1">
                      <p className="text-xs font-bold text-slate-900 truncate">
                        {r.client_company || r.client_name || 'Cliente'}
                      </p>
                      <p className="text-[10px] text-slate-500 truncate">
                        {r.contact_reason || 'Atendimento'} —{' '}
                        {(r.description || '').substring(0, 60)}
                      </p>
                    </div>
                    <div className="flex items-center gap-2 shrink-0">
                      <StatusBadge status={r.status || 'Aberto'} />
                      <span className="text-[10px] text-slate-400">
                        {safeFormatDate(r.created)}
                      </span>
                    </div>
                  </div>
                ))}
              </CardContent>
            </Card>
          </div>

          {/* Scorecard de autonomia e Painel de Treinamentos */}
          <div className="grid grid-cols-1 lg:grid-cols-2 gap-4">
            <AutonomyScorecard records={accessibleRecords} clients={accessibleClients} />
            <TrainingPanel records={accessibleRecords} clients={accessibleClients} />
          </div>

          {/* Feed de Conquistas da Equipe */}
          <AchievementFeed />
        </div>
      )}

      {/* ========================================================================= */}
      {/* 2. SUPERVISOR / LÍDER: FOCO EM DESEMPENHO DA EQUIPE                      */}
      {/* ========================================================================= */}
      {!isFullView && isSupervisorOrLider && (
        <div className="space-y-6">
          {/* Disponibilidade da Equipe */}
          <CollaboratorStatusPanel />

          {/* Reconhecimento Social */}
          <SocialRecognitionBanner awards={awards} />

          {/* Header descritivo do foco da equipe */}
          <div className="bg-gradient-to-r from-indigo-50 via-white to-indigo-50 border border-indigo-100 rounded-xl p-4 flex flex-col sm:flex-row items-start sm:items-center justify-between gap-3">
            <div className="flex items-center gap-3">
              <div className="h-10 w-10 rounded-xl bg-indigo-600 text-white flex items-center justify-center shrink-0">
                <Users2 className="h-5 w-5" />
              </div>
              <div>
                <h3 className="text-sm font-bold text-slate-900">Painel de Liderança da Equipe</h3>
                <p className="text-xs text-slate-500">
                  Monitorando{' '}
                  {teamUsers.length > 0
                    ? `${teamUsers.length} consultores`
                    : 'sua equipe de atendimento'}
                </p>
              </div>
            </div>
            <Button
              variant="outline"
              size="sm"
              onClick={() => navigate('/relatorio-consultor')}
              className="text-xs text-indigo-700 border-indigo-200 hover:bg-indigo-50"
            >
              Relatório Individual <ArrowRight className="h-3 w-3 ml-1" />
            </Button>
          </div>

          {/* Cards de estatísticas da equipe */}
          <DashboardStats {...teamStats} />

          {/* Volume de Atendimentos com Linha de Tendência e Projeção de Meta */}
          <ServiceVolumeTrendCard
            records={teamRecords}
            title="Volume de Atendimentos & Linha de Tendência da Equipe"
            subtitle="Evolução diária da equipe liderada e estimativa de meta para o fim do mês"
          />

          {/* Alertas de Desempenho dos Liderados */}
          <PerformanceAlerts records={teamRecords} />

          {/* Fila / Backlog ativo (aging) para Líder / Supervisor */}
          <ActiveBacklogQueue
            records={teamRecords}
            isWidget={true}
            maxWidgetItems={5}
            onUpdateRecord={loadData}
          />

          {/* Grid com Gamificação e Conquistas da Equipe */}
          <div className="grid grid-cols-1 lg:grid-cols-3 gap-4">
            <ConsultantGamification
              records={consultantRecords}
              userName={user?.name || ''}
              userId={user?.id}
            />
            <div className="lg:col-span-2">
              <AchievementFeed />
            </div>
          </div>

          {/* Scorecard de Autonomia e Atendimentos Recentes da Equipe */}
          <div className="grid grid-cols-1 lg:grid-cols-2 gap-4">
            <AutonomyScorecard records={teamRecords} clients={accessibleClients} />

            <Card className="border-slate-200 shadow-subtle">
              <CardHeader className="pb-2">
                <CardTitle className="text-sm font-bold text-slate-900 flex items-center justify-between">
                  <span className="flex items-center gap-2">
                    <Headset className="h-4 w-4 text-indigo-600" /> Atendimentos Recentes da Equipe
                  </span>
                  <Button
                    variant="ghost"
                    size="sm"
                    onClick={() => navigate('/atendimentos')}
                    className="text-xs text-indigo-600 hover:text-indigo-700 p-0 h-auto"
                  >
                    Ver todos <ArrowRight className="h-3 w-3 ml-1" />
                  </Button>
                </CardTitle>
              </CardHeader>
              <CardContent className="space-y-2">
                {teamRecentRecords.length === 0 && (
                  <p className="text-xs text-slate-400 text-center py-6">
                    Nenhum atendimento registrado pela equipe até o momento.
                  </p>
                )}
                {teamRecentRecords.map((r, idx) => (
                  <div
                    key={r?.id || `team-${idx}`}
                    className="flex items-center justify-between p-2.5 bg-slate-50 rounded-lg hover:bg-slate-100/80 transition-colors"
                  >
                    <div className="min-w-0 flex-1">
                      <div className="flex items-center gap-1.5">
                        <p className="text-xs font-bold text-slate-900 truncate">
                          {r.client_company || r.client_name || 'Cliente'}
                        </p>
                        {r.expand?.assigned_user?.name && (
                          <span className="text-[10px] text-slate-400 truncate">
                            • {r.expand.assigned_user.name}
                          </span>
                        )}
                      </div>
                      <p className="text-[10px] text-slate-500 truncate">
                        {r.contact_reason || 'Atendimento'} —{' '}
                        {(r.description || '').substring(0, 60)}
                      </p>
                    </div>
                    <div className="flex items-center gap-2 shrink-0">
                      <StatusBadge status={r.status || 'Aberto'} />
                      <span className="text-[10px] text-slate-400">
                        {safeFormatDate(r.created)}
                      </span>
                    </div>
                  </div>
                ))}
              </CardContent>
            </Card>
          </div>
        </div>
      )}

      {/* ========================================================================= */}
      {/* 3. CONSULTOR: FOCO NO PRÓPRIO DESEMPENHO                                 */}
      {/* ========================================================================= */}
      {!isFullView && isConsultor && (
        <div className="space-y-6">
          {/* Disponibilidade da Equipe */}
          <CollaboratorStatusPanel />

          {/* Reconhecimento Social */}
          <SocialRecognitionBanner awards={awards} />

          {/* Cards com suas próprias estatísticas */}
          <DashboardStats {...consultantStats} />

          {/* Volume de Atendimentos com Linha de Tendência e Projeção de Meta */}
          <ServiceVolumeTrendCard
            records={consultantRecords}
            title="Meu Volume de Atendimentos & Tendência"
            subtitle="Ritmo pessoal diário e estimativa de fechamento para sua meta individual"
          />

          {/* Grid com Gamificação e Seus Atendimentos Recentes */}
          <div className="grid grid-cols-1 lg:grid-cols-3 gap-4">
            <ConsultantGamification
              records={consultantRecords}
              userName={user?.name || ''}
              userId={user?.id}
            />

            <Card className="lg:col-span-2 border-slate-200 shadow-subtle">
              <CardHeader className="pb-2">
                <CardTitle className="text-sm font-bold text-slate-900 flex items-center justify-between">
                  <span className="flex items-center gap-2">
                    <Headset className="h-4 w-4 text-indigo-600" /> Meus Atendimentos Recentes
                  </span>
                  <Button
                    variant="ghost"
                    size="sm"
                    onClick={() => navigate('/atendimentos')}
                    className="text-xs text-indigo-600 hover:text-indigo-700 p-0 h-auto"
                  >
                    Ver todos <ArrowRight className="h-3 w-3 ml-1" />
                  </Button>
                </CardTitle>
              </CardHeader>
              <CardContent className="space-y-2">
                {consultantRecentRecords.length === 0 && (
                  <p className="text-xs text-slate-400 text-center py-6">
                    Você ainda não possui atendimentos registrados hoje.
                  </p>
                )}
                {consultantRecentRecords.map((r, idx) => (
                  <div
                    key={r?.id || `mine-${idx}`}
                    className="flex items-center justify-between p-2.5 bg-slate-50 rounded-lg hover:bg-slate-100/80 transition-colors"
                  >
                    <div className="min-w-0 flex-1">
                      <p className="text-xs font-bold text-slate-900 truncate">
                        {r.client_company || r.client_name || 'Cliente'}
                      </p>
                      <p className="text-[10px] text-slate-500 truncate">
                        {r.contact_reason || 'Atendimento'} —{' '}
                        {(r.description || '').substring(0, 60)}
                      </p>
                    </div>
                    <div className="flex items-center gap-2 shrink-0">
                      <StatusBadge status={r.status || 'Aberto'} />
                      <span className="text-[10px] text-slate-400">
                        {safeFormatDate(r.created)}
                      </span>
                    </div>
                  </div>
                ))}
              </CardContent>
            </Card>
          </div>

          {/* Scorecard de autonomia dos clientes que o consultor atende */}
          <div className="grid grid-cols-1 lg:grid-cols-2 gap-4">
            <AutonomyScorecard records={consultantRecords} clients={consultantClients} />
            <TrainingPanel records={consultantRecords} clients={consultantClients} />
          </div>

          {/* Feed de Conquistas */}
          <AchievementFeed />
        </div>
      )}

      {/* ========================================================================= */}
      {/* 4. EXECUTIVO DE CONTAS: FOCO NOS CLIENTES QUE GERENCIA                   */}
      {/* ========================================================================= */}
      {!isFullView && isExecutivoContas && (
        <div className="space-y-6">
          {/* Disponibilidade da Equipe */}
          <CollaboratorStatusPanel />

          {/* Reconhecimento Social */}
          <SocialRecognitionBanner awards={awards} />

          {/* Banner de Identificação */}
          <div className="bg-gradient-to-r from-emerald-50 via-white to-emerald-50 border border-emerald-200 rounded-xl p-4 flex flex-col sm:flex-row items-start sm:items-center justify-between gap-3">
            <div className="flex items-center gap-3">
              <div className="h-10 w-10 rounded-xl bg-emerald-600 text-white flex items-center justify-center shrink-0">
                <Building2 className="h-5 w-5" />
              </div>
              <div>
                <h3 className="text-sm font-bold text-slate-900">
                  Carteira de Clientes do Executivo
                </h3>
                <p className="text-xs text-slate-500">
                  {currentExecutive
                    ? `Visão dedicada das contas gerenciadas por ${currentExecutive.name}`
                    : 'Visão dedicada da sua carteira de clientes'}
                </p>
              </div>
            </div>
            <Button
              variant="outline"
              size="sm"
              onClick={() => navigate('/painel-executivo')}
              className="text-xs text-emerald-700 border-emerald-200 hover:bg-emerald-50"
            >
              Abrir Painel Executivo <ArrowRight className="h-3 w-3 ml-1" />
            </Button>
          </div>

          {/* Cards de Total de Clientes, Ativos e Inativos */}
          <div className="grid grid-cols-1 sm:grid-cols-3 gap-4">
            <Card className="border-slate-200 shadow-subtle hover:border-slate-300 transition-colors">
              <CardContent className="p-4 flex items-center justify-between">
                <div>
                  <p className="text-xs font-medium text-slate-500">Total de Clientes</p>
                  <p className="text-2xl font-extrabold text-slate-900 mt-1">
                    {executiveClients.length}
                  </p>
                  <p className="text-[10px] text-slate-400 mt-0.5">Sob sua gestão comercial</p>
                </div>
                <div className="p-3 rounded-xl bg-indigo-50 text-indigo-600 shrink-0">
                  <Building2 className="h-6 w-6" />
                </div>
              </CardContent>
            </Card>

            <Card className="border-slate-200 shadow-subtle hover:border-slate-300 transition-colors">
              <CardContent className="p-4 flex items-center justify-between">
                <div>
                  <p className="text-xs font-medium text-slate-500">Clientes Ativos</p>
                  <p className="text-2xl font-extrabold text-emerald-600 mt-1">
                    {executiveActiveClients.length}
                  </p>
                  <p className="text-[10px] text-slate-400 mt-0.5">Operando normalmente</p>
                </div>
                <div className="p-3 rounded-xl bg-emerald-50 text-emerald-600 shrink-0">
                  <CheckCircle2 className="h-6 w-6" />
                </div>
              </CardContent>
            </Card>

            <Card className="border-slate-200 shadow-subtle hover:border-slate-300 transition-colors">
              <CardContent className="p-4 flex items-center justify-between">
                <div>
                  <p className="text-xs font-medium text-slate-500">
                    Clientes Inativos / Bloqueados
                  </p>
                  <p className="text-2xl font-extrabold text-rose-600 mt-1">
                    {executiveInactiveClients.length}
                  </p>
                  <p className="text-[10px] text-slate-400 mt-0.5">Com pendência ou bloqueio</p>
                </div>
                <div className="p-3 rounded-xl bg-rose-50 text-rose-600 shrink-0">
                  <XCircle className="h-6 w-6" />
                </div>
              </CardContent>
            </Card>
          </div>

          {/* Scorecard de autonomia completo (Top 3 e Bottom 3) */}
          <div className="grid grid-cols-1 lg:grid-cols-2 gap-4">
            <AutonomyScorecard records={executiveRecords} clients={executiveClients} />

            {/* Treinamentos pendentes dos seus clientes */}
            <Card className="border-slate-200 shadow-subtle">
              <CardHeader className="pb-2">
                <CardTitle className="text-sm font-bold text-slate-900 flex items-center justify-between">
                  <span className="flex items-center gap-2">
                    <GraduationCap className="h-4 w-4 text-indigo-600" /> Treinamentos Pendentes dos
                    Seus Clientes
                  </span>
                  <Button
                    variant="ghost"
                    size="sm"
                    onClick={() => navigate('/painel-treinamento')}
                    className="text-xs text-indigo-600 hover:text-indigo-700 p-0 h-auto"
                  >
                    Ver detalhes <ArrowRight className="h-3 w-3 ml-1" />
                  </Button>
                </CardTitle>
              </CardHeader>
              <CardContent className="space-y-2">
                {executivePendingTrainings.length === 0 ? (
                  <div className="p-4 bg-slate-50 rounded-lg text-center">
                    <CheckCircle2 className="h-6 w-6 text-emerald-500 mx-auto mb-1.5" />
                    <p className="text-xs text-slate-600 font-medium">
                      Nenhuma agência com demanda crítica de treinamento
                    </p>
                    <p className="text-[11px] text-slate-400 mt-0.5">
                      Seus clientes estão com baixo volume de dúvidas evitáveis.
                    </p>
                  </div>
                ) : (
                  executivePendingTrainings.slice(0, 5).map((item, idx) => (
                    <div
                      key={`exec-train-${idx}`}
                      className="flex items-center justify-between p-2.5 bg-indigo-50/50 rounded-lg border border-indigo-100"
                    >
                      <div className="min-w-0 flex-1">
                        <p className="text-xs font-bold text-slate-900 truncate">
                          {item.clientName}
                        </p>
                        <p className="text-[10px] text-slate-500">
                          {item.avoidableCount} chamados evitáveis registrados
                          {item.lastDate ? ` • Último: ${safeFormatDate(item.lastDate)}` : ''}
                        </p>
                      </div>
                      <Badge
                        variant="outline"
                        className="text-[10px] bg-white text-indigo-700 border-indigo-200 shrink-0 ml-2"
                      >
                        Sugerir Treinamento
                      </Badge>
                    </div>
                  ))
                )}
              </CardContent>
            </Card>
          </div>

          {/* Últimos atendimentos dos seus clientes */}
          <Card className="border-slate-200 shadow-subtle">
            <CardHeader className="pb-2">
              <CardTitle className="text-sm font-bold text-slate-900 flex items-center justify-between">
                <span className="flex items-center gap-2">
                  <Headset className="h-4 w-4 text-indigo-600" /> Últimos Atendimentos dos Seus
                  Clientes
                </span>
                <Button
                  variant="ghost"
                  size="sm"
                  onClick={() => navigate('/atendimentos')}
                  className="text-xs text-indigo-600 hover:text-indigo-700 p-0 h-auto"
                >
                  Ver todos <ArrowRight className="h-3 w-3 ml-1" />
                </Button>
              </CardTitle>
            </CardHeader>
            <CardContent className="space-y-2">
              {executiveRecentRecords.length === 0 ? (
                <p className="text-xs text-slate-400 text-center py-6">
                  Nenhum atendimento registrado para os clientes da sua carteira.
                </p>
              ) : (
                executiveRecentRecords.map((r, idx) => (
                  <div
                    key={r?.id || `exec-rec-${idx}`}
                    className="flex items-center justify-between p-2.5 bg-slate-50 rounded-lg hover:bg-slate-100/80 transition-colors"
                  >
                    <div className="min-w-0 flex-1">
                      <div className="flex items-center gap-2">
                        <p className="text-xs font-bold text-slate-900 truncate">
                          {r.client_company || r.client_name || 'Cliente'}
                        </p>
                        {r.avoidable_contact && (
                          <Badge variant="destructive" className="text-[9px] px-1 py-0 h-4">
                            Evitável
                          </Badge>
                        )}
                      </div>
                      <p className="text-[10px] text-slate-500 truncate">
                        {r.contact_reason || 'Atendimento'} —{' '}
                        {(r.description || '').substring(0, 70)}
                      </p>
                    </div>
                    <div className="flex items-center gap-2 shrink-0">
                      <StatusBadge status={r.status || 'Aberto'} />
                      <span className="text-[10px] text-slate-400">
                        {safeFormatDate(r.created)}
                      </span>
                    </div>
                  </div>
                ))
              )}
            </CardContent>
          </Card>
        </div>
      )}

      {/* ========================================================================= */}
      {/* 5. GESTOR COMERCIAL: VISÃO DE NEGÓCIOS                                   */}
      {/* ========================================================================= */}
      {!isFullView && isGestorComercial && (
        <div className="space-y-6">
          {/* Disponibilidade da Equipe */}
          <CollaboratorStatusPanel />

          {/* Reconhecimento Social */}
          <SocialRecognitionBanner awards={awards} />

          {/* Barra de Filtro de Período para Negócios */}
          <div className="flex flex-col sm:flex-row sm:items-center sm:justify-between gap-3 bg-white p-3.5 rounded-xl border border-slate-200 shadow-subtle">
            <div className="flex items-center gap-2">
              <BarChart3 className="h-5 w-5 text-indigo-600" />
              <span className="text-xs font-bold text-slate-800">
                Filtrar Período de Análise Comercial:
              </span>
            </div>
            <div className="flex items-center gap-2">
              <Select
                value={commercialPeriod}
                onValueChange={(val: any) => setCommercialPeriod(val)}
              >
                <SelectTrigger className="w-[180px] h-8 text-xs bg-slate-50">
                  <SelectValue placeholder="Selecione o período" />
                </SelectTrigger>
                <SelectContent>
                  <SelectItem value="today" className="text-xs">
                    Hoje
                  </SelectItem>
                  <SelectItem value="7days" className="text-xs">
                    Últimos 7 dias
                  </SelectItem>
                  <SelectItem value="month" className="text-xs">
                    Mês Atual
                  </SelectItem>
                  <SelectItem value="all" className="text-xs">
                    Todo o Período
                  </SelectItem>
                </SelectContent>
              </Select>
            </div>
          </div>

          {/* Cards de Volume total por período, Clientes Ativos, Taxa de autonomia geral */}
          <div className="grid grid-cols-1 sm:grid-cols-3 gap-4">
            <Card className="border-slate-200 shadow-subtle hover:border-slate-300 transition-colors">
              <CardContent className="p-4 flex items-center justify-between">
                <div>
                  <p className="text-xs font-medium text-slate-500">Volume Total de Atendimentos</p>
                  <p className="text-2xl font-extrabold text-slate-900 mt-1">
                    {commercialFilteredRecords.length}
                  </p>
                  <p className="text-[10px] text-slate-400 mt-0.5">
                    {commercialPeriod === 'today'
                      ? 'No dia de hoje'
                      : commercialPeriod === '7days'
                        ? 'Nos últimos 7 dias'
                        : commercialPeriod === 'month'
                          ? 'No mês atual'
                          : 'No histórico completo'}
                  </p>
                </div>
                <div className="p-3 rounded-xl bg-indigo-50 text-indigo-600 shrink-0">
                  <Headset className="h-6 w-6" />
                </div>
              </CardContent>
            </Card>

            <Card className="border-slate-200 shadow-subtle hover:border-slate-300 transition-colors">
              <CardContent className="p-4 flex items-center justify-between">
                <div>
                  <p className="text-xs font-medium text-slate-500">Clientes Ativos</p>
                  <p className="text-2xl font-extrabold text-emerald-600 mt-1">
                    {commercialActiveClients.length}
                  </p>
                  <p className="text-[10px] text-slate-400 mt-0.5">
                    de {commercialClients.length} clientes na base
                  </p>
                </div>
                <div className="p-3 rounded-xl bg-emerald-50 text-emerald-600 shrink-0">
                  <Building2 className="h-6 w-6" />
                </div>
              </CardContent>
            </Card>

            <Card className="border-slate-200 shadow-subtle hover:border-slate-300 transition-colors">
              <CardContent className="p-4 flex items-center justify-between">
                <div>
                  <p className="text-xs font-medium text-slate-500">Taxa de Autonomia Geral</p>
                  <p className="text-2xl font-extrabold text-indigo-600 mt-1">
                    {commercialAutonomyRate}%
                  </p>
                  <p className="text-[10px] text-slate-400 mt-0.5">
                    Proporção de demandas resolvidas sem retrabalho
                  </p>
                </div>
                <div className="p-3 rounded-xl bg-indigo-50 text-indigo-600 shrink-0">
                  <Award className="h-6 w-6" />
                </div>
              </CardContent>
            </Card>
          </div>

          {/* Gráfico Comparativo entre Grupos de Serviço */}
          <Card className="border-slate-200 shadow-subtle">
            <CardHeader className="pb-2">
              <CardTitle className="text-sm font-bold text-slate-900 flex items-center justify-between">
                <span className="flex items-center gap-2">
                  <Layers className="h-4 w-4 text-indigo-600" /> Gráfico Comparativo entre Grupos de
                  Serviço
                </span>
                <Button
                  variant="ghost"
                  size="sm"
                  onClick={() => navigate('/relatorios-grupo')}
                  className="text-xs text-indigo-600 hover:text-indigo-700 p-0 h-auto"
                >
                  Ver relatório completo <ArrowRight className="h-3 w-3 ml-1" />
                </Button>
              </CardTitle>
            </CardHeader>
            <CardContent className="space-y-4">
              <ChartContainer config={commercialChartConfig} className="h-[280px] w-full">
                <BarChart data={commercialGroupComparison}>
                  <CartesianGrid vertical={false} strokeDasharray="3 3" />
                  <XAxis dataKey="name" tick={{ fontSize: 11 }} tickLine={false} axisLine={false} />
                  <YAxis tick={{ fontSize: 11 }} tickLine={false} axisLine={false} width={30} />
                  <ChartTooltip content={<ChartTooltipContent />} />
                  <Bar
                    dataKey="total"
                    name="Total Atendimentos"
                    fill="#6366f1"
                    radius={[4, 4, 0, 0]}
                  />
                  <Bar
                    dataKey="avoidable"
                    name="Contatos Evitáveis"
                    fill="#f43f5e"
                    radius={[4, 4, 0, 0]}
                  />
                </BarChart>
              </ChartContainer>

              {/* Tabela Resumo dos Grupos */}
              <div className="overflow-x-auto rounded-lg border border-slate-100">
                <Table>
                  <TableHeader className="bg-slate-50">
                    <TableRow>
                      <TableHead className="text-xs font-bold">Grupo de Serviço</TableHead>
                      <TableHead className="text-xs font-bold text-center">Total</TableHead>
                      <TableHead className="text-xs font-bold text-center">Evitáveis</TableHead>
                      <TableHead className="text-xs font-bold text-center">
                        Taxa de Autonomia
                      </TableHead>
                    </TableRow>
                  </TableHeader>
                  <TableBody>
                    {commercialGroupComparison.map((g) => (
                      <TableRow key={g.group} className="hover:bg-slate-50">
                        <TableCell className="text-xs font-semibold text-slate-900">
                          {g.name}
                        </TableCell>
                        <TableCell className="text-xs text-center">{g.total}</TableCell>
                        <TableCell className="text-xs text-center text-rose-600 font-semibold">
                          {g.avoidable}
                        </TableCell>
                        <TableCell className="text-xs text-center">
                          <span
                            className={`inline-flex items-center px-2 py-0.5 rounded-full text-[11px] font-bold ${
                              g.autonomy >= 70
                                ? 'bg-emerald-100 text-emerald-800'
                                : 'bg-amber-100 text-amber-800'
                            }`}
                          >
                            {g.autonomy}%
                          </span>
                        </TableCell>
                      </TableRow>
                    ))}
                  </TableBody>
                </Table>
              </div>
            </CardContent>
          </Card>
        </div>
      )}
    </div>
  )
}
