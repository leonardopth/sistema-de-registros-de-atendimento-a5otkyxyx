import React, { useState, useEffect } from 'react'
import {
  Dialog,
  DialogContent,
  DialogHeader,
  DialogTitle,
  DialogFooter,
  DialogDescription,
} from '@/components/ui/dialog'
import { Button } from '@/components/ui/button'
import { Badge } from '@/components/ui/badge'
import { Textarea } from '@/components/ui/textarea'
import { Input } from '@/components/ui/input'
import { Label } from '@/components/ui/label'
import { Separator } from '@/components/ui/separator'
import { Tabs, TabsList, TabsTrigger, TabsContent } from '@/components/ui/tabs'
import {
  CheckCircle2,
  XCircle,
  Clock,
  ArrowRight,
  User,
  Calendar,
  Building2,
  FileText,
  DollarSign,
  AlertTriangle,
  History,
  ShieldCheck,
} from 'lucide-react'
import { useToast } from '@/hooks/use-toast'
import type { WaiverRequestRecord, WaiverHistoryRecord, WaiverStatus } from '@/types/waiver'
import { updateWaiverStatus, getWaiverHistory } from '@/services/waivers'
import { findMatchingActiveBudget } from '@/services/waiver_budgets'
import type { WaiverBudgetRecord } from '@/types/waiver'
import { cn } from '@/lib/utils'

interface WaiverDetailModalProps {
  open: boolean
  onOpenChange: (open: boolean) => void
  request: WaiverRequestRecord | null
  canManage: boolean
  currentUserId?: string
  onStatusUpdated: () => void
}

export function WaiverDetailModal({
  open,
  onOpenChange,
  request,
  canManage,
  currentUserId,
  onStatusUpdated,
}: WaiverDetailModalProps) {
  const { toast } = useToast()
  const [history, setHistory] = useState<WaiverHistoryRecord[]>([])
  const [loadingHistory, setLoadingHistory] = useState(false)
  const [submitting, setSubmitting] = useState(false)

  // Decisão do gestor/analista
  const [selectedDecision, setSelectedDecision] = useState<WaiverStatus | null>(null)
  const [reviewNotes, setReviewNotes] = useState('')
  const [negotiatedAmount, setNegotiatedAmount] = useState('')
  const [matchingBudget, setMatchingBudget] = useState<WaiverBudgetRecord | null>(null)
  const [loadingBudget, setLoadingBudget] = useState(false)

  useEffect(() => {
    if (request && open) {
      setSelectedDecision(null)
      setReviewNotes(request.review_notes || '')
      setNegotiatedAmount(
        request.negotiated_amount !== undefined && request.negotiated_amount !== null
          ? String(request.negotiated_amount)
          : '',
      )
      loadHistory(request.id)
      loadMatchingBudget(request)
    }
  }, [request, open])

  const loadMatchingBudget = async (req: WaiverRequestRecord) => {
    setLoadingBudget(true)
    try {
      const budget = await findMatchingActiveBudget({
        airline_key: req.airline_key,
        unit: req.unit,
        currency: req.currency,
      })
      setMatchingBudget(budget)
    } catch (err) {
      console.error('Erro ao verificar verba:', err)
      setMatchingBudget(null)
    } finally {
      setLoadingBudget(false)
    }
  }

  const loadHistory = async (id: string) => {
    setLoadingHistory(true)
    try {
      const data = await getWaiverHistory(id)
      setHistory(data)
    } catch (err) {
      console.error(err)
    } finally {
      setLoadingHistory(false)
    }
  }

  if (!request) return null

  const handleApplyDecision = async (newStatus: WaiverStatus) => {
    if (!reviewNotes.trim() && (newStatus === 'Recusada' || newStatus === 'Negociada')) {
      toast({
        title: 'Observação obrigatória',
        description: `Por favor, forneça uma justificativa/resposta para marcar como ${newStatus}.`,
        variant: 'destructive',
      })
      return
    }

    let parsedNegAmount: number | undefined = undefined
    if (newStatus === 'Negociada') {
      parsedNegAmount = parseFloat(negotiatedAmount)
      if (isNaN(parsedNegAmount) || parsedNegAmount <= 0) {
        toast({
          title: 'Valor negociado inválido',
          description: 'Informe o valor final aprovado nesta negociação.',
          variant: 'destructive',
        })
        return
      }
    }

    setSubmitting(true)
    try {
      await updateWaiverStatus({
        requestId: request.id,
        newStatus,
        reviewNotes: reviewNotes.trim(),
        negotiatedAmount: parsedNegAmount,
        actionLabel:
          newStatus === 'Em análise'
            ? 'Retorno / Início de Análise'
            : newStatus === 'Standby'
              ? 'Colocado em Standby'
              : newStatus === 'Aprovada'
                ? 'Aprovação Concedida'
                : newStatus === 'Negociada'
                  ? 'Aprovação com Negociação'
                  : 'Solicitação Recusada',
      })

      toast({
        title: `Solicitação ${newStatus.toLowerCase()}`,
        description: 'O solicitante foi notificado e o histórico foi registrado.',
      })

      onStatusUpdated()
      onOpenChange(false)
    } catch (err) {
      console.error(err)
      toast({
        title: 'Erro ao atualizar solicitação',
        description: 'Não foi possível salvar a decisão.',
        variant: 'destructive',
      })
    } finally {
      setSubmitting(false)
    }
  }

  const getStatusBadge = (status: WaiverStatus) => {
    switch (status) {
      case 'Pendente':
        return (
          <Badge variant="outline" className="bg-amber-50 text-amber-700 border-amber-300">
            <Clock className="h-3 w-3 mr-1" /> Pendente
          </Badge>
        )
      case 'Em análise':
        return (
          <Badge variant="outline" className="bg-blue-50 text-blue-700 border-blue-300">
            <Clock className="h-3 w-3 mr-1" /> Em análise
          </Badge>
        )
      case 'Standby':
        return (
          <Badge
            variant="outline"
            className="bg-amber-100 text-amber-900 border-amber-400 font-semibold shadow-xs"
          >
            <Clock className="h-3 w-3 mr-1 text-amber-700" /> Standby
          </Badge>
        )
      case 'Aprovada':
        return (
          <Badge variant="outline" className="bg-emerald-50 text-emerald-700 border-emerald-300">
            <CheckCircle2 className="h-3 w-3 mr-1" /> Aprovada
          </Badge>
        )
      case 'Negociada':
        return (
          <Badge variant="outline" className="bg-purple-50 text-purple-700 border-purple-300">
            <ShieldCheck className="h-3 w-3 mr-1" /> Negociada
          </Badge>
        )
      case 'Recusada':
        return (
          <Badge variant="outline" className="bg-red-50 text-red-700 border-red-300">
            <XCircle className="h-3 w-3 mr-1" /> Recusada
          </Badge>
        )
    }
  }

  const requesterName = request.expand?.requester?.name || 'Consultor'
  const reviewerName = request.expand?.reviewed_by?.name || '—'

  return (
    <Dialog open={open} onOpenChange={onOpenChange}>
      <DialogContent className="max-w-3xl max-h-[90vh] overflow-y-auto">
        <DialogHeader>
          <div className="flex flex-wrap items-center justify-between gap-2 border-b border-slate-100 pb-3">
            <div>
              <div className="flex items-center gap-2">
                <span className="text-xs font-bold uppercase tracking-wider text-indigo-600">
                  {request.airline_name}
                </span>
                <span className="text-slate-300">•</span>
                <span className="text-xs text-slate-500 font-mono">ID: {request.id}</span>
              </div>
              <DialogTitle className="text-lg font-bold text-slate-900 mt-0.5">
                {request.request_type || 'Solicitação de Isenção / Facilidade'}
              </DialogTitle>
            </div>
            <div>{getStatusBadge(request.status)}</div>
          </div>
        </DialogHeader>

        {/* Resumo Rápido em Cards */}
        <div className="grid grid-cols-2 sm:grid-cols-4 gap-3 py-1">
          <div className="p-2.5 rounded-lg bg-slate-50 border border-slate-200">
            <span className="text-[10px] font-semibold uppercase text-slate-400 block">
              Unidade / Núcleo
            </span>
            <span className="text-xs font-bold text-slate-800">{request.unit}</span>
          </div>

          <div className="p-2.5 rounded-lg bg-slate-50 border border-slate-200">
            <span className="text-[10px] font-semibold uppercase text-slate-400 block">
              Localizador GDS
            </span>
            <span className="text-xs font-mono font-bold text-indigo-700">
              {request.gds_locator || '—'}
            </span>
          </div>

          <div className="p-2.5 rounded-lg bg-slate-50 border border-slate-200">
            <span className="text-[10px] font-semibold uppercase text-slate-400 block">
              Valor Solicitado
            </span>
            <span className="text-xs font-bold text-slate-900 font-mono">
              {request.amount !== undefined && request.amount !== null
                ? `${request.amount} ${request.currency || ''}`
                : '—'}
            </span>
          </div>

          <div className="p-2.5 rounded-lg bg-slate-50 border border-slate-200">
            <span className="text-[10px] font-semibold uppercase text-slate-400 block">
              Aprovador Indicado
            </span>
            <span
              className="text-xs font-semibold text-slate-800 truncate block"
              title={request.approver_name}
            >
              {request.approver_name}
            </span>
          </div>
        </div>

        {/* Tabs de Conteúdo: Dados do Formulário vs Histórico / Auditoria */}
        <Tabs defaultValue="form_data" className="w-full mt-2">
          <TabsList className="grid grid-cols-2 w-full">
            <TabsTrigger value="form_data" className="text-xs">
              <FileText className="h-3.5 w-3.5 mr-1.5" /> Detalhes do Formulário
            </TabsTrigger>
            <TabsTrigger value="history" className="text-xs">
              <History className="h-3.5 w-3.5 mr-1.5" /> Linha do Tempo ({history.length})
            </TabsTrigger>
          </TabsList>

          {/* Dados do Formulário */}
          <TabsContent value="form_data" className="space-y-4 pt-2">
            <div className="rounded-lg border border-slate-200 p-4 bg-white space-y-3">
              <h4 className="text-xs font-bold text-slate-700 uppercase tracking-wide">
                Informações Completas Enviadas
              </h4>

              <div className="grid grid-cols-1 sm:grid-cols-2 gap-3 text-xs">
                <div>
                  <span className="text-slate-400 block text-[11px]">Solicitante:</span>
                  <span className="font-semibold text-slate-800">{requesterName}</span>
                </div>
                <div>
                  <span className="text-slate-400 block text-[11px]">Data do Pedido:</span>
                  <span className="font-semibold text-slate-800 font-mono">
                    {new Date(request.created).toLocaleString('pt-BR')}
                  </span>
                </div>
                {request.airline_locator && (
                  <div>
                    <span className="text-slate-400 block text-[11px]">Localizador Cia:</span>
                    <span className="font-mono font-semibold text-slate-800">
                      {request.airline_locator}
                    </span>
                  </div>
                )}
                {request.pax_name && (
                  <div>
                    <span className="text-slate-400 block text-[11px]">Nome PAX:</span>
                    <span className="font-semibold text-slate-800">{request.pax_name}</span>
                  </div>
                )}
                {request.pax_count !== undefined && (
                  <div>
                    <span className="text-slate-400 block text-[11px]">Quantidade PAX:</span>
                    <span className="font-semibold text-slate-800">{request.pax_count}</span>
                  </div>
                )}
                {request.priority && (
                  <div>
                    <span className="text-slate-400 block text-[11px]">Prioridade:</span>
                    <span className="font-semibold text-slate-800">{request.priority}</span>
                  </div>
                )}
              </div>

              <Separator />

              {/* Demais campos do form_data dinâmico */}
              <div className="space-y-2.5">
                <span className="text-[11px] font-bold text-slate-500 uppercase">
                  Respostas Específicas da Companhia
                </span>
                <div className="grid grid-cols-1 gap-2">
                  {Object.entries(request.form_data || {}).map(([key, val]) => {
                    // Pula chaves já exibidas no cabeçalho
                    if (
                      ['unit', 'gds_locator', 'approver_name', 'pax_count', 'pax_name'].includes(
                        key,
                      )
                    ) {
                      return null
                    }
                    if (val === undefined || val === null || val === '') return null

                    const isCodeBlock =
                      typeof val === 'string' &&
                      (key.includes('print') || key.includes('instrucoes') || val.includes('\n'))

                    return (
                      <div
                        key={key}
                        className="p-2.5 rounded bg-slate-50 border border-slate-100 text-xs"
                      >
                        <span className="font-semibold text-slate-600 block text-[11px] uppercase tracking-tight">
                          {key.replace(/_/g, ' ')}:
                        </span>
                        {isCodeBlock ? (
                          <pre className="mt-1 p-2 bg-slate-900 text-emerald-400 rounded text-[11px] font-mono whitespace-pre-wrap max-h-36 overflow-y-auto">
                            {String(val)}
                          </pre>
                        ) : (
                          <span className="text-slate-800 font-medium">{String(val)}</span>
                        )}
                      </div>
                    )
                  })}
                </div>
              </div>

              {/* Resposta do Gestor se houver */}
              {(request.review_notes || request.negotiated_amount) && (
                <div className="mt-4 p-3 rounded-lg bg-indigo-50/70 border border-indigo-200 space-y-1">
                  <div className="flex items-center justify-between text-xs">
                    <span className="font-bold text-indigo-900">
                      Decisão & Observações do Analista
                    </span>
                    <span className="text-[11px] text-indigo-600">{reviewerName}</span>
                  </div>
                  {request.negotiated_amount && (
                    <p className="text-xs font-semibold text-indigo-900">
                      Valor Negociado: {request.negotiated_amount} {request.currency || ''}
                    </p>
                  )}
                  {request.review_notes && (
                    <p className="text-xs text-indigo-800 italic">"{request.review_notes}"</p>
                  )}
                </div>
              )}
            </div>
          </TabsContent>

          {/* Histórico e Auditoria */}
          <TabsContent value="history" className="pt-2">
            <div className="rounded-lg border border-slate-200 p-4 bg-white space-y-4">
              <h4 className="text-xs font-bold text-slate-700 uppercase tracking-wide">
                Trilha de Auditoria & Alterações de Status
              </h4>

              {loadingHistory ? (
                <div className="py-6 text-center text-xs text-slate-400">
                  Carregando histórico...
                </div>
              ) : history.length === 0 ? (
                <div className="py-6 text-center text-xs text-slate-400">
                  Nenhuma alteração registrada além da criação.
                </div>
              ) : (
                <div className="relative pl-6 space-y-4 before:absolute before:left-2.5 before:top-2 before:bottom-2 before:w-0.5 before:bg-slate-200">
                  {history.map((h) => (
                    <div key={h.id} className="relative group">
                      <div className="absolute -left-6 top-1.5 h-3 w-3 rounded-full border-2 border-white bg-indigo-600 shadow-sm" />
                      <div className="text-xs space-y-1 bg-slate-50 p-2.5 rounded border border-slate-200">
                        <div className="flex items-center justify-between">
                          <span className="font-bold text-slate-800">{h.action}</span>
                          <span className="text-[10px] text-slate-400 font-mono">
                            {new Date(h.created).toLocaleString('pt-BR')}
                          </span>
                        </div>
                        <div className="flex items-center gap-1.5 text-[11px] text-slate-500">
                          <User className="h-3 w-3" />
                          <span>{h.expand?.user?.name || 'Usuário'}</span>
                          {h.previous_status && h.new_status && (
                            <span className="text-indigo-600 font-medium">
                              ({h.previous_status} → {h.new_status})
                            </span>
                          )}
                        </div>
                        {h.notes && (
                          <p className="text-[11.5px] text-slate-700 bg-white p-1.5 rounded border border-slate-100">
                            {h.notes}
                          </p>
                        )}
                      </div>
                    </div>
                  ))}
                </div>
              )}
            </div>
          </TabsContent>
        </Tabs>

        {/* Informativo de Verba Comercial Disponível (para o Aprovador/Gestor) */}
        <div className="mt-3 p-3.5 rounded-xl border border-slate-200 bg-slate-50/80 space-y-2">
          <div className="flex items-center justify-between text-xs">
            <span className="font-bold text-slate-700 flex items-center gap-1.5">
              <DollarSign className="h-4 w-4 text-indigo-600" />
              Saldo da Verba Comercial ({request.airline_name})
            </span>
            {matchingBudget && (
              <Badge
                variant="outline"
                className={cn(
                  'text-[10px] font-bold',
                  matchingBudget.budget_amount - (matchingBudget.used_amount || 0) > 0
                    ? 'bg-emerald-50 text-emerald-700 border-emerald-300'
                    : 'bg-red-50 text-red-700 border-red-300',
                )}
              >
                {matchingBudget.budget_amount - (matchingBudget.used_amount || 0) > 0
                  ? 'Verba com Saldo'
                  : 'Verba Esgotada'}
              </Badge>
            )}
          </div>

          {loadingBudget ? (
            <p className="text-xs text-slate-400">Consultando saldo de verba...</p>
          ) : matchingBudget ? (
            (() => {
              const available = matchingBudget.budget_amount - (matchingBudget.used_amount || 0)
              const pctUsed = Math.min(
                100,
                Math.round(
                  ((matchingBudget.used_amount || 0) / (matchingBudget.budget_amount || 1)) * 100,
                ),
              )
              return (
                <div className="space-y-2">
                  <div className="grid grid-cols-3 gap-2 text-xs">
                    <div className="bg-white p-2 rounded border border-slate-200">
                      <span className="text-[10px] text-slate-400 block uppercase">
                        Orçado ({matchingBudget.period_label})
                      </span>
                      <span className="font-bold font-mono text-slate-800">
                        {matchingBudget.budget_amount.toLocaleString('pt-BR', {
                          minimumFractionDigits: 2,
                        })}{' '}
                        {matchingBudget.currency}
                      </span>
                    </div>
                    <div className="bg-white p-2 rounded border border-slate-200">
                      <span className="text-[10px] text-slate-400 block uppercase">
                        Já Utilizado
                      </span>
                      <span className="font-bold font-mono text-amber-700">
                        {(matchingBudget.used_amount || 0).toLocaleString('pt-BR', {
                          minimumFractionDigits: 2,
                        })}{' '}
                        {matchingBudget.currency} ({pctUsed}%)
                      </span>
                    </div>
                    <div className="bg-white p-2 rounded border border-slate-200">
                      <span className="text-[10px] text-slate-400 block uppercase">Disponível</span>
                      <span
                        className={cn(
                          'font-bold font-mono',
                          available > 0 ? 'text-emerald-700' : 'text-red-700',
                        )}
                      >
                        {available.toLocaleString('pt-BR', { minimumFractionDigits: 2 })}{' '}
                        {matchingBudget.currency}
                      </span>
                    </div>
                  </div>
                  <div className="h-1.5 w-full bg-slate-200 rounded-full overflow-hidden">
                    <div
                      className={cn(
                        'h-full transition-all',
                        pctUsed < 70
                          ? 'bg-emerald-500'
                          : pctUsed < 90
                            ? 'bg-amber-500'
                            : 'bg-red-500',
                      )}
                      style={{ width: `${pctUsed}%` }}
                    />
                  </div>
                </div>
              )
            })()
          ) : (
            <p className="text-xs text-slate-500 italic">
              Nenhuma verba ativa vinculada para {request.airline_name}. A aprovação será permitida
              e registrada como "sem verba vinculada".
            </p>
          )}
        </div>

        {/* Painel de Ação e Decisão (somente para Gestores/Supervisores/Líderes/Master) */}
        {canManage && (
          <div className="mt-4 p-4 rounded-xl border border-indigo-100 bg-gradient-to-r from-indigo-50/50 via-white to-indigo-50/30 space-y-3">
            <div className="flex items-center justify-between">
              <div className="flex items-center gap-2">
                <ShieldCheck className="h-4 w-4 text-indigo-600" />
                <span className="text-xs font-bold uppercase tracking-wider text-indigo-900">
                  Ações de Análise e Decisão
                </span>
              </div>
              <span className="text-[11px] text-slate-500">
                O solicitante receberá notificação no sino
              </span>
            </div>

            <div className="space-y-2">
              <Label htmlFor="review_notes" className="text-xs font-semibold text-slate-700">
                Resposta / Observações da Análise
              </Label>
              <Textarea
                id="review_notes"
                placeholder="Insira detalhes da aprovação, motivos da recusa ou condições negociadas..."
                value={reviewNotes}
                onChange={(e) => setReviewNotes(e.target.value)}
                rows={2}
                className="text-xs resize-none"
              />
            </div>

            {/* Se for negociar, exibe campo de valor negociado */}
            {selectedDecision === 'Negociada' && (
              <div className="p-3 bg-purple-50 rounded-lg border border-purple-200 space-y-1">
                <Label htmlFor="neg_amt" className="text-xs font-bold text-purple-900">
                  Valor Aprovado / Negociado ({request.currency || 'Moeda'}) *
                </Label>
                <Input
                  id="neg_amt"
                  type="number"
                  step="any"
                  placeholder="Ex: 100.00"
                  value={negotiatedAmount}
                  onChange={(e) => setNegotiatedAmount(e.target.value)}
                  className="text-xs font-mono"
                />
                <p className="text-[11px] text-purple-700">
                  Valor com desconto/isenção que foi efetivamente concedido após negociação.
                </p>
              </div>
            )}

            <div className="flex flex-wrap items-center justify-between gap-2 pt-1 border-t border-indigo-100">
              <div className="flex items-center gap-2">
                {request.status === 'Pendente' && (
                  <Button
                    type="button"
                    size="sm"
                    variant="outline"
                    className="text-xs border-blue-300 text-blue-700 hover:bg-blue-50"
                    disabled={submitting}
                    onClick={() => handleApplyDecision('Em análise')}
                  >
                    <Clock className="h-3.5 w-3.5 mr-1" /> Assumir Análise
                  </Button>
                )}

                {/* Opção para colocar em Standby quando em Pendente ou Em análise */}
                {(request.status === 'Pendente' || request.status === 'Em análise') && (
                  <Button
                    type="button"
                    size="sm"
                    variant="outline"
                    className="text-xs border-amber-300 text-amber-800 bg-amber-50/50 hover:bg-amber-100"
                    disabled={submitting}
                    onClick={() => handleApplyDecision('Standby')}
                  >
                    <Clock className="h-3.5 w-3.5 mr-1 text-amber-600" /> Colocar em Standby
                  </Button>
                )}

                {/* Se estiver em Standby, opção para voltar para Em análise */}
                {request.status === 'Standby' && (
                  <Button
                    type="button"
                    size="sm"
                    variant="outline"
                    className="text-xs border-blue-300 text-blue-700 bg-blue-50/50 hover:bg-blue-100"
                    disabled={submitting}
                    onClick={() => handleApplyDecision('Em análise')}
                  >
                    <Clock className="h-3.5 w-3.5 mr-1 text-blue-600" /> Retomar Análise
                  </Button>
                )}
              </div>

              <div className="flex items-center gap-2 ml-auto">
                {selectedDecision === 'Negociada' ? (
                  <Button
                    type="button"
                    size="sm"
                    className="bg-purple-600 hover:bg-purple-700 text-white text-xs"
                    disabled={submitting}
                    onClick={() => handleApplyDecision('Negociada')}
                  >
                    <ShieldCheck className="h-3.5 w-3.5 mr-1" /> Confirmar Negociação
                  </Button>
                ) : (
                  <Button
                    type="button"
                    size="sm"
                    variant="outline"
                    className="text-xs text-purple-700 border-purple-300 hover:bg-purple-50"
                    onClick={() => setSelectedDecision('Negociada')}
                  >
                    Negociar...
                  </Button>
                )}

                <Button
                  type="button"
                  size="sm"
                  variant="outline"
                  className="text-xs border-red-300 text-red-700 hover:bg-red-50"
                  disabled={submitting}
                  onClick={() => handleApplyDecision('Recusada')}
                >
                  <XCircle className="h-3.5 w-3.5 mr-1" /> Recusar
                </Button>

                <Button
                  type="button"
                  size="sm"
                  className="bg-emerald-600 hover:bg-emerald-700 text-white text-xs"
                  disabled={submitting}
                  onClick={() => handleApplyDecision('Aprovada')}
                >
                  <CheckCircle2 className="h-3.5 w-3.5 mr-1" /> Aprovar Integral
                </Button>
              </div>
            </div>
          </div>
        )}

        <DialogFooter className="mt-2">
          <Button variant="ghost" size="sm" onClick={() => onOpenChange(false)}>
            Fechar
          </Button>
        </DialogFooter>
      </DialogContent>
    </Dialog>
  )
}
