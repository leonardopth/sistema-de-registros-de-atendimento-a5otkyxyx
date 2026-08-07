import { useState, useEffect } from 'react'
import {
  Dialog,
  DialogContent,
  DialogHeader,
  DialogTitle,
  DialogFooter,
} from '@/components/ui/dialog'
import { Button } from '@/components/ui/button'
import { Input } from '@/components/ui/input'
import { Label } from '@/components/ui/label'
import { Textarea } from '@/components/ui/textarea'
import { createClient } from '@/services/clients'
import { createAgent } from '@/services/agents'
import { getAccountExecutives } from '@/services/account_executives'
import { StateCitySelect } from '@/components/StateCitySelect'
import { SearchableSelect } from '@/components/SearchableSelect'
import { AccountExecutiveRecord, ServiceGroup } from '@/types/service_record'
import { useToast } from '@/hooks/use-toast'
import { UserPlus, Loader2, Trash2, Plus, Headset, Info } from 'lucide-react'
import { SERVICE_GROUP_OPTIONS } from '@/lib/service-groups'

interface AgentFormEntry {
  name: string
  email: string
  phone: string
}

interface NewClientModalProps {
  open: boolean
  onOpenChange: (open: boolean) => void
  onSuccess?: () => void
}

export function NewClientModal({ open, onOpenChange, onSuccess }: NewClientModalProps) {
  const [phone, setPhone] = useState('')
  const [company, setCompany] = useState('')
  const [city, setCity] = useState('')
  const [state, setState] = useState('')
  const [notes, setNotes] = useState('')
  const [agents, setAgents] = useState<AgentFormEntry[]>([])
  const [agentErrors, setAgentErrors] = useState<Record<number, { name?: string; email?: string }>>(
    {},
  )
  const [loading, setLoading] = useState(false)
  const [executives, setExecutives] = useState<AccountExecutiveRecord[]>([])
  const [selectedExecutiveId, setSelectedExecutiveId] = useState('')
  const [executiveError, setExecutiveError] = useState('')
  const [serviceGroup, setServiceGroup] = useState('')
  const [serviceGroupError, setServiceGroupError] = useState('')
  const { toast } = useToast()

  const autoAtendimentoExec = executives.find((ex) => ex.name === 'Auto-Atendimento')
  const regularExecutives = executives.filter((ex) => ex.name !== 'Auto-Atendimento')

  useEffect(() => {
    if (open) {
      getAccountExecutives()
        .then(setExecutives)
        .catch(() => {})
    }
  }, [open])

  const resetForm = () => {
    setPhone('')
    setCompany('')
    setCity('')
    setState('')
    setNotes('')
    setAgents([])
    setAgentErrors({})
    setSelectedExecutiveId('')
    setExecutiveError('')
    setServiceGroup('')
    setServiceGroupError('')
  }

  const addAgent = () => setAgents([...agents, { name: '', email: '', phone: '' }])
  const removeAgent = (i: number) => {
    setAgents(agents.filter((_, idx) => idx !== i))
    setAgentErrors({})
  }
  const updateAgent = (i: number, field: keyof AgentFormEntry, value: string) => {
    setAgents(agents.map((a, idx) => (idx === i ? { ...a, [field]: value } : a)))
    setAgentErrors({})
  }

  const validateAgents = (): boolean => {
    const errors: Record<number, { name?: string; email?: string }> = {}
    let hasErrors = false
    agents.forEach((agent, i) => {
      if (!agent.name.trim() && !agent.email.trim() && !agent.phone.trim()) return
      if (!agent.name.trim()) {
        errors[i] = { ...errors[i], name: 'Nome do agente é obrigatório' }
        hasErrors = true
      }
      if (agent.email.trim() && !/^[^\s@]+@[^\s@]+\.[^\s@]+$/.test(agent.email.trim())) {
        errors[i] = { ...errors[i], email: 'E-mail inválido' }
        hasErrors = true
      }
    })
    setAgentErrors(errors)
    return !hasErrors
  }

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault()
    const selectedExec = executives.find((ex) => ex.id === selectedExecutiveId)
    if (!selectedExec) {
      setExecutiveError('Selecione um executivo de contas válido')
      return
    }
    setExecutiveError('')
    if (!serviceGroup) {
      setServiceGroupError('Selecione um grupo de atendimento')
      return
    }
    setServiceGroupError('')
    if (!validateAgents()) return
    setLoading(true)
    try {
      const client = await createClient({
        name: selectedExec.name,
        phone: phone.trim(),
        company: company.trim(),
        city: city.trim(),
        state: state.trim(),
        notes: notes.trim(),
        account_executive: selectedExec.name,
        account_executive_rel: selectedExec.id,
        service_group: serviceGroup as ServiceGroup,
      })
      const validAgents = agents.filter((a) => a.name.trim() || a.email.trim() || a.phone.trim())
      for (const agent of validAgents) {
        await createAgent({
          name: agent.name.trim(),
          email: agent.email.trim(),
          phone: agent.phone.trim(),
          client_id: client.id,
        })
      }
      toast({ title: 'Cliente cadastrado', description: 'O cliente foi adicionado com sucesso.' })
      resetForm()
      onOpenChange(false)
      onSuccess?.()
    } catch (error) {
      toast({
        variant: 'destructive',
        title: 'Erro ao cadastrar',
        description: 'Não foi possível salvar os dados.',
      })
    } finally {
      setLoading(false)
    }
  }

  return (
    <Dialog
      open={open}
      onOpenChange={(v) => {
        if (!v) resetForm()
        onOpenChange(v)
      }}
    >
      <DialogContent className="sm:max-w-[520px] max-h-[90vh] overflow-y-auto">
        <DialogHeader>
          <DialogTitle className="flex items-center gap-2 text-indigo-950">
            <UserPlus className="h-5 w-5 text-indigo-600" />
            Cadastrar Novo Cliente
          </DialogTitle>
        </DialogHeader>
        <form onSubmit={handleSubmit} className="space-y-4 py-2">
          <div className="space-y-1.5">
            <Label htmlFor="c-company">Agência</Label>
            <Input
              id="c-company"
              value={company}
              onChange={(e) => setCompany(e.target.value)}
              placeholder="Nome da agência"
            />
          </div>
          <div className="grid grid-cols-2 gap-3">
            <StateCitySelect
              stateValue={state}
              cityValue={city}
              onStateChange={setState}
              onCityChange={setCity}
            />
          </div>
          <div className="space-y-1.5">
            <Label htmlFor="c-phone">Telefone / Celular</Label>
            <Input
              id="c-phone"
              value={phone}
              onChange={(e) => setPhone(e.target.value)}
              placeholder="(00) 00000-0000"
            />
          </div>
          <div className="space-y-1.5">
            <Label className="flex items-center gap-1.5">
              Grupo de Atendimento *
              <span title="Concierge: prioridade máxima (core clients). Exclusivo: alta prioridade. LOT: clientes digital (API). BR1, BR2, SAO, SPI, SUL: mesmo nível de importância.">
                <Info className="h-3.5 w-3.5 text-slate-400" />
              </span>
            </Label>
            <SearchableSelect
              options={SERVICE_GROUP_OPTIONS.map((o) => ({
                value: o.value,
                label: o.label,
              }))}
              value={serviceGroup}
              onValueChange={(v) => {
                setServiceGroup(v)
                setServiceGroupError('')
              }}
              placeholder="Selecione um grupo de atendimento"
              emptyText="Nenhum grupo encontrado."
              className="h-9"
            />
            {serviceGroupError && <p className="text-xs text-red-500">{serviceGroupError}</p>}
          </div>
          <div className="space-y-1.5">
            <Label>Executivo de Contas RA *</Label>
            <SearchableSelect
              pinnedOptions={
                autoAtendimentoExec
                  ? [{ value: autoAtendimentoExec.id, label: autoAtendimentoExec.name }]
                  : []
              }
              options={regularExecutives.map((ex) => ({ value: ex.id, label: ex.name }))}
              value={selectedExecutiveId}
              onValueChange={(v) => {
                setSelectedExecutiveId(v)
                setExecutiveError('')
              }}
              placeholder="Selecione um executivo de contas"
              emptyText="Nenhum executivo encontrado."
              className="h-9"
            />
            {executiveError && <p className="text-xs text-red-500">{executiveError}</p>}
          </div>
          <div className="space-y-1.5">
            <Label htmlFor="c-notes">Observações</Label>
            <Textarea
              id="c-notes"
              rows={2}
              value={notes}
              onChange={(e) => setNotes(e.target.value)}
              placeholder="Anotações internas..."
            />
          </div>
          <div className="space-y-3 border-t pt-4">
            <div className="flex items-center justify-between">
              <span className="text-sm font-semibold text-slate-700 flex items-center gap-1.5">
                <Headset className="h-4 w-4 text-indigo-600" /> Agentes (opcional)
              </span>
              <Button
                type="button"
                variant="ghost"
                size="sm"
                className="text-xs text-indigo-600 h-7"
                onClick={addAgent}
              >
                <Plus className="h-3.5 w-3.5 mr-1" /> Adicionar Agente
              </Button>
            </div>
            {agents.map((agent, i) => (
              <div key={i} className="space-y-2 p-3 bg-slate-50 border rounded-lg">
                <div className="flex items-center justify-between">
                  <span className="text-xs font-bold text-slate-600">Agente {i + 1}</span>
                  <Button
                    type="button"
                    variant="ghost"
                    size="icon"
                    className="h-6 w-6 text-red-500"
                    onClick={() => removeAgent(i)}
                  >
                    <Trash2 className="h-3.5 w-3.5" />
                  </Button>
                </div>
                <div className="space-y-1">
                  <Label className="text-xs">Nome do Agente *</Label>
                  <Input
                    className="h-9 text-xs"
                    value={agent.name}
                    onChange={(e) => updateAgent(i, 'name', e.target.value)}
                    placeholder="Nome completo"
                  />
                  {agentErrors[i]?.name && (
                    <p className="text-xs text-red-500">{agentErrors[i].name}</p>
                  )}
                </div>
                <div className="grid grid-cols-2 gap-2">
                  <div className="space-y-1">
                    <Label className="text-xs">E-mail do Agente</Label>
                    <Input
                      className="h-9 text-xs"
                      type="email"
                      value={agent.email}
                      onChange={(e) => updateAgent(i, 'email', e.target.value)}
                      placeholder="email@exemplo.com"
                    />
                    {agentErrors[i]?.email && (
                      <p className="text-xs text-red-500">{agentErrors[i].email}</p>
                    )}
                  </div>
                  <div className="space-y-1">
                    <Label className="text-xs">Telefone</Label>
                    <Input
                      className="h-9 text-xs"
                      value={agent.phone}
                      onChange={(e) => updateAgent(i, 'phone', e.target.value)}
                      placeholder="(00) 00000-0000"
                    />
                  </div>
                </div>
              </div>
            ))}
          </div>
          <DialogFooter className="pt-2">
            <Button type="button" variant="outline" onClick={() => onOpenChange(false)}>
              Cancelar
            </Button>
            <Button type="submit" disabled={loading} className="bg-indigo-600 hover:bg-indigo-700">
              {loading && <Loader2 className="mr-2 h-4 w-4 animate-spin" />}
              Salvar Cliente
            </Button>
          </DialogFooter>
        </form>
      </DialogContent>
    </Dialog>
  )
}
