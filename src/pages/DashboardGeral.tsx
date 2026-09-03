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
import { getUsers } from '@/services/users'
import {
  ClientRecord,
  ServiceRecord,
  AccountExecutiveRecord,
  UserRecord,
} from '@/types/service_record'
import { useRealtime } from '@/hooks/use-realtime'
import { useAuth } from '@/hooks/use-auth'
import { DashboardStats } from '@/components/DashboardStats'
import { ConsolidatedReportPanel } from '@/components/ConsolidatedReportPanel'
import { PeriodComparison } from '@/components/PeriodComparison'
import { DashboardAdvancedFilters } from '@/components/DashboardAdvancedFilters'
import { FeedbackReviewPanel } from '@/components/FeedbackReviewPanel'
import { ScheduledExportDialog } from '@/components/ScheduledExportDialog'
import { SERVICE_GROUP_OPTIONS } from '@/lib/service-groups'
import { isCreatedToday, isCreatedOrUpdatedToday } from '@/lib/date-utils'
import { Tooltip, TooltipContent, TooltipTrigger } from '@/components/ui/tooltip'
import { Info } from 'lucide-react'
import {
  DashboardFilters,
  DEFAULT_FILTERS,
  filterRecords,
  filterByUserAccess,
  getPreviousPeriodCount,
} from '@/lib/dashboard-filters'
import { ShieldAlert, BarChart3, Users2 } from 'lucide-react'
import { Tabs, TabsList, TabsTrigger, TabsContent } from '@/components/ui/tabs'
import { ComparativeView } from '@/components/ComparativeView'
import { PeriodComparisonView } from '@/components/PeriodComparisonView'
import { ThresholdSuggestionPanel } from '@/components/ThresholdSuggestionPanel'
import { TravelTypeReportPanel } from '@/components/TravelTypeReportPanel'
import { PerformanceAlerts } from '@/components/PerformanceAlerts'

const PRIVILEGED_ROLES = ['Master', 'Gerente', 'Supervisor', 'Líder']

export default function DashboardGeral() {
  const { user } = useAuth()
  const [clients, setClients] = useState<ClientRecord[]>([])
  const [records, setRecords] = useState<ServiceRecord[]>([])
  const [executives, setExecutives] = useState<AccountExecutiveRecord[]>([])
  const [users, setUsers] = useState<UserRecord[]>([])
  const [filters, setFilters] = useState<DashboardFilters>(DEFAULT_FILTERS)

  const loadData = async () => {
    try {
      const [c, r, e, u] = await Promise.all([
        getClients(),
        getServiceRecords('', '-created'),
        getAccountExecutives(),
        getUsers(),
      ])
      setClients(c)
      setRecords(r)
      setExecutives(e)
      setUsers(u)
    } catch (err) {
      console.error(err)
    }
  }

  useEffect(() => {
    loadData()
  }, [])
  useRealtime('service_records', () => loadData())
  useRealtime('clients', () => loadData())

  const clientMap = useMemo(() => new Map(clients.map((c) => [c.id, c])), [clients])
  const userMap = useMemo(() => {
    const m = new Map<string, { service_groups?: string[] }>()
    users.forEach((u) => m.set(u.id, { service_groups: u.service_groups as string[] | undefined }))
    return m
  }, [users])
  const accessibleRecords = useMemo(
    () => filterByUserAccess(records, user, clientMap, userMap),
    [records, user, clientMap, userMap],
  )
  const filtered = useMemo(
    () => filterRecords(accessibleRecords, filters, clientMap),
    [accessibleRecords, filters, clientMap],
  )
  const prevCount = useMemo(
    () => getPreviousPeriodCount(accessibleRecords, filters.dateFrom, filters.dateTo),
    [accessibleRecords, filters],
  )

  const stats = useMemo(() => {
    const todayRecords = accessibleRecords.filter((r) =>
      isCreatedOrUpdatedToday(r.created, r.updated),
    )
    const isStatusFiltered = filters.status != null && filters.status !== 'Todos'
    const todayCountSource = isStatusFiltered
      ? todayRecords.filter((r) => r.status === filters.status)
      : todayRecords
    const totalDur = filtered.reduce((a, r) => a + (r.duration || 0), 0)
    const recordsWithTfr = filtered.filter((r) => r.first_response_time != null)
    const totalTfr = recordsWithTfr.reduce((a, r) => a + (r.first_response_time || 0), 0)
    const avgTfr =
      recordsWithTfr.length > 0 ? Math.round((totalTfr / recordsWithTfr.length) * 10) / 10 : 0

    const statusBreakdown = {
      Aberto: todayRecords.filter((r) => r.status === 'Aberto').length,
      'Em Andamento': todayRecords.filter((r) => r.status === 'Em Andamento').length,
      Concluído: todayRecords.filter((r) => r.status === 'Concluído').length,
      Cancelado: todayRecords.filter((r) => r.status === 'Cancelado').length,
    }

    return {
      todayCount: todayCountSource.length,
      todayCountTotal: todayRecords.length,
      isStatusFiltered,
      activeStatusFilter: isStatusFiltered ? filters.status : null,
      totalCount: filtered.length,
      cancelledCount: filtered.filter((r) => r.status === 'Cancelado').length,
      inProgressCount: filtered.filter((r) => r.status === 'Em Andamento').length,
      completedTodayCount: todayRecords.filter((r) => r.status === 'Concluído').length,
      avgDuration: filtered.length > 0 ? Math.round(totalDur / filtered.length) : 0,
      avgTfr,
      wrongDeptCount: filtered.filter((r) => r.avoidable_contact).length,
      statusBreakdown,
    }
  }, [filtered, accessibleRecords, filters.status])

  const groupStats = useMemo(() => {
    const coMap = new Map<string, string>()
    for (const c of clients) {
      if (c.company) coMap.set(c.company, c.service_group || '')
    }
    return SERVICE_GROUP_OPTIONS.map((group) => {
      const gr = filtered.filter((r) => {
        const cid = r.client || r.expand?.client?.id
        if (cid) {
          const cl = clientMap.get(cid)
          if (cl?.service_group === group.value) return true
        }
        if (r.client_company && coMap.get(r.client_company) === group.value) return true
        return false
      })
      const total = gr.length
      const avoidable = gr.filter((r) => r.avoidable_contact).length
      return {
        label: group.label,
        total,
        avoidable,
        rate: total > 0 ? Math.round((avoidable / total) * 100) : 0,
      }
    })
  }, [clients, filtered, clientMap])

  const execStats = useMemo(
    () =>
      executives
        .map((exec) => {
          const er = filtered.filter(
            (r) => r.expand?.account_executive?.id === exec.id || r.account_executive === exec.id,
          )
          const total = er.length
          const avoidable = er.filter((r) => r.avoidable_contact).length
          return {
            name: exec.name,
            total,
            avoidable,
            rate: total > 0 ? Math.round((avoidable / total) * 100) : 0,
          }
        })
        .filter((s) => s.total > 0),
    [filtered, executives],
  )

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
      <div className="flex flex-col sm:flex-row sm:items-center sm:justify-between gap-4">
        <div>
          <h2 className="text-2xl font-extrabold tracking-tight text-slate-900 flex items-center gap-2">
            <BarChart3 className="h-6 w-6 text-indigo-600" /> Dashboard Geral
          </h2>
          <p className="text-xs text-slate-500">
            Indicadores consolidados de todos os grupos e executivos
          </p>
        </div>
        <ScheduledExportDialog />
      </div>

      <DashboardAdvancedFilters filters={filters} onChange={setFilters} />

      <PerformanceAlerts records={accessibleRecords} />

      <Tabs defaultValue="overview" className="space-y-4">
        <TabsList>
          <TabsTrigger value="overview" className="text-xs">
            Visão Geral
          </TabsTrigger>
          <TabsTrigger value="comparative" className="text-xs">
            Comparativo
          </TabsTrigger>
          <TabsTrigger value="period" className="text-xs">
            Comparativo de Períodos
          </TabsTrigger>
        </TabsList>
        <TabsContent value="overview" className="space-y-6">
          {filters.dateFrom && filters.dateTo && (
            <PeriodComparison currentCount={filtered.length} previousCount={prevCount} />
          )}

          <DashboardStats
            todayCount={stats.todayCount}
            todayCountTotal={stats.todayCountTotal}
            isStatusFiltered={stats.isStatusFiltered}
            activeStatusFilter={stats.activeStatusFilter}
            totalCount={stats.totalCount}
            cancelledCount={stats.cancelledCount}
            inProgressCount={stats.inProgressCount}
            completedTodayCount={stats.completedTodayCount}
            avgDuration={stats.avgDuration}
            avgTfr={stats.avgTfr}
            tfrTarget={15}
            wrongDeptCount={stats.wrongDeptCount}
            statusBreakdown={stats.statusBreakdown}
          />

          <div className="grid grid-cols-1 lg:grid-cols-2 gap-4">
            <Card className="border-slate-200 shadow-subtle">
              <CardContent className="p-4">
                <h3 className="text-sm font-bold text-slate-900 mb-3 flex items-center gap-2">
                  <BarChart3 className="h-4 w-4 text-indigo-600" /> Por Grupo
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
                  <Users2 className="h-4 w-4 text-indigo-600" /> Por Executivo
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
                          Nenhum dado
                        </TableCell>
                      </TableRow>
                    )}
                  </TableBody>
                </Table>
              </CardContent>
            </Card>
          </div>

          <ThresholdSuggestionPanel records={accessibleRecords} clients={clients} />
          <ConsolidatedReportPanel records={filtered} />
          <TravelTypeReportPanel records={filtered} />
          <FeedbackReviewPanel />
        </TabsContent>

        <TabsContent value="comparative" className="space-y-4">
          <ComparativeView records={filtered} clients={clients} executives={executives} />
        </TabsContent>

        <TabsContent value="period" className="space-y-4">
          <PeriodComparisonView
            records={accessibleRecords}
            clients={clients}
            executives={executives}
          />
        </TabsContent>
      </Tabs>
    </div>
  )
}
