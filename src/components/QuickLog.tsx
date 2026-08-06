import { useState, useEffect } from 'react'
import { Dialog, DialogContent, DialogHeader, DialogTitle } from '@/components/ui/dialog'
import { Button } from '@/components/ui/button'
import { Textarea } from '@/components/ui/textarea'
import { Label } from '@/components/ui/label'
import { SearchableSelect } from '@/components/SearchableSelect'
import { useServiceRecordForm } from '@/hooks/use-service-record-form'
import { analyzeDescription } from '@/services/ai-analysis'
import { useToast } from '@/hooks/use-toast'
import { Zap, Loader2, Sparkles, CheckCircle2 } from 'lucide-react'
import type { ContactReason, AvoidableContactReason } from '@/types/service_record'

interface QuickLogProps {
  open: boolean
  onOpenChange: (open: boolean) => void
  onSuccess?: () => void
}

export function QuickLog({ open, onOpenChange, onSuccess }: QuickLogProps) {
  const form = useServiceRecordForm(open, true)
  const { toast } = useToast()
  const [analyzing, setAnalyzing] = useState(false)

  useEffect(() => {
    if (open) {
      form.resetForm()
    }
  }, [open])

  const handleAIAnalysis = async () => {
    if (!form.description.trim()) {
      toast({ variant: 'destructive', title: 'Digite uma descrição primeiro' })
      return
    }
    setAnalyzing(true)
    try {
      const result = await analyzeDescription(form.description)
      form.setContactReason(result.contact_reason as ContactReason)
      if (result.avoidable_contact) {
        form.handleAvoidableChange(true)
        if (result.avoidable_contact_reason) {
          form.setAvoidableContactReason(result.avoidable_contact_reason as AvoidableContactReason)
        }
      }
      toast({ title: 'IA preencheu os campos!' })
    } catch {
      toast({ variant: 'destructive', title: 'Erro na análise com IA' })
    } finally {
      setAnalyzing(false)
    }
  }

  const handleSubmit = async (e: React.FormEvent) => {
    if (!form.clientName.trim() && form.clientCompany) {
      form.setClientName(form.clientCompany)
    }
    if (await form.handleSubmit(e)) {
      form.resetForm()
      onOpenChange(false)
      onSuccess?.()
    }
  }

  const handleSubmitAndFinalize = async (e: React.MouseEvent) => {
    e.preventDefault()
    if (!form.clientName.trim() && form.clientCompany) {
      form.setClientName(form.clientCompany)
    }
    if (await form.handleSubmit(e as unknown as React.FormEvent, 'Concluído')) {
      form.resetForm()
      onOpenChange(false)
      onSuccess?.()
    }
  }

  return (
    <Dialog open={open} onOpenChange={onOpenChange}>
      <DialogContent className="sm:max-w-[480px]">
        <DialogHeader>
          <DialogTitle className="flex items-center gap-2 text-indigo-950 font-bold">
            <Zap className="h-5 w-5 text-cyan-500" />
            Registro Expresso
          </DialogTitle>
        </DialogHeader>
        <form onSubmit={handleSubmit} className="space-y-4">
          <div className="space-y-1.5">
            <Label className="text-xs font-semibold">Agência *</Label>
            <SearchableSelect
              options={form.clients
                .filter(
                  (c, i, arr) => c.company && arr.findIndex((c2) => c2.company === c.company) === i,
                )
                .map((c) => ({ value: c.id, label: c.company! }))}
              value={form.selectedClientId}
              onValueChange={form.handleSelectCompany}
              placeholder="Selecione a agência..."
              emptyText="Nenhuma agência encontrada."
              className="h-9"
            />
          </div>
          {form.selectedClientId && form.agents.length > 0 && (
            <div className="space-y-1.5">
              <Label className="text-xs font-semibold">Cliente/Agente</Label>
              <SearchableSelect
                options={form.agents.map((a) => ({ value: a.id, label: a.name }))}
                value={form.selectedAgentId}
                onValueChange={form.handleSelectAgent}
                placeholder="Selecione o agente..."
                emptyText="Nenhum agente encontrado."
                className="h-9"
              />
            </div>
          )}
          <div className="space-y-1.5">
            <div className="flex items-center justify-between">
              <Label className="text-xs font-semibold">O que aconteceu? *</Label>
              <Button
                type="button"
                variant="ghost"
                size="sm"
                className="text-xs text-indigo-600 h-7"
                onClick={handleAIAnalysis}
                disabled={analyzing}
              >
                {analyzing ? (
                  <Loader2 className="h-3 w-3 mr-1 animate-spin" />
                ) : (
                  <Sparkles className="h-3 w-3 mr-1" />
                )}
                Preencher com IA
              </Button>
            </div>
            <Textarea
              rows={3}
              required
              value={form.description}
              onChange={(e) => form.setDescription(e.target.value)}
              placeholder="Ex: Agência XYZ ligou perguntando sobre reembolso de bagagem..."
              className="text-sm"
            />
          </div>
          {form.contactReason && (
            <div className="flex items-center gap-2 text-xs flex-wrap">
              <span className="text-slate-500">IA detectou:</span>
              <span className="font-bold text-indigo-600 bg-indigo-50 px-2 py-0.5 rounded">
                {form.contactReason}
              </span>
              {form.priority && (
                <span className="font-bold text-amber-600 bg-amber-50 px-2 py-0.5 rounded">
                  {form.priority}
                </span>
              )}
              {form.avoidableContact && (
                <span className="font-bold text-rose-600 bg-rose-50 px-2 py-0.5 rounded">
                  Evitável
                </span>
              )}
            </div>
          )}
          <div className="flex gap-2">
            <Button
              type="submit"
              disabled={form.loading}
              className="flex-1 bg-gradient-to-r from-cyan-600 to-indigo-600 hover:from-cyan-700 hover:to-indigo-700 font-bold"
            >
              {form.loading ? (
                <Loader2 className="h-4 w-4 animate-spin mr-2" />
              ) : (
                <Zap className="h-4 w-4 mr-2" />
              )}
              Salvar Registro
            </Button>
            <Button
              type="button"
              onClick={handleSubmitAndFinalize}
              disabled={form.loading}
              className="flex-1 bg-emerald-600 hover:bg-emerald-700 font-bold"
            >
              {form.loading ? (
                <Loader2 className="h-4 w-4 animate-spin mr-2" />
              ) : (
                <CheckCircle2 className="h-4 w-4 mr-2" />
              )}
              Salvar e Concluir
            </Button>
          </div>
        </form>
      </DialogContent>
    </Dialog>
  )
}
