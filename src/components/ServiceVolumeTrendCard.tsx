import { useMemo, useState } from 'react'
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card'
import { Badge } from '@/components/ui/badge'
import { Button } from '@/components/ui/button'
import {
  ChartContainer,
  ChartTooltip,
  ChartTooltipContent,
  type ChartConfig,
} from '@/components/ui/chart'
import {
  ComposedChart,
  Bar,
  Line,
  XAxis,
  YAxis,
  CartesianGrid,
  Legend,
  ResponsiveContainer,
} from 'recharts'
import type { ServiceRecord } from '@/types/service_record'
import { getGMT3DateString, TIMEZONE } from '@/lib/timezone'
import {
  TrendingUp,
  TrendingDown,
  Target,
  Sparkles,
  BarChart3,
  Calendar,
  AlertCircle,
  CheckCircle2,
} from 'lucide-react'

interface ServiceVolumeTrendCardProps {
  records: ServiceRecord[]
  title?: string
  subtitle?: string
  targetMonthly?: number
  className?: string
}

export function ServiceVolumeTrendCard({
  records,
  title = 'Volume de Atendimentos & Linha de Tendência',
  subtitle = 'Evolução diária com projeção do ritmo para atingimento da meta no fim do mês',
  targetMonthly,
  className = '',
}: ServiceVolumeTrendCardProps) {
  const [showTrendLine, setShowTrendLine] = useState(true)

  // Data atual e mês em GMT-3
  const now = useMemo(() => new Date(), [])
  const { currentYear, currentMonth, currentDay, daysInMonth } = useMemo(() => {
    const formatter = new Intl.DateTimeFormat('en-CA', {
      timeZone: TIMEZONE,
      year: 'numeric',
      month: '2-digit',
      day: '2-digit',
    })
    const parts = formatter.formatToParts(now)
    const y = parseInt(parts.find((p) => p.type === 'year')?.value || '2025', 10)
    const m = parseInt(parts.find((p) => p.type === 'month')?.value || '1', 10)
    const d = parseInt(parts.find((p) => p.type === 'day')?.value || '1', 10)
    const totalDays = new Date(Date.UTC(y, m, 0)).getUTCDate()
    return {
      currentYear: y,
      currentMonth: m,
      currentDay: Math.max(1, d),
      daysInMonth: totalDays,
    }
  }, [now])

  const monthPrefix = `${currentYear}-${String(currentMonth).padStart(2, '0')}`

  // Atendimentos do mês corrente
  const monthRecords = useMemo(() => {
    return records.filter((r) => {
      const recDate = getGMT3DateString(r.created)
      return recDate ? recDate.startsWith(monthPrefix) : false
    })
  }, [records, monthPrefix])

  // Contagem por dia até o dia atual
  const dailyData = useMemo(() => {
    const map = new Map<number, number>()
    for (let day = 1; day <= currentDay; day++) {
      map.set(day, 0)
    }

    monthRecords.forEach((r) => {
      const recDate = getGMT3DateString(r.created)
      if (recDate && recDate.startsWith(monthPrefix)) {
        const day = parseInt(recDate.split('-')[2], 10)
        if (day >= 1 && day <= currentDay) {
          map.set(day, (map.get(day) || 0) + 1)
        }
      }
    })

    // Montar pontos e calcular linha de regressão linear simples (y = a*x + b)
    const points: { day: number; count: number }[] = []
    let sumX = 0
    let sumY = 0
    let sumXY = 0
    let sumXX = 0
    const n = currentDay

    for (let day = 1; day <= currentDay; day++) {
      const c = map.get(day) || 0
      points.push({ day, count: c })
      sumX += day
      sumY += c
      sumXY += day * c
      sumXX += day * day
    }

    const denominator = n * sumXX - sumX * sumX
    const slope = denominator !== 0 ? (n * sumXY - sumX * sumY) / denominator : 0
    const intercept = n > 0 ? (sumY - slope * sumX) / n : 0

    return points.map((p) => {
      const trendVal = Math.max(0, Math.round((slope * p.day + intercept) * 10) / 10)
      return {
        dia: `${String(p.day).padStart(2, '0')}/${String(currentMonth).padStart(2, '0')}`,
        atendimentos: p.count,
        tendencia: trendVal,
      }
    })
  }, [monthRecords, currentDay, currentMonth, monthPrefix])

  // Cálculos de Projeção de Meta
  const projection = useMemo(() => {
    const currentTotal = monthRecords.length
    // Média diária do mês corrente até hoje
    const dailyPace = currentDay > 0 ? currentTotal / currentDay : 0
    // Projeção estimada para o fim do mês
    const projectedTotal = Math.round(dailyPace * daysInMonth)

    // Se houver meta definida ou padrão
    const effectiveTarget = targetMonthly && targetMonthly > 0 ? targetMonthly : null

    const projectedPct = effectiveTarget
      ? Math.round((projectedTotal / effectiveTarget) * 100)
      : null

    const currentPct = effectiveTarget ? Math.round((currentTotal / effectiveTarget) * 100) : null

    const isHit = projectedPct !== null ? projectedPct >= 100 : projectedTotal > 0
    const isWarning = projectedPct !== null ? projectedPct >= 70 && projectedPct < 100 : false
    const isDanger = projectedPct !== null ? projectedPct < 70 : false

    return {
      currentTotal,
      dailyPace: Math.round(dailyPace * 10) / 10,
      projectedTotal,
      projectedPct,
      currentPct,
      effectiveTarget,
      isHit,
      isWarning,
      isDanger,
      remainingDays: Math.max(0, daysInMonth - currentDay),
    }
  }, [monthRecords, currentDay, daysInMonth, targetMonthly])

  const chartConfig: ChartConfig = {
    atendimentos: {
      label: 'Volume Real',
      color: '#6366f1',
    },
    tendencia: {
      label: 'Linha de Tendência',
      color: '#f59e0b',
    },
  }

  return (
    <div className={`space-y-4 ${className}`}>
      {/* Card Principal: Projeção de Meta + Ritmo */}
      <div className="grid grid-cols-1 md:grid-cols-3 gap-4">
        {/* Card de Projeção em destaque */}
        <Card
          className={`border transition-all md:col-span-2 shadow-subtle ${
            projection.isHit
              ? 'bg-gradient-to-br from-emerald-500/10 via-emerald-500/5 to-white border-emerald-300'
              : projection.isWarning
                ? 'bg-gradient-to-br from-amber-500/10 via-amber-500/5 to-white border-amber-300'
                : 'bg-gradient-to-br from-rose-500/10 via-rose-500/5 to-white border-rose-300'
          }`}
        >
          <CardContent className="p-4 sm:p-5 flex flex-col justify-between h-full space-y-4">
            <div className="flex items-start justify-between gap-3">
              <div>
                <div className="flex items-center gap-2">
                  <Badge
                    variant="outline"
                    className={`text-xs font-bold uppercase tracking-wider px-2 py-0.5 ${
                      projection.isHit
                        ? 'bg-emerald-100 text-emerald-800 border-emerald-300'
                        : projection.isWarning
                          ? 'bg-amber-100 text-amber-800 border-amber-300'
                          : 'bg-rose-100 text-rose-800 border-rose-300'
                    }`}
                  >
                    <Sparkles className="h-3 w-3 mr-1 inline" />
                    Projeção de Meta do Mês
                  </Badge>
                  <span className="text-[11px] text-slate-500">
                    Dia {currentDay} de {daysInMonth} ({projection.remainingDays} dia(s)
                    restante(s))
                  </span>
                </div>

                <div className="mt-2.5">
                  <p className="text-sm font-semibold text-slate-700">
                    No ritmo atual do mês corrente:
                  </p>
                  <div className="flex items-baseline gap-2 mt-1">
                    <span
                      className={`text-2xl sm:text-3xl font-extrabold ${
                        projection.isHit
                          ? 'text-emerald-700'
                          : projection.isWarning
                            ? 'text-amber-700'
                            : 'text-rose-700'
                      }`}
                    >
                      {projection.projectedPct !== null
                        ? `~${projection.projectedPct}% da meta`
                        : `~${projection.projectedTotal} atendimentos`}
                    </span>
                    <span className="text-xs text-slate-500">
                      estimado(s) até o fim do mês ({projection.projectedTotal} atendimentos)
                    </span>
                  </div>
                </div>
              </div>

              <div
                className={`p-3 rounded-2xl shrink-0 ${
                  projection.isHit
                    ? 'bg-emerald-100 text-emerald-700'
                    : projection.isWarning
                      ? 'bg-amber-100 text-amber-700'
                      : 'bg-rose-100 text-rose-700'
                }`}
              >
                {projection.isHit ? (
                  <TrendingUp className="h-6 w-6" />
                ) : (
                  <TrendingDown className="h-6 w-6" />
                )}
              </div>
            </div>

            {/* Explicação contextual e barra de progresso visual */}
            <div className="space-y-2 pt-2 border-t border-slate-100/80">
              <div className="flex items-center justify-between text-xs">
                <span className="text-slate-600 font-medium">
                  Volume atual: <strong>{projection.currentTotal}</strong>{' '}
                  {projection.effectiveTarget ? `de ${projection.effectiveTarget} da meta` : ''}
                </span>
                <span
                  className={`font-bold flex items-center gap-1 ${
                    projection.isHit
                      ? 'text-emerald-700'
                      : projection.isWarning
                        ? 'text-amber-700'
                        : 'text-rose-700'
                  }`}
                >
                  {projection.isHit ? (
                    <>
                      <CheckCircle2 className="h-3.5 w-3.5" /> Meta com tendência de superação
                    </>
                  ) : (
                    <>
                      <AlertCircle className="h-3.5 w-3.5" /> Abaixo do ritmo esperado
                    </>
                  )}
                </span>
              </div>

              {projection.effectiveTarget && (
                <div className="w-full bg-slate-200/80 rounded-full h-2.5 overflow-hidden">
                  <div
                    className={`h-2.5 rounded-full transition-all duration-500 ${
                      projection.isHit
                        ? 'bg-emerald-600'
                        : projection.isWarning
                          ? 'bg-amber-500'
                          : 'bg-rose-500'
                    }`}
                    style={{
                      width: `${Math.min(100, projection.projectedPct || 0)}%`,
                    }}
                  />
                </div>
              )}
            </div>
          </CardContent>
        </Card>

        {/* Card de Métrica de Ritmo Diário */}
        <Card className="border-slate-200 shadow-subtle flex flex-col justify-between">
          <CardContent className="p-4 sm:p-5 space-y-3">
            <div className="flex items-center justify-between">
              <span className="text-xs font-semibold text-slate-500 uppercase tracking-wide">
                Ritmo Diário Médio
              </span>
              <Calendar className="h-4 w-4 text-indigo-600" />
            </div>

            <div>
              <p className="text-3xl font-extrabold text-slate-900">
                {projection.dailyPace}{' '}
                <span className="text-xs text-slate-500 font-normal">atendimentos/dia</span>
              </p>
              <p className="text-[11px] text-slate-500 mt-1">
                Calculado com base nos primeiros {currentDay} dia(s) do mês corrente.
              </p>
            </div>

            <div className="pt-2 border-t border-slate-100 text-[11px] text-slate-600">
              {projection.effectiveTarget ? (
                <>
                  Meta diária recomendada:{' '}
                  <strong className="text-indigo-700">
                    {(projection.effectiveTarget / daysInMonth).toFixed(1)}/dia
                  </strong>
                </>
              ) : (
                'Meta mensal base: 100 atendimentos'
              )}
            </div>
          </CardContent>
        </Card>
      </div>

      {/* Gráfico Recharts de Volume + Linha de Tendência */}
      <Card className="border-slate-200 shadow-subtle">
        <CardHeader className="pb-2 flex flex-col sm:flex-row sm:items-center sm:justify-between gap-2">
          <div>
            <CardTitle className="text-sm font-bold text-slate-900 flex items-center gap-2">
              <BarChart3 className="h-4 w-4 text-indigo-600" />
              {title}
            </CardTitle>
            <p className="text-xs text-slate-500 mt-0.5">{subtitle}</p>
          </div>

          <div className="flex items-center gap-2">
            <Button
              variant={showTrendLine ? 'default' : 'outline'}
              size="sm"
              onClick={() => setShowTrendLine(!showTrendLine)}
              className={`h-7 text-xs font-medium ${
                showTrendLine ? 'bg-amber-600 hover:bg-amber-700 text-white' : 'text-slate-600'
              }`}
            >
              <TrendingUp className="h-3 w-3 mr-1" />
              {showTrendLine ? 'Ocultar Linha de Tendência' : 'Exibir Linha de Tendência'}
            </Button>
          </div>
        </CardHeader>

        <CardContent className="pt-2">
          {dailyData.length === 0 ? (
            <p className="text-xs text-slate-400 text-center py-10">
              Nenhum registro de atendimento localizado no mês corrente.
            </p>
          ) : (
            <ChartContainer config={chartConfig} className="h-[280px] w-full">
              <ComposedChart data={dailyData} margin={{ top: 10, right: 15, left: -10, bottom: 0 }}>
                <CartesianGrid vertical={false} strokeDasharray="3 3" stroke="#f1f5f9" />
                <XAxis
                  dataKey="dia"
                  tick={{ fontSize: 11, fill: '#64748b' }}
                  tickLine={false}
                  axisLine={{ stroke: '#e2e8f0' }}
                />
                <YAxis
                  tick={{ fontSize: 11, fill: '#64748b' }}
                  tickLine={false}
                  axisLine={{ stroke: '#e2e8f0' }}
                  width={35}
                  allowDecimals={false}
                />
                <ChartTooltip content={<ChartTooltipContent />} />
                <Legend
                  wrapperStyle={{ fontSize: '11px', paddingTop: '10px' }}
                  formatter={(value) => <span className="text-slate-700 font-medium">{value}</span>}
                />
                {/* Barras de volume diário real */}
                <Bar
                  dataKey="atendimentos"
                  name="Volume Diário"
                  fill="#6366f1"
                  radius={[4, 4, 0, 0]}
                  maxBarSize={32}
                />
                {/* Linha de tendência sobreposta ao gráfico */}
                {showTrendLine && (
                  <Line
                    type="monotone"
                    dataKey="tendencia"
                    name="Linha de Tendência"
                    stroke="#f59e0b"
                    strokeWidth={2.5}
                    dot={{ r: 2, fill: '#f59e0b' }}
                    activeDot={{ r: 4 }}
                  />
                )}
              </ComposedChart>
            </ChartContainer>
          )}
        </CardContent>
      </Card>
    </div>
  )
}
