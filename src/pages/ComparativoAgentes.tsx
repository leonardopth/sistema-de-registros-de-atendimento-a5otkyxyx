import { useState, useMemo, useEffect } from 'react'
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card'
import { Button } from '@/components/ui/button'
import { Badge } from '@/components/ui/badge'
import { Popover, PopoverContent, PopoverTrigger } from '@/components/ui/popover'
import {
  Command,
  CommandEmpty,
  CommandGroup,
  CommandInput,
  CommandItem,
  CommandList,
} from '@/components/ui/command'
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
import { BarChart, Bar, XAxis, YAxis, CartesianGrid, ResponsiveContainer, Legend } from 'recharts'
import {
  Users,
  BarChart3,
  Check,
  ChevronsUpDown,
  Calendar,
  X,
  TrendingUp,
  Clock,
  CheckCircle2,
  AlertTriangle,
  Smile,
  Award,
  Sparkles,
} from 'lucide-react'
import { useAuth } from '@/hooks/use-auth'
import { getUsers } from '@/services/users'
import { getServiceRecords } from '@/services/service_records'
import { getEmailLogs, type EmailLogRecord } from '@/services/outlook-integration'
import { getCallAnalysisLogs, type CallAnalysisLogRecord } from '@/services/telephony-integration'
import { getGMT3MonthParts, currentGMT3Date, type SentimentLogItem } from '@/lib/metas'
import { filterRecordsByUserAccess } from '@/lib/service-group-access'
import type { UserRecord, ServiceRecord } from '@/types/service_record'
import { cn } from '@/lib/utils'

export type ComparisonPeriod = 'current_month' | 'last_3_months' | 'last_6_months' | 'last_year'

interface AgentMetrics {
  user: UserRecord
  totalAttendances: number
  avgTMA: number // minutos
  resolutionRate: number // %
  avoidableRate: number // %
  satisfactionScore: number // score 0-100
}

export default function ComparativoAgentes() {
  const { user } = useAuth()
  const [users, setUsers] = useState<UserRecord[]>([])
  const [records, setRecords] = useState<ServiceRecord[]>([])
  const [sentimentLogs, setSentimentLogs] = useState<SentimentLogItem[]>([])
  const [loading, setLoading] = useState(true)

  const [selectedPeriod, setSelectedPeriod] = useState<ComparisonPeriod>('current_month')
  const [selectedUserIds, setSelectedUserIds] = useState<string[]>([])
  const [selectOpen, setSelectOpen] = useState(false)
  const [metricView, setMetricView] = useState<'all' | 'volume' | 'rates' | 'tma_csat'>('all')

  // Carrega usuários e atendimentos
  useEffect(() => {
    let active = true
    async function fetchData() {
      try {
        const [u, r, emailLogs, callLogs] = await Promise.all([
          getUsers().catch(() => [] as UserRecord[]),
          getServiceRecords().catch(() => [] as ServiceRecord[]),
          getEmailLogs().catch(() => [] as EmailLogRecord[]),
          getCallAnalysisLogs().catch(() => [] as CallAnalysisLogRecord[]),
        ])
        if (!active) return

        // Filtra colaboradores internos (consultores, líderes, supervisores, gerentes)
        const internal = u.filter((item) =>
          [
            'Consultor',
            'Líder',
            'Supervisor',
            'Gerente',
            'Consultores',
            'Líderes',
            'Supervisores',
            'Gerentes',
          ].includes(item.role),
        )
        setUsers(internal)
        setRecords(r)

        const sLogs: SentimentLogItem[] = [
          ...emailLogs.map((el) => ({
            processed_by: el.processed_by,
            sentiment: el.sentiment,
            confidence_score: el.confidence_score,
            created: el.created,
          })),
          ...callLogs.map((cl) => ({
            processed_by: cl.processed_by,
            sentiment: cl.sentiment,
            quality_score: cl.quality_score,
            created: cl.created,
          })),
        ]
        setSentimentLogs(sLogs)

        // Seleciona inicialmente os 2 primeiros usuários se ainda não houver seleção
        if (internal.length >= 2) {
          setSelectedUserIds([internal[0].id, internal[1].id])
        } else if (internal.length === 1) {
          setSelectedUserIds([internal[0].id])
        }
      } catch (err) {
        console.error('Erro ao carregar dados do comparativo:', err)
      } finally {
        if (active) setLoading(false)
      }
    }
    fetchData()
    return () => {
      active = false
    }
  }, [])

  // Filtra registros acessíveis de acordo com as permissões do usuário logado
  const accessibleRecords = useMemo(() => filterRecordsByUserAccess(records, user), [records, user])

  // Filtra registros baseado no período selecionado
  const filteredPeriodRecords = useMemo(() => {
    const nowParts = currentGMT3Date()
    return accessibleRecords.filter((r) => {
      const parts = getGMT3MonthParts(r.created)
      if (!parts) return false

      if (selectedPeriod === 'current_month') {
        return parts.year === nowParts.year && parts.month === nowParts.month
      }

      // Calcula a diferença em meses
      const diffMonths = (nowParts.year - parts.year) * 12 + (nowParts.month - parts.month)
      if (selectedPeriod === 'last_3_months') {
        return diffMonths >= 0 && diffMonths < 3
      }
      if (selectedPeriod === 'last_6_months') {
        return diffMonths >= 0 && diffMonths < 6
      }
      if (selectedPeriod === 'last_year') {
        return diffMonths >= 0 && diffMonths < 12
      }
      return true
    })
  }, [accessibleRecords, selectedPeriod])

  // Filtra logs de sentimento no período
  const filteredSentimentLogs = useMemo(() => {
    const nowParts = currentGMT3Date()
    return sentimentLogs.filter((log) => {
      const parts = getGMT3MonthParts(log.created)
      if (!parts) return false

      if (selectedPeriod === 'current_month') {
        return parts.year === nowParts.year && parts.month === nowParts.month
      }
      const diffMonths = (nowParts.year - parts.year) * 12 + (nowParts.month - parts.month)
      if (selectedPeriod === 'last_3_months') return diffMonths >= 0 && diffMonths < 3
      if (selectedPeriod === 'last_6_months') return diffMonths >= 0 && diffMonths < 6
      if (selectedPeriod === 'last_year') return diffMonths >= 0 && diffMonths < 12
      return true
    })
  }, [sentimentLogs, selectedPeriod])

  // Calcula as 5 métricas exigidas para cada colaborador selecionado
  const agentMetricsList = useMemo<AgentMetrics[]>(() => {
    const selectedUsers = users.filter((u) => selectedUserIds.includes(u.id))

    return selectedUsers.map((colab) => {
      const userRecords = filteredPeriodRecords.filter(
        (r) => (r.assigned_user || r.user_id) === colab.id,
      )

      const total = userRecords.length
      const resolved = userRecords.filter((r) => r.status === 'Concluído').length
      const avoidable = userRecords.filter((r) => r.avoidable_contact).length

      const sumDuration = userRecords.reduce((acc, curr) => acc + (curr.duration || 0), 0)
      const avgTMA = total > 0 ? Number((sumDuration / total).toFixed(1)) : 0

      const resolutionRate = total > 0 ? Math.round((resolved / total) * 100) : 0
      const avoidableRate = total > 0 ? Math.round((avoidable / total) * 100) : 0

      // Satisfação / Qualidade do Cliente
      const userSentiments = filteredSentimentLogs.filter(
        (l) => (l.processed_by || l.agent_user || l.user_id) === colab.id,
      )
      let satisfactionScore = 85
      if (userSentiments.length > 0) {
        const positiveCount = userSentiments.filter((s) => s.sentiment === 'Positivo').length
        const sentimentScore = Math.round((positiveCount / userSentiments.length) * 100)
        satisfactionScore = Math.max(
          60,
          Math.min(100, Math.round(sentimentScore * 0.6 + resolutionRate * 0.4)),
        )
      } else if (total > 0) {
        satisfactionScore = Math.max(
          60,
          Math.min(100, Math.round(resolutionRate * 0.65 + (100 - avoidableRate) * 0.35)),
        )
      }

      return {
        user: colab,
        totalAttendances: total,
        avgTMA,
        resolutionRate,
        avoidableRate,
        satisfactionScore,
      }
    })
  }, [users, selectedUserIds, filteredPeriodRecords, filteredSentimentLogs])

  // Identifica o melhor e o pior resultado para cada uma das 5 métricas
  // Regras de melhor/pior:
  // 1. Atendimentos: Maior é melhor, menor é pior
  // 2. TMA (minutos): Menor é melhor, maior é pior
  // 3. Taxa de Resolução (%): Maior é melhor, menor é pior
  // 4. % Contatos Evitáveis: Menor é melhor, maior é pior
  // 5. Satisfação (score): Maior é melhor, menor é pior
  const highlights = useMemo(() => {
    if (agentMetricsList.length < 2) {
      return {
        bestAttendance: null,
        worstAttendance: null,
        bestTMA: null,
        worstTMA: null,
        bestResolution: null,
        worstResolution: null,
        bestAvoidable: null,
        worstAvoidable: null,
        bestSatisfaction: null,
        worstSatisfaction: null,
      }
    }

    const attendances = agentMetricsList.map((m) => m.totalAttendances)
    const tmas = agentMetricsList.map((m) => m.avgTMA)
    const resolutions = agentMetricsList.map((m) => m.resolutionRate)
    const avoidables = agentMetricsList.map((m) => m.avoidableRate)
    const satisfactions = agentMetricsList.map((m) => m.satisfactionScore)

    const maxAtt = Math.max(...attendances)
    const minAtt = Math.min(...attendances)

    const maxTma = Math.max(...tmas)
    const minTma = Math.min(...tmas)

    const maxRes = Math.max(...resolutions)
    const minRes = Math.min(...resolutions)

    const maxAvo = Math.max(...avoidables)
    const minAvo = Math.min(...avoidables)

    const maxSat = Math.max(...satisfactions)
    const minSat = Math.min(...satisfactions)

    return {
      bestAttendance: maxAtt !== minAtt ? maxAtt : null,
      worstAttendance: maxAtt !== minAtt ? minAtt : null,
      bestTMA: maxTma !== minTma ? minTma : null, // Menor TMA é melhor
      worstTMA: maxTma !== minTma ? maxTma : null, // Maior TMA é pior
      bestResolution: maxRes !== minRes ? maxRes : null,
      worstResolution: maxRes !== minRes ? minRes : null,
      bestAvoidable: maxAvo !== minAvo ? minAvo : null, // Menor % de contatos evitáveis é melhor
      worstAvoidable: maxAvo !== minAvo ? maxAvo : null, // Maior % de contatos evitáveis é pior
      bestSatisfaction: maxSat !== minSat ? maxSat : null,
      worstSatisfaction: maxSat !== minSat ? minSat : null,
    }
  }, [agentMetricsList])

  // Configuração e dados para o gráfico de barras comparativo (recharts)
  const chartData = useMemo(() => {
    return agentMetricsList.map((m) => ({
      name: m.user.name.split(' ')[0] || m.user.name,
      fullName: m.user.name,
      Atendimentos: m.totalAttendances,
      TMA: m.avgTMA,
      'Taxa Resolução (%)': m.resolutionRate,
      'Evitáveis (%)': m.avoidableRate,
      'Satisfação (Score)': m.satisfactionScore,
    }))
  }, [agentMetricsList])

  const chartConfig: ChartConfig = {
    Atendimentos: { label: 'Atendimentos', color: '#4f46e5' },
    TMA: { label: 'TMA (min)', color: '#0ea5e9' },
    'Taxa Resolução (%)': { label: 'Taxa Resolução (%)', color: '#10b981' },
    'Evitáveis (%)': { label: 'Evitáveis (%)', color: '#f43f5e' },
    'Satisfação (Score)': { label: 'Satisfação (Score)', color: '#8b5cf6' },
  }

  const toggleUserSelection = (id: string) => {
    setSelectedUserIds((prev) =>
      prev.includes(id) ? prev.filter((userId) => userId !== id) : [...prev, id],
    )
  }

  const removeUser = (id: string) => {
    setSelectedUserIds((prev) => prev.filter((userId) => userId !== id))
  }

  const selectAll = () => {
    setSelectedUserIds(users.map((u) => u.id))
  }

  const clearAll = () => {
    setSelectedUserIds([])
  }

  return (
    <div className="space-y-6">
      {/* Cabeçalho */}
      <div className="flex flex-col sm:flex-row sm:items-center sm:justify-between gap-4">
        <div>
          <h2 className="text-2xl font-extrabold tracking-tight text-slate-900 flex items-center gap-2">
            <BarChart3 className="h-6 w-6 text-indigo-600" /> Comparativo entre Agentes
          </h2>
          <p className="text-xs text-slate-500">
            Compare o desempenho lado a lado de 2 ou mais colaboradores com métricas e gráficos
            detalhados
          </p>
        </div>

        {/* Seleção de Período */}
        <div className="flex items-center gap-2 shrink-0">
          <Calendar className="h-4 w-4 text-slate-400" />
          <Select
            value={selectedPeriod}
            onValueChange={(val) => setSelectedPeriod(val as ComparisonPeriod)}
          >
            <SelectTrigger className="w-[190px] h-9 text-xs font-semibold bg-white">
              <SelectValue placeholder="Selecione o período" />
            </SelectTrigger>
            <SelectContent>
              <SelectItem value="current_month">Mês corrente</SelectItem>
              <SelectItem value="last_3_months">Últimos 3 meses</SelectItem>
              <SelectItem value="last_6_months">Últimos 6 meses</SelectItem>
              <SelectItem value="last_year">Último ano</SelectItem>
            </SelectContent>
          </Select>
        </div>
      </div>

      {/* Barra de Filtros / Multi-Select com Busca */}
      <Card className="border-slate-200 shadow-subtle bg-white">
        <CardContent className="p-4 space-y-3">
          <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-3">
            <div className="flex-1">
              <label className="text-xs font-bold text-slate-700 block mb-1">
                Selecione os colaboradores para comparar:
              </label>

              <Popover open={selectOpen} onOpenChange={setSelectOpen}>
                <PopoverTrigger asChild>
                  <Button
                    variant="outline"
                    role="combobox"
                    aria-expanded={selectOpen}
                    className="w-full justify-between text-xs h-10 font-normal bg-slate-50 hover:bg-slate-100"
                  >
                    <div className="flex items-center gap-2 truncate">
                      <Users className="h-4 w-4 text-slate-500 shrink-0" />
                      {selectedUserIds.length === 0 ? (
                        <span className="text-slate-400">
                          Clique para selecionar colaboradores...
                        </span>
                      ) : (
                        <span className="font-semibold text-slate-900">
                          {selectedUserIds.length} colaborador(es) selecionado(s)
                        </span>
                      )}
                    </div>
                    <ChevronsUpDown className="h-4 w-4 shrink-0 opacity-50 ml-2" />
                  </Button>
                </PopoverTrigger>

                <PopoverContent className="w-[320px] sm:w-[400px] p-0" align="start">
                  <Command>
                    <CommandInput
                      placeholder="Buscar colaborador por nome ou cargo..."
                      className="text-xs h-9"
                    />
                    <CommandList>
                      <CommandEmpty className="py-4 text-center text-xs text-slate-500">
                        Nenhum colaborador encontrado.
                      </CommandEmpty>
                      <CommandGroup heading="Colaboradores Internos">
                        {users.map((colab) => {
                          const isSelected = selectedUserIds.includes(colab.id)
                          return (
                            <CommandItem
                              key={colab.id}
                              value={`${colab.name} ${colab.role}`}
                              onSelect={() => toggleUserSelection(colab.id)}
                              className="text-xs flex items-center justify-between cursor-pointer py-2"
                            >
                              <div className="flex items-center gap-2">
                                <div
                                  className={cn(
                                    'h-4 w-4 rounded border flex items-center justify-center transition-colors',
                                    isSelected
                                      ? 'bg-indigo-600 border-indigo-600 text-white'
                                      : 'border-slate-300',
                                  )}
                                >
                                  {isSelected && <Check className="h-3 w-3" />}
                                </div>
                                <div>
                                  <p className="font-semibold text-slate-900">{colab.name}</p>
                                  <p className="text-[10px] text-slate-400">{colab.role}</p>
                                </div>
                              </div>
                              {isSelected && (
                                <Badge
                                  variant="secondary"
                                  className="text-[9px] bg-indigo-50 text-indigo-700 h-4"
                                >
                                  Selecionado
                                </Badge>
                              )}
                            </CommandItem>
                          )
                        })}
                      </CommandGroup>
                    </CommandList>
                  </Command>
                  <div className="p-2 border-t border-slate-100 flex items-center justify-between bg-slate-50 text-xs">
                    <Button
                      variant="ghost"
                      size="sm"
                      className="h-7 text-[11px]"
                      onClick={selectAll}
                    >
                      Selecionar Todos
                    </Button>
                    <Button
                      variant="ghost"
                      size="sm"
                      className="h-7 text-[11px] text-slate-500"
                      onClick={clearAll}
                    >
                      Limpar
                    </Button>
                  </div>
                </PopoverContent>
              </Popover>
            </div>

            <div className="flex items-center gap-2 self-end sm:self-center">
              <Button
                variant="outline"
                size="sm"
                className="text-xs h-9"
                onClick={() => setSelectedUserIds(users.slice(0, 3).map((u) => u.id))}
              >
                Top 3 Padrão
              </Button>
              {selectedUserIds.length > 0 && (
                <Button
                  variant="ghost"
                  size="sm"
                  className="text-xs h-9 text-rose-600 hover:text-rose-700 hover:bg-rose-50"
                  onClick={clearAll}
                >
                  Remover Seleção
                </Button>
              )}
            </div>
          </div>

          {/* Tags dos usuários selecionados */}
          {selectedUserIds.length > 0 && (
            <div className="flex flex-wrap items-center gap-1.5 pt-1">
              <span className="text-[11px] text-slate-400 mr-1">Comparando:</span>
              {selectedUserIds.map((id) => {
                const colab = users.find((u) => u.id === id)
                if (!colab) return null
                return (
                  <Badge
                    key={id}
                    variant="secondary"
                    className="pl-2 pr-1 py-0.5 text-xs bg-indigo-50 text-indigo-700 border border-indigo-200 flex items-center gap-1"
                  >
                    <span>{colab.name}</span>
                    <button
                      type="button"
                      onClick={() => removeUser(id)}
                      className="h-3.5 w-3.5 rounded-full hover:bg-indigo-200 flex items-center justify-center ml-0.5"
                    >
                      <X className="h-2.5 w-2.5" />
                    </button>
                  </Badge>
                )
              })}
            </div>
          )}
        </CardContent>
      </Card>

      {/* Legenda de cores */}
      <div className="flex flex-wrap items-center justify-between gap-2 px-1 text-xs">
        <div className="flex items-center gap-4">
          <span className="flex items-center gap-1.5 text-slate-600 font-medium">
            <span className="h-3 w-3 rounded-full bg-emerald-500 inline-block ring-2 ring-emerald-100" />
            <strong className="text-emerald-700">Destaque Verde:</strong> Melhor resultado
          </span>
          <span className="flex items-center gap-1.5 text-slate-600 font-medium">
            <span className="h-3 w-3 rounded-full bg-rose-500 inline-block ring-2 ring-rose-100" />
            <strong className="text-rose-700">Destaque Vermelho:</strong> Pior resultado
          </span>
        </div>
        <span className="text-[11px] text-slate-400">
          Valores calculados com base em {filteredPeriodRecords.length} atendimentos no período.
        </span>
      </div>

      {/* Cards de Comparativo Lado a Lado */}
      {agentMetricsList.length < 2 ? (
        <Card className="p-12 text-center border-slate-200 bg-white">
          <Users className="h-12 w-12 text-slate-300 mx-auto mb-3" />
          <h3 className="text-sm font-bold text-slate-800">Selecione pelo menos 2 colaboradores</h3>
          <p className="text-xs text-slate-400 max-w-sm mx-auto mt-1">
            Utilize a barra de busca acima para selecionar os colaboradores internos que deseja
            comparar lado a lado.
          </p>
        </Card>
      ) : (
        <>
          <div
            className={cn(
              'grid gap-4',
              agentMetricsList.length === 2 && 'grid-cols-1 md:grid-cols-2',
              agentMetricsList.length === 3 && 'grid-cols-1 md:grid-cols-3',
              agentMetricsList.length >= 4 && 'grid-cols-1 sm:grid-cols-2 lg:grid-cols-4',
            )}
          >
            {agentMetricsList.map((metric) => {
              const isBestAttendance =
                highlights.bestAttendance !== null &&
                metric.totalAttendances === highlights.bestAttendance
              const isWorstAttendance =
                highlights.worstAttendance !== null &&
                metric.totalAttendances === highlights.worstAttendance

              const isBestTMA = highlights.bestTMA !== null && metric.avgTMA === highlights.bestTMA
              const isWorstTMA =
                highlights.worstTMA !== null && metric.avgTMA === highlights.worstTMA

              const isBestResolution =
                highlights.bestResolution !== null &&
                metric.resolutionRate === highlights.bestResolution
              const isWorstResolution =
                highlights.worstResolution !== null &&
                metric.resolutionRate === highlights.worstResolution

              const isBestAvoidable =
                highlights.bestAvoidable !== null &&
                metric.avoidableRate === highlights.bestAvoidable
              const isWorstAvoidable =
                highlights.worstAvoidable !== null &&
                metric.avoidableRate === highlights.worstAvoidable

              const isBestSatisfaction =
                highlights.bestSatisfaction !== null &&
                metric.satisfactionScore === highlights.bestSatisfaction
              const isWorstSatisfaction =
                highlights.worstSatisfaction !== null &&
                metric.satisfactionScore === highlights.worstSatisfaction

              return (
                <Card
                  key={metric.user.id}
                  className="border-slate-200 shadow-subtle hover:shadow-md transition-shadow bg-white flex flex-col"
                >
                  <CardHeader className="pb-3 border-b border-slate-100 bg-slate-50/50">
                    <div className="flex items-start justify-between gap-2">
                      <div className="min-w-0">
                        <CardTitle className="text-base font-bold text-slate-900 truncate">
                          {metric.user.name}
                        </CardTitle>
                        <p className="text-[11px] text-slate-500 font-normal">{metric.user.role}</p>
                      </div>
                      <Badge
                        variant="outline"
                        className="text-[10px] bg-white border-slate-200 shrink-0"
                      >
                        {metric.user.departments && metric.user.departments.length > 0
                          ? metric.user.departments.join(', ')
                          : 'Geral'}
                      </Badge>
                    </div>
                  </CardHeader>

                  <CardContent className="p-4 space-y-3.5 flex-1">
                    {/* 1. Atendimentos no período */}
                    <div
                      className={cn(
                        'p-2.5 rounded-lg border transition-all',
                        isBestAttendance
                          ? 'bg-emerald-50/60 border-emerald-300 ring-1 ring-emerald-200'
                          : isWorstAttendance
                            ? 'bg-rose-50/60 border-rose-300 ring-1 ring-rose-200'
                            : 'bg-slate-50/60 border-slate-100',
                      )}
                    >
                      <div className="flex items-center justify-between">
                        <span className="text-[11px] font-semibold text-slate-600 flex items-center gap-1.5">
                          <TrendingUp className="h-3.5 w-3.5 text-indigo-600" />
                          Atendimentos
                        </span>
                        {isBestAttendance && (
                          <Badge className="text-[9px] h-4 bg-emerald-600 hover:bg-emerald-600">
                            Melhor
                          </Badge>
                        )}
                        {isWorstAttendance && (
                          <Badge className="text-[9px] h-4 bg-rose-600 hover:bg-rose-600">
                            Menor
                          </Badge>
                        )}
                      </div>
                      <div className="mt-1 flex items-baseline justify-between">
                        <span
                          className={cn(
                            'text-xl font-black',
                            isBestAttendance
                              ? 'text-emerald-700'
                              : isWorstAttendance
                                ? 'text-rose-700'
                                : 'text-slate-900',
                          )}
                        >
                          {metric.totalAttendances}
                        </span>
                        <span className="text-[10px] text-slate-400">volume absoluto</span>
                      </div>
                    </div>

                    {/* 2. Tempo Médio de Atendimento (TMA) */}
                    <div
                      className={cn(
                        'p-2.5 rounded-lg border transition-all',
                        isBestTMA
                          ? 'bg-emerald-50/60 border-emerald-300 ring-1 ring-emerald-200'
                          : isWorstTMA
                            ? 'bg-rose-50/60 border-rose-300 ring-1 ring-rose-200'
                            : 'bg-slate-50/60 border-slate-100',
                      )}
                    >
                      <div className="flex items-center justify-between">
                        <span className="text-[11px] font-semibold text-slate-600 flex items-center gap-1.5">
                          <Clock className="h-3.5 w-3.5 text-sky-600" />
                          Tempo Médio (TMA)
                        </span>
                        {isBestTMA && (
                          <Badge className="text-[9px] h-4 bg-emerald-600 hover:bg-emerald-600">
                            Mais Rápido
                          </Badge>
                        )}
                        {isWorstTMA && (
                          <Badge className="text-[9px] h-4 bg-rose-600 hover:bg-rose-600">
                            Mais Lento
                          </Badge>
                        )}
                      </div>
                      <div className="mt-1 flex items-baseline justify-between">
                        <span
                          className={cn(
                            'text-xl font-black',
                            isBestTMA
                              ? 'text-emerald-700'
                              : isWorstTMA
                                ? 'text-rose-700'
                                : 'text-slate-900',
                          )}
                        >
                          {metric.avgTMA}{' '}
                          <span className="text-xs font-semibold text-slate-500">min</span>
                        </span>
                        <span className="text-[10px] text-slate-400">por atendimento</span>
                      </div>
                    </div>

                    {/* 3. Taxa de Resolução */}
                    <div
                      className={cn(
                        'p-2.5 rounded-lg border transition-all',
                        isBestResolution
                          ? 'bg-emerald-50/60 border-emerald-300 ring-1 ring-emerald-200'
                          : isWorstResolution
                            ? 'bg-rose-50/60 border-rose-300 ring-1 ring-rose-200'
                            : 'bg-slate-50/60 border-slate-100',
                      )}
                    >
                      <div className="flex items-center justify-between">
                        <span className="text-[11px] font-semibold text-slate-600 flex items-center gap-1.5">
                          <CheckCircle2 className="h-3.5 w-3.5 text-emerald-600" />
                          Taxa de Resolução
                        </span>
                        {isBestResolution && (
                          <Badge className="text-[9px] h-4 bg-emerald-600 hover:bg-emerald-600">
                            Melhor
                          </Badge>
                        )}
                        {isWorstResolution && (
                          <Badge className="text-[9px] h-4 bg-rose-600 hover:bg-rose-600">
                            Menor
                          </Badge>
                        )}
                      </div>
                      <div className="mt-1 flex items-baseline justify-between">
                        <span
                          className={cn(
                            'text-xl font-black',
                            isBestResolution
                              ? 'text-emerald-700'
                              : isWorstResolution
                                ? 'text-rose-700'
                                : 'text-slate-900',
                          )}
                        >
                          {metric.resolutionRate}%
                        </span>
                        <span className="text-[10px] text-slate-400">concluídos</span>
                      </div>
                    </div>

                    {/* 4. % de Contatos Evitáveis */}
                    <div
                      className={cn(
                        'p-2.5 rounded-lg border transition-all',
                        isBestAvoidable
                          ? 'bg-emerald-50/60 border-emerald-300 ring-1 ring-emerald-200'
                          : isWorstAvoidable
                            ? 'bg-rose-50/60 border-rose-300 ring-1 ring-rose-200'
                            : 'bg-slate-50/60 border-slate-100',
                      )}
                    >
                      <div className="flex items-center justify-between">
                        <span className="text-[11px] font-semibold text-slate-600 flex items-center gap-1.5">
                          <AlertTriangle className="h-3.5 w-3.5 text-amber-600" />
                          Contatos Evitáveis
                        </span>
                        {isBestAvoidable && (
                          <Badge className="text-[9px] h-4 bg-emerald-600 hover:bg-emerald-600">
                            Menor Incidência
                          </Badge>
                        )}
                        {isWorstAvoidable && (
                          <Badge className="text-[9px] h-4 bg-rose-600 hover:bg-rose-600">
                            Maior Incidência
                          </Badge>
                        )}
                      </div>
                      <div className="mt-1 flex items-baseline justify-between">
                        <span
                          className={cn(
                            'text-xl font-black',
                            isBestAvoidable
                              ? 'text-emerald-700'
                              : isWorstAvoidable
                                ? 'text-rose-700'
                                : 'text-slate-900',
                          )}
                        >
                          {metric.avoidableRate}%
                        </span>
                        <span className="text-[10px] text-slate-400">do total</span>
                      </div>
                    </div>

                    {/* 5. Satisfação do Cliente (Score IA) */}
                    <div
                      className={cn(
                        'p-2.5 rounded-lg border transition-all',
                        isBestSatisfaction
                          ? 'bg-emerald-50/60 border-emerald-300 ring-1 ring-emerald-200'
                          : isWorstSatisfaction
                            ? 'bg-rose-50/60 border-rose-300 ring-1 ring-rose-200'
                            : 'bg-slate-50/60 border-slate-100',
                      )}
                    >
                      <div className="flex items-center justify-between">
                        <span className="text-[11px] font-semibold text-slate-600 flex items-center gap-1.5">
                          <Smile className="h-3.5 w-3.5 text-purple-600" />
                          Satisfação do Cliente
                        </span>
                        {isBestSatisfaction && (
                          <Badge className="text-[9px] h-4 bg-emerald-600 hover:bg-emerald-600">
                            Maior Score
                          </Badge>
                        )}
                        {isWorstSatisfaction && (
                          <Badge className="text-[9px] h-4 bg-rose-600 hover:bg-rose-600">
                            Menor Score
                          </Badge>
                        )}
                      </div>
                      <div className="mt-1 flex items-baseline justify-between">
                        <span
                          className={cn(
                            'text-xl font-black',
                            isBestSatisfaction
                              ? 'text-emerald-700'
                              : isWorstSatisfaction
                                ? 'text-rose-700'
                                : 'text-slate-900',
                          )}
                        >
                          {metric.satisfactionScore}{' '}
                          <span className="text-xs font-semibold text-slate-500">pts</span>
                        </span>
                        <span className="text-[10px] text-slate-400">qualidade IA</span>
                      </div>
                    </div>
                  </CardContent>
                </Card>
              )
            })}
          </div>

          {/* Gráficos Comparativos Recharts */}
          <Card className="border-slate-200 shadow-subtle bg-white">
            <CardHeader className="pb-2 border-b border-slate-100 flex flex-col sm:flex-row sm:items-center sm:justify-between gap-2">
              <div>
                <CardTitle className="text-sm font-bold text-slate-900 flex items-center gap-2">
                  <BarChart3 className="h-4 w-4 text-indigo-600" />
                  Gráfico de Barras Comparativo Lado a Lado
                </CardTitle>
                <p className="text-xs text-slate-500">
                  Visualização das métricas consolidadas dos colaboradores selecionados
                </p>
              </div>

              <div className="flex items-center gap-1 bg-slate-100 rounded-lg p-1">
                <Button
                  size="sm"
                  variant={metricView === 'all' ? 'default' : 'ghost'}
                  className={cn(
                    'text-xs h-7 px-2.5',
                    metricView === 'all' && 'bg-indigo-600 hover:bg-indigo-700',
                  )}
                  onClick={() => setMetricView('all')}
                >
                  Todas as Métricas
                </Button>
                <Button
                  size="sm"
                  variant={metricView === 'volume' ? 'default' : 'ghost'}
                  className={cn(
                    'text-xs h-7 px-2.5',
                    metricView === 'volume' && 'bg-indigo-600 hover:bg-indigo-700',
                  )}
                  onClick={() => setMetricView('volume')}
                >
                  Volume & TMA
                </Button>
                <Button
                  size="sm"
                  variant={metricView === 'rates' ? 'default' : 'ghost'}
                  className={cn(
                    'text-xs h-7 px-2.5',
                    metricView === 'rates' && 'bg-indigo-600 hover:bg-indigo-700',
                  )}
                  onClick={() => setMetricView('rates')}
                >
                  Taxas (%) & CSAT
                </Button>
              </div>
            </CardHeader>

            <CardContent className="p-4 pt-6">
              <ChartContainer config={chartConfig} className="h-[340px] w-full">
                <BarChart data={chartData} margin={{ top: 10, right: 20, left: 0, bottom: 10 }}>
                  <CartesianGrid strokeDasharray="3 3" vertical={false} stroke="#f1f5f9" />
                  <XAxis
                    dataKey="name"
                    tickLine={false}
                    axisLine={{ stroke: '#cbd5e1' }}
                    tick={{ fontSize: 12, fill: '#475569', fontWeight: 600 }}
                  />
                  <YAxis
                    tickLine={false}
                    axisLine={{ stroke: '#cbd5e1' }}
                    tick={{ fontSize: 11, fill: '#64748b' }}
                  />
                  <ChartTooltip content={<ChartTooltipContent />} />
                  <Legend wrapperStyle={{ fontSize: 11, paddingTop: 10 }} />

                  {(metricView === 'all' || metricView === 'volume') && (
                    <Bar
                      dataKey="Atendimentos"
                      fill="#4f46e5"
                      radius={[4, 4, 0, 0]}
                      maxBarSize={45}
                    />
                  )}
                  {(metricView === 'all' || metricView === 'volume') && (
                    <Bar
                      dataKey="TMA"
                      name="TMA (min)"
                      fill="#0ea5e9"
                      radius={[4, 4, 0, 0]}
                      maxBarSize={45}
                    />
                  )}
                  {(metricView === 'all' || metricView === 'rates') && (
                    <Bar
                      dataKey="Taxa Resolução (%)"
                      fill="#10b981"
                      radius={[4, 4, 0, 0]}
                      maxBarSize={45}
                    />
                  )}
                  {(metricView === 'all' || metricView === 'rates') && (
                    <Bar
                      dataKey="Evitáveis (%)"
                      fill="#f43f5e"
                      radius={[4, 4, 0, 0]}
                      maxBarSize={45}
                    />
                  )}
                  {(metricView === 'all' || metricView === 'rates') && (
                    <Bar
                      dataKey="Satisfação (Score)"
                      fill="#8b5cf6"
                      radius={[4, 4, 0, 0]}
                      maxBarSize={45}
                    />
                  )}
                </BarChart>
              </ChartContainer>
            </CardContent>
          </Card>
        </>
      )}
    </div>
  )
}
