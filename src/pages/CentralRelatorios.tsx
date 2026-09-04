import { useState, useEffect, useMemo } from 'react'
import { useNavigate } from 'react-router-dom'
import { useAuth } from '@/hooks/use-auth'
import { useToast } from '@/hooks/use-toast'
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from '@/components/ui/card'
import { Button } from '@/components/ui/button'
import { Badge } from '@/components/ui/badge'
import { Switch } from '@/components/ui/switch'
import { Input } from '@/components/ui/input'
import { Label } from '@/components/ui/label'
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from '@/components/ui/select'
import {
  Dialog,
  DialogContent,
  DialogHeader,
  DialogTitle,
  DialogTrigger,
} from '@/components/ui/dialog'
import { ExecutiveMonthlyReportModal } from '@/components/ExecutiveMonthlyReportModal'
import { ScheduledExportDialog } from '@/components/ScheduledExportDialog'
import {
  getScheduledReports,
  createScheduledReport,
  updateScheduledReport,
  deleteScheduledReport,
} from '@/services/scheduled-reports'
import { ScheduledReportRecord } from '@/types/service_record'
import {
  BarChart3,
  UserCheck,
  HelpCircle,
  TrendingUp,
  FileSpreadsheet,
  FileText,
  Calendar,
  ArrowRight,
  Clock,
  Mail,
  Trash2,
  CalendarClock,
  Plus,
  RefreshCw,
  Sparkles,
  Layers,
  Send,
} from 'lucide-react'

const MANAGER_ROLES = ['Gerente', 'Supervisor', 'Líder']

interface ReportCardConfig {
  id: string
  title: string
  description: string
  icon: typeof BarChart3
  path: string
  badge?: string
  visible: (role: string, masterAccess?: boolean) => boolean
  supportsPeriodParam?: boolean
}

export default function CentralRelatorios() {
  const { user } = useAuth()
  const { toast } = useToast()
  const navigate = useNavigate()

  // Estado dos filtros compartilhados
  const [periodPreset, setPeriodPreset] = useState<
    'current_month' | 'last_30_days' | 'last_90_days' | 'all' | 'custom'
  >('current_month')
  const [dateFrom, setDateFrom] = useState('')
  const [dateTo, setDateTo] = useState('')

  // Modal do Relatório Executivo Mensal
  const [executiveModalOpen, setExecutiveModalOpen] = useState(false)

  // Agendamentos
  const [schedules, setSchedules] = useState<ScheduledReportRecord[]>([])
  const [loadingSchedules, setLoadingSchedules] = useState(false)
  const [newScheduleOpen, setNewScheduleOpen] = useState(false)
  const [schedEmail, setSchedEmail] = useState('')
  const [schedFrequency, setSchedFrequency] = useState('weekly')
  const [schedFormat, setSchedFormat] = useState('csv')
  const [savingSchedule, setSavingSchedule] = useState(false)

  // Calcula datas padrão ao mudar o preset
  useEffect(() => {
    const today = new Date()
    const fmt = (d: Date) => d.toISOString().substring(0, 10)

    if (periodPreset === 'current_month') {
      const firstDay = new Date(today.getFullYear(), today.getMonth(), 1)
      setDateFrom(fmt(firstDay))
      setDateTo(fmt(today))
    } else if (periodPreset === 'last_30_days') {
      const past30 = new Date(today.getTime() - 30 * 24 * 60 * 60 * 1000)
      setDateFrom(fmt(past30))
      setDateTo(fmt(today))
    } else if (periodPreset === 'last_90_days') {
      const past90 = new Date(today.getTime() - 90 * 24 * 60 * 60 * 1000)
      setDateFrom(fmt(past90))
      setDateTo(fmt(today))
    } else if (periodPreset === 'all') {
      setDateFrom('')
      setDateTo('')
    }
  }, [periodPreset])

  const loadSchedules = async () => {
    if (!user) return
    setLoadingSchedules(true)
    try {
      const list = await getScheduledReports()
      setSchedules(list)
    } catch (err) {
      console.error(err)
    } finally {
      setLoadingSchedules(false)
    }
  }

  useEffect(() => {
    loadSchedules()
    if (user?.email) {
      setSchedEmail(user.email)
    }
  }, [user])

  const handleToggleSchedule = async (id: string, active: boolean) => {
    try {
      await updateScheduledReport(id, { active: !active })
      loadSchedules()
    } catch {
      toast({ variant: 'destructive', title: 'Erro ao alterar status do agendamento' })
    }
  }

  const handleDeleteSchedule = async (id: string) => {
    try {
      await deleteScheduledReport(id)
      toast({ title: 'Agendamento removido' })
      loadSchedules()
    } catch {
      toast({ variant: 'destructive', title: 'Erro ao excluir agendamento' })
    }
  }

  const handleCreateSchedule = async (e: React.FormEvent) => {
    e.preventDefault()
    if (!user) return
    setSavingSchedule(true)
    try {
      await createScheduledReport({
        user_id: user.id,
        frequency: schedFrequency,
        email: schedEmail,
        format: schedFormat,
        active: true,
      })
      toast({ title: 'Agendamento criado com sucesso' })
      setNewScheduleOpen(false)
      loadSchedules()
    } catch {
      toast({ variant: 'destructive', title: 'Erro ao criar agendamento' })
    } finally {
      setSavingSchedule(false)
    }
  }

  // Definição dos 7 relatórios mapeados no sistema
  const reportCards: ReportCardConfig[] = [
    {
      id: 'relatorio-consultor',
      title: 'Relatório Consultor',
      description:
        'Performance individual e de equipe com volume, TMA, evitáveis e taxa de resolução.',
      icon: UserCheck,
      path: '/relatorio-consultor',
      visible: (r) => MANAGER_ROLES.includes(r) || r === 'Master',
      supportsPeriodParam: false,
    },
    {
      id: 'relatorios-grupo',
      title: 'Relatórios por Grupo',
      description: 'Indicadores segmentados por grupo de atendimento, motivos evitáveis e taxas.',
      icon: Layers,
      path: '/relatorios-grupo',
      visible: (r) => MANAGER_ROLES.includes(r) || r === 'Master',
      supportsPeriodParam: false,
    },
    {
      id: 'analise-motivos',
      title: 'Análise por Motivo',
      description:
        'Cruzamento analítico de motivo de contato vs. TMA, contatos evitáveis e sentimento por IA.',
      icon: HelpCircle,
      path: '/analise-motivos',
      badge: 'IA & Métricas',
      visible: (r) => MANAGER_ROLES.includes(r) || r === 'Master',
      supportsPeriodParam: true,
    },
    {
      id: 'relatorio-evitaveis',
      title: 'Relatório de Contatos Evitáveis',
      description:
        'Matriz cruzada de Agência vs. Motivo de Chamado Evitável com exportação tabular.',
      icon: FileSpreadsheet,
      path: '/relatorio-evitaveis',
      visible: (r) => MANAGER_ROLES.includes(r) || r === 'Master',
      supportsPeriodParam: false,
    },
    {
      id: 'comparativo',
      title: 'Comparativo entre Agentes',
      description:
        'Comparação de performance lado a lado entre colaboradores internos e benchmarks.',
      icon: BarChart3,
      path: '/comparativo',
      visible: (r, m) => MANAGER_ROLES.includes(r) || r === 'Master' || m === true,
      supportsPeriodParam: true,
    },
    {
      id: 'evolucao-treinamento',
      title: 'Evolução Pós-Treinamento',
      description:
        'Acompanhamento da redução de chamados evitáveis em 30, 60 e 90 dias após capacitação.',
      icon: TrendingUp,
      path: '/evolucao-treinamento',
      visible: (r) => MANAGER_ROLES.includes(r) || r === 'Master',
      supportsPeriodParam: false,
    },
    {
      id: 'atendimentos-consolidado',
      title: 'Relatório Consolidado de Atendimentos',
      description:
        'Listagem detalhada de todos os chamados com filtros avançados e exportações completas.',
      icon: FileText,
      path: '/atendimentos',
      visible: () => true,
      supportsPeriodParam: true,
    },
  ]

  // RBAC para visibilidade dos cards
  const visibleCards = useMemo(() => {
    if (!user) return []
    return reportCards.filter((c) => c.visible(user.role, user.master_access))
  }, [user])

  // Navega repassando query params se suportado
  const handleNavigateToReport = (report: ReportCardConfig) => {
    if (report.supportsPeriodParam) {
      const q = new URLSearchParams()
      if (report.id === 'analise-motivos') {
        if (periodPreset === 'all' || periodPreset === 'current_month') {
          q.set('period', periodPreset)
        } else if (periodPreset === 'last_30_days') {
          q.set('period', 'last_30_days')
        } else if (periodPreset === 'last_90_days') {
          q.set('period', 'last_90_days')
        }
      } else if (report.id === 'comparativo') {
        if (periodPreset === 'last_30_days' || periodPreset === 'last_90_days') {
          q.set('period', 'last_3_months')
        } else if (periodPreset === 'current_month') {
          q.set('period', 'current_month')
        }
      } else if (report.id === 'atendimentos-consolidado') {
        if (dateFrom) q.set('dateFrom', dateFrom)
        if (dateTo) q.set('dateTo', dateTo)
      }
      const qs = q.toString()
      navigate(qs ? `${report.path}?${qs}` : report.path)
    } else {
      navigate(report.path)
    }
  }

  const isLeadership =
    user &&
    (MANAGER_ROLES.includes(user.role) ||
      user.role === 'Master' ||
      user.role === 'Executivo de Contas' ||
      user.master_access === true)

  return (
    <div className="space-y-6">
      {/* Cabeçalho */}
      <div className="flex flex-col sm:flex-row sm:items-center sm:justify-between gap-4">
        <div>
          <h2 className="text-2xl font-extrabold tracking-tight text-slate-900 flex items-center gap-2">
            <BarChart3 className="h-6 w-6 text-indigo-600" />
            Central de Relatórios
          </h2>
          <p className="text-xs text-slate-500">
            Hub unificado de relatórios, inteligência de atendimento, exportações e automações
            agendadas
          </p>
        </div>

        <div className="flex items-center gap-2">
          {isLeadership && (
            <Button
              onClick={() => setExecutiveModalOpen(true)}
              size="sm"
              className="bg-indigo-600 hover:bg-indigo-700 text-white font-semibold text-xs shadow-sm"
            >
              <FileText className="h-3.5 w-3.5 mr-1.5" />
              Relatório Executivo Mensal
            </Button>
          )}
          <ScheduledExportDialog />
        </div>
      </div>

      {/* Barra de Filtros Compartilhados */}
      <Card className="border-slate-200 bg-white shadow-subtle">
        <CardContent className="p-4">
          <div className="flex flex-col md:flex-row md:items-end justify-between gap-4">
            <div className="flex flex-wrap items-end gap-3 flex-1">
              <div className="space-y-1">
                <Label className="text-xs font-semibold text-slate-700 flex items-center gap-1.5">
                  <Calendar className="h-3.5 w-3.5 text-indigo-600" />
                  Período Compartilhado
                </Label>
                <Select value={periodPreset} onValueChange={(v) => setPeriodPreset(v as any)}>
                  <SelectTrigger className="h-9 text-xs w-[180px] bg-slate-50">
                    <SelectValue placeholder="Selecione o período" />
                  </SelectTrigger>
                  <SelectContent>
                    <SelectItem value="current_month">Mês Atual</SelectItem>
                    <SelectItem value="last_30_days">Últimos 30 Dias</SelectItem>
                    <SelectItem value="last_90_days">Últimos 90 Dias</SelectItem>
                    <SelectItem value="all">Todo o Período</SelectItem>
                    <SelectItem value="custom">Personalizado</SelectItem>
                  </SelectContent>
                </Select>
              </div>

              {periodPreset === 'custom' && (
                <>
                  <div className="space-y-1">
                    <Label className="text-xs font-semibold text-slate-600">De</Label>
                    <Input
                      type="date"
                      value={dateFrom}
                      onChange={(e) => setDateFrom(e.target.value)}
                      className="h-9 text-xs w-[140px]"
                    />
                  </div>
                  <div className="space-y-1">
                    <Label className="text-xs font-semibold text-slate-600">Até</Label>
                    <Input
                      type="date"
                      value={dateTo}
                      onChange={(e) => setDateTo(e.target.value)}
                      className="h-9 text-xs w-[140px]"
                    />
                  </div>
                </>
              )}

              {dateFrom && dateTo && (
                <div className="pb-1.5 text-xs text-slate-500">
                  Intervalo:{' '}
                  <span className="font-semibold text-slate-700">
                    {dateFrom.split('-').reverse().join('/')} até{' '}
                    {dateTo.split('-').reverse().join('/')}
                  </span>
                </div>
              )}
            </div>

            <div className="text-xs text-slate-400">
              O período selecionado é repassado como parâmetro ao abrir cada relatório compatível.
            </div>
          </div>
        </CardContent>
      </Card>

      {/* Seção 1: Banner do Relatório Executivo Mensal */}
      {isLeadership && (
        <Card className="border-indigo-100 bg-gradient-to-r from-indigo-50/70 via-indigo-50/40 to-slate-50 shadow-subtle overflow-hidden">
          <CardContent className="p-5 flex flex-col md:flex-row md:items-center justify-between gap-4">
            <div className="space-y-1.5 max-w-2xl">
              <div className="flex items-center gap-2">
                <Badge className="bg-indigo-100 text-indigo-700 border-indigo-200 text-[10px] font-bold">
                  Consolidação Executiva
                </Badge>
                <span className="text-[11px] text-slate-500 flex items-center gap-1">
                  <Clock className="h-3 w-3 text-slate-400" /> Disparo automático todo 1º dia útil
                  às 08h00
                </span>
              </div>
              <h3 className="text-base font-bold text-slate-900">
                Relatório Executivo Mensal Consolidado
              </h3>
              <p className="text-xs text-slate-600 leading-relaxed">
                Visão executiva com volume total, TMA, TFR real, contatos evitáveis, metas batidas
                pela equipe, Top/Bottom 5 colaboradores e motivos em maior crescimento no mês
                comparado ao anterior.
              </p>
            </div>
            <Button
              onClick={() => setExecutiveModalOpen(true)}
              className="bg-indigo-600 hover:bg-indigo-700 text-white font-semibold text-xs shrink-0 shadow-sm"
            >
              <Send className="h-3.5 w-3.5 mr-1.5" />
              Abrir Pré-visualização & Envio
            </Button>
          </CardContent>
        </Card>
      )}

      {/* Seção 2: Cards dos Relatórios Existentes */}
      <div>
        <div className="flex items-center justify-between mb-3">
          <h3 className="text-sm font-bold text-slate-800 uppercase tracking-wide">
            Relatórios e Painéis Analíticos ({visibleCards.length})
          </h3>
          <span className="text-xs text-slate-400">
            Acesso filtrado conforme seu papel ({user?.role})
          </span>
        </div>

        <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-4">
          {visibleCards.map((card) => {
            const Icon = card.icon
            return (
              <Card
                key={card.id}
                className="border-slate-200 hover:border-indigo-300 hover:shadow-md transition-all duration-200 bg-white group flex flex-col justify-between"
              >
                <CardHeader className="p-4 pb-2">
                  <div className="flex items-start justify-between gap-2">
                    <div className="p-2.5 rounded-lg bg-indigo-50 text-indigo-600 group-hover:bg-indigo-600 group-hover:text-white transition-colors">
                      <Icon className="h-5 w-5" />
                    </div>
                    {card.badge && (
                      <Badge
                        variant="secondary"
                        className="text-[10px] bg-slate-100 text-slate-600"
                      >
                        {card.badge}
                      </Badge>
                    )}
                  </div>
                  <CardTitle className="text-sm font-bold text-slate-900 mt-2">
                    {card.title}
                  </CardTitle>
                  <CardDescription className="text-xs text-slate-500 line-clamp-2 mt-1">
                    {card.description}
                  </CardDescription>
                </CardHeader>
                <CardContent className="p-4 pt-2">
                  <Button
                    onClick={() => handleNavigateToReport(card)}
                    variant="ghost"
                    className="w-full justify-between text-xs font-semibold text-indigo-600 hover:text-indigo-700 hover:bg-indigo-50/70 p-2 h-8"
                  >
                    <span>Acessar Relatório</span>
                    <ArrowRight className="h-3.5 w-3.5 group-hover:translate-x-1 transition-transform" />
                  </Button>
                </CardContent>
              </Card>
            )
          })}
        </div>
      </div>

      {/* Seção 3: Relatórios Agendados */}
      <Card className="border-slate-200 bg-white shadow-subtle">
        <CardHeader className="p-5 pb-3 border-b border-slate-100">
          <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-3">
            <div>
              <CardTitle className="text-sm font-bold text-slate-900 flex items-center gap-2">
                <CalendarClock className="h-4 w-4 text-indigo-600" />
                Relatórios Agendados
              </CardTitle>
              <CardDescription className="text-xs text-slate-500 mt-0.5">
                Automações de envio por e-mail configuradas na sua conta (executadas pelo cron do
                sistema)
              </CardDescription>
            </div>

            <div className="flex items-center gap-2">
              <Button
                variant="outline"
                size="sm"
                onClick={loadSchedules}
                disabled={loadingSchedules}
                className="h-8 text-xs"
                title="Recarregar agendamentos"
              >
                <RefreshCw className={`h-3 w-3 mr-1 ${loadingSchedules ? 'animate-spin' : ''}`} />
                Atualizar
              </Button>

              <Dialog open={newScheduleOpen} onOpenChange={setNewScheduleOpen}>
                <DialogTrigger asChild>
                  <Button
                    size="sm"
                    className="h-8 text-xs bg-slate-900 hover:bg-slate-800 text-white"
                  >
                    <Plus className="h-3 w-3 mr-1" />
                    Novo Agendamento
                  </Button>
                </DialogTrigger>
                <DialogContent className="sm:max-w-[460px]">
                  <DialogHeader>
                    <DialogTitle className="flex items-center gap-2 text-base">
                      <CalendarClock className="h-5 w-5 text-indigo-600" />
                      Criar Relatório Agendado
                    </DialogTitle>
                  </DialogHeader>
                  <form onSubmit={handleCreateSchedule} className="space-y-4 pt-2">
                    <div className="space-y-1.5">
                      <Label className="text-xs font-semibold">E-mail de Destino</Label>
                      <Input
                        type="email"
                        value={schedEmail}
                        onChange={(e) => setSchedEmail(e.target.value)}
                        placeholder="destinatario@empresa.com"
                        required
                        className="text-xs h-9"
                      />
                    </div>
                    <div className="grid grid-cols-2 gap-3">
                      <div className="space-y-1.5">
                        <Label className="text-xs font-semibold">Frequência</Label>
                        <Select value={schedFrequency} onValueChange={setSchedFrequency}>
                          <SelectTrigger className="text-xs h-9">
                            <SelectValue />
                          </SelectTrigger>
                          <SelectContent>
                            <SelectItem value="daily">Diário</SelectItem>
                            <SelectItem value="weekly">Semanal</SelectItem>
                            <SelectItem value="monthly">Mensal</SelectItem>
                          </SelectContent>
                        </Select>
                      </div>
                      <div className="space-y-1.5">
                        <Label className="text-xs font-semibold">Formato</Label>
                        <Select value={schedFormat} onValueChange={setSchedFormat}>
                          <SelectTrigger className="text-xs h-9">
                            <SelectValue />
                          </SelectTrigger>
                          <SelectContent>
                            <SelectItem value="csv">CSV</SelectItem>
                            <SelectItem value="excel">Excel</SelectItem>
                            <SelectItem value="pdf">PDF</SelectItem>
                          </SelectContent>
                        </Select>
                      </div>
                    </div>
                    <div className="flex justify-end gap-2 pt-2">
                      <Button
                        type="button"
                        variant="outline"
                        size="sm"
                        onClick={() => setNewScheduleOpen(false)}
                      >
                        Cancelar
                      </Button>
                      <Button
                        type="submit"
                        size="sm"
                        disabled={savingSchedule}
                        className="bg-indigo-600 hover:bg-indigo-700 text-white"
                      >
                        {savingSchedule ? 'Salvando...' : 'Salvar Agendamento'}
                      </Button>
                    </div>
                  </form>
                </DialogContent>
              </Dialog>
            </div>
          </div>
        </CardHeader>

        <CardContent className="p-5">
          {schedules.length === 0 ? (
            <div className="text-center py-8 text-xs text-slate-400">
              Nenhum agendamento de relatório cadastrado para o seu usuário.
            </div>
          ) : (
            <div className="space-y-2.5">
              {schedules.map((s) => {
                const freqLabel =
                  s.frequency === 'daily'
                    ? 'Diário'
                    : s.frequency === 'weekly'
                      ? 'Semanal'
                      : s.frequency === 'monthly'
                        ? 'Mensal'
                        : s.frequency
                return (
                  <div
                    key={s.id}
                    className="flex flex-col sm:flex-row sm:items-center justify-between gap-3 p-3 bg-slate-50 border border-slate-200/70 rounded-lg hover:border-slate-300 transition-colors"
                  >
                    <div className="flex items-center gap-3 min-w-0">
                      <div className="p-2 rounded-md bg-white border border-slate-200 text-slate-600 shrink-0">
                        <Mail className="h-4 w-4" />
                      </div>
                      <div className="min-w-0">
                        <p className="text-xs font-semibold text-slate-900 truncate">{s.email}</p>
                        <div className="flex flex-wrap items-center gap-2 mt-1">
                          <Badge variant="secondary" className="text-[10px] h-4 font-semibold">
                            <Clock className="h-2.5 w-2.5 mr-1" />
                            {freqLabel}
                          </Badge>
                          <Badge
                            variant="outline"
                            className="text-[10px] h-4 uppercase font-bold text-slate-600"
                          >
                            {s.format}
                          </Badge>
                          {s.last_sent && (
                            <span className="text-[10px] text-slate-400">
                              Último envio: {new Date(s.last_sent).toLocaleDateString('pt-BR')}
                            </span>
                          )}
                          {s.next_run && (
                            <span className="text-[10px] text-slate-400">
                              Próximo: {new Date(s.next_run).toLocaleDateString('pt-BR')}
                            </span>
                          )}
                        </div>
                      </div>
                    </div>

                    <div className="flex items-center gap-3 self-end sm:self-center">
                      <div className="flex items-center gap-1.5">
                        <span className="text-[11px] text-slate-500 font-medium">
                          {s.active ? 'Ativo' : 'Pausado'}
                        </span>
                        <Switch
                          checked={s.active}
                          onCheckedChange={() => handleToggleSchedule(s.id, s.active)}
                        />
                      </div>
                      <Button
                        variant="ghost"
                        size="icon"
                        className="h-7 w-7 text-slate-400 hover:text-rose-600"
                        onClick={() => handleDeleteSchedule(s.id)}
                        title="Excluir agendamento"
                      >
                        <Trash2 className="h-3.5 w-3.5" />
                      </Button>
                    </div>
                  </div>
                )
              })}
            </div>
          )}
        </CardContent>
      </Card>

      {/* Modal do Relatório Executivo Mensal embutido */}
      <ExecutiveMonthlyReportModal open={executiveModalOpen} onOpenChange={setExecutiveModalOpen} />
    </div>
  )
}
