import { useState } from 'react'
import {
  Dialog,
  DialogContent,
  DialogHeader,
  DialogTitle,
  DialogTrigger,
} from '@/components/ui/dialog'
import { Button } from '@/components/ui/button'
import { Textarea } from '@/components/ui/textarea'
import { Label } from '@/components/ui/label'
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from '@/components/ui/select'
import { createFeedback } from '@/services/feedback'
import { useToast } from '@/hooks/use-toast'
import { MessageSquarePlus, Loader2 } from 'lucide-react'
import type { FeedbackCategory } from '@/types/training'

const CATEGORIES: FeedbackCategory[] = ['Sugestão', 'Bug', 'Elogio', 'Reclamação']

export function FeedbackButton() {
  const [open, setOpen] = useState(false)
  const [message, setMessage] = useState('')
  const [category, setCategory] = useState<FeedbackCategory>('Sugestão')
  const [loading, setLoading] = useState(false)
  const { toast } = useToast()

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault()
    if (!message.trim()) return
    setLoading(true)
    try {
      await createFeedback(message.trim(), category)
      toast({ title: 'Feedback enviado!', description: 'Obrigado pela contribuição.' })
      setMessage('')
      setCategory('Sugestão')
      setOpen(false)
    } catch {
      toast({ variant: 'destructive', title: 'Erro ao enviar feedback' })
    } finally {
      setLoading(false)
    }
  }

  return (
    <Dialog open={open} onOpenChange={setOpen}>
      <DialogTrigger asChild>
        <button
          className="fixed bottom-6 right-6 z-50 h-12 w-12 rounded-full bg-indigo-600 hover:bg-indigo-700 text-white shadow-lg flex items-center justify-center transition-all hover:scale-110"
          title="Enviar feedback"
        >
          <MessageSquarePlus className="h-5 w-5" />
        </button>
      </DialogTrigger>
      <DialogContent className="sm:max-w-[420px]">
        <DialogHeader>
          <DialogTitle className="text-base font-bold text-slate-900">
            Compartilhe seu Feedback
          </DialogTitle>
        </DialogHeader>
        <form onSubmit={handleSubmit} className="space-y-3 py-2">
          <div className="space-y-1.5">
            <Label className="text-xs">Categoria</Label>
            <Select value={category} onValueChange={(v) => setCategory(v as FeedbackCategory)}>
              <SelectTrigger className="h-9 text-xs">
                <SelectValue />
              </SelectTrigger>
              <SelectContent>
                {CATEGORIES.map((c) => (
                  <SelectItem key={c} value={c}>
                    {c}
                  </SelectItem>
                ))}
              </SelectContent>
            </Select>
          </div>
          <div className="space-y-1.5">
            <Label className="text-xs">Mensagem</Label>
            <Textarea
              rows={4}
              required
              value={message}
              onChange={(e) => setMessage(e.target.value)}
              placeholder="Descreva sua sugestão, problema ou elogio..."
              className="text-xs"
            />
          </div>
          <div className="flex justify-end gap-2 pt-1">
            <Button type="button" variant="outline" size="sm" onClick={() => setOpen(false)}>
              Cancelar
            </Button>
            <Button
              type="submit"
              disabled={loading}
              size="sm"
              className="bg-indigo-600 hover:bg-indigo-700"
            >
              {loading && <Loader2 className="h-3.5 w-3.5 mr-1 animate-spin" />}
              Enviar
            </Button>
          </div>
        </form>
      </DialogContent>
    </Dialog>
  )
}
