import { useNavigate } from 'react-router-dom'
import { Card } from '@/components/ui/card'
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
import { ArrowLeft, Plus, Trash2, Save, Loader2 } from 'lucide-react'
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
const statuses: ServiceStatus[] = ['Aberto', 'Em Andamento', 'Concluído', 'Cancelado']

export default function NovoAtendimento() {
  const navigate = useNavigate()
  const form = useServiceRecordForm()

  const handleSubmit = async (e: React.FormEvent) => {
    if (await form.handleSubmit(e)) navigate('/atendimentos')
  }

  return (
    <div className="max-w-4xl mx-auto space-y-6">
      <div className="flex items-center gap-3">
        <Button variant="outline" size="icon" onClick={() => navigate(-1)} className="h-9 w-9">
          <ArrowLeft className="h-4 w-4" />
        </Button>
        <div>
          <h2 className="text-2xl font-extrabold tracking-tight text-slate-900">
            Novo Atendimento
          </h2>
          <p className="text-xs text-slate-500">
            Preencha o formulário para registrar um novo suporte ou contato
          </p>
        </div>
      </div>

      <form onSubmit={handleSubmit}>
        <Card className="border-slate-200 shadow-subtle space-y-6 p-6">
          <div className="space-y-4">
            <div className="flex items-center justify-between border-b pb-2">
              <h3 className="text-sm font-bold text-indigo-950 uppercase tracking-wider">
                1. Informações do Cliente
              </h3>
              <Button
                type="button"
                variant="outline"
                size="sm"
                className="text-xs text-indigo-600"
                onClick={() => form.setUseExisting(!form.useExisting)}
              >
                {form.useExisting ? 'Digitar Cliente Manualmente' : 'Selecionar Agência'}
              </Button>
            </div>
            {form.useExisting && (
              <div className="space-y-3">
                <div className="space-y-1.5">
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
                    placeholder="Escolha uma empresa da base..."
                    emptyText="Nenhuma empresa encontrada."
                  />
                </div>
                {form.selectedClientId && (
                  <div className="space-y-1.5">
                    <Label className="text-xs">Selecionar Agente</Label>
                    <SearchableSelect
                      options={form.agents.map((a) => ({ value: a.id, label: a.name }))}
                      value={form.selectedAgentId}
                      onValueChange={form.handleSelectAgent}
                      placeholder="Escolha um agente da empresa"
                      emptyText="Nenhum agente encontrado."
                    />
                  </div>
                )}
              </div>
            )}
            <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
              <div className="space-y-1.5 sm:col-span-2">
                <Label>Agência</Label>
                <Input
                  value={form.clientCompany}
                  onChange={(e) => form.setClientCompany(e.target.value)}
                  placeholder="Nome da agência"
                  disabled={form.useExisting}
                />
              </div>
              <div className="space-y-1.5 sm:col-span-2">
                <Label>Nome do Agente *</Label>
                <Input
                  required
                  value={form.clientName}
                  onChange={(e) => form.setClientName(e.target.value)}
                  placeholder="Ex: João da Silva"
                  disabled={form.agentLocked}
                />
              </div>
              <div className="space-y-1.5">
                <Label>E-mail do Agente</Label>
                <Input
                  type="email"
                  value={form.clientEmail}
                  onChange={(e) => form.setClientEmail(e.target.value)}
                  placeholder="cliente@email.com"
                  disabled={form.agentLocked}
                />
              </div>
              <div className="space-y-1.5">
                <Label>Telefone / WhatsApp</Label>
                <Input
                  value={form.clientPhone}
                  onChange={(e) => form.setClientPhone(e.target.value)}
                  placeholder="(11) 98765-4321"
                  disabled={form.agentLocked}
                />
              </div>
            </div>
          </div>

          <div className="space-y-4 pt-2">
            <h3 className="text-sm font-bold text-indigo-950 uppercase tracking-wider border-b pb-2">
              2. Detalhes do Atendimento
            </h3>
            <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
              <div className="space-y-1.5">
                <Label>Motivo do contato *</Label>
                <Select
                  value={form.contactReason}
                  onValueChange={(v) => form.setContactReason(v as ContactReason)}
                >
                  <SelectTrigger>
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
              <div className="space-y-1.5">
                <Label>Canal</Label>
                <Select
                  value={form.channel}
                  onValueChange={(v) => form.setChannel(v as ServiceChannel)}
                >
                  <SelectTrigger>
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
            <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
              <div className="space-y-1.5">
                <Label>Nível de Prioridade</Label>
                <RadioGroup
                  value={form.priority}
                  onValueChange={(v) => form.setPriority(v as ServicePriority)}
                  className="flex gap-6 pt-2"
                >
                  <div className="flex items-center space-x-2">
                    <RadioGroupItem value="Baixa" id="p-low" />
                    <Label htmlFor="p-low" className="cursor-pointer font-medium">
                      Baixa
                    </Label>
                  </div>
                  <div className="flex items-center space-x-2">
                    <RadioGroupItem value="Média" id="p-med" />
                    <Label htmlFor="p-med" className="cursor-pointer font-medium text-amber-600">
                      Média
                    </Label>
                  </div>
                  <div className="flex items-center space-x-2">
                    <RadioGroupItem value="Alta" id="p-high" />
                    <Label htmlFor="p-high" className="cursor-pointer font-semibold text-red-600">
                      Alta
                    </Label>
                  </div>
                </RadioGroup>
              </div>
              <div className="space-y-1.5 sm:col-span-2">
                <Label>Descrição Detalhada do Atendimento *</Label>
                <Textarea
                  rows={4}
                  required
                  value={form.description}
                  onChange={(e) => form.setDescription(e.target.value)}
                  placeholder="Relate detalhadamente o problema, dúvida ou solicitação do cliente..."
                />
              </div>
            </div>
          </div>

          <div className="space-y-4 pt-2">
            <h3 className="text-sm font-bold text-indigo-950 uppercase tracking-wider border-b pb-2">
              3. Acompanhamento & Status
            </h3>
            <div className="grid grid-cols-1 sm:grid-cols-3 gap-4">
              <div className="space-y-1.5">
                <Label>Status do Registro</Label>
                <Select
                  value={form.status}
                  onValueChange={(v) => form.setStatus(v as ServiceStatus)}
                >
                  <SelectTrigger>
                    <SelectValue />
                  </SelectTrigger>
                  <SelectContent>
                    {statuses.map((s) => (
                      <SelectItem key={s} value={s}>
                        {s}
                      </SelectItem>
                    ))}
                  </SelectContent>
                </Select>
              </div>
              <div className="space-y-1.5">
                <Label>Duração Estimada (Minutos)</Label>
                <Input
                  type="number"
                  min={1}
                  value={form.duration}
                  onChange={(e) => form.setDuration(Number(e.target.value))}
                />
              </div>
              {form.showExecutiveSelect && (
                <div className="space-y-1.5">
                  <Label>Executivo de Contas *</Label>
                  <Select
                    value={form.selectedExecutiveId}
                    onValueChange={form.setSelectedExecutiveId}
                  >
                    <SelectTrigger>
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
                  {form.executiveError && (
                    <p className="text-xs text-red-500">{form.executiveError}</p>
                  )}
                </div>
              )}
            </div>
          </div>

          <div className="space-y-4 pt-2">
            <h3 className="text-sm font-bold text-indigo-950 uppercase tracking-wider border-b pb-2">
              4. Contato Evitável
            </h3>
            <div className="flex items-center space-x-2">
              <Checkbox
                id="p-wrong-dept"
                checked={form.avoidableContact}
                onCheckedChange={(c) => form.handleAvoidableChange(!!c)}
              />
              <Label htmlFor="p-wrong-dept" className="cursor-pointer font-medium">
                Contato Evitável
              </Label>
            </div>
            {form.avoidableContact && (
              <div className="space-y-3">
                <div className="space-y-1.5">
                  <Label>Motivo *</Label>
                  <Select
                    value={form.avoidableContactReason}
                    onValueChange={(v) =>
                      form.setAvoidableContactReason(v as AvoidableContactReason)
                    }
                  >
                    <SelectTrigger>
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
                  <div className="space-y-1.5">
                    <Label>Explicação *</Label>
                    <Textarea
                      rows={3}
                      value={form.avoidableContactExplanation}
                      onChange={(e) => form.setAvoidableContactExplanation(e.target.value)}
                      placeholder="Explique o motivo do contato evitável..."
                    />
                  </div>
                )}
              </div>
            )}
          </div>

          <div className="space-y-4 pt-2">
            <h3 className="text-sm font-bold text-indigo-950 uppercase tracking-wider border-b pb-2">
              5. Tarefas & Pendências
            </h3>
            <div className="flex gap-2">
              <Input
                value={form.newTaskTitle}
                onChange={(e) => form.setNewTaskTitle(e.target.value)}
                placeholder="Ex: Enviar e-mail de confirmação para o cliente..."
                className="flex-1"
              />
              <Button type="button" onClick={form.handleAddTask} variant="secondary">
                <Plus className="h-4 w-4 mr-1" /> Adicionar
              </Button>
            </div>
            <div className="space-y-2">
              {form.tasks.map((t, idx) => (
                <div
                  key={idx}
                  className="flex items-center justify-between p-2.5 bg-slate-50 border rounded-lg text-sm"
                >
                  <span className="font-medium text-slate-800">{t.title}</span>
                  <Button
                    type="button"
                    variant="ghost"
                    size="icon"
                    className="h-7 w-7 text-red-500"
                    onClick={() => form.handleRemoveTask(idx)}
                  >
                    <Trash2 className="h-4 w-4" />
                  </Button>
                </div>
              ))}
            </div>
          </div>

          <div className="pt-4 border-t flex justify-end gap-3">
            <Button type="button" variant="outline" onClick={() => navigate(-1)}>
              Cancelar
            </Button>
            <Button
              type="submit"
              disabled={form.loading}
              className="bg-indigo-600 hover:bg-indigo-700 font-semibold px-6"
            >
              {form.loading ? (
                <Loader2 className="h-4 w-4 animate-spin mr-2" />
              ) : (
                <Save className="h-4 w-4 mr-2" />
              )}
              Salvar Atendimento
            </Button>
          </div>
        </Card>
      </form>
    </div>
  )
}
