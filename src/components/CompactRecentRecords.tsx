import { useNavigate } from 'react-router-dom'
import { Card, CardHeader, CardTitle, CardContent } from '@/components/ui/card'
import { Button } from '@/components/ui/button'
import { StatusBadge } from '@/components/StatusBadge'
import { normalizeContactReason } from '@/constants/contactReasons'
import { ServiceRecord } from '@/types/service_record'
import { Headset, ArrowRight, Clock } from 'lucide-react'
import { format } from 'date-fns'
import { ptBR } from 'date-fns/locale'

interface CompactRecentRecordsProps {
  records: ServiceRecord[]
  title?: string
  emptyMessage?: string
  showConsultant?: boolean
  className?: string
  maxItems?: number
}

const safeFormatDate = (dateStr?: string) => {
  if (!dateStr) return ''
  try {
    const d = new Date(dateStr)
    if (isNaN(d.getTime())) return ''
    return format(d, 'dd/MM HH:mm', { locale: ptBR })
  } catch {
    return ''
  }
}

export function CompactRecentRecords({
  records,
  title = 'Atendimentos Recentes',
  emptyMessage = 'Nenhum atendimento recente.',
  showConsultant = false,
  className = '',
  maxItems = 5,
}: CompactRecentRecordsProps) {
  const navigate = useNavigate()
  const displayRecords = (records || []).slice(0, maxItems)

  return (
    <Card className={`border-slate-200 shadow-subtle ${className}`}>
      <CardHeader className="p-3.5 pb-2 border-b border-slate-100/80">
        <CardTitle className="text-sm font-bold text-slate-900 flex items-center justify-between">
          <span className="flex items-center gap-2">
            <Headset className="h-4 w-4 text-indigo-600 shrink-0" />
            <span>{title}</span>
            <span className="text-[11px] font-normal text-slate-400">
              (últimos {displayRecords.length})
            </span>
          </span>
          <Button
            variant="ghost"
            size="sm"
            onClick={() => navigate('/atendimentos')}
            className="text-xs text-indigo-600 hover:text-indigo-700 hover:bg-indigo-50 font-semibold p-1 px-2 h-7"
          >
            Ver todos <ArrowRight className="h-3.5 w-3.5 ml-1" />
          </Button>
        </CardTitle>
      </CardHeader>

      <CardContent className="p-2 sm:p-2.5 divide-y divide-slate-100">
        {displayRecords.length === 0 ? (
          <div className="py-6 text-center">
            <Clock className="h-5 w-5 text-slate-300 mx-auto mb-1.5" />
            <p className="text-xs text-slate-400">{emptyMessage}</p>
          </div>
        ) : (
          displayRecords.map((r, idx) => {
            const clientName = r.client_company || r.client_name || 'Cliente'
            const reason =
              normalizeContactReason(r.contact_reason) || r.contact_reason || 'Atendimento'
            const consultant =
              showConsultant && r.expand?.assigned_user?.name
                ? ` • ${r.expand.assigned_user.name}`
                : ''
            const durationText = r.duration ? `${r.duration}m` : null
            const dateText = safeFormatDate(r.created)

            return (
              <div
                key={r.id || `compact-rec-${idx}`}
                onClick={() => navigate(`/atendimentos?id=${r.id}`)}
                className="flex items-center justify-between gap-2 py-2 px-2 rounded-md hover:bg-slate-50 transition-colors cursor-pointer text-xs"
              >
                {/* Linha única: Cliente, motivo (e opcionalmente consultor) */}
                <div className="min-w-0 flex-1 flex items-center gap-2">
                  <span className="font-bold text-slate-900 truncate max-w-[130px] sm:max-w-[200px]">
                    {clientName}
                  </span>
                  <span className="text-slate-300 hidden xs:inline shrink-0">|</span>
                  <span className="text-slate-600 truncate text-[11px] max-w-[150px] sm:max-w-[260px]">
                    {reason}
                    {consultant && (
                      <span className="text-slate-400 hidden md:inline">{consultant}</span>
                    )}
                  </span>
                </div>

                {/* Status + Tempo (Duração ou Data) */}
                <div className="flex items-center gap-2 shrink-0">
                  <StatusBadge status={r.status || 'Aberto'} />
                  {durationText && (
                    <span
                      className="text-[11px] font-medium text-slate-500 bg-slate-100 px-1.5 py-0.5 rounded hidden sm:inline"
                      title="Duração"
                    >
                      {durationText}
                    </span>
                  )}
                  {dateText && (
                    <span className="text-[10px] text-slate-400 hidden xs:inline">{dateText}</span>
                  )}
                </div>
              </div>
            )
          })
        )}
      </CardContent>
    </Card>
  )
}
