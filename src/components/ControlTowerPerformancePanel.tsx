import { useState, useMemo } from 'react'
import { Card } from '@/components/ui/card'
import { Badge } from '@/components/ui/badge'
import { Button } from '@/components/ui/button'
import { ControlTowerEmailRecord, ControlTowerConfigRecord } from '@/types/control_tower'
import {
  PerformanceWindowDays,
  AgingBucketKey,
  computePerformanceStats,
} from '@/lib/control-tower-performance'
import {
  TrendingUp,
  TrendingDown,
  Clock,
  CheckCircle2,
  AlertTriangle,
  Flame,
  Inbox,
  ShieldCheck,
  Calendar,
  Layers,
  ArrowRight,
  Info,
} from 'lucide-react'
import {
  ResponsiveContainer,
  BarChart,
  Bar,
  XAxis,
  YAxis,
  Tooltip,
  Cell,
  CartesianGrid,
} from 'recharts'

interface ControlTowerPerformancePanelProps {
  emails: ControlTowerEmailRecord[]
  config: ControlTowerConfigRecord | null
  onFilterAgingBucket?: (bucketKey: AgingBucketKey) => void
}

export function ControlTowerPerformancePanel({
  emails,
  config,
  onFilterAgingBucket,
}: ControlTowerPerformancePanelProps) {
  const [windowDays, setWindowDays] = useState<PerformanceWindowDays>(7)

  // Calcular estatísticas consolidadas da janela selecionada
  const stats = useMemo(() => {
    return computePerformanceStats(emails, windowDays, config)
  }, [emails, windowDays, config])

  // Dados formatados para o gráfico de barras do Aging
  const agingChartData = useMemo(() => {
    return stats.agingBuckets.map((b) => ({
      name: b.label,
      key: b.key,
      total: b.count,
      p1: b.p1Count,
      p2: b.p2Count,
      p3: b.p3Count,
      percentage: b.percentage,
      color: b.color,
    }))
  }, [stats.agingBuckets])

  // Dados do gráfico comparativo de SLA por prioridade
  const slaChartData = useMemo(() => {
    return [
      {
        priority: 'P1 (Crítica)',
        slaRate: stats.byPriority.P1.slaRate,
        within: stats.byPriority.P1.withinSla,
        breached: stats.byPriority.P1.breached,
        total: stats.byPriority.P1.total,
        targetHours: config?.target_sla_p1_hours || 2,
        avgFr: stats.byPriority.P1.avgFirstResponseHours,
        color: '#ef4444',
      },
      {
        priority: 'P2 (Média)',
        slaRate: stats.byPriority.P2.slaRate,
        within: stats.byPriority.P2.withinSla,
        breached: stats.byPriority.P2.breached,
        total: stats.byPriority.P2.total,
        targetHours: config?.target_sla_p2_hours || 4,
        avgFr: stats.byPriority.P2.avgFirstResponseHours,
        color: '#f59e0b',
      },
      {
        priority: 'P3 (Normal)',
        slaRate: stats.byPriority.P3.slaRate,
        within: stats.byPriority.P3.withinSla,
        breached: stats.byPriority.P3.breached,
        total: stats.byPriority.P3.total,
        targetHours: config?.target_sla_p3_hours || 8,
        avgFr: stats.byPriority.P3.avgFirstResponseHours,
        color: '#10b981',
      },
    ]
  }, [stats.byPriority, config])

  return (
    <div className="space-y-5">
      {/* Barra de Controle de Janela Temporal (7 vs 30 dias) */}
      <div className="flex flex-col sm:flex-row sm:items-center sm:justify-between gap-3 bg-white p-3 rounded-lg border border-slate-200 shadow-xs">
        <div className="flex items-center gap-2">
          <Calendar className="h-4 w-4 text-indigo-600" />
          <span className="text-xs font-bold text-slate-800">Janela de Análise de Desempenho:</span>
          <span className="text-xs text-slate-500">
            Comparação com o período anterior de mesmo intervalo
          </span>
        </div>

        <div className="flex items-center gap-1.5 self-start sm:self-auto bg-slate-100 p-1 rounded-md">
          <button
            type="button"
            onClick={() => setWindowDays(7)}
            className={`px-3 py-1 rounded text-xs font-bold transition-all ${
              windowDays === 7
                ? 'bg-white text-indigo-700 shadow-xs'
                : 'text-slate-600 hover:text-slate-900'
            }`}
          >
            Últimos 7 dias
          </button>
          <button
            type="button"
            onClick={() => setWindowDays(30)}
            className={`px-3 py-1 rounded text-xs font-bold transition-all ${
              windowDays === 30
                ? 'bg-white text-indigo-700 shadow-xs'
                : 'text-slate-600 hover:text-slate-900'
            }`}
          >
            Últimos 30 dias
          </button>
        </div>
      </div>

      {/* 4. KPIs de Topo do Painel */}
      <div className="grid grid-cols-2 sm:grid-cols-3 lg:grid-cols-6 gap-3">
        {/* KPI 1: Total Recebido na Janela */}
        <Card className="p-3 bg-white border-slate-200">
          <div className="flex items-center justify-between">
            <span className="text-[10px] font-bold uppercase tracking-wider text-slate-400">
              Recebidos ({windowDays}d)
            </span>
            <Inbox className="h-3.5 w-3.5 text-slate-400" />
          </div>
          <div className="mt-1 flex items-baseline justify-between">
            <span className="text-2xl font-extrabold text-slate-900">{stats.totalReceived}</span>
            <span
              className={`text-[11px] font-bold flex items-center ${
                stats.diffReceivedPct >= 0 ? 'text-indigo-600' : 'text-slate-500'
              }`}
            >
              {stats.diffReceivedPct >= 0 ? (
                <TrendingUp className="h-3 w-3 mr-0.5" />
              ) : (
                <TrendingDown className="h-3 w-3 mr-0.5" />
              )}
              {stats.diffReceivedPct > 0
                ? `+${stats.diffReceivedPct}%`
                : `${stats.diffReceivedPct}%`}
            </span>
          </div>
          <span className="text-[10px] text-slate-400 mt-0.5 block truncate">
            vs. {windowDays}d anteriores
          </span>
        </Card>

        {/* KPI 2: Total Resolvidos */}
        <Card className="p-3 bg-white border-slate-200">
          <div className="flex items-center justify-between">
            <span className="text-[10px] font-bold uppercase tracking-wider text-emerald-700">
              Resolvidos
            </span>
            <CheckCircle2 className="h-3.5 w-3.5 text-emerald-600" />
          </div>
          <div className="mt-1 flex items-baseline justify-between">
            <span className="text-2xl font-extrabold text-emerald-700">{stats.totalResolved}</span>
            <span
              className={`text-[11px] font-bold flex items-center ${
                stats.diffResolvedPct >= 0 ? 'text-emerald-700' : 'text-rose-600'
              }`}
            >
              {stats.diffResolvedPct >= 0 ? (
                <TrendingUp className="h-3 w-3 mr-0.5" />
              ) : (
                <TrendingDown className="h-3 w-3 mr-0.5" />
              )}
              {stats.diffResolvedPct > 0
                ? `+${stats.diffResolvedPct}%`
                : `${stats.diffResolvedPct}%`}
            </span>
          </div>
          <span className="text-[10px] text-slate-400 mt-0.5 block truncate">
            concluídos na janela
          </span>
        </Card>

        {/* KPI 3: % Dentro do SLA */}
        <Card className="p-3 bg-white border-slate-200">
          <div className="flex items-center justify-between">
            <span className="text-[10px] font-bold uppercase tracking-wider text-indigo-700">
              % Dentro do SLA
            </span>
            <ShieldCheck className="h-3.5 w-3.5 text-indigo-600" />
          </div>
          <div className="mt-1 flex items-baseline justify-between">
            <span
              className={`text-2xl font-extrabold ${
                stats.overallSlaRate >= 85
                  ? 'text-emerald-600'
                  : stats.overallSlaRate >= 70
                    ? 'text-amber-600'
                    : 'text-rose-600'
              }`}
            >
              {stats.overallSlaRate}%
            </span>
            <span
              className={`text-[11px] font-bold flex items-center ${
                stats.diffSlaRatePct >= 0 ? 'text-emerald-700' : 'text-rose-600'
              }`}
            >
              {stats.diffSlaRatePct >= 0 ? (
                <TrendingUp className="h-3 w-3 mr-0.5" />
              ) : (
                <TrendingDown className="h-3 w-3 mr-0.5" />
              )}
              {stats.diffSlaRatePct > 0
                ? `+${stats.diffSlaRatePct}pp`
                : `${stats.diffSlaRatePct}pp`}
            </span>
          </div>
          <span className="text-[10px] text-slate-400 mt-0.5 block truncate">
            Meta operacional: 85%+
          </span>
        </Card>

        {/* KPI 4: Tempo Médio de 1ª Resposta */}
        <Card className="p-3 bg-white border-slate-200">
          <div className="flex items-center justify-between">
            <span className="text-[10px] font-bold uppercase tracking-wider text-blue-700">
              Tempo Médio 1ª Resp.
            </span>
            <Clock className="h-3.5 w-3.5 text-blue-600" />
          </div>
          <div className="mt-1 flex items-baseline justify-between">
            <span className="text-2xl font-extrabold text-blue-800">
              {stats.avgFirstResponseHours}h
            </span>
            <span
              className={`text-[11px] font-bold flex items-center ${
                stats.diffFirstResponsePct <= 0 ? 'text-emerald-700' : 'text-amber-600'
              }`}
              title="Menor tempo é melhor"
            >
              {stats.diffFirstResponsePct <= 0 ? (
                <TrendingDown className="h-3 w-3 mr-0.5" />
              ) : (
                <TrendingUp className="h-3 w-3 mr-0.5" />
              )}
              {stats.diffFirstResponsePct > 0
                ? `+${stats.diffFirstResponsePct}%`
                : `${stats.diffFirstResponsePct}%`}
            </span>
          </div>
          <span className="text-[10px] text-slate-400 mt-0.5 block truncate">
            em horas úteis (08h-18h)
          </span>
        </Card>

        {/* KPI 5: Total de Escalados / Estourados */}
        <Card className="p-3 bg-white border-slate-200">
          <div className="flex items-center justify-between">
            <span className="text-[10px] font-bold uppercase tracking-wider text-rose-700">
              Escalados
            </span>
            <Flame className="h-3.5 w-3.5 text-rose-600" />
          </div>
          <div className="mt-1 flex items-baseline justify-between">
            <span className="text-2xl font-extrabold text-rose-700">{stats.totalEscalated}</span>
            <span
              className={`text-[11px] font-bold flex items-center ${
                stats.diffEscalatedPct <= 0 ? 'text-emerald-700' : 'text-rose-600'
              }`}
            >
              {stats.diffEscalatedPct <= 0 ? (
                <TrendingDown className="h-3 w-3 mr-0.5" />
              ) : (
                <TrendingUp className="h-3 w-3 mr-0.5" />
              )}
              {stats.diffEscalatedPct > 0
                ? `+${stats.diffEscalatedPct}%`
                : `${stats.diffEscalatedPct}%`}
            </span>
          </div>
          <span className="text-[10px] text-slate-400 mt-0.5 block truncate">estouraram SLA</span>
        </Card>

        {/* KPI 6: Backlog Ativo Atual */}
        <Card className="p-3 bg-white border-slate-200">
          <div className="flex items-center justify-between">
            <span className="text-[10px] font-bold uppercase tracking-wider text-purple-700">
              Backlog Ativo
            </span>
            <Layers className="h-3.5 w-3.5 text-purple-600" />
          </div>
          <div className="mt-1 flex items-baseline justify-between">
            <span className="text-2xl font-extrabold text-purple-900">
              {stats.activeBacklogCount}
            </span>
            <Badge variant="outline" className="text-[10px] font-bold bg-purple-50 text-purple-700">
              fila aberta
            </Badge>
          </div>
          <span className="text-[10px] text-slate-400 mt-0.5 block truncate">
            Novo / Tratamento / Escalado
          </span>
        </Card>
      </div>

      {/* Grid Central: Desempenho de SLA por Prioridade + Aging do Backlog */}
      <div className="grid grid-cols-1 lg:grid-cols-2 gap-4">
        {/* Bloco 1: % de E-mails Dentro do SLA & Tempo de 1ª Resposta por Prioridade */}
        <Card className="p-4 border-slate-200 bg-white shadow-xs space-y-4">
          <div className="flex items-center justify-between">
            <div>
              <h3 className="text-sm font-bold text-slate-900 flex items-center gap-1.5">
                <ShieldCheck className="h-4 w-4 text-indigo-600" />
                Desempenho de SLA & 1ª Resposta por Prioridade
              </h3>
              <p className="text-xs text-slate-500">
                Proporção resolvida dentro do prazo vs. tempo médio para assumir (janela de{' '}
                {windowDays} dias)
              </p>
            </div>
            <Badge
              variant="outline"
              className="text-[10px] font-bold bg-slate-50 text-slate-700 border-slate-200"
            >
              Expediente: {config?.business_hours_start || '08:00'} -{' '}
              {config?.business_hours_end || '18:00'}
            </Badge>
          </div>

          <div className="grid grid-cols-1 sm:grid-cols-3 gap-3">
            {slaChartData.map((item) => (
              <div
                key={item.priority}
                className="p-3 rounded-lg border border-slate-200 bg-slate-50/50 space-y-2"
              >
                <div className="flex items-center justify-between">
                  <Badge
                    variant="outline"
                    className="font-extrabold text-[11px]"
                    style={{ borderColor: item.color, color: item.color }}
                  >
                    {item.priority}
                  </Badge>
                  <span className="text-[10px] text-slate-400 font-semibold">
                    Meta: {item.targetHours}h úteis
                  </span>
                </div>

                <div className="space-y-1">
                  <div className="flex items-baseline justify-between">
                    <span className="text-xs text-slate-600">No SLA:</span>
                    <span className="text-base font-extrabold text-slate-900">{item.slaRate}%</span>
                  </div>

                  {/* Barra de progresso do SLA */}
                  <div className="w-full bg-slate-200 h-2 rounded-full overflow-hidden">
                    <div
                      className="h-full rounded-full transition-all"
                      style={{
                        width: `${item.slaRate}%`,
                        backgroundColor:
                          item.slaRate >= 85
                            ? '#10b981'
                            : item.slaRate >= 70
                              ? '#f59e0b'
                              : '#ef4444',
                      }}
                    />
                  </div>
                  <div className="flex justify-between text-[10px] text-slate-400">
                    <span>{item.within} no prazo</span>
                    <span>{item.breached} estourados</span>
                  </div>
                </div>

                <div className="pt-2 border-t border-slate-200 flex items-center justify-between text-xs">
                  <span className="text-slate-500 text-[11px] flex items-center gap-1">
                    <Clock className="h-3 w-3 text-slate-400" />
                    1ª Resposta:
                  </span>
                  <span className="font-bold text-slate-800">{item.avgFr}h úteis</span>
                </div>
              </div>
            ))}
          </div>

          <div className="p-3 bg-indigo-50/60 rounded-md border border-indigo-100 flex items-start gap-2.5 text-xs text-indigo-900">
            <Info className="h-4 w-4 text-indigo-600 shrink-0 mt-0.5" />
            <div>
              <span className="font-bold">Regra de Cálculo de Horas Úteis:</span>
              <p className="text-[11px] text-indigo-700 mt-0.5 leading-relaxed">
                O tempo é calculado exclusivamente dentro do horário de expediente (08h às 18h de
                segunda a sexta-feira). Noites, fins de semana e feriados são pausados, garantindo
                medição justa do tempo de resposta da equipe.
              </p>
            </div>
          </div>
        </Card>

        {/* Bloco 2: 3. Aging do Backlog por Faixa (<2h, 2-4h, 4-8h, 8-24h, >24h) com Gráfico e Clique */}
        <Card className="p-4 border-slate-200 bg-white shadow-xs space-y-4">
          <div className="flex items-center justify-between flex-wrap gap-2">
            <div>
              <h3 className="text-sm font-bold text-slate-900 flex items-center gap-1.5">
                <Clock className="h-4 w-4 text-indigo-600" />
                Aging do Backlog por Faixa de Espera
              </h3>
              <p className="text-xs text-slate-500">
                Distribuição dos itens ativos (Novo/Em tratamento/Escalado) em horas úteis
              </p>
            </div>
            <span className="text-[11px] font-bold text-indigo-700 bg-indigo-50 px-2 py-0.5 rounded border border-indigo-200">
              Total: {stats.activeBacklogCount} na caixa
            </span>
          </div>

          {/* Gráfico de Barras do Aging */}
          <div className="h-44 w-full">
            <ResponsiveContainer width="100%" height="100%">
              <BarChart data={agingChartData} margin={{ top: 10, right: 10, left: -20, bottom: 0 }}>
                <CartesianGrid strokeDasharray="3 3" vertical={false} stroke="#f1f5f9" />
                <XAxis dataKey="name" tick={{ fontSize: 11, fill: '#64748b' }} axisLine={false} />
                <YAxis
                  allowDecimals={false}
                  tick={{ fontSize: 11, fill: '#64748b' }}
                  axisLine={false}
                />
                <Tooltip
                  cursor={{ fill: '#f8fafc' }}
                  content={({ active, payload }) => {
                    if (active && payload && payload.length) {
                      const data = payload[0].payload
                      return (
                        <div className="bg-white p-2.5 rounded-lg shadow-md border border-slate-200 text-xs space-y-1">
                          <p className="font-bold text-slate-800">{data.name}</p>
                          <p className="text-indigo-600 font-extrabold">
                            {data.total} item(ns) ({data.percentage}%)
                          </p>
                          <div className="text-[10px] text-slate-500 space-y-0.5 pt-1 border-t border-slate-100">
                            <p className="text-red-600 font-semibold">• P1 Críticos: {data.p1}</p>
                            <p className="text-amber-600 font-semibold">• P2 Médios: {data.p2}</p>
                            <p className="text-emerald-600 font-semibold">
                              • P3 Normais: {data.p3}
                            </p>
                          </div>
                          {onFilterAgingBucket && (
                            <p className="text-[10px] text-indigo-700 font-bold mt-1">
                              Clique no card abaixo para filtrar a fila
                            </p>
                          )}
                        </div>
                      )
                    }
                    return null
                  }}
                />
                <Bar dataKey="total" radius={[4, 4, 0, 0]}>
                  {agingChartData.map((entry, index) => (
                    <Cell key={`cell-${index}`} fill={entry.color} />
                  ))}
                </Bar>
              </BarChart>
            </ResponsiveContainer>
          </div>

          {/* Cards Clicáveis de Faixas para Filtrar a Fila Principal */}
          <div className="grid grid-cols-2 sm:grid-cols-5 gap-2 pt-1">
            {stats.agingBuckets.map((bucket) => (
              <button
                key={bucket.key}
                type="button"
                onClick={() => onFilterAgingBucket?.(bucket.key)}
                className="p-2.5 rounded-lg border border-slate-200 bg-slate-50 hover:bg-indigo-50/70 hover:border-indigo-300 transition-all text-left flex flex-col justify-between group cursor-pointer"
                title={`Filtrar fila principal por conversas com ${bucket.label}`}
              >
                <div className="flex items-center justify-between w-full">
                  <span className="text-[10px] font-bold text-slate-600 truncate">
                    {bucket.label}
                  </span>
                  <span
                    className="w-2 h-2 rounded-full shrink-0 ml-1"
                    style={{ backgroundColor: bucket.color }}
                  />
                </div>
                <div className="mt-2 flex items-baseline justify-between w-full">
                  <span className="text-lg font-extrabold text-slate-900 group-hover:text-indigo-700">
                    {bucket.count}
                  </span>
                  <span className="text-[10px] text-slate-400 font-semibold">
                    {bucket.percentage}%
                  </span>
                </div>
                <div className="mt-1 flex items-center gap-1 text-[9px] text-indigo-600 font-semibold opacity-0 group-hover:opacity-100 transition-opacity">
                  <span>Filtrar</span>
                  <ArrowRight className="h-2.5 w-2.5" />
                </div>
              </button>
            ))}
          </div>
        </Card>
      </div>
    </div>
  )
}
