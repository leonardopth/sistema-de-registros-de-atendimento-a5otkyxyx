import {
  Dialog,
  DialogContent,
  DialogHeader,
  DialogTitle,
  DialogFooter,
} from '@/components/ui/dialog'
import { Button } from '@/components/ui/button'
import { Badge } from '@/components/ui/badge'
import { ControlTowerEmailRecord, ControlTowerStatus } from '@/types/control_tower'
import { formatGMT3DateTime } from '@/lib/timezone'
import { SlaCountdownBadge } from '@/components/SlaCountdownBadge'
import { getServiceGroupLabel } from '@/lib/service-groups'
import {
  Mail,
  Clock,
  User,
  Building,
  Tag,
  Calendar,
  AlertTriangle,
  CheckCircle2,
  Inbox,
  Flame,
} from 'lucide-react'

interface ControlTowerDetailModalProps {
  email: ControlTowerEmailRecord | null
  open: boolean
  onOpenChange: (open: boolean) => void
  onStatusChange: (emailId: string, status: ControlTowerStatus) => void
  onAssignToMe: (emailId: string) => void
  currentUserId?: string
}

export function ControlTowerDetailModal({
  email,
  open,
  onOpenChange,
  onStatusChange,
  onAssignToMe,
  currentUserId,
}: ControlTowerDetailModalProps) {
  if (!email) return null

  const priorityColor =
    email.priority === 'P1'
      ? 'bg-red-50 text-red-700 border-red-300'
      : email.priority === 'P2'
        ? 'bg-amber-50 text-amber-700 border-amber-300'
        : 'bg-emerald-50 text-emerald-700 border-emerald-300'

  const statusColor =
    email.status === 'Novo'
      ? 'bg-blue-50 text-blue-700 border-blue-200'
      : email.status === 'Em tratamento'
        ? 'bg-purple-50 text-purple-700 border-purple-200'
        : email.status === 'Aguardando cliente'
          ? 'bg-amber-50 text-amber-700 border-amber-200'
          : email.status === 'Escalado'
            ? 'bg-rose-50 text-rose-700 border-rose-200'
            : 'bg-emerald-50 text-emerald-700 border-emerald-200'

  const signals = Array.isArray(email.detected_signals) ? email.detected_signals : []
  const dates = Array.isArray(email.detected_dates) ? email.detected_dates : []
  const isAssignedToMe = Boolean(email.assigned_to && email.assigned_to === currentUserId)

  return (
    <Dialog open={open} onOpenChange={onOpenChange}>
      <DialogContent className="sm:max-w-[650px] max-h-[90vh] overflow-y-auto">
        <DialogHeader>
          <div className="flex items-center justify-between gap-2 border-b pb-3">
            <div className="flex items-center gap-2">
              <Mail className="h-5 w-5 text-indigo-600 shrink-0" />
              <div>
                <DialogTitle className="text-base font-bold text-slate-900 leading-tight">
                  {email.subject || '(Sem assunto)'}
                </DialogTitle>
                <p className="text-xs text-slate-500 mt-0.5">
                  Recebido em: {email.received_at ? formatGMT3DateTime(email.received_at) : '—'}
                </p>
              </div>
            </div>
            <div className="flex items-center gap-2 shrink-0">
              <Badge
                variant="outline"
                className={`font-bold px-2.5 py-0.5 text-xs ${priorityColor}`}
              >
                {email.priority} • {email.score} pts
              </Badge>
              <Badge variant="outline" className={`font-bold px-2 py-0.5 text-xs ${statusColor}`}>
                {email.status}
              </Badge>
            </div>
          </div>
        </DialogHeader>

        <div className="space-y-4 py-2 text-xs">
          {/* Metadados do E-mail */}
          <div className="grid grid-cols-1 sm:grid-cols-2 gap-3 p-3 bg-slate-50 border border-slate-200 rounded-lg">
            <div>
              <span className="text-[10px] uppercase font-bold text-slate-400 block">
                Remetente
              </span>
              <p className="font-semibold text-slate-900 truncate">
                {email.sender_name
                  ? `${email.sender_name} <${email.sender_email}>`
                  : email.sender_email}
              </p>
            </div>
            <div>
              <span className="text-[10px] uppercase font-bold text-slate-400 block">
                Destinatário
              </span>
              <p className="text-slate-700 truncate">{email.recipient_email || '—'}</p>
            </div>
            <div>
              <span className="text-[10px] uppercase font-bold text-slate-400 block">
                Agência / Cliente
              </span>
              <p className="font-semibold text-indigo-700 flex items-center gap-1">
                <Building className="h-3.5 w-3.5" />
                {email.expand?.client?.company ||
                  email.expand?.client?.name ||
                  'Cliente não vinculado'}
                {email.expand?.client?.priority_client && (
                  <span className="ml-1 text-[10px] bg-amber-100 text-amber-800 px-1 py-0.2 rounded font-bold">
                    ⭐ VIP
                  </span>
                )}
              </p>
            </div>
            <div>
              <span className="text-[10px] uppercase font-bold text-slate-400 block">
                Caixa & Núcleo de Origem
              </span>
              <p className="text-slate-800 flex items-center gap-1 font-medium">
                <Inbox className="h-3.5 w-3.5 text-indigo-500" />
                {email.service_group ? getServiceGroupLabel(email.service_group) : '—'}
                {email.inbox_address && (
                  <span className="text-[10px] text-slate-500 font-mono">
                    ({email.inbox_address})
                  </span>
                )}
              </p>
              <p className="text-[11px] text-slate-500 mt-0.5">
                Equipe: <strong>{email.team || 'Nacional'}</strong>
              </p>
            </div>
            <div>
              <span className="text-[10px] uppercase font-bold text-slate-400 block">
                Responsável Atual
              </span>
              <p className="text-slate-800 flex items-center gap-1">
                <User className="h-3.5 w-3.5 text-slate-500" />
                {email.expand?.assigned_to?.name || (
                  <span className="text-rose-600 font-bold italic">Não atribuído (Fila livre)</span>
                )}
              </p>
            </div>
            <div>
              <span className="text-[10px] uppercase font-bold text-slate-400 block">
                SLA & Tempo na Caixa
              </span>
              <div className="flex items-center gap-2 mt-0.5">
                <SlaCountdownBadge deadline={email.sla_deadline} status={email.status} />
                <span className="text-[11px] text-slate-500">
                  ({email.business_hours_waiting ?? 0}h úteis decorridas)
                </span>
              </div>
            </div>
          </div>

          {/* Destaque de Escalação se o item estiver Escalado */}
          {email.status === 'Escalado' && (
            <div className="p-3 bg-rose-50 border-2 border-rose-300 rounded-lg space-y-1">
              <div className="flex items-center gap-1.5 text-rose-800 font-bold">
                <Flame className="h-4 w-4 text-rose-600 animate-pulse" />
                <span>Atendimento Escalado para Supervisão</span>
              </div>
              <p className="text-xs text-rose-700">
                {email.escalated_reason ||
                  'O prazo de SLA para atendimento em horas úteis foi estourado.'}
              </p>
              {email.escalated_at && (
                <p className="text-[10px] text-rose-600 font-mono">
                  Escalado em: {formatGMT3DateTime(email.escalated_at)}
                </p>
              )}
            </div>
          )}

          {/* Sinais Detectados */}
          <div className="space-y-1.5">
            <span className="text-[11px] font-bold text-slate-700 flex items-center gap-1">
              <Tag className="h-3.5 w-3.5 text-indigo-600" />
              Sinais e Regras Detectadas no E-mail
            </span>
            <div className="flex flex-wrap gap-1.5">
              {signals.length > 0 ? (
                signals.map((sig, idx) => {
                  const isCritical =
                    sig.includes('24h') || sig.includes('Formal') || sig.includes('VIP')
                  return (
                    <span
                      key={idx}
                      className={`inline-flex items-center gap-1 px-2.5 py-1 rounded-full text-xs font-semibold border ${
                        isCritical
                          ? 'bg-rose-50 text-rose-700 border-rose-200'
                          : 'bg-indigo-50 text-indigo-700 border-indigo-200'
                      }`}
                    >
                      {sig}
                    </span>
                  )
                })
              ) : (
                <span className="text-xs text-slate-400">Nenhum sinal crítico detectado.</span>
              )}
            </div>
          </div>

          {/* Dados Extras Extraídos */}
          {(email.reservation_number || dates.length > 0) && (
            <div className="p-3 bg-amber-50/50 border border-amber-200 rounded-lg space-y-1">
              <span className="text-[11px] font-bold text-amber-900 flex items-center gap-1">
                <AlertTriangle className="h-3.5 w-3.5 text-amber-600" />
                Dados Identificados no Conteúdo
              </span>
              <div className="flex items-center gap-4 text-xs text-amber-900 flex-wrap">
                {email.reservation_number && (
                  <span>
                    <strong>Reserva / PNR:</strong> {email.reservation_number}
                  </span>
                )}
                {dates.length > 0 && (
                  <span className="flex items-center gap-1">
                    <Calendar className="h-3 w-3" />
                    <strong>Datas detectadas:</strong> {dates.join(', ')}
                  </span>
                )}
              </div>
            </div>
          )}

          {/* Conteúdo / Trecho do E-mail */}
          <div className="space-y-1">
            <span className="text-[11px] font-bold text-slate-700">Conteúdo do E-mail</span>
            <div className="p-3 bg-slate-50 border border-slate-200 rounded-lg text-slate-800 whitespace-pre-wrap max-h-48 overflow-y-auto leading-relaxed text-xs font-mono">
              {email.body_snippet || '(Sem conteúdo disponível)'}
            </div>
          </div>

          {/* Ações de Status */}
          <div className="space-y-1.5 pt-2 border-t border-slate-200">
            <span className="text-[11px] font-bold text-slate-700 block">
              Atualizar Ciclo de Vida
            </span>
            <div className="flex flex-wrap gap-2">
              <Button
                variant={email.status === 'Novo' ? 'default' : 'outline'}
                size="sm"
                className="h-7 text-xs"
                onClick={() => onStatusChange(email.id, 'Novo')}
              >
                Novo
              </Button>
              <Button
                variant={email.status === 'Em tratamento' ? 'default' : 'outline'}
                size="sm"
                className="h-7 text-xs"
                onClick={() => onStatusChange(email.id, 'Em tratamento')}
              >
                Em tratamento
              </Button>
              <Button
                variant={email.status === 'Aguardando cliente' ? 'default' : 'outline'}
                size="sm"
                className="h-7 text-xs"
                onClick={() => onStatusChange(email.id, 'Aguardando cliente')}
              >
                Aguardando cliente
              </Button>
              <Button
                variant={email.status === 'Escalado' ? 'default' : 'outline'}
                size="sm"
                className="h-7 text-xs text-rose-700 border-rose-300 hover:bg-rose-50"
                onClick={() => onStatusChange(email.id, 'Escalado')}
              >
                Escalado
              </Button>
              <Button
                variant={email.status === 'Resolvido' ? 'default' : 'outline'}
                size="sm"
                className="h-7 text-xs text-emerald-700 border-emerald-300 hover:bg-emerald-50"
                onClick={() => onStatusChange(email.id, 'Resolvido')}
              >
                <CheckCircle2 className="h-3.5 w-3.5 mr-1" />
                Resolvido
              </Button>
            </div>
          </div>
        </div>

        <DialogFooter className="gap-2 sm:justify-between">
          <div>
            {!isAssignedToMe ? (
              <Button
                size="sm"
                className="bg-indigo-600 hover:bg-indigo-700 text-white font-bold h-8 text-xs"
                onClick={() => {
                  onAssignToMe(email.id)
                  onOpenChange(false)
                }}
              >
                <User className="h-3.5 w-3.5 mr-1.5" />
                Assumir Atendimento
              </Button>
            ) : (
              <span className="text-xs font-semibold text-emerald-700 flex items-center gap-1">
                <CheckCircle2 className="h-4 w-4" /> Atribuído a você
              </span>
            )}
          </div>
          <Button variant="outline" size="sm" onClick={() => onOpenChange(false)}>
            Fechar
          </Button>
        </DialogFooter>
      </DialogContent>
    </Dialog>
  )
}
