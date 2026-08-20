import { useState, useEffect, useMemo, useCallback } from 'react'
import { Card, CardContent } from '@/components/ui/card'
import { Button } from '@/components/ui/button'
import { Badge } from '@/components/ui/badge'
import {
  Table,
  TableHeader,
  TableBody,
  TableRow,
  TableHead,
  TableCell,
} from '@/components/ui/table'
import {
  AlertDialog,
  AlertDialogAction,
  AlertDialogCancel,
  AlertDialogContent,
  AlertDialogDescription,
  AlertDialogFooter,
  AlertDialogHeader,
  AlertDialogTitle,
} from '@/components/ui/alert-dialog'
import {
  Target,
  Plus,
  Pencil,
  Trash2,
  RefreshCw,
  ShieldAlert,
  Globe,
  History,
  Download,
  FileText,
} from 'lucide-react'
import { useAuth } from '@/hooks/use-auth'
import { useRealtime } from '@/hooks/use-realtime'
import { getAgents } from '@/services/agents'
import { getServiceRecords } from '@/services/service_records'
import { getAgentTargets, deleteAgentTarget } from '@/services/agent-targets'
import { getGlobalTarget } from '@/services/global-targets'
import { AgentTargetDialog } from '@/components/AgentTargetDialog'
import { GlobalTargetDialog } from '@/components/GlobalTargetDialog'
import { AgentHistoryDialog } from '@/components/AgentHistoryDialog'
import type {
  AgentRecord,
  AgentTargetRecord,
  GlobalTargetRecord,
  ServiceRecord,
} from '@/types/service_record'
import { cn } from '@/lib/utils'
import { useToast } from '@/hooks/use-toast'
import {
  canManageTargets,
  computeCurrentMonthStats,
  resolveEffectiveTarget,
  getAttendanceStatus,
  getResolutionStatus,
  getOverallStatus,
  STATUS_STYLES,
  monthLabel,
  currentGMT3Date,
  buildComparisonRows,
  type EffectiveTarget,
  type Status,
} from '@/lib/metas'
import { exportMetasCSV, exportMetasPDF } from '@/lib/metas-export'

function ProgressBar({ value, max, status }: { value: number; max: number; status: Status }) {
  const pct = max > 0 ? Math.min(100, Math.round((value / max) * 100)) : 0
  return (
    <div className="flex items-center gap-2">
      <div className="h-2 flex-1 rounded-full bg-slate-100 overflow-hidden">
        <div
          className={cn('h-full rounded-full transition-all', STATUS_STYLES[status].bar)}
          style={{ width: `${pct}%` }}
        />
      </div>
      <span className="text-[11px] font-bold text-slate-600 w-9 text-right">{pct}%</span>
    </div>
  )
}

export default function MetasDesempenho() {
  const { user } = useAuth()
  const { toast } = useToast()
  const [agents, setAgents] = useState<AgentRecord[]>([])
  const [targets, setTargets] = useState<AgentTargetRecord[]>([])
  const [globalTarget, setGlobalTarget] = useState<GlobalTargetRecord | null>(null)
  const [records, setRecords] = useState<ServiceRecord[]>([])
  const [loading, setLoading] = useState(true)
  const [dialogOpen, setDialogOpen] = useState(false)
  const [globalDialogOpen, setGlobalDialogOpen] = useState(false)
  const [editingTarget, setEditingTarget] = useState<AgentTargetRecord | null>(null)
  const [deleteId, setDeleteId] = useState<string | null>(null)
  const [deleting, setDeleting] = useState(false)
  const [historyAgent, setHistoryAgent] = useState<AgentRecord | null>(null)
  const [historyOpen, setHistoryOpen] = useState(false)
  const [exporting, setExporting] = useState(false)

  const canManage = canManageTargets(user?.role, user?.master_access)

  const loadData = useCallback(async () => {
    try {
      const [a, t, g, r] = await Promise.all([
        getAgents(),
        getAgentTargets(),
        getGlobalTarget(),
        getServiceRecords(),
      ])
      setAgents(a)
      setTargets(t)
      setGlobalTarget(g)
      setRecords(r)
    } catch (err) {
      console.error(err)
    } finally {
      setLoading(false)
    }
  }, [])

  useEffect(() => {
    loadData()
  }, [loadData])
  useRealtime('agent_targets', () => loadData())
  useRealtime('service_records', () => loadData())
  useRealtime('global_targets', () => loadData())

  const agentMap = useMemo(() => new Map(agents.map((a) => [a.id, a])), [agents])

  const realByAgent = useMemo(() => computeCurrentMonthStats(records), [records])

  const effectiveByAgent = useMemo(() => {
    const map = new Map<string, EffectiveTarget>()
    for (const a of agents) {
      map.set(
        a.id,
        resolveEffectiveTarget(
          a.id,
          targets,
          globalTarget || {
            id: 'default',
            monthly_attendance_target: 100,
            min_resolution_rate: 80,
            created: '',
            updated: '',
          },
        ),
      )
    }
    return map
  }, [agents, targets, globalTarget])

  const rows = useMemo(() => {
    return agents
      .map((agent) => {
        const eff = effectiveByAgent.get(agent.id)
        const real = realByAgent.get(agent.id) || { total: 0, resolved: 0, rate: 0 }
        const attendanceStatus = getAttendanceStatus(
          real.total,
          eff?.monthly_attendance_target || 0,
        )
        const resolutionStatus = getResolutionStatus(real.rate, eff?.min_resolution_rate || 0)
        const overall = getOverallStatus(attendanceStatus, resolutionStatus)
        return {
          agent,
          effective: eff,
          targetRecord: eff?.targetRecord,
          real,
          attendanceStatus,
          resolutionStatus,
          overall,
        }
      })
      .sort((a, b) => a.agent.name.localeCompare(b.agent.name))
  }, [agents, effectiveByAgent, realByAgent])

  const existingAgentIds = useMemo(() => targets.map((t) => t.agent), [targets])

  const handleSaved = (saved: AgentTargetRecord, isEdit: boolean) => {
    setTargets((prev) => {
      if (isEdit) {
        return prev.map((t) => (t.id === saved.id ? { ...t, ...saved } : t))
      }
      return [...prev, saved]
    })
  }

  const handleGlobalSaved = (saved: GlobalTargetRecord) => {
    setGlobalTarget(saved)
  }

  const handleDelete = async () => {
    if (!deleteId) return
    setDeleting(true)
    try {
      await deleteAgentTarget(deleteId)
      setTargets((prev) => prev.filter((t) => t.id !== deleteId))
      setDeleteId(null)
    } catch (err) {
      console.error(err)
    } finally {
      setDeleting(false)
    }
  }

  const handleExportCSV = () => {
    try {
      const comparisonRows = buildComparisonRows(
        agents,
        targets,
        globalTarget || {
          id: 'default',
          monthly_attendance_target: 100,
          min_resolution_rate: 80,
          created: '',
          updated: '',
        },
        records,
      )
      exportMetasCSV(comparisonRows)
      toast({ title: 'CSV exportado com sucesso!' })
    } catch (err) {
      console.error(err)
      toast({ variant: 'destructive', title: 'Erro ao exportar CSV' })
    }
  }

  const handleExportPDF = () => {
    setExporting(true)
    try {
      const comparisonRows = buildComparisonRows(
        agents,
        targets,
        globalTarget || {
          id: 'default',
          monthly_attendance_target: 100,
          min_resolution_rate: 80,
          created: '',
          updated: '',
        },
        records,
      )
      exportMetasPDF(comparisonRows)
      toast({ title: 'PDF gerado! Use a janela de impressão para salvar.' })
    } catch (err) {
      console.error(err)
      toast({ variant: 'destructive', title: 'Erro ao gerar PDF' })
    } finally {
      setExporting(false)
    }
  }

  if (!canManage) {
    return (
      <div className="space-y-6">
        <h2 className="text-2xl font-extrabold tracking-tight text-slate-900">
          Metas de Desempenho
        </h2>
        <Card className="p-8 text-center">
          <ShieldAlert className="h-12 w-12 text-amber-500 mx-auto mb-3" />
          <p className="text-sm text-slate-500">Você não tem permissão para acessar esta página.</p>
        </Card>
      </div>
    )
  }

  const now = currentGMT3Date()
  const monthLbl = monthLabel(now.year, now.month)
  const globalCount = rows.filter((r) => r.effective?.source === 'global').length
  const individualCount = rows.filter((r) => r.effective?.source === 'individual').length

  return (
    <div className="space-y-6">
      <div className="flex flex-col sm:flex-row sm:items-center sm:justify-between gap-4">
        <div>
          <h2 className="text-2xl font-extrabold tracking-tight text-slate-900 flex items-center gap-2">
            <Target className="h-6 w-6 text-indigo-600" /> Metas de Desempenho
          </h2>
          <p className="text-xs text-slate-500">
            Metas de atendimentos/mês e % mínima de resolução por agente — referência:{' '}
            <span className="font-semibold capitalize">{monthLbl}</span>
          </p>
        </div>
        <div className="flex flex-wrap gap-2">
          <Button variant="outline" size="sm" onClick={loadData} disabled={loading}>
            <RefreshCw className={cn('h-4 w-4 mr-1.5', loading && 'animate-spin')} />
            Atualizar
          </Button>
          <Button
            variant="outline"
            size="sm"
            onClick={handleExportCSV}
            disabled={rows.length === 0}
          >
            <Download className="h-4 w-4 mr-1.5" />
            Exportar CSV
          </Button>
          <Button
            variant="outline"
            size="sm"
            onClick={handleExportPDF}
            disabled={rows.length === 0 || exporting}
          >
            <FileText className="h-4 w-4 mr-1.5" />
            Exportar PDF
          </Button>
          <Button
            variant="outline"
            size="sm"
            onClick={() => setGlobalDialogOpen(true)}
            className="border-indigo-200 text-indigo-700 hover:bg-indigo-50"
          >
            <Globe className="h-4 w-4 mr-1.5" />
            Meta Global
          </Button>
          <Button
            size="sm"
            className="bg-indigo-600 hover:bg-indigo-700"
            onClick={() => {
              setEditingTarget(null)
              setDialogOpen(true)
            }}
          >
            <Plus className="h-4 w-4 mr-1.5" /> Nova Meta
          </Button>
        </div>
      </div>

      {/* Card da Meta Global */}
      <Card className="border-indigo-200 bg-indigo-50/40 shadow-subtle">
        <CardContent className="p-4 flex flex-col sm:flex-row sm:items-center sm:justify-between gap-3">
          <div className="flex items-center gap-3">
            <div className="h-10 w-10 rounded-lg bg-indigo-100 flex items-center justify-center">
              <Globe className="h-5 w-5 text-indigo-600" />
            </div>
            <div>
              <p className="text-[10px] font-bold uppercase text-indigo-500">
                Meta Global (Padrão)
              </p>
              <p className="text-sm font-bold text-slate-900">
                {globalTarget?.monthly_attendance_target ?? '—'} atendimentos/mês · mín.{' '}
                {globalTarget?.min_resolution_rate ?? '—'}% de resolução
              </p>
              <p className="text-[11px] text-slate-500">
                Aplicada a agentes sem meta individual. Individual prevalece sobre a global.
              </p>
            </div>
          </div>
          <Button variant="outline" size="sm" onClick={() => setGlobalDialogOpen(true)}>
            <Pencil className="h-3.5 w-3.5 mr-1.5" />
            Editar Meta Global
          </Button>
        </CardContent>
      </Card>

      {/* Resumo de indicadores */}
      <div className="grid grid-cols-2 sm:grid-cols-4 gap-3">
        <Card className="border-slate-200 shadow-subtle">
          <CardContent className="p-4">
            <p className="text-[10px] font-bold uppercase text-slate-500">Agentes</p>
            <p className="text-2xl font-black text-slate-900">{agents.length}</p>
          </CardContent>
        </Card>
        <Card className="border-slate-200 shadow-subtle">
          <CardContent className="p-4">
            <p className="text-[10px] font-bold uppercase text-slate-500">Metas individuais</p>
            <p className="text-2xl font-black text-indigo-600">{individualCount}</p>
          </CardContent>
        </Card>
        <Card className="border-slate-200 shadow-subtle">
          <CardContent className="p-4">
            <p className="text-[10px] font-bold uppercase text-slate-500">Usando meta global</p>
            <p className="text-2xl font-black text-slate-600">{globalCount}</p>
          </CardContent>
        </Card>
        <Card className="border-slate-200 shadow-subtle">
          <CardContent className="p-4">
            <p className="text-[10px] font-bold uppercase text-slate-500">Atingiram geral</p>
            <p className="text-2xl font-black text-emerald-600">
              {rows.filter((r) => r.overall === 'atingiu').length}
            </p>
          </CardContent>
        </Card>
      </div>

      <Card className="border-slate-200 shadow-subtle">
        <CardContent className="p-4">
          {loading ? (
            <div className="py-10 text-center text-xs text-slate-400">Carregando metas...</div>
          ) : rows.length === 0 ? (
            <div className="py-10 text-center">
              <Target className="h-10 w-10 text-slate-300 mx-auto mb-2" />
              <p className="text-xs text-slate-400">
                Nenhum agente cadastrado. Cadastre agentes para definir metas.
              </p>
            </div>
          ) : (
            <div className="overflow-x-auto">
              <Table>
                <TableHeader className="bg-slate-50">
                  <TableRow>
                    <TableHead className="text-xs font-bold">Agente</TableHead>
                    <TableHead className="text-xs font-bold w-[26%]">
                      Atendimentos (real / meta)
                    </TableHead>
                    <TableHead className="text-xs font-bold w-[24%]">
                      Resolução (real / mín.)
                    </TableHead>
                    <TableHead className="text-xs font-bold text-center">Status</TableHead>
                    <TableHead className="text-xs font-bold text-center w-[130px]">Ações</TableHead>
                  </TableRow>
                </TableHeader>
                <TableBody>
                  {rows.map(
                    ({
                      agent,
                      effective,
                      targetRecord,
                      real,
                      attendanceStatus,
                      resolutionStatus,
                      overall,
                    }) => {
                      const isIndividual = effective?.source === 'individual'
                      return (
                        <TableRow key={agent.id} className="hover:bg-slate-50 align-top">
                          <TableCell className="text-xs font-semibold">
                            <div className="flex items-center gap-1.5">
                              {agent.name}
                              {agent.expand?.client_id && (
                                <span className="text-[10px] text-slate-400 font-normal">
                                  — {agent.expand.client_id.name}
                                </span>
                              )}
                            </div>
                            <Badge
                              variant="secondary"
                              className={cn(
                                'mt-1 text-[9px] h-4 px-1.5',
                                isIndividual
                                  ? 'bg-indigo-100 text-indigo-700'
                                  : 'bg-slate-100 text-slate-500',
                              )}
                            >
                              <Globe className="h-2.5 w-2.5 mr-0.5" />
                              {isIndividual ? 'Individual' : 'Global'}
                            </Badge>
                          </TableCell>
                          <TableCell>
                            <div className="flex items-center justify-between mb-1">
                              <span className="text-[11px] text-slate-500">
                                {real.total} / {effective?.monthly_attendance_target ?? 0}
                              </span>
                              <Badge
                                variant="secondary"
                                className={cn(
                                  'text-[10px] h-5',
                                  STATUS_STYLES[attendanceStatus].badge,
                                )}
                              >
                                {STATUS_STYLES[attendanceStatus].label}
                              </Badge>
                            </div>
                            <ProgressBar
                              value={real.total}
                              max={effective?.monthly_attendance_target || 0}
                              status={attendanceStatus}
                            />
                          </TableCell>
                          <TableCell>
                            <div className="flex items-center justify-between mb-1">
                              <span className="text-[11px] text-slate-500">
                                {real.rate}% / {effective?.min_resolution_rate ?? 0}%
                              </span>
                              <Badge
                                variant="secondary"
                                className={cn(
                                  'text-[10px] h-5',
                                  STATUS_STYLES[resolutionStatus].badge,
                                )}
                              >
                                {STATUS_STYLES[resolutionStatus].label}
                              </Badge>
                            </div>
                            <ProgressBar
                              value={real.rate}
                              max={effective?.min_resolution_rate || 0}
                              status={resolutionStatus}
                            />
                          </TableCell>
                          <TableCell className="text-center">
                            <Badge
                              variant="secondary"
                              className={cn('text-[10px] h-5', STATUS_STYLES[overall].badge)}
                            >
                              {STATUS_STYLES[overall].label}
                            </Badge>
                          </TableCell>
                          <TableCell>
                            <div className="flex items-center justify-center gap-1">
                              <Button
                                variant="ghost"
                                size="icon"
                                className="h-7 w-7"
                                title="Ver histórico"
                                onClick={() => {
                                  setHistoryAgent(agent)
                                  setHistoryOpen(true)
                                }}
                              >
                                <History className="h-3.5 w-3.5 text-slate-500" />
                              </Button>
                              {isIndividual && targetRecord ? (
                                <>
                                  <Button
                                    variant="ghost"
                                    size="icon"
                                    className="h-7 w-7"
                                    title="Editar meta individual"
                                    onClick={() => {
                                      setEditingTarget(targetRecord)
                                      setDialogOpen(true)
                                    }}
                                  >
                                    <Pencil className="h-3.5 w-3.5 text-slate-500" />
                                  </Button>
                                  <Button
                                    variant="ghost"
                                    size="icon"
                                    className="h-7 w-7 hover:text-rose-600"
                                    title="Excluir meta individual"
                                    onClick={() => setDeleteId(targetRecord.id)}
                                  >
                                    <Trash2 className="h-3.5 w-3.5" />
                                  </Button>
                                </>
                              ) : (
                                <Button
                                  variant="ghost"
                                  size="icon"
                                  className="h-7 w-7"
                                  title="Definir meta individual"
                                  onClick={() => {
                                    setEditingTarget(null)
                                    setDialogOpen(true)
                                  }}
                                >
                                  <Plus className="h-3.5 w-3.5 text-indigo-500" />
                                </Button>
                              )}
                            </div>
                          </TableCell>
                        </TableRow>
                      )
                    },
                  )}
                </TableBody>
              </Table>
            </div>
          )}
        </CardContent>
      </Card>

      {/* Legenda */}
      <div className="flex flex-wrap items-center gap-4 text-[11px] text-slate-500">
        <span className="flex items-center gap-1.5">
          <span className="h-2.5 w-2.5 rounded-full bg-emerald-500" /> Atingiu (≥ meta)
        </span>
        <span className="flex items-center gap-1.5">
          <span className="h-2.5 w-2.5 rounded-full bg-amber-500" /> Perto (≥ 80% / até 10 p.p.
          abaixo)
        </span>
        <span className="flex items-center gap-1.5">
          <span className="h-2.5 w-2.5 rounded-full bg-rose-500" /> Abaixo da meta
        </span>
        <span className="flex items-center gap-1.5">
          <Globe className="h-3 w-3 text-slate-400" /> Global = meta padrão herdada
        </span>
      </div>

      <AgentTargetDialog
        open={dialogOpen}
        onOpenChange={setDialogOpen}
        agents={agents}
        editingTarget={editingTarget}
        existingAgentIds={existingAgentIds}
        onSaved={handleSaved}
      />

      <GlobalTargetDialog
        open={globalDialogOpen}
        onOpenChange={setGlobalDialogOpen}
        current={globalTarget}
        onSaved={handleGlobalSaved}
      />

      <AgentHistoryDialog
        open={historyOpen}
        onOpenChange={setHistoryOpen}
        agent={historyAgent}
        records={records}
        effective={historyAgent ? effectiveByAgent.get(historyAgent.id) || null : null}
      />

      <AlertDialog open={Boolean(deleteId)} onOpenChange={(o) => !o && setDeleteId(null)}>
        <AlertDialogContent>
          <AlertDialogHeader>
            <AlertDialogTitle>Excluir meta individual?</AlertDialogTitle>
            <AlertDialogDescription>
              Esta ação não pode ser desfeita. A meta individual será removida e o agente passará a
              usar a meta global padrão.
            </AlertDialogDescription>
          </AlertDialogHeader>
          <AlertDialogFooter>
            <AlertDialogCancel disabled={deleting}>Cancelar</AlertDialogCancel>
            <AlertDialogAction
              onClick={handleDelete}
              disabled={deleting}
              className="bg-rose-600 hover:bg-rose-700"
            >
              {deleting ? 'Excluindo...' : 'Excluir'}
            </AlertDialogAction>
          </AlertDialogFooter>
        </AlertDialogContent>
      </AlertDialog>
    </div>
  )
}
