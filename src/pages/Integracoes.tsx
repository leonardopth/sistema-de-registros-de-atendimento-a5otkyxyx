import { useState, useEffect } from 'react'
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from '@/components/ui/card'
import { Button } from '@/components/ui/button'
import { Badge } from '@/components/ui/badge'
import { Input } from '@/components/ui/input'
import { Label } from '@/components/ui/label'
import { Textarea } from '@/components/ui/textarea'
import {
  Table,
  TableBody,
  TableCell,
  TableHead,
  TableHeader,
  TableRow,
} from '@/components/ui/table'
import {
  Dialog,
  DialogContent,
  DialogDescription,
  DialogHeader,
  DialogTitle,
  DialogTrigger,
} from '@/components/ui/dialog'
import { useToast } from '@/hooks/use-toast'
import { useAuth } from '@/hooks/use-auth'
import {
  getOutlookStatus,
  syncOutlookEmails,
  processOutlookEmail,
  getEmailLogs,
  EmailLogRecord,
  OutlookStatusResponse,
} from '@/services/outlook-integration'
import { formatGMT3DateTime } from '@/lib/timezone'
import {
  Mail,
  RefreshCw,
  CheckCircle2,
  AlertCircle,
  Clock,
  Sparkles,
  ShieldCheck,
  Send,
  Loader2,
  ExternalLink,
  MessageSquare,
  Bot,
  SlidersHorizontal,
} from 'lucide-react'

export default function Integracoes() {
  const { user } = useAuth()
  const { toast } = useToast()

  const [statusData, setStatusData] = useState<OutlookStatusResponse | null>(null)
  const [logs, setLogs] = useState<EmailLogRecord[]>([])
  const [loading, setLoading] = useState(true)
  const [syncing, setSyncing] = useState(false)
  const [testModalOpen, setTestModalOpen] = useState(false)
  const [testingAi, setTestingAi] = useState(false)

  // Campos do formulário de teste/simulação
  const [testSenderEmail, setTestSenderEmail] = useState('cliente@exemplo.com.br')
  const [testSenderName, setTestSenderName] = useState('Carlos Silva')
  const [testSubject, setTestSubject] = useState('Dúvida sobre franquia de bagagem no voo 4102')
  const [testBody, setTestBody] = useState(
    'Olá consultor, gostaria de confirmar se o bilhete emitido ontem inclui franquia de bagagem despachada ou apenas mala de mão. Aguardo retorno urgente.',
  )
  const [lastAnalysis, setLastAnalysis] = useState<any>(null)

  const loadAll = async () => {
    setLoading(true)
    try {
      const [st, logsData] = await Promise.all([getOutlookStatus(), getEmailLogs()])
      setStatusData(st)
      setLogs(logsData)
    } catch (err) {
      console.error('Erro ao carregar status das integrações:', err)
      toast({
        variant: 'destructive',
        title: 'Erro ao carregar integrações',
        description: 'Não foi possível consultar os dados de integração.',
      })
    } finally {
      setLoading(false)
    }
  }

  useEffect(() => {
    loadAll()
  }, [])

  const handleSync = async () => {
    setSyncing(true)
    try {
      const res = await syncOutlookEmails()
      if (res.success) {
        toast({
          title: 'Sincronização concluída',
          description:
            res.processed_count > 0
              ? `${res.processed_count} novo(s) e-mail(s) de clientes processado(s) com IA!`
              : res.message || 'Nenhum novo e-mail pendente.',
        })
        loadAll()
      } else {
        toast({
          variant: 'destructive',
          title: 'Falha na sincronização',
          description: res.error || res.message,
        })
      }
    } catch (err: any) {
      toast({
        variant: 'destructive',
        title: 'Erro ao sincronizar',
        description: err?.message || 'Falha de comunicação com o backend.',
      })
    } finally {
      setSyncing(false)
    }
  }

  const handleRunTest = async (e: React.FormEvent) => {
    e.preventDefault()
    if (!testSenderEmail || !testBody) {
      toast({
        variant: 'destructive',
        title: 'Preencha os campos obrigatórios',
      })
      return
    }

    setTestingAi(true)
    try {
      const res = await processOutlookEmail({
        sender_email: testSenderEmail,
        sender_name: testSenderName,
        subject: testSubject,
        body: testBody,
        is_reply: true,
        consultant_user_id: user?.id,
      })

      if (res.success) {
        setLastAnalysis(res.analysis)
        toast({
          title: 'E-mail analisado com sucesso!',
          description: `Categoria: ${res.analysis.category} | Sentimento: ${res.analysis.sentiment} (Confiança: ${res.analysis.confidence_score}%)`,
        })
        loadAll()
      }
    } catch (err: any) {
      toast({
        variant: 'destructive',
        title: 'Erro ao processar com IA',
        description: err?.message || 'Falha na requisição.',
      })
    } finally {
      setTestingAi(false)
    }
  }

  const getSentimentBadge = (sentiment?: string) => {
    switch (sentiment) {
      case 'Positivo':
        return (
          <Badge className="bg-emerald-100 text-emerald-800 border-emerald-200">Positivo</Badge>
        )
      case 'Negativo':
        return <Badge className="bg-rose-100 text-rose-800 border-rose-200">Negativo</Badge>
      default:
        return <Badge className="bg-slate-100 text-slate-700 border-slate-200">Neutro</Badge>
    }
  }

  const getCategoryBadge = (category?: string) => {
    switch (category) {
      case 'Reclamação':
        return <Badge className="bg-red-50 text-red-700 border-red-200">Reclamação</Badge>
      case 'Solicitação':
        return <Badge className="bg-blue-50 text-blue-700 border-blue-200">Solicitação</Badge>
      case 'Confirmação':
        return <Badge className="bg-teal-50 text-teal-700 border-teal-200">Confirmação</Badge>
      case 'Dúvida':
        return <Badge className="bg-amber-50 text-amber-700 border-amber-200">Dúvida</Badge>
      case 'Cancelamento':
        return (
          <Badge className="bg-purple-50 text-purple-700 border-purple-200">Cancelamento</Badge>
        )
      default:
        return <Badge variant="outline">{category || 'Outros'}</Badge>
    }
  }

  return (
    <div className="space-y-6">
      <div className="flex flex-col gap-1 md:flex-row md:items-center md:justify-between">
        <div>
          <h2 className="text-2xl font-extrabold tracking-tight text-slate-900">
            Painel de Integrações
          </h2>
          <p className="text-xs text-slate-500">
            Gerencie integrações externas como Microsoft Outlook (Graph API) e inteligência
            artificial.
          </p>
        </div>
        <div className="flex items-center gap-2">
          <Button
            variant="outline"
            size="sm"
            onClick={loadAll}
            disabled={loading}
            className="text-xs h-8"
          >
            <RefreshCw className={`h-3.5 w-3.5 mr-1.5 ${loading ? 'animate-spin' : ''}`} />
            Atualizar
          </Button>
          <Button
            size="sm"
            onClick={handleSync}
            disabled={syncing}
            className="text-xs h-8 bg-indigo-600 hover:bg-indigo-700 text-white"
          >
            {syncing ? (
              <Loader2 className="h-3.5 w-3.5 mr-1.5 animate-spin" />
            ) : (
              <RefreshCw className="h-3.5 w-3.5 mr-1.5" />
            )}
            Sincronizar Outlook Agora
          </Button>
        </div>
      </div>

      {/* Card Microsoft Outlook */}
      <Card className="border-slate-200 shadow-subtle">
        <CardHeader className="pb-3 border-b border-slate-100">
          <div className="flex items-center justify-between">
            <div className="flex items-center gap-3">
              <div className="p-2.5 rounded-lg bg-sky-50 text-sky-600 border border-sky-100">
                <Mail className="h-6 w-6" />
              </div>
              <div>
                <CardTitle className="text-base font-bold flex items-center gap-2 text-slate-900">
                  Microsoft Outlook & Graph API
                  {statusData?.configured ? (
                    <Badge className="bg-emerald-500 text-white hover:bg-emerald-600 text-[10px] gap-1">
                      <CheckCircle2 className="h-3 w-3" /> Conectado
                    </Badge>
                  ) : (
                    <Badge
                      variant="outline"
                      className="border-amber-400 text-amber-700 bg-amber-50 text-[10px] gap-1"
                    >
                      <AlertCircle className="h-3 w-3" /> Modo Modular / Fallback Ativo
                    </Badge>
                  )}
                </CardTitle>
                <CardDescription className="text-xs mt-0.5">
                  Monitoramento contínuo de respostas de clientes via Microsoft Graph com análise e
                  categorização automática por IA.
                </CardDescription>
              </div>
            </div>

            <Dialog open={testModalOpen} onOpenChange={setTestModalOpen}>
              <DialogTrigger asChild>
                <Button variant="outline" size="sm" className="text-xs h-8 gap-1.5">
                  <Sparkles className="h-3.5 w-3.5 text-indigo-600" />
                  Testar / Simular Análise IA
                </Button>
              </DialogTrigger>
              <DialogContent className="sm:max-w-[560px]">
                <DialogHeader>
                  <DialogTitle className="flex items-center gap-2 text-base">
                    <Bot className="h-5 w-5 text-indigo-600" />
                    Simular Processamento de E-mail do Cliente
                  </DialogTitle>
                  <DialogDescription className="text-xs">
                    Envie o conteúdo de um e-mail de resposta para a IA analisar o assunto,
                    sentimento e categoria sugerida.
                  </DialogDescription>
                </DialogHeader>

                <form onSubmit={handleRunTest} className="space-y-3.5 py-2">
                  <div className="grid grid-cols-2 gap-3">
                    <div className="space-y-1">
                      <Label className="text-xs">Remetente (E-mail do Cliente) *</Label>
                      <Input
                        className="h-8 text-xs"
                        value={testSenderEmail}
                        onChange={(e) => setTestSenderEmail(e.target.value)}
                        placeholder="cliente@exemplo.com.br"
                        required
                      />
                    </div>
                    <div className="space-y-1">
                      <Label className="text-xs">Nome do Cliente</Label>
                      <Input
                        className="h-8 text-xs"
                        value={testSenderName}
                        onChange={(e) => setTestSenderName(e.target.value)}
                        placeholder="Nome do passageiro / agente"
                      />
                    </div>
                  </div>

                  <div className="space-y-1">
                    <Label className="text-xs">Assunto do E-mail</Label>
                    <Input
                      className="h-8 text-xs"
                      value={testSubject}
                      onChange={(e) => setTestSubject(e.target.value)}
                      placeholder="Assunto do e-mail recebido..."
                    />
                  </div>

                  <div className="space-y-1">
                    <Label className="text-xs">Corpo do E-mail (Texto) *</Label>
                    <Textarea
                      rows={4}
                      className="text-xs"
                      value={testBody}
                      onChange={(e) => setTestBody(e.target.value)}
                      placeholder="Cole aqui o corpo do e-mail recebido..."
                      required
                    />
                  </div>

                  {lastAnalysis && (
                    <div className="p-3 bg-indigo-50 border border-indigo-100 rounded-lg space-y-1.5 text-xs">
                      <div className="font-semibold text-indigo-950 flex items-center gap-1.5">
                        <Sparkles className="h-4 w-4 text-indigo-600" />
                        Resultado da Análise de IA:
                      </div>
                      <div className="grid grid-cols-2 gap-2 text-slate-700">
                        <div>
                          <strong>Assunto Principal:</strong> {lastAnalysis.main_topic}
                        </div>
                        <div>
                          <strong>Grau de Confiança:</strong> {lastAnalysis.confidence_score}%
                        </div>
                        <div>
                          <strong>Categoria:</strong> {lastAnalysis.category}
                        </div>
                        <div>
                          <strong>Sentimento:</strong> {lastAnalysis.sentiment}
                        </div>
                      </div>
                    </div>
                  )}

                  <div className="flex justify-end gap-2 pt-2 border-t">
                    <Button
                      type="button"
                      variant="outline"
                      size="sm"
                      onClick={() => setTestModalOpen(false)}
                      className="h-8 text-xs"
                    >
                      Fechar
                    </Button>
                    <Button
                      type="submit"
                      disabled={testingAi}
                      size="sm"
                      className="h-8 text-xs bg-indigo-600 hover:bg-indigo-700 text-white"
                    >
                      {testingAi ? (
                        <Loader2 className="h-3.5 w-3.5 mr-1.5 animate-spin" />
                      ) : (
                        <Send className="h-3.5 w-3.5 mr-1.5" />
                      )}
                      Processar com IA
                    </Button>
                  </div>
                </form>
              </DialogContent>
            </Dialog>
          </div>
        </CardHeader>
        <CardContent className="pt-4 space-y-4">
          <div className="grid grid-cols-1 md:grid-cols-3 gap-4">
            <div className="p-3.5 rounded-lg border border-slate-100 bg-slate-50 space-y-1">
              <span className="text-[11px] font-semibold text-slate-500 uppercase tracking-wider block">
                Status da Conexão
              </span>
              <div className="flex items-center gap-2">
                <span
                  className={`h-2.5 w-2.5 rounded-full ${statusData?.configured ? 'bg-emerald-500' : 'bg-amber-400'}`}
                />
                <span className="font-bold text-sm text-slate-800">
                  {statusData?.configured ? 'Graph API Operacional' : 'Modular / Desconectado'}
                </span>
              </div>
              <p className="text-[11px] text-slate-500">{statusData?.message}</p>
            </div>

            <div className="p-3.5 rounded-lg border border-slate-100 bg-slate-50 space-y-1">
              <span className="text-[11px] font-semibold text-slate-500 uppercase tracking-wider block">
                Variáveis e Segredos
              </span>
              <div className="space-y-1 text-xs">
                <div className="flex items-center justify-between">
                  <span className="text-slate-600 font-mono text-[11px]">MICROSOFT_CLIENT_ID</span>
                  {statusData?.has_client_id ? (
                    <Badge variant="outline" className="text-emerald-700 bg-emerald-50 text-[10px]">
                      Configurado
                    </Badge>
                  ) : (
                    <Badge variant="outline" className="text-slate-400 bg-slate-100 text-[10px]">
                      Ausente
                    </Badge>
                  )}
                </div>
                <div className="flex items-center justify-between">
                  <span className="text-slate-600 font-mono text-[11px]">
                    MICROSOFT_CLIENT_SECRET
                  </span>
                  {statusData?.has_client_secret ? (
                    <Badge variant="outline" className="text-emerald-700 bg-emerald-50 text-[10px]">
                      Configurado
                    </Badge>
                  ) : (
                    <Badge variant="outline" className="text-slate-400 bg-slate-100 text-[10px]">
                      Ausente
                    </Badge>
                  )}
                </div>
                <div className="flex items-center justify-between">
                  <span className="text-slate-600 font-mono text-[11px]">MICROSOFT_TENANT_ID</span>
                  {statusData?.has_tenant_id ? (
                    <Badge variant="outline" className="text-emerald-700 bg-emerald-50 text-[10px]">
                      Configurado
                    </Badge>
                  ) : (
                    <Badge variant="outline" className="text-slate-400 bg-slate-100 text-[10px]">
                      Ausente
                    </Badge>
                  )}
                </div>
              </div>
            </div>

            <div className="p-3.5 rounded-lg border border-slate-100 bg-slate-50 space-y-1">
              <span className="text-[11px] font-semibold text-slate-500 uppercase tracking-wider block">
                Estatísticas de Processamento
              </span>
              <div className="text-2xl font-black text-indigo-700">
                {statusData?.total_processed || logs.length}
              </div>
              <p className="text-[11px] text-slate-500">
                E-mails de clientes categorizados e vinculados no banco de dados.
              </p>
            </div>
          </div>
        </CardContent>
      </Card>

      {/* Histórico e Logs de Processamento de E-mails */}
      <Card className="border-slate-200 shadow-subtle overflow-hidden">
        <CardHeader className="bg-slate-50/70 border-b border-slate-100 py-3">
          <div className="flex items-center justify-between">
            <div className="flex items-center gap-2">
              <MessageSquare className="h-4 w-4 text-indigo-600" />
              <CardTitle className="text-sm font-bold text-slate-900">
                Logs de Processamento e Análise de E-mails ({logs.length})
              </CardTitle>
            </div>
            <span className="text-xs text-slate-400">Coleção: email_analysis_logs</span>
          </div>
        </CardHeader>
        <div className="overflow-x-auto">
          <Table>
            <TableHeader className="bg-slate-50">
              <TableRow>
                <TableHead className="text-xs font-bold">Data/Hora</TableHead>
                <TableHead className="text-xs font-bold">Remetente (Cliente)</TableHead>
                <TableHead className="text-xs font-bold">Assunto / Tópico</TableHead>
                <TableHead className="text-xs font-bold">Categoria</TableHead>
                <TableHead className="text-xs font-bold">Sentimento</TableHead>
                <TableHead className="text-xs font-bold">Confiança</TableHead>
                <TableHead className="text-xs font-bold">Atendimento Vinculado</TableHead>
              </TableRow>
            </TableHeader>
            <TableBody>
              {logs.map((l) => (
                <TableRow key={l.id} className="hover:bg-slate-50 text-xs">
                  <TableCell className="text-slate-500 whitespace-nowrap">
                    {l.received_at || l.created
                      ? formatGMT3DateTime(l.received_at || l.created)
                      : '—'}
                  </TableCell>
                  <TableCell>
                    <div className="font-semibold text-slate-900">
                      {l.sender_name || l.sender_email}
                    </div>
                    {l.sender_name && (
                      <div className="text-[11px] text-slate-400">{l.sender_email}</div>
                    )}
                  </TableCell>
                  <TableCell className="max-w-[280px]">
                    <div className="font-medium text-slate-800 truncate" title={l.subject}>
                      {l.subject || 'Sem assunto'}
                    </div>
                    {l.main_topic && l.main_topic !== l.subject && (
                      <div className="text-[11px] text-indigo-600 truncate" title={l.main_topic}>
                        IA: {l.main_topic}
                      </div>
                    )}
                  </TableCell>
                  <TableCell>{getCategoryBadge(l.category)}</TableCell>
                  <TableCell>{getSentimentBadge(l.sentiment)}</TableCell>
                  <TableCell className="font-semibold text-slate-700">
                    {l.confidence_score !== undefined ? `${l.confidence_score}%` : '—'}
                  </TableCell>
                  <TableCell>
                    {l.service_record ? (
                      <Badge
                        variant="outline"
                        className="bg-indigo-50 text-indigo-700 border-indigo-200 text-[10px] font-mono"
                      >
                        {l.service_record.substring(0, 8)}...
                      </Badge>
                    ) : (
                      <span className="text-slate-400 text-[11px]">—</span>
                    )}
                  </TableCell>
                </TableRow>
              ))}

              {logs.length === 0 && (
                <TableRow>
                  <TableCell colSpan={7} className="text-center py-10 text-slate-400 text-xs">
                    Nenhum e-mail registrado ainda. Clique em "Testar / Simular Análise IA" para
                    experimentar ou aguarde novas mensagens do Outlook.
                  </TableCell>
                </TableRow>
              )}
            </TableBody>
          </Table>
        </div>
      </Card>
    </div>
  )
}
