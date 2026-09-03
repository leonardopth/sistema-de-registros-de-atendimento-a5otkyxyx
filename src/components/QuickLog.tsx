import { useState, useEffect } from 'react'
import { Dialog, DialogContent, DialogHeader, DialogTitle } from '@/components/ui/dialog'
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
import { SearchableSelect } from '@/components/SearchableSelect'
import { ClientAutocompleteCombobox } from '@/components/ClientAutocompleteCombobox'
import { VoiceInputButton } from '@/components/VoiceInputButton'
import { NewAgentDialog } from '@/components/NewAgentDialog'
import { useServiceRecordForm } from '@/hooks/use-service-record-form'
import { analyzeDescription } from '@/services/ai-analysis'
import { useToast } from '@/hooks/use-toast'
import { Zap, Loader2, Sparkles, CheckCircle2 } from 'lucide-react'
import type {
  ContactReason,
  AvoidableContactReason,
  TravelType,
  ServiceChannel,
} from '@/types/service_record'
import { CONTACT_REASON_OPTIONS } from '@/constants/contactReasons'

interface QuickLogProps {
  open: boolean
  onOpenChange: (open: boolean) => void
  onSuccess?: () => void
}

export function QuickLog({ open, onOpenChange, onSuccess }: QuickLogProps) {
  const form = useServiceRecordForm(open, true)
  const { toast } = useToast()
  const [analyzing, setAnalyzing] = useState(false)
  const [newAgentOpen, setNewAgentOpen] = useState(false)

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
      form.applyAIResult(result)
      toast({ title: 'IA preencheu os campos!' })
    } catch {
      toast({ variant: 'destructive', title: 'Erro na análise com IA' })
    } finally {
      setAnalyzing(false)
    }
  }

  const handleVoiceTranscript = (text: string) => {
    form.setDescription(text)
    toast({ title: 'Transcrição concluída', description: 'Reveja o texto transcrito.' })
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
            <Label className="text-xs font-semibold">Agência / Cliente *</Label>
            <ClientAutocompleteCombobox
              clients={form.clients}
              selectedClientId={form.selectedClientId}
              onSelectClient={(id, client) => form.handleSelectCompany(id, client)}
              placeholder="Busque ou cadastre a agência..."
              hasError={Boolean(form.clientError)}
            />
            {form.clientError && (
              <p className="text-xs text-red-500 font-medium">{form.clientError}</p>
            )}
          </div>
          {form.selectedClientId && (
            <div className="space-y-1.5">
              <Label className="text-xs font-semibold">Cliente/Agente</Label>
              <SearchableSelect
                options={form.agents.map((a) => ({ value: a.id, label: a.name }))}
                pinnedOptions={[{ value: '__new_agent__', label: '＋ Cadastrar novo Agente' }]}
                value={form.selectedAgentId}
                onValueChange={(val) => {
                  if (val === '__new_agent__') {
                    setNewAgentOpen(true)
                    return
                  }
                  form.handleSelectAgent(val)
                }}
                placeholder="Selecione o agente..."
                emptyText="Nenhum agente encontrado."
                className="h-9"
              />
            </div>
          )}
          <div className="space-y-1.5">
            <Label className="text-xs font-semibold">Nacional / Internacional *</Label>
            <Select
              value={form.travelType}
              onValueChange={(v) => form.setTravelType(v as TravelType)}
            >
              <SelectTrigger className={`h-9 ${form.travelTypeError ? 'border-red-500' : ''}`}>
                <SelectValue placeholder="Selecione o tipo" />
              </SelectTrigger>
              <SelectContent>
                <SelectItem value="Nacional">Nacional</SelectItem>
                <SelectItem value="Internacional">Internacional</SelectItem>
              </SelectContent>
            </Select>
            {form.travelTypeError && (
              <p className="text-xs text-red-500 font-medium">{form.travelTypeError}</p>
            )}
          </div>
          <div className="grid grid-cols-2 gap-2">
            <div className="space-y-1.5">
              <Label className="text-xs font-semibold">Motivo</Label>
              <Select
                value={form.contactReason}
                onValueChange={(v) => form.setContactReason(v as ContactReason)}
              >
                <SelectTrigger className="h-9">
                  <SelectValue placeholder="Selecione..." />
                </SelectTrigger>
                <SelectContent>
                  {CONTACT_REASON_OPTIONS.map((opt) => (
                    <SelectItem key={opt.value} value={opt.value}>
                      {opt.label}
                    </SelectItem>
                  ))}
                </SelectContent>
              </Select>
            </div>
            <div className="space-y-1.5">
              <Label className="text-xs font-semibold">Canal</Label>
              <Select
                value={form.channel}
                onValueChange={(v) => form.setChannel(v as ServiceChannel)}
              >
                <SelectTrigger className="h-9">
                  <SelectValue placeholder="Selecione..." />
                </SelectTrigger>
                <SelectContent>
                  <SelectItem value="Telefone">Telefone</SelectItem>
                  <SelectItem value="e-mail">e-mail</SelectItem>
                  <SelectItem value="whatsapp">whatsapp</SelectItem>
                  <SelectItem value="comercial">comercial</SelectItem>
                  <SelectItem value="outros">outros</SelectItem>
                </SelectContent>
              </Select>
            </div>
          </div>
          <div className="space-y-1.5">
            <div className="flex items-center justify-between">
              <Label className="text-xs font-semibold">O que aconteceu? *</Label>
              <div className="flex items-center gap-2">
                <VoiceInputButton
                  onTranscript={handleVoiceTranscript}
                  disabled={analyzing}
                  className="h-7"
                />
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
            </div>
            <Textarea
              rows={3}
              value={form.description}
              onChange={(e) => form.setDescription(e.target.value)}
              placeholder="Ex: Agência XYZ ligou perguntando sobre reembolso de bagagem..."
              className="text-sm"
            />
            <p className="text-xs text-amber-600">
              ⚠️ Transcrição automática por voz — revise o texto, pois pode conter erros.
            </p>
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
              {form.channel && (
                <span className="font-bold text-cyan-600 bg-cyan-50 px-2 py-0.5 rounded">
                  {form.channel}
                </span>
              )}
              {form.travelType && (
                <span className="font-bold text-purple-600 bg-purple-50 px-2 py-0.5 rounded">
                  {form.travelType}
                </span>
              )}
            </div>
          )}
          <NewAgentDialog
            open={newAgentOpen}
            onOpenChange={setNewAgentOpen}
            clientId={form.selectedClientId}
            onAgentCreated={(agent) => {
              form.addAndSelectAgent(agent)
            }}
          />

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
