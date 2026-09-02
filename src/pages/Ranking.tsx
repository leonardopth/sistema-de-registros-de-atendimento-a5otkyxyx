import React, { useState, useEffect, useMemo, useCallback } from 'react'
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card'
import { Tabs, TabsList, TabsTrigger, TabsContent } from '@/components/ui/tabs'
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from '@/components/ui/select'
import { Button } from '@/components/ui/button'
import { Badge } from '@/components/ui/badge'
import { useAuth } from '@/hooks/use-auth'
import { useRealtime } from '@/hooks/use-realtime'
import {
  getAllGamification,
  getGamificationByUser,
  getMonthlyAwards,
  closeMonthAwards,
  recalculateGamification,
} from '@/services/gamification'
import { getUsers } from '@/services/users'
import { getServiceRecords } from '@/services/service_records'
import {
  GamificationRecord,
  MonthlyAwardRecord,
  UserRankingEntry,
  BadgeDefinition,
  BADGE_DEFINITIONS,
  LEVELS,
} from '@/types/gamification'
import { UserRecord, ServiceRecord } from '@/types/service_record'
import { MyProgressWidget } from '@/components/MyProgressWidget'
import { RankingPodium } from '@/components/RankingPodium'
import { RankingTable } from '@/components/RankingTable'
import { BadgesShowcase } from '@/components/BadgesShowcase'
import { SocialRecognitionBanner } from '@/components/SocialRecognitionBanner'
import { AchievementFeed } from '@/components/AchievementFeed'
import { BadgeUnlockModal } from '@/components/BadgeUnlockModal'
import { SERVICE_GROUP_OPTIONS } from '@/lib/service-groups'
import { getGMT3DateString } from '@/lib/timezone'
import {
  Trophy,
  Medal,
  Crown,
  Sparkles,
  Flame,
  Award,
  Layers,
  Filter,
  RefreshCw,
  Calendar,
  Globe,
  MapPin,
  HelpCircle,
} from 'lucide-react'

export default function Ranking() {
  const { user } = useAuth()
  const [users, setUsers] = useState<UserRecord[]>([])
  const [gamificationList, setGamificationList] = useState<GamificationRecord[]>([])
  const [records, setRecords] = useState<ServiceRecord[]>([])
  const [awards, setAwards] = useState<MonthlyAwardRecord[]>([])
  const [clients, setClients] = useState<any[]>([])
  const [trainings, setTrainings] = useState<any[]>([])
  const [loading, setLoading] = useState(true)
  const [refreshing, setRefreshing] = useState(false)

  // Filtros
  const [rankingCategory, setRankingCategory] = useState<'consultants' | 'executives'>(
    user?.role === 'Executivo de Contas' ? 'executives' : 'consultants',
  )
  const [activeTab, setActiveTab] = useState<'geral' | 'nacional' | 'internacional' | 'base'>(
    'geral',
  )
  const [period, setPeriod] = useState<'month' | 'quarter' | 'year' | 'all'>('month')
  const [selectedBase, setSelectedBase] = useState<string>('Concierge')

  // Modal de comemoração de badge
  const [celebrationBadge, setCelebrationBadge] = useState<BadgeDefinition | null>(null)
  const [celebrationOpen, setCelebrationOpen] = useState(false)

  const loadAllData = useCallback(async () => {
    try {
      setRefreshing(true)
      const [uList, gList, rList, aList, cList, tList] = await Promise.all([
        getUsers().catch(() => []),
        getAllGamification().catch(() => []),
        getServiceRecords('', '-created').catch(() => []),
        getMonthlyAwards().catch(() => []),
        import('@/services/clients').then((m) => m.getClients()).catch(() => []),
        import('@/services/trainings').then((m) => m.getTrainings()).catch(() => []),
      ])
      setUsers(uList || [])
      setGamificationList(gList || [])
      setRecords(rList || [])
      setAwards(aList || [])
      setClients(cList || [])
      setTrainings(tList || [])
    } catch (e) {
      console.warn('Erro ao carregar dados do ranking:', e)
    } finally {
      setLoading(false)
      setRefreshing(false)
    }
  }, [])

  // Carga inicial e recarga quando trocar de aba, período ou base
  useEffect(() => {
    loadAllData()
  }, [loadAllData, activeTab, period, selectedBase])

  // Polling suave a cada 20 segundos para manter os dados sempre sincronizados
  useEffect(() => {
    const interval = setInterval(() => {
      loadAllData()
    }, 20000)
    return () => clearInterval(interval)
  }, [loadAllData])

  // Inscrições Realtime para atualizações instantâneas no banco de dados
  useRealtime('gamification', () => loadAllData())
  useRealtime('badges', () => loadAllData())
  useRealtime('monthly_awards', () => loadAllData())
  useRealtime('service_records', () => loadAllData())
  useRealtime('users', () => loadAllData())

  const currentUserGamification = useMemo(() => {
    if (!user) return null
    return gamificationList.find((g) => g.user_id === user.id) || null
  }, [gamificationList, user])

  // Filtragem dos atendimentos conforme período selecionado para ponderação dinâmica do ranking
  const filteredRecords = useMemo(() => {
    const now = new Date()
    const nowYear = now.getFullYear()
    const nowMonth = now.getMonth() // 0-11
    const currentMonthPrefix = `${nowYear}-${String(nowMonth + 1).padStart(2, '0')}`

    // Trimestre atual (Q1: 0-2, Q2: 3-5, Q3: 6-8, Q4: 9-11)
    const quarterStartMonth = Math.floor(nowMonth / 3) * 3
    const quarterMonths = [quarterStartMonth, quarterStartMonth + 1, quarterStartMonth + 2].map(
      (m) => `${nowYear}-${String(m + 1).padStart(2, '0')}`,
    )

    const yearPrefix = `${nowYear}-`

    return records.filter((r) => {
      const created = r.created || ''
      if (period === 'month') return created.startsWith(currentMonthPrefix)
      if (period === 'quarter') return quarterMonths.some((qm) => created.startsWith(qm))
      if (period === 'year') return created.startsWith(yearPrefix)
      return true
    })
  }, [records, period])

  // Construir ranking estruturado para todos os usuários
  const allRankingEntries: UserRankingEntry[] = useMemo(() => {
    const gamificationMap = new Map<string, GamificationRecord>()
    gamificationList.forEach((g) => {
      gamificationMap.set(g.user_id, g)
    })

    // Atendimentos por usuário no período
    const userCompletedMap = new Map<string, number>()
    filteredRecords.forEach((r) => {
      if (r.status === 'Concluído') {
        const uid = r.assigned_user || r.user_id
        if (uid) {
          userCompletedMap.set(uid, (userCompletedMap.get(uid) || 0) + 1)
        }
      }
    })

    const entries: UserRankingEntry[] = []

    // Filtrar usuários elegíveis de acordo com a categoria selecionada (Consultores vs Executivos)
    const eligibleUsers = users.filter((u) => {
      const role = u.role
      if (rankingCategory === 'executives') {
        return role === 'Executivo de Contas'
      }
      return role === 'Consultor'
    })

    // Calcular métricas de clientes caso estejamos no ranking de executivos
    const now = new Date()
    const currentMonthPrefix = `${now.getFullYear()}-${String(now.getMonth() + 1).padStart(2, '0')}`
    const prevDate = new Date(now.getFullYear(), now.getMonth() - 1, 1)
    const prevMonthPrefix = `${prevDate.getFullYear()}-${String(prevDate.getMonth() + 1).padStart(2, '0')}`

    eligibleUsers.forEach((u) => {
      const g = gamificationMap.get(u.id)
      const isExec = u.role === 'Executivo de Contas'

      let xp = g?.xp || 0
      let level = g?.level || 'Aprendiz'
      let badges = g?.badges || []
      let dailyRecord = g?.daily_record || 0
      let streakDays = g?.streak_days || 0
      const completedCount = userCompletedMap.get(u.id) || 0

      let managedCount = 0
      let avgAutonomy = 100
      let highAutonomyCount = 0
      let evolutionCount = 0

      if (isExec) {
        const managed = clients.filter(
          (c) =>
            c.account_executive === u.name ||
            (c.account_executive_rel && c.account_executive_rel === u.id),
        )
        managedCount = managed.length
        let totalAutonomySum = 0

        managed.forEach((cl) => {
          const clRecords = records.filter(
            (r) => r.client === cl.id || (cl.company && r.client_company === cl.company),
          )
          const totalCl = clRecords.length
          const avoidableCl = clRecords.filter((r) => r.avoidable_contact).length
          const autonomyRate =
            totalCl > 0 ? Math.round(((totalCl - avoidableCl) / totalCl) * 100) : 100
          totalAutonomySum += autonomyRate

          if (autonomyRate >= 80) highAutonomyCount += 1

          const curMonthRecs = clRecords.filter((r) =>
            (r.created || '').startsWith(currentMonthPrefix),
          )
          const prevMonthRecs = clRecords.filter((r) =>
            (r.created || '').startsWith(prevMonthPrefix),
          )
          const curMonthAvoidable = curMonthRecs.filter((r) => r.avoidable_contact).length
          const prevMonthAvoidable = prevMonthRecs.filter((r) => r.avoidable_contact).length

          const curAutonomy =
            curMonthRecs.length > 0
              ? ((curMonthRecs.length - curMonthAvoidable) / curMonthRecs.length) * 100
              : 100
          const prevAutonomy =
            prevMonthRecs.length > 0
              ? ((prevMonthRecs.length - prevMonthAvoidable) / prevMonthRecs.length) * 100
              : 100

          if (curAutonomy > prevAutonomy || (curAutonomy >= 80 && prevMonthRecs.length === 0)) {
            evolutionCount += 1
          }
        })

        avgAutonomy = managedCount > 0 ? Math.round(totalAutonomySum / managedCount) : 100
        const calculatedExecXP =
          highAutonomyCount * 40 + evolutionCount * 50 + Math.round(avgAutonomy * 2)

        if (calculatedExecXP > xp) {
          xp = calculatedExecXP
          if (xp >= 2000) level = 'Master'
          else if (xp >= 1000) level = 'Expert'
          else if (xp >= 600) level = 'Sênior'
          else if (xp >= 300) level = 'Pleno'
          else if (xp >= 100) level = 'Júnior'
          else level = 'Aprendiz'
        }

        dailyRecord = highAutonomyCount
        streakDays = evolutionCount
      }

      const serviceGroups = (u.service_groups as string[] | undefined) || []
      const departments = (u.departments as string[] | undefined) || []
      const bases = (u.bases as string[] | undefined) || []

      entries.push({
        rank: 1,
        user: u,
        xp,
        level,
        badgesCount: badges.length,
        badges,
        dailyRecord,
        streakDays,
        completedCount,
        serviceGroups,
        departments,
        bases,
        managedClientsCount: managedCount,
        avgAutonomyRate: avgAutonomy,
        highAutonomyClientsCount: highAutonomyCount,
        evolutionPositiveCount: evolutionCount,
      })
    })

    // Ordenar por XP decrescente (e desempate por atendimentos concluídos)
    entries.sort((a, b) => {
      if (b.xp !== a.xp) return b.xp - a.xp
      return b.completedCount - a.completedCount
    })

    // Atribuir posição
    entries.forEach((e, index) => {
      e.rank = index + 1
    })

    return entries
  }, [users, gamificationList, filteredRecords, rankingCategory, clients, records])

  // Rankings filtrados por aba
  const filteredRanking = useMemo(() => {
    let list = [...allRankingEntries]

    if (activeTab === 'nacional') {
      list = list.filter((e) => {
        const deps = e.departments || []
        return (
          deps.includes('Nacional') ||
          deps.some((d) => d.toLowerCase().indexOf('nacional') !== -1) ||
          e.serviceGroups.some((sg) => ['BR1', 'BR2', 'SAO', 'SPI', 'SUL'].includes(sg))
        )
      })
    } else if (activeTab === 'internacional') {
      list = list.filter((e) => {
        const deps = e.departments || []
        return (
          deps.includes('Internacional') ||
          deps.some((d) => d.toLowerCase().indexOf('internacional') !== -1) ||
          e.serviceGroups.some((sg) => ['Concierge', 'Exclusivo', 'LOT'].includes(sg))
        )
      })
    } else if (activeTab === 'base') {
      list = list.filter((e) => {
        return e.serviceGroups.includes(selectedBase) || e.bases.includes(selectedBase)
      })
    }

    // Reatribuir ranks dentro do subranking
    list.forEach((e, idx) => {
      e.rank = idx + 1
    })

    return list
  }, [allRankingEntries, activeTab, selectedBase])

  // Top 3 do ranking atual para o pódio
  const podiumUsers = useMemo(() => {
    return filteredRanking.slice(0, 3)
  }, [filteredRanking])

  const handleBadgeClick = (badge: BadgeDefinition, unlocked: boolean) => {
    if (unlocked) {
      setCelebrationBadge(badge)
      setCelebrationOpen(true)
    }
  }

  return (
    <div className="space-y-6">
      {/* CABEÇALHO DO RANKING */}
      <div className="flex flex-col sm:flex-row sm:items-center sm:justify-between gap-4">
        <div>
          <div className="flex items-center gap-2">
            <div className="p-2 bg-amber-500/10 text-amber-600 rounded-xl border border-amber-200">
              <Trophy className="h-6 w-6" />
            </div>
            <div>
              <h2 className="text-2xl font-extrabold tracking-tight text-slate-900">
                Ranking de Gamificação & Conquistas
              </h2>
              <p className="text-xs text-slate-500 mt-0.5">
                Acompanhe os líderes de atendimento, suba de nível e desbloqueie recompensas
              </p>
            </div>
          </div>
        </div>

        {/* Filtro de Período */}
        <div className="flex items-center gap-2 flex-wrap">
          <div className="flex items-center gap-1.5 bg-white p-1 rounded-xl border border-slate-200 shadow-xs">
            <Calendar className="h-4 w-4 text-slate-400 ml-2" />
            <Select value={period} onValueChange={(val: any) => setPeriod(val)}>
              <SelectTrigger className="w-[150px] h-8 text-xs border-0 shadow-none focus:ring-0">
                <SelectValue placeholder="Período" />
              </SelectTrigger>
              <SelectContent>
                <SelectItem value="month" className="text-xs">
                  Mês Atual
                </SelectItem>
                <SelectItem value="quarter" className="text-xs">
                  Trimestre
                </SelectItem>
                <SelectItem value="year" className="text-xs">
                  Ano {new Date().getFullYear()}
                </SelectItem>
                <SelectItem value="all" className="text-xs">
                  Todo o Período
                </SelectItem>
              </SelectContent>
            </Select>
          </div>

          <Button
            variant="outline"
            size="sm"
            onClick={loadAllData}
            disabled={refreshing}
            className="h-9 text-xs bg-white"
          >
            <RefreshCw className={`h-3.5 w-3.5 mr-1.5 ${refreshing ? 'animate-spin' : ''}`} />
            Atualizar
          </Button>
        </div>
      </div>

      {/* Seletor do Tipo de Gamificação: Consultores (Atendimento) vs Executivos de Contas (Progresso de Clientes) */}
      <div className="flex items-center justify-between p-2.5 bg-indigo-50/70 border border-indigo-100 rounded-2xl flex-wrap gap-2">
        <div className="flex items-center gap-2">
          <span className="text-xs font-bold text-indigo-950 px-2">Visualizar Gamificação:</span>
          <div className="flex items-center gap-1 bg-white p-1 rounded-xl border border-indigo-200">
            <Button
              variant={rankingCategory === 'consultants' ? 'default' : 'ghost'}
              size="sm"
              onClick={() => setRankingCategory('consultants')}
              className={`h-8 text-xs font-semibold ${
                rankingCategory === 'consultants'
                  ? 'bg-indigo-600 text-white shadow-xs'
                  : 'text-slate-600 hover:text-slate-900'
              }`}
            >
              🎧 Consultores (Atendimentos)
            </Button>
            <Button
              variant={rankingCategory === 'executives' ? 'default' : 'ghost'}
              size="sm"
              onClick={() => setRankingCategory('executives')}
              className={`h-8 text-xs font-semibold ${
                rankingCategory === 'executives'
                  ? 'bg-emerald-600 text-white shadow-xs'
                  : 'text-slate-600 hover:text-slate-900'
              }`}
            >
              📈 Executivos de Contas (Progresso de Clientes)
            </Button>
          </div>
        </div>

        <div className="text-[11px] text-slate-500 italic pr-2">
          {rankingCategory === 'executives'
            ? 'XP e conquistas calculados com base na evolução, scorecard e autonomia dos clientes'
            : 'XP e conquistas calculados com base na agilidade, TMA e qualidade dos chamados'}
        </div>
      </div>

      {/* 1. WIDGET "MEU PROGRESSO" */}
      {user && (
        <MyProgressWidget
          userId={user.id}
          userName={
            user.name || (user.role === 'Executivo de Contas' ? 'Executivo de Contas' : 'Consultor')
          }
          userGamification={currentUserGamification}
          onRefresh={loadAllData}
          userRole={user.role}
        />
      )}
      {/* 2. RECONHECIMENTO SOCIAL (Colaborador do Mês e Evolução Notável) */}
      <SocialRecognitionBanner awards={awards} />

      {/* 3. RANKINGS EM 3 NÍVEIS COM ABAS */}
      <div className="space-y-4">
        <div className="flex flex-col md:flex-row md:items-center justify-between gap-3">
          <Tabs
            value={activeTab}
            onValueChange={(val: any) => setActiveTab(val)}
            className="w-full md:w-auto"
          >
            <TabsList className="grid grid-cols-4 w-full md:w-auto bg-slate-200/70 p-1">
              <TabsTrigger value="geral" className="text-xs font-semibold gap-1.5">
                <Globe className="h-3.5 w-3.5" /> Geral
              </TabsTrigger>
              <TabsTrigger value="nacional" className="text-xs font-semibold gap-1.5">
                <MapPin className="h-3.5 w-3.5" /> Nacional
              </TabsTrigger>
              <TabsTrigger value="internacional" className="text-xs font-semibold gap-1.5">
                <Globe className="h-3.5 w-3.5" /> Internacional
              </TabsTrigger>
              <TabsTrigger value="base" className="text-xs font-semibold gap-1.5">
                <Layers className="h-3.5 w-3.5" /> Por Base
              </TabsTrigger>
            </TabsList>
          </Tabs>

          {activeTab === 'base' && (
            <div className="flex items-center gap-2">
              <span className="text-xs font-medium text-slate-600">Selecione o Grupo/Base:</span>
              <Select value={selectedBase} onValueChange={setSelectedBase}>
                <SelectTrigger className="w-[180px] h-8 text-xs bg-white">
                  <SelectValue />
                </SelectTrigger>
                <SelectContent>
                  {SERVICE_GROUP_OPTIONS.map((g) => (
                    <SelectItem key={g.value} value={g.value} className="text-xs">
                      {g.label}
                    </SelectItem>
                  ))}
                </SelectContent>
              </Select>
            </div>
          )}
        </div>

        {/* PÓDIO TOP 3 */}
        <RankingPodium topUsers={podiumUsers} />

        {/* TABELA COMPLETA DO RANKING */}
        <div className="space-y-2">
          <div className="flex items-center justify-between">
            <h4 className="text-sm font-bold text-slate-900 flex items-center gap-2">
              <Medal className="h-4 w-4 text-indigo-600" />
              Classificação Completa ({filteredRanking.length} participantes)
            </h4>
          </div>

          <RankingTable entries={filteredRanking} currentUserId={user?.id} />
        </div>
      </div>

      {/* 4. GALERIA DE BADGES E REGRAS DE NÍVEIS */}
      <div className="grid grid-cols-1 gap-6">
        <BadgesShowcase
          unlockedBadgeKeys={
            user && (user.role === 'Consultor' || user.role === 'Executivo de Contas')
              ? currentUserGamification?.badges || []
              : allRankingEntries.length > 0
                ? allRankingEntries[0]?.badges || []
                : currentUserGamification?.badges || []
          }
          userName={user?.name || ''}
          onBadgeClick={handleBadgeClick}
        />
      </div>
      {/* 5. FEED DE CONQUISTAS E REGRAS DE PONTUAÇÃO */}
      <div className="grid grid-cols-1 lg:grid-cols-3 gap-6">
        <div className="lg:col-span-2">
          <AchievementFeed />
        </div>

        {/* Guia de Pontuação XP & Níveis */}
        <Card className="border-slate-200 shadow-subtle bg-white">
          <CardHeader className="pb-3 border-b border-slate-100">
            <CardTitle className="text-sm font-bold text-slate-900 flex items-center justify-between">
              <span className="flex items-center gap-2">
                <HelpCircle className="h-4 w-4 text-indigo-600" />
                Como Ganhar XP & Subir de Nível
              </span>
              <Badge variant="outline" className="text-[10px]">
                {rankingCategory === 'executives' ? 'Executivos de Contas' : 'Consultores'}
              </Badge>
            </CardTitle>
          </CardHeader>
          <CardContent className="p-4 space-y-4 text-xs">
            {rankingCategory === 'executives' ? (
              <div className="space-y-1.5">
                <p className="font-bold text-emerald-800">Métricas de Progresso do Cliente:</p>
                <ul className="space-y-1 text-slate-600">
                  <li className="flex justify-between">
                    <span>Cliente com Autonomia &gt; 80%</span>
                    <strong className="text-emerald-600">+40 XP</strong>
                  </li>
                  <li className="flex justify-between">
                    <span>Cliente Blindado (100% Autonomia)</span>
                    <strong className="text-indigo-600">+60 XP</strong>
                  </li>
                  <li className="flex justify-between">
                    <span>Melhora de Autonomia mês a mês</span>
                    <strong className="text-purple-600">+50 XP</strong>
                  </li>
                  <li className="flex justify-between">
                    <span>Treinamento realizado para agência</span>
                    <strong className="text-cyan-600">+30 XP</strong>
                  </li>
                  <li className="flex justify-between">
                    <span>Satisfação positiva na carteira</span>
                    <strong className="text-amber-600">+10 XP</strong>
                  </li>
                  <li className="flex justify-between">
                    <span>Autonomia média da carteira</span>
                    <strong className="text-emerald-700">Até +200 XP</strong>
                  </li>
                </ul>
              </div>
            ) : (
              <div className="space-y-1.5">
                <p className="font-bold text-slate-800">Sistema de Pontos (Atendimento):</p>
                <ul className="space-y-1 text-slate-600">
                  <li className="flex justify-between">
                    <span>Atendimento concluído</span>
                    <strong className="text-indigo-600">+10 XP</strong>
                  </li>
                  <li className="flex justify-between">
                    <span>Concluído dentro do TMA</span>
                    <strong className="text-emerald-600">+5 XP bônus</strong>
                  </li>
                  <li className="flex justify-between">
                    <span>Contato evitável identificado</span>
                    <strong className="text-purple-600">+3 XP</strong>
                  </li>
                  <li className="flex justify-between">
                    <span>Categorização IA validada</span>
                    <strong className="text-cyan-600">+2 XP</strong>
                  </li>
                  <li className="flex justify-between">
                    <span>Sentimento positivo detectado</span>
                    <strong className="text-amber-600">+5 XP</strong>
                  </li>
                  <li className="flex justify-between">
                    <span>Resolver atendimento reaberto</span>
                    <strong className="text-rose-600">+15 XP</strong>
                  </li>
                  <li className="flex justify-between">
                    <span>Meta diária batida</span>
                    <strong className="text-indigo-700">+20 XP bônus</strong>
                  </li>
                  <li className="flex justify-between">
                    <span>Sequência de metas</span>
                    <strong className="text-amber-700">Multiplicador ×1.1...×2.0</strong>
                  </li>
                </ul>
              </div>
            )}

            <div className="space-y-1.5 pt-2 border-t border-slate-100">
              <p className="font-bold text-slate-800">Níveis de Evolução:</p>
              <div className="grid grid-cols-2 gap-1.5">
                {LEVELS.map((lvl) => (
                  <div
                    key={lvl.name}
                    className={`p-2 rounded-lg border text-[11px] ${lvl.bgBadge} ${lvl.borderBadge}`}
                  >
                    <p className={`font-bold ${lvl.textColor}`}>
                      {lvl.icon} {lvl.name}
                    </p>
                    <p className="text-[10px] text-slate-500">
                      {lvl.maxXp === Infinity ? `${lvl.minXp}+ XP` : `${lvl.minXp}–${lvl.maxXp} XP`}
                    </p>
                  </div>
                ))}
              </div>
            </div>
          </CardContent>
        </Card>
      </div>

      {/* Modal Festivo de Desbloqueio de Badge */}
      <BadgeUnlockModal
        badge={celebrationBadge}
        open={celebrationOpen}
        onClose={() => setCelebrationOpen(false)}
      />
    </div>
  )
}
