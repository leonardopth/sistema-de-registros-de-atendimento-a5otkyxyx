import { useState, useEffect, useMemo } from 'react'
import { useNavigate } from 'react-router-dom'
import { Button } from '@/components/ui/button'
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card'
import { Badge } from '@/components/ui/badge'
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from '@/components/ui/select'
import { getServiceRecords } from '@/services/service_records'
import { getClients } from '@/services/clients'
import { getAccountExecutives } from '@/services/account_executives'
import { getUsers } from '@/services/users'
import { getUserTargets, UserTargetRecord } from '@/services/user-targets'
import { getGlobalTarget } from '@/services/global-targets'
import { getCsatStats, CsatStatItem } from '@/services/csat'
import {
  ServiceRecord,
  ClientRecord,
  AccountExecutiveRecord,
  UserRecord,
  GlobalTargetRecord,
} from '@/types/service_record'
import { useAuth } from '@/hooks/use-auth'
import { useRealtime } from '@/hooks/use-realtime'
import { DashboardStats } from '@/components/DashboardStats'
import { PerformanceAlerts } from '@/components/PerformanceAlerts'
import { TeamAvailabilityToday } from '@/components/TeamAvailabilityToday'
import { CompactRecentRecords } from '@/components/CompactRecentRecords'
import { ConsultantTargetsWidget } from '@/components/ConsultantTargetsWidget'
import {
  DashboardCollapsibleProvider,
  DashboardExpandCollapseToggle,
} from '@/components/DashboardCollapsible'
import { getAbsences } from '@/services/banco-ferias'
import { AbsenceRecord } from '@/types/banco-ferias'
import { filterClientsByUserAccess, filterRecordsByUserAccess } from '@/lib/service-group-access'
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
  Award,
  BarChart3,
  CheckCircle2,
  XCircle,
  ArrowRight,
} from 'lucide-react'

export default function Index() {
  const { user } = useAuth()
  const navigate = useNavigate()

  const [records, setRecords] = useState<ServiceRecord[]>([])
  const [clients, setClients] = useState<ClientRecord[]>([])
  const [executives, setExecutives] = useState<AccountExecutiveRecord[]>([])
  const [users, setUsers] = useState<UserRecord[]>([])
  const [absences, setAbsences] = useState<AbsenceRecord[]>([])
  const [userTargets, setUserTargets] = useState<UserTargetRecord[]>([])
  const [globalTarget, setGlobalTarget] = useState<GlobalTargetRecord | null>(null)
  const [csatResponses, setCsatResponses] = useState<CsatStatItem[]>([])
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
        getAbsences("status != 'cancelada'", '-start_date'),
        getUserTargets(),
        getGlobalTarget(),
        getCsatStats(),
      ])

      const [rRes, cRes, eRes, uRes, absRes, utRes, gtRes, csatRes] = results

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

      if (absRes && absRes.status === 'fulfilled') {
        setAbsences(Array.isArray(absRes.value) ? absRes.value : [])
      } else {
        setAbsences([])
      }

      if (utRes && utRes.status === 'fulfilled') {
        setUserTargets(Array.isArray(utRes.value) ? utRes.value : [])
      } else {
        setUserTargets([])
      }

      if (gtRes && gtRes.status === 'fulfilled') {
        setGlobalTarget(gtRes.value)
      } else {
        setGlobalTarget(null)
      }

      if (csatRes && csatRes.status === 'fulfilled') {
        setCsatResponses(Array.isArray(csatRes.value) ? csatRes.value : [])
      } else {
        setCsatResponses([])
      }

      const hasFailures = results.slice(0, 4).some((r) => r.status === 'rejected')
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

  // Subscrições realtime para sincronização contínua
  useRealtime('service_records', () => loadData(), true)
  useRealtime('clients', () => loadData(), true)
  useRealtime('account_executives', () => loadData(), true)
  useRealtime('users', () => loadData(), true)
  useRealtime('absences', () => loadData(), true)

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

  // Perfil mestre/gerente: visão completa e reorganizada
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

  const todayStr = useMemo(() => new Date().toISOString().substring(0, 10), [])
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

  // CSAT do consultor
  const consultantCsatStats = useMemo(() => {
    const myRecordIds = new Set(consultantRecords.map((r) => r.id))
    const myCsats = csatResponses.filter((c) => myRecordIds.has(c.service_record_id))
    const total = myCsats.length
    if (total === 0) return { avg: null, positiveRate: null, total: 0 }
    const sum = myCsats.reduce((acc, c) => acc + (c.rating || 0), 0)
    const pos = myCsats.filter((c) => c.rating >= 4).length
    return {
      avg: sum / total,
      positiveRate: Math.round((pos / total) * 100),
      total,
    }
  }, [consultantRecords, csatResponses])

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
    const withTfr = consultantRecords.filter((r) => Number(r?.first_response_time) > 0)
    const avgTfr =
      withTfr.length > 0
        ? Math.round(
            (withTfr.reduce((a, r) => a + Number(r?.first_response_time), 0) / withTfr.length) * 10,
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
      csatAvg: consultantCsatStats.avg,
      csatPositiveRate: consultantCsatStats.positiveRate,
      csatTotalResponses: consultantCsatStats.total,
    }
  }, [consultantRecords, consultantTodayRecords, consultantCsatStats])

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

      const supId = (u as any).supervisor_id
      if (supId && supId === user.id) {
        teamMap.set(u.id, u)
        return
      }

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

  const teamCsatStats = useMemo(() => {
    const teamRecordIds = new Set(teamRecords.map((r) => r.id))
    const relevantCsats = csatResponses.filter((c) => teamRecordIds.has(c.service_record_id))
    const total = relevantCsats.length
    if (total === 0) return { avg: null, positiveRate: null, total: 0 }
    const sum = relevantCsats.reduce((acc, c) => acc + (c.rating || 0), 0)
    const pos = relevantCsats.filter((c) => c.rating >= 4).length
    return {
      avg: sum / total,
      positiveRate: Math.round((pos / total) * 100),
      total,
    }
  }, [teamRecords, csatResponses])

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
    const withTfr = teamRecords.filter((r) => Number(r?.first_response_time) > 0)
    const avgTfr =
      withTfr.length > 0
        ? Math.round(
            (withTfr.reduce((a, r) => a + Number(r?.first_response_time), 0) / withTfr.length) * 10,
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
      csatAvg: teamCsatStats.avg,
      csatPositiveRate: teamCsatStats.positiveRate,
      csatTotalResponses: teamCsatStats.total,
    }
  }, [teamRecords, teamTodayRecords, teamCsatStats])

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

  // --- 5. GERENTE / MASTER (Geral) ---
  const generalTodayRecords = useMemo(() => {
    return accessibleRecords.filter((r) => {
      const recDate = getGMT3DateString(r.created)
      return recDate === todayStr || (r.created && r.created.startsWith(todayStr))
    })
  }, [accessibleRecords, todayStr])

  const generalCsatStats = useMemo(() => {
    const recordIds = new Set(accessibleRecords.map((r) => r.id))
    const relevant = csatResponses.filter((c) => recordIds.has(c.service_record_id))
    const total = relevant.length
    if (total === 0) return { avg: null, positiveRate: null, total: 0 }
    const sum = relevant.reduce((acc, c) => acc + (c.rating || 0), 0)
    const pos = relevant.filter((c) => c.rating >= 4).length
    return {
      avg: sum / total,
      positiveRate: Math.round((pos / total) * 100),
      total,
    }
  }, [accessibleRecords, csatResponses])

  const generalStats = useMemo(() => {
    const withTfr = accessibleRecords.filter((r) => Number(r?.first_response_time) > 0)
    const avgTfr =
      withTfr.length > 0
        ? Math.round(
            (withTfr.reduce((a, r) => a + Number(r?.first_response_time), 0) / withTfr.length) * 10,
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
      csatAvg: generalCsatStats.avg,
      csatPositiveRate: generalCsatStats.positiveRate,
      csatTotalResponses: generalCsatStats.total,
    }
  }, [accessibleRecords, generalTodayRecords, generalCsatStats])

  // Subtítulo do cabeçalho de acordo com o papel
  const roleSubtitle = useMemo(() => {
    if (isMaster)
      return 'Visão Executiva Global — Gerenciamento completo de atendimentos e métricas'
    if (isGerente) return 'Visão Gerencial — Controle completo da operação de atendimento e suporte'
    if (isSupervisorOrLider)
      return 'Visão de Equipe — Gestão de desempenho e atendimentos dos liderados'
    if (isConsultor) return 'Meu Desempenho — Meus números, metas e atendimentos de hoje'
    if (isExecutivoContas) return 'Gestão de Contas — Carteira de clientes gerenciados e autonomia'
    if (isGestorComercial)
      return 'Visão de Negócios — Volume de atendimentos, clientes e análise de núcleos'
    return 'Acompanhe seus atendimentos e indicadores'
  }, [isMaster, isGerente, isSupervisorOrLider, isConsultor, isExecutivoContas, isGestorComercial])

  return (
    <DashboardCollapsibleProvider userId={user?.id || 'guest'}>
      <div className="space-y-5">
        {/* CABEÇALHO DO DASHBOARD */}
        <div className="flex flex-col sm:flex-row sm:items-center sm:justify-between gap-3">
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

          <div className="flex flex-wrap items-center gap-2">
            <DashboardExpandCollapseToggle />

            <Button
              onClick={() => window.dispatchEvent(new CustomEvent('open-quick-log'))}
              className="bg-gradient-to-r from-cyan-600 to-indigo-600 hover:from-cyan-700 hover:to-indigo-700 font-bold h-9"
              size="sm"
            >
              <Zap className="h-4 w-4 mr-1.5" /> Registro Expresso
            </Button>
            <Button
              variant="outline"
              size="sm"
              onClick={() => navigate('/novo-atendimento')}
              className="h-9"
            >
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
              onClick={() => loadData()}
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
        {/* 1. CONSULTOR: PÁGINA COMPACTA (< 1 TELA)                                 */}
        {/* Meus números de hoje/semana + Minhas metas + Últimos 5 + Alertas de Ação */}
        {/* ========================================================================= */}
        {!isFullView && isConsultor && (
          <div className="space-y-4">
            {/* Bloco 1: Meus Números de Hoje / Semana (Cards de Métricas) */}
            <DashboardStats {...consultantStats} />

            {/* Bloco 2: Minhas Metas + Meus Atendimentos Recentes (Últimos 5) */}
            <div className="grid grid-cols-1 lg:grid-cols-2 gap-4">
              <ConsultantTargetsWidget
                user={user}
                records={consultantRecords}
                targets={userTargets}
                globalTarget={globalTarget}
              />

              <CompactRecentRecords
                records={consultantRecords}
                title="Meus Últimos Atendimentos"
                emptyMessage="Você ainda não possui atendimentos registrados hoje."
                maxItems={5}
              />
            </div>

            {/* Bloco 3: Alertas de Ação que lhe dizem respeito (Fila completa em /fila-atendimentos) */}
            <PerformanceAlerts
              records={consultantRecords}
              targetUserId={user?.id}
              title="Minhas Ações & Alertas"
              subtitle="Alertas de fila, TFR e projeção da sua meta pessoal de atendimento"
            />
          </div>
        )}

        {/* ========================================================================= */}
        {/* 2. SUPERVISOR / LÍDER: GESTÃO DA EQUIPE (~1 TELA)                         */}
        {/* Equipe Disponível Hoje + Métricas + Alertas de Ação + Últimos 5          */}
        {/* ========================================================================= */}
        {!isFullView && isSupervisorOrLider && (
          <div className="space-y-4">
            {/* Faixa de Atenção / Equipe Disponível Hoje (com escopo INTER/NAC mantido) */}
            <TeamAvailabilityToday users={users} absences={absences} currentUser={user} />

            {/* Header resumo de liderança */}
            <div className="bg-gradient-to-r from-indigo-50 via-white to-indigo-50 border border-indigo-100 rounded-xl p-3 sm:p-3.5 flex flex-col sm:flex-row items-start sm:items-center justify-between gap-3">
              <div className="flex items-center gap-3">
                <div className="h-9 w-9 rounded-xl bg-indigo-600 text-white flex items-center justify-center shrink-0">
                  <Users2 className="h-4 w-4" />
                </div>
                <div>
                  <h3 className="text-xs sm:text-sm font-bold text-slate-900">
                    Painel de Liderança da Equipe
                  </h3>
                  <p className="text-[11px] text-slate-500">
                    Monitorando{' '}
                    {teamUsers.length > 0
                      ? `${teamUsers.length} consultores sob sua supervisão`
                      : 'sua equipe de atendimento'}
                  </p>
                </div>
              </div>
              <div className="flex items-center gap-2">
                <Button
                  variant="outline"
                  size="sm"
                  onClick={() => navigate('/relatorio-consultor')}
                  className="text-xs h-7 text-indigo-700 border-indigo-200 hover:bg-indigo-50"
                >
                  Relatório Individual <ArrowRight className="h-3 w-3 ml-1" />
                </Button>
                <Button
                  variant="outline"
                  size="sm"
                  onClick={() => navigate('/metas-desempenho')}
                  className="text-xs h-7 text-indigo-700 border-indigo-200 hover:bg-indigo-50"
                >
                  Metas da Equipe <ArrowRight className="h-3 w-3 ml-1" />
                </Button>
                <Button
                  variant="outline"
                  size="sm"
                  onClick={() => navigate('/fila-atendimentos')}
                  className="text-xs h-7 text-indigo-700 border-indigo-200 hover:bg-indigo-50"
                >
                  Fila &amp; Aging <ArrowRight className="h-3 w-3 ml-1" />
                </Button>
              </div>
            </div>

            {/* Cards de métricas da equipe */}
            <DashboardStats {...teamStats} />

            {/* Alertas de Desempenho e Ação da Equipe */}
            <PerformanceAlerts records={teamRecords} />

            {/* Resumo Compacto dos Últimos Atendimentos da Equipe */}
            <CompactRecentRecords
              records={teamRecords}
              title="Últimos Atendimentos da Equipe"
              emptyMessage="Nenhum atendimento registrado pela equipe até o momento."
              showConsultant={true}
              maxItems={5}
            />
          </div>
        )}

        {/* ========================================================================= */}
        {/* 3. MASTER / GERENTE: VISÃO DIRETA E COMPACTA (~1 TELA)                    */}
        {/* Métricas Globais + Disponibilidade Hoje + Alertas + Últimos 5             */}
        {/* ========================================================================= */}
        {isFullView && (
          <div className="space-y-4">
            {/* Bloco 1: Métricas Globais (Cards responsivos com CSAT inteligente) */}
            <DashboardStats {...generalStats} />

            {/* Bloco 2: Faixa de Atenção Operacional: Equipe Disponível Hoje */}
            <TeamAvailabilityToday users={users} absences={absences} currentUser={user} />

            {/* Bloco 3: Central de Alertas de Ação (TFR crítico, chamados parados, etc) */}
            <PerformanceAlerts records={accessibleRecords} />

            {/* Bloco 4: Resumo Compacto dos Últimos Atendimentos (Geral) */}
            <CompactRecentRecords
              records={accessibleRecords}
              title="Atendimentos Recentes (Geral)"
              emptyMessage="Nenhum atendimento recente."
              showConsultant={true}
              maxItems={5}
            />
          </div>
        )}

        {/* ========================================================================= */}
        {/* 4. EXECUTIVO DE CONTAS: FOCO NOS CLIENTES QUE GERENCIA (~1 TELA)          */}
        {/* ========================================================================= */}
        {!isFullView && isExecutivoContas && (
          <div className="space-y-4">
            {/* Banner de Identificação */}
            <div className="bg-gradient-to-r from-emerald-50 via-white to-emerald-50 border border-emerald-200 rounded-xl p-3 sm:p-4 flex flex-col sm:flex-row items-start sm:items-center justify-between gap-3">
              <div className="flex items-center gap-3">
                <div className="h-9 w-9 rounded-xl bg-emerald-600 text-white flex items-center justify-center shrink-0">
                  <Building2 className="h-4 w-4" />
                </div>
                <div>
                  <h3 className="text-xs sm:text-sm font-bold text-slate-900">
                    Carteira de Clientes do Executivo
                  </h3>
                  <p className="text-[11px] text-slate-500">
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
                className="text-xs h-7 text-emerald-700 border-emerald-200 hover:bg-emerald-50"
              >
                Abrir Painel Executivo <ArrowRight className="h-3 w-3 ml-1" />
              </Button>
            </div>

            {/* Cards de Total de Clientes, Ativos e Inativos */}
            <div className="grid grid-cols-1 sm:grid-cols-3 gap-3">
              <Card className="border-slate-200 shadow-subtle hover:border-slate-300 transition-colors">
                <CardContent className="p-3.5 flex items-center justify-between">
                  <div>
                    <p className="text-xs font-medium text-slate-500">Total de Clientes</p>
                    <p className="text-2xl font-extrabold text-slate-900 mt-1">
                      {executiveClients.length}
                    </p>
                    <p className="text-[10px] text-slate-400 mt-0.5">Sob sua gestão comercial</p>
                  </div>
                  <div className="p-2.5 rounded-xl bg-indigo-50 text-indigo-600 shrink-0">
                    <Building2 className="h-5 w-5" />
                  </div>
                </CardContent>
              </Card>

              <Card className="border-slate-200 shadow-subtle hover:border-slate-300 transition-colors">
                <CardContent className="p-3.5 flex items-center justify-between">
                  <div>
                    <p className="text-xs font-medium text-slate-500">Clientes Ativos</p>
                    <p className="text-2xl font-extrabold text-emerald-600 mt-1">
                      {executiveActiveClients.length}
                    </p>
                    <p className="text-[10px] text-slate-400 mt-0.5">Operando normalmente</p>
                  </div>
                  <div className="p-2.5 rounded-xl bg-emerald-50 text-emerald-600 shrink-0">
                    <CheckCircle2 className="h-5 w-5" />
                  </div>
                </CardContent>
              </Card>

              <Card className="border-slate-200 shadow-subtle hover:border-slate-300 transition-colors">
                <CardContent className="p-3.5 flex items-center justify-between">
                  <div>
                    <p className="text-xs font-medium text-slate-500">Clientes Inativos</p>
                    <p className="text-2xl font-extrabold text-rose-600 mt-1">
                      {executiveInactiveClients.length}
                    </p>
                    <p className="text-[10px] text-slate-400 mt-0.5">Com pendência ou bloqueio</p>
                  </div>
                  <div className="p-2.5 rounded-xl bg-rose-50 text-rose-600 shrink-0">
                    <XCircle className="h-5 w-5" />
                  </div>
                </CardContent>
              </Card>
            </div>

            {/* Resumo Compacto dos Últimos Atendimentos da Carteira */}
            <CompactRecentRecords
              records={executiveRecords}
              title="Últimos Atendimentos da Carteira"
              emptyMessage="Nenhum atendimento registrado para os clientes da sua carteira."
              maxItems={5}
            />
          </div>
        )}

        {/* ========================================================================= */}
        {/* 5. GESTOR COMERCIAL: VISÃO DE NEGÓCIOS (~1 TELA)                         */}
        {/* ========================================================================= */}
        {!isFullView && isGestorComercial && (
          <div className="space-y-4">
            {/* Barra de Filtro de Período para Negócios */}
            <div className="flex flex-col sm:flex-row sm:items-center sm:justify-between gap-3 bg-white p-3 rounded-xl border border-slate-200 shadow-subtle">
              <div className="flex items-center gap-2">
                <BarChart3 className="h-4 w-4 text-indigo-600" />
                <span className="text-xs font-bold text-slate-800">
                  Período de Análise Comercial:
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
            <div className="grid grid-cols-1 sm:grid-cols-3 gap-3">
              <Card className="border-slate-200 shadow-subtle hover:border-slate-300 transition-colors">
                <CardContent className="p-3.5 flex items-center justify-between">
                  <div>
                    <p className="text-xs font-medium text-slate-500">Volume de Atendimentos</p>
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
                  <div className="p-2.5 rounded-xl bg-indigo-50 text-indigo-600 shrink-0">
                    <Headset className="h-5 w-5" />
                  </div>
                </CardContent>
              </Card>

              <Card className="border-slate-200 shadow-subtle hover:border-slate-300 transition-colors">
                <CardContent className="p-3.5 flex items-center justify-between">
                  <div>
                    <p className="text-xs font-medium text-slate-500">Clientes Ativos</p>
                    <p className="text-2xl font-extrabold text-emerald-600 mt-1">
                      {commercialActiveClients.length}
                    </p>
                    <p className="text-[10px] text-slate-400 mt-0.5">
                      de {commercialClients.length} clientes na base
                    </p>
                  </div>
                  <div className="p-2.5 rounded-xl bg-emerald-50 text-emerald-600 shrink-0">
                    <Building2 className="h-5 w-5" />
                  </div>
                </CardContent>
              </Card>

              <Card className="border-slate-200 shadow-subtle hover:border-slate-300 transition-colors">
                <CardContent className="p-3.5 flex items-center justify-between">
                  <div>
                    <p className="text-xs font-medium text-slate-500">Taxa de Autonomia Geral</p>
                    <p className="text-2xl font-extrabold text-indigo-600 mt-1">
                      {commercialAutonomyRate}%
                    </p>
                    <p className="text-[10px] text-slate-400 mt-0.5">
                      Demandas sem contato evitável
                    </p>
                  </div>
                  <div className="p-2.5 rounded-xl bg-indigo-50 text-indigo-600 shrink-0">
                    <Award className="h-5 w-5" />
                  </div>
                </CardContent>
              </Card>
            </div>

            {/* Resumo Compacto dos Últimos Atendimentos */}
            <CompactRecentRecords
              records={commercialFilteredRecords}
              title="Últimos Atendimentos Registrados"
              emptyMessage="Nenhum atendimento recente no período selecionado."
              showConsultant={true}
              maxItems={5}
            />
          </div>
        )}
      </div>
    </DashboardCollapsibleProvider>
  )
}
