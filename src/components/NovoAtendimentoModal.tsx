import { useState, useEffect } from 'react'
import { Checkbox } from '@/components/ui/checkbox'
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
import { createServiceRecord } from '@/services/service_records'
import { getClients } from '@/services/clients'
import { getAgents } from '@/services/agents'
import {
  AgentRecord,
  ClientRecord,
  ContactReason,
  ServiceChannel,
  ServicePriority,
  ServiceStatus,
  TaskItem,
} from '@/types/service_record'
import { useAuth } from '@/hooks/use-auth'
import { useToast } from '@/hooks/use-toast'

import { Headset, Plus, Trash2, Loader2 } from 'lucide-react'
import { SearchableSelect } from '@/components/SearchableSelect'

interface NovoAtendimentoModalProps {
  open: boolean
  onOpenChange: (open: boolean) => void
  onSuccess?: () => void
}

export function NovoAtendimentoModal({ open, onOpenChange, onSuccess }: NovoAtendimentoModalProps) {
  const { user } = useAuth()
  const { toast } = useToast()

  const [useExisting, setUseExisting] = useState(false)
  const [clients, setClients] = useState<ClientRecord[]>([])
  const [selectedClientId, setSelectedClientId] = useState('')
  const [selectedAgentId, setSelectedAgentId] = useState('')
  const [agents, setAgents] = useState<AgentRecord[]>([])

  const [clientName, setClientName] = useState('')
  const [clientEmail, setClientEmail] = useState('')
  const [clientPhone, setClientPhone] = useState('')
  const [clientCompany, setClientCompany] = useState('')

  const [contactReason, setContactReason] = useState<ContactReason>('outros')
  const [channel, setChannel] = useState<ServiceChannel | ''>('')
  const [description, setDescription] = useState('')
  const [priority, setPriority] = useState<ServicePriority>('Média')
  const [status, setStatus] = useState<ServiceStatus>('Aberto')
  const [duration, setDuration] = useState<number>(15)
  const [allAgents, setAllAgents] = useState<AgentRecord[]>([])
  const [selectedAgentId, setSelectedAgentId] = useState('')
  const [agentError, setAgentError] = useState('')

  const [tasks, setTasks] = useState<TaskItem[]>([])
  const [newTaskTitle, setNewTaskTitle] = useState('')
  const [loading, setLoading] = useState(false)
  const [avoidableContact, setAvoidableContact] = useState(false)
  const [avoidableContactExplanation, setAvoidableContactExplanation] = useState('')

  useEffect(() => {
    if (open) {
      getClients()
        .then(setClients)
        .catch(() => {})
      getAgents()
        .then(setAllAgents)
        .catch(() => {})
    }
  }, [open])

  const handleSelectCompany = (id: string) => {
    setSelectedClientId(id)
    setSelectedAgentId('')
    setAgents([])
    setClientName('')
    setClientEmail('')
    setClientPhone('')
    const client = clients.find((c) => c.id === id)
    if (client) {
      setClientCompany(client.company || '')
      getAgents()
        .then((allAgents) => {
          const sameCompanyClientIds = new Set(
            clients.filter((c) => c.company === client.company).map((c) => c.id),
          )
          setAgents(allAgents.filter((a) => sameCompanyClientIds.has(a.client_id)))
        })
        .catch(() => setAgents([]))
    }
  }

  const handleSelectAgent = (id: string) => {
    setSelectedAgentId(id)
    const agent = agents.find((a) => a.id === id)
    if (agent) {
      setClientName(agent.name)
      setClientEmail(agent.email || '')
      setClientPhone(agent.phone || '')
    }
  }

  const handleAddTask = () => {
    if (!newTaskTitle.trim()) return
    const agentName = allAgents.find((a) => a.id === selectedAgentId)?.name || ''
    setTasks([...tasks, { title: newTaskTitle.trim(), done: false, responsible: agentName }])
    setNewTaskTitle('')
  }

  const handleRemoveTask = (idx: number) => {
    setTasks(tasks.filter((_, i) => i !== idx))
  }

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault()
    if (!clientName.trim() || !description.trim()) {
      toast({ variant: 'destructive', title: 'Preencha os campos obrigatórios' })
      return
    }

    if (!selectedAgentId) {
      setAgentError('Selecione um executivo de contas válido')
      toast({ variant: 'destructive', title: 'Selecione um executivo de contas' })
      return
    }
    setAgentError('')

    if (avoidableContact && !avoidableContactExplanation.trim()) {
      toast({ variant: 'destructive', title: 'Informe a explicação do contato evitável' })
      return
    }

    setLoading(true)
    try {
      await createServiceRecord({
        client_name: clientName.trim(),
        client_email: clientEmail.trim(),
        client_phone: clientPhone.trim(),
        client_company: clientCompany.trim(),
        contact_reason: contactReason,
        channel: channel || undefined,
        description: description.trim(),
        priority,
        status,
        start_time: new Date().toISOString(),
        duration,
        assigned_agent: allAgents.find((a) => a.id === selectedAgentId)?.name || '',
        assigned_user: user?.id,
        tasks,
        avoidable_contact: avoidableContact,
        avoidable_contact_explanation: avoidableContact ? avoidableContactExplanation.trim() : '',
      })

      toast({ title: 'Atendimento criado com sucesso!' })
      setAvoidableContact(false)
      setAvoidableContactExplanation('')
      onOpenChange(false)
      onSuccess?.()
    } catch (err) {
      toast({ variant: 'destructive', title: 'Erro ao salvar atendimento' })
    } finally {
      setLoading(false)
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
                onClick={() => setUseExisting(!useExisting)}
              >
                {useExisting ? 'Digitar Novo Cliente' : 'Selecionar Cliente Existente'}
              </Button>
            </div>

            {useExisting ? (
              <div className="space-y-2">
                <div className="space-y-1">
                  <Label className="text-xs">Selecionar Empresa</Label>
                  <SearchableSelect
                    options={clients
                      .filter(
                        (c, i, arr) =>
                          c.company &&
                          c.company.trim() &&
                          arr.findIndex((c2) => c2.company === c.company) === i,
                      )
                      .map((c) => ({ value: c.id, label: c.company! }))}
                    value={selectedClientId}
                    onValueChange={handleSelectCompany}
                    placeholder="Escolha uma empresa cadastrada"
                    emptyText="Nenhuma empresa encontrada."
                    className="h-9"
                  />
                </div>
                {selectedClientId && (
                  <div className="space-y-1">
                    <Label className="text-xs">Selecionar Agente</Label>
                    <SearchableSelect
                      options={agents.map((a) => ({ value: a.id, label: a.name }))}
                      value={selectedAgentId}
                      onValueChange={handleSelectAgent}
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
                <Label className="text-xs">Empresa / Razão Social</Label>
                <Input
                  className="h-9 text-xs"
                  value={clientCompany}
                  onChange={(e) => setClientCompany(e.target.value)}
                  placeholder="Nome da empresa"
                />
              </div>
              <div className="space-y-1 col-span-2">
                <Label className="text-xs">Nome do Agente *</Label>
                <Input
                  className="h-9 text-xs"
                  required
                  value={clientName}
                  onChange={(e) => setClientName(e.target.value)}
                  placeholder="Nome completo"
                />
              </div>
              <div className="space-y-1">
                <Label className="text-xs">E-mail do Agente</Label>
                <Input
                  className="h-9 text-xs"
                  type="email"
                  value={clientEmail}
                  onChange={(e) => setClientEmail(e.target.value)}
                  placeholder="email@exemplo.com"
                />
              </div>
              <div className="space-y-1">
                <Label className="text-xs">Telefone</Label>
                <Input
                  className="h-9 text-xs"
                  value={clientPhone}
                  onChange={(e) => setClientPhone(e.target.value)}
                  placeholder="(00) 00000-0000"
                />
              </div>
            </div>
          </div>

          <div className="grid grid-cols-2 gap-3">
            <div className="space-y-1">
              <Label className="text-xs">Motivo do contato *</Label>
              <Select
                value={contactReason}
                onValueChange={(v) => setContactReason(v as ContactReason)}
              >
                <SelectTrigger className="h-9">
                  <SelectValue />
                </SelectTrigger>
                <SelectContent>
                  <SelectItem value="Bagagem">Bagagem</SelectItem>
                  <SelectItem value="Assento">Assento</SelectItem>
                  <SelectItem value="cálculo reemissão">cálculo reemissão</SelectItem>
                  <SelectItem value="reembolso">reembolso</SelectItem>
                  <SelectItem value="cotação">cotação</SelectItem>
                  <SelectItem value="reserva">reserva</SelectItem>
                  <SelectItem value="cancelamento">cancelamento</SelectItem>
                  <SelectItem value="regras tarifárias">regras tarifárias</SelectItem>
                  <SelectItem value="erro RF">erro RF</SelectItem>
                  <SelectItem value="outros">outros</SelectItem>
                </SelectContent>
              </Select>
            </div>

            <div className="space-y-1">
              <Label className="text-xs">Canal</Label>
              <Select value={channel} onValueChange={(v) => setChannel(v as ServiceChannel)}>
                <SelectTrigger className="h-9">
                  <SelectValue placeholder="Selecione um canal" />
                </SelectTrigger>
                <SelectContent>
                  <SelectItem value="Telefone">Telefone</SelectItem>
                  <SelectItem value="e-mail">e-mail</SelectItem>
                  <SelectItem value="whatsapp">whatsapp</SelectItem>
                  <SelectItem value="comercial">comercial</SelectItem>
                  <SelectItem value="outros">outros</SelectItem>
                </SelectContent>
              </Select>
            </div>
          </div>

          <div className="grid grid-cols-2 gap-3">
            <div className="space-y-1">
              <Label className="text-xs">Status Inicial</Label>
              <Select value={status} onValueChange={(v) => setStatus(v as ServiceStatus)}>
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
                value={duration}
                onChange={(e) => setDuration(Number(e.target.value))}
              />
            </div>
          </div>

          <div className="space-y-1">
            <Label className="text-xs">Descrição / Observações *</Label>
            <Textarea
              rows={3}
              required
              value={description}
              onChange={(e) => setDescription(e.target.value)}
              placeholder="Detalhes do atendimento prestado..."
            />
          </div>

          <div className="space-y-1">
            <Label className="text-xs">Prioridade</Label>
            <RadioGroup
              value={priority}
              onValueChange={(v) => setPriority(v as ServicePriority)}
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

          <div className="space-y-1">
            <Label className="text-xs">Executivo de Contas *</Label>
            <Select value={selectedAgentId} onValueChange={setSelectedAgentId}>
              <SelectTrigger className="h-9">
                <SelectValue placeholder="Selecione um executivo de contas" />
              </SelectTrigger>
              <SelectContent>
                {allAgents.map((a) => (
                  <SelectItem key={a.id} value={a.id}>
                    {a.name}
                  </SelectItem>
                ))}
              </SelectContent>
            </Select>
            {agentError && <p className="text-xs text-red-500">{agentError}</p>}
          </div>

          <div className="space-y-2 border-t pt-3">
            <Label className="text-xs font-semibold text-slate-700">
              Tarefas de Acompanhamento
            </Label>
            <div className="flex gap-2">
              <Input
                className="h-8 text-xs flex-1"
                value={newTaskTitle}
                onChange={(e) => setNewTaskTitle(e.target.value)}
                placeholder="Nova tarefa..."
              />
              <Button
                type="button"
                size="sm"
                onClick={handleAddTask}
                variant="outline"
                className="h-8"
              >
                <Plus className="h-3.5 w-3.5 mr-1" /> Add
              </Button>
            </div>
            {tasks.map((t, idx) => (
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
                  onClick={() => handleRemoveTask(idx)}
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
                checked={avoidableContact}
                onCheckedChange={(checked) => {
                  setAvoidableContact(!!checked)
                  if (!checked) setAvoidableContactExplanation('')
                }}
              />
              <Label htmlFor="m-wrong-dept" className="text-xs cursor-pointer">
                Contato Evitável
              </Label>
            </div>
            {avoidableContact && (
              <div className="space-y-1 pl-6">
                <Label className="text-xs">Explicação *</Label>
                <Textarea
                  rows={2}
                  value={avoidableContactExplanation}
                  onChange={(e) => setAvoidableContactExplanation(e.target.value)}
                  placeholder="Explique o motivo do contato evitável..."
                  className="text-xs"
                />
              </div>
            )}
          </div>

          <div className="pt-2 flex justify-end gap-2">
            <Button type="button" variant="outline" onClick={() => onOpenChange(false)}>
              Cancelar
            </Button>
            <Button type="submit" disabled={loading} className="bg-indigo-600 hover:bg-indigo-700">
              {loading && <Loader2 className="mr-2 h-4 w-4 animate-spin" />}
              Salvar Atendimento
            </Button>
          </div>
        </form>
      </DialogContent>
    </Dialog>
  )
}
