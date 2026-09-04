import { useState, useEffect, useMemo } from 'react'
import { getServiceRecords } from '@/services/service_records'
import { getEmailLogs, EmailLogRecord } from '@/services/outlook-integration'
import { getCallAnalysisLogs, CallAnalysisLogRecord } from '@/services/telephony-integration'
import { useAuth } from '@/hooks/use-auth'
import { filterRecordsByUserAccess } from '@/lib/service-group-access'
import { ServiceRecord } from '@/types/service_record'
import { normalizeContactReason } from '@/constants/contactReasons'
import { Card, CardContent, CardHeader, CardTitle, CardDescription } from '@/components/ui/card'
import { Badge } from '@/components/ui/badge'
import { Button } from '@/components/ui/button'
import {
  Table,
  TableBody,
  TableCell,
  TableHead,
  TableHeader,
  TableRow,
} from '@/components/ui/table'
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from '@/components/ui/select'
import {
  BarChart,
  Bar,
  XAxis,
  YAxis,
  CartesianGrid,
  Tooltip as RechartsTooltip,
  Legend,
  ResponsiveContainer,
} from 'recharts'
import {
  HelpCircle,
  Clock,
  AlertOctagon,
  Smile,
  BarChart3,
  Calendar,
  Filter,
  ArrowUpDown,
  ArrowUp,
  ArrowDown,
  Download,
  RefreshCw,
  Sparkles,
  CheckCircle2,
  PhoneCall,
  Mail,
  PieChart as PieChartIcon,
} from 'lucide-react'
import { cn } from '@/lib/utils'

export interface ReasonAnalysisItem {
  reason: string
  totalCount: number
  avgTMA: number // minutos
  avoidableCount: number
  avoidableRate: number // %
  avgSatisfaction: number // 0-100%
  hasAILogsCount: number
  concludedCount: number
}

export type PeriodFilter = 'current_month' | 'last_30_days' | 'last_90_days' | 'all'
export type SortField =
  | 'totalCount'
  | 'avgTMA'
  | 'avoidableCount'
  | 'avoidableRate'
  | 'avgSatisfaction'
  | 'reason'
export type ChartMetricView = 'volume_tma' | 'avoidable_vs_total' | 'satisfaction'

import { useSearchParams } from 'react-router-dom'

export default function RelatorioMotivos() {
  const { user } = useAuth()
  const [searchParams] = useSearchParams()
  const [records, setRecords] = useState<ServiceRecord[]>([])
  const [emailLogs, setEmailLogs] = useState<EmailLogRecord[]>([])
  const [callLogs, setCallLogs] = useState<CallAnalysisLogRecord[]>([])
  const [loading, setLoading] = useState(true)
  const initialPeriod = (searchParams.get('period') as PeriodFilter) || 'all'
  const [period, setPeriod] = useState<PeriodFilter>(initialPeriod)
  const [sortField, setSortField] = useState<SortField>('totalCount')
  const [sortAsc, setSortAsc] = useState(false)
  const [chartMetric, setChartMetric] = useState<ChartMetricView>('volume_tma')

  const fetchData = async () => {
    setLoading(true)
    try {
      const [recs, emails, calls] = await Promise.all([
        getServiceRecords('-created').catch(() => [] as ServiceRecord[]),
        getEmailLogs().catch(() => [] as EmailLogRecord[]),
        getCallAnalysisLogs().catch(() => [] as CallAnalysisLogRecord[]),
      ])
      setRecords(recs)
      setEmailLogs(emails)
      setCallLogs(calls)
    } catch (err) {
      console.error('Erro ao carregar dados do relatório de motivos:', err)
    } finally {
      setLoading(false)
    }
  }

  useEffect(() => {
    fetchData()
  }, [])

  // Restringe conforme permissão do usuário
  const accessibleRecords = useMemo(() => {
    return filterRecordsByUserAccess(records, user)
  }, [records, user])

  // Filtra registros pelo período selecionado
  const filteredRecords = useMemo(() => {
    if (period === 'all') return accessibleRecords
    const now = new Date()
    const nowTime = now.getTime()

    return accessibleRecords.filter((r) => {
      if (!r.created) return true
      const createdDate = new Date(r.created)
      const createdTime = createdDate.getTime()

      if (period === 'last_30_days') {
        return nowTime - createdTime <= 30 * 24 * 60 * 60 * 1000
      }
      if (period === 'last_90_days') {
        return nowTime - createdTime <= 90 * 24 * 60 * 60 * 1000
      }
      if (period === 'current_month') {
        return (
          createdDate.getFullYear() === now.getFullYear() &&
          createdDate.getMonth() === now.getMonth()
        )
      }
      return true
    })
  }, [accessibleRecords, period])

  // Agrupa logs de IA (e-mail e telefonia) com sentimento por ID de atendimento
  const sentimentByRecord = useMemo(() => {
    const map = new Map<string, { sentiments: string[]; qualityScores: number[] }>()

    const append = (recId: string | undefined, sentiment?: string, quality?: number) => {
      if (!recId) return
      const entry = map.get(recId) || { sentiments: [], qualityScores: [] }
      if (sentiment) entry.sentiments.push(sentiment)
      if (typeof quality === 'number' && !isNaN(quality)) entry.qualityScores.push(quality)
      map.set(recId, entry)
    }

    emailLogs.forEach((el) => {
      append(
        el.service_record,
        el.sentiment,
        el.confidence_score ? el.confidence_score * 100 : undefined,
      )
    })

    callLogs.forEach((cl) => {
      append(cl.service_record, cl.sentiment, cl.quality_score)
    })

    return map
  }, [emailLogs, callLogs])

  // Processa agregação por motivo de contato
  const analysisData = useMemo<ReasonAnalysisItem[]>(() => {
    const groups: Record<
      string,
      {
        count: number
        totalDuration: number
        avoidableCount: number
        sentiments: string[]
        qualityScores: number[]
        concludedCount: number
        hasAILogsCount: number
      }
    > = {}

    filteredRecords.forEach((r) => {
      const reason = normalizeContactReason(r.contact_reason) || r.contact_reason || 'Outros'
      if (!groups[reason]) {
        groups[reason] = {
          count: 0,
          totalDuration: 0,
          avoidableCount: 0,
          sentiments: [],
          qualityScores: [],
          concludedCount: 0,
          hasAILogsCount: 0,
        }
      }

      groups[reason].count++
      groups[reason].totalDuration += r.duration || 0
      if (r.avoidable_contact) groups[reason].avoidableCount++
      if (r.status === 'Concluído') groups[reason].concludedCount++

      const recAI = sentimentByRecord.get(r.id)
      if (recAI && (recAI.sentiments.length > 0 || recAI.qualityScores.length > 0)) {
        groups[reason].hasAILogsCount++
        if (recAI.sentiments.length > 0) {
          groups[reason].sentiments.push(...recAI.sentiments)
        }
        if (recAI.qualityScores.length > 0) {
          groups[reason].qualityScores.push(...recAI.qualityScores)
        }
      }
    })

    const results: ReasonAnalysisItem[] = Object.entries(groups).map(([reason, g]) => {
      const avgTMA = g.count > 0 ? Math.round((g.totalDuration / g.count) * 10) / 10 : 0
      const avoidableRate = g.count > 0 ? Math.round((g.avoidableCount / g.count) * 100) : 0

      // Cálculo de Satisfação:
      // 1. Se houver logs de IA vinculados ao motivo:
      //    Usa porcentagem de sentimento positivo (e qualidade quando disponível)
      // 2. Se não houver IA logs suficientes:
      //    Utiliza índice composto baseado na taxa de conclusão e ausência de contato evitável
      let avgSatisfaction = 80
      if (g.sentiments.length > 0) {
        let positiveScore = 0
        g.sentiments.forEach((s) => {
          const lower = s.toLowerCase()
          if (lower.includes('positiv') || lower.includes('bom') || lower.includes('excelent')) {
            positiveScore += 100
          } else if (lower.includes('neutr')) {
            positiveScore += 70
          } else if (lower.includes('negativ') || lower.includes('ruim')) {
            positiveScore += 30
          } else {
            positiveScore += 65
          }
        })
        const sentimentAvg = positiveScore / g.sentiments.length

        if (g.qualityScores.length > 0) {
          const qualityAvg = g.qualityScores.reduce((acc, q) => acc + q, 0) / g.qualityScores.length
          avgSatisfaction = Math.round(sentimentAvg * 0.6 + qualityAvg * 0.4)
        } else {
          avgSatisfaction = Math.round(sentimentAvg)
        }
      } else if (g.count > 0) {
        const resolutionRate = (g.concludedCount / g.count) * 100
        avgSatisfaction = Math.round(resolutionRate * 0.65 + (100 - avoidableRate) * 0.35)
      }

      return {
        reason,
        totalCount: g.count,
        avgTMA,
        avoidableCount: g.avoidableCount,
        avoidableRate,
        avgSatisfaction: Math.min(100, Math.max(10, avgSatisfaction)),
        hasAILogsCount: g.hasAILogsCount,
        concludedCount: g.concludedCount,
      }
    })

    return results.sort((a, b) => {
      let valA: number | string = a[sortField]
      let valB: number | string = b[sortField]

      if (typeof valA === 'string' && typeof valB === 'string') {
        const comp = valA.localeCompare(valB)
        return sortAsc ? comp : -comp
      }

      if (valA < valB) return sortAsc ? -1 : 1
      if (valA > valB) return sortAsc ? 1 : -1
      return 0
    })
  }, [filteredRecords, sentimentByRecord, sortField, sortAsc])

  // Métricas gerais consolidadas
  const totalVolume = filteredRecords.length
  const totalAvoidable = filteredRecords.filter((r) => r.avoidable_contact).length
  const overallAvgTMA =
    totalVolume > 0
      ? Math.round(
          (filteredRecords.reduce((acc, curr) => acc + (curr.duration || 0), 0) / totalVolume) * 10,
        ) / 10
      : 0
  const overallAvoidableRate =
    totalVolume > 0 ? Math.round((totalAvoidable / totalVolume) * 100) : 0

  const totalAILogsAvailable = emailLogs.length + callLogs.length

  const overallAvgSatisfaction = useMemo(() => {
    if (analysisData.length === 0) return 0
    const weightedSum = analysisData.reduce(
      (acc, curr) => acc + curr.avgSatisfaction * curr.totalCount,
      0,
    )
    return totalVolume > 0 ? Math.round(weightedSum / totalVolume) : 0
  }, [analysisData, totalVolume])

  // Ordenação interativa
  const handleSort = (field: SortField) => {
    if (sortField === field) {
      setSortAsc(!sortAsc)
    } else {
      setSortField(field)
      setSortAsc(false)
    }
  }

  // Dados para o Recharts
  const chartData = useMemo(() => {
    return analysisData.map((item) => ({
      motivo: item.reason,
      Atendimentos: item.totalCount,
      'TMA (min)': item.avgTMA,
      Evitáveis: item.avoidableCount,
      'Não Evitáveis': Math.max(0, item.totalCount - item.avoidableCount),
      'Taxa Evitável (%)': item.avoidableRate,
      'Satisfação (%)': item.avgSatisfaction,
    }))
  }, [analysisData])

  // Exportação CSV
  const handleExportCSV = () => {
    const periodLabel =
      period === 'current_month'
        ? 'Mês atual'
        : period === 'last_30_days'
          ? 'Últimos 30 dias'
          : period === 'last_90_days'
            ? 'Últimos 90 dias'
            : 'Todo o período'

    const metaLine = `"Período: ${periodLabel} | Filtros: Classificação canônica | Gerado por: ${user?.name || 'Usuário'} em ${new Date().toLocaleString('pt-BR')}"`

    const headers = [
      'Motivo de Contato',
      'Total Atendimentos',
      'TMA Médio (min)',
      'Contatos Evitáveis',
      'Taxa Evitável (%)',
      'Satisfação Estimada (%)',
      'Atendimentos Concluídos',
      'Com Logs de IA',
    ]

    const rows = analysisData.map((d) => [
      `"${d.reason.replace(/"/g, '""')}"`,
      d.totalCount,
      d.avgTMA,
      d.avoidableCount,
      `${d.avoidableRate}%`,
      `${d.avgSatisfaction}%`,
      d.concludedCount,
      d.hasAILogsCount,
    ])

    const csvContent =
      '\uFEFF' + [metaLine, headers.join(';'), ...rows.map((row) => row.join(';'))].join('\r\n')

    const blob = new Blob([csvContent], { type: 'text/csv;charset=utf-8;' })
    const url = URL.createObjectURL(blob)
    const link = document.createElement('a')
    link.href = url
    link.setAttribute(
      'download',
      `analise_motivo_contato_${new Date().toISOString().substring(0, 10)}.csv`,
    )
    document.body.appendChild(link)
    link.click()
    document.body.removeChild(link)
    URL.revokeObjectURL(url)
  }

  const renderSortIndicator = (field: SortField) => {
    if (sortField !== field) {
      return <ArrowUpDown className="h-3 w-3 text-slate-400 opacity-60 ml-1 inline" />
    }
    return sortAsc ? (
      <ArrowUp className="h-3 w-3 text-indigo-600 font-bold ml-1 inline" />
    ) : (
      <ArrowDown className="h-3 w-3 text-indigo-600 font-bold ml-1 inline" />
    )
  }

  return (
    <div className="space-y-6">
      {/* Cabeçalho */}
      <div className="flex flex-col sm:flex-row sm:items-center sm:justify-between gap-4">
        <div>
          <h2 className="text-2xl font-extrabold tracking-tight text-slate-900 flex items-center gap-2">
            <HelpCircle className="h-6 w-6 text-indigo-600" /> Análise por Motivo de Contato
          </h2>
          <p className="text-xs text-slate-500">
            Cruzamento do motivo de contato com TMA, chamados evitáveis e satisfação do cliente
          </p>
        </div>

        <div className="flex flex-wrap items-center gap-2">
          <Select value={period} onValueChange={(v) => setPeriod(v as PeriodFilter)}>
            <SelectTrigger className="w-[180px] h-9 text-xs font-semibold bg-white border-slate-200">
              <Calendar className="h-3.5 w-3.5 mr-1.5 text-slate-400" />
              <SelectValue placeholder="Período" />
            </SelectTrigger>
            <SelectContent>
              <SelectItem value="all">Todo o período</SelectItem>
              <SelectItem value="current_month">Mês atual</SelectItem>
              <SelectItem value="last_30_days">Últimos 30 dias</SelectItem>
              <SelectItem value="last_90_days">Últimos 90 dias</SelectItem>
            </SelectContent>
          </Select>

          <Button
            variant="outline"
            size="sm"
            onClick={fetchData}
            disabled={loading}
            className="h-9 text-xs font-semibold"
            title="Recarregar dados"
          >
            <RefreshCw className={cn('h-3.5 w-3.5 mr-1.5', loading && 'animate-spin')} />
            Atualizar
          </Button>

          <Button
            variant="outline"
            size="sm"
            onClick={handleExportCSV}
            className="h-9 text-xs text-slate-700 font-semibold"
          >
            <Download className="h-3.5 w-3.5 mr-1.5" /> Exportar CSV
          </Button>
        </div>
      </div>

      {/* Cards de Métricas Consolidadas */}
      <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-4 gap-4">
        <Card className="border-slate-200 shadow-subtle bg-white">
          <CardContent className="p-4 flex items-center justify-between">
            <div>
              <p className="text-xs font-medium text-slate-500">Total de Atendimentos</p>
              <p className="text-2xl font-black text-slate-900 mt-1">{totalVolume}</p>
              <p className="text-[10px] text-slate-400 mt-0.5">
                {analysisData.length} motivo(s) categorizado(s)
              </p>
            </div>
            <div className="p-3 rounded-xl bg-indigo-50 text-indigo-600">
              <BarChart3 className="h-6 w-6" />
            </div>
          </CardContent>
        </Card>

        <Card className="border-slate-200 shadow-subtle bg-white">
          <CardContent className="p-4 flex items-center justify-between">
            <div>
              <p className="text-xs font-medium text-slate-500">TMA Médio Geral</p>
              <p className="text-2xl font-black text-sky-600 mt-1">{overallAvgTMA} min</p>
              <p className="text-[10px] text-slate-400 mt-0.5">Tempo médio por chamado</p>
            </div>
            <div className="p-3 rounded-xl bg-sky-50 text-sky-600">
              <Clock className="h-6 w-6" />
            </div>
          </CardContent>
        </Card>

        <Card className="border-slate-200 shadow-subtle bg-white">
          <CardContent className="p-4 flex items-center justify-between">
            <div>
              <p className="text-xs font-medium text-slate-500">Contatos Evitáveis</p>
              <p className="text-2xl font-black text-rose-600 mt-1">{totalAvoidable}</p>
              <p className="text-[10px] text-slate-400 mt-0.5">
                {overallAvoidableRate}% do volume no período
              </p>
            </div>
            <div className="p-3 rounded-xl bg-rose-50 text-rose-600">
              <AlertOctagon className="h-6 w-6" />
            </div>
          </CardContent>
        </Card>

        <Card className="border-slate-200 shadow-subtle bg-white">
          <CardContent className="p-4 flex items-center justify-between">
            <div>
              <p className="text-xs font-medium text-slate-500">Satisfação / Sentimento</p>
              <p className="text-2xl font-black text-emerald-600 mt-1">{overallAvgSatisfaction}%</p>
              <p className="text-[10px] text-slate-400 mt-0.5 flex items-center gap-1">
                <Sparkles className="h-2.5 w-2.5 text-amber-500" />
                {totalAILogsAvailable > 0
                  ? `${totalAILogsAvailable} interações com IA`
                  : 'Score calibrado por resolução'}
              </p>
            </div>
            <div className="p-3 rounded-xl bg-emerald-50 text-emerald-600">
              <Smile className="h-6 w-6" />
            </div>
          </CardContent>
        </Card>
      </div>

      {/* Gráfico Recharts com Alternância de Visão */}
      <Card className="border-slate-200 shadow-subtle bg-white">
        <CardHeader className="pb-3 border-b border-slate-100 flex flex-col sm:flex-row sm:items-center sm:justify-between gap-3">
          <div>
            <CardTitle className="text-sm font-bold text-slate-900 flex items-center gap-2">
              <BarChart3 className="h-4 w-4 text-indigo-600" />
              Comparativo Gráfico por Motivo
            </CardTitle>
            <CardDescription className="text-xs text-slate-500">
              Alterne entre volume & TMA, chamados evitáveis ou satisfação estimada
            </CardDescription>
          </div>

          <div className="flex items-center gap-1 bg-slate-100 rounded-lg p-1 self-start sm:self-auto">
            <Button
              size="sm"
              variant={chartMetric === 'volume_tma' ? 'default' : 'ghost'}
              className={cn(
                'text-xs h-7 px-3 font-semibold transition-all',
                chartMetric === 'volume_tma'
                  ? 'bg-indigo-600 text-white shadow-xs hover:bg-indigo-700'
                  : 'text-slate-600 hover:text-slate-900',
              )}
              onClick={() => setChartMetric('volume_tma')}
            >
              Volume & TMA
            </Button>
            <Button
              size="sm"
              variant={chartMetric === 'avoidable_vs_total' ? 'default' : 'ghost'}
              className={cn(
                'text-xs h-7 px-3 font-semibold transition-all',
                chartMetric === 'avoidable_vs_total'
                  ? 'bg-indigo-600 text-white shadow-xs hover:bg-indigo-700'
                  : 'text-slate-600 hover:text-slate-900',
              )}
              onClick={() => setChartMetric('avoidable_vs_total')}
            >
              Evitáveis vs Total
            </Button>
            <Button
              size="sm"
              variant={chartMetric === 'satisfaction' ? 'default' : 'ghost'}
              className={cn(
                'text-xs h-7 px-3 font-semibold transition-all',
                chartMetric === 'satisfaction'
                  ? 'bg-indigo-600 text-white shadow-xs hover:bg-indigo-700'
                  : 'text-slate-600 hover:text-slate-900',
              )}
              onClick={() => setChartMetric('satisfaction')}
            >
              Satisfação (%)
            </Button>
          </div>
        </CardHeader>

        <CardContent className="p-4 pt-6">
          {chartData.length > 0 ? (
            <div className="h-[360px] w-full">
              <ResponsiveContainer width="100%" height="100%">
                <BarChart data={chartData} margin={{ top: 10, right: 20, left: 0, bottom: 45 }}>
                  <CartesianGrid strokeDasharray="3 3" vertical={false} stroke="#f1f5f9" />
                  <XAxis
                    dataKey="motivo"
                    tickLine={false}
                    axisLine={{ stroke: '#cbd5e1' }}
                    tick={{ fontSize: 11, fill: '#475569', fontWeight: 600 }}
                    interval={0}
                    angle={-25}
                    textAnchor="end"
                    height={55}
                  />
                  <YAxis
                    tickLine={false}
                    axisLine={{ stroke: '#cbd5e1' }}
                    tick={{ fontSize: 11, fill: '#64748b' }}
                  />
                  <RechartsTooltip
                    contentStyle={{
                      backgroundColor: '#ffffff',
                      borderColor: '#e2e8f0',
                      borderRadius: '8px',
                      fontSize: '12px',
                      boxShadow: '0 4px 6px -1px rgb(0 0 0 / 0.1)',
                    }}
                  />
                  <Legend wrapperStyle={{ fontSize: 11, paddingTop: 10 }} />

                  {chartMetric === 'volume_tma' && (
                    <>
                      <Bar
                        dataKey="Atendimentos"
                        name="Atendimentos (Volume)"
                        fill="#4f46e5"
                        radius={[4, 4, 0, 0]}
                        maxBarSize={38}
                      />
                      <Bar
                        dataKey="TMA (min)"
                        name="TMA (min)"
                        fill="#0ea5e9"
                        radius={[4, 4, 0, 0]}
                        maxBarSize={38}
                      />
                    </>
                  )}

                  {chartMetric === 'avoidable_vs_total' && (
                    <>
                      <Bar
                        dataKey="Atendimentos"
                        name="Total de Chamados"
                        fill="#6366f1"
                        radius={[4, 4, 0, 0]}
                        maxBarSize={38}
                      />
                      <Bar
                        dataKey="Evitáveis"
                        name="Chamados Evitáveis"
                        fill="#f43f5e"
                        radius={[4, 4, 0, 0]}
                        maxBarSize={38}
                      />
                    </>
                  )}

                  {chartMetric === 'satisfaction' && (
                    <Bar
                      dataKey="Satisfação (%)"
                      name="Satisfação (%)"
                      fill="#10b981"
                      radius={[4, 4, 0, 0]}
                      maxBarSize={48}
                    />
                  )}
                </BarChart>
              </ResponsiveContainer>
            </div>
          ) : (
            <div className="h-[280px] flex flex-col items-center justify-center text-slate-400 gap-2">
              <PieChartIcon className="h-8 w-8 text-slate-300" />
              <p className="text-xs">Nenhum dado disponível para visualização no gráfico.</p>
            </div>
          )}
        </CardContent>
      </Card>

      {/* Tabela Detalhada com Ordenação Interativa */}
      <Card className="border-slate-200 shadow-subtle bg-white overflow-hidden">
        <CardHeader className="pb-3 border-b border-slate-100 flex flex-col sm:flex-row sm:items-center sm:justify-between gap-2">
          <div>
            <CardTitle className="text-sm font-bold text-slate-900 flex items-center gap-2">
              <Filter className="h-4 w-4 text-indigo-600" />
              Detalhamento por Motivo de Contato
            </CardTitle>
            <CardDescription className="text-xs text-slate-500">
              Clique no cabeçalho das colunas para ordenar por volume, TMA, evitáveis ou satisfação
            </CardDescription>
          </div>
          <Badge variant="outline" className="text-[11px] font-medium text-slate-600 bg-slate-50">
            {analysisData.length} motivo(s) listado(s)
          </Badge>
        </CardHeader>

        <CardContent className="p-0">
          <div className="overflow-x-auto">
            <Table>
              <TableHeader className="bg-slate-50/80">
                <TableRow>
                  <TableHead
                    onClick={() => handleSort('reason')}
                    className="font-bold text-xs text-slate-700 cursor-pointer hover:bg-slate-100 transition-colors select-none"
                  >
                    <div className="flex items-center gap-1">
                      <span>Motivo de Contato</span>
                      {renderSortIndicator('reason')}
                    </div>
                  </TableHead>

                  <TableHead
                    onClick={() => handleSort('totalCount')}
                    className="font-bold text-xs text-slate-700 text-right cursor-pointer hover:bg-slate-100 transition-colors select-none"
                  >
                    <div className="flex items-center justify-end gap-1">
                      <span>Atendimentos</span>
                      {renderSortIndicator('totalCount')}
                    </div>
                  </TableHead>

                  <TableHead
                    onClick={() => handleSort('avgTMA')}
                    className="font-bold text-xs text-slate-700 text-right cursor-pointer hover:bg-slate-100 transition-colors select-none"
                  >
                    <div className="flex items-center justify-end gap-1">
                      <span>TMA Médio</span>
                      {renderSortIndicator('avgTMA')}
                    </div>
                  </TableHead>

                  <TableHead
                    onClick={() => handleSort('avoidableCount')}
                    className="font-bold text-xs text-slate-700 text-right cursor-pointer hover:bg-slate-100 transition-colors select-none"
                  >
                    <div className="flex items-center justify-end gap-1">
                      <span>Evitáveis (Qtd)</span>
                      {renderSortIndicator('avoidableCount')}
                    </div>
                  </TableHead>

                  <TableHead
                    onClick={() => handleSort('avoidableRate')}
                    className="font-bold text-xs text-slate-700 text-right cursor-pointer hover:bg-slate-100 transition-colors select-none"
                  >
                    <div className="flex items-center justify-end gap-1">
                      <span>Taxa Evitável</span>
                      {renderSortIndicator('avoidableRate')}
                    </div>
                  </TableHead>

                  <TableHead
                    onClick={() => handleSort('avgSatisfaction')}
                    className="font-bold text-xs text-slate-700 text-right cursor-pointer hover:bg-slate-100 transition-colors select-none"
                  >
                    <div className="flex items-center justify-end gap-1">
                      <span>Satisfação</span>
                      {renderSortIndicator('avgSatisfaction')}
                    </div>
                  </TableHead>

                  <TableHead className="font-bold text-xs text-slate-700 text-center">
                    Logs IA / Status
                  </TableHead>
                </TableRow>
              </TableHeader>

              <TableBody>
                {analysisData.map((row) => {
                  const isHighAvoidable = row.avoidableRate >= 30
                  const isVeryHighAvoidable = row.avoidableRate >= 50
                  const isGoodSatisfaction = row.avgSatisfaction >= 80

                  return (
                    <TableRow key={row.reason} className="hover:bg-slate-50/80 text-xs">
                      <TableCell className="font-bold text-slate-900">
                        <div className="flex items-center gap-2">
                          <span
                            className={cn(
                              'h-2 w-2 rounded-full shrink-0',
                              isVeryHighAvoidable
                                ? 'bg-rose-500'
                                : isHighAvoidable
                                  ? 'bg-amber-500'
                                  : 'bg-indigo-600',
                            )}
                          />
                          <span>{row.reason}</span>
                        </div>
                      </TableCell>

                      <TableCell className="text-right font-bold text-slate-900">
                        {row.totalCount}
                      </TableCell>

                      <TableCell className="text-right font-semibold text-sky-700">
                        {row.avgTMA} min
                      </TableCell>

                      <TableCell className="text-right">
                        {row.avoidableCount > 0 ? (
                          <Badge
                            variant="outline"
                            className="text-rose-700 bg-rose-50 border-rose-200 text-[10px] font-semibold"
                          >
                            {row.avoidableCount}
                          </Badge>
                        ) : (
                          <span className="text-slate-400 font-normal">0</span>
                        )}
                      </TableCell>

                      <TableCell className="text-right font-bold">
                        <span
                          className={cn(
                            isVeryHighAvoidable
                              ? 'text-rose-600 font-extrabold'
                              : isHighAvoidable
                                ? 'text-amber-600 font-bold'
                                : 'text-slate-600',
                          )}
                        >
                          {row.avoidableRate}%
                        </span>
                      </TableCell>

                      <TableCell className="text-right">
                        <Badge
                          variant="outline"
                          className={cn(
                            'text-[10px] font-bold px-2 py-0.5',
                            isGoodSatisfaction
                              ? 'bg-emerald-50 text-emerald-700 border-emerald-200'
                              : 'bg-amber-50 text-amber-700 border-amber-200',
                          )}
                        >
                          {row.avgSatisfaction}%
                        </Badge>
                      </TableCell>

                      <TableCell className="text-center">
                        <div className="flex items-center justify-center gap-1.5 text-slate-500">
                          {row.hasAILogsCount > 0 ? (
                            <Badge
                              variant="secondary"
                              className="bg-indigo-50 text-indigo-700 border border-indigo-200 text-[9px] gap-1 px-1.5"
                              title={`${row.hasAILogsCount} atendimento(s) possuem logs de IA vinculados`}
                            >
                              <Sparkles className="h-2.5 w-2.5" />
                              {row.hasAILogsCount} IA
                            </Badge>
                          ) : (
                            <Badge
                              variant="outline"
                              className="text-[9px] text-slate-500 bg-slate-50 gap-1 px-1.5"
                              title={`${row.concludedCount} resolvidos de ${row.totalCount}`}
                            >
                              <CheckCircle2 className="h-2.5 w-2.5 text-slate-400" />
                              {row.concludedCount}/{row.totalCount} res.
                            </Badge>
                          )}
                        </div>
                      </TableCell>
                    </TableRow>
                  )
                })}

                {analysisData.length === 0 && (
                  <TableRow>
                    <TableCell colSpan={7} className="text-center py-10 text-xs text-slate-400">
                      Nenhum atendimento registrado no período selecionado.
                    </TableCell>
                  </TableRow>
                )}
              </TableBody>
            </Table>
          </div>
        </CardContent>
      </Card>
    </div>
  )
}
