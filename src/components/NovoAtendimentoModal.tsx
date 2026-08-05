import { useEffect } from 'react'
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
import { useServiceRecordForm } from '@/hooks/use-service-record-form'
import { Headset, Plus, Trash2, Loader2 } from 'lucide-react'
import type {
  ContactReason,
  ServiceChannel,
  ServiceStatus,
  ServicePriority,
  AvoidableContactReason,
} from '@/types/service_record'

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
const avoidableReasons: AvoidableContactReason[] = [
  'Cálculo Reemissão',
  'Emissão',
  'Reserva simples',
  'Reembolso',
  'Financeiro',
  'Help Desk',
  'Outros',
]

interface NovoAtendimentoModalProps {
  open: boolean
  onOpenChange: (open: boolean) => void
  onSuccess?: () => void
}

export function NovoAtendimentoModal({ open, onOpenChange, onSuccess }: NovoAtendimentoModalProps) {
  const form = useServiceRecordForm(open)

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
                min={1}
                className="h-9 text-xs"
                value={form.duration}
                onChange={(e) => form.setDuration(Number(e.target.value))}
              />
            </div>
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
            <Label className="text-xs">Descrição / Observações *</Label>
            <Textarea
              rows={3}
              required
              value={form.description}
              onChange={(e) => form.setDescription(e.target.value)}
              placeholder="Detalhes do atendimento prestado..."
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
                onClick={form.handleAddTask}
                variant="outline"
                className="h-8"
              >
                <Plus className="h-3.5 w-3.5 mr-1" /> Add
              </Button>
            </div>
            {form.tasks.map((t, idx) => (
              <div
                key={idx}
                className="flex items-center justify-between text-xs bg-slate-50 p-2 rounded border"
              >
                <span>{t.title}</span>
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
