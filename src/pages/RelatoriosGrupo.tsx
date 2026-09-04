import { useState, useEffect, useMemo } from 'react'
import { Card, CardContent } from '@/components/ui/card'
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
import { getAccountExecutives } from '@/services/account_executives'
import { ClientRecord, ServiceRecord, AccountExecutiveRecord } from '@/types/service_record'
import { useRealtime } from '@/hooks/use-realtime'
import { useAuth } from '@/hooks/use-auth'
import { SERVICE_GROUP_OPTIONS } from '@/lib/service-groups'
import { getUserServiceGroups } from '@/lib/service-group-access'
import { ExportMenu } from '@/components/ExportMenu'
import { TableColumnFilter } from '@/components/TableColumnFilter'
import {
  downloadGroupReportCSV,
  downloadGroupReportExcel,
  downloadGroupReportPDF,
} from '@/lib/group-report-export'

const AVOIDABLE_REASONS = ['Disponível no RF', 'Fora do Escopo', 'Erro RF', 'Outros']

export default function RelatoriosGrupo() {
  const { user } = useAuth()
  const [clients, setClients] = useState<ClientRecord[]>([])
  const [records, setRecords] = useState<ServiceRecord[]>([])
  const [executives, setExecutives] = useState<AccountExecutiveRecord[]>([])

  const loadData = async () => {
    try {
      const [allClients, allRecords, execs] = await Promise.all([
        getClients(),
        getServiceRecords('-created'),
        getAccountExecutives(),
      ])

      let filteredClients = allClients
      if (user?.role === 'Executivo de contas') {
        const exec = execs.find((e) => e.email === user?.email || e.name === user?.name)
        if (exec) {
          filteredClients = allClients.filter(
            (c) => c.account_executive_rel === exec.id || c.account_executive === exec.name,
          )
        } else {
          filteredClients = []
        }
      }

      setClients(filteredClients)
      setRecords(allRecords)
      setExecutives(execs)
    } catch (err) {
      console.error(err)
    }
  }

  useEffect(() => {
    loadData()
  }, [])
  useRealtime('service_records', () => loadData())
  useRealtime('clients', () => loadData())

  const userGroups = useMemo(() => getUserServiceGroups(user), [user])

  const groupStats = useMemo(() => {
    const clientById = new Map(clients.map((c) => [c.id, c]))
    const companyToGroup = new Map<string, string>()
    for (const c of clients) {
      if (c.company) companyToGroup.set(c.company, c.service_group || '')
    }

    const groupsToShow =
      userGroups.length > 0
        ? SERVICE_GROUP_OPTIONS.filter((g) => userGroups.includes(g.value))
        : SERVICE_GROUP_OPTIONS

    return groupsToShow.map((group) => {
      const groupRecords = records.filter((r) => {
        const clientId = r.client || r.expand?.client?.id
        if (clientId) {
          const clientObj = clientById.get(clientId)
          if (clientObj && clientObj.service_group === group.value) return true
        }
        if (r.client_company) {
          const sg = companyToGroup.get(r.client_company)
          if (sg === group.value) return true
        }
        return false
      })

      const total = groupRecords.length
      const avoidable = groupRecords.filter((r) => r.avoidable_contact).length
      const rate = total > 0 ? Math.round((avoidable / total) * 100) : 0

      const reasonBreakdown: Record<string, number> = {}
      AVOIDABLE_REASONS.forEach((r) => (reasonBreakdown[r] = 0))
      groupRecords.forEach((r) => {
        if (r.avoidable_contact && r.avoidable_contact_reason) {
          const reason = r.avoidable_contact_reason as string
          if (reasonBreakdown[reason] !== undefined) reasonBreakdown[reason]++
        }
      })

      return { group: group.value, label: group.label, total, avoidable, rate, reasonBreakdown }
    })
  }, [clients, records, userGroups])

  const [colGroups, setColGroups] = useState<string[]>([])

  const filteredGroupStats = groupStats.filter((stat) => {
    if (colGroups.length > 0 && !colGroups.includes(stat.label)) return false
    return true
  })

  const grandTotal = filteredGroupStats.reduce((a, g) => a + g.total, 0)
  const grandAvoidable = filteredGroupStats.reduce((a, g) => a + g.avoidable, 0)
  const grandRate = grandTotal > 0 ? Math.round((grandAvoidable / grandTotal) * 100) : 0

  return (
    <div className="space-y-6">
      <div className="flex flex-col sm:flex-row sm:items-center sm:justify-between gap-4">
        <div>
          <h2 className="text-2xl font-extrabold tracking-tight text-slate-900">
            Relatórios por Grupo de Atendimento
          </h2>
          <p className="text-xs text-slate-500">
            Indicadores de atendimento segmentados por grupo de atendimento
          </p>
        </div>
        <ExportMenu
          label="Exportar Relatório"
          onCSV={() =>
            downloadGroupReportCSV(groupStats, {
              period: 'Geral consolidado',
              filters: colGroups.length > 0 ? `Grupos: ${colGroups.join(', ')}` : 'Todos os Grupos',
              generatedBy: user?.name,
            })
          }
          onExcel={() => downloadGroupReportExcel(groupStats)}
          onPDF={() => downloadGroupReportPDF(groupStats)}
        />
      </div>

      <div className="grid grid-cols-1 sm:grid-cols-3 gap-4">
        <Card className="border-slate-200 shadow-subtle">
          <CardContent className="p-4">
            <p className="text-[10px] font-bold text-slate-500 uppercase">Total de Atendimentos</p>
            <p className="text-2xl font-black text-slate-900 mt-1">{grandTotal}</p>
          </CardContent>
        </Card>
        <Card className="border-slate-200 shadow-subtle">
          <CardContent className="p-4">
            <p className="text-[10px] font-bold text-amber-700 uppercase">Contatos Evitáveis</p>
            <p className="text-2xl font-black text-slate-900 mt-1">{grandAvoidable}</p>
          </CardContent>
        </Card>
        <Card className="border-slate-200 shadow-subtle">
          <CardContent className="p-4">
            <p className="text-[10px] font-bold text-rose-700 uppercase">Taxa de Evitáveis</p>
            <p className="text-2xl font-black text-slate-900 mt-1">{grandRate}%</p>
          </CardContent>
        </Card>
      </div>

      <Card className="border-slate-200 shadow-subtle overflow-hidden">
        <div className="overflow-x-auto">
          <Table>
            <TableHeader className="bg-slate-50">
              <TableRow>
                <TableHead className="text-xs font-bold">
                  <div className="flex items-center justify-between gap-1">
                    <span>Grupo de Atendimento</span>
                    <TableColumnFilter
                      title="Grupo"
                      options={groupStats.map((g) => g.label)}
                      selectedValues={colGroups}
                      onChange={setColGroups}
                    />
                  </div>
                </TableHead>
                <TableHead className="text-xs font-bold text-center">Total Atendimentos</TableHead>
                <TableHead className="text-xs font-bold text-center">Evitáveis</TableHead>
                <TableHead className="text-xs font-bold text-center">Taxa</TableHead>
                {AVOIDABLE_REASONS.map((r) => (
                  <TableHead key={r} className="text-xs font-bold text-center">
                    {r}
                  </TableHead>
                ))}
              </TableRow>
            </TableHeader>
            <TableBody>
              {filteredGroupStats.map((stat) => (
                <TableRow key={stat.group} className="hover:bg-slate-50">
                  <TableCell className="text-xs font-semibold text-slate-900">
                    <span className="inline-flex items-center rounded-full bg-indigo-50 px-2 py-0.5 text-[11px] font-semibold text-indigo-700">
                      {stat.label}
                    </span>
                  </TableCell>
                  <TableCell className="text-xs text-center text-slate-700">{stat.total}</TableCell>
                  <TableCell className="text-xs text-center text-slate-700">
                    {stat.avoidable}
                  </TableCell>
                  <TableCell className="text-xs text-center">
                    <span
                      className={
                        stat.rate > 30 ? 'font-bold text-rose-600' : 'font-semibold text-slate-900'
                      }
                    >
                      {stat.rate}%
                    </span>
                  </TableCell>
                  {AVOIDABLE_REASONS.map((r) => (
                    <TableCell key={r} className="text-xs text-center text-slate-600">
                      {stat.reasonBreakdown[r] || 0}
                    </TableCell>
                  ))}
                </TableRow>
              ))}
            </TableBody>
          </Table>
        </div>
      </Card>
    </div>
  )
}
