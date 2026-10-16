import { useState, useRef, useEffect } from 'react'
import {
  Sparkles,
  Send,
  Loader2,
  X,
  Bot,
  User as UserIcon,
  PlusCircle,
  MessageSquare,
  HelpCircle,
  Minimize2,
  Maximize2,
} from 'lucide-react'
import { Button } from '@/components/ui/button'
import { Card, CardHeader, CardTitle, CardContent } from '@/components/ui/card'
import { Textarea } from '@/components/ui/textarea'
import { Badge } from '@/components/ui/badge'
import { useAuth } from '@/hooks/use-auth'
import {
  sendHubAIMessage,
  listHubAIConversations,
  listHubAIMessages,
  streamHubAIMessage,
  AgentConversationItem,
} from '@/services/consultant-ai'

interface Message {
  role: 'user' | 'assistant'
  content: string
  created?: string
}

const QUICK_PROMPTS = [
  'Qual o histórico desse cliente?',
  'Quais meus atendimentos pendentes?',
  'Tem e-mails prioritários P1 na Torre?',
  'Como está meu saldo de horas e ausências?',
]

export function ConsultantAIWidget() {
  const { user } = useAuth()
  const [open, setOpen] = useState(false)
  const [isExpanded, setIsExpanded] = useState(false)
  const [messages, setMessages] = useState<Message[]>([])
  const [input, setInput] = useState('')
  const [loading, setLoading] = useState(false)
  const [conversations, setConversations] = useState<AgentConversationItem[]>([])
  const [activeConversationId, setActiveConversationId] = useState<string | null>(null)
  const [showHistory, setShowHistory] = useState(false)
  const messagesEndRef = useRef<HTMLDivElement>(null)

  const scrollToBottom = () => {
    messagesEndRef.current?.scrollIntoView({ behavior: 'smooth' })
  }

  useEffect(() => {
    if (open) {
      scrollToBottom()
      loadConversations()
    }
  }, [open, messages])

  const loadConversations = async () => {
    try {
      const convs = await listHubAIConversations(10)
      setConversations(convs)
    } catch {
      // Ignora silenciosamente caso não haja conversas
    }
  }

  const handleSelectConversation = async (convId: string) => {
    try {
      setLoading(true)
      setActiveConversationId(convId)
      setShowHistory(false)
      const res = await listHubAIMessages(convId)
      if (res.messages && res.messages.length > 0) {
        setMessages(
          res.messages.map((m) => ({
            role: m.role,
            content: m.content,
            created: m.created,
          })),
        )
      } else {
        setMessages([])
      }
    } catch (err) {
      console.error(err)
    } finally {
      setLoading(false)
    }
  }

  const handleNewConversation = () => {
    setActiveConversationId(null)
    setMessages([])
    setShowHistory(false)
  }

  const handleSend = async (textToSend?: string) => {
    const query = (textToSend || input).trim()
    if (!query || loading) return

    const userMsg: Message = { role: 'user', content: query }
    const updatedMessages = [...messages, userMsg]
    setMessages(updatedMessages)
    setInput('')
    setLoading(true)

    // Mensagem placeholder da IA que será preenchida via streaming ou resposta direta
    let assistantText = ''
    setMessages((prev) => [...prev, { role: 'assistant', content: '' }])

    const onChunk = (chunk: string) => {
      assistantText += chunk
      setMessages((prev) => {
        const next = [...prev]
        if (next.length > 0 && next[next.length - 1].role === 'assistant') {
          next[next.length - 1].content = assistantText
        }
        return next
      })
    }

    const onDone = (fullText: string, convId: string) => {
      setMessages((prev) => {
        const next = [...prev]
        if (next.length > 0 && next[next.length - 1].role === 'assistant') {
          next[next.length - 1].content = fullText || assistantText
        }
        return next
      })
      if (convId) {
        setActiveConversationId(convId)
      }
      setLoading(false)
      loadConversations()
    }

    const onError = async (_err: Error) => {
      // Fallback para chamada síncrona se streaming falhar
      try {
        const res = await sendHubAIMessage(query, activeConversationId)
        setMessages((prev) => {
          const next = [...prev]
          if (next.length > 0 && next[next.length - 1].role === 'assistant') {
            next[next.length - 1].content = res.content
          }
          return next
        })
        if (res.conversation_id) {
          setActiveConversationId(res.conversation_id)
        }
        loadConversations()
      } catch (fallbackErr: any) {
        setMessages((prev) => {
          const next = [...prev]
          if (next.length > 0 && next[next.length - 1].role === 'assistant') {
            next[next.length - 1].content =
              'Desculpe, ocorreu uma instabilidade temporária ao consultar os dados. Por favor, tente novamente.'
          }
          return next
        })
      } finally {
        setLoading(false)
      }
    }

    // Disparar streaming do Agente
    streamHubAIMessage(query, activeConversationId, onChunk, onDone, onError)
  }

  const handleKeyDown = (e: React.KeyboardEvent<HTMLTextAreaElement>) => {
    if (e.key === 'Enter' && !e.shiftKey) {
      e.preventDefault()
      handleSend()
    }
  }

  if (!open) {
    return (
      <Button
        onClick={() => setOpen(true)}
        className="fixed bottom-6 right-6 z-50 h-14 rounded-full px-5 bg-gradient-to-r from-indigo-600 via-indigo-700 to-purple-600 text-white shadow-xl hover:shadow-indigo-500/25 hover:scale-105 transition-all duration-200 gap-2 border border-white/20"
      >
        <Sparkles className="h-5 w-5 animate-pulse text-amber-300" />
        <span className="font-semibold text-sm">HUB AI Assistente</span>
        <Badge className="bg-white/20 text-white text-[10px] px-1.5 py-0 h-4 border-0">
          Nativo
        </Badge>
      </Button>
    )
  }

  const widthClass = isExpanded ? 'w-[680px] h-[720px]' : 'w-[440px] h-[580px]'

  return (
    <Card
      className={`fixed bottom-6 right-6 z-50 ${widthClass} max-w-[calc(100vw-2rem)] max-h-[calc(100vh-4rem)] shadow-2xl flex flex-col border border-indigo-200/80 bg-white/95 backdrop-blur-sm transition-all duration-200`}
    >
      <CardHeader className="py-3 px-4 border-b bg-gradient-to-r from-indigo-900 via-indigo-800 to-purple-900 text-white rounded-t-lg shrink-0">
        <div className="flex items-center justify-between">
          <div className="flex items-center gap-2.5">
            <div className="h-8 w-8 rounded-full bg-white/10 flex items-center justify-center border border-white/20">
              <Bot className="h-4 w-4 text-amber-300" />
            </div>
            <div>
              <CardTitle className="text-sm font-bold flex items-center gap-2 text-white">
                HUB AI Assistente
                <Badge className="bg-emerald-500 text-white text-[9px] px-1.5 py-0 h-4 uppercase tracking-wide border-0">
                  Online
                </Badge>
              </CardTitle>
              <p className="text-[11px] text-indigo-200 truncate max-w-[240px]">
                {user?.name ? `${user.name} • ` : ''}Base operacional RexturAdvance
              </p>
            </div>
          </div>
          <div className="flex items-center gap-1">
            <Button
              variant="ghost"
              size="icon"
              onClick={handleNewConversation}
              className="h-7 w-7 text-indigo-200 hover:text-white hover:bg-white/10"
              title="Nova conversa"
            >
              <PlusCircle className="h-4 w-4" />
            </Button>
            <Button
              variant="ghost"
              size="icon"
              onClick={() => setShowHistory(!showHistory)}
              className="h-7 w-7 text-indigo-200 hover:text-white hover:bg-white/10"
              title="Histórico de conversas"
            >
              <MessageSquare className="h-4 w-4" />
            </Button>
            <Button
              variant="ghost"
              size="icon"
              onClick={() => setIsExpanded(!isExpanded)}
              className="h-7 w-7 text-indigo-200 hover:text-white hover:bg-white/10"
              title={isExpanded ? 'Reduzir janela' : 'Expandir janela'}
            >
              {isExpanded ? <Minimize2 className="h-4 w-4" /> : <Maximize2 className="h-4 w-4" />}
            </Button>
            <Button
              variant="ghost"
              size="icon"
              onClick={() => setOpen(false)}
              className="h-7 w-7 text-indigo-200 hover:text-white hover:bg-white/10"
            >
              <X className="h-4 w-4" />
            </Button>
          </div>
        </div>
      </CardHeader>

      {/* Gaveta de Histórico de Conversas */}
      {showHistory && (
        <div className="border-b bg-slate-50 p-2.5 max-h-40 overflow-y-auto shrink-0 text-xs space-y-1">
          <div className="flex items-center justify-between text-slate-500 font-semibold px-1 mb-1">
            <span>Conversas Recentes</span>
            <Button
              variant="ghost"
              size="sm"
              onClick={handleNewConversation}
              className="h-5 text-[10px] text-indigo-600 px-1"
            >
              + Nova
            </Button>
          </div>
          {conversations.length === 0 ? (
            <p className="text-slate-400 italic px-1">Nenhuma conversa anterior arquivada.</p>
          ) : (
            conversations.map((c) => (
              <button
                key={c.id}
                onClick={() => handleSelectConversation(c.id)}
                className={`w-full text-left p-1.5 rounded transition-colors flex items-center justify-between gap-2 ${
                  activeConversationId === c.id
                    ? 'bg-indigo-100/80 text-indigo-900 font-medium'
                    : 'hover:bg-slate-200/60 text-slate-700'
                }`}
              >
                <span className="truncate">{c.title || `Conversa ${c.id.substring(0, 8)}`}</span>
                <span className="text-[10px] text-slate-400 shrink-0">
                  {new Date(c.created).toLocaleDateString('pt-BR')}
                </span>
              </button>
            ))
          )}
        </div>
      )}

      {/* Conteúdo das Mensagens */}
      <CardContent className="flex-1 overflow-y-auto p-4 space-y-3 text-xs">
        {messages.length === 0 ? (
          <div className="h-full flex flex-col justify-center items-center text-center p-4 space-y-3 text-slate-500">
            <div className="h-12 w-12 rounded-full bg-indigo-50 border border-indigo-100 flex items-center justify-center text-indigo-600">
              <Bot className="h-6 w-6" />
            </div>
            <div>
              <p className="font-semibold text-slate-800 text-sm">Olá, como posso ajudar hoje?</p>
              <p className="text-[11px] text-slate-500 mt-1 max-w-xs">
                Sou o assistente inteligente nativo do HUB AI. Posso consultar histórico de
                clientes, atendimentos pendentes, e-mails prioritários da Torre e ausências.
              </p>
            </div>

            <div className="w-full pt-2 space-y-1.5 text-left">
              <span className="text-[10px] uppercase font-bold text-slate-400 tracking-wider flex items-center gap-1">
                <HelpCircle className="h-3 w-3" /> Sugestões rápidas
              </span>
              <div className="grid grid-cols-1 gap-1.5">
                {QUICK_PROMPTS.map((prompt, i) => (
                  <button
                    key={i}
                    onClick={() => handleSend(prompt)}
                    className="text-left text-xs p-2 rounded-md bg-slate-50 hover:bg-indigo-50 hover:text-indigo-700 border border-slate-200/80 transition-colors"
                  >
                    💡 {prompt}
                  </button>
                ))}
              </div>
            </div>
          </div>
        ) : (
          messages.map((m, idx) => (
            <div
              key={idx}
              className={`flex gap-2.5 ${m.role === 'user' ? 'justify-end' : 'justify-start'}`}
            >
              {m.role === 'assistant' && (
                <div className="h-7 w-7 rounded-full bg-indigo-100 text-indigo-700 flex items-center justify-center shrink-0 mt-0.5 border border-indigo-200">
                  <Bot className="h-3.5 w-3.5" />
                </div>
              )}
              <div
                className={`max-w-[85%] rounded-2xl p-3 leading-relaxed ${
                  m.role === 'user'
                    ? 'bg-indigo-600 text-white rounded-br-xs shadow-sm font-sans'
                    : 'bg-slate-100/90 text-slate-800 rounded-bl-xs border border-slate-200/70 shadow-xs'
                }`}
              >
                {m.content ? (
                  <div className="whitespace-pre-wrap break-words">{m.content}</div>
                ) : (
                  <div className="flex items-center gap-1.5 text-slate-400 italic py-1">
                    <Loader2 className="h-3 w-3 animate-spin" />
                    Consultando base de dados...
                  </div>
                )}
              </div>
              {m.role === 'user' && (
                <div className="h-7 w-7 rounded-full bg-slate-200 text-slate-700 flex items-center justify-center shrink-0 mt-0.5">
                  <UserIcon className="h-3.5 w-3.5" />
                </div>
              )}
            </div>
          ))
        )}
        <div ref={messagesEndRef} />
      </CardContent>

      {/* Caixa de Entrada e Envio */}
      <div className="p-3 border-t bg-slate-50/70 rounded-b-lg space-y-2 shrink-0">
        <div className="flex gap-2 items-end">
          <Textarea
            value={input}
            onChange={(e) => setInput(e.target.value)}
            onKeyDown={handleKeyDown}
            placeholder="Pergunte sobre um cliente, atendimento ou e-mail..."
            className="min-h-[44px] max-h-24 resize-none text-xs bg-white border-slate-200 focus:border-indigo-400 focus:ring-1 focus:ring-indigo-400 rounded-xl"
            rows={1}
            disabled={loading}
          />
          <Button
            onClick={() => handleSend()}
            disabled={!input.trim() || loading}
            size="icon"
            className="h-10 w-10 shrink-0 bg-indigo-600 hover:bg-indigo-700 text-white rounded-xl shadow-xs"
          >
            {loading ? <Loader2 className="h-4 w-4 animate-spin" /> : <Send className="h-4 w-4" />}
          </Button>
        </div>
        <div className="flex items-center justify-between text-[10px] text-slate-400 px-1">
          <span>Pressione Enter para enviar, Shift+Enter para nova linha</span>
          <span className="flex items-center gap-1">
            <Sparkles className="h-2.5 w-2.5 text-indigo-500" />
            HUB AI Skip Cloud Native
          </span>
        </div>
      </div>
    </Card>
  )
}
