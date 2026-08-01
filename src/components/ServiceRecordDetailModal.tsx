import { useState, useEffect } from 'react'
import {
  Dialog,
  DialogContent,
  DialogHeader,
  DialogTitle,
  DialogFooter,
} from '@/components/ui/dialog'
import { Button } from '@/components/ui/button'
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from '@/components/ui/select'
import { Checkbox } from '@/components/ui/checkbox'
import { ServiceRecord, ServiceStatus, TaskItem } from '@/types/service_record'
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
} from 'lucide-react'
import { format } from 'date-fns'
import { ptBR } from 'date-fns/locale'

interface ServiceRecordDetailModalProps {
  record: ServiceRecord | null
  open: boolean
  onOpenChange: (open: boolean) => void
  onUpdateSuccess?: () => void
}

export function ServiceRecordDetailModal({
  record,
  open,
  onOpenChange,
  onUpdateSuccess,
}: ServiceRecordDetailModalProps) {
  const [status, setStatus] = useState<ServiceStatus>('Aberto')
  const [tasks, setTasks] = useState<TaskItem[]>([])
  const [loading, setLoading] = useState(false)
  const [deleting, setDeleting] = useState(false)
  const { toast } = useToast()

  useEffect(() => {
    if (record) {
      setStatus(record.status)
      setTasks(record.tasks || [])
    }
  }, [record])

  if (!record) return null

  const handleTaskToggle = (index: number) => {
    const updated = [...tasks]
    updated[index].done = !updated[index].done
    setTasks(updated)
  }

  const handleSave = async () => {
    setLoading(true)
    try {
      const isCompletedNow = status === 'Concluído' && record.status !== 'Concluído'
      await updateServiceRecord(record.id, {
        status,
        tasks,
        end_time: isCompletedNow ? new Date().toISOString() : record.end_time,
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
            <DialogTitle className="text-xl font-bold text-slate-900">
              Detalhes do Atendimento
            </DialogTitle>
            <div className="flex items-center gap-2">
              <StatusBadge status={status} />
              <PriorityBadge priority={record.priority} />
            </div>
          </div>
        </DialogHeader>

        <div className="space-y-5 py-3 text-slate-700">
          <div className="bg-slate-50 p-3.5 rounded-lg border border-slate-100 space-y-2">
            <div className="flex items-center justify-between font-semibold text-indigo-950 text-base">
              <span>{record.client_name}</span>
              <span className="text-xs font-normal text-slate-500">
                {record.start_time
                  ? format(new Date(record.start_time), "dd/MM/yyyy 'às' HH:mm", { locale: ptBR })
                  : ''}
              </span>
            </div>
            <div className="grid grid-cols-2 gap-2 text-xs text-slate-600">
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
              {record.client_company && (
                <div className="flex items-center gap-1.5 col-span-2">
                  <Building className="h-3.5 w-3.5 text-slate-400" />
                  {record.client_company}
                </div>
              )}
            </div>
          </div>

          <div className="grid grid-cols-2 gap-4 text-sm">
            <div>
              <span className="text-xs font-medium text-slate-500 block mb-1">
                Motivo do Contato
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

          <div>
            <span className="text-xs font-medium text-slate-500 block mb-1">
              Descrição do Atendimento
            </span>
            <div className="p-3 bg-white border rounded-md text-sm text-slate-800 whitespace-pre-wrap leading-relaxed">
              {record.description}
            </div>
          </div>

          <div className="grid grid-cols-2 gap-4 items-center">
            <div>
              <label className="text-xs font-medium text-slate-500 block mb-1">
                Alterar Status
              </label>
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
            </div>
            <div>
              <span className="text-xs font-medium text-slate-500 block mb-1">
                Tempo de Atendimento
              </span>
              <div className="flex items-center gap-1.5 text-sm font-semibold text-slate-700 h-9">
                <Clock className="h-4 w-4 text-indigo-600" />
                {record.duration ? `${record.duration} minutos` : 'Não especificado'}
              </div>
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
                    className="flex items-center gap-2.5 p-2 bg-slate-50 rounded border border-slate-100"
                  >
                    <Checkbox
                      id={`task-${idx}`}
                      checked={task.done}
                      onCheckedChange={() => handleTaskToggle(idx)}
                    />
                    <label
                      htmlFor={`task-${idx}`}
                      className={`text-xs flex-1 cursor-pointer ${task.done ? 'line-through text-slate-400' : 'text-slate-800 font-medium'}`}
                    >
                      {task.title}
                    </label>
                  </div>
                ))}
              </div>
            )}
          </div>
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
          </div>
        </DialogFooter>
      </DialogContent>
    </Dialog>
  )
}
