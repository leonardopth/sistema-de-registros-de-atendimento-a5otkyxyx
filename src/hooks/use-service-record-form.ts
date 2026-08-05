import { useState, useEffect, useCallback } from 'react'
import { getClients } from '@/services/clients'
import { getAgents } from '@/services/agents'
import { getAccountExecutives } from '@/services/account_executives'
import { createServiceRecord } from '@/services/service_records'
import { useRealtime } from '@/hooks/use-realtime'
import { useAuth } from '@/hooks/use-auth'
import { useToast } from '@/hooks/use-toast'
import type {
  AccountExecutiveRecord,
  AgentRecord,
  ClientRecord,
  ContactReason,
  ServiceChannel,
  ServicePriority,
  ServiceStatus,
  TaskItem,
  AvoidableContactReason,
} from '@/types/service_record'

export function useServiceRecordForm(enabled: boolean = true) {
  const { user } = useAuth()
  const { toast } = useToast()

  const [useExisting, setUseExisting] = useState(true)
  const [clients, setClients] = useState<ClientRecord[]>([])
  const [selectedClientId, setSelectedClientId] = useState('')
  const [selectedAgentId, setSelectedAgentId] = useState('')
  const [agents, setAgents] = useState<AgentRecord[]>([])
  const [agentLocked, setAgentLocked] = useState(false)
  const [clientName, setClientName] = useState('')
  const [clientEmail, setClientEmail] = useState('')
  const [clientPhone, setClientPhone] = useState('')
  const [clientCompany, setClientCompany] = useState('')
  const [contactReason, setContactReason] = useState<ContactReason | ''>('')
  const [channel, setChannel] = useState<ServiceChannel | ''>('')
  const [description, setDescription] = useState('')
  const [priority, setPriority] = useState<ServicePriority>('Média')
  const [status, setStatus] = useState<ServiceStatus>('Aberto')
  const [duration, setDuration] = useState(10)
  const [allExecutives, setAllExecutives] = useState<AccountExecutiveRecord[]>([])
  const [selectedExecutiveId, setSelectedExecutiveId] = useState('')
  const [executiveError, setExecutiveError] = useState('')
  const [autoExecutive, setAutoExecutive] = useState('')
  const [tasks, setTasks] = useState<TaskItem[]>([])
  const [newTaskTitle, setNewTaskTitle] = useState('')
  const [avoidableContact, setAvoidableContact] = useState(false)
  const [avoidableContactReason, setAvoidableContactReason] = useState<AvoidableContactReason | ''>(
    '',
  )
  const [avoidableContactExplanation, setAvoidableContactExplanation] = useState('')
  const [loading, setLoading] = useState(false)

  const loadClients = useCallback(() => {
    getClients()
      .then(setClients)
      .catch(() => {})
  }, [])
  const loadExecutives = useCallback(() => {
    getAccountExecutives()
      .then(setAllExecutives)
      .catch(() => {})
  }, [])

  useEffect(() => {
    if (enabled) {
      loadClients()
      loadExecutives()
    }
  }, [enabled, loadClients, loadExecutives])

  useRealtime('clients', () => loadClients(), enabled)
  useRealtime('account_executives', () => loadExecutives(), enabled)
  useRealtime(
    'agents',
    () => {
      if (!selectedClientId) return
      const client = clients.find((c) => c.id === selectedClientId)
      if (!client) return
      getAgents()
        .then((all) => {
          const ids = new Set(clients.filter((c) => c.company === client.company).map((c) => c.id))
          setAgents(all.filter((a) => ids.has(a.client_id)))
        })
        .catch(() => {})
    },
    enabled,
  )

  const handleSelectCompany = (id: string) => {
    setSelectedClientId(id)
    setSelectedAgentId('')
    setAgents([])
    setAgentLocked(false)
    setClientName('')
    setClientEmail('')
    setClientPhone('')
    const client = clients.find((c) => c.id === id)
    if (client) {
      setClientCompany(client.company || '')
      setAutoExecutive(client.account_executive || '')
      getAgents()
        .then((all) => {
          const ids = new Set(clients.filter((c) => c.company === client.company).map((c) => c.id))
          setAgents(all.filter((a) => ids.has(a.client_id)))
        })
        .catch(() => setAgents([]))
    }
  }

  const handleSelectAgent = (id: string) => {
    setSelectedAgentId(id)
    if (!id) {
      setAgentLocked(false)
      setClientName('')
      setClientEmail('')
      setClientPhone('')
      return
    }
    const agent = agents.find((a) => a.id === id)
    if (agent) {
      setClientName(agent.name)
      setClientEmail(agent.email || '')
      setClientPhone(agent.phone || '')
      setAgentLocked(true)
    }
  }

  const handleAddTask = () => {
    if (!newTaskTitle.trim()) return
    setTasks([...tasks, { title: newTaskTitle.trim(), done: false }])
    setNewTaskTitle('')
  }
  const handleRemoveTask = (i: number) => setTasks(tasks.filter((_, idx) => idx !== i))

  const handleAvoidableChange = (checked: boolean) => {
    setAvoidableContact(checked)
    if (!checked) {
      setAvoidableContactReason('')
      setAvoidableContactExplanation('')
    }
  }

  const resetForm = () => {
    setUseExisting(true)
    setSelectedClientId('')
    setSelectedAgentId('')
    setAgents([])
    setAgentLocked(false)
    setClientName('')
    setClientEmail('')
    setClientPhone('')
    setClientCompany('')
    setContactReason('')
    setChannel('')
    setDescription('')
    setPriority('Média')
    setStatus('Aberto')
    setDuration(10)
    setSelectedExecutiveId('')
    setExecutiveError('')
    setAutoExecutive('')
    setTasks([])
    setNewTaskTitle('')
    setAvoidableContact(false)
    setAvoidableContactReason('')
    setAvoidableContactExplanation('')
  }

  const handleSubmit = async (e: React.FormEvent): Promise<boolean> => {
    e.preventDefault()
    if (!clientName.trim() || !description.trim()) {
      toast({ variant: 'destructive', title: 'Preencha os campos obrigatórios' })
      return false
    }
    if (!contactReason) {
      toast({ variant: 'destructive', title: 'Selecione o motivo do contato' })
      return false
    }
    let assignedAgent = autoExecutive
    if (!useExisting) {
      const exec = allExecutives.find((ex) => ex.id === selectedExecutiveId)
      if (!exec) {
        setExecutiveError('Selecione um executivo de contas válido')
        toast({ variant: 'destructive', title: 'Selecione um executivo de contas' })
        return false
      }
      setExecutiveError('')
      assignedAgent = exec.name
    }
    if (avoidableContact && !avoidableContactReason) {
      toast({ variant: 'destructive', title: 'Selecione o motivo do contato evitável' })
      return false
    }
    if (
      avoidableContact &&
      avoidableContactReason === 'Outros' &&
      !avoidableContactExplanation.trim()
    ) {
      toast({ variant: 'destructive', title: 'Informe a explicação do contato evitável' })
      return false
    }
    setLoading(true)
    try {
      await createServiceRecord({
        client_name: clientName.trim(),
        client_email: clientEmail.trim(),
        client_phone: clientPhone.trim(),
        client_company: clientCompany.trim(),
        contact_reason: contactReason as ContactReason,
        channel: channel || undefined,
        description: description.trim(),
        priority,
        status,
        start_time: new Date().toISOString(),
        duration,
        assigned_agent: assignedAgent,
        assigned_user: user?.id,
        tasks,
        avoidable_contact: avoidableContact,
        avoidable_contact_reason: avoidableContact
          ? (avoidableContactReason as AvoidableContactReason)
          : undefined,
        avoidable_contact_explanation:
          avoidableContact && avoidableContactReason === 'Outros'
            ? avoidableContactExplanation.trim()
            : '',
      })
      toast({ title: 'Atendimento registrado com sucesso!' })
      return true
    } catch {
      toast({ variant: 'destructive', title: 'Erro ao registrar atendimento' })
      return false
    } finally {
      setLoading(false)
    }
  }

  return {
    useExisting,
    setUseExisting,
    clients,
    selectedClientId,
    handleSelectCompany,
    selectedAgentId,
    handleSelectAgent,
    agents,
    agentLocked,
    clientName,
    setClientName,
    clientEmail,
    setClientEmail,
    clientPhone,
    setClientPhone,
    clientCompany,
    setClientCompany,
    contactReason,
    setContactReason,
    channel,
    setChannel,
    description,
    setDescription,
    priority,
    setPriority,
    status,
    setStatus,
    duration,
    setDuration,
    allExecutives,
    selectedExecutiveId,
    setSelectedExecutiveId,
    executiveError,
    showExecutiveSelect: !useExisting,
    tasks,
    newTaskTitle,
    setNewTaskTitle,
    handleAddTask,
    handleRemoveTask,
    avoidableContact,
    handleAvoidableChange,
    avoidableContactReason,
    setAvoidableContactReason,
    avoidableContactExplanation,
    setAvoidableContactExplanation,
    loading,
    handleSubmit,
    resetForm,
  }
}
