import { useState, useEffect, useMemo } from 'react'
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from '@/components/ui/card'
import { Button } from '@/components/ui/button'
import { Badge } from '@/components/ui/badge'
import { Input } from '@/components/ui/input'
import { Label } from '@/components/ui/label'
import { Textarea } from '@/components/ui/textarea'
import { Tabs, TabsContent, TabsList, TabsTrigger } from '@/components/ui/tabs'
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from '@/components/ui/select'
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
import {
  getTelephonyStatus,
  syncTelephonyCalls,
  processTelephonyRecording,
  getCallAnalysisLogs,
  CallAnalysisLogRecord,
  TelephonyStatusResponse,
  CallAnalysisResult,
} from '@/services/telephony-integration'
import { getClients } from '@/services/clients'
import { getServiceRecords } from '@/services/service_records'
import { ClientRecord, ServiceRecord } from '@/types/service_record'
import { formatGMT3DateTime } from '@/lib/timezone'
import {
  Mail,
  PhoneCall,
  RefreshCw,
  CheckCircle2,
  AlertCircle,
  Sparkles,
  Send,
  Loader2,
  MessageSquare,
  Bot,
  Headphones,
  Tag,
  Search,
  SlidersHorizontal,
  Mic,
  Server,
  Building2,
  UploadCloud,
} from 'lucide-react'

export default function Integracoes() {
  const { user } = useAuth()
  const { toast } = useToast()

  const [activeTab, setActiveTab] = useState<'telephony' | 'outlook'>('telephony')

  // Outlook States
  const [statusData, setStatusData] = useState<OutlookStatusResponse | null>(null)
  const [logs, setLogs] = useState<EmailLogRecord[]>([])
  const [loadingOutlook, setLoadingOutlook] = useState(true)
  const [syncingOutlook, setSyncingOutlook] = useState(false)
  const [testModalOpen, setTestModalOpen] = useState(false)
  const [testingAi, setTestingAi] = useState(false)
  const [testSenderEmail, setTestSenderEmail] = useState('cliente@exemplo.com.br')
  const [testSenderName, setTestSenderName] = useState('Carlos Silva')
  const [testSubject, setTestSubject] = useState('Dúvida sobre franquia de bagagem no voo 4102')
  const [testBody, setTestBody] = useState(
    'Olá consultor, gostaria de confirmar se o bilhete emitido ontem inclui franquia de bagagem despachada ou apenas mala de mão. Aguardo retorno urgente.',
  )
  const [lastAnalysis, setLastAnalysis] = useState<any>(null)

  // Telephony States
  const [telephonyStatus, setTelephonyStatus] = useState<TelephonyStatusResponse | null>(null)
  const [callRecords, setCallRecords] = useState<CallAnalysisLogRecord[]>([])
  const [clientsList, setClientsList] = useState<ClientRecord[]>([])
  const [serviceRecordsList, setServiceRecordsList] = useState<ServiceRecord[]>([])
  const [loadingTelephony, setLoadingTelephony] = useState(true)
  const [syncingTelephony, setSyncingTelephony] = useState(false)

  // Telephony Filter & Search States
  const [callSearch, setCallSearch] = useState('')
  const [selectedCategoryFilter, setSelectedCategoryFilter] = useState<string>('all')
  const [selectedSentimentFilter, setSelectedSentimentFilter] = useState<string>('all')

  // Telephony Test Modal States
  const [callModalOpen, setCallModalOpen] = useState(false)
  const [testingCallAi, setTestingCallAi] = useState(false)
  const [testProvider, setTestProvider] = useState<'twilio' | 'vonage' | 'internal' | 'simulation'>(
    'twilio',
  )
  const [testFromNumber, setTestFromNumber] = useState('+55 11 98765-4321')
  const [testToNumber, setTestToNumber] = useState('+55 11 3000-0000')
  const [testAudioDuration, setTestAudioDuration] = useState('145')
  const [testRecordingUrl, setTestRecordingUrl] = useState('https://api.twilio.com/cowbell.mp3')
  const [testSelectedClient, setTestSelectedClient] = useState<string>('')
  const [testSelectedServiceRecord, setTestSelectedServiceRecord] = useState<string>('')
  const [testTranscription, setTestTranscription] = useState(
    'Olá bom dia! Aqui é o Marcos da Agência Viagens Brasil. Estou com um passageiro no aeroporto com problema para embarque por causa da franquia de bagagem que não consta no bilhete eletrônico. Preciso de auxílio urgente para verificar a emissão.',
  )
  const [lastCallAnalysis, setLastCallAnalysis] = useState<CallAnalysisResult | null>(null)

  const loadOutlookData = async () => {
    setLoadingOutlook(true)
    try {
      const [st, logsData] = await Promise.all([getOutlookStatus(), getEmailLogs()])
      setStatusData(st)
      setLogs(logsData)
    } catch (err) {
      console.error('Erro ao carregar dados do Outlook:', err)
    } finally {
      setLoadingOutlook(false)
    }
  }

  const loadTelephonyData = async () => {
    setLoadingTelephony(true)
    try {
      const [telSt, calls, clients, srs] = await Promise.all([
        getTelephonyStatus(),
        getCallAnalysisLogs(),
        getClients().catch(() => []),
        getServiceRecords().catch(() => []),
      ])
      setTelephonyStatus(telSt)
      setCallRecords(calls)
      setClientsList(clients)
      setServiceRecordsList(srs)
    } catch (err) {
      console.error('Erro ao carregar dados de telefonia:', err)
    } finally {
      setLoadingTelephony(false)
    }
  }

  const loadAll = async () => {
    await Promise.all([loadOutlookData(), loadTelephonyData()])
  }

  useEffect(() => {
    loadAll()
  }, [])

  // Outlook Handlers
  const handleSyncOutlook = async () => {
    setSyncingOutlook(true)
    try {
      const res = await syncOutlookEmails()
      if (res.success) {
        toast({
          title: 'Sincronização Outlook concluída',
          description:
            res.processed_count > 0
              ? `${res.processed_count} novo(s) e-mail(s) processado(s) com IA!`
              : res.message || 'Nenhum novo e-mail pendente.',
        })
        loadOutlookData()
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
        title: 'Erro ao sincronizar Outlook',
        description: err?.message || 'Falha de comunicação.',
      })
    } finally {
      setSyncingOutlook(false)
    }
  }

  const handleRunOutlookTest = async (e: React.FormEvent) => {
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
        loadOutlookData()
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

  // Telephony Handlers
  const handleSyncTelephony = async () => {
    setSyncingTelephony(true)
    try {
      const res = await syncTelephonyCalls()
      if (res.success) {
        toast({
          title: 'Sincronização de Telefonia concluída',
          description:
            res.processed_count > 0
              ? `${res.processed_count} gravação(ões) verificada(s).`
              : res.message || 'Nenhuma nova gravação pendente.',
        })
        loadTelephonyData()
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
        title: 'Erro ao sincronizar telefonia',
        description: err?.message || 'Falha de comunicação.',
      })
    } finally {
      setSyncingTelephony(false)
    }
  }

  const handleRunCallTest = async (e: React.FormEvent) => {
    e.preventDefault()
    setTestingCallAi(true)
    try {
      const res = await processTelephonyRecording({
        provider: testProvider,
        from_number: testFromNumber,
        to_number: testToNumber,
        duration: Number(testAudioDuration) || 120,
        recording_url: testRecordingUrl,
        transcription: testTranscription,
        client_id: testSelectedClient || undefined,
        service_record_id: testSelectedServiceRecord || undefined,
        agent_user_id: user?.id,
      })

      if (res.success) {
        setLastCallAnalysis(res.analysis)
        toast({
          title: 'Gravação processada com sucesso!',
          description: `Categoria: ${res.analysis.category} | Sentimento: ${res.analysis.sentiment} | Score: ${res.analysis.quality_score}/100`,
        })
        loadTelephonyData()
      }
    } catch (err: any) {
      toast({
        variant: 'destructive',
        title: 'Erro ao processar chamada',
        description: err?.message || 'Falha na requisição.',
      })
    } finally {
      setTestingCallAi(false)
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
      case 'Venda':
        return <Badge className="bg-blue-50 text-blue-700 border-blue-200">{category}</Badge>
      case 'Confirmação':
      case 'Suporte':
        return <Badge className="bg-teal-50 text-teal-700 border-teal-200">{category}</Badge>
      case 'Dúvida':
      case 'Informação':
        return <Badge className="bg-amber-50 text-amber-700 border-amber-200">{category}</Badge>
      case 'Cancelamento':
        return (
          <Badge className="bg-purple-50 text-purple-700 border-purple-200">Cancelamento</Badge>
        )
      case 'Bagagem':
      case 'Assento':
        return <Badge className="bg-indigo-50 text-indigo-700 border-indigo-200">{category}</Badge>
      default:
        return <Badge variant="outline">{category || 'Outros'}</Badge>
    }
  }

  // Filtragem dos logs de chamadas
  const filteredCallRecords = useMemo(() => {
    return callRecords.filter((c) => {
      const matchesSearch =
        !callSearch ||
        (c.from_number || '').toLowerCase().includes(callSearch.toLowerCase()) ||
        (c.to_number || '').toLowerCase().includes(callSearch.toLowerCase()) ||
        (c.transcription || '').toLowerCase().includes(callSearch.toLowerCase()) ||
        (c.summary || '').toLowerCase().includes(callSearch.toLowerCase()) ||
        (Array.isArray(c.keywords) &&
          c.keywords.some((k) => k.toLowerCase().includes(callSearch.toLowerCase())))

      const matchesCategory =
        selectedCategoryFilter === 'all' ||
        (c.category || '').toLowerCase() === selectedCategoryFilter.toLowerCase()

      const matchesSentiment =
        selectedSentimentFilter === 'all' ||
        (c.sentiment || '').toLowerCase() === selectedSentimentFilter.toLowerCase()

      return matchesSearch && matchesCategory && matchesSentiment
    })
  }, [callRecords, callSearch, selectedCategoryFilter, selectedSentimentFilter])

  // Estatísticas de processamento de telefonia
  const telephonyStats = useMemo(() => {
    const total = callRecords.length
    if (total === 0) return { total: 0, avgQuality: 0, positiveCount: 0, topCategory: '—' }

    const qualitySum = callRecords.reduce((acc, c) => acc + (c.quality_score || 0), 0)
    const avgQuality = Math.round(qualitySum / total)

    const positiveCount = callRecords.filter((c) => c.sentiment === 'Positivo').length

    const catCounts: Record<string, number> = {}
    callRecords.forEach((c) => {
      if (c.category) catCounts[c.category] = (catCounts[c.category] || 0) + 1
    })

    let topCategory = '—'
    let maxCat = 0
    Object.entries(catCounts).forEach(([cat, cnt]) => {
      if (cnt > maxCat) {
        maxCat = cnt
        topCategory = cat
      }
    })

    return { total, avgQuality, positiveCount, topCategory }
  }, [callRecords])

  const isAnyLoading = loadingOutlook || loadingTelephony

  return (
    <div className="space-y-6">
      <div className="flex flex-col gap-1 md:flex-row md:items-center md:justify-between">
        <div>
          <h2 className="text-2xl font-extrabold tracking-tight text-slate-900">
            Painel de Integrações
          </h2>
          <p className="text-xs text-slate-500">
            Gerencie conexões modulares de Telefonia (Twilio, Vonage ou API Interna), e-mails
            corporativos (Microsoft Outlook Graph API) e inteligência artificial para transcrição e
            análise.
          </p>
        </div>
        <div className="flex items-center gap-2">
          <Button
            variant="outline"
            size="sm"
            onClick={loadAll}
            disabled={isAnyLoading}
            className="text-xs h-8"
          >
            <RefreshCw className={`h-3.5 w-3.5 mr-1.5 ${isAnyLoading ? 'animate-spin' : ''}`} />
            Atualizar Tudo
          </Button>
        </div>
      </div>

      <Tabs value={activeTab} onValueChange={(val: any) => setActiveTab(val)}>
        <TabsList className="grid w-full grid-cols-2 max-w-md">
          <TabsTrigger value="telephony" className="text-xs flex items-center gap-1.5">
            <PhoneCall className="h-3.5 w-3.5 text-indigo-600" />
            Telefonia & Gravações (Twilio / Modular)
          </TabsTrigger>
          <TabsTrigger value="outlook" className="text-xs flex items-center gap-1.5">
            <Mail className="h-3.5 w-3.5 text-sky-600" />
            Microsoft Outlook (Graph API)
          </TabsTrigger>
        </TabsList>

        {/* ================= ABA TELEFONIA MODULAR ================= */}
        <TabsContent value="telephony" className="space-y-6 mt-4">
          <Card className="border-slate-200 shadow-subtle">
            <CardHeader className="pb-3 border-b border-slate-100">
              <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-3">
                <div className="flex items-center gap-3">
                  <div className="p-2.5 rounded-lg bg-indigo-50 text-indigo-600 border border-indigo-100">
                    <PhoneCall className="h-6 w-6" />
                  </div>
                  <div>
                    <CardTitle className="text-base font-bold flex items-center gap-2 text-slate-900">
                      Telefonia, Gravações & IA
                      {telephonyStatus?.configured ? (
                        <Badge className="bg-emerald-500 text-white hover:bg-emerald-600 text-[10px] gap-1">
                          <CheckCircle2 className="h-3 w-3" /> Provedor Conectado (
                          {telephonyStatus.provider_label || 'Twilio'})
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
                      Estrutura modular com suporte a Twilio, Vonage ou API Interna. Captura
                      gravações de chamadas, transcreve áudio (Speech-to-Text), analisa sentimento,
                      categoria, palavras-chave e avaliação de qualidade com IA.
                    </CardDescription>
                  </div>
                </div>

                <div className="flex items-center gap-2">
                  <Button
                    variant="outline"
                    size="sm"
                    onClick={handleSyncTelephony}
                    disabled={syncingTelephony}
                    className="text-xs h-8"
                  >
                    {syncingTelephony ? (
                      <Loader2 className="h-3.5 w-3.5 mr-1.5 animate-spin" />
                    ) : (
                      <RefreshCw className="h-3.5 w-3.5 mr-1.5" />
                    )}
                    Sincronização Manual
                  </Button>

                  <Dialog open={callModalOpen} onOpenChange={setCallModalOpen}>
                    <DialogTrigger asChild>
                      <Button
                        size="sm"
                        className="text-xs h-8 gap-1.5 bg-indigo-600 hover:bg-indigo-700 text-white"
                      >
                        <Sparkles className="h-3.5 w-3.5" />
                        Simular Gravação & IA
                      </Button>
                    </DialogTrigger>
                    <DialogContent className="sm:max-w-[620px] max-h-[90vh] overflow-y-auto">
                      <DialogHeader>
                        <DialogTitle className="flex items-center gap-2 text-base">
                          <Headphones className="h-5 w-5 text-indigo-600" />
                          Simulação e Upload de Gravação de Chamada
                        </DialogTitle>
                        <DialogDescription className="text-xs">
                          Envie um registro de áudio/gravação de chamada para o endpoint modular
                          transcrever (Speech-to-Text) e analisar com IA (resumo, sentimento,
                          categoria e scoring).
                        </DialogDescription>
                      </DialogHeader>

                      <form onSubmit={handleRunCallTest} className="space-y-3.5 py-2">
                        <div className="grid grid-cols-2 gap-3">
                          <div className="space-y-1">
                            <Label className="text-xs">Provedor de Telefonia</Label>
                            <Select
                              value={testProvider}
                              onValueChange={(val: any) => setTestProvider(val)}
                            >
                              <SelectTrigger className="h-8 text-xs">
                                <SelectValue placeholder="Selecione o provedor" />
                              </SelectTrigger>
                              <SelectContent>
                                <SelectItem value="twilio">Twilio Voice</SelectItem>
                                <SelectItem value="vonage">Vonage Voice API</SelectItem>
                                <SelectItem value="internal">API Telefonia Interna</SelectItem>
                                <SelectItem value="simulation">Simulação / Webhook</SelectItem>
                              </SelectContent>
                            </Select>
                          </div>
                          <div className="space-y-1">
                            <Label className="text-xs">Telefone de Origem (Cliente) *</Label>
                            <Input
                              className="h-8 text-xs"
                              value={testFromNumber}
                              onChange={(e) => setTestFromNumber(e.target.value)}
                              placeholder="+55 11 98765-4321"
                              required
                            />
                          </div>
                        </div>

                        <div className="grid grid-cols-2 gap-3">
                          <div className="space-y-1">
                            <Label className="text-xs">Telefone de Destino</Label>
                            <Input
                              className="h-8 text-xs"
                              value={testToNumber}
                              onChange={(e) => setTestToNumber(e.target.value)}
                              placeholder="+55 11 3000-0000"
                            />
                          </div>
                          <div className="space-y-1">
                            <Label className="text-xs">Duração do Áudio (segundos)</Label>
                            <Input
                              type="number"
                              className="h-8 text-xs"
                              value={testAudioDuration}
                              onChange={(e) => setTestAudioDuration(e.target.value)}
                              placeholder="120"
                            />
                          </div>
                        </div>

                        <div className="grid grid-cols-2 gap-3">
                          <div className="space-y-1">
                            <Label className="text-xs">Vincular a Cliente (Opcional)</Label>
                            <Select
                              value={testSelectedClient}
                              onValueChange={(val) =>
                                setTestSelectedClient(val === 'none' ? '' : val)
                              }
                            >
                              <SelectTrigger className="h-8 text-xs">
                                <SelectValue placeholder="Identificação automática ou escolha" />
                              </SelectTrigger>
                              <SelectContent>
                                <SelectItem value="none">
                                  Identificar automaticamente pelo telefone
                                </SelectItem>
                                {clientsList.map((c) => (
                                  <SelectItem key={c.id} value={c.id}>
                                    {c.name} {c.company ? `(${c.company})` : ''}
                                  </SelectItem>
                                ))}
                              </SelectContent>
                            </Select>
                          </div>
                          <div className="space-y-1">
                            <Label className="text-xs">Vincular a Atendimento (Opcional)</Label>
                            <Select
                              value={testSelectedServiceRecord}
                              onValueChange={(val) =>
                                setTestSelectedServiceRecord(val === 'none' ? '' : val)
                              }
                            >
                              <SelectTrigger className="h-8 text-xs">
                                <SelectValue placeholder="Vínculo automático ou escolha" />
                              </SelectTrigger>
                              <SelectContent>
                                <SelectItem value="none">
                                  Vincular ao atendimento aberto mais recente
                                </SelectItem>
                                {serviceRecordsList.slice(0, 10).map((sr) => (
                                  <SelectItem key={sr.id} value={sr.id}>
                                    #{sr.id.substring(0, 6)} - {sr.client_name || 'Sem cliente'} (
                                    {sr.status})
                                  </SelectItem>
                                ))}
                              </SelectContent>
                            </Select>
                          </div>
                        </div>

                        <div className="space-y-1">
                          <Label className="text-xs">URL da Gravação de Áudio (MP3/WAV)</Label>
                          <Input
                            className="h-8 text-xs font-mono"
                            value={testRecordingUrl}
                            onChange={(e) => setTestRecordingUrl(e.target.value)}
                            placeholder="https://api.twilio.com/cowbell.mp3"
                          />
                        </div>

                        <div className="space-y-1">
                          <Label className="text-xs">
                            Áudio / Transcrição da Chamada (Speech-to-Text) *
                          </Label>
                          <Textarea
                            rows={3}
                            className="text-xs"
                            value={testTranscription}
                            onChange={(e) => setTestTranscription(e.target.value)}
                            placeholder="Texto transcrito do áudio da chamada..."
                            required
                          />
                        </div>

                        {lastCallAnalysis && (
                          <div className="p-3 bg-indigo-50 border border-indigo-100 rounded-lg space-y-1.5 text-xs">
                            <div className="font-semibold text-indigo-950 flex items-center gap-1.5">
                              <Sparkles className="h-4 w-4 text-indigo-600" />
                              Resultado da Análise de Chamada com IA:
                            </div>
                            <div className="grid grid-cols-2 gap-2 text-slate-700">
                              <div className="col-span-2">
                                <strong>Resumo:</strong> {lastCallAnalysis.summary}
                              </div>
                              <div>
                                <strong>Categoria:</strong> {lastCallAnalysis.category}
                              </div>
                              <div>
                                <strong>Sentimento:</strong> {lastCallAnalysis.sentiment}
                              </div>
                              <div>
                                <strong>Avaliação de Qualidade:</strong>{' '}
                                <span className="font-bold text-emerald-700">
                                  {lastCallAnalysis.quality_score}/100
                                </span>
                              </div>
                              <div>
                                <strong>Palavras-chave:</strong>{' '}
                                {lastCallAnalysis.keywords?.join(', ')}
                              </div>
                            </div>
                          </div>
                        )}

                        <div className="flex justify-end gap-2 pt-2 border-t">
                          <Button
                            type="button"
                            variant="outline"
                            size="sm"
                            onClick={() => setCallModalOpen(false)}
                            className="h-8 text-xs"
                          >
                            Fechar
                          </Button>
                          <Button
                            type="submit"
                            disabled={testingCallAi}
                            size="sm"
                            className="h-8 text-xs bg-indigo-600 hover:bg-indigo-700 text-white"
                          >
                            {testingCallAi ? (
                              <Loader2 className="h-3.5 w-3.5 mr-1.5 animate-spin" />
                            ) : (
                              <UploadCloud className="h-3.5 w-3.5 mr-1.5" />
                            )}
                            Processar Gravação & IA
                          </Button>
                        </div>
                      </form>
                    </DialogContent>
                  </Dialog>
                </div>
              </div>
            </CardHeader>
            <CardContent className="pt-4 space-y-4">
              <div className="grid grid-cols-1 md:grid-cols-4 gap-4">
                <div className="p-3.5 rounded-lg border border-slate-100 bg-slate-50 space-y-1">
                  <span className="text-[11px] font-semibold text-slate-500 uppercase tracking-wider block">
                    Status da Conexão
                  </span>
                  <div className="flex items-center gap-2">
                    <span
                      className={`h-2.5 w-2.5 rounded-full ${telephonyStatus?.configured ? 'bg-emerald-500' : 'bg-amber-400'}`}
                    />
                    <span className="font-bold text-sm text-slate-800">
                      {telephonyStatus?.configured
                        ? `${telephonyStatus.provider_label || 'Telefonia'} Operacional`
                        : 'Modo Modular / Fallback'}
                    </span>
                  </div>
                  <p className="text-[11px] text-slate-500">{telephonyStatus?.message}</p>
                </div>

                <div className="p-3.5 rounded-lg border border-slate-100 bg-slate-50 space-y-1">
                  <span className="text-[11px] font-semibold text-slate-500 uppercase tracking-wider block">
                    Provedores Suportados
                  </span>
                  <div className="space-y-1 text-xs">
                    <div className="flex items-center justify-between">
                      <span className="text-slate-600 font-medium">Twilio</span>
                      {telephonyStatus?.has_account_sid ? (
                        <Badge
                          variant="outline"
                          className="text-emerald-700 bg-emerald-50 text-[10px]"
                        >
                          Conectado
                        </Badge>
                      ) : (
                        <Badge
                          variant="outline"
                          className="text-slate-400 bg-slate-100 text-[10px]"
                        >
                          Modular
                        </Badge>
                      )}
                    </div>
                    <div className="flex items-center justify-between">
                      <span className="text-slate-600 font-medium">Vonage (Nexmo)</span>
                      {telephonyStatus?.providers?.vonage?.configured ? (
                        <Badge
                          variant="outline"
                          className="text-emerald-700 bg-emerald-50 text-[10px]"
                        >
                          Conectado
                        </Badge>
                      ) : (
                        <Badge
                          variant="outline"
                          className="text-slate-400 bg-slate-100 text-[10px]"
                        >
                          Modular
                        </Badge>
                      )}
                    </div>
                    <div className="flex items-center justify-between">
                      <span className="text-slate-600 font-medium">API Interna / Webhook</span>
                      <Badge variant="outline" className="text-indigo-700 bg-indigo-50 text-[10px]">
                        Ativo
                      </Badge>
                    </div>
                  </div>
                </div>

                <div className="p-3.5 rounded-lg border border-slate-100 bg-slate-50 space-y-1">
                  <span className="text-[11px] font-semibold text-slate-500 uppercase tracking-wider block">
                    Total Processado
                  </span>
                  <div className="text-2xl font-black text-indigo-700">
                    {telephonyStatus?.total_processed || telephonyStats.total}
                  </div>
                  <p className="text-[11px] text-slate-500">
                    Gravações transcritas e analisadas por IA na coleção{' '}
                    <code className="font-mono text-[10px] bg-slate-200/60 px-1 py-0.5 rounded">
                      call_analysis_logs
                    </code>
                    .
                  </p>
                </div>

                <div className="p-3.5 rounded-lg border border-slate-100 bg-slate-50 space-y-1">
                  <span className="text-[11px] font-semibold text-slate-500 uppercase tracking-wider block">
                    Média de Qualidade IA
                  </span>
                  <div className="text-2xl font-black text-emerald-600">
                    {telephonyStats.avgQuality > 0 ? `${telephonyStats.avgQuality}/100` : '—'}
                  </div>
                  <p className="text-[11px] text-slate-500">
                    Categoria principal: <strong>{telephonyStats.topCategory}</strong> (
                    {telephonyStats.positiveCount} sentimento positivo).
                  </p>
                </div>
              </div>
            </CardContent>
          </Card>

          {/* Histórico e Logs de Chamadas com Busca e Filtros */}
          <Card className="border-slate-200 shadow-subtle overflow-hidden">
            <CardHeader className="bg-slate-50/70 border-b border-slate-100 py-3">
              <div className="flex flex-col md:flex-row md:items-center justify-between gap-3">
                <div className="flex items-center gap-2">
                  <Headphones className="h-4 w-4 text-indigo-600" />
                  <CardTitle className="text-sm font-bold text-slate-900">
                    Histórico de Logs de Análise de Telefonia ({filteredCallRecords.length})
                  </CardTitle>
                </div>

                {/* Filtros e Busca */}
                <div className="flex flex-wrap items-center gap-2">
                  <div className="relative w-48 sm:w-60">
                    <Search className="absolute left-2.5 top-2.5 h-3.5 w-3.5 text-slate-400" />
                    <Input
                      placeholder="Buscar por telefone, transcrição, resumo..."
                      value={callSearch}
                      onChange={(e) => setCallSearch(e.target.value)}
                      className="h-8 pl-8 text-xs"
                    />
                  </div>

                  <Select
                    value={selectedCategoryFilter}
                    onValueChange={(val) => setSelectedCategoryFilter(val)}
                  >
                    <SelectTrigger className="h-8 w-32 text-xs">
                      <SelectValue placeholder="Categoria" />
                    </SelectTrigger>
                    <SelectContent>
                      <SelectItem value="all">Todas Categorias</SelectItem>
                      <SelectItem value="Suporte">Suporte</SelectItem>
                      <SelectItem value="Venda">Venda</SelectItem>
                      <SelectItem value="Reclamação">Reclamação</SelectItem>
                      <SelectItem value="Informação">Informação</SelectItem>
                      <SelectItem value="Bagagem">Bagagem</SelectItem>
                      <SelectItem value="Cancelamento">Cancelamento</SelectItem>
                      <SelectItem value="Assento">Assento</SelectItem>
                    </SelectContent>
                  </Select>

                  <Select
                    value={selectedSentimentFilter}
                    onValueChange={(val) => setSelectedSentimentFilter(val)}
                  >
                    <SelectTrigger className="h-8 w-32 text-xs">
                      <SelectValue placeholder="Sentimento" />
                    </SelectTrigger>
                    <SelectContent>
                      <SelectItem value="all">Todos Sentimentos</SelectItem>
                      <SelectItem value="Positivo">Positivo</SelectItem>
                      <SelectItem value="Neutro">Neutro</SelectItem>
                      <SelectItem value="Negativo">Negativo</SelectItem>
                    </SelectContent>
                  </Select>
                </div>
              </div>
            </CardHeader>
            <div className="overflow-x-auto">
              <Table>
                <TableHeader className="bg-slate-50">
                  <TableRow>
                    <TableHead className="text-xs font-bold">Data/Hora</TableHead>
                    <TableHead className="text-xs font-bold">Origem / Destino</TableHead>
                    <TableHead className="text-xs font-bold">Duração</TableHead>
                    <TableHead className="text-xs font-bold">Resumo & Transcrição</TableHead>
                    <TableHead className="text-xs font-bold">Categoria</TableHead>
                    <TableHead className="text-xs font-bold">Sentimento</TableHead>
                    <TableHead className="text-xs font-bold">Qualidade IA</TableHead>
                    <TableHead className="text-xs font-bold">Atendimento Vinculado</TableHead>
                  </TableRow>
                </TableHeader>
                <TableBody>
                  {filteredCallRecords.map((c) => (
                    <TableRow key={c.id} className="hover:bg-slate-50 text-xs">
                      <TableCell className="text-slate-500 whitespace-nowrap">
                        {c.created ? formatGMT3DateTime(c.created) : '—'}
                      </TableCell>
                      <TableCell>
                        <div className="font-semibold text-slate-900">
                          {c.from_number || 'Não informado'}
                        </div>
                        {c.to_number && (
                          <div className="text-[10px] text-slate-400">Para: {c.to_number}</div>
                        )}
                        {c.provider && (
                          <span className="text-[9px] uppercase font-mono text-indigo-600 block mt-0.5">
                            {c.provider}
                          </span>
                        )}
                      </TableCell>
                      <TableCell className="text-slate-600 whitespace-nowrap">
                        {c.duration ? `${c.duration}s` : '—'}
                      </TableCell>
                      <TableCell className="max-w-[300px]">
                        <div
                          className="font-medium text-slate-800 truncate"
                          title={c.summary || c.transcription}
                        >
                          {c.summary || c.transcription || 'Sem transcrição'}
                        </div>
                        {c.keywords && Array.isArray(c.keywords) && c.keywords.length > 0 && (
                          <div className="text-[10px] text-indigo-600 truncate flex items-center gap-1 mt-0.5">
                            <Tag className="h-3 w-3" />
                            {c.keywords.join(', ')}
                          </div>
                        )}
                      </TableCell>
                      <TableCell>{getCategoryBadge(c.category)}</TableCell>
                      <TableCell>{getSentimentBadge(c.sentiment)}</TableCell>
                      <TableCell>
                        {c.quality_score !== undefined ? (
                          <span className="font-bold text-slate-700">{c.quality_score}/100</span>
                        ) : (
                          '—'
                        )}
                      </TableCell>
                      <TableCell>
                        {c.service_record ? (
                          <Badge
                            variant="outline"
                            className="bg-indigo-50 text-indigo-700 border-indigo-200 text-[10px] font-mono"
                          >
                            {c.service_record.substring(0, 8)}...
                          </Badge>
                        ) : (
                          <span className="text-slate-400 text-[11px]">—</span>
                        )}
                      </TableCell>
                    </TableRow>
                  ))}

                  {filteredCallRecords.length === 0 && (
                    <TableRow>
                      <TableCell colSpan={8} className="text-center py-10 text-slate-400 text-xs">
                        Nenhuma gravação de chamada encontrada para os filtros selecionados. Clique
                        em "Simular Gravação & IA" para testar o fluxo de captura, transcrição e
                        análise.
                      </TableCell>
                    </TableRow>
                  )}
                </TableBody>
              </Table>
            </div>
          </Card>
        </TabsContent>

        {/* ================= ABA MICROSOFT OUTLOOK ================= */}
        <TabsContent value="outlook" className="space-y-6 mt-4">
          <Card className="border-slate-200 shadow-subtle">
            <CardHeader className="pb-3 border-b border-slate-100">
              <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-3">
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
                      Monitoramento contínuo de respostas de clientes via Microsoft Graph com
                      análise e categorização automática por IA.
                    </CardDescription>
                  </div>
                </div>

                <div className="flex items-center gap-2">
                  <Button
                    size="sm"
                    onClick={handleSyncOutlook}
                    disabled={syncingOutlook}
                    className="text-xs h-8 bg-indigo-600 hover:bg-indigo-700 text-white"
                  >
                    {syncingOutlook ? (
                      <Loader2 className="h-3.5 w-3.5 mr-1.5 animate-spin" />
                    ) : (
                      <RefreshCw className="h-3.5 w-3.5 mr-1.5" />
                    )}
                    Sincronizar Outlook Agora
                  </Button>

                  <Dialog open={testModalOpen} onOpenChange={setTestModalOpen}>
                    <DialogTrigger asChild>
                      <Button variant="outline" size="sm" className="text-xs h-8 gap-1.5">
                        <Sparkles className="h-3.5 w-3.5 text-indigo-600" />
                        Testar / Simular IA
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

                      <form onSubmit={handleRunOutlookTest} className="space-y-3.5 py-2">
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
                              placeholder="Nome do passageiro / cliente"
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
                      <span className="text-slate-600 font-mono text-[11px]">
                        MICROSOFT_CLIENT_ID
                      </span>
                      {statusData?.has_client_id ? (
                        <Badge
                          variant="outline"
                          className="text-emerald-700 bg-emerald-50 text-[10px]"
                        >
                          Configurado
                        </Badge>
                      ) : (
                        <Badge
                          variant="outline"
                          className="text-slate-400 bg-slate-100 text-[10px]"
                        >
                          Ausente
                        </Badge>
                      )}
                    </div>
                    <div className="flex items-center justify-between">
                      <span className="text-slate-600 font-mono text-[11px]">
                        MICROSOFT_CLIENT_SECRET
                      </span>
                      {statusData?.has_client_secret ? (
                        <Badge
                          variant="outline"
                          className="text-emerald-700 bg-emerald-50 text-[10px]"
                        >
                          Configurado
                        </Badge>
                      ) : (
                        <Badge
                          variant="outline"
                          className="text-slate-400 bg-slate-100 text-[10px]"
                        >
                          Ausente
                        </Badge>
                      )}
                    </div>
                    <div className="flex items-center justify-between">
                      <span className="text-slate-600 font-mono text-[11px]">
                        MICROSOFT_TENANT_ID
                      </span>
                      {statusData?.has_tenant_id ? (
                        <Badge
                          variant="outline"
                          className="text-emerald-700 bg-emerald-50 text-[10px]"
                        >
                          Configurado
                        </Badge>
                      ) : (
                        <Badge
                          variant="outline"
                          className="text-slate-400 bg-slate-100 text-[10px]"
                        >
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
                          <div
                            className="text-[11px] text-indigo-600 truncate"
                            title={l.main_topic}
                          >
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
                        Nenhum e-mail registrado ainda. Clique em "Testar / Simular IA" para
                        experimentar ou aguarde novas mensagens do Outlook.
                      </TableCell>
                    </TableRow>
                  )}
                </TableBody>
              </Table>
            </div>
          </Card>
        </TabsContent>
      </Tabs>
    </div>
  )
}
