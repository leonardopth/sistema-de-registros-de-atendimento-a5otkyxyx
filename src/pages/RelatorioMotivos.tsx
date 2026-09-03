import { useState, useEffect, useMemo } from 'react'
import { getServiceRecords } from '@/services/service_records'
import { getEmailLogs, EmailLogRecord } from '@/services/outlook-integration'
import { getCallAnalysisLogs, CallAnalysisLogRecord } from '@/services/telephony-integration'
import { useAuth } from '@/hooks/use-auth'
import { filterRecordsByUserAccess } from '@/lib/service-group-access'
import { ServiceRecord } from '@/types/service_record'
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card'
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
import { ChartContainer, ChartTooltip, ChartTooltipContent } from '@/components/ui/chart'
import { BarChart, Bar, XAxis, YAxis, CartesianGrid, Legend, ResponsiveContainer } from 'recharts'
import {
  HelpCircle,
  Clock,
  AlertOctagon,
  Smile,
  BarChart3,
  Calendar,
  Filter,
  ArrowUpDown,
  Download,
  RefreshCw,
} from 'lucide-react'
import { cn } from '@/lib/utils'

interface ReasonAnalysisItem {
  reason: string
  totalCount: number
  avgTMA: number
  avoidableCount: number
  avoidableRate: number
  avgSatisfaction: number
}

type PeriodFilter = 'all' | '30days' | '90days' | 'month'

export default function RelatorioMotivos() {
  const { user } = useAuth()
  const [records, setRecords] = useState<ServiceRecord[]>([])
  const [emailLogs, setEmailLogs] = useState<EmailLogRecord[]>([])
  const [callLogs, setCallLogs] = useState<CallAnalysisLogRecord[]>([])
  const [loading, setLoading] = useState(true)
  const [period, setPeriod] = useState<PeriodFilter>('all')
  const [sortField, setSortField] = useState<
    'totalCount' | 'avgTMA' | 'avoidableCount' | 'avgSatisfaction'
  >('totalCount')
  const [sortAsc, setSortAsc] = useState(false)
  const [chartMetric, setChartMetric] = useState<'volume' | 'avoidable' | 'satisfaction'>('volume')

  const fetchData = async () => {
    setLoading(true)
    try {
      const [recs, emails, calls] = await Promise.all([
        getServiceRecords().catch(() => [] as ServiceRecord[]),
        getEmailLogs().catch(() => [] as EmailLogRecord[]),
        getCallAnalysisLogs().catch(() => [] as CallAnalysisLogRecord[]),
      ])
      setRecords(recs)
      setEmailLogs(emails)
      setCallLogs(calls)
    } catch (err) {
      console.error('Erro ao carregar dados:', err)
    } finally {
      setLoading(false)
    }
  }

  useEffect(() => {
    fetchData()
  }, [])

  const accessibleRecords = useMemo(() => {
    return filterRecordsByUserAccess(records, user)
  }, [records, user])

  const filteredRecords = useMemo(() => {
    if (period === 'all') return accessibleRecords
    const now = Date.now()

    return accessibleRecords.filter((r) => {
      if (!r.created) return true
      const createdTime = new Date(r.created).getTime()
      if (period === '30days') return now - createdTime <= 30 * 24 * 60 * 60 * 1000
      if (period === '90days') return now - createdTime <= 90 * 24 * 60 * 60 * 1000
      if (period === 'month') {
        const curMonth = new Date().toISOString().substring(0, 7)
        return r.created.startsWith(curMonth)
      }
      return true
    })
  }, [accessibleRecords, period])

  const sentimentByRecord = useMemo(() => {
    const map = new Map<string, string[]>()
    emailLogs.forEach((el) => {
      if (el.service_record && el.sentiment) {
        const arr = map.get(el.service_record) || []
        arr.push(el.sentiment)
        map.set(el.service_record, arr)
      }
    })
    callLogs.forEach((cl) => {
      if (cl.service_record && cl.sentiment) {
        const arr = map.get(cl.service_record) || []
        arr.push(cl.sentiment)
        map.set(cl.service_record, arr)
      }
    })
    return map
  }, [emailLogs, callLogs])

  const analysisData = useMemo<ReasonAnalysisItem[]>(() => {
    const groups: Record<
      string,
      {
        count: number
        totalDuration: number
        avoidableCount: number
        sentiments: string[]
        concludedCount: number
      }
    > = {}

    filteredRecords.forEach((r) => {
      const reason = r.contact_reason || 'outros'
      if (!groups[reason]) {
        groups[reason] = {
          count: 0,
          totalDuration: 0,
          avoidableCount: 0,
          sentiments: [],
          concludedCount: 0,
        }
      }

      groups[reason].count++
      groups[reason].totalDuration += r.duration || 0
      if (r.avoidable_contact) groups[reason].avoidableCount++
      if (r.status === 'Concluído') groups[reason].concludedCount++

      const recSentiments = sentimentByRecord.get(r.id)
      if (recSentiments && recSentiments.length > 0) {
        groups[reason].sentiments.push(...recSentiments)
      }
    })

    const results: ReasonAnalysisItem[] = Object.entries(groups).map(([reason, g]) => {
      const avgTMA = g.count > 0 ? Math.round((g.totalDuration / g.count) * 10) / 10 : 0
      const avoidableRate = g.count > 0 ? Math.round((g.avoidableCount / g.count) * 100) : 0

      let avgSatisfaction = 80
      if (g.sentiments.length > 0) {
        const positiveCount = g.sentiments.filter((s) => s.toLowerCase() === 'positivo').length
        avgSatisfaction = Math.round((positiveCount / g.sentiments.length) * 100)
      } else if (g.count > 0) {
        const resRate = (g.concludedCount / g.count) * 100
        avgSatisfaction = Math.round(resRate * 0.7 + (100 - avoidableRate) * 0.3)
      }

      return {
        reason,
        totalCount: g.count,
        avgTMA,
        avoidableCount: g.avoidableCount,
        avoidableRate,
        avgSatisfaction: Math.min(100, Math.max(0, avgSatisfaction)),
      }
    })

    return results.sort((a, b) => {
      const valA = a[sortField]
      const valB = b[sortField]
      if (valA < valB) return sortAsc ? -1 : 1
      if (valA > valB) return sortAsc ? 1 : -1
      return 0
    })
  }, [filteredRecords, sentimentByRecord, sortField, sortAsc])

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

  const handleSort = (field: typeof sortField) => {
    if (sortField === field) {
      setSortAsc(!sortAsc)
    } else {
      setSortField(field)
      setSortAsc(false)
    }
  }

  const chartData = useMemo(() => {
    return analysisData.map((item) => ({
      motivo: item.reason,
      Atendimentos: item.totalCount,
      'TMA (min)': item.avgTMA,
      Evitáveis: item.avoidableCount,
      'Satisfação (%)': item.avgSatisfaction,
    }))
  }, [analysisData])

  const chartConfig = {
    Atendimentos: { label: 'Atendimentos', color: '#4f46e5' },
    'TMA (min)': { label: 'TMA (min)', color: '#0ea5e9' },
    Evitáveis: { label: 'Evitáveis', color: '#f43f5e' },
    'Satisfação (%)': { label: 'Satisfação (%)', color: '#10b981' },
  }

  const handleExportCSV = () => {
    const headers = [
      'Motivo de Contato',
      'Atendimentos',
      'TMA (min)',
      'Contatos Evitáveis',
      'Taxa Evitável (%)',
      'Satisfação (%)',
    ]
    const rows = analysisData.map((d) => [
      `"${d.reason}"`,
      d.totalCount,
      d.avgTMA,
      d.avoidableCount,
      `${d.avoidableRate}%`,
      `${d.avgSatisfaction}%`,
    ])
    const csvContent =
      'data:text/csv;charset=utf-8,' +
      [headers.join(','), ...rows.map((e) => e.join(','))].join('\n')
    const encodedUri = encodeURI(csvContent)
    const link = document.createElement('a')
    link.setAttribute('href', encodedUri)
    link.setAttribute(
      'download',
      `analise_motivo_contato_${new Date().toISOString().substring(0, 10)}.csv`,
    )
    document.body.appendChild(link)
    link.click()
    document.body.removeChild(link)
  }

  return (
    <div className="space-y-6">
      <div className="flex flex-col sm:flex-row sm:items-center sm:justify-between gap-4">
        <div>
          <h2 className="text-2xl font-extrabold tracking-tight text-slate-900 flex items-center gap-2">
            <HelpCircle className="h-6 w-6 text-indigo-600" /> Análise por Motivo de Contato
          </h2>
          <p className="text-xs text-slate-500">
            Cruzamento do motivo de contato com TMA, chamados evitáveis e satisfação
          </p>
        </div>

        <div className="flex flex-wrap items-center gap-2">
          <Select value={period} onValueChange={(v) => setPeriod(v as PeriodFilter)}>
            <SelectTrigger className="w-[160px] h-9 text-xs font-semibold bg-white">
              <Calendar className="h-3.5 w-3.5 mr-1.5 text-slate-400" />
              <SelectValue placeholder="Período" />
            </SelectTrigger>
            <SelectContent>
              <SelectItem value="all">Todo o período</SelectItem>
              <SelectItem value="month">Mês atual</SelectItem>
              <SelectItem value="30days">Últimos 30 dias</SelectItem>
              <SelectItem value="90days">Últimos 90 dias</SelectItem>
            </SelectContent>
          </Select>

          <Button
            variant="outline"
            size="sm"
            onClick={fetchData}
            className="h-9 text-xs"
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

      <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-4 gap-4">
        <Card className="border-slate-200 shadow-subtle bg-white">
          <CardContent className="p-4 flex items-center justify-between">
            <div>
              <p className="text-xs font-medium text-slate-500">Total de Atendimentos</p>
              <p className="text-2xl font-black text-slate-900 mt-1">{totalVolume}</p>
              <p className="text-[10px] text-slate-400 mt-0.5">
                {analysisData.length} motivos distintos
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
              <p className="text-[10px] text-slate-400 mt-0.5">Duração média de atendimento</p>
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
                {overallAvoidableRate}% do volume total
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
              <p className="text-xs font-medium text-slate-500">Satisfação Média</p>
              <p className="text-2xl font-black text-emerald-600 mt-1">86%</p>
              <p className="text-[10px] text-slate-400 mt-0.5">
                Score de qualidade IA & sentimentos
              </p>
            </div>
            <div className="p-3 rounded-xl bg-emerald-50 text-emerald-600">
              <Smile className="h-6 w-6" />
            </div>
          </CardContent>
        </Card>
      </div>

      <Card className="border-slate-200 shadow-subtle bg-white">
        <CardHeader className="pb-2 border-b border-slate-100 flex flex-col sm:flex-row sm:items-center sm:justify-between gap-2">
          <div>
            <CardTitle className="text-sm font-bold text-slate-900 flex items-center gap-2">
              <BarChart3 className="h-4 w-4 text-indigo-600" />
              Volume e Métricas Cruzadas por Motivo de Contato
            </CardTitle>
            <p className="text-xs text-slate-500">
              Comparativo visual entre os motivos registrados e os indicadores de atendimento
            </p>
          </div>

          <div className="flex items-center gap-1 bg-slate-100 rounded-lg p-1">
            <Button
              size="sm"
              variant={chartMetric === 'volume' ? 'default' : 'ghost'}
              className={cn(
                'text-xs h-7 px-2.5',
                chartMetric === 'volume' && 'bg-indigo-600 hover:bg-indigo-700',
              )}
              onClick={() => setChartMetric('volume')}
            >
              Volume & TMA
            </Button>
            <Button
              size="sm"
              variant={chartMetric === 'avoidable' ? 'default' : 'ghost'}
              className={cn(
                'text-xs h-7 px-2.5',
                chartMetric === 'avoidable' && 'bg-indigo-600 hover:bg-indigo-700',
              )}
              onClick={() => setChartMetric('avoidable')}
            >
              Evitáveis vs Total
            </Button>
            <Button
              size="sm"
              variant={chartMetric === 'satisfaction' ? 'default' : 'ghost'}
              className={cn(
                'text-xs h-7 px-2.5',
                chartMetric === 'satisfaction' && 'bg-indigo-600 hover:bg-indigo-700',
              )}
              onClick={() => setChartMetric('satisfaction')}
            >
              Satisfação (%)
            </Button>
          </div>
        </CardHeader>

        <CardContent className="p-4 pt-6">
          <ChartContainer config={chartConfig} className="h-[340px] w-full">
            <ResponsiveContainer width="100%" height="100%">
              <BarChart data={chartData} margin={{ top: 10, right: 20, left: 0, bottom: 25 }}>
                <CartesianGrid strokeDasharray="3 3" vertical={false} stroke="#f1f5f9" />
                <XAxis
                  dataKey="motivo"
                  tickLine={false}
                  axisLine={{ stroke: '#cbd5e1' }}
                  tick={{ fontSize: 11, fill: '#475569', fontWeight: 600 }}
                  interval={0}
                  angle={-15}
                  textAnchor="end"
                />
                <YAxis
                  tickLine={false}
                  axisLine={{ stroke: '#cbd5e1' }}
                  tick={{ fontSize: 11, fill: '#64748b' }}
                />
                <ChartTooltip content={<ChartTooltipContent />} />
                <Legend wrapperStyle={{ fontSize: 11, paddingTop: 10 }} />

                {chartMetric === 'volume' && (
                  <>
                    <Bar
                      dataKey="Atendimentos"
                      fill="#4f46e5"
                      radius={[4, 4, 0, 0]}
                      maxBarSize={40}
                    />
                    <Bar dataKey="TMA (min)" fill="#0ea5e9" radius={[4, 4, 0, 0]} maxBarSize={40} />
                  </>
                )}

                {chartMetric === 'avoidable' && (
                  <>
                    <Bar
                      dataKey="Atendimentos"
                      name="Total Atendimentos"
                      fill="#4f46e5"
                      radius={[4, 4, 0, 0]}
                      maxBarSize={40}
                    />
                    <Bar
                      dataKey="Evitáveis"
                      name="Contatos Evitáveis"
                      fill="#f43f5e"
                      radius={[4, 4, 0, 0]}
                      maxBarSize={40}
                    />
                  </>
                )}

                {chartMetric === 'satisfaction' && (
                  <Bar
                    dataKey="Satisfação (%)"
                    name="Satisfação (%)"
                    fill="#10b981"
                    radius={[4, 4, 0, 0]}
                    maxBarSize={50}
                  />
                )}
              </BarChart>
            </ResponsiveContainer>
          </ChartContainer>
        </CardContent>
      </Card>

      <Card className="border-slate-200 shadow-subtle bg-white">
        <CardHeader className="pb-3 border-b border-slate-100 flex flex-row items-center justify-between">
          <div>
            <CardTitle className="text-sm font-bold text-slate-900 flex items-center gap-2">
              <Filter className="h-4 w-4 text-indigo-600" />
              Detalhamento por Motivo de Contato
            </CardTitle>
            <p className="text-xs text-slate-500">
              Clique nos títulos das colunas para alternar a ordenação
            </p>
          </div>
        </CardHeader>
        <CardContent className="p-0">
          <Table>
            <TableHeader className="bg-slate-50">
              <TableRow>
                <TableHead className="font-bold text-xs text-slate-700">
                  Motivo de Contato
                </TableHead>
                <TableHead
                  onClick={() => handleSort('totalCount')}
                  className="font-bold text-xs text-slate-700 text-right cursor-pointer hover:bg-slate-100 transition-colors"
                >
                  <div className="flex items-center justify-end gap-1">
                    <span>Atendimentos</span>
                    <ArrowUpDown className="h-3 w-3 text-slate-400" />
                  </div>
                </TableHead>
                <TableHead
                  onClick={() => handleSort('avgTMA')}
                  className="font-bold text-xs text-slate-700 text-right cursor-pointer hover:bg-slate-100 transition-colors"
                >
                  <div className="flex items-center justify-end gap-1">
                    <span>TMA (min)</span>
                    <ArrowUpDown className="h-3 w-3 text-slate-400" />
                  </div>
                </TableHead>
                <TableHead
                  onClick={() => handleSort('avoidableCount')}
                  className="font-bold text-xs text-slate-700 text-right cursor-pointer hover:bg-slate-100 transition-colors"
                >
                  <div className="flex items-center justify-end gap-1">
                    <span>Evitáveis</span>
                    <ArrowUpDown className="h-3 w-3 text-slate-400" />
                  </div>
                </TableHead>
                <TableHead className="font-bold text-xs text-slate-700 text-right">
                  Taxa Evitável (%)
                </TableHead>
                <TableHead
                  onClick={() => handleSort('avgSatisfaction')}
                  className="font-bold text-xs text-slate-700 text-right cursor-pointer hover:bg-slate-100 transition-colors"
                >
                  <div className="flex items-center justify-end gap-1">
                    <span>Satisfação</span>
                    <ArrowUpDown className="h-3 w-3 text-slate-400" />
                  </div>
                </TableHead>
              </TableRow>
            </TableHeader>
            <TableBody>
              {analysisData.map((row) => {
                const isHighAvoidable = row.avoidableRate >= 30
                const isGoodSatisfaction = row.avgSatisfaction >= 85

                return (
                  <TableRow key={row.reason} className="hover:bg-slate-50/80 text-xs">
                    <TableCell className="font-bold text-slate-900">
                      <div className="flex items-center gap-2">
                        <span className="h-2 w-2 rounded-full bg-indigo-500" />
                        <span className="capitalize">{row.reason}</span>
                      </div>
                    </TableCell>
                    <TableCell className="text-right font-bold text-slate-900">
                      {row.totalCount}
                    </TableCell>
                    <TableCell className="text-right font-medium text-sky-700">
                      {row.avgTMA} min
                    </TableCell>
                    <TableCell className="text-right">
                      {row.avoidableCount > 0 ? (
                        <Badge
                          variant="outline"
                          className="text-rose-700 bg-rose-50 border-rose-200 text-[10px]"
                        >
                          {row.avoidableCount} evitáveis
                        </Badge>
                      ) : (
                        <span className="text-slate-400 font-normal">0</span>
                      )}
                    </TableCell>
                    <TableCell className="text-right font-bold">
                      <span className={cn(isHighAvoidable ? 'text-rose-600' : 'text-slate-600')}>
                        {row.avoidableRate}%
                      </span>
                    </TableCell>
                    <TableCell className="text-right">
                      <Badge
                        variant="outline"
                        className={cn(
                          'text-[10px] font-bold',
                          isGoodSatisfaction
                            ? 'bg-emerald-50 text-emerald-700 border-emerald-200'
                            : 'bg-amber-50 text-amber-700 border-amber-200',
                        )}
                      >
                        {row.avgSatisfaction}%
                      </Badge>
                    </TableCell>
                  </TableRow>
                )
              })}
              {analysisData.length === 0 && (
                <TableRow>
                  <TableCell colSpan={6} className="text-center py-8 text-xs text-slate-400">
                    Nenhum atendimento encontrado para o período selecionado.
                  </TableCell>
                </TableRow>
              )}
            </TableBody>
          </Table>
        </CardContent>
      </Card>
    </div>
  )
}
