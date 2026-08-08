import { useState } from 'react'
import { useNavigate } from 'react-router-dom'
import { Button } from '@/components/ui/button'
import { Input } from '@/components/ui/input'
import { Label } from '@/components/ui/label'
import { Textarea } from '@/components/ui/textarea'
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from '@/components/ui/select'
import { RadioGroup, RadioGroupItem } from '@/components/ui/radio-group'
import { Checkbox } from '@/components/ui/checkbox'
import { SearchableSelect } from '@/components/SearchableSelect'
import { FloatingServiceTimer } from '@/components/FloatingServiceTimer'
import { useServiceRecordForm } from '@/hooks/use-service-record-form'
import { analyzeDescription } from '@/services/ai-analysis'
import { useToast } from '@/hooks/use-toast'
import {
  Headset,
  Plus,
  Trash2,
  Loader2,
  Sparkles,
  Calendar,
  User,
  Share2,
  X,
  ArrowLeft,
  CheckCircle2,
  MessageCircle,
} from 'lucide-react'
import { format } from 'date-fns'
import { ptBR } from 'date-fns/locale'
import { VoiceInputButton } from '@/components/VoiceInputButton'
import { ShareSelectDialog } from '@/components/ShareSelectDialog'
import { NewAgentDialog } from '@/components/NewAgentDialog'
import { SERVICE_TEMPLATES } from '@/lib/service-templates'
import { suggestArticles } from '@/lib/knowledge-base'
import { useAuth } from '@/hooks/use-auth'
import { SERVICE_GROUP_OPTIONS } from '@/lib/service-groups'
import type {
  ContactReason,
  ServiceChannel,
  ServiceStatus,
  ServicePriority,
  AvoidableContactReason,
  ServiceGroup,
  TravelType,
} from '@/types/service_record'
import { AVOIDABLE_CONTACT_REASONS } from '@/lib/constants'

const contactReasons: ContactReason[] = [
  'Bagagem',
  'Assento',
  'cálculo reemissão',
  'reembolso',
  'cotação',
  'reserva',
  'cancelamento',
  'regras tarifárias',
  'erro RF',
  'outros',
]
const channels: ServiceChannel[] = ['Telefone', 'e-mail', 'whatsapp', 'comercial', 'outros']
const avoidableReasons: AvoidableContactReason[] = AVOIDABLE_CONTACT_REASONS

export default function NovoAtendimento() {
  const navigate = useNavigate()
  const form = useServiceRecordForm(true, false, 'novo-atendimento-form')
  const { toast } = useToast()
  const { user } = useAuth()
  const [analyzing, setAnalyzing] = useState(false)
  const [selectedTemplate, setSelectedTemplate] = useState('')
  const [shareOpen, setShareOpen] = useState(false)
  const [newAgentOpen, setNewAgentOpen] = useState(false)

  const handleTemplateSelect = (reason: string) => {
    setSelectedTemplate(reason)
    const template = SERVICE_TEMPLATES.find((t) => t.reason === reason)
    if (template) {
      form.setContactReason(template.reason as ContactReason)
      form.setDescription(template.description)
      form.setPriority(template.priority)
      form.setTasks(template.tasks)
    }
  }

  const handleSubmit = async (e: React.FormEvent) => {
    if (await form.handleSubmit(e)) {
      form.resetForm()
      navigate('/atendimentos')
    }
  }

  const handleSaveAndConclude = async (e: React.MouseEvent) => {
    e.preventDefault()
    if (await form.handleSubmit(e as unknown as React.FormEvent, 'Concluído')) {
      form.resetForm()
      navigate('/atendimentos')
    }
  }

  const handleAIAnalysis = async () => {
    if (!form.description.trim()) {
      toast({ variant: 'destructive', title: 'Digite uma descrição primeiro' })
      return
    }
    setAnalyzing(true)
    try {
      const result = await analyzeDescription(form.description)
      form.setContactReason(result.contact_reason as ContactReason)
      if (result.channel) {
        form.setChannel(result.channel as ServiceChannel)
      }
      if (result.travel_type) {
        form.setTravelType(result.travel_type as TravelType)
      }
      if (result.avoidable_contact) {
        form.handleAvoidableChange(true)
        if (result.avoidable_contact_reason) {
          form.setAvoidableContactReason(result.avoidable_contact_reason as AvoidableContactReason)
        }
      }
      toast({ title: 'Análise concluída', description: 'Campos sugeridos preenchidos.' })
    } catch {
      toast({ variant: 'destructive', title: 'Erro na análise com IA' })
    } finally {
      setAnalyzing(false)
    }
  }

  const handleVoiceTranscript = async (text: string) => {
    form.setDescription(text)
    if (!text.trim()) return
    setAnalyzing(true)
    try {
      const result = await analyzeDescription(text)
      form.setContactReason(result.contact_reason as ContactReason)
      if (result.channel) {
        form.setChannel(result.channel as ServiceChannel)
      }
      if (result.travel_type) {
        form.setTravelType(result.travel_type as TravelType)
      }
      if (result.avoidable_contact) {
        form.handleAvoidableChange(true)
        if (result.avoidable_contact_reason) {
          form.setAvoidableContactReason(result.avoidable_contact_reason as AvoidableContactReason)
        }
      }
      toast({ title: 'Voz + IA', description: 'Transcrição e análise concluídas.' })
    } catch {
      toast({ variant: 'destructive', title: 'Transcrição ok, erro na análise IA' })
    } finally {
      setAnalyzing(false)
    }
  }

  return (
    <div className="max-w-4xl mx-auto space-y-6 pb-12">
      <div className="flex items-center justify-between">
        <div className="flex items-center gap-3">
          <Button
            variant="ghost"
            size="icon"
            onClick={() => navigate('/atendimentos')}
            className="h-9 w-9 text-slate-500 hover:text-slate-900"
          >
            <ArrowLeft className="h-5 w-5" />
          </Button>
          <div className="flex items-center gap-2">
            <Headset className="h-6 w-6 text-indigo-600" />
            <h1 className="text-2xl font-bold text-indigo-950">Novo Registro de Atendimento</h1>
          </div>
        </div>
      </div>

      <form
        onSubmit={handleSubmit}
        className="space-y-6 bg-white p-6 rounded-xl border border-slate-200 shadow-sm"
      >
        <FloatingServiceTimer
          timerStart={form.timerStart}
          timerRunning={form.timerRunning}
          accumulatedMs={form.accumulatedMs}
          onStart={form.handleTimerStart}
          onPause={form.handleTimerPause}
          onReset={form.handleTimerReset}
        />

        <div className="flex items-center gap-2 pb-2 border-b">
          <Label className="text-xs font-semibold text-slate-700 whitespace-nowrap">
            Template:
          </Label>
          <Select value={selectedTemplate} onValueChange={handleTemplateSelect}>
            <SelectTrigger className="h-8 text-xs max-w-xs">
              <SelectValue placeholder="Modelo rápido (opcional)..." />
            </SelectTrigger>
            <SelectContent>
              {SERVICE_TEMPLATES.map((t) => (
                <SelectItem key={t.reason} value={t.reason}>
                  {t.label}
                </SelectItem>
              ))}
            </SelectContent>
          </Select>
        </div>

        {/* 1. INFORMAÇÕES DO CLIENTE */}
        <div className="space-y-3">
          <div className="flex items-center justify-between">
            <h2 className="text-sm font-bold text-slate-800 uppercase tracking-wider">
              1. Informações do Cliente
            </h2>
            <Button
              type="button"
              variant="ghost"
              size="sm"
              className="text-xs text-indigo-600 h-7"
              onClick={() => form.setUseExisting(!form.useExisting)}
            >
              {form.useExisting ? 'Digitar Cliente Manualmente' : 'Selecionar Agência'}
            </Button>
          </div>

          {form.useExisting ? (
            <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
              <div className="space-y-1.5">
                <Label className="text-xs font-medium">Selecionar Agência</Label>
                <SearchableSelect
                  options={form.clients
                    .filter(
                      (c, i, arr) =>
                        c.company &&
                        c.company.trim() &&
                        arr.findIndex((c2) => c2.company === c.company) === i,
                    )
                    .map((c) => ({ value: c.id, label: c.company! }))}
                  value={form.selectedClientId}
                  onValueChange={form.handleSelectCompany}
                  placeholder="Escolha uma empresa cadastrada"
                  emptyText="Nenhuma empresa encontrada."
                  className="h-9"
                />
                <div className="flex items-center space-x-2 pt-1">
                  <Checkbox
                    id="pg-show-all-clients"
                    checked={form.showAllClients}
                    onCheckedChange={(c) => form.setShowAllClients(!!c)}
                  />
                  <Label
                    htmlFor="pg-show-all-clients"
                    className="text-xs cursor-pointer text-slate-600"
                  >
                    Mostrar todos os clientes
                  </Label>
                </div>
              </div>

              {form.selectedClientId && (
                <div className="space-y-1.5">
                  <Label className="text-xs font-medium">Selecionar Agente</Label>
                  <SearchableSelect
                    options={form.agents.map((a) => ({ value: a.id, label: a.name }))}
                    pinnedOptions={[{ value: '__new_agent__', label: '＋ Cadastrar novo Agente' }]}
                    value={form.selectedAgentId}
                    onValueChange={(val) => {
                      if (val === '__new_agent__') {
                        setNewAgentOpen(true)
                        return
                      }
                      form.handleSelectAgent(val)
                    }}
                    placeholder="Escolha um agente da empresa"
                    emptyText="Nenhum agente encontrado."
                    className="h-9"
                  />{' '}
                </div>
              )}
            </div>
          ) : null}

          <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
            <div className="space-y-1 md:col-span-2">
              <Label className="text-xs">Agência</Label>
              <Input
                className="h-9 text-xs"
                value={form.clientCompany}
                onChange={(e) => form.setClientCompany(e.target.value)}
                placeholder="Nome da agência"
                disabled={form.useExisting}
              />
            </div>
            <div className="space-y-1 md:col-span-2">
              <Label className="text-xs">Nome do Agente *</Label>
              <Input
                className="h-9 text-xs"
                required
                value={form.clientName}
                onChange={(e) => form.setClientName(e.target.value)}
                placeholder="Nome completo"
                disabled={form.agentLocked}
              />
            </div>
            <div className="space-y-1">
              <Label className="text-xs">E-mail do Agente</Label>
              <Input
                className="h-9 text-xs"
                type="email"
                value={form.clientEmail}
                onChange={(e) => form.setClientEmail(e.target.value)}
                placeholder="email@exemplo.com"
                disabled={form.agentLocked}
              />
            </div>
            <div className="space-y-1">
              <Label className="text-xs">Telefone</Label>
              <div className="flex gap-2">
                <Input
                  className="h-9 text-xs flex-1"
                  value={form.clientPhone}
                  onChange={(e) => form.setClientPhone(e.target.value)}
                  placeholder="(00) 00000-0000"
                  disabled={form.agentLocked}
                />
                <Button
                  type="button"
                  variant="outline"
                  size="sm"
                  className="h-9 shrink-0"
                  onClick={() => {
                    const phone = form.clientPhone.replace(/\D/g, '')
                    if (phone) {
                      window.open(`https://wa.me/55${phone}`, '_blank')
                    } else {
                      toast({ variant: 'destructive', title: 'Informe o telefone primeiro' })
                    }
                  }}
                >
                  <MessageCircle className="h-4 w-4 mr-1" />
                  Falar
                </Button>
              </div>
            </div>
          </div>

          {form.showExecutiveSelect && (
            <div className="space-y-3 bg-slate-50 p-3 rounded-lg border border-slate-200">
              <div className="grid grid-cols-1 md:grid-cols-2 gap-3">
                <div className="space-y-1">
                  <Label className="text-xs">Grupo de Atendimento</Label>
                  <Select
                    value={form.manualServiceGroup}
                    onValueChange={(v) => form.setManualServiceGroup(v as ServiceGroup)}
                  >
                    <SelectTrigger className="h-9">
                      <SelectValue placeholder="Selecione o grupo" />
                    </SelectTrigger>
                    <SelectContent>
                      {SERVICE_GROUP_OPTIONS.map((g: { value: string; label: string }) => (
                        <SelectItem key={g.value} value={g.value}>
                          {g.label}
                        </SelectItem>
                      ))}
                    </SelectContent>
                  </Select>
                </div>
                <div className="space-y-1">
                  <Label className="text-xs">Executivo de Contas</Label>
                  <Select
                    value={form.selectedExecutiveId}
                    onValueChange={form.setSelectedExecutiveId}
                  >
                    <SelectTrigger className="h-9">
                      <SelectValue placeholder="Selecione um executivo" />
                    </SelectTrigger>
                    <SelectContent>
                      {form.allExecutives.map((a) => (
                        <SelectItem key={a.id} value={a.id}>
                          {a.name}
                        </SelectItem>
                      ))}
                    </SelectContent>
                  </Select>
                </div>
              </div>
              <div className="flex items-center space-x-2">
                <Checkbox
                  id="pg-register-client"
                  checked={form.registerClient}
                  onCheckedChange={(c) => form.setRegisterClient(!!c)}
                />
                <Label htmlFor="pg-register-client" className="text-xs cursor-pointer">
                  Cadastrar cliente
                </Label>
              </div>
            </div>
          )}
        </div>

        {/* 2. DETALHES DO ATENDIMENTO */}
        <div className="space-y-4 pt-4 border-t">
          <h2 className="text-sm font-bold text-slate-800 uppercase tracking-wider">
            2. Detalhes do Atendimento
          </h2>

          <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
            <div className="space-y-1">
              <Label className="text-xs">Motivo do contato *</Label>
              <Select
                value={form.contactReason}
                onValueChange={(v) => form.setContactReason(v as ContactReason)}
              >
                <SelectTrigger className="h-9">
                  <SelectValue placeholder="Selecione o motivo" />
                </SelectTrigger>
                <SelectContent>
                  {contactReasons.map((r) => (
                    <SelectItem key={r} value={r}>
                      {r}
                    </SelectItem>
                  ))}
                </SelectContent>
              </Select>
            </div>

            <div className="space-y-1">
              <Label className="text-xs">Canal *</Label>
              <Select
                value={form.channel}
                onValueChange={(v) => form.setChannel(v as ServiceChannel)}
              >
                <SelectTrigger className={`h-9 ${form.channelError ? 'border-red-500' : ''}`}>
                  <SelectValue placeholder="Selecione um canal" />
                </SelectTrigger>
                <SelectContent>
                  {channels.map((c) => (
                    <SelectItem key={c} value={c}>
                      {c}
                    </SelectItem>
                  ))}
                </SelectContent>
              </Select>
              {form.channelError && (
                <p className="text-xs text-red-500 font-medium">{form.channelError}</p>
              )}
            </div>
          </div>

          <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
            <div className="space-y-1">
              <Label className="text-xs">Nacional / Internacional *</Label>
              <div className="flex gap-6 pt-1">
                <label className="flex items-center gap-2 cursor-pointer">
                  <Checkbox
                    checked={form.travelType === 'Nacional'}
                    onCheckedChange={(checked) => form.setTravelType(checked ? 'Nacional' : '')}
                  />
                  <span className="text-xs">Nacional</span>
                </label>
                <label className="flex items-center gap-2 cursor-pointer">
                  <Checkbox
                    checked={form.travelType === 'Internacional'}
                    onCheckedChange={(checked) =>
                      form.setTravelType(checked ? 'Internacional' : '')
                    }
                  />
                  <span className="text-xs">Internacional</span>
                </label>
              </div>
              {form.travelTypeError && (
                <p className="text-xs text-red-500 font-medium">{form.travelTypeError}</p>
              )}
            </div>
          </div>

          <div className="space-y-1">
            <Label className="text-xs">Nível de Prioridade</Label>
            <RadioGroup
              value={form.priority}
              onValueChange={(v) => form.setPriority(v as ServicePriority)}
              className="flex gap-6 pt-1"
            >
              <div className="flex items-center space-x-1.5">
                <RadioGroupItem value="Baixa" id="pg-low" />
                <Label htmlFor="pg-low" className="text-xs cursor-pointer">
                  Baixa
                </Label>
              </div>
              <div className="flex items-center space-x-1.5">
                <RadioGroupItem value="Média" id="pg-med" />
                <Label
                  htmlFor="pg-med"
                  className="text-xs cursor-pointer text-amber-600 font-medium"
                >
                  Média
                </Label>
              </div>
              <div className="flex items-center space-x-1.5">
                <RadioGroupItem value="Alta" id="pg-high" />
                <Label htmlFor="pg-high" className="text-xs cursor-pointer text-red-600 font-bold">
                  Alta
                </Label>
              </div>
            </RadioGroup>
          </div>

          <div className="space-y-1.5">
            <div className="flex items-center justify-between">
              <Label className="text-xs">Descrição Detalhada do Atendimento</Label>
              <div className="flex items-center gap-2">
                <VoiceInputButton
                  onTranscript={handleVoiceTranscript}
                  disabled={analyzing}
                  className="h-7"
                />
                <Button
                  type="button"
                  variant="ghost"
                  size="sm"
                  className="text-xs text-indigo-600 h-7"
                  onClick={handleAIAnalysis}
                  disabled={analyzing}
                >
                  {analyzing ? (
                    <Loader2 className="h-3.5 w-3.5 mr-1 animate-spin" />
                  ) : (
                    <Sparkles className="h-3.5 w-3.5 mr-1" />
                  )}
                  Analisar com IA
                </Button>
              </div>
            </div>
            <Textarea
              rows={4}
              value={form.description}
              onChange={(e) => form.setDescription(e.target.value)}
              placeholder="Relate detalhadamente o problema, dúvida ou solicitação do cliente..."
            />
            <p className="text-[11px] text-amber-700 bg-amber-50 p-1.5 rounded border border-amber-200">
              ⚠️ Transcrição automática por voz — revise o texto, pois pode conter erros.
            </p>
          </div>
        </div>

        {/* 3. ACOMPANHAMENTO & STATUS */}
        <div className="space-y-4 pt-4 border-t">
          <h2 className="text-sm font-bold text-slate-800 uppercase tracking-wider">
            3. Acompanhamento & Status
          </h2>

          <div className="grid grid-cols-1 md:grid-cols-3 gap-4">
            <div className="space-y-1">
              <Label className="text-xs">Status do Registro</Label>
              <Select value={form.status} onValueChange={(v) => form.setStatus(v as ServiceStatus)}>
                <SelectTrigger className="h-9">
                  <SelectValue />
                </SelectTrigger>
                <SelectContent>
                  <SelectItem value="Aberto">Aberto</SelectItem>
                  <SelectItem value="Em Andamento">Em Andamento</SelectItem>
                  <SelectItem value="Concluído">Concluído</SelectItem>
                </SelectContent>
              </Select>
            </div>

            <div className="space-y-1">
              <Label className="text-xs">Duração (Minutos)</Label>
              <Input
                type="number"
                min={0}
                step="0.01"
                className="h-9 text-xs"
                value={form.duration || ''}
                onChange={(e) =>
                  form.handleSetDuration(e.target.value ? Number(e.target.value) : 0)
                }
              />
            </div>

            <div className="space-y-1">
              <div className="flex items-center justify-between">
                <Label className="text-xs">Consultor Responsável</Label>
                <Button
                  type="button"
                  variant="outline"
                  size="sm"
                  className="h-6 text-xs text-indigo-600 hover:text-indigo-700 hover:bg-indigo-50 px-2"
                  onClick={() => setShareOpen(true)}
                >
                  <Share2 className="h-3 w-3 mr-1" />
                  Compartilhar
                </Button>
              </div>
              <Select value={form.assignedUserId} onValueChange={form.setAssignedUserId}>
                <SelectTrigger className="h-9">
                  <SelectValue />
                </SelectTrigger>
                <SelectContent>
                  {form.users.map((u) => (
                    <SelectItem key={u.id} value={u.id}>
                      {u.name} ({u.role})
                    </SelectItem>
                  ))}
                </SelectContent>
              </Select>
            </div>
          </div>

          {form.selectedShareUserIds.length > 0 && (
            <div className="space-y-1 pt-1 bg-indigo-50/50 p-2.5 rounded-lg border border-indigo-100">
              <span className="text-xs font-semibold text-indigo-900 block">
                Compartilhado com ({form.selectedShareUserIds.length}):
              </span>
              <div className="flex flex-wrap gap-1.5">
                {form.selectedShareUserIds.map((id) => {
                  const u = form.users.find((u) => u.id === id)
                  return (
                    <span
                      key={id}
                      className="inline-flex items-center gap-1.5 bg-indigo-100 text-indigo-800 text-xs px-2.5 py-1 rounded-full font-medium"
                    >
                      <User className="h-3 w-3 text-indigo-600" />
                      {u?.name || 'Usuário'}
                      <button
                        type="button"
                        className="hover:text-red-600 transition-colors ml-0.5"
                        onClick={() =>
                          form.setSelectedShareUserIds(
                            form.selectedShareUserIds.filter((i) => i !== id),
                          )
                        }
                      >
                        <X className="h-3.5 w-3.5" />
                      </button>
                    </span>
                  )
                })}
              </div>
            </div>
          )}

          <div className="space-y-2 border-t pt-3">
            <Label className="text-xs font-semibold text-slate-700">
              Tarefas de Acompanhamento
            </Label>
            <div className="space-y-2">
              <div className="flex gap-2">
                <Input
                  className="h-8 text-xs flex-1"
                  value={form.newTaskTitle}
                  onChange={(e) => form.setNewTaskTitle(e.target.value)}
                  placeholder="Nova tarefa..."
                />
                <Button
                  type="button"
                  size="sm"
                  onClick={() => form.handleAddTask()}
                  variant="outline"
                  className="h-8"
                >
                  <Plus className="h-3.5 w-3.5 mr-1" /> Add
                </Button>
              </div>
              <div className="grid grid-cols-2 gap-2">
                <Select value={form.newTaskResponsible} onValueChange={form.setNewTaskResponsible}>
                  <SelectTrigger className="h-8 text-xs">
                    <SelectValue placeholder="Responsável (opcional)" />
                  </SelectTrigger>
                  <SelectContent>
                    {form.users.map((u) => (
                      <SelectItem key={u.id} value={u.id}>
                        {u.name}
                      </SelectItem>
                    ))}
                  </SelectContent>
                </Select>
                <Input
                  type="date"
                  className="h-8 text-xs"
                  value={form.newTaskDueDate}
                  onChange={(e) => form.setNewTaskDueDate(e.target.value)}
                />
              </div>
            </div>
            {form.tasks.map((t, idx) => (
              <div
                key={idx}
                className="flex items-center justify-between text-xs bg-slate-50 p-2 rounded border"
              >
                <div className="flex flex-col gap-0.5">
                  <span>{t.title}</span>
                  {(t.responsible || t.due_date) && (
                    <div className="flex items-center gap-2 text-[10px] text-slate-500">
                      {t.responsible && (
                        <span className="flex items-center gap-0.5">
                          <User className="h-2.5 w-2.5" />
                          {form.users.find((u) => u.id === t.responsible)?.name || t.responsible}
                        </span>
                      )}
                      {t.due_date && (
                        <span className="flex items-center gap-0.5">
                          <Calendar className="h-2.5 w-2.5" />
                          {format(new Date(t.due_date), 'dd/MM/yyyy', { locale: ptBR })}
                        </span>
                      )}
                    </div>
                  )}
                </div>
                <Button
                  type="button"
                  variant="ghost"
                  size="icon"
                  className="h-6 w-6 text-red-500"
                  onClick={() => form.handleRemoveTask(idx)}
                >
                  <Trash2 className="h-3 w-3" />
                </Button>
              </div>
            ))}
          </div>
        </div>

        {/* 4. CONTATO EVITÁVEL */}
        <div className="space-y-3 pt-4 border-t">
          <h2 className="text-sm font-bold text-slate-800 uppercase tracking-wider">
            4. Contato Evitável
          </h2>

          <div className="flex items-center space-x-2">
            <Checkbox
              id="pg-wrong-dept"
              checked={form.avoidableContact}
              onCheckedChange={(c) => form.handleAvoidableChange(!!c)}
            />
            <Label htmlFor="pg-wrong-dept" className="text-xs cursor-pointer font-medium">
              Contato Evitável
            </Label>
          </div>

          {form.avoidableContact && (
            <div className="space-y-3 pl-6 bg-slate-50 p-3 rounded-lg border">
              <div className="space-y-1">
                <Label className="text-xs">Motivo *</Label>
                <Select
                  value={form.avoidableContactReason}
                  onValueChange={(v) => form.setAvoidableContactReason(v as AvoidableContactReason)}
                >
                  <SelectTrigger className="h-9">
                    <SelectValue placeholder="Selecione o motivo" />
                  </SelectTrigger>
                  <SelectContent>
                    {avoidableReasons.map((r) => (
                      <SelectItem key={r} value={r}>
                        {r}
                      </SelectItem>
                    ))}
                  </SelectContent>
                </Select>
              </div>

              {form.avoidableContactReason === 'Outros' && (
                <div className="space-y-1">
                  <Label className="text-xs">Explicação *</Label>
                  <Textarea
                    rows={2}
                    value={form.avoidableContactExplanation}
                    onChange={(e) => form.setAvoidableContactExplanation(e.target.value)}
                    placeholder="Explique o motivo do contato evitável..."
                    className="text-xs"
                  />
                </div>
              )}
            </div>
          )}

          {form.avoidableContact && form.contactReason && (
            <div className="p-3 bg-cyan-50 border border-cyan-100 rounded-lg space-y-1">
              <p className="text-xs font-bold text-cyan-800 uppercase">📚 Tutorial Recomendado</p>
              {suggestArticles(
                form.contactReason as string,
                form.avoidableContactReason as string,
              ).map((a) => (
                <div key={a.id} className="text-xs text-slate-700">
                  <strong>{a.title}</strong> — {a.summary}
                </div>
              ))}
            </div>
          )}
        </div>

        <NewAgentDialog
          open={newAgentOpen}
          onOpenChange={setNewAgentOpen}
          clientId={form.selectedClientId}
          onAgentCreated={(agent) => {
            form.addAndSelectAgent(agent)
          }}
        />

        <ShareSelectDialog
          open={shareOpen}
          onOpenChange={setShareOpen}
          users={form.users}
          selectedIds={form.selectedShareUserIds}
          currentUserId={user?.id}
          onConfirm={(ids) => {
            form.setSelectedShareUserIds(ids)
            setShareOpen(false)
          }}
        />

        <div className="pt-4 flex justify-end gap-3 border-t">
          <Button type="button" variant="outline" onClick={() => form.clearForm()}>
            Limpar
          </Button>
          <Button type="button" variant="outline" onClick={() => navigate('/atendimentos')}>
            Cancelar
          </Button>
          <Button
            type="submit"
            disabled={form.loading}
            className="bg-indigo-600 hover:bg-indigo-700 px-6"
          >
            {form.loading && <Loader2 className="mr-2 h-4 w-4 animate-spin" />}
            Salvar Atendimento
          </Button>
          <Button
            type="button"
            onClick={handleSaveAndConclude}
            disabled={form.loading}
            className="bg-emerald-600 hover:bg-emerald-700 px-6"
          >
            {form.loading ? (
              <Loader2 className="mr-2 h-4 w-4 animate-spin" />
            ) : (
              <CheckCircle2 className="mr-2 h-4 w-4" />
            )}
            Salvar e Concluir
          </Button>
        </div>
      </form>
    </div>
  )
}
