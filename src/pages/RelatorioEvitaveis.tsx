import { useState, useEffect, useMemo } from 'react'
import { Card } from '@/components/ui/card'
import { Button } from '@/components/ui/button'
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from '@/components/ui/select'
import {
  Table,
  TableHeader,
  TableBody,
  TableRow,
  TableHead,
  TableCell,
} from '@/components/ui/table'
import { getServiceRecords } from '@/services/service_records'
import { getClients } from '@/services/clients'
import { ClientRecord, ServiceRecord } from '@/types/service_record'
import { useRealtime } from '@/hooks/use-realtime'
import { useToast } from '@/hooks/use-toast'
import { exportServiceRecordsByExecutiveCSV } from '@/lib/executive-export'
import { FileText } from 'lucide-react'

const AVOIDABLE_REASONS = ['Disponível no RF', 'Fora do Escopo', 'Erro RF', 'Outros']

export default function RelatorioEvitaveis() {
  const [records, setRecords] = useState<ServiceRecord[]>([])
  const [clients, setClients] = useState<ClientRecord[]>([])
  const [agencyFilter, setAgencyFilter] = useState('todos')
  const [reasonFilter, setReasonFilter] = useState('todos')
  const { toast } = useToast()

  const loadData = async () => {
    try {
      const [recs, cls] = await Promise.all([getServiceRecords(), getClients()])
      setRecords(recs)
      setClients(cls)
    } catch (err) {
      console.error(err)
    }
  }

  useEffect(() => {
    loadData()
  }, [])
  useRealtime('service_records', () => loadData())

  const filteredRecords = useMemo(() => {
    return records.filter((r) => {
      if (r.avoidable_contact !== true) return false
      if (agencyFilter !== 'todos') {
        const clientObj = clients.find((c) => c.id === agencyFilter)
        const matches =
          r.expand?.client?.id === agencyFilter ||
          r.client === agencyFilter ||
          (clientObj && r.client_company === clientObj.company)
        if (!matches) return false
      }
      if (reasonFilter !== 'todos' && r.avoidable_contact_reason !== reasonFilter) return false
      return true
    })
  }, [records, clients, agencyFilter, reasonFilter])

  const crossTable = useMemo(() => {
    const agencyMap = new Map<string, Record<string, number>>()
    for (const r of filteredRecords) {
      const clientObj = clients.find((c) => c.id === r.client || c.id === r.expand?.client?.id)
      const agency = clientObj?.company || r.client_company || r.expand?.client?.company || '—'
      if (!agencyMap.has(agency)) {
        agencyMap.set(agency, Object.fromEntries(AVOIDABLE_REASONS.map((ar) => [ar, 0])))
      }
      const reason = r.avoidable_contact_reason as string
      if (AVOIDABLE_REASONS.includes(reason)) {
        agencyMap.get(agency)![reason]++
      }
    }
    return Array.from(agencyMap.entries()).map(([agency, reasons]) => ({
      agency,
      reasons,
      total: Object.values(reasons).reduce((a, b) => a + b, 0),
    }))
  }, [filteredRecords, clients])

  const handleExportCSV = () => {
    exportServiceRecordsByExecutiveCSV(filteredRecords, 'relatorio-evitaveis.csv')
    toast({
      title: 'Relatório exportado',
      description: `${filteredRecords.length} registro(s) em CSV.`,
    })
  }

  return (
    <div className="space-y-6">
      <div className="flex flex-col sm:flex-row sm:items-center sm:justify-between gap-4">
        <div>
          <h2 className="text-2xl font-extrabold tracking-tight text-slate-900">
            Relatório de Contatos Evitáveis
          </h2>
          <p className="text-xs text-slate-500">
            Análise cruzada de Agência × Motivo de Contato Evitável
          </p>
        </div>
        <Button onClick={handleExportCSV} variant="outline" size="sm" className="text-xs">
          <FileText className="h-3.5 w-3.5 mr-1.5" /> Exportar CSV
        </Button>
      </div>

      <Card className="p-4 border-slate-200 shadow-subtle">
        <div className="flex flex-wrap items-end gap-3">
          <div className="space-y-1">
            <label className="text-xs font-semibold text-slate-600">Agência</label>
            <Select value={agencyFilter} onValueChange={setAgencyFilter}>
              <SelectTrigger className="h-9 text-xs w-48">
                <SelectValue placeholder="Todas" />
              </SelectTrigger>
              <SelectContent>
                <SelectItem value="todos">Todas as Agências</SelectItem>
                {clients
                  .filter(
                    (c, i, arr) =>
                      c.company && arr.findIndex((c2) => c2.company === c.company) === i,
                  )
                  .map((c) => (
                    <SelectItem key={c.id} value={c.id}>
                      {c.company}
                    </SelectItem>
                  ))}
              </SelectContent>
            </Select>
          </div>
          <div className="space-y-1">
            <label className="text-xs font-semibold text-slate-600">Motivo</label>
            <Select value={reasonFilter} onValueChange={setReasonFilter}>
              <SelectTrigger className="h-9 text-xs w-48">
                <SelectValue placeholder="Todos" />
              </SelectTrigger>
              <SelectContent>
                <SelectItem value="todos">Todos os Motivos</SelectItem>
                {AVOIDABLE_REASONS.map((r) => (
                  <SelectItem key={r} value={r}>
                    {r}
                  </SelectItem>
                ))}
              </SelectContent>
            </Select>
          </div>
        </div>
      </Card>

      <Card className="border-slate-200 shadow-subtle overflow-hidden">
        <div className="overflow-x-auto">
          <Table>
            <TableHeader className="bg-slate-50">
              <TableRow>
                <TableHead className="text-xs font-bold">Agência</TableHead>
                {AVOIDABLE_REASONS.map((r) => (
                  <TableHead key={r} className="text-xs font-bold text-center">
                    {r}
                  </TableHead>
                ))}
                <TableHead className="text-xs font-bold text-center">Total</TableHead>
              </TableRow>
            </TableHeader>
            <TableBody>
              {crossTable.map((row) => (
                <TableRow key={row.agency} className="hover:bg-slate-50">
                  <TableCell className="text-xs font-semibold text-slate-900">
                    {row.agency}
                  </TableCell>
                  {AVOIDABLE_REASONS.map((r) => (
                    <TableCell key={r} className="text-xs text-center text-slate-700">
                      {row.reasons[r] || 0}
                    </TableCell>
                  ))}
                  <TableCell className="text-xs text-center font-bold text-slate-900">
                    {row.total}
                  </TableCell>
                </TableRow>
              ))}
              {crossTable.length === 0 && (
                <TableRow>
                  <TableCell
                    colSpan={AVOIDABLE_REASONS.length + 2}
                    className="text-center py-8 text-xs text-slate-400"
                  >
                    Nenhum contato evitável encontrado para os filtros selecionados.
                  </TableCell>
                </TableRow>
              )}
            </TableBody>
          </Table>
        </div>
      </Card>
    </div>
  )
}
