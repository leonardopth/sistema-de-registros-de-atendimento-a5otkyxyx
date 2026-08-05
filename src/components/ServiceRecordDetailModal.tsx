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
import { ServiceRecord, ServiceStatus, ServiceChannel, TaskItem } from '@/types/service_record'
import { StatusBadge } from './StatusBadge'
import { PriorityBadge } from './PriorityBadge'
import { updateServiceRecord, deleteServiceRecord } from '@/services/service_records'
import { useToast } from '@/hooks/use-toast'
import {
  Clock,
  User,
  Phone,
  Mail,
  Building,
  FileText,
  CheckSquare,
  Trash2,
  Save,
  Loader2,
  Plus,
  Lock,
} from 'lucide-react'
import { format } from 'date-fns'
import { ptBR } from 'date-fns/locale'

interface ServiceRecordDetailModalProps {
  record: ServiceRecord | null
  open: boolean
  onOpenChange: (open: boolean) => void
  onUpdateSuccess?: () => void
}

const EDITABLE_STATUSES: ServiceStatus[] = ['Aberto', 'Em Andamento']

export function ServiceRecordDetailModal({
  record,
  open,
  onOpenChange,
  onUpdateSuccess,
}: ServiceRecordDetailModalProps) {
  const [status, setStatus] = useState<ServiceStatus>('Aberto')
  const [channel, setChannel] = useState<ServiceChannel | ''>('')
  const [tasks, setTasks] = useState<TaskItem[]>([])
  const [newTaskTitle, setNewTaskTitle] = useState('')
  const [loading, setLoading] = useState(false)
  const [deleting, setDeleting] = useState(false)
  const [avoidableContact, setAvoidableContact] = useState(false)
  const [avoidableContactExplanation, setAvoidableContactExplanation] = useState('')
  const { toast } = useToast()

  const isEditable = record ? EDITABLE_STATUSES.includes(record.status) : false

  useEffect(() => {
    if (record) {
      setStatus(record.status)
      setChannel(record.channel || '')
      setTasks(Array.isArray(record.tasks) ? record.tasks : [])
      setAvoidableContact(!!record.avoidable_contact)
      setAvoidableContactExplanation(record.avoidable_contact_explanation || '')
      setNewTaskTitle('')
    }
  }, [record])

  if (!record) return null

  const handleTaskToggle = (index: number) => {
    if (!isEditable) return
    const updated = [...tasks]
    updated[index].done = !updated[index].done
    setTasks(updated)
  }

  const handleAddTask = () => {
    if (!isEditable || !newTaskTitle.trim()) return
    setTasks([...tasks, { title: newTaskTitle.trim(), done: false }])
    setNewTaskTitle('')
  }

  const handleRemoveTask = (index: number) => {
    if (!isEditable) return
    setTasks(tasks.filter((_, idx) => idx !== index))
  }

  const handleSave = async () => {
    if (!isEditable) return
    if (avoidableContact && !avoidableContactExplanation.trim()) {
      toast({ variant: 'destructive', title: 'Informe a explicação do contato evitável' })
      return
    }

    setLoading(true)
    try {
      const isCompletedNow = status === 'Concluído' && record.status !== 'Concluído'
      await updateServiceRecord(record.id, {
        status,
        channel: channel || undefined,
        tasks,
        end_time: isCompletedNow ? new Date().toISOString() : record.end_time,
        avoidable_contact: avoidableContact,
        avoidable_contact_explanation: avoidableContact ? avoidableContactExplanation.trim() : '',
      })
      toast({
        title: 'Atendimento atualizado',
        description: 'Status e tarefas salvos com sucesso.',
      })
      onOpenChange(false)
      onUpdateSuccess?.()
    } catch (err) {
      toast({
        variant: 'destructive',
        title: 'Erro ao atualizar',
        description: 'Não foi possível salvar as alterações.',
      })
    } finally {
      setLoading(false)
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
    } catch (err) {
      toast({ variant: 'destructive', title: 'Erro ao excluir' })
    } finally {
      setDeleting(false)
    }
  }

  return (
    <Dialog open={open} onOpenChange={onOpenChange}>
      <DialogContent className="sm:max-w-[620px] max-h-[90vh] overflow-y-auto">
        <DialogHeader className="border-b pb-3">
          <div className="flex items-center justify-between pr-6">
            <DialogTitle className="text-xl font-bold text-slate-900 flex items-center gap-2">
              Detalhes do Atendimento
              {!isEditable && (
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

        <div className="space-y-5 py-3 text-slate-700">
          <div className="bg-slate-50 p-3.5 rounded-lg border border-slate-100 space-y-2">
            <div className="flex items-center justify-between">
              <span className="font-bold text-indigo-950 text-base">
                {record.client_company || record.client_name}
              </span>
              <span className="text-xs font-normal text-slate-500">
                {record.start_time
                  ? format(new Date(record.start_time), "dd/MM/yyyy 'às' HH:mm", { locale: ptBR })
                  : ''}
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
                Atendente Responsável
              </span>
              <div className="flex items-center gap-1.5 font-medium text-slate-800 text-xs">
                <User className="h-3.5 w-3.5 text-slate-400" />
                {record.assigned_agent || 'Não atribuído'}
              </div>
            </div>
          </div>

          <div className="grid grid-cols-2 gap-4 items-center">
            <div>
              <label className="text-xs font-medium text-slate-500 block mb-1">Canal</label>
              {isEditable ? (
                <Select value={channel} onValueChange={(val) => setChannel(val as ServiceChannel)}>
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
              ) : (
                <div className="h-9 flex items-center text-sm text-slate-700 px-3 bg-slate-50 rounded-md border border-slate-200">
                  {channel || '—'}
                </div>
              )}
            </div>
            <div>
              <label className="text-xs font-medium text-slate-500 block mb-1">Status</label>
              {isEditable ? (
                <Select value={status} onValueChange={(val) => setStatus(val as ServiceStatus)}>
                  <SelectTrigger className="h-9">
                    <SelectValue />
                  </SelectTrigger>
                  <SelectContent>
                    <SelectItem value="Aberto">Aberto</SelectItem>
                    <SelectItem value="Em Andamento">Em Andamento</SelectItem>
                    <SelectItem value="Concluído">Concluído</SelectItem>
                    <SelectItem value="Cancelado">Cancelado</SelectItem>
                  </SelectContent>
                </Select>
              ) : (
                <div className="h-9 flex items-center text-sm text-slate-700 px-3 bg-slate-50 rounded-md border border-slate-200">
                  {status}
                </div>
              )}
            </div>
          </div>

          <div>
            <span className="text-xs font-medium text-slate-500 block mb-1">
              Descrição do Atendimento
            </span>
            <div className="p-3 bg-white border rounded-md text-sm text-slate-800 whitespace-pre-wrap leading-relaxed">
              {record.description}
            </div>
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
                    className="flex items-center gap-2.5 p-2 bg-slate-50 rounded border border-slate-100 group"
                  >
                    <Checkbox
                      id={`task-${idx}`}
                      checked={task.done}
                      onCheckedChange={() => handleTaskToggle(idx)}
                      disabled={!isEditable}
                    />
                    <label
                      htmlFor={`task-${idx}`}
                      className={`text-xs flex-1 cursor-pointer ${task.done ? 'line-through text-slate-400' : 'text-slate-800 font-medium'} ${!isEditable ? 'cursor-default' : ''}`}
                    >
                      {task.title}
                    </label>
                    {isEditable && (
                      <Button
                        variant="ghost"
                        size="icon"
                        className="h-6 w-6 opacity-0 group-hover:opacity-100 transition-opacity text-red-500 hover:text-red-700"
                        onClick={() => handleRemoveTask(idx)}
                      >
                        <Trash2 className="h-3 w-3" />
                      </Button>
                    )}
                  </div>
                ))}
              </div>
            )}
            {isEditable && (
              <div className="flex gap-2 mt-2">
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
            )}
          </div>
        </div>

        <div className="space-y-2 border-t pt-3">
          <div className="flex items-center space-x-2">
            <Checkbox
              id="d-wrong-dept"
              checked={avoidableContact}
              disabled={!isEditable}
              onCheckedChange={(checked) => {
                setAvoidableContact(!!checked)
                if (!checked) setAvoidableContactExplanation('')
              }}
            />
            <label
              htmlFor="d-wrong-dept"
              className={`text-xs font-medium text-slate-500 ${isEditable ? 'cursor-pointer' : 'cursor-default'}`}
            >
              Contato Evitável
            </label>
          </div>
          {avoidableContact && (
            <div className="space-y-1 pl-6">
              <label className="text-xs font-medium text-slate-500 block">Explicação *</label>
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
          )}
        </div>

        <DialogFooter className="flex items-center justify-between border-t pt-3 sm:justify-between">
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
          <div className="flex gap-2">
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
          </div>
        </DialogFooter>
      </DialogContent>
    </Dialog>
  )
}
