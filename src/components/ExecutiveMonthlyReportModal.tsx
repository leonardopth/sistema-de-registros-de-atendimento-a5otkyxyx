import { useState, useEffect } from 'react'
import {
  Dialog,
  DialogContent,
  DialogDescription,
  DialogFooter,
  DialogHeader,
  DialogTitle,
} from '@/components/ui/dialog'
import { Button } from '@/components/ui/button'
import { Badge } from '@/components/ui/badge'
import { Card, CardContent } from '@/components/ui/card'
import {
  Table,
  TableBody,
  TableCell,
  TableHead,
  TableHeader,
  TableRow,
} from '@/components/ui/table'
import {
  FileText,
  Mail,
  Send,
  TrendingDown,
  TrendingUp,
  Minus,
  RefreshCw,
  Clock,
  Award,
  AlertTriangle,
  Flame,
} from 'lucide-react'
import { toast } from '@/hooks/use-toast'
import {
  getExecutiveMonthlyReportData,
  sendExecutiveMonthlyReport,
  ExecutiveMonthlyReportData,
} from '@/services/executive-monthly-report'

interface ExecutiveMonthlyReportModalProps {
  open: boolean
  onOpenChange: (open: boolean) => void
}

export function ExecutiveMonthlyReportModal({
  open,
  onOpenChange,
}: ExecutiveMonthlyReportModalProps) {
  const [data, setData] = useState<ExecutiveMonthlyReportData | null>(null)
  const [loading, setLoading] = useState(false)
  const [sending, setSending] = useState(false)

  const loadReport = async () => {
    setLoading(true)
    try {
      const res = await getExecutiveMonthlyReportData()
      if (res && res.report) {
        setData(res.report)
      }
    } catch (err) {
      console.error(err)
      toast({
        variant: 'destructive',
        title: 'Erro ao carregar relatório executivo',
        description: 'Não foi possível buscar as métricas consolidadas.',
      })
    } finally {
      setLoading(false)
    }
  }

  useEffect(() => {
    if (open) {
      loadReport()
    }
  }, [open])

  const handleSendEmail = async () => {
    setSending(true)
    try {
      const res = await sendExecutiveMonthlyReport(data?.targetYear, data?.targetMonth)
      toast({
        title: 'Relatório executivo enviado com sucesso!',
        description: `Disparado para ${res.sentCount} de ${res.totalRecipients} líderes ativos com notificações habilitadas.`,
      })
      onOpenChange(false)
    } catch (err) {
      console.error(err)
      toast({
        variant: 'destructive',
        title: 'Erro ao disparar relatório executivo',
        description: 'Verifique se há líderes cadastrados e permissões do usuário.',
      })
    } finally {
      setSending(false)
    }
  }

  const renderTrendBadge = (val?: number, isPp?: boolean, invertGood?: boolean) => {
    if (val === undefined || val === null) return null
    const sign = val > 0 ? '+' : ''
    const unit = isPp ? ' p.p.' : '%'
    const arrow =
      val > 0 ? (
        <TrendingUp className="h-3 w-3 mr-0.5 inline" />
      ) : val < 0 ? (
        <TrendingDown className="h-3 w-3 mr-0.5 inline" />
      ) : (
        <Minus className="h-3 w-3 mr-0.5 inline" />
      )
    const isGood = invertGood ? val <= 0 : val >= 0
    const colorClass =
      val === 0
        ? 'bg-slate-100 text-slate-600'
        : isGood
          ? 'bg-emerald-100 text-emerald-800'
          : 'bg-rose-100 text-rose-800'

    return (
      <Badge variant="secondary" className={`text-[10px] font-bold px-1.5 py-0.5 ${colorClass}`}>
        {arrow} {sign}
        {val}
        {unit}
      </Badge>
    )
  }

  return (
    <Dialog open={open} onOpenChange={onOpenChange}>
      <DialogContent className="max-w-4xl max-h-[90vh] overflow-y-auto p-0">
        <DialogHeader className="p-6 pb-2 bg-gradient-to-r from-indigo-900 via-indigo-800 to-indigo-700 text-white rounded-t-lg">
          <div className="flex items-center justify-between">
            <div>
              <Badge
                variant="outline"
                className="text-white border-white/30 text-[10px] uppercase font-bold tracking-wider mb-1"
              >
                Frente B4 · Automação Mensal
              </Badge>
              <DialogTitle className="text-xl font-extrabold text-white flex items-center gap-2">
                <FileText className="h-5 w-5 text-indigo-300" />
                Relatório Executivo Mensal Consolidado
              </DialogTitle>
              <DialogDescription className="text-indigo-200 text-xs mt-1">
                {data ? (
                  <>
                    Competência: <strong className="text-white">{data.periodLabel}</strong>{' '}
                    (comparativo vs. {data.prevPeriodLabel})
                  </>
                ) : (
                  'Carregando dados da última competência...'
                )}
              </DialogDescription>
            </div>
          </div>
        </DialogHeader>

        <div className="p-6 space-y-6">
          {loading ? (
            <div className="py-16 text-center text-xs text-slate-500 space-y-3">
              <RefreshCw className="h-8 w-8 text-indigo-600 animate-spin mx-auto" />
              <p>Processando consolidado de atendimentos, metas e variações...</p>
            </div>
          ) : !data ? (
            <div className="py-12 text-center text-xs text-slate-400">
              Nenhum dado encontrado para o período.
            </div>
          ) : (
            <>
              {/* Informação do Cron */}
              <div className="p-3 bg-indigo-50 border border-indigo-100 rounded-lg flex items-center justify-between text-xs text-indigo-950">
                <div className="flex items-center gap-2">
                  <Clock className="h-4 w-4 text-indigo-600 shrink-0" />
                  <span>
                    <strong>Envio automático:</strong> Primeiro dia útil de cada mês às{' '}
                    <strong>08h00</strong> (GMT-3) para Master, Gerentes, Supervisores, Líderes e
                    Gestor Comercial com notificações ativas.
                  </span>
                </div>
                <Button
                  variant="ghost"
                  size="sm"
                  onClick={loadReport}
                  className="h-7 px-2 text-indigo-700 hover:text-indigo-900"
                >
                  <RefreshCw className="h-3.5 w-3.5 mr-1" /> Atualizar
                </Button>
              </div>

              {/* Grid 4 KPIs Principais */}
              <div className="grid grid-cols-2 md:grid-cols-4 gap-3">
                {/* Volume Total */}
                <Card className="border-slate-200 bg-white shadow-subtle">
                  <CardContent className="p-3.5">
                    <p className="text-[10px] font-bold uppercase text-slate-500">Volume Total</p>
                    <div className="flex items-baseline justify-between mt-1">
                      <span className="text-2xl font-black text-slate-900">
                        {data.metrics.total}
                      </span>
                      {renderTrendBadge(data.metrics.totalDeltaPct, false, false)}
                    </div>
                    <p className="text-[10px] text-slate-400 mt-1">
                      Anterior: {data.metrics.prevTotal ?? 0}
                    </p>
                  </CardContent>
                </Card>

                {/* TMA Médio */}
                <Card className="border-slate-200 bg-white shadow-subtle">
                  <CardContent className="p-3.5">
                    <p className="text-[10px] font-bold uppercase text-slate-500">TMA Médio</p>
                    <div className="flex items-baseline justify-between mt-1">
                      <span className="text-2xl font-black text-slate-900">
                        {data.metrics.avgTma}{' '}
                        <span className="text-xs font-semibold text-slate-500">min</span>
                      </span>
                      {renderTrendBadge(data.metrics.tmaDeltaPct, false, true)}
                    </div>
                    <p className="text-[10px] text-slate-400 mt-1">
                      Anterior: {data.metrics.prevAvgTma ?? 0} min
                    </p>
                  </CardContent>
                </Card>

                {/* TFR Médio Real */}
                <Card className="border-slate-200 bg-white shadow-subtle">
                  <CardContent className="p-3.5">
                    <p className="text-[10px] font-bold uppercase text-slate-500">TFR Médio Real</p>
                    <div className="flex items-baseline justify-between mt-1">
                      <span className="text-2xl font-black text-slate-900">
                        {data.metrics.avgTfr}{' '}
                        <span className="text-xs font-semibold text-slate-500">min</span>
                      </span>
                      {renderTrendBadge(data.metrics.tfrDeltaPct, false, true)}
                    </div>
                    <p className="text-[10px] text-slate-400 mt-1">
                      {data.metrics.tfrCompliancePct}% dentro da meta (≤ {data.defaultTfrTarget}m)
                    </p>
                  </CardContent>
                </Card>

                {/* Evitáveis & Reabertura */}
                <Card className="border-slate-200 bg-white shadow-subtle">
                  <CardContent className="p-3.5">
                    <p className="text-[10px] font-bold uppercase text-slate-500">
                      Evitáveis & Reaberturas
                    </p>
                    <div className="flex items-baseline justify-between mt-1">
                      <span className="text-2xl font-black text-slate-900">
                        {data.metrics.avoidablePct}%{' '}
                        <span className="text-[10px] text-slate-500 font-normal">evit.</span>
                      </span>
                      {renderTrendBadge(data.metrics.avoidableDeltaPp, true, true)}
                    </div>
                    <p className="text-[10px] text-slate-400 mt-1">
                      Reabertura: <strong>{data.metrics.reopenRate}%</strong> (
                      {data.metrics.reopenCount} chamados)
                    </p>
                  </CardContent>
                </Card>
              </div>

              {/* Seção Desempenho e Metas da Equipe */}
              <Card className="border-slate-200 bg-slate-50/50 shadow-subtle">
                <CardContent className="p-4">
                  <div className="flex items-center justify-between mb-3">
                    <h4 className="text-xs font-bold uppercase tracking-wide text-slate-800 flex items-center gap-1.5">
                      <Award className="h-4 w-4 text-indigo-600" />
                      Desempenho da Equipe (Consultores Elegíveis: {data.targets.totalConsultants})
                    </h4>
                    <span className="text-[10px] text-slate-500">
                      Regra de Metas: apenas colaboradores com perfil de atendimento
                    </span>
                  </div>
                  <div className="grid grid-cols-1 md:grid-cols-2 gap-3">
                    <div className="p-3 bg-white rounded-md border border-slate-200">
                      <div className="text-[11px] font-bold text-slate-700">
                        Meta Mensal de Atendimentos
                      </div>
                      <div className="text-sm mt-1 text-slate-900">
                        <strong className="text-emerald-700 font-extrabold">
                          {data.targets.hitAttendanceCount}
                        </strong>{' '}
                        bateram a meta (
                        {data.targets.totalConsultants > 0
                          ? Math.round(
                              (data.targets.hitAttendanceCount / data.targets.totalConsultants) *
                                100,
                            )
                          : 0}
                        %) ·{' '}
                        <span className="text-rose-700 font-semibold">
                          {data.targets.missAttendanceCount} abaixo
                        </span>
                      </div>
                    </div>
                    <div className="p-3 bg-white rounded-md border border-slate-200">
                      <div className="text-[11px] font-bold text-slate-700">
                        Mínimo de Resolução (≥ {data.defaultMinResolution}%)
                      </div>
                      <div className="text-sm mt-1 text-slate-900">
                        <strong className="text-emerald-700 font-extrabold">
                          {data.targets.hitResolutionCount}
                        </strong>{' '}
                        atingiram o mínimo ·{' '}
                        <span className="text-rose-700 font-semibold">
                          {data.targets.missResolutionCount} abaixo
                        </span>
                      </div>
                    </div>
                  </div>
                </CardContent>
              </Card>

              {/* Top 5 e Bottom 5 */}
              <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                {/* Top 5 */}
                <div className="border border-slate-200 rounded-lg overflow-hidden bg-white">
                  <div className="bg-slate-50 px-3 py-2 border-b border-slate-200 flex items-center justify-between">
                    <span className="text-xs font-bold text-slate-900 flex items-center gap-1.5">
                      <Award className="h-4 w-4 text-amber-500" /> Top 5 Colaboradores (Volume)
                    </span>
                  </div>
                  <Table>
                    <TableHeader className="bg-slate-50/50">
                      <TableRow className="text-[10px] uppercase">
                        <TableHead className="py-1 px-2.5">Consultor</TableHead>
                        <TableHead className="py-1 px-2 text-center">Volume</TableHead>
                        <TableHead className="py-1 px-2 text-center">% Meta</TableHead>
                        <TableHead className="py-1 px-2 text-center">Resolução</TableHead>
                      </TableRow>
                    </TableHeader>
                    <TableBody>
                      {data.top5.length === 0 ? (
                        <TableRow>
                          <TableCell
                            colSpan={4}
                            className="text-center py-4 text-xs text-slate-400"
                          >
                            Sem atendimentos no período
                          </TableCell>
                        </TableRow>
                      ) : (
                        data.top5.map((c, i) => (
                          <TableRow key={c.userId || i} className="text-xs">
                            <TableCell className="py-1.5 px-2.5 font-semibold text-slate-900">
                              #{i + 1} {c.name}
                            </TableCell>
                            <TableCell className="py-1.5 px-2 text-center font-bold text-indigo-700">
                              {c.total}
                            </TableCell>
                            <TableCell className="py-1.5 px-2 text-center text-slate-600">
                              {c.attendancePct}%
                            </TableCell>
                            <TableCell className="py-1.5 px-2 text-center font-semibold text-emerald-700">
                              {c.resolutionRate}%
                            </TableCell>
                          </TableRow>
                        ))
                      )}
                    </TableBody>
                  </Table>
                </div>

                {/* Bottom 5 */}
                <div className="border border-slate-200 rounded-lg overflow-hidden bg-white">
                  <div className="bg-slate-50 px-3 py-2 border-b border-slate-200 flex items-center justify-between">
                    <span className="text-xs font-bold text-slate-900 flex items-center gap-1.5">
                      <AlertTriangle className="h-4 w-4 text-rose-500" /> Bottom 5 Colaboradores
                      (Volume)
                    </span>
                  </div>
                  <Table>
                    <TableHeader className="bg-slate-50/50">
                      <TableRow className="text-[10px] uppercase">
                        <TableHead className="py-1 px-2.5">Consultor</TableHead>
                        <TableHead className="py-1 px-2 text-center">Volume</TableHead>
                        <TableHead className="py-1 px-2 text-center">% Meta</TableHead>
                        <TableHead className="py-1 px-2 text-center">Resolução</TableHead>
                      </TableRow>
                    </TableHeader>
                    <TableBody>
                      {data.bottom5.length === 0 ? (
                        <TableRow>
                          <TableCell
                            colSpan={4}
                            className="text-center py-4 text-xs text-slate-400"
                          >
                            Sem atendimentos no período
                          </TableCell>
                        </TableRow>
                      ) : (
                        data.bottom5.map((bc, bi) => (
                          <TableRow key={bc.userId || bi} className="text-xs">
                            <TableCell className="py-1.5 px-2.5 font-semibold text-slate-900">
                              {bc.name}
                            </TableCell>
                            <TableCell className="py-1.5 px-2 text-center font-bold text-slate-700">
                              {bc.total}
                            </TableCell>
                            <TableCell className="py-1.5 px-2 text-center text-slate-600">
                              {bc.attendancePct}%
                            </TableCell>
                            <TableCell className="py-1.5 px-2 text-center font-semibold text-rose-700">
                              {bc.resolutionRate}%
                            </TableCell>
                          </TableRow>
                        ))
                      )}
                    </TableBody>
                  </Table>
                </div>
              </div>

              {/* Motivos de Contato em Alta */}
              <div className="border border-slate-200 rounded-lg overflow-hidden bg-white">
                <div className="bg-slate-50 px-3 py-2 border-b border-slate-200 flex items-center justify-between">
                  <span className="text-xs font-bold text-slate-900 flex items-center gap-1.5">
                    <Flame className="h-4 w-4 text-orange-500" /> Motivos de Contato que Mais
                    Cresceram (vs. {data.prevPeriodLabel})
                  </span>
                  <Badge variant="secondary" className="text-[9px] bg-slate-100 text-slate-600">
                    Normalização Canônica (15 motivos)
                  </Badge>
                </div>
                <Table>
                  <TableHeader className="bg-slate-50/50">
                    <TableRow className="text-[10px] uppercase">
                      <TableHead className="py-1 px-3">Motivo Canônico</TableHead>
                      <TableHead className="py-1 px-2 text-center">Mês Atual</TableHead>
                      <TableHead className="py-1 px-2 text-center">Mês Anterior</TableHead>
                      <TableHead className="py-1 px-3 text-center">Variação</TableHead>
                    </TableRow>
                  </TableHeader>
                  <TableBody>
                    {data.topGrowingReasons.length === 0 ? (
                      <TableRow>
                        <TableCell colSpan={4} className="text-center py-4 text-xs text-slate-400">
                          Sem motivos registrados
                        </TableCell>
                      </TableRow>
                    ) : (
                      data.topGrowingReasons.map((rg, ri) => (
                        <TableRow key={ri} className="text-xs">
                          <TableCell className="py-2 px-3 font-semibold text-slate-900">
                            {rg.reason}
                          </TableCell>
                          <TableCell className="py-2 px-2 text-center font-bold text-slate-800">
                            {rg.currentCount}
                          </TableCell>
                          <TableCell className="py-2 px-2 text-center text-slate-500">
                            {rg.prevCount}
                          </TableCell>
                          <TableCell className="py-2 px-3 text-center">
                            <Badge
                              variant="secondary"
                              className={`text-[10px] font-bold ${
                                rg.diff > 0
                                  ? 'bg-rose-100 text-rose-800'
                                  : rg.diff < 0
                                    ? 'bg-emerald-100 text-emerald-800'
                                    : 'bg-slate-100 text-slate-600'
                              }`}
                            >
                              {rg.diff > 0 ? `+${rg.diff}` : rg.diff} (
                              {rg.diff > 0 ? `+${rg.growthPct}` : rg.growthPct}%)
                            </Badge>
                          </TableCell>
                        </TableRow>
                      ))
                    )}
                  </TableBody>
                </Table>
              </div>
            </>
          )}
        </div>

        <DialogFooter className="p-4 bg-slate-50 border-t border-slate-200 flex flex-col sm:flex-row items-center justify-between gap-2">
          <p className="text-[11px] text-slate-500 flex items-center gap-1">
            <Mail className="h-3.5 w-3.5 text-slate-400" />
            O e-mail será enviado para todos os cargos de liderança com notificações ativas.
          </p>
          <div className="flex items-center gap-2">
            <Button variant="outline" size="sm" onClick={() => onOpenChange(false)}>
              Fechar
            </Button>
            <Button
              size="sm"
              className="bg-indigo-600 hover:bg-indigo-700 text-white font-semibold"
              disabled={loading || sending || !data}
              onClick={handleSendEmail}
            >
              <Send className={`h-3.5 w-3.5 mr-1.5 ${sending ? 'animate-pulse' : ''}`} />
              {sending ? 'Disparando e-mails...' : 'Disparar Relatório por E-mail Agora'}
            </Button>
          </div>
        </DialogFooter>
      </DialogContent>
    </Dialog>
  )
}
