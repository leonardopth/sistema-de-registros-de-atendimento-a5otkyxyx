import { useState, useRef, useEffect } from 'react'
import { Button } from '@/components/ui/button'
import { Input } from '@/components/ui/input'
import { askConsultantAI } from '@/services/consultant-ai'
import { Bot, X, Send, Loader2 } from 'lucide-react'

interface ChatMessage {
  role: 'user' | 'assistant'
  content: string
}

export function ConsultantAIWidget() {
  const [open, setOpen] = useState(false)
  const [messages, setMessages] = useState<ChatMessage[]>([])
  const [input, setInput] = useState('')
  const [loading, setLoading] = useState(false)
  const scrollRef = useRef<HTMLDivElement>(null)

  useEffect(() => {
    if (scrollRef.current) scrollRef.current.scrollTop = scrollRef.current.scrollHeight
  }, [messages])

  const handleSend = async () => {
    if (!input.trim() || loading) return
    const userMsg: ChatMessage = { role: 'user', content: input.trim() }
    setMessages((prev) => [...prev, userMsg])
    setInput('')
    setLoading(true)
    try {
      const result = await askConsultantAI(userMsg.content)
      setMessages((prev) => [...prev, { role: 'assistant', content: result.answer }])
    } catch {
      setMessages((prev) => [
        ...prev,
        { role: 'assistant', content: 'Desculpe, não consegui processar sua pergunta.' },
      ])
    } finally {
      setLoading(false)
    }
  }

  if (!open) {
    return (
      <Button
        onClick={() => setOpen(true)}
        className="fixed bottom-6 right-6 h-12 w-12 rounded-full bg-gradient-to-br from-cyan-500 to-indigo-600 hover:from-cyan-600 hover:to-indigo-700 shadow-lg z-50 p-0"
      >
        <Bot className="h-6 w-6 text-white" />
      </Button>
    )
  }

  return (
    <div className="fixed bottom-6 right-6 w-80 h-96 bg-white rounded-xl shadow-2xl border border-slate-200 flex flex-col z-50 animate-fade-in-up">
      <div className="flex items-center justify-between p-3 bg-gradient-to-r from-cyan-600 to-indigo-600 rounded-t-xl">
        <div className="flex items-center gap-2">
          <Bot className="h-5 w-5 text-white" />
          <span className="text-sm font-bold text-white">Assistente IA</span>
        </div>
        <Button
          variant="ghost"
          size="icon"
          className="h-7 w-7 text-white hover:bg-white/20"
          onClick={() => setOpen(false)}
        >
          <X className="h-4 w-4" />
        </Button>
      </div>
      <div ref={scrollRef} className="flex-1 overflow-y-auto p-3 space-y-2">
        {messages.length === 0 && (
          <p className="text-xs text-slate-400 text-center py-4">
            Pergunte sobre atendimentos, agências, ou tutoriais...
          </p>
        )}
        {messages.map((msg, i) => (
          <div key={i} className={`text-xs ${msg.role === 'user' ? 'text-right' : 'text-left'}`}>
            <span
              className={`inline-block max-w-[85%] p-2 rounded-lg ${msg.role === 'user' ? 'bg-indigo-600 text-white' : 'bg-slate-100 text-slate-800'}`}
            >
              {msg.content}
            </span>
          </div>
        ))}
        {loading && (
          <div className="text-left">
            <span className="inline-block p-2 rounded-lg bg-slate-100">
              <Loader2 className="h-3 w-3 animate-spin text-slate-500" />
            </span>
          </div>
        )}
      </div>
      <div className="p-2 border-t flex gap-2">
        <Input
          value={input}
          onChange={(e) => setInput(e.target.value)}
          onKeyDown={(e) => e.key === 'Enter' && handleSend()}
          placeholder="Pergunte algo..."
          className="h-8 text-xs flex-1"
          disabled={loading}
        />
        <Button
          size="icon"
          className="h-8 w-8 bg-indigo-600 hover:bg-indigo-700 shrink-0"
          onClick={handleSend}
          disabled={loading || !input.trim()}
        >
          <Send className="h-3.5 w-3.5" />
        </Button>
      </div>
    </div>
  )
}
