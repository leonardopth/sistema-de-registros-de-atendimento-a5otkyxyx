import { useState, useEffect } from 'react'
import { Checkbox } from '@/components/ui/checkbox'
import {
  Dialog,
  DialogContent,
  DialogHeader,
  DialogTitle,
  DialogFooter,
} from '@/components/ui/dialog'
import { Button } from '@/components/ui/button'
import { Input } from '@/components/ui/input'
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from '@/components/ui/select'
import { Tabs, TabsContent, TabsList, TabsTrigger } from '@/components/ui/tabs'
import {
  ServiceRecord,
  ServiceStatus,
  ServiceChannel,
  TaskItem,
  UserRecord,
  AvoidableContactReason,
  TravelType,
} from '@/types/service_record'
import { AVOIDABLE_CONTACT_REASONS } from '@/lib/constants'
import { StatusBadge } from './StatusBadge'
import { PriorityBadge } from './PriorityBadge'
import { updateServiceRecordWithHistory, deleteServiceRecord } from '@/services/service_records'
import { analyzeDescription } from '@/services/ai-analysis'
import { getUsers } from '@/services/users'
import { useToast } from '@/hooks/use-toast'
import { useAuth } from '@/hooks/use-auth'
import { ServiceRecordHistoryPanel } from './ServiceRecordHistoryPanel'
import { ReopenAtendimentoDialog } from './ReopenAtendimentoDialog'
import { ServiceTimer } from './ServiceTimer'
import { extractFieldErrors, getErrorMessage, type FieldErrors } from '@/lib/pocketbase/errors'
import {
  User,
  Phone,
  Mail,
  CheckSquare,
  Trash2,
  Save,
  Loader2,
  Plus,
  Lock,
  RotateCcw,
  Calendar,
  CheckCircle2,
  Undo2,
  Share2,
  Sparkles,
} from 'lucide-react'
import { cn } from '@/lib/utils'
import { formatGMT3DateTime, formatGMT3Date, formatGMT3DateTimeAt } from '@/lib/timezone'
import { ShareDialog } from './ShareDialog'
import { SharedUsersList } from './SharedUsersList'
import { getSharesByRecord } from '@/services/service_record_shares'

interface ServiceRecordDetailModalProps {
  record: ServiceRecord | null
  open: boolean
  onOpenChange: (open: boolean) => void
  onUpdateSuccess?: () => void
}

const isDueDateNear = (dueDate: string): boolean => {
  const due = new Date(dueDate)
  const now = new Date()
  return due.getTime() - now.getTime() <= 24 * 60 * 60 * 1000
}

const EDITABLE_STATUSES: ServiceStatus[] = ['Aberto', 'Em Andamento']
const REOPENABLE_STATUSES: ServiceStatus[] = ['Concluído', 'Cancelado']

export function ServiceRecordDetailModal({
  record,
  open,
  onOpenChange,
  onUpdateSuccess,
}: ServiceRecordDetailModalProps) {
  const { user } = useAuth()
  const { toast } = useToast()

  const [activeTab, setActiveTab] = useState<'details' | 'history'>('details')
  const [status, setStatus] = useState<ServiceStatus>('Aberto')
  const [channel, setChannel] = useState<ServiceChannel | ''>('')
  const [tasks, setTasks] = useState<TaskItem[]>([])
  const [newTaskTitle, setNewTaskTitle] = useState('')
  const [newTaskResponsible, setNewTaskResponsible] = useState('')
  const [newTaskDueDate, setNewTaskDueDate] = useState('')
  const [loading, setLoading] = useState(false)
  const [deleting, setDeleting] = useState(false)
  const [avoidableContact, setAvoidableContact] = useState(false)
  const [avoidableContactReason, setAvoidableContactReason] = useState<AvoidableContactReason | ''>(
    '',
  )
  const [avoidableContactExplanation, setAvoidableContactExplanation] = useState('')
  const [reopenOpen, setReopenOpen] = useState(false)
  const [reopenLoading, setReopenLoading] = useState(false)
  const [users, setUsers] = useState<UserRecord[]>([])
  const [completingTask, setCompletingTask] = useState<number | null>(null)
  const [timerStart, setTimerStart] = useState<string | null>(null)
  const [timerRunning, setTimerRunning] = useState(false)
  const [accumulatedMs, setAccumulatedMs] = useState(0)
  const [duration, setDuration] = useState(0)
  const [description, setDescription] = useState('')
  const [travelType, setTravelType] = useState<TravelType | ''>('')
  const [fieldErrors, setFieldErrors] = useState<FieldErrors>({})
  const [shareDialogOpen, setShareDialogOpen] = useState(false)
  const [userSharePermission, setUserSharePermission] = useState<'Visualizar' | 'Editar' | null>(
    null,
  )
  const [analyzing, setAnalyzing] = useState(false)

  const isOwner = record
    ? record.user_id === user?.id || record.assigned_user === user?.id || user?.role === 'Master'
    : false
  const isManagerRole = ['Gerentes', 'Supervisores', 'Líderes'].includes(user?.role || '')
  const isEditable = record
    ? EDITABLE_STATUSES.includes(record.status) &&
      (isOwner || isManagerRole || userSharePermission === 'Editar')
    : false
  const canShare = isOwner
  const canReopen = record ? REOPENABLE_STATUSES.includes(record.status) : false

  useEffect(() => {
    if (record) {
      setStatus(record.status)
      setChannel(record.channel || '')
      setTasks(Array.isArray(record.tasks) ? record.tasks : [])
      setAvoidableContact(!!record.avoidable_contact)
      setAvoidableContactReason((record.avoidable_contact_reason as AvoidableContactReason) || '')
      setAvoidableContactExplanation(record.avoidable_contact_explanation || '')
      setNewTaskTitle('')
      setNewTaskResponsible('')
      setNewTaskDueDate('')
      setTimerStart(record.timer_start || null)
      setTimerRunning(record.timer_running || false)
      setAccumulatedMs(record.duration ? record.duration * 60000 : 0)
      setDuration(record.duration || 0)
      setDescription(record.description || '')
      setTravelType((record.travel_type as TravelType) || '')
      setFieldErrors({})
      setActiveTab('details')
    }
  }, [record])

  useEffect(() => {
    if (open) {
      getUsers()
        .then(setUsers)
        .catch(() => {})
    }
  }, [open])

  useEffect(() => {
    if (record && user?.id) {
      const isOwner =
        record.user_id === user?.id || record.assigned_user === user?.id || user?.role === 'Master'
      if (!isOwner) {
        getSharesByRecord(record.id)
          .then((shares) => {
            const userShare = shares.find((s) => s.user === user?.id)
            setUserSharePermission(userShare?.permission || null)
          })
          .catch(() => setUserSharePermission(null))
      } else {
        setUserSharePermission(null)
      }
    }
  }, [record, user?.id])

  if (!record) return null

  const handleTaskToggle = (index: number) => {
    if (!isEditable) return
    const updated = [...tasks]
    updated[index].done = !updated[index].done
    setTasks(updated)
  }

  const handleAddTask = () => {
    if (!isEditable || !newTaskTitle.trim()) return
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

  const handleRemoveTask = (index: number) => {
    if (!isEditable) return
    setTasks(tasks.filter((_, idx) => idx !== index))
  }

  const handleCompleteTask = async (index: number) => {
    if (!isEditable || !record) return
    const updated = [...tasks]
    updated[index] = {
      ...updated[index],
      done: true,
      done_at: new Date().toISOString(),
      done_by: user?.id,
    }
    setTasks(updated)
    setCompletingTask(index)
    try {
      await updateServiceRecordWithHistory(record.id, { tasks: updated }, user?.id || '')
      toast({ title: 'Tarefa concluída', description: updated[index].title })
    } catch {
      toast({ variant: 'destructive', title: 'Erro ao concluir tarefa' })
      updated[index] = { ...updated[index], done: false, done_at: undefined, done_by: undefined }
      setTasks([...updated])
    } finally {
      setCompletingTask(null)
    }
  }

  const handleReopenTask = async (index: number) => {
    if (!isEditable || !record) return
    const updated = [...tasks]
    updated[index] = {
      ...updated[index],
      done: false,
      done_at: undefined,
      done_by: undefined,
    }
    setTasks(updated)
    setCompletingTask(index)
    try {
      await updateServiceRecordWithHistory(record.id, { tasks: updated }, user?.id || '')
      toast({ title: 'Tarefa reaberta', description: updated[index].title })
    } catch {
      toast({ variant: 'destructive', title: 'Erro ao reabrir tarefa' })
      updated[index] = { ...updated[index], done: true }
      setTasks([...updated])
    } finally {
      setCompletingTask(null)
    }
  }

  const handleTimerStart = () => {
    setTimerStart(new Date().toISOString())
    setTimerRunning(true)
  }
  const handleTimerPause = (totalElapsedMs: number) => {
    setAccumulatedMs(totalElapsedMs)
    setTimerRunning(false)
    setTimerStart(null)
    setDuration(Math.round((totalElapsedMs / 60000) * 100) / 100)
  }
  const handleTimerReset = () => {
    setTimerRunning(false)
    setTimerStart(null)
    setAccumulatedMs(0)
    setDuration(0)
  }

  const handleAIAnalysis = async () => {
    if (!description.trim()) {
      toast({ variant: 'destructive', title: 'Digite uma descrição primeiro' })
      return
    }
    setAnalyzing(true)
    try {
      const result = await analyzeDescription(description)
      if (result.channel) setChannel(result.channel as ServiceChannel)
      if (result.travel_type) setTravelType(result.travel_type as TravelType)
      if (result.description) setDescription(result.description)
      if (result.avoidable_contact) {
        setAvoidableContact(true)
        if (result.avoidable_contact_reason) {
          setAvoidableContactReason(result.avoidable_contact_reason as AvoidableContactReason)
        }
      }
      toast({ title: 'Análise concluída', description: 'Campos sugeridos preenchidos.' })
    } catch {
      toast({ variant: 'destructive', title: 'Erro na análise com IA' })
    } finally {
      setAnalyzing(false)
    }
  }

  const handleSave = async (overrideStatus?: ServiceStatus | unknown) => {
    if (!isEditable) return
    const validStatuses: ServiceStatus[] = ['Aberto', 'Em Andamento', 'Concluído', 'Cancelado']
    const effectiveStatus: ServiceStatus =
      typeof overrideStatus === 'string' && validStatuses.includes(overrideStatus as ServiceStatus)
        ? (overrideStatus as ServiceStatus)
        : status

    if (!channel) {
      toast({ variant: 'destructive', title: 'Canal é obrigatório' })
      return
    }

    if (!travelType) {
      toast({ variant: 'destructive', title: 'Selecione Nacional ou Internacional' })
      return
    }

    if (avoidableContact && !avoidableContactReason) {
      toast({ variant: 'destructive', title: 'Selecione o motivo do contato evitável' })
      return
    }
    if (
      avoidableContact &&
      avoidableContactReason === 'Outros' &&
      !avoidableContactExplanation.trim()
    ) {
      toast({ variant: 'destructive', title: 'Informe a explicação do contato evitável' })
      return
    }
    setLoading(true)
    try {
      setFieldErrors({})
      const isCompletedNow = effectiveStatus === 'Concluído' && record.status !== 'Concluído'
      let finalDuration = duration
      let finalTimerStart = timerStart
      let finalTimerRunning = timerRunning
      if (timerRunning && timerStart) {
        const currentElapsed = accumulatedMs + (Date.now() - new Date(timerStart).getTime())
        finalDuration = Math.round((currentElapsed / 60000) * 100) / 100
        finalTimerRunning = false
        finalTimerStart = null
      }

      const assignedUserId =
        (typeof record.assigned_user === 'string' && record.assigned_user) ||
        record.expand?.assigned_user?.id ||
        user?.id ||
        ''

      const cleanTasks = Array.isArray(tasks)
        ? tasks.map((t) => ({
            id: t.id,
            title: typeof t.title === 'string' ? t.title : '',
            done: Boolean(t.done),
            due_date: t.due_date || undefined,
            responsible: t.responsible || undefined,
            done_at: t.done_at || undefined,
            done_by: t.done_by || undefined,
          }))
        : []

      await updateServiceRecordWithHistory(
        record.id,
        {
          status: effectiveStatus,
          channel: channel || undefined,
          travel_type: travelType as TravelType,
          description: description.trim(),
          tasks: cleanTasks,
          end_time: isCompletedNow ? new Date().toISOString() : record.end_time,
          duration: finalDuration || undefined,
          timer_start: finalTimerStart || undefined,
          timer_running: finalTimerRunning,
          avoidable_contact: avoidableContact,
          avoidable_contact_reason: avoidableContact
            ? (avoidableContactReason as AvoidableContactReason)
            : undefined,
          avoidable_contact_explanation:
            avoidableContact && avoidableContactReason === 'Outros'
              ? avoidableContactExplanation.trim()
              : '',
          assigned_user: assignedUserId,
        },
        user?.id || '',
      )
      toast({
        title: 'Atendimento atualizado',
        description: 'Status e tarefas salvos com sucesso.',
      })
      onOpenChange(false)
      onUpdateSuccess?.()
    } catch (err) {
      const fieldErrs = extractFieldErrors(err)
      setFieldErrors(fieldErrs)
      const msg = getErrorMessage(err)
      const fieldCount = Object.keys(fieldErrs).length
      toast({
        variant: 'destructive',
        title: 'Erro ao atualizar',
        description: fieldCount > 0 ? `${fieldCount} campo(s) com erro: ${msg}` : msg,
      })
    } finally {
      setLoading(false)
    }
  }

  const handleReopen = async (justification: string) => {
    setReopenLoading(true)
    try {
      await updateServiceRecordWithHistory(
        record.id,
        {
          status: 'Aberto',
          reopen_justification: justification,
        },
        user?.id || '',
      )
      toast({
        title: 'Atendimento reaberto',
        description: 'O status foi alterado para Aberto.',
      })
      setReopenOpen(false)
      onOpenChange(false)
      onUpdateSuccess?.()
    } catch {
      toast({
        variant: 'destructive',
        title: 'Erro ao reabrir',
        description: 'Não foi possível reabrir o atendimento.',
      })
    } finally {
      setReopenLoading(false)
    }
  }

  const handleDelete = async () => {
    if (!confirm('Deseja realmente excluir este registro de atendimento?')) return
    setDeleting(true)
    try {
      await deleteServiceRecord(record.id)
      toast({ title: 'Atendimento excluído' })
      onOpenChange(false)
      onUpdateSuccess?.()
    } catch {
      toast({ variant: 'destructive', title: 'Erro ao excluir' })
    } finally {
      setDeleting(false)
    }
  }

  const responsibleName = (id?: string) => (id ? users.find((u) => u.id === id)?.name || id : '')

  return (
    <Dialog open={open} onOpenChange={onOpenChange}>
      <DialogContent className="sm:max-w-[620px] max-h-[90vh] overflow-y-auto overflow-x-hidden">
        <DialogHeader className="border-b pb-3">
          <div className="flex items-center justify-between pr-6">
            <DialogTitle className="text-xl font-bold text-slate-900 flex items-center gap-2">
              Detalhes do Atendimento
              {!isEditable && !canReopen && (
                <span className="inline-flex items-center gap-1 text-xs font-normal text-slate-500 bg-slate-100 px-2 py-0.5 rounded-full">
                  <Lock className="h-3 w-3" /> Somente leitura
                </span>
              )}
            </DialogTitle>
            <div className="flex items-center gap-2">
              <StatusBadge status={status} />
              <PriorityBadge priority={record.priority} />
            </div>
          </div>
        </DialogHeader>

        <Tabs value={activeTab} onValueChange={(v) => setActiveTab(v as 'details' | 'history')}>
          <TabsList className="w-full">
            <TabsTrigger value="details" className="flex-1">
              Detalhes
            </TabsTrigger>
            <TabsTrigger value="history" className="flex-1">
              Histórico de Alterações
            </TabsTrigger>
          </TabsList>

          <TabsContent value="details" className="space-y-5 py-3 text-slate-700">
            {Object.keys(fieldErrors).length > 0 && (
              <div className="p-3 bg-red-50 border border-red-200 rounded-lg space-y-1">
                <span className="text-xs font-bold text-red-700">
                  Corrija os campos destacados abaixo:
                </span>
                {Object.entries(fieldErrors).map(([field, msg]) => (
                  <p key={field} className="text-xs text-red-600">
                    <strong>{field}:</strong> {msg}
                  </p>
                ))}
              </div>
            )}
            <div className="bg-slate-50 p-3.5 rounded-lg border border-slate-100 space-y-2">
              <div className="flex items-center justify-between">
                <span className="font-bold text-indigo-950 text-base">
                  {record.client_company || record.client_name}
                </span>
                <span className="text-xs font-normal text-slate-500">
                  {record.start_time ? formatGMT3DateTimeAt(record.start_time) : ''}
                </span>
              </div>
              <div className="grid grid-cols-2 gap-2 text-xs text-slate-600">
                <div className="flex items-center gap-1.5 font-medium text-slate-800">
                  <User className="h-3.5 w-3.5 text-slate-400" />
                  {record.client_name}
                </div>
                {record.client_email && (
                  <div className="flex items-center gap-1.5">
                    <Mail className="h-3.5 w-3.5 text-slate-400" />
                    {record.client_email}
                  </div>
                )}
                {record.client_phone && (
                  <div className="flex items-center gap-1.5">
                    <Phone className="h-3.5 w-3.5 text-slate-400" />
                    {record.client_phone}
                  </div>
                )}
              </div>
            </div>

            <div className="grid grid-cols-2 gap-4 text-sm">
              <div>
                <span className="text-xs font-medium text-slate-500 block mb-1">
                  Motivo do contato
                </span>
                <span className="font-semibold text-slate-800 bg-indigo-50 text-indigo-700 px-2.5 py-1 rounded-md text-xs inline-block">
                  {record.contact_reason}
                </span>
              </div>
              <div>
                <span className="text-xs font-medium text-slate-500 block mb-1">
                  Nome do Agente
                </span>
                <div className="flex items-center gap-1.5 font-medium text-slate-800 text-xs">
                  <User className="h-3.5 w-3.5 text-slate-400" />
                  {record.expand?.agent?.name || record.client_name || 'Não informado'}
                </div>
              </div>
            </div>

            <div className="text-sm">
              <span className="text-xs font-medium text-slate-500 block mb-1">
                Consultor Responsável
              </span>
              <div className="flex items-center gap-1.5 font-medium text-slate-800 text-xs">
                <User className="h-3.5 w-3.5 text-slate-400" />
                {record.expand?.assigned_user?.name || user?.name || 'Não atribuído'}
              </div>
            </div>

            <div className="grid grid-cols-2 gap-4 items-center">
              <div>
                <span className="text-xs font-medium text-slate-500 block mb-1">Canal *</span>
                {isEditable ? (
                  <div>
                    <Select
                      value={channel}
                      onValueChange={(val) => setChannel(val as ServiceChannel)}
                    >
                      <SelectTrigger className={cn('h-9', fieldErrors.channel && 'border-red-500')}>
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
                    {fieldErrors.channel && (
                      <p className="text-xs text-red-500 font-medium mt-1">{fieldErrors.channel}</p>
                    )}
                  </div>
                ) : (
                  <div className="h-9 flex items-center text-sm text-slate-700 px-3 bg-slate-50 rounded-md border border-slate-200">
                    {channel || '—'}
                  </div>
                )}
              </div>
              <div>
                <span className="text-xs font-medium text-slate-500 block mb-1">Status</span>
                {isEditable ? (
                  <div>
                    <Select value={status} onValueChange={(val) => setStatus(val as ServiceStatus)}>
                      <SelectTrigger className={cn('h-9', fieldErrors.status && 'border-red-400')}>
                        <SelectValue />
                      </SelectTrigger>
                      <SelectContent>
                        <SelectItem value="Aberto">Aberto</SelectItem>
                        <SelectItem value="Em Andamento">Em Andamento</SelectItem>
                        <SelectItem value="Concluído">Concluído</SelectItem>
                        <SelectItem value="Cancelado">Cancelado</SelectItem>
                      </SelectContent>
                    </Select>
                    {fieldErrors.status && (
                      <p className="text-xs text-red-500 mt-1">{fieldErrors.status}</p>
                    )}
                  </div>
                ) : (
                  <div className="h-9 flex items-center text-sm text-slate-700 px-3 bg-slate-50 rounded-md border border-slate-200">
                    {status}
                  </div>
                )}
              </div>
            </div>

            <div className="grid grid-cols-2 gap-4 items-center">
              <div>
                <span className="text-xs font-medium text-slate-500 block mb-1">
                  Nacional / Internacional *
                </span>
                {isEditable ? (
                  <Select
                    value={travelType}
                    onValueChange={(val) => setTravelType(val as TravelType)}
                  >
                    <SelectTrigger className="h-9">
                      <SelectValue placeholder="Selecione o tipo" />
                    </SelectTrigger>
                    <SelectContent>
                      <SelectItem value="Nacional">Nacional</SelectItem>
                      <SelectItem value="Internacional">Internacional</SelectItem>
                    </SelectContent>
                  </Select>
                ) : (
                  <div className="h-9 flex items-center text-sm text-slate-700 px-3 bg-slate-50 rounded-md border border-slate-200">
                    {travelType || '—'}
                  </div>
                )}
              </div>
            </div>

            <div className="space-y-1.5">
              <span className="text-xs font-medium text-slate-500 block mb-1">
                Cronômetro de Atendimento
              </span>
              <ServiceTimer
                timerStart={timerStart}
                timerRunning={timerRunning}
                accumulatedMs={accumulatedMs}
                duration={duration}
                onStart={handleTimerStart}
                onPause={handleTimerPause}
                onReset={handleTimerReset}
              />
            </div>

            <div>
              <div className="flex items-center justify-between mb-1">
                <span className="text-xs font-medium text-slate-500">Descrição do Atendimento</span>
                {isEditable && (
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
                    Preencher com IA
                  </Button>
                )}
              </div>
              {isEditable ? (
                <div>
                  <textarea
                    rows={4}
                    className={cn(
                      'w-full text-sm p-3 border rounded-md resize-y',
                      fieldErrors.description
                        ? 'border-red-400 focus:border-red-500'
                        : 'border-slate-200 focus:border-indigo-400',
                    )}
                    value={description}
                    onChange={(e) => setDescription(e.target.value)}
                    placeholder="Descreva o atendimento..."
                  />
                  {fieldErrors.description && (
                    <p className="text-xs text-red-500 mt-1">{fieldErrors.description}</p>
                  )}
                </div>
              ) : (
                <div className="p-3 bg-white border rounded-md text-sm text-slate-800 whitespace-pre-wrap leading-relaxed">
                  {description || record.description}
                </div>
              )}
            </div>

            <div>
              <div className="flex items-center justify-between mb-2">
                <span className="text-xs font-medium text-slate-500 flex items-center gap-1">
                  <CheckSquare className="h-3.5 w-3.5" /> Tarefas do Atendimento ({tasks.length})
                </span>
              </div>
              {tasks.length === 0 ? (
                <p className="text-xs text-slate-400 italic">
                  Nenhuma tarefa associada a este atendimento.
                </p>
              ) : (
                <div className="space-y-1.5">
                  {tasks.map((task, idx) => (
                    <div
                      key={idx}
                      className={cn(
                        'flex items-center gap-2.5 p-2 rounded border group',
                        task.done
                          ? 'bg-emerald-50 border-emerald-100'
                          : 'bg-slate-50 border-slate-100',
                      )}
                    >
                      <Checkbox
                        id={`task-${idx}`}
                        checked={task.done}
                        disabled
                        className={cn(
                          task.done && 'border-emerald-500 data-[state=checked]:bg-emerald-500',
                        )}
                      />
                      <div className="flex-1 flex flex-col gap-0.5">
                        <label
                          htmlFor={`task-${idx}`}
                          className={cn(
                            'text-xs',
                            task.done
                              ? 'line-through text-slate-400'
                              : 'text-slate-800 font-medium',
                          )}
                        >
                          {task.title}
                        </label>
                        <div className="flex items-center gap-2 text-[10px] text-slate-500 flex-wrap">
                          {task.responsible && (
                            <span className="flex items-center gap-0.5">
                              <User className="h-2.5 w-2.5" /> {responsibleName(task.responsible)}
                            </span>
                          )}
                          {task.due_date && (
                            <span
                              className={cn(
                                'flex items-center gap-0.5',
                                !task.done &&
                                  isDueDateNear(task.due_date) &&
                                  'text-amber-600 font-medium',
                              )}
                            >
                              <Calendar className="h-2.5 w-2.5" /> {formatGMT3Date(task.due_date)}
                            </span>
                          )}
                          {task.done && task.done_by && (
                            <span className="flex items-center gap-0.5 text-emerald-600">
                              <CheckCircle2 className="h-2.5 w-2.5" />{' '}
                              {responsibleName(task.done_by)}
                              {task.done_at && ` em ${formatGMT3DateTime(task.done_at)}`}
                            </span>
                          )}
                        </div>
                      </div>
                      {isEditable && (
                        <div className="flex items-center gap-1">
                          {task.done ? (
                            <Button
                              variant="ghost"
                              size="sm"
                              className="h-6 text-xs text-indigo-600 hover:text-indigo-700 hover:bg-indigo-50"
                              onClick={() => handleReopenTask(idx)}
                              disabled={completingTask === idx}
                            >
                              {completingTask === idx ? (
                                <Loader2 className="h-3 w-3 animate-spin" />
                              ) : (
                                <Undo2 className="h-3 w-3" />
                              )}
                              Reabrir
                            </Button>
                          ) : (
                            <Button
                              variant="ghost"
                              size="sm"
                              className="h-6 text-xs text-emerald-600 hover:text-emerald-700 hover:bg-emerald-50"
                              onClick={() => handleCompleteTask(idx)}
                              disabled={completingTask === idx}
                            >
                              {completingTask === idx ? (
                                <Loader2 className="h-3 w-3 animate-spin" />
                              ) : (
                                <CheckCircle2 className="h-3 w-3" />
                              )}
                              Concluir
                            </Button>
                          )}
                          <Button
                            variant="ghost"
                            size="icon"
                            className="h-6 w-6 opacity-0 group-hover:opacity-100 transition-opacity text-red-500 hover:text-red-700"
                            onClick={() => handleRemoveTask(idx)}
                          >
                            <Trash2 className="h-3 w-3" />
                          </Button>
                        </div>
                      )}
                    </div>
                  ))}
                </div>
              )}
              {isEditable && (
                <div className="space-y-2 mt-2">
                  <div className="flex gap-2">
                    <Input
                      placeholder="Nova tarefa..."
                      value={newTaskTitle}
                      onChange={(e) => setNewTaskTitle(e.target.value)}
                      onKeyDown={(e) => {
                        if (e.key === 'Enter') {
                          e.preventDefault()
                          handleAddTask()
                        }
                      }}
                      className="h-8 text-xs"
                    />
                    <Button
                      size="sm"
                      variant="outline"
                      onClick={handleAddTask}
                      disabled={!newTaskTitle.trim()}
                      className="h-8 text-xs shrink-0"
                    >
                      <Plus className="h-3.5 w-3.5 mr-1" /> Adicionar
                    </Button>
                  </div>
                  <div className="grid grid-cols-2 gap-2">
                    <Select value={newTaskResponsible} onValueChange={setNewTaskResponsible}>
                      <SelectTrigger className="h-8 text-xs">
                        <SelectValue placeholder="Responsável (opcional)" />
                      </SelectTrigger>
                      <SelectContent>
                        {users.map((u) => (
                          <SelectItem key={u.id} value={u.id}>
                            {u.name}
                          </SelectItem>
                        ))}
                      </SelectContent>
                    </Select>
                    <Input
                      type="date"
                      className="h-8 text-xs"
                      value={newTaskDueDate}
                      onChange={(e) => setNewTaskDueDate(e.target.value)}
                    />
                  </div>
                </div>
              )}
            </div>

            <div className="space-y-2 border-t pt-3">
              <div className="flex items-center space-x-2">
                <Checkbox
                  id="d-wrong-dept"
                  checked={avoidableContact}
                  disabled={!isEditable}
                  onCheckedChange={(checked) => {
                    setAvoidableContact(!!checked)
                    if (!checked) {
                      setAvoidableContactReason('')
                      setAvoidableContactExplanation('')
                    }
                  }}
                />
                <label
                  htmlFor="d-wrong-dept"
                  className={`text-xs font-medium text-slate-500 ${
                    isEditable ? 'cursor-pointer' : 'cursor-default'
                  }`}
                >
                  Contato Evitável
                </label>
              </div>
              {avoidableContact && (
                <div className="space-y-2 pl-6">
                  <div className="space-y-1">
                    <span className="text-xs font-medium text-slate-500 block">Motivo *</span>
                    {isEditable ? (
                      <Select
                        value={avoidableContactReason}
                        onValueChange={(val) =>
                          setAvoidableContactReason(val as AvoidableContactReason)
                        }
                      >
                        <SelectTrigger className="h-9">
                          <SelectValue placeholder="Selecione o motivo" />
                        </SelectTrigger>
                        <SelectContent>
                          {AVOIDABLE_CONTACT_REASONS.map((r) => (
                            <SelectItem key={r} value={r}>
                              {r}
                            </SelectItem>
                          ))}
                        </SelectContent>
                      </Select>
                    ) : (
                      <div className="h-9 flex items-center text-sm text-slate-700 px-3 bg-slate-50 rounded-md border border-slate-200">
                        {avoidableContactReason || '—'}
                      </div>
                    )}
                  </div>
                  <div className="space-y-1">
                    <span className="text-xs font-medium text-slate-500 block">
                      Explicação {avoidableContactReason === 'Outros' ? '*' : '(opcional)'}
                    </span>
                    {isEditable ? (
                      <textarea
                        rows={2}
                        className="w-full text-sm p-2 border rounded-md"
                        value={avoidableContactExplanation}
                        onChange={(e) => setAvoidableContactExplanation(e.target.value)}
                        placeholder="Explique o motivo do contato evitável..."
                      />
                    ) : (
                      <div className="w-full text-sm p-2 bg-slate-50 border border-slate-200 rounded-md text-slate-700">
                        {avoidableContactExplanation || '—'}
                      </div>
                    )}
                  </div>
                </div>
              )}
            </div>

            {canShare && (
              <div className="space-y-2 border-t pt-3">
                <span className="text-xs font-medium text-slate-500 flex items-center gap-1">
                  <Share2 className="h-3.5 w-3.5" /> Usuários Compartilhados
                </span>
                <SharedUsersList recordId={record.id} />
              </div>
            )}

            {record.reopen_justification && (
              <div className="p-2.5 bg-amber-50 border border-amber-100 rounded-lg">
                <span className="text-[10px] font-bold text-amber-700 uppercase">
                  Justificativa de Reabertura
                </span>
                <p className="text-xs text-slate-700 mt-0.5">{record.reopen_justification}</p>
              </div>
            )}
          </TabsContent>

          <TabsContent value="history">
            <ServiceRecordHistoryPanel serviceRecordId={record.id} />
          </TabsContent>
        </Tabs>

        <DialogFooter className="flex flex-col gap-2 border-t pt-3 sm:flex-row sm:flex-wrap sm:items-center sm:justify-between">
          <div className="flex flex-wrap items-center gap-2">
            {canShare && (
              <Button
                variant="outline"
                size="sm"
                onClick={() => setShareDialogOpen(true)}
                className="text-indigo-600 hover:text-indigo-700 hover:bg-indigo-50"
              >
                <Share2 className="h-4 w-4 mr-1.5" /> Compartilhar
              </Button>
            )}
            <Button
              variant="ghost"
              size="sm"
              onClick={handleDelete}
              disabled={deleting}
              className="text-red-600 hover:text-red-700 hover:bg-red-50"
            >
              {deleting ? (
                <Loader2 className="h-4 w-4 animate-spin" />
              ) : (
                <Trash2 className="h-4 w-4 mr-1.5" />
              )}
              Excluir
            </Button>
            {canReopen && (
              <Button
                variant="outline"
                size="sm"
                onClick={() => setReopenOpen(true)}
                className="text-indigo-600 hover:text-indigo-700 hover:bg-indigo-50"
              >
                <RotateCcw className="h-4 w-4 mr-1.5" /> Reabrir
              </Button>
            )}
          </div>
          <div className="flex flex-wrap items-center gap-2">
            <Button variant="outline" size="sm" onClick={() => onOpenChange(false)}>
              Fechar
            </Button>
            {isEditable && (
              <Button
                size="sm"
                onClick={handleSave}
                disabled={loading}
                className="bg-indigo-600 hover:bg-indigo-700"
              >
                {loading ? (
                  <Loader2 className="h-4 w-4 animate-spin mr-1.5" />
                ) : (
                  <Save className="h-4 w-4 mr-1.5" />
                )}
                Salvar Alterações
              </Button>
            )}
            {isEditable && (
              <Button
                size="sm"
                onClick={() => handleSave('Concluído')}
                disabled={loading}
                className="bg-emerald-600 hover:bg-emerald-700"
              >
                {loading ? (
                  <Loader2 className="h-4 w-4 animate-spin mr-1.5" />
                ) : (
                  <CheckCircle2 className="h-4 w-4 mr-1.5" />
                )}
                Salvar e Concluir
              </Button>
            )}
          </div>
        </DialogFooter>

        <ReopenAtendimentoDialog
          open={reopenOpen}
          onOpenChange={setReopenOpen}
          onConfirm={handleReopen}
          loading={reopenLoading}
        />

        {canShare && (
          <ShareDialog
            recordId={record.id}
            open={shareDialogOpen}
            onOpenChange={setShareDialogOpen}
          />
        )}
      </DialogContent>
    </Dialog>
  )
}
