import { Card, CardContent } from '@/components/ui/card'
import { Checkbox } from '@/components/ui/checkbox'
import { Button } from '@/components/ui/button'
import { ServiceRecord, TaskItem } from '@/types/service_record'
import { StatusBadge } from './StatusBadge'
import { PriorityBadge } from './PriorityBadge'
import { TravelTypeBadge } from './TravelTypeBadge'
import { Eye, Clock, User, CheckSquare } from 'lucide-react'
import { format } from 'date-fns'
import { ptBR } from 'date-fns/locale'

interface MinhasTarefasListProps {
  records: ServiceRecord[]
  onViewRecord?: (record: ServiceRecord) => void
  onToggleTask?: (recordId: string, taskIndex: number) => void
}

export function MinhasTarefasList({ records, onViewRecord, onToggleTask }: MinhasTarefasListProps) {
  if (records.length === 0) {
    return (
      <Card className="border-slate-200 shadow-subtle p-8 text-center">
        <CheckSquare className="h-10 w-10 text-slate-300 mx-auto mb-2" />
        <p className="text-sm text-slate-500">Nenhuma tarefa atribuída a você no momento.</p>
      </Card>
    )
  }

  const isTaskEditable = (status: string) => status !== 'Cancelado' && status !== 'Concluído'

  return (
    <div className="space-y-3">
      {records.map((r) => {
        const tasks = Array.isArray(r.tasks) ? r.tasks : []
        const completedTasks = tasks.filter((t) => t.done).length
        const editable = isTaskEditable(r.status)
        return (
          <Card key={r.id} className="border-slate-200 shadow-subtle overflow-hidden">
            <CardContent className="p-4 space-y-3">
              <div className="flex items-start justify-between gap-3">
                <div className="space-y-1 flex-1 min-w-0">
                  <div className="flex items-center gap-2 flex-wrap">
                    {r.client_company && (
                      <button
                        className="font-bold text-sm text-slate-900 hover:text-indigo-600 transition-colors text-left"
                        onClick={() => onViewRecord?.(r)}
                      >
                        {r.client_company}
                      </button>
                    )}
                    <h4 className="font-bold text-sm text-slate-900">{r.client_name}</h4>
                    <StatusBadge status={r.status} />
                    <PriorityBadge priority={r.priority} />
                    {r.travel_type && <TravelTypeBadge travelType={r.travel_type} />}
                  </div>
                  <p className="text-xs text-slate-600 line-clamp-2">{r.description}</p>
                  <div className="flex items-center gap-3 text-[11px] text-slate-500 flex-wrap">
                    <span className="flex items-center gap-1">
                      <User className="h-3 w-3" /> {r.assigned_agent || '-'}
                    </span>
                    <span className="flex items-center gap-1">
                      <Clock className="h-3 w-3" /> {r.duration ? `${r.duration} min` : '-'}
                    </span>
                    <span>
                      {r.created
                        ? format(new Date(r.created), 'dd/MM/yyyy HH:mm', { locale: ptBR })
                        : '-'}
                    </span>
                  </div>
                </div>
                {onViewRecord && (
                  <Button
                    variant="ghost"
                    size="icon"
                    className="h-8 w-8 text-indigo-600 shrink-0"
                    onClick={() => onViewRecord(r)}
                  >
                    <Eye className="h-4 w-4" />
                  </Button>
                )}
              </div>
              {tasks.length > 0 && (
                <div className="border-t border-slate-100 pt-2">
                  <div className="flex items-center justify-between mb-1.5">
                    <span className="text-[11px] font-semibold text-slate-500 uppercase tracking-wider flex items-center gap-1">
                      <CheckSquare className="h-3 w-3" /> Tarefas
                    </span>
                    <span className="text-[11px] text-slate-500">
                      {completedTasks}/{tasks.length} concluídas
                    </span>
                  </div>
                  <div className="space-y-1">
                    {tasks.map((task: TaskItem, idx: number) => (
                      <div
                        key={idx}
                        className="flex items-center gap-2 p-1.5 bg-slate-50 rounded text-xs"
                      >
                        <Checkbox
                          checked={task.done}
                          disabled={!editable}
                          onCheckedChange={() => onToggleTask?.(r.id, idx)}
                        />
                        <span
                          className={task.done ? 'line-through text-slate-400' : 'text-slate-700'}
                        >
                          {task.title}
                        </span>
                      </div>
                    ))}
                  </div>
                </div>
              )}
            </CardContent>
          </Card>
        )
      })}
    </div>
  )
}
