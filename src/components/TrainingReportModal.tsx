import { useMemo } from 'react'
import { Dialog, DialogContent, DialogHeader, DialogTitle } from '@/components/ui/dialog'
import { Button } from '@/components/ui/button'
import { Badge } from '@/components/ui/badge'
import { ServiceRecord, ClientRecord } from '@/types/service_record'
import { computeTrainingReport, printTrainingReport } from '@/lib/training-report'
import { suggestArticles } from '@/lib/knowledge-base'
import { Printer, TrendingDown, TrendingUp, Minus, CheckCircle2 } from 'lucide-react'

interface TrainingReportModalProps {
  open: boolean
  onOpenChange: (open: boolean) => void
  records: ServiceRecord[]
  client?: ClientRecord
}

export function TrainingReportModal({
  open,
  onOpenChange,
  records,
  client,
}: TrainingReportModalProps) {
  const report = useMemo(() => computeTrainingReport(records, client), [records, client])

  const tutorials = useMemo(() => {
    const all = report.topReasons.flatMap((r) => suggestArticles(r.reason, ''))
    return Array.from(new Map(all.map((a) => [a.id, a])).values()).slice(0, 5)
  }, [report.topReasons])

  const TrendIcon =
    report.trend === 'down' ? TrendingDown : report.trend === 'up' ? TrendingUp : Minus
  const trendColor =
    report.trend === 'down'
      ? 'text-emerald-600'
      : report.trend === 'up'
        ? 'text-rose-600'
        : 'text-slate-500'

  return (
    <Dialog open={open} onOpenChange={onOpenChange}>
      <DialogContent className="sm:max-w-[640px] max-h-[90vh] overflow-y-auto">
        <DialogHeader className="border-b pb-3">
          <DialogTitle className="text-lg font-bold text-slate-900">
            Relatório de Treinamento — {report.agencyName}
          </DialogTitle>
        </DialogHeader>
        <div className="space-y-4 py-2">
          <div className="grid grid-cols-2 gap-3">
            <div className="bg-slate-50 rounded-lg p-3">
              <p className="text-[10px] font-bold text-slate-500 uppercase">Total Atendimentos</p>
              <p className="text-xl font-black text-slate-900">{report.totalRecords}</p>
            </div>
            <div className="bg-slate-50 rounded-lg p-3">
              <p className="text-[10px] font-bold text-slate-500 uppercase">Taxa de Evitáveis</p>
              <p className="text-xl font-black text-slate-900">
                {report.avoidableRate}%
                <TrendIcon className={`inline h-4 w-4 ml-1 ${trendColor}`} />
              </p>
              <p className="text-[10px] text-slate-400">
                anterior: {report.previousAvoidableRate}%
              </p>
            </div>
          </div>
          <div>
            <h4 className="text-xs font-bold text-slate-700 uppercase mb-2">
              Top 5 Motivos de Contato
            </h4>
            <div className="space-y-1">
              {report.topReasons.map((r, i) => (
                <div
                  key={r.reason}
                  className="flex items-center justify-between text-xs p-2 bg-slate-50 rounded"
                >
                  <span className="font-medium text-slate-800">
                    {i + 1}. {r.reason}
                  </span>
                  <div className="flex items-center gap-2">
                    <Badge variant="secondary" className="text-[10px]">
                      {r.count}x
                    </Badge>
                    <span className="text-slate-500">{r.percentage}%</span>
                  </div>
                </div>
              ))}
            </div>
          </div>
          {tutorials.length > 0 && (
            <div>
              <h4 className="text-xs font-bold text-slate-700 uppercase mb-2">
                Tutoriais Recomendados
              </h4>
              <div className="space-y-1">
                {tutorials.map((a) => (
                  <div key={a.id} className="text-xs p-2 bg-cyan-50 rounded border border-cyan-100">
                    <strong className="text-cyan-800">{a.title}</strong> — {a.summary}
                  </div>
                ))}
              </div>
            </div>
          )}
          <div>
            <h4 className="text-xs font-bold text-slate-700 uppercase mb-2">
              Checklist de Aprendizado
            </h4>
            <div className="space-y-1">
              {report.checklist.map((c, i) => (
                <div key={i} className="flex items-center gap-2 text-xs p-2">
                  <CheckCircle2 className="h-3.5 w-3.5 text-slate-300" />
                  <span className="text-slate-700">{c}</span>
                </div>
              ))}
            </div>
          </div>
          <div className="flex justify-end pt-2 border-t">
            <Button
              onClick={() => printTrainingReport(report)}
              className="bg-indigo-600 hover:bg-indigo-700"
            >
              <Printer className="h-4 w-4 mr-2" /> Imprimir / Salvar PDF
            </Button>
          </div>
        </div>
      </DialogContent>
    </Dialog>
  )
}
