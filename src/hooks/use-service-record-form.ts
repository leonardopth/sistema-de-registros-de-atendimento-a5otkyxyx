import { useState, useEffect, useCallback, useMemo, useRef } from 'react'
import { getClients, createClient } from '@/services/clients'
import { filterClientsByUserAccess, isMasterUser } from '@/lib/service-group-access'
import { extractFieldErrors, type FieldErrors } from '@/lib/pocketbase/errors'
import { getAgents, createAgent } from '@/services/agents'
import { getAccountExecutives } from '@/services/account_executives'
import { getUsers } from '@/services/users'
import { createServiceRecord } from '@/services/service_records'
import { createShare } from '@/services/service_record_shares'
import type { AIAnalysisResult } from '@/services/ai-analysis'
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
  TravelType,
  UserRecord,
} from '@/types/service_record'

const AVOIDABLE_REASON_MAP: Partial<Record<string, AvoidableContactReason>> = {
  'erro RF': 'Erro RF',
}

export function useServiceRecordForm(
  enabled: boolean = true,
  disableTimer: boolean = false,
  persistKey?: string,
) {
  const { user } = useAuth()
  const { toast } = useToast()

  const [useExisting, setUseExisting] = useState(true)
  const [showAllClients, setShowAllClients] = useState(false)
  const [clients, setClients] = useState<ClientRecord[]>([])
  const [selectedClientId, setSelectedClientId] = useState('')
  const [clientError, setClientError] = useState('')
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
  const getDefaultTravelType = useCallback((): TravelType | '' => {
    const depts: TravelType[] = user?.departments || []
    if (depts.length === 1) {
      return depts[0]
    }
    return ''
  }, [user?.departments])

  const [travelType, setTravelType] = useState<TravelType | ''>(getDefaultTravelType)
  const [travelTypeError, setTravelTypeError] = useState('')
  const [loading, setLoading] = useState(false)
  const [users, setUsers] = useState<UserRecord[]>([])
  const [assignedUserId, setAssignedUserId] = useState(user?.id || '')
  const [selectedShareUserIds, setSelectedShareUserIds] = useState<string[]>([])
  const [selectedShareExecutiveIds, setSelectedShareExecutiveIds] = useState<string[]>([])
  const [channelError, setChannelError] = useState('')
  const [timerStart, setTimerStart] = useState<string | null>(null)
  const [timerRunning, setTimerRunning] = useState(false)
  const [accumulatedMs, setAccumulatedMs] = useState(0)
  const [newTaskResponsible, setNewTaskResponsible] = useState('')
  const [newTaskDueDate, setNewTaskDueDate] = useState('')
  const [manualServiceGroup, setManualServiceGroup] = useState<ServiceGroup | ''>('')
  const [registerClient, setRegisterClient] = useState(false)
  const [clientFieldErrors, setClientFieldErrors] = useState<FieldErrors>({})
  const [hasLoaded, setHasLoaded] = useState(false)

  useEffect(() => {
    if (!persistKey) return
    const saved = localStorage.getItem(persistKey)
    if (saved) {
      try {
        const s = JSON.parse(saved)
        if (s.useExisting !== undefined) setUseExisting(s.useExisting)
        if (s.showAllClients !== undefined) setShowAllClients(s.showAllClients)
        if (s.selectedClientId !== undefined) setSelectedClientId(s.selectedClientId)
        if (s.selectedAgentId !== undefined) setSelectedAgentId(s.selectedAgentId)
        if (s.clientName !== undefined) setClientName(s.clientName)
        if (s.clientEmail !== undefined) setClientEmail(s.clientEmail)
        if (s.clientPhone !== undefined) setClientPhone(s.clientPhone)
        if (s.clientCompany !== undefined) setClientCompany(s.clientCompany)
        if (s.contactReason !== undefined) setContactReason(s.contactReason)
        if (s.channel !== undefined) setChannel(s.channel)
        if (s.description !== undefined) setDescription(s.description)
        if (s.priority !== undefined) setPriority(s.priority)
        if (s.status !== undefined) setStatus(s.status)
        if (s.duration !== undefined) setDuration(s.duration)
        if (s.travelType !== undefined && s.travelType !== '') {
          setTravelType(s.travelType)
        } else {
          setTravelType(getDefaultTravelType())
        }
        if (s.tasks !== undefined) setTasks(s.tasks)
        if (s.avoidableContact !== undefined) setAvoidableContact(s.avoidableContact)
        if (s.avoidableContactReason !== undefined)
          setAvoidableContactReason(s.avoidableContactReason)
        if (s.avoidableContactExplanation !== undefined)
          setAvoidableContactExplanation(s.avoidableContactExplanation)
        if (s.assignedUserId !== undefined) setAssignedUserId(s.assignedUserId)
        if (s.selectedShareUserIds !== undefined) setSelectedShareUserIds(s.selectedShareUserIds)
        if (s.selectedShareExecutiveIds !== undefined)
          setSelectedShareExecutiveIds(s.selectedShareExecutiveIds)
        if (s.newTaskTitle !== undefined) setNewTaskTitle(s.newTaskTitle)
        if (s.newTaskResponsible !== undefined) setNewTaskResponsible(s.newTaskResponsible)
        if (s.newTaskDueDate !== undefined) setNewTaskDueDate(s.newTaskDueDate)
        if (s.manualServiceGroup !== undefined) setManualServiceGroup(s.manualServiceGroup)
        if (s.registerClient !== undefined) setRegisterClient(s.registerClient)
        if (s.selectedExecutiveId !== undefined) setSelectedExecutiveId(s.selectedExecutiveId)
        if (s.timerStart !== undefined) setTimerStart(s.timerStart)
        if (s.timerRunning !== undefined) setTimerRunning(s.timerRunning)
        if (s.accumulatedMs !== undefined) setAccumulatedMs(s.accumulatedMs)
      } catch {
        /* intentionally ignored */
      }
    }
    setHasLoaded(true)
  }, [persistKey])

  useEffect(() => {
    if (!persistKey || !hasLoaded) return
    localStorage.setItem(
      persistKey,
      JSON.stringify({
        useExisting,
        showAllClients,
        selectedClientId,
        selectedAgentId,
        clientName,
        clientEmail,
        clientPhone,
        clientCompany,
        contactReason,
        channel,
        description,
        priority,
        status,
        duration,
        travelType,
        tasks,
        avoidableContact,
        avoidableContactReason,
        avoidableContactExplanation,
        assignedUserId,
        selectedShareUserIds,
        selectedShareExecutiveIds,
        newTaskTitle,
        newTaskResponsible,
        newTaskDueDate,
        manualServiceGroup,
        registerClient,
        selectedExecutiveId,
        timerStart,
        timerRunning,
        accumulatedMs,
      }),
    )
  }, [
    persistKey,
    hasLoaded,
    useExisting,
    showAllClients,
    selectedClientId,
    selectedAgentId,
    clientName,
    clientEmail,
    clientPhone,
    clientCompany,
    contactReason,
    channel,
    description,
    priority,
    status,
    duration,
    travelType,
    tasks,
    avoidableContact,
    avoidableContactReason,
    avoidableContactExplanation,
    assignedUserId,
    selectedShareUserIds,
    selectedShareExecutiveIds,
    newTaskTitle,
    newTaskResponsible,
    newTaskDueDate,
    manualServiceGroup,
    registerClient,
    selectedExecutiveId,
    timerStart,
    timerRunning,
    accumulatedMs,
  ])

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
    if (!persistKey) {
      setTravelType(getDefaultTravelType())
    }
  }, [getDefaultTravelType, persistKey])

  useEffect(() => {
    if (!enabled) {
      timerAutoStartedRef.current = false
      return
    }
    if (disableTimer) return
    if (persistKey && !hasLoaded) return
    if (!timerAutoStartedRef.current && !timerRunning) {
      setTimerStart(new Date().toISOString())
      setTimerRunning(true)
    }
    timerAutoStartedRef.current = true
  }, [enabled, disableTimer, hasLoaded, persistKey, timerRunning])

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

  const handleSelectCompany = (id: string, clientRecord?: ClientRecord) => {
    setSelectedClientId(id)
    if (id) {
      setClientError('')
    }
    setSelectedAgentId('')
    setAgents([])
    setAgentLocked(false)
    setClientName('')
    setClientEmail('')
    setClientPhone('')
    const client = clientRecord || clients.find((c) => c.id === id)
    if (client) {
      const companyName = client.company || client.name || ''
      setClientCompany(companyName)
      setAutoExecutive(client.account_executive || client.expand?.account_executive_rel?.name || '')
      getAgents()
        .then((all) => {
          const ids = new Set(clients.filter((c) => c.company === client.company).map((c) => c.id))
          ids.add(client.id)
          setAgents(all.filter((a) => ids.has(a.client_id)))
        })
        .catch(() => setAgents([]))
    } else if (!id) {
      setClientCompany('')
      setAutoExecutive('')
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

  const addAndSelectAgent = useCallback((agent: AgentRecord) => {
    setAgents((prev) => [...prev, agent])
    setSelectedAgentId(agent.id)
    setClientName(agent.name)
    setClientEmail(agent.email || '')
    setClientPhone(agent.phone || '')
    setAgentLocked(true)
  }, [])

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

  const handleChannelChange = (v: ServiceChannel | '') => {
    setChannel(v)
    if (v) setChannelError('')
  }

  const handleTravelTypeChange = (v: TravelType | '') => {
    setTravelType(v)
    if (v) setTravelTypeError('')
  }

  const filteredClients = useMemo(() => {
    if (showAllClients || isMasterUser(user)) return clients
    return filterClientsByUserAccess(clients, user)
  }, [clients, showAllClients, user])

  const resetForm = () => {
    if (persistKey) localStorage.removeItem(persistKey)
    setUseExisting(true)
    setShowAllClients(false)
    setSelectedClientId('')
    setClientError('')
    setSelectedAgentId('')
    setAgents([])
    setAgentLocked(false)
    setClientName('')
    setClientEmail('')
    setClientPhone('')
    setClientCompany('')
    setContactReason('')
    setTravelType(getDefaultTravelType())
    setTravelTypeError('')
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
    setSelectedShareUserIds([])
    setSelectedShareExecutiveIds([])
    setChannelError('')
  }

  const clearForm = () => {
    if (persistKey) localStorage.removeItem(persistKey)
    resetForm()
  }

  const handleSubmit = async (
    e: React.FormEvent,
    overrideStatus?: ServiceStatus,
  ): Promise<boolean> => {
    e.preventDefault()
    if (!selectedClientId) {
      setClientError('Selecione um cliente cadastrado')
      toast({ variant: 'destructive', title: 'Selecione um cliente cadastrado' })
      return false
    }
    setClientError('')
    if (!clientName.trim()) {
      toast({ variant: 'destructive', title: 'Preencha o nome do agente' })
      return false
    }
    if (!contactReason) {
      toast({ variant: 'destructive', title: 'Selecione o motivo do contato' })
      return false
    }
    if (!channel) {
      setChannelError('Canal é obrigatório')
      toast({ variant: 'destructive', title: 'Canal é obrigatório' })
      return false
    }
    if (!travelType) {
      setTravelTypeError('Nacional / Internacional é obrigatório')
      toast({ variant: 'destructive', title: 'Selecione Nacional ou Internacional' })
      return false
    }
    setChannelError('')
    setTravelTypeError('')
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
      const createdRecord = await createServiceRecord({
        client_name: clientName.trim(),
        client_email: clientEmail.trim(),
        client_phone: clientPhone.trim(),
        client_company: clientCompany.trim(),
        contact_reason: contactReason as ContactReason,
        travel_type: travelType as TravelType,
        channel: channel || undefined,
        description: description.trim(),
        priority,
        status: overrideStatus || status,
        start_time: new Date().toISOString(),
        duration: finalDuration || undefined,
        assigned_agent: assignedAgent,
        assigned_user: assignedUserId || user?.id,
        user_id: user?.id,
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
      if (
        (selectedShareUserIds.length > 0 || selectedShareExecutiveIds.length > 0) &&
        createdRecord?.id
      ) {
        const userPromises = selectedShareUserIds.map((userId) =>
          createShare({
            service_record: createdRecord.id,
            user: userId,
            shared_by: user?.id || '',
            permission: 'Visualizar',
          }),
        )
        const execPromises = selectedShareExecutiveIds.map((execId) =>
          createShare({
            service_record: createdRecord.id,
            account_executive: execId,
            shared_by: user?.id || '',
            permission: 'Visualizar',
          }),
        )
        await Promise.all([...userPromises, ...execPromises])
      }
      toast({ title: 'Atendimento registrado com sucesso!' })
      return true
    } catch {
      toast({ variant: 'destructive', title: 'Erro ao registrar atendimento' })
      return false
    } finally {
      setLoading(false)
    }
  }

  const applyAIResult = (result: AIAnalysisResult) => {
    if (result.contact_reason) setContactReason(result.contact_reason as ContactReason)
    if (result.channel) setChannel(result.channel as ServiceChannel)
    if (result.travel_type) setTravelType(result.travel_type as TravelType)
    if (result.agency_name) {
      const match = clients.find(
        (c) =>
          c.company?.trim().toLowerCase() === result.agency_name?.trim().toLowerCase() ||
          c.name?.trim().toLowerCase() === result.agency_name?.trim().toLowerCase(),
      )
      if (match) {
        handleSelectCompany(match.id, match)
      } else {
        setClientCompany(result.agency_name)
      }
    }
    if (result.agent_name) setClientName(result.agent_name)
    if (result.client_email) setClientEmail(result.client_email)
    if (result.client_phone) setClientPhone(result.client_phone)
    if (result.priority) setPriority(result.priority as ServicePriority)
    if (result.description) setDescription(result.description)
    if (result.avoidable_contact) {
      handleAvoidableChange(true)
      if (result.avoidable_contact_reason) {
        setAvoidableContactReason(result.avoidable_contact_reason as AvoidableContactReason)
      }
    }
  }

  return {
    useExisting,
    applyAIResult,
    setUseExisting,
    showAllClients,
    setShowAllClients,
    clients: filteredClients,
    selectedClientId,
    setSelectedClientId,
    clientError,
    setClientError,
    handleSelectCompany,
    selectedAgentId,
    handleSelectAgent,
    addAndSelectAgent,
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
    travelType,
    setTravelType: handleTravelTypeChange,
    travelTypeError,
    channel,
    setChannel: handleChannelChange,
    channelError,
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
    clearForm,
    users,
    assignedUserId,
    setAssignedUserId,
    selectedShareUserIds,
    setSelectedShareUserIds,
    selectedShareExecutiveIds,
    setSelectedShareExecutiveIds,
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
