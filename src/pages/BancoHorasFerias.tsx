import { useState, useEffect, useMemo, useCallback } from 'react'
import { useSearchParams } from 'react-router-dom'
import { useAuth } from '@/hooks/use-auth'
import { Card, CardContent } from '@/components/ui/card'
import { Tabs, TabsList, TabsTrigger, TabsContent } from '@/components/ui/tabs'
import { Button } from '@/components/ui/button'
import { Badge } from '@/components/ui/badge'
import { ErrorBoundary } from '@/components/ErrorBoundary'
import {
  CalendarDays,
  Clock,
  Users2,
  SlidersHorizontal,
  Building2,
  PlusCircle,
  AlertTriangle,
  RefreshCw,
  Scale,
  CalendarCheck2,
} from 'lucide-react'
import { UserRecord, ServiceRecord } from '@/types/service_record'
import { HourBankEntryRecord, AbsenceRecord, AbsenceAlertConfigRecord } from '@/types/banco-ferias'
import {
  DEFAULT_ABSENCE_ALERT_CONFIG,
  getAbsenceAlertConfig,
  getHourBankEntries,
  getHourBankEntriesByUser,
  getAbsences,
  getAbsencesByUser,
} from '@/services/banco-ferias'
import { getUsers } from '@/services/users'
import { getServiceRecords } from '@/services/service_records'
import { AbsenceCalendar } from '@/components/AbsenceCalendar'
import { TeamManagementView } from '@/components/TeamManagementView'
import { MySituationView } from '@/components/MySituationView'
import { AbsenceAlertSettings } from '@/components/AbsenceAlertSettings'
import { AbsenceApprovalsView } from '@/components/AbsenceApprovalsView'
import { CollaboratorStatusPanel } from '@/components/CollaboratorStatusPanel'
import { LgIntegrationCard } from '@/components/LgIntegrationCard'
import { NewAbsenceModal } from '@/components/NewAbsenceModal'
import { NewHourBankModal } from '@/components/NewHourBankModal'
import { isManagerRole } from '@/services/clt-validation'
import { getAccessibleUsersInBancoHoras } from '@/lib/service-group-access'
import { useRealtime } from '@/hooks/use-realtime'
import { toast } from '@/hooks/use-toast'

export function BancoHorasFerias() {
  const { user } = useAuth()
  const [searchParams, setSearchParams] = useSearchParams()

  const initialTab = searchParams.get('tab') || 'calendario'
  const [activeTab, setActiveTab] = useState<string>(initialTab)

  const [loading, setLoading] = useState(true)
  const [users, setUsers] = useState<UserRecord[]>([])
  const [entries, setEntries] = useState<HourBankEntryRecord[]>([])
  const [absences, setAbsences] = useState<AbsenceRecord[]>([])
  const [serviceRecords, setServiceRecords] = useState<ServiceRecord[]>([])
  const [config, setConfig] = useState<AbsenceAlertConfigRecord | null>(null)

  // Modais de cadastro
  const [isNewAbsenceOpen, setIsNewAbsenceOpen] = useState(false)
  const [prefilledAbsenceDate, setPrefilledAbsenceDate] = useState<string | undefined>()
  const [prefilledAbsenceUser, setPrefilledAbsenceUser] = useState<string | undefined>()

  const [isNewHourBankOpen, setIsNewHourBankOpen] = useState(false)
  const [prefilledHourBankUser, setPrefilledHourBankUser] = useState<string | undefined>()

  const isMaster = user?.role === 'Master' || user?.master_access === true
  const isManager = isManagerRole(user?.role) || isMaster
  const canManage = isManager // Gestores e líderes podem gerenciar a equipe

  // Líderes (operacional e comercial) e administradores (Master)
  const isLeaderOrAdmin = useMemo(() => {
    if (!user) return false
    if (isMaster) return true
    const role = user.role
    return (
      role === 'Líder' || role === 'Líderes' || role === 'Gestor Comercial' || role === 'Gerente'
    )
  }, [user, isMaster])

  // Lista restrita de colaboradores acessíveis conforme a hierarquia do usuário logado:
  // - Master: todos os usuários
  // - Gerente sem grupo específico: todos os usuários
  // - Supervisor / Líder / Gerente com grupo: usuários que compartilham ao menos um service_group com o logado (match EXATO),
  //   ou cujo supervisor_id seja o ID do logado + o próprio logado
  // - Consultor / outros: apenas ele mesmo
  const accessibleUsers = useMemo(() => {
    if (!user) return []
    if (isMaster) return users
    return getAccessibleUsersInBancoHoras(users, user)
  }, [users, user, isMaster])

  const accessibleUserIds = useMemo(() => {
    return new Set(accessibleUsers.map((u) => u.id))
  }, [accessibleUsers])

  // Filtra ausências e lançamentos em memória para garantir rigor mesmo antes do hook ou em cache local
  const scopedAbsences = useMemo(() => {
    if (isMaster) return absences
    return absences.filter((a) => accessibleUserIds.has(a.user_id))
  }, [absences, accessibleUserIds, isMaster])

  const scopedEntries = useMemo(() => {
    if (isMaster) return entries
    return entries.filter((e) => accessibleUserIds.has(e.user_id))
  }, [entries, accessibleUserIds, isMaster])

  // Contagem de solicitações pendentes no escopo para badge visual
  const pendingApprovalsCount = useMemo(() => {
    if (!canManage) return 0
    return scopedAbsences.filter((a) => a.status === 'Pendente').length
  }, [scopedAbsences, canManage])

  const loadData = useCallback(async () => {
    try {
      setLoading(true)
      const isConsultor = user?.role === 'Consultor'

      if (isConsultor && user?.id) {
        // Consultor: carrega apenas os próprios dados, sem chamar getServiceRecords nem tentar criar config de alerta
        const [eRes, aRes] = await Promise.allSettled([
          getHourBankEntriesByUser(user.id),
          getAbsencesByUser(user.id),
        ])

        setUsers([user as UserRecord])
        setEntries(eRes.status === 'fulfilled' ? eRes.value : [])
        setAbsences(aRes.status === 'fulfilled' ? aRes.value : [])
        setConfig({
          id: 'default',
          ...DEFAULT_ABSENCE_ALERT_CONFIG,
          created: new Date().toISOString(),
          updated: new Date().toISOString(),
        })
        setServiceRecords([])
      } else {
        // Master / Gestores / Líderes: busca coleções completas com Promise.allSettled para tolerância a falhas
        const [uRes, eRes, aRes, cfgRes, sRes] = await Promise.allSettled([
          getUsers(),
          getHourBankEntries(),
          getAbsences('', '-start_date'),
          getAbsenceAlertConfig(),
          getServiceRecords('-created'),
        ])

        if (uRes.status === 'fulfilled') {
          setUsers(uRes.value || [])
        } else if (user) {
          setUsers([user as UserRecord])
        }

        setEntries(eRes.status === 'fulfilled' ? eRes.value || [] : [])
        setAbsences(aRes.status === 'fulfilled' ? aRes.value || [] : [])

        if (cfgRes.status === 'fulfilled' && cfgRes.value) {
          setConfig(cfgRes.value)
        } else {
          setConfig({
            id: 'default',
            ...DEFAULT_ABSENCE_ALERT_CONFIG,
            created: new Date().toISOString(),
            updated: new Date().toISOString(),
          })
        }

        setServiceRecords(sRes.status === 'fulfilled' ? sRes.value || [] : [])
      }
    } catch (err) {
      console.error('Erro ao carregar dados do módulo Banco de Horas & Férias:', err)
      toast({
        variant: 'destructive',
        title: 'Aviso ao carregar dados',
        description: 'Alguns dados podem estar parcialmente indisponíveis.',
      })
    } finally {
      setLoading(false)
    }
  }, [user])

  useEffect(() => {
    loadData()
  }, [loadData])

  // Realtime updates
  useRealtime('hour_bank_entries', () => loadData(), true)
  useRealtime('absences', () => loadData(), true)
  useRealtime('absence_alert_configs', () => loadData(), true)

  // Redireciona para 'calendario' se o usuário tentar acessar abas restritas sem permissão
  useEffect(() => {
    const requestedTab = searchParams.get('tab')
    if (
      (requestedTab === 'configuracoes' || requestedTab === 'integracao-lg') &&
      !isLeaderOrAdmin
    ) {
      const nextParams = new URLSearchParams(searchParams)
      nextParams.set('tab', 'calendario')
      setSearchParams(nextParams, { replace: true })
      setActiveTab('calendario')
    }
  }, [searchParams, isLeaderOrAdmin, setSearchParams])

  const handleTabChange = (newTab: string) => {
    if ((newTab === 'configuracoes' || newTab === 'integracao-lg') && !isLeaderOrAdmin) {
      toast({
        variant: 'destructive',
        title: 'Acesso restrito',
        description:
          'Esta área é exclusiva para líderes (operacional e comercial) e administradores.',
      })
      return
    }
    setActiveTab(newTab)
    const currentParams = new URLSearchParams(searchParams)
    currentParams.set('tab', newTab)
    setSearchParams(currentParams)
  }

  const handleOpenNewAbsence = (date?: string, userId?: string) => {
    setPrefilledAbsenceDate(date)
    setPrefilledAbsenceUser(userId)
    setIsNewAbsenceOpen(true)
  }

  const handleOpenNewHourBank = (userId?: string) => {
    setPrefilledHourBankUser(userId)
    setIsNewHourBankOpen(true)
  }

  return (
    <div className="space-y-6 min-w-0 max-w-full">
      {/* Cabeçalho da Página */}
      <div className="flex flex-col sm:flex-row sm:items-center sm:justify-between gap-4">
        <div>
          <div className="flex items-center gap-2.5">
            <h1 className="text-xl font-bold tracking-tight text-slate-900">
              Banco de Horas &amp; Férias
            </h1>
            <Badge className="bg-indigo-100 text-indigo-800 border-indigo-200 text-xs font-semibold">
              Gestão de Ausências &amp; CLT
            </Badge>
          </div>
          <p className="text-xs text-slate-500 mt-1">
            Calendário compartilhado de ausências, validação de limites de acúmulo de horas,
            interjornada (11h), descanso semanal (DSR) e períodos de férias.
          </p>
        </div>

        <div className="flex items-center gap-2">
          <Button
            variant="outline"
            size="sm"
            onClick={loadData}
            disabled={loading}
            className="text-xs h-8 gap-1.5"
          >
            <RefreshCw className={`h-3.5 w-3.5 ${loading ? 'animate-spin' : ''}`} />
            Atualizar
          </Button>

          {/* Botão de Ausência / Férias:
              - Para Gestores/Líderes/Master: "Agendar Ausência" (pode agendar para a equipe ou auto-aprovar)
              - Para Consultores/Colaboradores: "Solicitar Ausência / Férias" (abre modal para enviar solicitação ao gestor)
          */}
          {canManage ? (
            <Button
              size="sm"
              onClick={() => handleOpenNewAbsence()}
              className="text-xs h-8 bg-indigo-600 hover:bg-indigo-700 text-white gap-1.5"
            >
              <PlusCircle className="h-3.5 w-3.5" />
              Agendar Ausência
            </Button>
          ) : (
            <Button
              size="sm"
              onClick={() => handleOpenNewAbsence(undefined, user?.id)}
              className="text-xs h-8 bg-indigo-600 hover:bg-indigo-700 text-white gap-1.5"
            >
              <PlusCircle className="h-3.5 w-3.5" />
              Solicitar Ausência / Férias
            </Button>
          )}
        </div>
      </div>

      {/* Navegação por Abas Principais */}
      <Tabs value={activeTab} onValueChange={handleTabChange} className="space-y-4 w-full min-w-0">
        <TabsList className="bg-slate-100 p-1 border border-slate-200 flex flex-wrap h-auto gap-1 w-full justify-start max-w-full overflow-x-auto">
          <TabsTrigger
            value="calendario"
            className="text-xs data-[state=active]:bg-white data-[state=active]:text-indigo-600 data-[state=active]:shadow-sm gap-1.5 shrink-0"
          >
            <CalendarDays className="h-3.5 w-3.5" />
            Calendário de Ausências
          </TabsTrigger>

          <TabsTrigger
            value="minha-situacao"
            className="text-xs data-[state=active]:bg-white data-[state=active]:text-indigo-600 data-[state=active]:shadow-sm gap-1.5 shrink-0"
          >
            <Clock className="h-3.5 w-3.5" />
            Minha Situação
          </TabsTrigger>

          {canManage && (
            <TabsTrigger
              value="aprovacoes"
              className="text-xs data-[state=active]:bg-white data-[state=active]:text-indigo-600 data-[state=active]:shadow-sm gap-1.5 shrink-0 relative"
            >
              <CalendarCheck2 className="h-3.5 w-3.5" />
              Aprovações
              {pendingApprovalsCount > 0 && (
                <span className="ml-1 inline-flex items-center justify-center px-1.5 py-0.5 text-[10px] font-bold leading-none text-white bg-amber-600 rounded-full">
                  {pendingApprovalsCount}
                </span>
              )}
            </TabsTrigger>
          )}

          {canManage && (
            <TabsTrigger
              value="equipe"
              className="text-xs data-[state=active]:bg-white data-[state=active]:text-indigo-600 data-[state=active]:shadow-sm gap-1.5 shrink-0"
            >
              <Users2 className="h-3.5 w-3.5" />
              Gestão da Equipe & CLT
            </TabsTrigger>
          )}

          {canManage && (
            <TabsTrigger
              value="status-operacional"
              className="text-xs data-[state=active]:bg-white data-[state=active]:text-indigo-600 data-[state=active]:shadow-sm gap-1.5 shrink-0"
            >
              <Clock className="h-3.5 w-3.5" />
              Status & Pausas em Tempo Real
            </TabsTrigger>
          )}

          {isLeaderOrAdmin && (
            <TabsTrigger
              value="configuracoes"
              className="text-xs data-[state=active]:bg-white data-[state=active]:text-indigo-600 data-[state=active]:shadow-sm gap-1.5 shrink-0"
            >
              <SlidersHorizontal className="h-3.5 w-3.5" />
              Parâmetros & Alertas
            </TabsTrigger>
          )}

          {isLeaderOrAdmin && (
            <TabsTrigger
              value="integracao-lg"
              className="text-xs data-[state=active]:bg-white data-[state=active]:text-indigo-600 data-[state=active]:shadow-sm gap-1.5 shrink-0"
            >
              <Building2 className="h-3.5 w-3.5" />
              RH LG Lugar de Gente
            </TabsTrigger>
          )}
        </TabsList>

        {/* 1. Calendário de Ausências */}
        <TabsContent
          value="calendario"
          className="space-y-4 m-0 min-w-0 w-full focus-visible:outline-none focus-visible:ring-0"
        >
          <ErrorBoundary>
            <AbsenceCalendar
              users={accessibleUsers}
              absences={scopedAbsences}
              currentUser={user}
              onNewAbsence={(date) => handleOpenNewAbsence(date)}
              canManage={canManage}
            />
          </ErrorBoundary>
        </TabsContent>

        {/* 2. Minha Situação */}
        <TabsContent
          value="minha-situacao"
          className="space-y-4 m-0 min-w-0 w-full focus-visible:outline-none focus-visible:ring-0"
        >
          <ErrorBoundary>
            {user && config ? (
              <MySituationView
                currentUser={user}
                entries={scopedEntries}
                absences={scopedAbsences}
                config={config}
                onNewAbsence={() => handleOpenNewAbsence(undefined, user.id)}
                onRefresh={loadData}
              />
            ) : (
              <div className="py-12 text-center text-xs text-slate-400">Carregando dados...</div>
            )}
          </ErrorBoundary>
        </TabsContent>

        {/* 3. Central de Aprovações (Visível para Gestores / Líderes / Master) */}
        {canManage && (
          <TabsContent
            value="aprovacoes"
            className="space-y-4 m-0 min-w-0 w-full focus-visible:outline-none focus-visible:ring-0"
          >
            <ErrorBoundary>
              {user && config ? (
                <AbsenceApprovalsView
                  currentUser={user}
                  users={accessibleUsers}
                  absences={scopedAbsences}
                  config={config}
                  onRefresh={loadData}
                />
              ) : (
                <div className="py-12 text-center text-xs text-slate-400">Carregando...</div>
              )}
            </ErrorBoundary>
          </TabsContent>
        )}

        {/* 4. Gestão da Equipe & Validações Trabalhistas */}
        {canManage && (
          <TabsContent
            value="equipe"
            className="space-y-4 m-0 min-w-0 w-full focus-visible:outline-none focus-visible:ring-0"
          >
            <ErrorBoundary>
              {config ? (
                <TeamManagementView
                  users={accessibleUsers}
                  entries={scopedEntries}
                  absences={scopedAbsences}
                  serviceRecords={serviceRecords}
                  config={config}
                  canManage={canManage}
                  onNewHourBank={(userId) => handleOpenNewHourBank(userId)}
                  onNewAbsence={(userId) => handleOpenNewAbsence(undefined, userId)}
                  onRefresh={loadData}
                />
              ) : (
                <div className="py-12 text-center text-xs text-slate-400">Carregando...</div>
              )}
            </ErrorBoundary>
          </TabsContent>
        )}

        {/* 5. Status Operacional de Pausas (Visão de Liderança) */}
        {canManage && (
          <TabsContent
            value="status-operacional"
            className="space-y-4 m-0 min-w-0 w-full focus-visible:outline-none focus-visible:ring-0"
          >
            <ErrorBoundary>
              <CollaboratorStatusPanel />
            </ErrorBoundary>
          </TabsContent>
        )}

        {/* 5. Parâmetros de Alertas (Exclusivo para Líderes e Master) */}
        {isLeaderOrAdmin && (
          <TabsContent
            value="configuracoes"
            className="space-y-4 m-0 min-w-0 w-full focus-visible:outline-none focus-visible:ring-0"
          >
            <ErrorBoundary>
              {config ? (
                <AbsenceAlertSettings
                  config={config}
                  canEdit={isLeaderOrAdmin}
                  onSaved={loadData}
                />
              ) : (
                <div className="py-12 text-center text-xs text-slate-400">
                  Carregando configurações...
                </div>
              )}
            </ErrorBoundary>
          </TabsContent>
        )}

        {/* 6. Integração com RH LG Lugar de Gente (Exclusivo para Líderes e Master) */}
        {isLeaderOrAdmin && (
          <TabsContent
            value="integracao-lg"
            className="space-y-4 m-0 min-w-0 w-full focus-visible:outline-none focus-visible:ring-0"
          >
            <ErrorBoundary>
              <LgIntegrationCard users={accessibleUsers} />
            </ErrorBoundary>
          </TabsContent>
        )}
      </Tabs>
      {/* Modal de Agendamento / Solicitação de Ausência */}
      {config && (
        <NewAbsenceModal
          open={isNewAbsenceOpen}
          onOpenChange={setIsNewAbsenceOpen}
          users={accessibleUsers.length > 0 ? accessibleUsers : user ? [user as UserRecord] : []}
          allAbsences={scopedAbsences}
          config={config}
          prefilledDate={prefilledAbsenceDate}
          prefilledUserId={prefilledAbsenceUser}
          onSaved={loadData}
        />
      )}
      {/* Modal de Lançamento de Banco de Horas */}
      <NewHourBankModal
        open={isNewHourBankOpen}
        onOpenChange={setIsNewHourBankOpen}
        users={accessibleUsers}
        prefilledUserId={prefilledHourBankUser}
        onSaved={loadData}
      />
    </div>
  )
}
