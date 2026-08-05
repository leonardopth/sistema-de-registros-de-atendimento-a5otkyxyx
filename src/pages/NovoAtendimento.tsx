import { useState, useEffect } from 'react'
import { useNavigate } from 'react-router-dom'
import { Card, CardContent, CardHeader, CardTitle, CardDescription } from '@/components/ui/card'
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
  AccountExecutiveRecord,
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

import { Checkbox } from '@/components/ui/checkbox'
import { Headset, Plus, Trash2, Save, ArrowLeft, Loader2 } from 'lucide-react'
import { SearchableSelect } from '@/components/SearchableSelect'

export default function NovoAtendimento() {
  const { user } = useAuth()
  const navigate = useNavigate()
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
  const [duration, setDuration] = useState<number>(20)
  const [allExecutives, setAllExecutives] = useState<AccountExecutiveRecord[]>([])
  const [agentError, setAgentError] = useState('')

  const [tasks, setTasks] = useState<TaskItem[]>([])
  const [newTaskTitle, setNewTaskTitle] = useState('')
  const [loading, setLoading] = useState(false)
  const [avoidableContact, setAvoidableContact] = useState(false)
  const [avoidableContactExplanation, setAvoidableContactExplanation] = useState('')

  useEffect(() => {
    getClients()
      .then(setClients)
      .catch(() => {})
    getAccountExecutives()
      .then(setAllExecutives)
      .catch(() => {})
  }, [])

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
    const agentName = allExecutives.find((a) => a.id === selectedAgentId)?.name || ''
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

    if (!selectedAgentId || !allExecutives.some((e) => e.id === selectedAgentId)) {
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
        assigned_agent: allExecutives.find((a) => a.id === selectedAgentId)?.name || '',
        assigned_user: user?.id,
        tasks,
        avoidable_contact: avoidableContact,
        avoidable_contact_explanation: avoidableContact ? avoidableContactExplanation.trim() : '',
      })

      toast({
        title: 'Atendimento registrado',
        description: 'O chamado foi cadastrado com sucesso no sistema.',
      })
      navigate('/atendimentos')
    } catch (err) {
      toast({ variant: 'destructive', title: 'Erro ao registrar atendimento' })
    } finally {
      setLoading(false)
    }
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
          {/* Seção 1: Cliente */}
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
                onClick={() => setUseExisting(!useExisting)}
              >
                {useExisting ? 'Digitar Cliente Manualmente' : 'Selecionar Cliente Cadastrado'}
              </Button>
            </div>

            {useExisting && (
              <div className="space-y-3">
                <div className="space-y-1.5">
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
                    placeholder="Escolha uma empresa da base..."
                    emptyText="Nenhuma empresa encontrada."
                  />
                </div>
                {selectedClientId && (
                  <div className="space-y-1.5">
                    <Label className="text-xs">Selecionar Agente</Label>
                    <SearchableSelect
                      options={agents.map((a) => ({ value: a.id, label: a.name }))}
                      value={selectedAgentId}
                      onValueChange={handleSelectAgent}
                      placeholder="Escolha um agente da empresa"
                      emptyText="Nenhum agente encontrado."
                    />
                  </div>
                )}
              </div>
            )}

            <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
              <div className="space-y-1.5 sm:col-span-2">
                <Label>Empresa / Razão Social</Label>
                <Input
                  value={clientCompany}
                  onChange={(e) => setClientCompany(e.target.value)}
                  placeholder="Nome da empresa"
                />
              </div>
              <div className="space-y-1.5 sm:col-span-2">
                <Label>Nome do Agente *</Label>
                <Input
                  required
                  value={clientName}
                  onChange={(e) => setClientName(e.target.value)}
                  placeholder="Ex: João da Silva"
                />
              </div>
              <div className="space-y-1.5">
                <Label>E-mail do Agente</Label>
                <Input
                  type="email"
                  value={clientEmail}
                  onChange={(e) => setClientEmail(e.target.value)}
                  placeholder="cliente@email.com"
                />
              </div>
              <div className="space-y-1.5">
                <Label>Telefone / WhatsApp</Label>
                <Input
                  value={clientPhone}
                  onChange={(e) => setClientPhone(e.target.value)}
                  placeholder="(11) 98765-4321"
                />
              </div>
            </div>
          </div>

          {/* Seção 2: Atendimento */}
          <div className="space-y-4 pt-2">
            <h3 className="text-sm font-bold text-indigo-950 uppercase tracking-wider border-b pb-2">
              2. Detalhes do Atendimento
            </h3>

            <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
              <div className="space-y-1.5">
                <Label>Motivo do contato *</Label>
                <Select
                  value={contactReason}
                  onValueChange={(v) => setContactReason(v as ContactReason)}
                >
                  <SelectTrigger>
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

              <div className="space-y-1.5">
                <Label>Canal</Label>
                <Select value={channel} onValueChange={(v) => setChannel(v as ServiceChannel)}>
                  <SelectTrigger>
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

            <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
              <div className="space-y-1.5">
                <Label>Nível de Prioridade</Label>
                <RadioGroup
                  value={priority}
                  onValueChange={(v) => setPriority(v as ServicePriority)}
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
                  value={description}
                  onChange={(e) => setDescription(e.target.value)}
                  placeholder="Relate detalhadamente o problema, dúvida ou solicitação do cliente..."
                />
              </div>
            </div>
          </div>

          {/* Seção 3: Acompanhamento */}
          <div className="space-y-4 pt-2">
            <h3 className="text-sm font-bold text-indigo-950 uppercase tracking-wider border-b pb-2">
              3. Acompanhamento & Status
            </h3>

            <div className="grid grid-cols-1 sm:grid-cols-3 gap-4">
              <div className="space-y-1.5">
                <Label>Status do Registro</Label>
                <Select value={status} onValueChange={(v) => setStatus(v as ServiceStatus)}>
                  <SelectTrigger>
                    <SelectValue />
                  </SelectTrigger>
                  <SelectContent>
                    <SelectItem value="Aberto">Aberto</SelectItem>
                    <SelectItem value="Em Andamento">Em Andamento</SelectItem>
                    <SelectItem value="Concluído">Concluído</SelectItem>
                    <SelectItem value="Cancelado">Cancelado</SelectItem>
                  </SelectContent>
                </Select>
              </div>

              <div className="space-y-1.5">
                <Label>Duração Estimada (Minutos)</Label>
                <Input
                  type="number"
                  min={1}
                  value={duration}
                  onChange={(e) => setDuration(Number(e.target.value))}
                />
              </div>

              <div className="space-y-1.5">
                <Label>Executivo de Contas *</Label>
                <Select value={selectedAgentId} onValueChange={setSelectedAgentId}>
                  <SelectTrigger>
                    <SelectValue placeholder="Selecione um executivo de contas" />
                  </SelectTrigger>
                  <SelectContent>
                    {allExecutives.map((a) => (
                      <SelectItem key={a.id} value={a.id}>
                        {a.name}
                      </SelectItem>
                    ))}
                  </SelectContent>
                </Select>
                {agentError && <p className="text-xs text-red-500">{agentError}</p>}
              </div>
            </div>
          </div>

          {/* Seção 5: Departamento Errado */}
          <div className="space-y-4 pt-2">
            <h3 className="text-sm font-bold text-indigo-950 uppercase tracking-wider border-b pb-2">
              5. Contato Evitável
            </h3>
            <div className="flex items-center space-x-2">
              <Checkbox
                id="p-wrong-dept"
                checked={avoidableContact}
                onCheckedChange={(checked) => {
                  setAvoidableContact(!!checked)
                  if (!checked) setAvoidableContactExplanation('')
                }}
              />
              <Label htmlFor="p-wrong-dept" className="cursor-pointer font-medium">
                Contato Evitável
              </Label>
            </div>
            {avoidableContact && (
              <div className="space-y-1.5">
                <Label>Explicação *</Label>
                <Textarea
                  rows={3}
                  value={avoidableContactExplanation}
                  onChange={(e) => setAvoidableContactExplanation(e.target.value)}
                  placeholder="Explique o motivo do contato evitável..."
                />
              </div>
            )}
          </div>

          {/* Seção 4: Tarefas */}
          <div className="space-y-4 pt-2">
            <h3 className="text-sm font-bold text-indigo-950 uppercase tracking-wider border-b pb-2">
              4. Tarefas & Pendências
            </h3>

            <div className="flex gap-2">
              <Input
                value={newTaskTitle}
                onChange={(e) => setNewTaskTitle(e.target.value)}
                placeholder="Ex: Enviar e-mail de confirmação para o cliente..."
                className="flex-1"
              />
              <Button type="button" onClick={handleAddTask} variant="secondary">
                <Plus className="h-4 w-4 mr-1" /> Adicionar
              </Button>
            </div>

            <div className="space-y-2">
              {tasks.map((t, idx) => (
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
                    onClick={() => handleRemoveTask(idx)}
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
              disabled={loading}
              className="bg-indigo-600 hover:bg-indigo-700 font-semibold px-6"
            >
              {loading ? (
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
