import { useMemo } from 'react'
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card'
import { ServiceRecord } from '@/types/service_record'
import {
  generateConsolidatedReport,
  downloadConsolidatedCSV,
  downloadConsolidatedExcel,
  downloadConsolidatedPDF,
} from '@/lib/consolidated-report'
import { ExportMenu } from '@/components/ExportMenu'
import { CONTACT_REASONS } from '@/constants/contactReasons'

const STATUSES = ['Aberto', 'Em Andamento', 'Concluído', 'Cancelado']
const CHANNELS = ['Telefone', 'e-mail', 'whatsapp', 'comercial', 'outros']
const REASONS = [...CONTACT_REASONS]
const PRIORITIES = ['Baixa', 'Média', 'Alta']

function DistributionTable({
  title,
  keys,
  breakdown,
  total,
}: {
  title: string
  keys: string[]
  breakdown: Record<string, number>
  total: number
}) {
  return (
    <div>
      <p className="text-xs font-bold text-slate-600 mb-1.5">{title}</p>
      <div className="space-y-0.5">
        {keys.map((k) => {
          const count = breakdown[k] || 0
          const pct = total > 0 ? Math.round((count / total) * 100) : 0
          return (
            <div key={k} className="flex items-center justify-between text-xs">
              <span className="text-slate-600">{k}</span>
              <span className="font-semibold text-slate-900">
                {count} <span className="text-slate-400 font-normal">({pct}%)</span>
              </span>
            </div>
          )
        })}
      </div>
    </div>
  )
}

export function ConsolidatedReportPanel({ records }: { records: ServiceRecord[] }) {
  const data = useMemo(() => generateConsolidatedReport(records), [records])

  return (
    <Card className="border-slate-200 shadow-subtle">
      <CardHeader className="flex flex-row items-center justify-between pb-3">
        <div>
          <CardTitle className="text-base font-bold text-slate-900">
            Relatório Consolidado por Período
          </CardTitle>
          <p className="text-xs text-slate-500 mt-0.5">
            {data.totalRecords} atendimento(s) no período analisado
          </p>
        </div>
        <ExportMenu
          label="Exportar Consolidado"
          onCSV={() => downloadConsolidatedCSV(data)}
          onExcel={() => downloadConsolidatedExcel(data)}
          onPDF={() => downloadConsolidatedPDF(data)}
          variant="outline"
        />
      </CardHeader>
      <CardContent className="space-y-4">
        <div className="grid grid-cols-2 lg:grid-cols-4 gap-3">
          <div className="rounded-lg bg-cyan-50 border border-cyan-100 p-3">
            <p className="text-[10px] font-bold text-cyan-700 uppercase">Total Atendimentos</p>
            <p className="text-xl font-black text-slate-900">{data.totalRecords}</p>
          </div>
          <div className="rounded-lg bg-rose-50 border border-rose-100 p-3">
            <p className="text-[10px] font-bold text-rose-700 uppercase">Tempo Médio</p>
            <p className="text-xl font-black text-slate-900">{data.avgDuration} min</p>
          </div>
          <div className="rounded-lg bg-amber-50 border border-amber-100 p-3">
            <p className="text-[10px] font-bold text-amber-700 uppercase">Contatos Evitáveis</p>
            <p className="text-xl font-black text-slate-900">{data.avoidableContactCount}</p>
          </div>
          <div className="rounded-lg bg-amber-50 border border-amber-100 p-3">
            <p className="text-[10px] font-bold text-amber-700 uppercase">Evitáveis (%)</p>
            <p className="text-xl font-black text-slate-900">{data.avoidableContactPercentage}%</p>
          </div>
        </div>
        <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-4 gap-4">
          <DistributionTable
            title="Por Status"
            keys={STATUSES}
            breakdown={data.statusBreakdown}
            total={data.totalRecords}
          />
          <DistributionTable
            title="Por Canal"
            keys={CHANNELS}
            breakdown={data.channelBreakdown}
            total={data.totalRecords}
          />
          <DistributionTable
            title="Por Prioridade"
            keys={PRIORITIES}
            breakdown={data.priorityBreakdown}
            total={data.totalRecords}
          />
          <DistributionTable
            title="Por Motivo do Contato"
            keys={REASONS}
            breakdown={data.reasonBreakdown}
            total={data.totalRecords}
          />
        </div>
      </CardContent>
    </Card>
  )
}
