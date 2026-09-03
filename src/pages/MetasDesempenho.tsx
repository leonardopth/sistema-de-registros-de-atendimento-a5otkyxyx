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
  UserCheck,
} from 'lucide-react'
import { useAuth } from '@/hooks/use-auth'
import { useRealtime } from '@/hooks/use-realtime'
import { getUsers, updateEmailNotifications } from '@/services/users'
import { Switch } from '@/components/ui/switch'
import { Mail, BellRing } from 'lucide-react'
import { getServiceRecords } from '@/services/service_records'
import { getUserTargets, deleteUserTarget, type UserTargetRecord } from '@/services/user-targets'
import { getGlobalTarget } from '@/services/global-targets'
import { getEmailLogs, type EmailLogRecord } from '@/services/outlook-integration'
import { getCallAnalysisLogs, type CallAnalysisLogRecord } from '@/services/telephony-integration'
import { UserTargetDialog } from '@/components/UserTargetDialog'
import { GlobalTargetDialog } from '@/components/GlobalTargetDialog'
import { UserHistoryDialog } from '@/components/UserHistoryDialog'
import { TableColumnFilter } from '@/components/TableColumnFilter'
import type { UserRecord, GlobalTargetRecord, ServiceRecord } from '@/types/service_record'
import { cn } from '@/lib/utils'
import { useToast } from '@/hooks/use-toast'
import {
  canManageTargets,
  isLeadershipRole,
  getTeamMembersForLeader,
  computeEffectiveStatsByUsers,
  resolveEffectiveTarget,
  getAttendanceStatus,
  getResolutionStatus,
  getResponseTimeStatus,
  getAutoCategorizationStatus,
  getSatisfactionStatus,
  getOverallStatus,
  STATUS_STYLES,
  monthLabel,
  currentGMT3Date,
  buildComparisonRows,
  type EffectiveTarget,
  type Status,
  type SentimentLogItem,
} from '@/lib/metas'
import { Users2, User, Send, Snowflake } from 'lucide-react'
import { exportMetasCSV, exportMetasPDF } from '@/lib/metas-export'
import { ExecutiveMonthlyReportModal } from '@/components/ExecutiveMonthlyReportModal'
import { getMetaSnapshots, triggerFreezeSnapshots } from '@/services/meta-snapshots'
import type { MetaSnapshotRecord } from '@/types/meta_snapshot'

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
  const [users, setUsers] = useState<UserRecord[]>([])
  const [targets, setTargets] = useState<UserTargetRecord[]>([])
  const [globalTarget, setGlobalTarget] = useState<GlobalTargetRecord | null>(null)
  const [records, setRecords] = useState<ServiceRecord[]>([])
  const [sentimentLogs, setSentimentLogs] = useState<SentimentLogItem[]>([])
  const [loading, setLoading] = useState(true)
  const [dialogOpen, setDialogOpen] = useState(false)
  const [globalDialogOpen, setGlobalDialogOpen] = useState(false)
  const [editingTarget, setEditingTarget] = useState<UserTargetRecord | null>(null)
  const [deleteId, setDeleteId] = useState<string | null>(null)
  const [deleting, setDeleting] = useState(false)
  const [historyUser, setHistoryUser] = useState<UserRecord | null>(null)
  const [historyOpen, setHistoryOpen] = useState(false)
  const [snapshots, setSnapshots] = useState<MetaSnapshotRecord[]>([])
  const [freezing, setFreezing] = useState(false)
  const [exporting, setExporting] = useState(false)
  const [executiveModalOpen, setExecutiveModalOpen] = useState(false)
  const [emailNotificationsEnabled, setEmailNotificationsEnabled] = useState<boolean>(
    user?.email_notifications !== false,
  )
  const [updatingNotifications, setUpdatingNotifications] = useState(false)

  // Sincroniza estado de notificações do perfil do usuário
  useEffect(() => {
    if (user) {
      setEmailNotificationsEnabled(user.email_notifications !== false)
    }
  }, [user])

  const handleToggleEmailNotifications = async (checked: boolean) => {
    if (!user?.id) return
    setUpdatingNotifications(true)
    try {
      await updateEmailNotifications(user.id, checked)
      setEmailNotificationsEnabled(checked)
      toast({
        title: checked ? 'Notificações por e-mail ativadas' : 'Notificações por e-mail desativadas',
        description: checked
          ? 'Você receberá alertas diários caso algum colaborador atinja níveis críticos de desempenho.'
          : 'Você não receberá mais os e-mails diários de alertas críticos.',
      })
    } catch (err) {
      console.error(err)
      toast({
        variant: 'destructive',
        title: 'Erro ao salvar preferência de e-mail',
      })
    } finally {
      setUpdatingNotifications(false)
    }
  }

  // Filtros em colunas
  const [selectedUsers, setSelectedUsers] = useState<string[]>([])
  const [selectedRoles, setSelectedRoles] = useState<string[]>([])
  const [selectedSources, setSelectedSources] = useState<string[]>([])
  const [selectedStatuses, setSelectedStatuses] = useState<string[]>([])

  const canManage = canManageTargets(user?.role, user?.master_access)

  const loadData = useCallback(async () => {
    try {
      const [u, t, g, r, snap, emailLogs, callLogs] = await Promise.all([
        getUsers(),
        getUserTargets(),
        getGlobalTarget(),
        getServiceRecords(),
        getMetaSnapshots().catch(() => [] as MetaSnapshotRecord[]),
        getEmailLogs().catch(() => [] as EmailLogRecord[]),
        getCallAnalysisLogs().catch(() => [] as CallAnalysisLogRecord[]),
      ])
      // Filtra usuários que são colaboradores internos e lideranças operacionais
      const internalUsers = u.filter((item) =>
        [
          'Consultor',
          'Líder',
          'Supervisor',
          'Gerente',
          'Gestor Comercial',
          'Consultores',
          'Líderes',
          'Supervisores',
          'Gerentes',
        ].includes(item.role),
      )
      setUsers(internalUsers)
      setTargets(t)
      setGlobalTarget(g)
      setRecords(r)
      setSnapshots(snap)

      const sLogs: SentimentLogItem[] = [
        ...emailLogs.map((el) => ({
          processed_by: el.processed_by,
          sentiment: el.sentiment,
          confidence_score: el.confidence_score,
          created: el.created,
        })),
        ...callLogs.map((cl) => ({
          processed_by: cl.processed_by,
          sentiment: cl.sentiment,
          quality_score: cl.quality_score,
          created: cl.created,
        })),
      ]
      setSentimentLogs(sLogs)
    } catch (err) {
      console.error(err)
    } finally {
      setLoading(false)
    }
  }, [])

  useEffect(() => {
    loadData()
  }, [loadData])

  useRealtime('user_targets', () => loadData())
  useRealtime('service_records', () => loadData())
  useRealtime('global_targets', () => loadData())
  useRealtime('meta_snapshots', () => loadData())
  useRealtime('email_analysis_logs', () => loadData())
  useRealtime('call_analysis_logs', () => loadData())

  const realByUser = useMemo(
    () => computeEffectiveStatsByUsers(users, records, sentimentLogs),
    [users, records, sentimentLogs],
  )

  const effectiveByUser = useMemo(() => {
    const map = new Map<string, EffectiveTarget>()
    for (const u of users) {
      map.set(
        u.id,
        resolveEffectiveTarget(
          u.id,
          targets,
          globalTarget || {
            id: 'default',
            monthly_attendance_target: 100,
            min_resolution_rate: 80,
            avg_response_time_target: 15,
            auto_categorization_target: 80,
            min_satisfaction_target: 85,
            created: '',
            updated: '',
          },
        ),
      )
    }
    return map
  }, [users, targets, globalTarget])

  const allRows = useMemo(() => {
    return users
      .map((colab) => {
        const eff = effectiveByUser.get(colab.id)
        const real = realByUser.get(colab.id) || {
          total: 0,
          resolved: 0,
          rate: 0,
          avgDuration: 0,
          avoidableCount: 0,
          avoidableRate: 0,
          autoCategorizedCount: 0,
          autoCategorizedRate: 0,
          categorizationAccuracy: 90,
          avgSatisfactionScore: 90,
          positiveSentimentCount: 0,
          totalFeedbackCount: 0,
        }
        const attendanceStatus = getAttendanceStatus(
          real.total,
          eff?.monthly_attendance_target || 0,
        )
        const resolutionStatus = getResolutionStatus(real.rate, eff?.min_resolution_rate || 0)
        const responseTimeStatus = getResponseTimeStatus(
          real.avgDuration,
          eff?.avg_response_time_target || 15,
        )
        const autoCatStatus = getAutoCategorizationStatus(
          real.autoCategorizedRate,
          eff?.auto_categorization_target || 80,
        )
        const satisfactionStatus = getSatisfactionStatus(
          real.avgSatisfactionScore,
          eff?.min_satisfaction_target || 85,
        )
        const overall = getOverallStatus(attendanceStatus, resolutionStatus)
        const sourceLabel = eff?.source === 'individual' ? 'Individual' : 'Global'
        const isLeader = isLeadershipRole(colab.role)
        const teamMembers = isLeader ? getTeamMembersForLeader(colab, users) : [colab]
        return {
          user: colab,
          effective: eff,
          targetRecord: eff?.targetRecord,
          real,
          isLeader,
          teamMembers,
          attendanceStatus,
          resolutionStatus,
          responseTimeStatus,
          autoCatStatus,
          satisfactionStatus,
          overall,
          sourceLabel,
          statusLabel: STATUS_STYLES[overall].label,
        }
      })
      .sort((a, b) => a.user.name.localeCompare(b.user.name))
  }, [users, effectiveByUser, realByUser])

  // Filtragem multi-colunas
  const filteredRows = useMemo(() => {
    return allRows.filter((r) => {
      if (selectedUsers.length > 0 && !selectedUsers.includes(r.user.name)) return false
      if (selectedRoles.length > 0 && !selectedRoles.includes(r.user.role)) return false
      if (selectedSources.length > 0 && !selectedSources.includes(r.sourceLabel)) return false
      if (selectedStatuses.length > 0 && !selectedStatuses.includes(r.statusLabel)) return false
      return true
    })
  }, [allRows, selectedUsers, selectedRoles, selectedSources, selectedStatuses])

  const existingUserIds = useMemo(() => targets.map((t) => t.user), [targets])

  const handleSaved = (saved: UserTargetRecord, isEdit: boolean) => {
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
      await deleteUserTarget(deleteId)
      setTargets((prev) => prev.filter((t) => t.id !== deleteId))
      setDeleteId(null)
      toast({ title: 'Meta individual removida com sucesso' })
    } catch (err) {
      console.error(err)
      toast({ variant: 'destructive', title: 'Erro ao remover meta' })
    } finally {
      setDeleting(false)
    }
  }

  const handleExportCSV = () => {
    try {
      const comparisonRows = buildComparisonRows(
        users,
        targets,
        globalTarget || {
          id: 'default',
          monthly_attendance_target: 100,
          min_resolution_rate: 80,
          avg_response_time_target: 15,
          auto_categorization_target: 80,
          min_satisfaction_target: 85,
          created: '',
          updated: '',
        },
        records,
        sentimentLogs,
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
        users,
        targets,
        globalTarget || {
          id: 'default',
          monthly_attendance_target: 100,
          min_resolution_rate: 80,
          avg_response_time_target: 15,
          auto_categorization_target: 80,
          min_satisfaction_target: 85,
          created: '',
          updated: '',
        },
        records,
        sentimentLogs,
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
  const globalCount = allRows.filter((r) => r.effective?.source === 'global').length
  const individualCount = allRows.filter((r) => r.effective?.source === 'individual').length

  return (
    <div className="space-y-6">
      <div className="flex flex-col sm:flex-row sm:items-center sm:justify-between gap-4">
        <div>
          <h2 className="text-2xl font-extrabold tracking-tight text-slate-900 flex items-center gap-2">
            <Target className="h-6 w-6 text-indigo-600" /> Metas de Desempenho
          </h2>
          <p className="text-xs text-slate-500">
            Avaliação de colaboradores internos (consultores e lideranças) — referência:{' '}
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
            disabled={allRows.length === 0}
          >
            <Download className="h-4 w-4 mr-1.5" />
            Exportar CSV
          </Button>
          <Button
            variant="outline"
            size="sm"
            onClick={handleExportPDF}
            disabled={allRows.length === 0 || exporting}
          >
            <FileText className="h-4 w-4 mr-1.5" />
            Exportar PDF
          </Button>
          <Button
            variant="outline"
            size="sm"
            onClick={async () => {
              setFreezing(true)
              try {
                const res = await triggerFreezeSnapshots()
                toast({
                  title: 'Snapshots congelados com sucesso!',
                  description: `${res.result.periodLabel}: ${res.result.totalEligible} colaboradores apurados (${res.result.created} criados, ${res.result.updated} atualizados).`,
                })
                await loadData()
              } catch (err: any) {
                toast({
                  variant: 'destructive',
                  title: 'Erro ao congelar snapshots',
                  description: err?.message || 'Falha na comunicação com o backend.',
                })
              } finally {
                setFreezing(false)
              }
            }}
            disabled={freezing}
            className="border-sky-300 text-sky-700 bg-sky-50 hover:bg-sky-100 font-semibold"
            title="Congela ou atualiza os números consolidados imutáveis do mês anterior para todo o time"
          >
            <Snowflake className={cn('h-4 w-4 mr-1.5 text-sky-600', freezing && 'animate-spin')} />
            {freezing ? 'Congelando...' : 'Congelar Mês Anterior'}
          </Button>
          <Button
            variant="outline"
            size="sm"
            onClick={() => setExecutiveModalOpen(true)}
            className="border-indigo-300 text-indigo-700 bg-indigo-50/50 hover:bg-indigo-100 font-semibold"
          >
            <Send className="h-4 w-4 mr-1.5 text-indigo-600" />
            Relatório Executivo Mensal
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

      {/* Card de Configuração de Notificações por E-mail */}
      <Card className="border-slate-200 bg-white shadow-subtle">
        <CardContent className="p-4 flex flex-col sm:flex-row sm:items-center sm:justify-between gap-4">
          <div className="flex items-start sm:items-center gap-3">
            <div className="h-10 w-10 rounded-lg bg-indigo-50 border border-indigo-100 flex items-center justify-center shrink-0">
              <Mail className="h-5 w-5 text-indigo-600" />
            </div>
            <div>
              <div className="flex items-center gap-2">
                <p className="text-xs font-bold text-slate-900">
                  Notificações por e-mail para alertas críticos
                </p>
                <Badge
                  variant="secondary"
                  className={cn(
                    'text-[10px] h-4 px-1.5',
                    emailNotificationsEnabled
                      ? 'bg-emerald-100 text-emerald-700'
                      : 'bg-slate-100 text-slate-500',
                  )}
                >
                  {emailNotificationsEnabled ? 'Ativo' : 'Desativado'}
                </Badge>
              </div>
              <p className="text-[11px] text-slate-500 mt-0.5">
                Envio diário às 8h com colaboradores abaixo de 50% da meta de atendimentos ou taxa
                de resolução mais de 20 p.p. abaixo do mínimo.
              </p>
            </div>
          </div>
          <div className="flex items-center gap-2.5 self-end sm:self-center shrink-0">
            <span className="text-xs text-slate-600 font-medium">
              {emailNotificationsEnabled ? 'Receber alertas diários' : 'Silenciado'}
            </span>
            <Switch
              checked={emailNotificationsEnabled}
              onCheckedChange={handleToggleEmailNotifications}
              disabled={updatingNotifications}
              aria-label="Ativar/desativar notificações por e-mail de alertas críticos"
            />
          </div>
        </CardContent>
      </Card>

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
                {globalTarget?.monthly_attendance_target ?? 100} atendimentos/mês · máx.{' '}
                {globalTarget?.avg_response_time_target ?? 15} min resposta ·{' '}
                {globalTarget?.auto_categorization_target ?? 80}% categorização · mín.{' '}
                {globalTarget?.min_satisfaction_target ?? 85} pts satisfação
              </p>
              <p className="text-[11px] text-slate-500">
                Aplicada aos colaboradores sem meta individual. Individual prevalece sobre a global.
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
            <p className="text-[10px] font-bold uppercase text-slate-500">Colaboradores</p>
            <p className="text-2xl font-black text-slate-900">{users.length}</p>
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
              {allRows.filter((r) => r.overall === 'atingiu').length}
            </p>
          </CardContent>
        </Card>
      </div>

      <Card className="border-slate-200 shadow-subtle">
        <CardContent className="p-4">
          {loading ? (
            <div className="py-10 text-center text-xs text-slate-400">Carregando metas...</div>
          ) : allRows.length === 0 ? (
            <div className="py-10 text-center">
              <Target className="h-10 w-10 text-slate-300 mx-auto mb-2" />
              <p className="text-xs text-slate-400">
                Nenhum colaborador encontrado para acompanhamento de metas.
              </p>
            </div>
          ) : (
            <div className="overflow-x-auto">
              <Table>
                <TableHeader className="bg-slate-50">
                  <TableRow>
                    <TableHead className="text-xs font-bold">
                      <div className="flex items-center justify-between gap-1">
                        <span>Colaborador / Função</span>
                        <div className="flex items-center gap-0.5">
                          <TableColumnFilter
                            title="Colaborador"
                            options={Array.from(new Set(allRows.map((r) => r.user.name)))}
                            selectedValues={selectedUsers.length > 0 ? selectedUsers : undefined}
                            onSelectionChange={(vals) => setSelectedUsers(vals as string[])}
                          />
                          <TableColumnFilter
                            title="Função"
                            options={Array.from(new Set(allRows.map((r) => r.user.role)))}
                            selectedValues={selectedRoles.length > 0 ? selectedRoles : undefined}
                            onSelectionChange={(vals) => setSelectedRoles(vals as string[])}
                          />
                        </div>
                      </div>
                    </TableHead>
                    <TableHead className="text-xs font-bold w-[18%]">
                      <div className="flex items-center justify-between gap-1">
                        <span>Volume (real / meta)</span>
                      </div>
                    </TableHead>
                    <TableHead className="text-xs font-bold w-[13%] text-center">
                      Tempo Médio
                    </TableHead>
                    <TableHead className="text-xs font-bold w-[18%]">
                      <div className="flex items-center justify-between gap-1">
                        <span>Categorização Automática</span>
                      </div>
                    </TableHead>
                    <TableHead className="text-xs font-bold w-[13%] text-center">
                      Satisfação (IA)
                    </TableHead>
                    <TableHead className="text-xs font-bold text-center">
                      <div className="flex items-center justify-center gap-1">
                        <span>Status</span>
                        <TableColumnFilter
                          title="Status"
                          options={['Atingiu', 'Perto', 'Abaixo']}
                          selectedValues={
                            selectedStatuses.length > 0 ? selectedStatuses : undefined
                          }
                          onSelectionChange={(vals) => setSelectedStatuses(vals as string[])}
                        />
                      </div>
                    </TableHead>
                    <TableHead className="text-xs font-bold text-center w-[120px]">Ações</TableHead>
                  </TableRow>
                </TableHeader>
                <TableBody>
                  {filteredRows.map(
                    ({
                      user: colab,
                      effective,
                      targetRecord,
                      real,
                      isLeader,
                      teamMembers,
                      attendanceStatus,
                      responseTimeStatus,
                      autoCatStatus,
                      satisfactionStatus,
                      overall,
                    }) => {
                      const isIndividual = effective?.source === 'individual'
                      return (
                        <TableRow key={colab.id} className="hover:bg-slate-50 align-top">
                          <TableCell className="text-xs font-semibold">
                            <div className="flex items-center gap-1.5">
                              <span className="text-slate-900">{colab.name}</span>
                              <span className="text-[10px] text-slate-400 font-normal">
                                ({colab.role})
                              </span>
                            </div>
                            <div className="flex flex-wrap items-center gap-1 mt-1">
                              {isLeader ? (
                                <Badge
                                  variant="secondary"
                                  className="text-[9px] h-4 px-1.5 bg-indigo-50 text-indigo-700 border border-indigo-200"
                                  title={`Métricas consolidadas da equipe (${teamMembers.length} pessoas)`}
                                >
                                  <Users2 className="h-2.5 w-2.5 mr-1" />
                                  Equipe ({teamMembers.length})
                                </Badge>
                              ) : (
                                <Badge
                                  variant="secondary"
                                  className="text-[9px] h-4 px-1.5 bg-slate-50 text-slate-600 border border-slate-200"
                                >
                                  <User className="h-2.5 w-2.5 mr-1" />
                                  Individual
                                </Badge>
                              )}
                              <Badge
                                variant="secondary"
                                className={cn(
                                  'text-[9px] h-4 px-1.5',
                                  isIndividual
                                    ? 'bg-purple-100 text-purple-700'
                                    : 'bg-slate-100 text-slate-500',
                                )}
                              >
                                <Globe className="h-2.5 w-2.5 mr-0.5" />
                                {isIndividual ? 'Meta Própria' : 'Meta Global'}
                              </Badge>
                            </div>
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
                          <TableCell className="text-xs text-center font-medium text-slate-700 pt-3">
                            <div className="space-y-0.5">
                              <div>{real.avgDuration} min</div>
                              <div className="text-[10px] text-slate-400">
                                Alvo: ≤ {effective?.avg_response_time_target ?? 15} min
                              </div>
                            </div>
                          </TableCell>
                          <TableCell>
                            <div className="flex items-center justify-between mb-1">
                              <span className="text-[11px] text-slate-500">
                                {real.autoCategorizedRate}% /{' '}
                                {effective?.auto_categorization_target ?? 80}%
                              </span>
                              <Badge
                                variant="secondary"
                                className={cn(
                                  'text-[10px] h-5',
                                  STATUS_STYLES[autoCatStatus].badge,
                                )}
                              >
                                {STATUS_STYLES[autoCatStatus].label}
                              </Badge>
                            </div>
                            <ProgressBar
                              value={real.autoCategorizedRate}
                              max={effective?.auto_categorization_target || 80}
                              status={autoCatStatus}
                            />
                            <span className="text-[10px] text-slate-400 mt-0.5 block">
                              {real.autoCategorizedCount} atend. · acurácia{' '}
                              {real.categorizationAccuracy}%
                            </span>
                          </TableCell>
                          <TableCell className="text-xs text-center font-medium text-slate-700 pt-3">
                            <div className="space-y-0.5">
                              <span
                                className={cn(
                                  'font-bold text-xs',
                                  real.avgSatisfactionScore >=
                                    (effective?.min_satisfaction_target ?? 85)
                                    ? 'text-emerald-600'
                                    : 'text-amber-600',
                                )}
                              >
                                {real.avgSatisfactionScore} pts
                              </span>
                              <div className="text-[10px] text-slate-400">
                                Mín: {effective?.min_satisfaction_target ?? 85} pts
                              </div>
                            </div>
                          </TableCell>
                          <TableCell className="text-center pt-3">
                            <Badge
                              variant="secondary"
                              className={cn('text-[10px] h-5', STATUS_STYLES[overall].badge)}
                            >
                              {STATUS_STYLES[overall].label}
                            </Badge>
                          </TableCell>
                          <TableCell className="pt-2">
                            <div className="flex items-center justify-center gap-1">
                              <Button
                                variant="ghost"
                                size="icon"
                                className="h-7 w-7"
                                title="Ver histórico"
                                onClick={() => {
                                  setHistoryUser(colab)
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

      <UserTargetDialog
        open={dialogOpen}
        onOpenChange={setDialogOpen}
        users={users}
        editingTarget={editingTarget}
        existingUserIds={existingUserIds}
        onSaved={handleSaved}
      />

      <GlobalTargetDialog
        open={globalDialogOpen}
        onOpenChange={setGlobalDialogOpen}
        current={globalTarget}
        onSaved={handleGlobalSaved}
      />

      <UserHistoryDialog
        open={historyOpen}
        onOpenChange={setHistoryOpen}
        user={historyUser}
        records={records}
        effective={historyUser ? effectiveByUser.get(historyUser.id) || null : null}
        allUsers={users}
        snapshots={snapshots}
      />

      <ExecutiveMonthlyReportModal open={executiveModalOpen} onOpenChange={setExecutiveModalOpen} />

      <AlertDialog open={Boolean(deleteId)} onOpenChange={(o) => !o && setDeleteId(null)}>
        <AlertDialogContent>
          <AlertDialogHeader>
            <AlertDialogTitle>Excluir meta individual?</AlertDialogTitle>
            <AlertDialogDescription>
              Esta ação não pode ser desfeita. A meta individual será removida e o colaborador
              passará a usar a meta global padrão.
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
