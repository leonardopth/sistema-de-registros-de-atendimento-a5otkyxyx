import { useState, useEffect, useMemo } from 'react'
import { useNavigate } from 'react-router-dom'
import {
  Dialog,
  DialogContent,
  DialogHeader,
  DialogTitle,
  DialogFooter,
} from '@/components/ui/dialog'
import {
  AlertDialog,
  AlertDialogAction,
  AlertDialogCancel,
  AlertDialogContent,
  AlertDialogDescription,
  AlertDialogFooter,
  AlertDialogHeader,
  AlertDialogTitle,
} from '@/components/ui/alert-dialog'
import { Button } from '@/components/ui/button'
import { Badge } from '@/components/ui/badge'
import { Textarea } from '@/components/ui/textarea'
import { ControlTowerEmailRecord, ControlTowerStatus } from '@/types/control_tower'
import { formatGMT3DateTime } from '@/lib/timezone'
import { SlaCountdownBadge } from '@/components/SlaCountdownBadge'
import { getServiceGroupLabel } from '@/lib/service-groups'
import {
  getAnalyzedSignals,
  normalizeSignals,
  getSentimentVisual,
} from '@/lib/control-tower-signals'
import { getThreadMessages, generateControlTowerReplyDraft } from '@/services/control_tower'
import { createAuditLog } from '@/services/audit-log'
import { useToast } from '@/hooks/use-toast'
import pb from '@/lib/pocketbase/client'
import hubAiLogo from '@/assets/icone-hub-ai-neon-com-headset-e-chat-fe7bd.png'
import {
  Mail,
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
  Sparkles,
  Send,
  RotateCcw,
  Check,
  Copy,
  Info,
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
  const { toast } = useToast()
  const [threadMessages, setThreadMessages] = useState<ControlTowerEmailRecord[]>([])
  const [loadingThread, setLoadingThread] = useState(false)
  const [expandedMsgIds, setExpandedMsgIds] = useState<Record<string, boolean>>({})
  const [linkedServiceRecordId, setLinkedServiceRecordId] = useState<string | null>(null)
  const [checkingAttendance, setCheckingAttendance] = useState(false)

  // Estados da Seção Responder ao Cliente
  const [replyText, setReplyText] = useState('')
  const [generatingDraft, setGeneratingDraft] = useState(false)
  const [hasManualEdit, setHasManualEdit] = useState(false)
  const [lastDraftMetadata, setLastDraftMetadata] = useState<{
    sentiment?: string
    reservation?: string
    generatedAt?: string
  } | null>(null)
  const [confirmRegenerateOpen, setConfirmRegenerateOpen] = useState(false)
  const [copiedDraft, setCopiedDraft] = useState(false)
  const [openingOutlook, setOpeningOutlook] = useState(false)

  useEffect(() => {
    if (!email || !open) {
      setThreadMessages([])
      setLinkedServiceRecordId(null)
      setReplyText('')
      setHasManualEdit(false)
      setLastDraftMetadata(null)
      setCopiedDraft(false)
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

  // Destinatário do cliente (último remetente da thread que não seja a própria caixa)
  const clientRecipient = useMemo(() => {
    if (!email) return { email: '', name: '' }
    const inbox = (email.inbox_address || '').toLowerCase().trim()

    // Percorrer thread de trás para frente para pegar a última mensagem do cliente
    if (threadMessages.length > 0) {
      for (let i = threadMessages.length - 1; i >= 0; i--) {
        const msg = threadMessages[i]
        const sender = (msg.sender_email || '').toLowerCase().trim()
        if (sender && (!inbox || sender !== inbox)) {
          return {
            email: msg.sender_email,
            name: msg.sender_name || email.expand?.client?.name || '',
          }
        }
      }
    }

    return {
      email: email.sender_email,
      name: email.sender_name || email.expand?.client?.name || '',
    }
  }, [email, threadMessages])

  // Assunto formatado com "Re:" se não tiver
  const replySubject = useMemo(() => {
    if (!email) return ''
    const raw = (email.subject || '').trim()
    if (!raw) return 'Re: Atendimento RexturAdvance'
    if (/^\s*re\s*:/i.test(raw)) {
      return raw
    }
    return `Re: ${raw}`
  }, [email])

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

  // Gerar minuta de resposta com IA
  const handleGenerateDraft = async (force = false) => {
    if (!email) return
    if (!force && replyText.trim() && hasManualEdit) {
      setConfirmRegenerateOpen(true)
      return
    }

    setGeneratingDraft(true)
    try {
      const res = await generateControlTowerReplyDraft({
        emailId: email.id,
        threadId: email.thread_id,
      })

      if (res && res.draft) {
        setReplyText(res.draft)
        setHasManualEdit(false)
        setLastDraftMetadata({
          sentiment: res.sentiment_label,
          reservation: res.reservation_number,
          generatedAt: new Date().toISOString(),
        })
        toast({
          title: 'Minuta gerada com sucesso pelo HUB AI',
          description: `Tom adaptado ao sentimento ${res.sentiment_label || 'detectado'}. Você pode revisar e editar antes de abrir no Outlook.`,
        })
      } else {
        toast({
          variant: 'destructive',
          title: 'Não foi possível gerar a minuta',
          description: 'A IA não retornou conteúdo. Tente novamente em alguns instantes.',
        })
      }
    } catch (err: unknown) {
      console.error('Erro ao gerar minuta:', err)
      toast({
        variant: 'destructive',
        title: 'Erro ao gerar minuta com HUB AI',
        description: err instanceof Error ? err.message : 'Falha na comunicação com o assistente.',
      })
    } finally {
      setGeneratingDraft(false)
      setConfirmRegenerateOpen(false)
    }
  }

  // Copiar minuta para a área de transferência
  const handleCopyDraft = async () => {
    if (!replyText.trim()) return
    try {
      await navigator.clipboard.writeText(replyText)
      setCopiedDraft(true)
      setTimeout(() => setCopiedDraft(false), 2000)
      toast({
        title: 'Texto copiado!',
        description: 'A resposta foi copiada para a área de transferência.',
      })
    } catch (_) {
      toast({
        variant: 'destructive',
        title: 'Erro ao copiar texto',
      })
    }
  }

  // Abrir no Outlook via mailto: URL-encoded com quebras %0D%0A
  const handleOpenOutlook = async () => {
    if (!email) return
    const recipient = clientRecipient.email || email.sender_email
    if (!recipient) {
      toast({
        variant: 'destructive',
        title: 'Destinatário não encontrado',
        description: 'Não foi possível identificar o e-mail do cliente para resposta.',
      })
      return
    }

    const bodyText = replyText.trim()
    if (!bodyText) {
      toast({
        variant: 'destructive',
        title: 'Campo de resposta vazio',
        description:
          'Digite uma resposta ou clique em "Gerar Minuta (HUB AI)" antes de abrir no Outlook.',
      })
      return
    }

    setOpeningOutlook(true)
    try {
      // Registrar na timeline / auditoria da conversa
      const currentUser = pb.authStore.record
      await createAuditLog({
        user: currentUser?.id,
        action: 'control_tower_reply_opened_outlook',
        entity: 'control_tower_emails',
        entity_id: email.id,
        details: {
          recipient_email: recipient,
          recipient_name: clientRecipient.name || email.sender_name || '',
          subject: replySubject,
          inbox_address: email.inbox_address || '',
          service_group: email.service_group || '',
          thread_id: email.thread_id || email.id,
          draft_length: bodyText.length,
          draft_snippet: bodyText.substring(0, 180),
          consultant_name: currentUser?.name || currentUser?.email || 'Consultor',
          consultant_id: currentUser?.id,
          sentiment: email.sentiment_label,
          opened_at: new Date().toISOString(),
          note: 'Resposta redigida e aberta no Outlook pelo consultor',
        },
      })

      // Montar mailto com quebras de linha %0D%0A
      const normalizedBody = bodyText.replace(/\r\n/g, '\n').replace(/\r/g, '\n')
      const bodyWithCrLf = normalizedBody.replace(/\n/g, '\r\n')
      const encodedSubject = encodeURIComponent(replySubject)
      const encodedBody = encodeURIComponent(bodyWithCrLf)
      const mailtoUrl = `mailto:${encodeURIComponent(recipient)}?subject=${encodedSubject}&body=${encodedBody}`

      // Disparar abertura no cliente Outlook local do usuário
      window.location.href = mailtoUrl

      toast({
        title: 'Abrindo no Outlook...',
        description: `E-mail montado para ${recipient}. Lembre-se de clicar em "Enviar" no Outlook utilizando a caixa compartilhada do núcleo.`,
      })
    } catch (err) {
      console.error('Erro ao registrar resposta ou abrir Outlook:', err)
      toast({
        variant: 'destructive',
        title: 'Erro ao registrar abertura',
        description: 'Falha ao gravar evento de auditoria, mas tentando abrir o Outlook.',
      })
      // Tenta abrir mesmo se a auditoria falhar
      const normalizedBody = bodyText.replace(/\r\n/g, '\n').replace(/\r/g, '\n')
      const bodyWithCrLf = normalizedBody.replace(/\n/g, '\r\n')
      const mailtoUrl = `mailto:${encodeURIComponent(recipient)}?subject=${encodeURIComponent(replySubject)}&body=${encodeURIComponent(bodyWithCrLf)}`
      window.location.href = mailtoUrl
    } finally {
      setOpeningOutlook(false)
    }
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

          {/* SEÇÃO: RESPONDER AO CLIENTE (MINUTA IA + OUTLOOK) */}
          <div className="space-y-2.5 pt-3 border-t-2 border-indigo-100 bg-gradient-to-b from-indigo-50/40 via-white to-white -mx-6 px-6 py-3">
            <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-2">
              <div className="flex items-center gap-2">
                <div className="h-6 w-6 rounded-md bg-indigo-600 flex items-center justify-center text-white shrink-0 shadow-xs">
                  <Mail className="h-3.5 w-3.5" />
                </div>
                <div>
                  <h4 className="text-xs font-bold text-slate-900 flex items-center gap-1.5">
                    Responder ao Cliente
                    <Badge
                      variant="outline"
                      className="bg-indigo-50 text-indigo-700 border-indigo-200 text-[10px] py-0 px-1.5 font-semibold gap-1"
                    >
                      <img src={hubAiLogo} alt="HUB AI" className="h-3 w-3 object-contain" />
                      HUB AI
                    </Badge>
                  </h4>
                  <p className="text-[11px] text-slate-500">
                    Minuta redigida por inteligência artificial com envio final pelo Microsoft
                    Outlook
                  </p>
                </div>
              </div>

              {/* Botões de Ação do Topo da Minuta */}
              <div className="flex items-center gap-1.5 flex-wrap">
                <Button
                  type="button"
                  variant="outline"
                  size="sm"
                  onClick={() => handleGenerateDraft(false)}
                  disabled={generatingDraft}
                  className="h-7 text-xs font-semibold text-indigo-700 border-indigo-300 bg-white hover:bg-indigo-50 shadow-xs gap-1.5"
                >
                  {generatingDraft ? (
                    <>
                      <Loader2 className="h-3.5 w-3.5 animate-spin text-indigo-600" />
                      <span>Gerando minuta...</span>
                    </>
                  ) : (
                    <>
                      <Sparkles className="h-3.5 w-3.5 text-indigo-600" />
                      <span>Gerar Minuta (HUB AI)</span>
                    </>
                  )}
                </Button>

                {replyText.trim() && (
                  <Button
                    type="button"
                    variant="ghost"
                    size="sm"
                    onClick={handleCopyDraft}
                    className="h-7 text-xs text-slate-600 hover:text-slate-900"
                    title="Copiar texto da minuta"
                  >
                    {copiedDraft ? (
                      <Check className="h-3.5 w-3.5 text-emerald-600 mr-1" />
                    ) : (
                      <Copy className="h-3.5 w-3.5 mr-1" />
                    )}
                    {copiedDraft ? 'Copiado!' : 'Copiar'}
                  </Button>
                )}
              </div>
            </div>

            {/* Cabeçalho de contexto da resposta (Destinatário e Assunto) */}
            <div className="grid grid-cols-1 sm:grid-cols-2 gap-2 p-2.5 bg-slate-50 rounded-md border border-slate-200 text-[11px]">
              <div>
                <span className="text-slate-400 font-semibold block text-[10px] uppercase">
                  Destinatário (Cliente)
                </span>
                <p className="font-semibold text-slate-800 truncate" title={clientRecipient.email}>
                  {clientRecipient.name
                    ? `${clientRecipient.name} <${clientRecipient.email}>`
                    : clientRecipient.email || '—'}
                </p>
              </div>
              <div>
                <span className="text-slate-400 font-semibold block text-[10px] uppercase">
                  Assunto da Mensagem
                </span>
                <p className="font-semibold text-slate-800 truncate" title={replySubject}>
                  {replySubject || '—'}
                </p>
              </div>
            </div>

            {/* Metadados da Minuta Gerada */}
            {lastDraftMetadata && (
              <div className="flex items-center justify-between text-[11px] text-indigo-700 bg-indigo-50/70 px-2.5 py-1 rounded border border-indigo-100 flex-wrap gap-1">
                <span className="flex items-center gap-1 font-medium">
                  <Sparkles className="h-3 w-3" />
                  Minuta contextualizada com o histórico (
                  {email.sentiment_label ? `Sentimento: ${email.sentiment_label}` : 'IA'})
                  {lastDraftMetadata.reservation
                    ? ` • Reserva: ${lastDraftMetadata.reservation}`
                    : ''}
                </span>
                {hasManualEdit && (
                  <span className="text-amber-700 font-semibold text-[10px] flex items-center gap-1">
                    ✏️ Editado manualmente pelo consultor
                  </span>
                )}
              </div>
            )}

            {/* Textarea de Redação da Resposta */}
            <div className="space-y-1.5">
              <Textarea
                rows={6}
                value={replyText}
                onChange={(e) => {
                  setReplyText(e.target.value)
                  setHasManualEdit(true)
                }}
                placeholder="Clique em 'Gerar Minuta (HUB AI)' para redigir uma sugestão automática ou comece a digitar aqui a resposta ao cliente..."
                className="w-full text-xs font-sans p-3 border-slate-300 focus:border-indigo-400 focus:ring-1 focus:ring-indigo-400 leading-relaxed resize-y bg-white text-slate-800 placeholder:text-slate-400"
              />
              <div className="flex items-center justify-between text-[11px] text-slate-500">
                <span>{replyText.length} caracteres digitados</span>
                {replyText.trim() && (
                  <span className="text-slate-400">
                    Você pode revisar e alterar livremente qualquer trecho antes de abrir no
                    Outlook.
                  </span>
                )}
              </div>
            </div>

            {/* Barra de Ação de Envio via Outlook + Dica */}
            <div className="p-3 bg-blue-50/60 border border-blue-200 rounded-lg flex flex-col sm:flex-row items-start sm:items-center justify-between gap-2.5">
              <div className="flex items-start gap-2 text-[11px] text-blue-900 leading-tight">
                <Info className="h-4 w-4 text-blue-600 shrink-0 mt-0.5" />
                <div>
                  <p className="font-semibold text-blue-950">
                    Envio seguro realizado pelo Microsoft Outlook
                  </p>
                  <p className="text-blue-800 text-[10.5px]">
                    Ao clicar no botão ao lado, o seu cliente de e-mail abrirá com o destinatário,
                    assunto e corpo já preenchidos. O disparo final acontece pela{' '}
                    <strong>
                      caixa compartilhada do núcleo ({email.service_group || 'atendimento'})
                    </strong>
                    .
                  </p>
                </div>
              </div>

              <div className="flex items-center gap-2 shrink-0 w-full sm:w-auto justify-end">
                <Button
                  type="button"
                  onClick={handleOpenOutlook}
                  disabled={!replyText.trim() || openingOutlook}
                  className="bg-blue-600 hover:bg-blue-700 text-white font-bold h-8 text-xs px-3.5 shadow-sm gap-1.5 w-full sm:w-auto"
                >
                  {openingOutlook ? (
                    <>
                      <Loader2 className="h-3.5 w-3.5 animate-spin" />
                      <span>Preparando...</span>
                    </>
                  ) : (
                    <>
                      <Send className="h-3.5 w-3.5" />
                      <span>Abrir no Outlook</span>
                    </>
                  )}
                </Button>
              </div>
            </div>
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

      {/* Confirmação de Sobrescrita da Minuta Manual */}
      <AlertDialog open={confirmRegenerateOpen} onOpenChange={setConfirmRegenerateOpen}>
        <AlertDialogContent>
          <AlertDialogHeader>
            <AlertDialogTitle className="text-sm font-bold text-slate-900 flex items-center gap-2">
              <RotateCcw className="h-4 w-4 text-amber-600" />
              Substituir texto editado manualmente?
            </AlertDialogTitle>
            <AlertDialogDescription className="text-xs text-slate-600">
              Você já fez alterações manuais no campo de resposta. Se gerar uma nova minuta agora, o
              texto atual será substituído pela nova versão sugerida pelo HUB AI.
            </AlertDialogDescription>
          </AlertDialogHeader>
          <AlertDialogFooter>
            <AlertDialogCancel className="text-xs h-8">Cancelar</AlertDialogCancel>
            <AlertDialogAction
              onClick={() => handleGenerateDraft(true)}
              className="text-xs h-8 bg-indigo-600 hover:bg-indigo-700 text-white font-bold"
            >
              Sim, Gerar Nova Minuta
            </AlertDialogAction>
          </AlertDialogFooter>
        </AlertDialogContent>
      </AlertDialog>
    </Dialog>
  )
}
