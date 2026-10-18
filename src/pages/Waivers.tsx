import React, { useState, useEffect, useMemo } from 'react'
import {
  FileCheck2,
  Plus,
  Search,
  Filter,
  SlidersHorizontal,
  RefreshCw,
  Clock,
  CheckCircle2,
  XCircle,
  HelpCircle,
  Plane,
  Building,
  Calendar,
  User,
  DollarSign,
  TrendingUp,
  AlertCircle,
  ShieldCheck,
  ChevronRight,
  Sparkles,
} from 'lucide-react'
import { Button } from '@/components/ui/button'
import { Input } from '@/components/ui/input'
import { Badge } from '@/components/ui/badge'
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card'
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from '@/components/ui/select'
import { Tabs, TabsList, TabsTrigger, TabsContent } from '@/components/ui/tabs'
import { useAuth } from '@/hooks/use-auth'
import { useRealtime } from '@/hooks/use-realtime'
import { useToast } from '@/hooks/use-toast'
import { isMasterUser, isManagerUser } from '@/lib/service-group-access'
import type { WaiverRequestRecord, WaiverConfigRecord, WaiverStatus } from '@/types/waiver'
import { getWaiverRequests, getWaiverConfig } from '@/services/waivers'
import { NewWaiverWizardModal } from '@/components/NewWaiverWizardModal'
import { WaiverDetailModal } from '@/components/WaiverDetailModal'
import { WaiverSettingsModal } from '@/components/WaiverSettingsModal'
import { AIRLINE_CONFIGS } from '@/constants/waivers'
import { cn } from '@/lib/utils'

export default function Waivers() {
  const { user } = useAuth()
  const { toast } = useToast()

  const [requests, setRequests] = useState<WaiverRequestRecord[]>([])
  const [config, setConfig] = useState<WaiverConfigRecord | null>(null)
  const [loading, setLoading] = useState(true)

  // Filtros de listagem
  const [searchTerm, setSearchTerm] = useState('')
  const [statusFilter, setStatusFilter] = useState<string>('ALL')
  const [airlineFilter, setAirlineFilter] = useState<string>('ALL')
  const [unitFilter, setUnitFilter] = useState<string>('ALL')
  const [activeTab, setActiveTab] = useState<'queue' | 'my_requests' | 'metrics'>('queue')

  // Modais
  const [wizardOpen, setWizardOpen] = useState(false)
  const [settingsOpen, setSettingsOpen] = useState(false)
  const [selectedRequest, setSelectedRequest] = useState<WaiverRequestRecord | null>(null)
  const [detailOpen, setDetailOpen] = useState(false)

  // Permissões
  const isMaster = isMasterUser(user)
  const isManager = isManagerUser(user)
  const canManageWaivers = isMaster || isManager

  // Unidade padrão do usuário
  const userDefaultUnit = useMemo(() => {
    if (user?.service_groups && user.service_groups.length > 0) {
      return user.service_groups[0]
    }
    return 'Concierge'
  }, [user])

  // Carregamento de dados
  const loadData = async () => {
    setLoading(true)
    try {
      const [reqList, cfg] = await Promise.all([getWaiverRequests(), getWaiverConfig()])
      setRequests(reqList)
      setConfig(cfg)
    } catch (err) {
      console.error('Erro ao carregar waivers:', err)
      toast({
        title: 'Erro ao carregar dados',
        description: 'Não foi possível carregar as solicitações de Waivers.',
        variant: 'destructive',
      })
    } finally {
      setLoading(false)
    }
  }

  useEffect(() => {
    loadData()
  }, [])

  // Inscrição Realtime no PocketBase
  useRealtime('waiver_requests', () => loadData(), true)
  useRealtime('waiver_configs', () => loadData(), true)

  // Segregação de escopo:
  // - Master: vê tudo
  // - Gestor/Supervisor/Líder: vê solicitações do seu núcleo (se tiver service_groups) ou todas
  // - Consultor: vê as suas solicitações (requester === user.id)
  const scopedRequests = useMemo(() => {
    if (!user) return []
    if (isMaster) return requests

    if (isManager) {
      const userGroups = Array.isArray(user.service_groups) ? user.service_groups : []
      if (userGroups.length === 0) return requests
      return requests.filter((r) => userGroups.includes(r.unit as any) || r.requester === user.id)
    }

    // Consultor comum: vê apenas as suas
    return requests.filter((r) => r.requester === user.id)
  }, [requests, user, isMaster, isManager])

  // Filtragem local
  const filteredRequests = useMemo(() => {
    return scopedRequests.filter((r) => {
      // Aba "Minhas Solicitações"
      if (activeTab === 'my_requests' && user && r.requester !== user.id) {
        return false
      }

      // Status
      if (statusFilter !== 'ALL' && r.status !== statusFilter) {
        return false
      }

      // Companhia
      if (airlineFilter !== 'ALL' && r.airline_key !== airlineFilter) {
        return false
      }

      // Unidade
      if (unitFilter !== 'ALL' && r.unit !== unitFilter) {
        return false
      }

      // Busca textual
      if (searchTerm.trim()) {
        const term = searchTerm.toLowerCase()
        const matchesLoc = r.gds_locator?.toLowerCase().includes(term)
        const matchesAirLoc = r.airline_locator?.toLowerCase().includes(term)
        const matchesPax = r.pax_name?.toLowerCase().includes(term)
        const matchesApprover = r.approver_name?.toLowerCase().includes(term)
        const matchesRequester = r.expand?.requester?.name?.toLowerCase().includes(term)
        const matchesAirline = r.airline_name?.toLowerCase().includes(term)
        const matchesType = r.request_type?.toLowerCase().includes(term)

        if (
          !matchesLoc &&
          !matchesAirLoc &&
          !matchesPax &&
          !matchesApprover &&
          !matchesRequester &&
          !matchesAirline &&
          !matchesType
        ) {
          return false
        }
      }

      return true
    })
  }, [scopedRequests, activeTab, user, statusFilter, airlineFilter, unitFilter, searchTerm])

  // Métricas do Mês / Resumo
  const metrics = useMemo(() => {
    const total = scopedRequests.length
    const pendentes = scopedRequests.filter((r) => r.status === 'Pendente').length
    const emAnalise = scopedRequests.filter((r) => r.status === 'Em análise').length
    const aprovadas = scopedRequests.filter((r) => r.status === 'Aprovada').length
    const negociadas = scopedRequests.filter((r) => r.status === 'Negociada').length
    const recusadas = scopedRequests.filter((r) => r.status === 'Recusada').length

    // Agrupamento por Companhia
    const byAirline: Record<string, number> = {}
    // Agrupamento por Consultor
    const byConsultant: Record<string, { name: string; count: number; approved: number }> = {}

    scopedRequests.forEach((r) => {
      const airKey = r.airline_name || r.airline_key
      byAirline[airKey] = (byAirline[airKey] || 0) + 1

      const reqName = r.expand?.requester?.name || 'Não identificado'
      if (!byConsultant[reqName]) {
        byConsultant[reqName] = { name: reqName, count: 0, approved: 0 }
      }
      byConsultant[reqName].count += 1
      if (r.status === 'Aprovada' || r.status === 'Negociada') {
        byConsultant[reqName].approved += 1
      }
    })

    const topConsultants = Object.values(byConsultant)
      .sort((a, b) => b.count - a.count)
      .slice(0, 5)

    return {
      total,
      pendentes,
      emAnalise,
      aprovadas,
      negociadas,
      recusadas,
      byAirline,
      topConsultants,
    }
  }, [scopedRequests])

  const openDetails = (req: WaiverRequestRecord) => {
    setSelectedRequest(req)
    setDetailOpen(true)
  }

  const getStatusBadge = (status: WaiverStatus) => {
    switch (status) {
      case 'Pendente':
        return (
          <Badge
            variant="outline"
            className="bg-amber-50 text-amber-700 border-amber-300 font-semibold"
          >
            <Clock className="h-3 w-3 mr-1" /> Pendente
          </Badge>
        )
      case 'Em análise':
        return (
          <Badge
            variant="outline"
            className="bg-blue-50 text-blue-700 border-blue-300 font-semibold"
          >
            <Clock className="h-3 w-3 mr-1" /> Em análise
          </Badge>
        )
      case 'Aprovada':
        return (
          <Badge
            variant="outline"
            className="bg-emerald-50 text-emerald-700 border-emerald-300 font-semibold"
          >
            <CheckCircle2 className="h-3 w-3 mr-1" /> Aprovada
          </Badge>
        )
      case 'Negociada':
        return (
          <Badge
            variant="outline"
            className="bg-purple-50 text-purple-700 border-purple-300 font-semibold"
          >
            <ShieldCheck className="h-3 w-3 mr-1" /> Negociada
          </Badge>
        )
      case 'Recusada':
        return (
          <Badge variant="outline" className="bg-red-50 text-red-700 border-red-300 font-semibold">
            <XCircle className="h-3 w-3 mr-1" /> Recusada
          </Badge>
        )
    }
  }

  return (
    <div className="space-y-6">
      {/* Cabeçalho da Página */}
      <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-4 border-b border-slate-200 pb-5">
        <div>
          <div className="flex items-center gap-2">
            <div className="p-2 bg-indigo-600 rounded-lg text-white shadow-sm">
              <FileCheck2 className="h-6 w-6" />
            </div>
            <div>
              <div className="flex items-center gap-2">
                <h1 className="text-2xl font-black tracking-tight text-slate-900">
                  Waivers & Favors
                </h1>
                <Badge
                  variant="secondary"
                  className="bg-indigo-50 text-indigo-700 border-indigo-200 text-xs font-bold"
                >
                  HUB AI
                </Badge>
              </div>
              <p className="text-xs text-slate-500 mt-0.5">
                Central de solicitações de isenções de multa, quebras de regras tarifárias e apoios
                operacionais junto às companhias aéreas.
              </p>
            </div>
          </div>
        </div>

        <div className="flex items-center gap-2">
          {canManageWaivers && (
            <Button
              variant="outline"
              size="sm"
              onClick={() => setSettingsOpen(true)}
              className="border-slate-300 text-slate-700 hover:bg-slate-100"
            >
              <SlidersHorizontal className="h-4 w-4 mr-1.5 text-slate-500" />
              Parâmetros
            </Button>
          )}

          <Button
            variant="outline"
            size="sm"
            onClick={loadData}
            disabled={loading}
            className="border-slate-300 text-slate-700"
            title="Recarregar solicitações"
          >
            <RefreshCw className={cn('h-4 w-4', loading && 'animate-spin')} />
          </Button>

          <Button
            size="sm"
            onClick={() => setWizardOpen(true)}
            className="bg-indigo-600 hover:bg-indigo-700 text-white shadow-sm"
          >
            <Plus className="h-4 w-4 mr-1.5" />
            Nova Solicitação
          </Button>
        </div>
      </div>

      {/* Cards de Métricas / Resumo Rápido */}
      <div className="grid grid-cols-2 sm:grid-cols-3 lg:grid-cols-6 gap-3">
        <Card className="border-slate-200 shadow-sm bg-white">
          <CardContent className="p-3.5 space-y-1">
            <span className="text-[11px] font-semibold text-slate-500 uppercase tracking-tight">
              Total Solicitações
            </span>
            <div className="flex items-center justify-between">
              <span className="text-2xl font-black text-slate-900">{metrics.total}</span>
              <FileCheck2 className="h-4 w-4 text-slate-400" />
            </div>
          </CardContent>
        </Card>

        <Card className="border-amber-200 bg-amber-50/50 shadow-sm">
          <CardContent className="p-3.5 space-y-1">
            <span className="text-[11px] font-semibold text-amber-700 uppercase tracking-tight">
              Pendentes
            </span>
            <div className="flex items-center justify-between">
              <span className="text-2xl font-black text-amber-800">{metrics.pendentes}</span>
              <Clock className="h-4 w-4 text-amber-600" />
            </div>
          </CardContent>
        </Card>

        <Card className="border-blue-200 bg-blue-50/50 shadow-sm">
          <CardContent className="p-3.5 space-y-1">
            <span className="text-[11px] font-semibold text-blue-700 uppercase tracking-tight">
              Em Análise
            </span>
            <div className="flex items-center justify-between">
              <span className="text-2xl font-black text-blue-800">{metrics.emAnalise}</span>
              <Clock className="h-4 w-4 text-blue-600" />
            </div>
          </CardContent>
        </Card>

        <Card className="border-emerald-200 bg-emerald-50/50 shadow-sm">
          <CardContent className="p-3.5 space-y-1">
            <span className="text-[11px] font-semibold text-emerald-700 uppercase tracking-tight">
              Aprovadas
            </span>
            <div className="flex items-center justify-between">
              <span className="text-2xl font-black text-emerald-800">{metrics.aprovadas}</span>
              <CheckCircle2 className="h-4 w-4 text-emerald-600" />
            </div>
          </CardContent>
        </Card>

        <Card className="border-purple-200 bg-purple-50/50 shadow-sm">
          <CardContent className="p-3.5 space-y-1">
            <span className="text-[11px] font-semibold text-purple-700 uppercase tracking-tight">
              Negociadas
            </span>
            <div className="flex items-center justify-between">
              <span className="text-2xl font-black text-purple-800">{metrics.negociadas}</span>
              <ShieldCheck className="h-4 w-4 text-purple-600" />
            </div>
          </CardContent>
        </Card>

        <Card className="border-red-200 bg-red-50/50 shadow-sm">
          <CardContent className="p-3.5 space-y-1">
            <span className="text-[11px] font-semibold text-red-700 uppercase tracking-tight">
              Recusadas
            </span>
            <div className="flex items-center justify-between">
              <span className="text-2xl font-black text-red-800">{metrics.recusadas}</span>
              <XCircle className="h-4 w-4 text-red-600" />
            </div>
          </CardContent>
        </Card>
      </div>

      {/* Tabs Principais */}
      <Tabs
        value={activeTab}
        onValueChange={(val) => setActiveTab(val as any)}
        className="w-full space-y-4"
      >
        <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-3 border-b border-slate-200 pb-2">
          <TabsList className="bg-slate-100 p-1">
            <TabsTrigger value="queue" className="text-xs font-semibold">
              Fila de Solicitações ({scopedRequests.length})
            </TabsTrigger>
            <TabsTrigger value="my_requests" className="text-xs font-semibold">
              Minhas Solicitações ({scopedRequests.filter((r) => r.requester === user?.id).length})
            </TabsTrigger>
            <TabsTrigger value="metrics" className="text-xs font-semibold">
              <TrendingUp className="h-3.5 w-3.5 mr-1" /> Indicadores & Resumo
            </TabsTrigger>
          </TabsList>

          <span className="text-xs text-slate-500">
            Escopo:{' '}
            <strong className="text-slate-800">
              {isMaster
                ? 'Geral (Master - Todas as Unidades)'
                : isManager
                  ? `Núcleo ${user?.service_groups?.join(', ') || 'Geral'}`
                  : 'Individual (Seus Pedidos)'}
            </strong>
          </span>
        </div>

        {/* Conteúdo da Fila ou Minhas Solicitações */}
        {(activeTab === 'queue' || activeTab === 'my_requests') && (
          <div className="space-y-4">
            {/* Barra de Filtros */}
            <div className="bg-white p-4 rounded-xl border border-slate-200 shadow-sm space-y-3">
              <div className="grid grid-cols-1 sm:grid-cols-2 md:grid-cols-4 gap-3">
                {/* Busca */}
                <div className="relative">
                  <Search className="absolute left-2.5 top-2.5 h-4 w-4 text-slate-400" />
                  <Input
                    placeholder="Localizador, PAX, Solicitante..."
                    value={searchTerm}
                    onChange={(e) => setSearchTerm(e.target.value)}
                    className="pl-8 text-xs h-9"
                  />
                </div>

                {/* Filtro Status */}
                <Select value={statusFilter} onValueChange={setStatusFilter}>
                  <SelectTrigger className="text-xs h-9">
                    <SelectValue placeholder="Status" />
                  </SelectTrigger>
                  <SelectContent>
                    <SelectItem value="ALL">Todos os Status</SelectItem>
                    <SelectItem value="Pendente">Pendente</SelectItem>
                    <SelectItem value="Em análise">Em análise</SelectItem>
                    <SelectItem value="Aprovada">Aprovada</SelectItem>
                    <SelectItem value="Negociada">Negociada</SelectItem>
                    <SelectItem value="Recusada">Recusada</SelectItem>
                  </SelectContent>
                </Select>

                {/* Filtro Cia Aérea */}
                <Select value={airlineFilter} onValueChange={setAirlineFilter}>
                  <SelectTrigger className="text-xs h-9">
                    <SelectValue placeholder="Companhia Aérea" />
                  </SelectTrigger>
                  <SelectContent>
                    <SelectItem value="ALL">Todas as Companhias</SelectItem>
                    <SelectItem value="latam">LATAM — Isenções</SelectItem>
                    <SelectItem value="afkl">Air France / KLM</SelectItem>
                    <SelectItem value="assistencia">Assistência Aeroporto</SelectItem>
                  </SelectContent>
                </Select>

                {/* Filtro Unidade */}
                <Select value={unitFilter} onValueChange={setUnitFilter}>
                  <SelectTrigger className="text-xs h-9">
                    <SelectValue placeholder="Unidade / Núcleo" />
                  </SelectTrigger>
                  <SelectContent>
                    <SelectItem value="ALL">Todas as Unidades</SelectItem>
                    {(
                      config?.units || [
                        'Concierge',
                        'Exclusivo',
                        'LOT',
                        'BR1',
                        'BR2',
                        'SAO',
                        'SPI',
                        'SUL',
                      ]
                    ).map((u) => (
                      <SelectItem key={u} value={u}>
                        {u}
                      </SelectItem>
                    ))}
                  </SelectContent>
                </Select>
              </div>

              {(searchTerm ||
                statusFilter !== 'ALL' ||
                airlineFilter !== 'ALL' ||
                unitFilter !== 'ALL') && (
                <div className="flex items-center justify-between text-xs text-slate-500 pt-1 border-t border-slate-100">
                  <span>
                    Exibindo <strong>{filteredRequests.length}</strong> de {scopedRequests.length}{' '}
                    solicitações
                  </span>
                  <Button
                    variant="ghost"
                    size="sm"
                    className="h-7 text-xs text-indigo-600 hover:text-indigo-800"
                    onClick={() => {
                      setSearchTerm('')
                      setStatusFilter('ALL')
                      setAirlineFilter('ALL')
                      setUnitFilter('ALL')
                    }}
                  >
                    Limpar Filtros
                  </Button>
                </div>
              )}
            </div>

            {/* Listagem em Tabela/Cards */}
            <div className="bg-white rounded-xl border border-slate-200 shadow-sm overflow-hidden">
              {loading ? (
                <div className="py-16 text-center space-y-2">
                  <RefreshCw className="h-6 w-6 animate-spin text-indigo-600 mx-auto" />
                  <p className="text-xs text-slate-500">Carregando solicitações...</p>
                </div>
              ) : filteredRequests.length === 0 ? (
                <div className="py-16 text-center space-y-3">
                  <FileCheck2 className="h-10 w-10 text-slate-300 mx-auto" />
                  <div className="space-y-1">
                    <p className="text-sm font-semibold text-slate-800">
                      Nenhuma solicitação encontrada
                    </p>
                    <p className="text-xs text-slate-400 max-w-sm mx-auto">
                      Não há waivers registrados com os filtros atuais. Crie uma nova solicitação no
                      botão acima.
                    </p>
                  </div>
                  <Button
                    size="sm"
                    variant="outline"
                    onClick={() => setWizardOpen(true)}
                    className="text-xs text-indigo-600 border-indigo-200 hover:bg-indigo-50"
                  >
                    <Plus className="h-3.5 w-3.5 mr-1" /> Criar Solicitação
                  </Button>
                </div>
              ) : (
                <div className="divide-y divide-slate-100">
                  {filteredRequests.map((req) => {
                    const requesterName = req.expand?.requester?.name || 'Consultor'
                    const isOwner = req.requester === user?.id

                    return (
                      <div
                        key={req.id}
                        onClick={() => openDetails(req)}
                        className="p-4 hover:bg-slate-50/80 cursor-pointer transition-colors flex flex-col md:flex-row md:items-center justify-between gap-4"
                      >
                        <div className="flex items-start gap-3 min-w-0">
                          <div className="p-2.5 rounded-lg bg-indigo-50 border border-indigo-100 text-indigo-700 shrink-0 mt-0.5">
                            <Plane className="h-4 w-4" />
                          </div>

                          <div className="space-y-1 min-w-0">
                            <div className="flex flex-wrap items-center gap-2">
                              <span className="text-xs font-bold text-slate-900">
                                {req.airline_name}
                              </span>
                              <Badge
                                variant="secondary"
                                className="text-[10px] bg-slate-100 text-slate-700"
                              >
                                {req.request_type || 'Waiver'}
                              </Badge>
                              {getStatusBadge(req.status)}
                              {isOwner && (
                                <Badge
                                  variant="outline"
                                  className="text-[10px] bg-indigo-50 text-indigo-700 border-indigo-200"
                                >
                                  Minha
                                </Badge>
                              )}
                            </div>

                            <div className="flex flex-wrap items-center gap-x-4 gap-y-1 text-xs text-slate-500">
                              <span className="flex items-center gap-1">
                                <Building className="h-3 w-3 text-slate-400" />
                                <strong className="text-slate-700">{req.unit}</strong>
                              </span>

                              {req.gds_locator && (
                                <span className="font-mono text-indigo-700 font-semibold bg-indigo-50/60 px-1.5 py-0.5 rounded border border-indigo-100">
                                  LOC: {req.gds_locator}
                                </span>
                              )}

                              {req.pax_name && (
                                <span className="text-slate-700 font-medium truncate max-w-[180px]">
                                  PAX: {req.pax_name}
                                </span>
                              )}

                              <span className="flex items-center gap-1">
                                <User className="h-3 w-3 text-slate-400" />
                                {requesterName}
                              </span>

                              <span className="text-slate-400">
                                {new Date(req.created).toLocaleDateString('pt-BR', {
                                  day: '2-digit',
                                  month: '2-digit',
                                  hour: '2-digit',
                                  minute: '2-digit',
                                })}
                              </span>
                            </div>
                          </div>
                        </div>

                        <div className="flex items-center justify-between md:justify-end gap-4 shrink-0 border-t md:border-t-0 pt-2 md:pt-0 border-slate-100">
                          <div className="text-right">
                            {req.amount !== undefined && req.amount !== null && (
                              <div className="text-xs font-bold font-mono text-slate-900">
                                {req.amount} {req.currency || ''}
                              </div>
                            )}
                            <div className="text-[11px] text-slate-500">
                              Aprovador:{' '}
                              <span className="font-semibold text-slate-700">
                                {req.approver_name}
                              </span>
                            </div>
                          </div>

                          <Button
                            variant="ghost"
                            size="icon"
                            className="h-8 w-8 text-slate-400 hover:text-slate-700"
                          >
                            <ChevronRight className="h-4 w-4" />
                          </Button>
                        </div>
                      </div>
                    )
                  })}
                </div>
              )}
            </div>
          </div>
        )}

        {/* Conteúdo de Indicadores & Resumo */}
        {activeTab === 'metrics' && (
          <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
            {/* Solicitações por Companhia */}
            <Card className="border-slate-200 shadow-sm bg-white">
              <CardHeader className="pb-3 border-b border-slate-100">
                <CardTitle className="text-sm font-bold text-slate-800 flex items-center gap-2">
                  <Plane className="h-4 w-4 text-indigo-600" />
                  Volume por Companhia Aérea
                </CardTitle>
              </CardHeader>
              <CardContent className="p-4 space-y-3">
                {Object.keys(metrics.byAirline).length === 0 ? (
                  <p className="text-xs text-slate-400 italic">Nenhum dado registrado.</p>
                ) : (
                  Object.entries(metrics.byAirline).map(([airline, count]) => {
                    const pct = metrics.total > 0 ? Math.round((count / metrics.total) * 100) : 0
                    return (
                      <div key={airline} className="space-y-1">
                        <div className="flex justify-between text-xs">
                          <span className="font-semibold text-slate-700">{airline}</span>
                          <span className="text-slate-500 font-mono">
                            {count} ({pct}%)
                          </span>
                        </div>
                        <div className="h-2 w-full bg-slate-100 rounded-full overflow-hidden">
                          <div
                            className="h-full bg-indigo-600 rounded-full"
                            style={{ width: `${pct}%` }}
                          />
                        </div>
                      </div>
                    )
                  })
                )}
              </CardContent>
            </Card>

            {/* Top Consultores no Mês */}
            <Card className="border-slate-200 shadow-sm bg-white">
              <CardHeader className="pb-3 border-b border-slate-100">
                <CardTitle className="text-sm font-bold text-slate-800 flex items-center gap-2">
                  <User className="h-4 w-4 text-indigo-600" />
                  Consultores com Mais Solicitações
                </CardTitle>
              </CardHeader>
              <CardContent className="p-4 space-y-3">
                {metrics.topConsultants.length === 0 ? (
                  <p className="text-xs text-slate-400 italic">Nenhum dado registrado.</p>
                ) : (
                  metrics.topConsultants.map((c) => (
                    <div
                      key={c.name}
                      className="flex items-center justify-between p-2.5 rounded-lg bg-slate-50 border border-slate-200"
                    >
                      <div className="space-y-0.5">
                        <span className="text-xs font-bold text-slate-800 block">{c.name}</span>
                        <span className="text-[11px] text-emerald-600 font-medium">
                          {c.approved} aprovada(s) / negociada(s)
                        </span>
                      </div>
                      <Badge
                        variant="secondary"
                        className="bg-white border border-slate-300 font-mono text-xs"
                      >
                        {c.count} pedidos
                      </Badge>
                    </div>
                  ))
                )}
              </CardContent>
            </Card>
          </div>
        )}
      </Tabs>

      {/* Modal Wizard de Criação */}
      <NewWaiverWizardModal
        open={wizardOpen}
        onOpenChange={setWizardOpen}
        waiverConfig={config}
        userDefaultUnit={userDefaultUnit}
        onRequestCreated={() => loadData()}
      />

      {/* Modal de Detalhes, Histórico e Análise */}
      <WaiverDetailModal
        open={detailOpen}
        onOpenChange={setDetailOpen}
        request={selectedRequest}
        canManage={canManageWaivers}
        currentUserId={user?.id}
        onStatusUpdated={() => loadData()}
      />

      {/* Modal de Parâmetros (Líderes/Gestores/Master) */}
      <WaiverSettingsModal
        open={settingsOpen}
        onOpenChange={setSettingsOpen}
        config={config}
        onConfigUpdated={() => loadData()}
      />
    </div>
  )
}
