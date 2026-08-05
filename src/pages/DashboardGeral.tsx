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
import { DashboardStats } from '@/components/DashboardStats'
import { ConsolidatedReportPanel } from '@/components/ConsolidatedReportPanel'
import { SERVICE_GROUP_OPTIONS } from '@/lib/service-groups'
import { ShieldAlert, BarChart3, Users2 } from 'lucide-react'

const AVOIDABLE_REASONS = ['Disponível no RF', 'Fora do Escopo', 'Erro RF', 'Outros']
const PRIVILEGED_ROLES = ['Master', 'Gerentes', 'Supervisores', 'Líderes']

export default function DashboardGeral() {
  const { user } = useAuth()
  const [clients, setClients] = useState<ClientRecord[]>([])
  const [records, setRecords] = useState<ServiceRecord[]>([])
  const [executives, setExecutives] = useState<AccountExecutiveRecord[]>([])

  const loadData = async () => {
    try {
      const [c, r, e] = await Promise.all([
        getClients(),
        getServiceRecords('', '-created'),
        getAccountExecutives(),
      ])
      setClients(c)
      setRecords(r)
      setExecutives(e)
    } catch (err) {
      console.error(err)
    }
  }

  useEffect(() => {
    loadData()
  }, [])
  useRealtime('service_records', () => loadData())
  useRealtime('clients', () => loadData())

  const stats = useMemo(() => {
    const todayStr = new Date().toISOString().substring(0, 10)
    const todayRecords = records.filter((r) => r.created?.startsWith(todayStr))
    const totalDuration = records.reduce((a, r) => a + (r.duration || 0), 0)
    return {
      todayCount: todayRecords.length,
      totalCount: records.length,
      inProgressCount: records.filter((r) => r.status === 'Em Andamento').length,
      completedTodayCount: todayRecords.filter((r) => r.status === 'Concluído').length,
      avgDuration: records.length > 0 ? Math.round(totalDuration / records.length) : 0,
      wrongDeptCount: records.filter((r) => r.avoidable_contact).length,
    }
  }, [records])

  const groupStats = useMemo(() => {
    const clientById = new Map(clients.map((c) => [c.id, c]))
    const companyToGroup = new Map<string, string>()
    for (const c of clients) {
      if (c.company) companyToGroup.set(c.company, c.service_group || '')
    }
    return SERVICE_GROUP_OPTIONS.map((group) => {
      const groupRecords = records.filter((r) => {
        const clientId = r.client || r.expand?.client?.id
        if (clientId) {
          const clientObj = clientById.get(clientId)
          if (clientObj && clientObj.service_group === group.value) return true
        }
        if (r.client_company && companyToGroup.get(r.client_company) === group.value) return true
        return false
      })
      const total = groupRecords.length
      const avoidable = groupRecords.filter((r) => r.avoidable_contact).length
      const reasonBreakdown: Record<string, number> = {}
      AVOIDABLE_REASONS.forEach((r) => (reasonBreakdown[r] = 0))
      groupRecords.forEach((r) => {
        if (r.avoidable_contact && r.avoidable_contact_reason) {
          const reason = r.avoidable_contact_reason as string
          if (reasonBreakdown[reason] !== undefined) reasonBreakdown[reason]++
        }
      })
      return {
        label: group.label,
        total,
        avoidable,
        rate: total > 0 ? Math.round((avoidable / total) * 100) : 0,
        reasonBreakdown,
      }
    })
  }, [clients, records])

  const execStats = useMemo(() => {
    return executives
      .map((exec) => {
        const execRecords = records.filter(
          (r) => r.expand?.account_executive?.id === exec.id || r.account_executive === exec.id,
        )
        const total = execRecords.length
        const avoidable = execRecords.filter((r) => r.avoidable_contact).length
        return {
          name: exec.name,
          total,
          avoidable,
          rate: total > 0 ? Math.round((avoidable / total) * 100) : 0,
        }
      })
      .filter((s) => s.total > 0)
  }, [records, executives])

  if (!PRIVILEGED_ROLES.includes(user?.role || '')) {
    return (
      <div className="space-y-6">
        <h2 className="text-2xl font-extrabold tracking-tight text-slate-900">Dashboard Geral</h2>
        <Card className="p-8 text-center">
          <ShieldAlert className="h-12 w-12 text-amber-500 mx-auto mb-3" />
          <p className="text-sm text-slate-500">Você não tem permissão para acessar esta página.</p>
        </Card>
      </div>
    )
  }

  return (
    <div className="space-y-6">
      <div>
        <h2 className="text-2xl font-extrabold tracking-tight text-slate-900 flex items-center gap-2">
          <BarChart3 className="h-6 w-6 text-indigo-600" />
          Dashboard Geral
        </h2>
        <p className="text-xs text-slate-500">
          Indicadores consolidados de todos os grupos e executivos
        </p>
      </div>

      <DashboardStats {...stats} />

      <div className="grid grid-cols-1 lg:grid-cols-2 gap-4">
        <Card className="border-slate-200 shadow-subtle">
          <CardContent className="p-4">
            <h3 className="text-sm font-bold text-slate-900 mb-3 flex items-center gap-2">
              <BarChart3 className="h-4 w-4 text-indigo-600" /> Por Grupo de Atendimento
            </h3>
            <Table>
              <TableHeader className="bg-slate-50">
                <TableRow>
                  <TableHead className="text-xs font-bold">Grupo</TableHead>
                  <TableHead className="text-xs font-bold text-center">Total</TableHead>
                  <TableHead className="text-xs font-bold text-center">Evitáveis</TableHead>
                  <TableHead className="text-xs font-bold text-center">Taxa</TableHead>
                </TableRow>
              </TableHeader>
              <TableBody>
                {groupStats.map((g) => (
                  <TableRow key={g.label} className="hover:bg-slate-50">
                    <TableCell className="text-xs font-semibold">{g.label}</TableCell>
                    <TableCell className="text-xs text-center">{g.total}</TableCell>
                    <TableCell className="text-xs text-center">{g.avoidable}</TableCell>
                    <TableCell className="text-xs text-center font-bold">{g.rate}%</TableCell>
                  </TableRow>
                ))}
              </TableBody>
            </Table>
          </CardContent>
        </Card>

        <Card className="border-slate-200 shadow-subtle">
          <CardContent className="p-4">
            <h3 className="text-sm font-bold text-slate-900 mb-3 flex items-center gap-2">
              <Users2 className="h-4 w-4 text-indigo-600" /> Por Executivo de Contas
            </h3>
            <Table>
              <TableHeader className="bg-slate-50">
                <TableRow>
                  <TableHead className="text-xs font-bold">Executivo</TableHead>
                  <TableHead className="text-xs font-bold text-center">Total</TableHead>
                  <TableHead className="text-xs font-bold text-center">Evitáveis</TableHead>
                  <TableHead className="text-xs font-bold text-center">Taxa</TableHead>
                </TableRow>
              </TableHeader>
              <TableBody>
                {execStats.map((e) => (
                  <TableRow key={e.name} className="hover:bg-slate-50">
                    <TableCell className="text-xs font-semibold">{e.name}</TableCell>
                    <TableCell className="text-xs text-center">{e.total}</TableCell>
                    <TableCell className="text-xs text-center">{e.avoidable}</TableCell>
                    <TableCell className="text-xs text-center font-bold">{e.rate}%</TableCell>
                  </TableRow>
                ))}
                {execStats.length === 0 && (
                  <TableRow>
                    <TableCell colSpan={4} className="text-center text-xs text-slate-400 py-4">
                      Nenhum dado disponível
                    </TableCell>
                  </TableRow>
                )}
              </TableBody>
            </Table>
          </CardContent>
        </Card>
      </div>

      <ConsolidatedReportPanel records={records} />
    </div>
  )
}
