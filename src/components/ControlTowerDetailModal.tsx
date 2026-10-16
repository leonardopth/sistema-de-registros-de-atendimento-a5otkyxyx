import { useState, useEffect } from 'react'
import { useNavigate } from 'react-router-dom'
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
  getAnalyzedSignals,
  normalizeSignals,
  getSentimentVisual,
} from '@/lib/control-tower-signals'
import { getThreadMessages } from '@/services/control_tower'
import pb from '@/lib/pocketbase/client'
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
  MessagesSquare,
  MessageSquareText,
  Loader2,
  ChevronDown,
  ChevronUp,
  ExternalLink,
  Headphones,
} from 'lucide-react'

interface ControlTowerDetailModalProps {
  email: ControlTowerEmailRecord | null
  open: boolean
  onOpenChange: (open: boolean) => void
  onStatusChange: (emailId: string, status: ControlTowerStatus) => void
  onAssignToMe: (emailId: string) => void
  currentUserId?: string
}

// Limpa prefixos de e-mail repetitivos para exibição mais limpa
function cleanSubject(subj?: string): string {
  if (!subj) return '(Sem assunto)'
  return subj.replace(/^\s*(re\s*:\s*|fwd\s*:\s*|enc\s*:\s*|res\s*:\s*|rv\s*:\s*)+/gi, '').trim()
}

export function ControlTowerDetailModal({
  email,
  open,
  onOpenChange,
  onStatusChange,
  onAssignToMe,
  currentUserId,
}: ControlTowerDetailModalProps) {
  const navigate = useNavigate()
  const [threadMessages, setThreadMessages] = useState<ControlTowerEmailRecord[]>([])
  const [loadingThread, setLoadingThread] = useState(false)
  const [expandedMsgIds, setExpandedMsgIds] = useState<Record<string, boolean>>({})
  const [linkedServiceRecordId, setLinkedServiceRecordId] = useState<string | null>(null)
  const [checkingAttendance, setCheckingAttendance] = useState(false)

  useEffect(() => {
    if (!email || !open) {
      setThreadMessages([])
      setLinkedServiceRecordId(null)
      return
    }

    const tId = email.thread_id || email.id
    setLoadingThread(true)
    setCheckingAttendance(true)

    getThreadMessages(tId)
      .then((msgs) => {
        if (msgs.length > 0) {
          setThreadMessages(msgs)
          // Abre por padrão a última e a primeira mensagem
          const initialExpanded: Record<string, boolean> = {}
          msgs.forEach((m, idx) => {
            if (idx === 0 || idx === msgs.length - 1) {
              initialExpanded[m.id] = true
            }
          })
          setExpandedMsgIds(initialExpanded)
        } else {
          setThreadMessages([email])
          setExpandedMsgIds({ [email.id]: true })
        }
      })
      .catch(() => {
        setThreadMessages([email])
        setExpandedMsgIds({ [email.id]: true })
      })
      .finally(() => {
        setLoadingThread(false)
      })

    // Checar vínculo com Atendimento existente
    const checkLink = async () => {
      try {
        if (email.service_record) {
          setLinkedServiceRecordId(email.service_record)
          return
        }
        const filterStr = email.thread_id
          ? `thread_id = '${email.thread_id}' || control_tower_email = '${email.id}'`
          : `control_tower_email = '${email.id}'`

        const list = await pb.collection('service_records').getList(1, 1, {
          filter: filterStr,
          sort: '-created',
        })
        if (list.items && list.items.length > 0) {
          setLinkedServiceRecordId(list.items[0].id)
        } else {
          setLinkedServiceRecordId(null)
        }
      } catch (_) {
        setLinkedServiceRecordId(null)
      } finally {
        setCheckingAttendance(false)
      }
    }
    checkLink()
  }, [email, open])

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

  const analyzedSignals = getAnalyzedSignals(email.detected_signals).filter((sig) =>
    Boolean(sig?.label && !/^\d{1,3}$/.test(sig.label.trim())),
  )
  const dates = (
    Array.isArray(email.detected_dates)
      ? email.detected_dates
      : typeof email.detected_dates === 'string'
        ? normalizeSignals(email.detected_dates)
        : []
  ).filter(
    (d): d is string => typeof d === 'string' && d.trim().length > 0 && !/^\d{1,3}$/.test(d.trim()),
  )
  const isAssignedToMe = Boolean(email.assigned_to && email.assigned_to === currentUserId)
  const totalThreadCount = Math.max(email.message_count || 1, threadMessages.length || 1)

  const toggleExpandMsg = (msgId: string) => {
    setExpandedMsgIds((prev) => ({
      ...prev,
      [msgId]: !prev[msgId],
    }))
  }

  return (
    <Dialog open={open} onOpenChange={onOpenChange}>
      <DialogContent className="sm:max-w-[760px] max-h-[92vh] overflow-y-auto">
        <DialogHeader>
          <div className="flex items-start justify-between gap-3 border-b pb-3">
            <div className="flex items-start gap-2.5">
              <div className="p-2 bg-indigo-50 text-indigo-700 rounded-lg shrink-0 mt-0.5">
                <MessagesSquare className="h-5 w-5" />
              </div>
              <div>
                <DialogTitle className="text-base font-bold text-slate-900 leading-tight">
                  {cleanSubject(email.subject)}
                </DialogTitle>
                <div className="flex items-center gap-2 mt-1 text-xs text-slate-500 flex-wrap">
                  <span className="inline-flex items-center gap-1 font-semibold text-indigo-700 bg-indigo-50 px-2 py-0.5 rounded-full border border-indigo-200 text-[11px]">
                    <MessageSquareText className="h-3 w-3" />
                    Conversa com {totalThreadCount} mensagem{totalThreadCount === 1 ? '' : 's'}
                  </span>
                  <span>•</span>
                  <span>
                    Última atividade:{' '}
                    {email.last_message_at
                      ? formatGMT3DateTime(email.last_message_at)
                      : email.received_at
                        ? formatGMT3DateTime(email.received_at)
                        : '—'}
                  </span>
                </div>
              </div>
            </div>
            <div className="flex items-center gap-2 shrink-0 flex-wrap justify-end">
              {(() => {
                const sVis = getSentimentVisual(
                  email.sentiment_label,
                  email.sentiment_score,
                  email.sentiment_intensity,
                )
                return (
                  <Badge
                    variant="outline"
                    className={`font-bold px-2.5 py-0.5 text-xs ${sVis.colorBadgeClass}`}
                    title={sVis.description}
                  >
                    <span className="mr-1">{sVis.emoji}</span>
                    {sVis.label}
                    {email.sentiment_intensity ? ` (${email.sentiment_intensity})` : ''}
                  </Badge>
                )
              })()}
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
          {/* Vínculo com Atendimento (Porta de Entrada da Operação) */}
          <div className="p-3 bg-gradient-to-r from-indigo-50/80 via-white to-blue-50/80 border border-indigo-200 rounded-lg flex flex-col sm:flex-row items-start sm:items-center justify-between gap-3 shadow-xs">
            <div className="flex items-center gap-2.5">
              <div className="p-2 bg-indigo-600 text-white rounded-md shrink-0">
                <Headphones className="h-4 w-4" />
              </div>
              <div>
                <span className="text-[10px] uppercase font-bold text-indigo-700 tracking-wider block">
                  Operação Integrada • Atendimento Vinculado
                </span>
                {checkingAttendance ? (
                  <p className="text-xs text-slate-500 flex items-center gap-1.5 mt-0.5">
                    <Loader2 className="h-3.5 w-3.5 animate-spin text-indigo-600" />
                    Verificando vínculo com Atendimentos...
                  </p>
                ) : linkedServiceRecordId ? (
                  <p className="text-xs font-semibold text-slate-800 mt-0.5 flex items-center gap-1.5">
                    <CheckCircle2 className="h-3.5 w-3.5 text-emerald-600 shrink-0" />
                    Atendimento{' '}
                    <span className="font-mono text-indigo-700">
                      #{linkedServiceRecordId.substring(0, 8)}
                    </span>{' '}
                    gerado via Torre
                  </p>
                ) : (
                  <p className="text-xs text-slate-600 mt-0.5">
                    Ao assumir esta conversa, o atendimento será{' '}
                    <strong>criado automaticamente</strong> em Atendimentos com a origem{' '}
                    <em>"E-mail (Torre)"</em>.
                  </p>
                )}
              </div>
            </div>

            {linkedServiceRecordId && (
              <Button
                size="sm"
                className="bg-indigo-600 hover:bg-indigo-700 text-white font-bold h-7 text-xs shrink-0 shadow-xs"
                onClick={() => {
                  onOpenChange(false)
                  navigate(`/atendimentos?id=${linkedServiceRecordId}`)
                }}
              >
                <ExternalLink className="h-3.5 w-3.5 mr-1" />
                Abrir Atendimento
              </Button>
            )}
          </div>

          {/* Metadados da Conversa e Caixa Compartilhada */}
          <div className="grid grid-cols-1 sm:grid-cols-2 gap-3 p-3 bg-slate-50 border border-slate-200 rounded-lg">
            <div>
              <span className="text-[10px] uppercase font-bold text-slate-400 block">
                Cliente / Remetente
              </span>
              <p className="font-semibold text-slate-900 truncate">
                {email.sender_name
                  ? `${email.sender_name} <${email.sender_email}>`
                  : email.sender_email}
              </p>
              <p className="font-semibold text-indigo-700 flex items-center gap-1 mt-0.5">
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
                Caixa de Atendimento do Núcleo
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
                Responsável Atual da Thread
              </span>
              <p className="text-slate-800 flex items-center gap-1">
                <User className="h-3.5 w-3.5 text-slate-500" />
                {email.expand?.assigned_to?.name || (
                  <span className="text-rose-600 font-bold italic">
                    Não atribuído (Fila livre da caixa)
                  </span>
                )}
              </p>
            </div>

            <div>
              <span className="text-[10px] uppercase font-bold text-slate-400 block">
                SLA & Tempo em Expediente Útil
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

          {/* Sinais Detectados na Thread */}
          <div className="space-y-1.5">
            <span className="text-[11px] font-bold text-slate-700 flex items-center gap-1">
              <Tag className="h-3.5 w-3.5 text-indigo-600" />
              Sinais e Regras Detectadas na Conversa
            </span>
            <div className="flex flex-wrap gap-1.5">
              {analyzedSignals.length > 0 ? (
                analyzedSignals.map((sigObj, idx) => {
                  return (
                    <span
                      key={idx}
                      className={`inline-flex items-center gap-1 px-2.5 py-1 rounded-full text-xs font-semibold border ${
                        sigObj.isRed || sigObj.isPersistent
                          ? 'bg-rose-50 text-rose-700 border-rose-200'
                          : 'bg-indigo-50 text-indigo-700 border-indigo-200'
                      }`}
                    >
                      {sigObj.isPersistent && <Flame className="h-3 w-3 text-rose-500" />}
                      {sigObj.label}
                    </span>
                  )
                })
              ) : (
                <span className="text-xs text-slate-400">Nenhum sinal crítico detectado.</span>
              )}
            </div>
          </div>

          {/* Dados Extras Identificados */}
          {(email.reservation_number || dates.length > 0) && (
            <div className="p-2.5 bg-amber-50/50 border border-amber-200 rounded-lg space-y-1">
              <span className="text-[11px] font-bold text-amber-900 flex items-center gap-1">
                <AlertTriangle className="h-3.5 w-3.5 text-amber-600" />
                Dados Identificados no Conteúdo da Conversa
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

          {/* TIMELINE DE MENSAGENS DA CONVERSA (THREADING) */}
          <div className="space-y-2 pt-2 border-t border-slate-200">
            <div className="flex items-center justify-between">
              <span className="text-xs font-bold text-slate-800 flex items-center gap-1.5">
                <MessagesSquare className="h-4 w-4 text-indigo-600" />
                Histórico de Mensagens da Conversa ({totalThreadCount})
              </span>
              <span className="text-[11px] text-slate-500">Ordem cronológica da thread</span>
            </div>

            {loadingThread && (
              <div className="flex items-center justify-center p-6 text-slate-400 gap-2">
                <Loader2 className="h-4 w-4 animate-spin text-indigo-600" />
                <span>Carregando mensagens da conversa...</span>
              </div>
            )}

            {!loadingThread && (
              <div className="space-y-2.5">
                {threadMessages.map((msg, index) => {
                  const isExpanded = expandedMsgIds[msg.id] ?? true
                  const isRoot = !msg.is_thread_child
                  const msgSigs = getAnalyzedSignals(msg.detected_signals).filter((sig) =>
                    Boolean(sig?.label && !/^\d{1,3}$/.test(sig.label.trim())),
                  )

                  return (
                    <div
                      key={msg.id}
                      className={`border rounded-lg overflow-hidden transition-all ${
                        isRoot
                          ? 'border-indigo-200 bg-indigo-50/20'
                          : 'border-slate-200 bg-white hover:border-slate-300'
                      }`}
                    >
                      {/* Cabeçalho do Card da Mensagem */}
                      <div
                        onClick={() => toggleExpandMsg(msg.id)}
                        className="p-2.5 bg-slate-50/80 border-b border-slate-100 flex items-center justify-between cursor-pointer select-none"
                      >
                        <div className="flex items-center gap-2 min-w-0">
                          <span className="inline-flex items-center justify-center h-5 w-5 rounded-full bg-indigo-100 text-indigo-700 font-bold text-[10px]">
                            {index + 1}
                          </span>
                          <div className="min-w-0">
                            <p className="font-semibold text-slate-900 truncate text-xs">
                              {msg.sender_name || msg.sender_email}
                              {isRoot && (
                                <Badge
                                  variant="outline"
                                  className="ml-1.5 text-[9px] bg-indigo-50 text-indigo-700 border-indigo-200 font-bold"
                                >
                                  Início da conversa
                                </Badge>
                              )}
                            </p>
                            <p className="text-[10px] text-slate-500">
                              {msg.received_at ? formatGMT3DateTime(msg.received_at) : '—'}
                              {msg.external_message_id && ` • ID: ${msg.external_message_id}`}
                            </p>
                          </div>
                        </div>

                        <div className="flex items-center gap-2 shrink-0">
                          {(() => {
                            const msgSentVis = getSentimentVisual(
                              msg.sentiment_label,
                              msg.sentiment_score,
                              msg.sentiment_intensity,
                            )
                            return (
                              <span
                                className={`text-[10px] font-bold px-1.5 py-0.5 rounded border ${msgSentVis.colorBadgeClass}`}
                                title={`Sentimento desta mensagem: ${msgSentVis.label} (Score: ${msg.sentiment_score ?? 0})`}
                              >
                                <span className="mr-0.5">{msgSentVis.emoji}</span>
                                {msgSentVis.label}
                              </span>
                            )
                          })()}
                          {msgSigs.length > 0 && (
                            <span className="text-[10px] bg-slate-100 text-slate-600 px-1.5 py-0.5 rounded font-mono">
                              {msgSigs.length} sinal(is)
                            </span>
                          )}
                          {isExpanded ? (
                            <ChevronUp className="h-4 w-4 text-slate-400" />
                          ) : (
                            <ChevronDown className="h-4 w-4 text-slate-400" />
                          )}
                        </div>
                      </div>

                      {/* Corpo expandido da mensagem */}
                      {isExpanded && (
                        <div className="p-3 text-slate-800 text-xs font-mono whitespace-pre-wrap leading-relaxed bg-white space-y-2">
                          <p className="font-sans font-semibold text-[11px] text-slate-600 mb-1">
                            Assunto original: {msg.subject || '(Sem assunto)'}
                          </p>
                          <div className="p-2 bg-slate-50 rounded border border-slate-100 text-slate-800">
                            {msg.body_snippet || '(Sem conteúdo disponível)'}
                          </div>

                          {/* Chips de sinais detectados na mensagem individual */}
                          {msgSigs.length > 0 && (
                            <div className="pt-1.5 flex flex-wrap gap-1 items-center font-sans">
                              <span className="text-[10px] text-slate-400 font-semibold mr-1">
                                Sinais:
                              </span>
                              {msgSigs.map((sig, sIdx) => (
                                <span
                                  key={sIdx}
                                  className={`inline-flex items-center gap-0.5 px-2 py-0.5 rounded-full text-[10px] font-semibold border ${
                                    sig.isPersistent
                                      ? 'bg-purple-50 text-purple-700 border-purple-200'
                                      : sig.isRed
                                        ? 'bg-rose-50 text-rose-700 border-rose-200'
                                        : 'bg-indigo-50 text-indigo-700 border-indigo-200'
                                  }`}
                                >
                                  {sig.isPersistent && (
                                    <Flame className="h-3 w-3 text-purple-600" />
                                  )}
                                  {sig.label}
                                </span>
                              ))}
                            </div>
                          )}
                        </div>
                      )}
                    </div>
                  )
                })}
              </div>
            )}
          </div>

          {/* Ações de Status e Ciclo de Vida da Conversa Inteira */}
          <div className="space-y-1.5 pt-2 border-t border-slate-200">
            <span className="text-[11px] font-bold text-slate-700 block">
              Atualizar Ciclo de Vida da Conversa
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
          <div className="flex items-center gap-2">
            {!isAssignedToMe ? (
              <Button
                size="sm"
                className="bg-indigo-600 hover:bg-indigo-700 text-white font-bold h-8 text-xs shadow-xs"
                onClick={async () => {
                  await onAssignToMe(email.id)
                  onOpenChange(false)
                }}
              >
                <User className="h-3.5 w-3.5 mr-1.5" />
                Assumir Toda a Conversa
              </Button>
            ) : (
              <span className="text-xs font-semibold text-emerald-700 flex items-center gap-1">
                <CheckCircle2 className="h-4 w-4" /> Atribuído a você
              </span>
            )}

            {linkedServiceRecordId && (
              <Button
                variant="outline"
                size="sm"
                className="h-8 text-xs font-semibold text-indigo-700 border-indigo-300 hover:bg-indigo-50"
                onClick={() => {
                  onOpenChange(false)
                  navigate(`/atendimentos?id=${linkedServiceRecordId}`)
                }}
              >
                <ExternalLink className="h-3.5 w-3.5 mr-1" />
                Ver Atendimento
              </Button>
            )}
          </div>
          <Button
            variant="outline"
            size="sm"
            className="h-8 text-xs"
            onClick={() => onOpenChange(false)}
          >
            Fechar
          </Button>
        </DialogFooter>
      </DialogContent>
    </Dialog>
  )
}
