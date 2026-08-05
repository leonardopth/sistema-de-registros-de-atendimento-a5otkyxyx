import { useState, useEffect } from 'react'
import { getHistoryByServiceRecord } from '@/services/service_record_history'
import { useRealtime } from '@/hooks/use-realtime'
import { ServiceRecordHistory } from '@/types/service_record'
import { Loader2, History, User } from 'lucide-react'
import { format } from 'date-fns'
import { ptBR } from 'date-fns/locale'
import { ScrollArea } from '@/components/ui/scroll-area'

const FIELD_LABELS: Record<string, string> = {
  status: 'Status',
  channel: 'Canal',
  priority: 'Prioridade',
  description: 'Descrição',
  contact_reason: 'Motivo do Contato',
  assigned_agent: 'Atendente',
  assigned_user: 'Responsável',
  duration: 'Duração',
  avoidable_contact: 'Contato Evitável',
  avoidable_contact_explanation: 'Explicação',
  avoidable_contact_reason: 'Motivo Evitável',
  tasks: 'Tarefas',
}

interface Props {
  serviceRecordId?: string
}

export function ServiceRecordHistoryPanel({ serviceRecordId }: Props) {
  const [history, setHistory] = useState<ServiceRecordHistory[]>([])
  const [loading, setLoading] = useState(true)

  const loadData = async () => {
    if (!serviceRecordId) return
    try {
      const data = await getHistoryByServiceRecord(serviceRecordId)
      setHistory(data)
    } catch {
      setHistory([])
    } finally {
      setLoading(false)
    }
  }

  useEffect(() => {
    if (serviceRecordId) {
      setLoading(true)
      loadData()
    }
  }, [serviceRecordId])

  useRealtime('service_record_history', () => loadData(), !!serviceRecordId)

  if (loading) {
    return (
      <div className="flex items-center justify-center py-8">
        <Loader2 className="h-5 w-5 animate-spin text-slate-400" />
      </div>
    )
  }

  if (history.length === 0) {
    return (
      <div className="flex flex-col items-center justify-center py-8 text-center">
        <History className="h-8 w-8 text-slate-300 mb-2" />
        <p className="text-xs text-slate-400">Nenhum histórico de alterações registrado.</p>
      </div>
    )
  }

  return (
    <ScrollArea className="max-h-[400px]">
      <div className="space-y-2 py-2">
        {history.map((h) => (
          <div
            key={h.id}
            className="flex flex-col gap-1 p-2.5 bg-slate-50 rounded-lg border border-slate-100"
          >
            <div className="flex items-center justify-between">
              <span className="text-xs font-bold text-indigo-950">
                {FIELD_LABELS[h.field] || h.field}
              </span>
              <span className="text-[10px] text-slate-400">
                {format(new Date(h.created), "dd/MM/yyyy 'às' HH:mm", { locale: ptBR })}
              </span>
            </div>
            <div className="flex items-center gap-2 text-[11px]">
              <span className="text-slate-500 line-through max-w-[140px] truncate">
                {h.old_value || '—'}
              </span>
              <span className="text-slate-400">→</span>
              <span className="text-slate-800 font-medium max-w-[140px] truncate">
                {h.new_value || '—'}
              </span>
            </div>
            <div className="flex items-center gap-1 text-[10px] text-slate-400">
              {h.expand?.user?.name && (
                <span className="flex items-center gap-0.5">
                  <User className="h-2.5 w-2.5" /> {h.expand.user.name}
                </span>
              )}
            </div>
            {h.justification && (
              <p className="text-[10px] text-amber-700 bg-amber-50 px-2 py-1 rounded mt-0.5">
                Justificativa: {h.justification}
              </p>
            )}
          </div>
        ))}
      </div>
    </ScrollArea>
  )
}
