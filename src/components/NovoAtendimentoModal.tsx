import { useState, useEffect } from 'react'
import { Dialog, DialogContent, DialogHeader, DialogTitle } from '@/components/ui/dialog'
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
import { ServiceTimer } from '@/components/ServiceTimer'
import { useServiceRecordForm } from '@/hooks/use-service-record-form'
import { analyzeDescription } from '@/services/ai-analysis'
import { useToast } from '@/hooks/use-toast'
import { Headset, Plus, Trash2, Loader2, Sparkles, Calendar, User } from 'lucide-react'
import { format } from 'date-fns'
import { ptBR } from 'date-fns/locale'
import { VoiceInputButton } from '@/components/VoiceInputButton'
import { SERVICE_TEMPLATES } from '@/lib/service-templates'
import { suggestArticles } from '@/lib/knowledge-base'
import type {
  ContactReason,
  ServiceChannel,
  ServiceStatus,
  ServicePriority,
  AvoidableContactReason,
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

interface NovoAtendimentoModalProps {
  open: boolean
  onOpenChange: (open: boolean) => void
  onSuccess?: () => void
}

export function NovoAtendimentoModal({ open, onOpenChange, onSuccess }: NovoAtendimentoModalProps) {
  const form = useServiceRecordForm(open)
  const { toast } = useToast()
  const [analyzing, setAnalyzing] = useState(false)
  const [selectedTemplate, setSelectedTemplate] = useState('')

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

  useEffect(() => {
    if (open) form.resetForm()
  }, [open])

  const handleSubmit = async (e: React.FormEvent) => {
    if (await form.handleSubmit(e)) {
      form.resetForm()
      onOpenChange(false)
      onSuccess?.()
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
    <Dialog open={open} onOpenChange={onOpenChange}>
      <DialogContent className="sm:max-w-[650px] max-h-[90vh] overflow-y-auto">
        <DialogHeader>
          <DialogTitle className="flex items-center gap-2 text-indigo-950 font-bold">
            <Headset className="h-5 w-5 text-indigo-600" />
            Novo Registro de Atendimento
          </DialogTitle>
        </DialogHeader>

        <form onSubmit={handleSubmit} className="space-y-4 py-2">
          <div className="flex items-center gap-2">
            <Label className="text-xs font-semibold text-slate-700 whitespace-nowrap">
              Template:
            </Label>
            <Select value={selectedTemplate} onValueChange={handleTemplateSelect}>
              <SelectTrigger className="h-8 text-xs flex-1">
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
          <div className="bg-slate-50 p-3.5 rounded-lg border border-slate-200 space-y-3">
            <div className="flex items-center justify-between">
              <span className="text-xs font-semibold text-slate-700 uppercase tracking-wider">
                Informações do Cliente
              </span>
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
              <div className="space-y-2">
                <div className="space-y-1">
                  <Label className="text-xs">Selecionar Agência</Label>
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
                  <div className="flex items-center space-x-2">
                    <Checkbox
                      id="m-show-all-clients"
                      checked={form.showAllClients}
                      onCheckedChange={(c) => form.setShowAllClients(!!c)}
                    />
                    <Label htmlFor="m-show-all-clients" className="text-xs cursor-pointer">
                      Mostrar todos os clientes
                    </Label>
                  </div>
                </div>
                {form.selectedClientId && (
                  <div className="space-y-1">
                    <Label className="text-xs">Selecionar Agente</Label>
                    <SearchableSelect
                      options={form.agents.map((a) => ({ value: a.id, label: a.name }))}
                      value={form.selectedAgentId}
                      onValueChange={form.handleSelectAgent}
                      placeholder="Escolha um agente da empresa"
                      emptyText="Nenhum agente encontrado."
                      className="h-9"
                    />
                  </div>
                )}
              </div>
            ) : null}
            <div className="grid grid-cols-2 gap-3">
              <div className="space-y-1 col-span-2">
                <Label className="text-xs">Agência</Label>
                <Input
                  className="h-9 text-xs"
                  value={form.clientCompany}
                  onChange={(e) => form.setClientCompany(e.target.value)}
                  placeholder="Nome da agência"
                  disabled={form.useExisting}
                />
              </div>
              <div className="space-y-1 col-span-2">
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
                <Input
                  className="h-9 text-xs"
                  value={form.clientPhone}
                  onChange={(e) => form.setClientPhone(e.target.value)}
                  placeholder="(00) 00000-0000"
                  disabled={form.agentLocked}
                />
              </div>
            </div>
          </div>

          <div className="grid grid-cols-2 gap-3">
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
              <Label className="text-xs">Canal</Label>
              <Select
                value={form.channel}
                onValueChange={(v) => form.setChannel(v as ServiceChannel)}
              >
                <SelectTrigger className="h-9">
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
            </div>
          </div>

          <div className="grid grid-cols-2 gap-3">
            <div className="space-y-1">
              <Label className="text-xs">Status Inicial</Label>
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
              <Label className="text-xs">Duração Estimada (minutos)</Label>
              <Input
                type="number"
                min={0}
                step="0.01"
                className="h-9 text-xs"
                value={form.duration || ''}
                onChange={(e) => form.setDuration(e.target.value ? Number(e.target.value) : 0)}
              />
            </div>
          </div>

          <div className="space-y-1">
            <Label className="text-xs">Consultor Responsável</Label>
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

          <div className="space-y-1">
            <Label className="text-xs">Cronômetro</Label>
            <ServiceTimer
              timerStart={form.timerStart}
              timerRunning={form.timerRunning}
              accumulatedMs={form.accumulatedMs}
              duration={form.duration}
              onStart={form.handleTimerStart}
              onPause={form.handleTimerPause}
              onReset={form.handleTimerReset}
            />
          </div>

          {form.showExecutiveSelect && (
            <div className="space-y-1">
              <Label className="text-xs">Executivo de Contas *</Label>
              <Select value={form.selectedExecutiveId} onValueChange={form.setSelectedExecutiveId}>
                <SelectTrigger className="h-9">
                  <SelectValue placeholder="Selecione um executivo de contas" />
                </SelectTrigger>
                <SelectContent>
                  {form.allExecutives.map((a) => (
                    <SelectItem key={a.id} value={a.id}>
                      {a.name}
                    </SelectItem>
                  ))}
                </SelectContent>
              </Select>
              {form.executiveError && <p className="text-xs text-red-500">{form.executiveError}</p>}
            </div>
          )}

          <div className="space-y-1">
            <div className="flex items-center justify-between">
              <Label className="text-xs">Descrição / Observações *</Label>
              <div className="flex items-center gap-1.5">
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
                    <Loader2 className="h-3 w-3 mr-1 animate-spin" />
                  ) : (
                    <Sparkles className="h-3 w-3 mr-1" />
                  )}
                  IA
                </Button>
              </div>
            </div>
            <Textarea
              rows={3}
              value={form.description}
              onChange={(e) => form.setDescription(e.target.value)}
              placeholder="Detalhes do atendimento prestado... (ou use o microfone 🎤)"
            />
          </div>

          <div className="space-y-1">
            <Label className="text-xs">Prioridade</Label>
            <RadioGroup
              value={form.priority}
              onValueChange={(v) => form.setPriority(v as ServicePriority)}
              className="flex gap-4 pt-1"
            >
              <div className="flex items-center space-x-1">
                <RadioGroupItem value="Baixa" id="m-low" />
                <Label htmlFor="m-low" className="text-xs cursor-pointer">
                  Baixa
                </Label>
              </div>
              <div className="flex items-center space-x-1">
                <RadioGroupItem value="Média" id="m-med" />
                <Label htmlFor="m-med" className="text-xs cursor-pointer text-amber-600">
                  Média
                </Label>
              </div>
              <div className="flex items-center space-x-1">
                <RadioGroupItem value="Alta" id="m-high" />
                <Label
                  htmlFor="m-high"
                  className="text-xs cursor-pointer text-red-600 font-semibold"
                >
                  Alta
                </Label>
              </div>
            </RadioGroup>
          </div>

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

          <div className="space-y-2 border-t pt-3">
            <div className="flex items-center space-x-2">
              <Checkbox
                id="m-wrong-dept"
                checked={form.avoidableContact}
                onCheckedChange={(c) => form.handleAvoidableChange(!!c)}
              />
              <Label htmlFor="m-wrong-dept" className="text-xs cursor-pointer">
                Contato Evitável
              </Label>
            </div>
            {form.avoidableContact && (
              <div className="space-y-2 pl-6">
                <div className="space-y-1">
                  <Label className="text-xs">Motivo *</Label>
                  <Select
                    value={form.avoidableContactReason}
                    onValueChange={(v) =>
                      form.setAvoidableContactReason(v as AvoidableContactReason)
                    }
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
          </div>

          {form.avoidableContact && form.contactReason && (
            <div className="p-2 bg-cyan-50 border border-cyan-100 rounded-lg space-y-1">
              <p className="text-[10px] font-bold text-cyan-700 uppercase">
                📚 Tutorial Recomendado
              </p>
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

          <div className="pt-2 flex justify-end gap-2">
            <Button type="button" variant="outline" onClick={() => onOpenChange(false)}>
              Cancelar
            </Button>
            <Button
              type="submit"
              disabled={form.loading}
              className="bg-indigo-600 hover:bg-indigo-700"
            >
              {form.loading && <Loader2 className="mr-2 h-4 w-4 animate-spin" />}
              Salvar Atendimento
            </Button>
          </div>
        </form>
      </DialogContent>
    </Dialog>
  )
}
