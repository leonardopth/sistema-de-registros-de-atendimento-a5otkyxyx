import { useState, useEffect, useMemo, useCallback } from 'react'
import { useSearchParams } from 'react-router-dom'
import { useAuth } from '@/hooks/use-auth'
import { Card, CardContent } from '@/components/ui/card'
import { Tabs, TabsList, TabsTrigger, TabsContent } from '@/components/ui/tabs'
import { Button } from '@/components/ui/button'
import { Badge } from '@/components/ui/badge'
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
import { getAbsenceAlertConfig, getHourBankEntries, getAbsences } from '@/services/banco-ferias'
import { getUsers } from '@/services/users'
import { getServiceRecords } from '@/services/service_records'
import { AbsenceCalendar } from '@/components/AbsenceCalendar'
import { TeamManagementView } from '@/components/TeamManagementView'
import { MySituationView } from '@/components/MySituationView'
import { AbsenceAlertSettings } from '@/components/AbsenceAlertSettings'
import { LgIntegrationCard } from '@/components/LgIntegrationCard'
import { NewAbsenceModal } from '@/components/NewAbsenceModal'
import { NewHourBankModal } from '@/components/NewHourBankModal'
import { isManagerRole } from '@/services/clt-validation'
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

  const loadData = useCallback(async () => {
    try {
      setLoading(true)
      const [uRes, eRes, aRes, cfgRes, sRes] = await Promise.all([
        getUsers(),
        getHourBankEntries(),
        getAbsences('', '-start_date'),
        getAbsenceAlertConfig(),
        getServiceRecords('-created'),
      ])

      setUsers(uRes || [])
      setEntries(eRes || [])
      setAbsences(aRes || [])
      setConfig(cfgRes)
      setServiceRecords(sRes || [])
    } catch (err) {
      console.error('Erro ao carregar dados do módulo Banco de Horas & Férias:', err)
      toast({
        variant: 'destructive',
        title: 'Erro ao carregar dados',
        description: 'Não foi possível carregar os dados de banco de horas e ausências.',
      })
    } finally {
      setLoading(false)
    }
  }, [])

  useEffect(() => {
    loadData()
  }, [loadData])

  // Realtime updates
  useRealtime('hour_bank_entries', () => loadData(), true)
  useRealtime('absences', () => loadData(), true)
  useRealtime('absence_alert_configs', () => loadData(), true)

  const handleTabChange = (newTab: string) => {
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
    <div className="space-y-6">
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

          {canManage && (
            <Button
              size="sm"
              onClick={() => handleOpenNewAbsence()}
              className="text-xs h-8 bg-indigo-600 hover:bg-indigo-700 text-white gap-1.5"
            >
              <PlusCircle className="h-3.5 w-3.5" />
              Agendar Ausência
            </Button>
          )}
        </div>
      </div>

      {/* Navegação por Abas Principais */}
      <Tabs value={activeTab} onValueChange={handleTabChange} className="space-y-4">
        <TabsList className="bg-slate-100 p-1 border border-slate-200 flex flex-wrap h-auto gap-1">
          <TabsTrigger
            value="calendario"
            className="text-xs data-[state=active]:bg-white data-[state=active]:text-indigo-600 data-[state=active]:shadow-sm gap-1.5"
          >
            <CalendarDays className="h-3.5 w-3.5" />
            Calendário de Ausências
          </TabsTrigger>

          <TabsTrigger
            value="minha-situacao"
            className="text-xs data-[state=active]:bg-white data-[state=active]:text-indigo-600 data-[state=active]:shadow-sm gap-1.5"
          >
            <Clock className="h-3.5 w-3.5" />
            Minha Situação
          </TabsTrigger>

          {canManage && (
            <TabsTrigger
              value="equipe"
              className="text-xs data-[state=active]:bg-white data-[state=active]:text-indigo-600 data-[state=active]:shadow-sm gap-1.5"
            >
              <Users2 className="h-3.5 w-3.5" />
              Gestão da Equipe &amp; CLT
            </TabsTrigger>
          )}

          <TabsTrigger
            value="configuracoes"
            className="text-xs data-[state=active]:bg-white data-[state=active]:text-indigo-600 data-[state=active]:shadow-sm gap-1.5"
          >
            <SlidersHorizontal className="h-3.5 w-3.5" />
            Parâmetros &amp; Alertas
          </TabsTrigger>

          <TabsTrigger
            value="integracao-lg"
            className="text-xs data-[state=active]:bg-white data-[state=active]:text-indigo-600 data-[state=active]:shadow-sm gap-1.5"
          >
            <Building2 className="h-3.5 w-3.5" />
            RH LG Lugar de Gente
          </TabsTrigger>
        </TabsList>

        {/* 1. Calendário de Ausências */}
        <TabsContent value="calendario" className="space-y-4 m-0">
          <AbsenceCalendar
            users={users}
            absences={absences}
            currentUser={user}
            onNewAbsence={(date) => handleOpenNewAbsence(date)}
            canManage={canManage}
          />
        </TabsContent>

        {/* 2. Minha Situação */}
        <TabsContent value="minha-situacao" className="space-y-4 m-0">
          {user && config ? (
            <MySituationView
              currentUser={user}
              entries={entries}
              absences={absences}
              config={config}
            />
          ) : (
            <div className="py-12 text-center text-xs text-slate-400">Carregando dados...</div>
          )}
        </TabsContent>

        {/* 3. Gestão da Equipe & Validações Trabalhistas */}
        {canManage && (
          <TabsContent value="equipe" className="space-y-4 m-0">
            {config ? (
              <TeamManagementView
                users={users}
                entries={entries}
                absences={absences}
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
          </TabsContent>
        )}

        {/* 4. Parâmetros de Alertas (Editável por Gestores) */}
        <TabsContent value="configuracoes" className="space-y-4 m-0">
          {config ? (
            <AbsenceAlertSettings config={config} canEdit={canManage} onSaved={loadData} />
          ) : (
            <div className="py-12 text-center text-xs text-slate-400">
              Carregando configurações...
            </div>
          )}
        </TabsContent>

        {/* 5. Integração com RH LG Lugar de Gente */}
        <TabsContent value="integracao-lg" className="space-y-4 m-0">
          <LgIntegrationCard users={users} />
        </TabsContent>
      </Tabs>

      {/* Modal de Agendamento de Ausência */}
      {config && (
        <NewAbsenceModal
          open={isNewAbsenceOpen}
          onOpenChange={setIsNewAbsenceOpen}
          users={users}
          allAbsences={absences}
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
        users={users}
        prefilledUserId={prefilledHourBankUser}
        onSaved={loadData}
      />
    </div>
  )
}
