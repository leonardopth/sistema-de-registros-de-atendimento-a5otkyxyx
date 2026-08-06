import { useState, useEffect, useCallback, useMemo, useRef } from 'react'
import { getClients, createClient } from '@/services/clients'
import { filterClientsByUserAccess, isMasterUser } from '@/lib/service-group-access'
import { extractFieldErrors, type FieldErrors } from '@/lib/pocketbase/errors'
import { getAgents, createAgent } from '@/services/agents'
import { getAccountExecutives } from '@/services/account_executives'
import { getUsers } from '@/services/users'
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
  ServiceGroup,
  ServicePriority,
  ServiceStatus,
  TaskItem,
  AvoidableContactReason,
  UserRecord,
} from '@/types/service_record'

const AVOIDABLE_REASON_MAP: Partial<Record<string, AvoidableContactReason>> = {
  'erro RF': 'Erro RF',
}

export function useServiceRecordForm(enabled: boolean = true, disableTimer: boolean = false) {
  const { user } = useAuth()
  const { toast } = useToast()

  const [useExisting, setUseExisting] = useState(true)
  const [showAllClients, setShowAllClients] = useState(false)
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
  const [duration, setDuration] = useState(0)
  const [durationManuallySet, setDurationManuallySet] = useState(false)
  const timerAutoStartedRef = useRef(false)
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
  const [users, setUsers] = useState<UserRecord[]>([])
  const [assignedUserId, setAssignedUserId] = useState(user?.id || '')
  const [timerStart, setTimerStart] = useState<string | null>(null)
  const [timerRunning, setTimerRunning] = useState(false)
  const [accumulatedMs, setAccumulatedMs] = useState(0)
  const [newTaskResponsible, setNewTaskResponsible] = useState('')
  const [newTaskDueDate, setNewTaskDueDate] = useState('')
  const [manualServiceGroup, setManualServiceGroup] = useState<ServiceGroup | ''>('')
  const [registerClient, setRegisterClient] = useState(false)
  const [clientFieldErrors, setClientFieldErrors] = useState<FieldErrors>({})

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
  const loadUsers = useCallback(() => {
    getUsers()
      .then(setUsers)
      .catch(() => {})
  }, [])

  useEffect(() => {
    if (enabled) {
      loadClients()
      loadExecutives()
      loadUsers()
    }
  }, [enabled, loadClients, loadExecutives, loadUsers])

  useEffect(() => {
    if (user?.id) setAssignedUserId(user.id)
  }, [user?.id])

  useEffect(() => {
    if (enabled && !disableTimer && !timerAutoStartedRef.current) {
      setTimerStart(new Date().toISOString())
      setTimerRunning(true)
      timerAutoStartedRef.current = true
    }
    if (!enabled) {
      timerAutoStartedRef.current = false
    }
  }, [enabled, disableTimer])

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
      setAutoExecutive(client.account_executive || client.expand?.account_executive_rel?.name || '')
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
    setTasks([
      ...tasks,
      {
        title: newTaskTitle.trim(),
        done: false,
        responsible: newTaskResponsible || undefined,
        due_date: newTaskDueDate || undefined,
      },
    ])
    setNewTaskTitle('')
    setNewTaskResponsible('')
    setNewTaskDueDate('')
  }
  const handleRemoveTask = (i: number) => setTasks(tasks.filter((_, idx) => idx !== i))

  const handleAvoidableChange = (checked: boolean) => {
    setAvoidableContact(checked)
    if (!checked) {
      setAvoidableContactReason('')
      setAvoidableContactExplanation('')
    }
  }

  const handleContactReasonChange = (reason: ContactReason | '') => {
    setContactReason(reason)
    if (reason && AVOIDABLE_REASON_MAP[reason]) {
      setAvoidableContact(true)
      setAvoidableContactReason(AVOIDABLE_REASON_MAP[reason]!)
    }
  }

  const handleTimerStart = () => {
    if (timerRunning) return
    setTimerStart(new Date().toISOString())
    setTimerRunning(true)
  }
  const handleTimerPause = (totalElapsedMs: number) => {
    setAccumulatedMs(totalElapsedMs)
    setTimerRunning(false)
    setTimerStart(null)
    if (!durationManuallySet) {
      setDuration(Math.round((totalElapsedMs / 60000) * 100) / 100)
    }
  }
  const handleTimerReset = () => {
    setAccumulatedMs(0)
    setTimerStart(new Date().toISOString())
    setTimerRunning(true)
    setDuration(0)
    setDurationManuallySet(false)
  }

  const handleSetDuration = (val: number) => {
    setDuration(val)
    setDurationManuallySet(true)
  }

  const filteredClients = useMemo(() => {
    if (showAllClients || isMasterUser(user)) return clients
    return filterClientsByUserAccess(clients, user)
  }, [clients, showAllClients, user])

  const resetForm = () => {
    setUseExisting(true)
    setShowAllClients(false)
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
    setDuration(0)
    setSelectedExecutiveId('')
    setExecutiveError('')
    setAutoExecutive('')
    setTasks([])
    setNewTaskTitle('')
    setAvoidableContact(false)
    setAvoidableContactReason('')
    setAvoidableContactExplanation('')
    if (!disableTimer) {
      setTimerStart(new Date().toISOString())
      setTimerRunning(true)
    } else {
      setTimerStart(null)
      setTimerRunning(false)
    }
    setAccumulatedMs(0)
    setDurationManuallySet(false)
    setNewTaskResponsible('')
    setNewTaskDueDate('')
    setManualServiceGroup('')
    setRegisterClient(false)
    setClientFieldErrors({})
    setAssignedUserId(user?.id || '')
  }

  const handleSubmit = async (
    e: React.FormEvent,
    overrideStatus?: ServiceStatus,
  ): Promise<boolean> => {
    e.preventDefault()
    if (!clientName.trim()) {
      toast({ variant: 'destructive', title: 'Preencha o nome do agente' })
      return false
    }
    if (!contactReason) {
      toast({ variant: 'destructive', title: 'Selecione o motivo do contato' })
      return false
    }
    let assignedAgent = autoExecutive
    if (!useExisting) {
      const exec = allExecutives.find((ex) => ex.id === selectedExecutiveId)
      assignedAgent = exec?.name || ''
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
    if (registerClient && !useExisting && !selectedExecutiveId) {
      toast({ variant: 'destructive', title: 'Selecione um executivo de contas' })
      return false
    }
    setLoading(true)
    try {
      const selectedClient = clients.find((c) => c.id === selectedClientId)
      const selectedAgent = agents.find((a) => a.id === selectedAgentId)
      const execRecord = allExecutives.find((e) => e.name === assignedAgent)
      let finalDuration = duration
      let finalTimerStart: string | null = null
      let finalTimerRunning = false
      if (!durationManuallySet) {
        if (timerRunning && timerStart) {
          const currentElapsed = accumulatedMs + (Date.now() - new Date(timerStart).getTime())
          finalDuration = Math.round((currentElapsed / 60000) * 100) / 100
        } else {
          finalDuration = Math.round((accumulatedMs / 60000) * 100) / 100
        }
      }
      let clientId = selectedClient?.id
      setClientFieldErrors({})
      if (registerClient && !useExisting) {
        try {
          const newClient = await createClient({
            name: assignedAgent,
            email: clientEmail.trim() || undefined,
            phone: clientPhone.trim() || undefined,
            company: clientCompany.trim() || undefined,
            service_group: manualServiceGroup || undefined,
            account_executive_rel: selectedExecutiveId || undefined,
            account_executive: assignedAgent || undefined,
          })
          clientId = newClient.id
          await createAgent({
            name: clientName.trim(),
            email: clientEmail.trim() || undefined,
            phone: clientPhone.trim() || undefined,
            client_id: newClient.id,
          })
        } catch (err) {
          setClientFieldErrors(extractFieldErrors(err))
          toast({ variant: 'destructive', title: 'Erro ao cadastrar cliente' })
          return false
        }
      }
      await createServiceRecord({
        client_name: clientName.trim(),
        client_email: clientEmail.trim(),
        client_phone: clientPhone.trim(),
        client_company: clientCompany.trim(),
        contact_reason: contactReason as ContactReason,
        channel: channel || undefined,
        description: description.trim(),
        priority,
        status: overrideStatus || status,
        start_time: new Date().toISOString(),
        duration: finalDuration || undefined,
        assigned_agent: assignedAgent,
        assigned_user: assignedUserId || user?.id,
        tasks,
        avoidable_contact: avoidableContact,
        avoidable_contact_reason: avoidableContact
          ? (avoidableContactReason as AvoidableContactReason)
          : undefined,
        avoidable_contact_explanation:
          avoidableContact && avoidableContactReason === 'Outros'
            ? avoidableContactExplanation.trim()
            : '',
        client: clientId || undefined,
        agent: selectedAgent?.id || undefined,
        account_executive: execRecord?.id || undefined,
        timer_start: finalTimerStart || undefined,
        timer_running: finalTimerRunning,
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
    showAllClients,
    setShowAllClients,
    clients: filteredClients,
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
    setContactReason: handleContactReasonChange,
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
    handleSetDuration,
    durationManuallySet,
    allExecutives,
    selectedExecutiveId,
    setSelectedExecutiveId,
    executiveError,
    showExecutiveSelect: !useExisting,
    tasks,
    setTasks,
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
    users,
    assignedUserId,
    setAssignedUserId,
    timerStart,
    timerRunning,
    accumulatedMs,
    handleTimerStart,
    handleTimerPause,
    handleTimerReset,
    newTaskResponsible,
    setNewTaskResponsible,
    newTaskDueDate,
    setNewTaskDueDate,
    manualServiceGroup,
    setManualServiceGroup,
    registerClient,
    setRegisterClient,
    clientFieldErrors,
  }
}
