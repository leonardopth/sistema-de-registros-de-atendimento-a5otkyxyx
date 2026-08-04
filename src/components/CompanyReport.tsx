import { useState, useMemo } from 'react'
import { Card } from '@/components/ui/card'
import { Badge } from '@/components/ui/badge'
import { ServiceRecord, ClientRecord, AgentRecord, ServiceStatus } from '@/types/service_record'
import { Building2, Users, Headset, MapPin } from 'lucide-react'
import {
  CompanyReportItem,
  reportToCSV,
  reportToText,
  downloadCSV,
  copyToClipboard,
  printReport,
} from '@/lib/report-export'
import { CompanyReportFilters } from '@/components/CompanyReportFilters'
import { useToast } from '@/hooks/use-toast'

interface CompanyReportProps {
  records: ServiceRecord[]
  clients: ClientRecord[]
  agents: AgentRecord[]
  onCompanyClick: (company: string) => void
}

const STATUS_COLORS: Record<string, string> = {
  Aberto: 'bg-amber-100 text-amber-700 border-amber-200',
  'Em Andamento': 'bg-amber-100 text-amber-700 border-amber-200',
  Concluído: 'bg-emerald-100 text-emerald-700 border-emerald-200',
  Cancelado: 'bg-red-100 text-red-700 border-red-200',
}

const STATUSES: ServiceStatus[] = ['Aberto', 'Em Andamento', 'Concluído', 'Cancelado']

function computeReport(
  records: ServiceRecord[],
  clients: ClientRecord[],
  agents: AgentRecord[],
): CompanyReportItem[] {
  const companyMap = new Map<string, ServiceRecord[]>()
  for (const r of records) {
    const company = r.client_company?.trim()
    if (!company) continue
    if (!companyMap.has(company)) companyMap.set(company, [])
    companyMap.get(company)!.push(r)
  }

  const items: CompanyReportItem[] = []
  for (const [company, companyRecords] of companyMap) {
    const matchingClients = clients.filter((c) => c.company === company)
    const matchingClientIds = new Set(matchingClients.map((c) => c.id))
    const executives = [...new Set(matchingClients.map((c) => c.name).filter(Boolean))]
    const clientWithLocation = matchingClients.find((c) => c.city || c.state)
    const city = clientWithLocation?.city || '—'
    const state = clientWithLocation?.state || '—'
    const companyAgents = agents.filter((a) => matchingClientIds.has(a.client_id))

    const statusBreakdown: Record<string, number> = {}
    for (const s of STATUSES) statusBreakdown[s] = 0
    for (const r of companyRecords) {
      statusBreakdown[r.status] = (statusBreakdown[r.status] || 0) + 1
    }

    const agentData = companyAgents.map((agent) => ({
      name: agent.name,
      recordCount: companyRecords.filter(
        (r) => r.client_name === agent.name || (agent.email && r.client_email === agent.email),
      ).length,
    }))

    items.push({
      company,
      city,
      state,
      agentCount: companyAgents.length,
      totalRecords: companyRecords.length,
      statusBreakdown,
      executives,
      agents: agentData,
    })
  }

  items.sort((a, b) => b.totalRecords - a.totalRecords)
  return items
}

export function CompanyReport({ records, clients, agents, onCompanyClick }: CompanyReportProps) {
  const [dateFrom, setDateFrom] = useState('')
  const [dateTo, setDateTo] = useState('')
  const [statusFilter, setStatusFilter] = useState('Todos')
  const { toast } = useToast()

  const filteredRecords = useMemo(() => {
    return records.filter((r) => {
      if (dateFrom && r.created && r.created.substring(0, 10) < dateFrom) return false
      if (dateTo && r.created && r.created.substring(0, 10) > dateTo) return false
      if (statusFilter !== 'Todos' && r.status !== statusFilter) return false
      return true
    })
  }, [records, dateFrom, dateTo, statusFilter])

  const report = useMemo(
    () => computeReport(filteredRecords, clients, agents),
    [filteredRecords, clients, agents],
  )

  const hasActiveFilters = !!dateFrom || !!dateTo || statusFilter !== 'Todos'

  const clearFilters = () => {
    setDateFrom('')
    setDateTo('')
    setStatusFilter('Todos')
  }

  const handleExportCSV = () => {
    downloadCSV(reportToCSV(report), 'relatorio-empresas.csv')
    toast({ title: 'Relatório exportado em CSV' })
  }

  const handleCopy = async () => {
    try {
      await copyToClipboard(reportToText(report))
      toast({ title: 'Relatório copiado para a área de transferência' })
    } catch {
      toast({ variant: 'destructive', title: 'Erro ao copiar relatório' })
    }
  }

  const handlePrint = () => printReport(report)

  return (
    <div className="space-y-3">
      <CompanyReportFilters
        dateFrom={dateFrom}
        dateTo={dateTo}
        statusFilter={statusFilter}
        hasActiveFilters={hasActiveFilters}
        onDateFromChange={setDateFrom}
        onDateToChange={setDateTo}
        onStatusChange={setStatusFilter}
        onClear={clearFilters}
        onExportCSV={handleExportCSV}
        onCopy={handleCopy}
        onPrint={handlePrint}
      />

      {report.length === 0 ? (
        <Card className="border-slate-200 shadow-subtle p-8 text-center">
          <p className="text-xs text-slate-400">
            Nenhuma empresa com atendimentos registrados para os filtros selecionados.
          </p>
        </Card>
      ) : (
        report.map((item) => (
          <Card
            key={item.company}
            className="border-slate-200 shadow-subtle overflow-hidden cursor-pointer hover:border-indigo-300 hover:shadow-elevation transition-all"
            onClick={() => onCompanyClick(item.company)}
          >
            <div className="p-4 space-y-3">
              <div className="flex items-center justify-between">
                <div className="flex items-center gap-2">
                  <div className="h-8 w-8 rounded-lg bg-indigo-50 text-indigo-700 flex items-center justify-center">
                    <Building2 className="h-4 w-4" />
                  </div>
                  <h4 className="text-sm font-bold text-slate-900">{item.company}</h4>
                </div>
                <div className="flex items-center gap-2">
                  <Badge variant="outline" className="text-xs gap-1">
                    <Users className="h-3 w-3" /> {item.agentCount}
                  </Badge>
                  <Badge variant="secondary" className="text-xs gap-1">
                    <Headset className="h-3 w-3" /> {item.totalRecords}
                  </Badge>
                </div>
              </div>

              <div className="flex items-center gap-1 text-xs text-slate-600">
                <MapPin className="h-3 w-3 text-slate-400" />
                <span className="font-semibold text-slate-700">Cidade/Estado: </span>
                {item.city !== '—' && item.state !== '—'
                  ? `${item.city}/${item.state}`
                  : item.city !== '—'
                    ? item.city
                    : item.state !== '—'
                      ? item.state
                      : '—'}
              </div>

              {item.executives.length > 0 && (
                <div className="text-xs text-slate-600">
                  <span className="font-semibold text-slate-700">Executivo de Contas: </span>
                  {item.executives.join(', ')}
                </div>
              )}

              <div className="flex flex-wrap gap-1.5">
                {STATUSES.map((s) => (
                  <span
                    key={s}
                    className={`text-[11px] px-2 py-0.5 rounded-md border ${STATUS_COLORS[s]}`}
                  >
                    {s}: {item.statusBreakdown[s] || 0}
                  </span>
                ))}
              </div>

              {item.agents.length > 0 && (
                <div className="flex flex-wrap gap-1.5 pt-1 border-t">
                  {item.agents.map((a, i) => (
                    <span
                      key={i}
                      className="text-[11px] text-slate-600 bg-slate-100 px-2 py-0.5 rounded"
                    >
                      {a.name} ({a.recordCount})
                    </span>
                  ))}
                </div>
              )}
            </div>
          </Card>
        ))
      )}
    </div>
  )
}
