import React, { useState } from 'react'
import {
  Dialog,
  DialogContent,
  DialogHeader,
  DialogTitle,
  DialogFooter,
  DialogDescription,
} from '@/components/ui/dialog'
import { Button } from '@/components/ui/button'
import { Input } from '@/components/ui/input'
import { Label } from '@/components/ui/label'
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from '@/components/ui/select'
import { Textarea } from '@/components/ui/textarea'
import { DollarSign } from 'lucide-react'
import { useToast } from '@/hooks/use-toast'
import {
  createWaiverBudget,
  updateWaiverBudget,
  type CreateBudgetDTO,
} from '@/services/waiver_budgets'
import type { WaiverBudgetRecord, WaiverBudgetStatus } from '@/types/waiver'

interface WaiverBudgetFormModalProps {
  open: boolean
  onOpenChange: (open: boolean) => void
  budgetToEdit?: WaiverBudgetRecord | null
  onSaved: () => void
}

export function WaiverBudgetFormModal({
  open,
  onOpenChange,
  budgetToEdit,
  onSaved,
}: WaiverBudgetFormModalProps) {
  const { toast } = useToast()
  const [submitting, setSubmitting] = useState(false)

  const [airlineKey, setAirlineKey] = useState<string>('latam')
  const [category, setCategory] = useState('')
  const [periodLabel, setPeriodLabel] = useState(
    new Date().toLocaleDateString('pt-BR', { month: 'long', year: 'numeric' }),
  )
  const [budgetAmount, setBudgetAmount] = useState('')
  const [usedAmount, setUsedAmount] = useState('')
  const [currency, setCurrency] = useState<'USD' | 'BRL' | 'EUR'>('USD')
  const [unit, setUnit] = useState('')
  const [status, setStatus] = useState<WaiverBudgetStatus>('Ativo')
  const [notes, setNotes] = useState('')

  React.useEffect(() => {
    if (open) {
      if (budgetToEdit) {
        setAirlineKey(budgetToEdit.airline_key)
        setCategory(budgetToEdit.category)
        setPeriodLabel(budgetToEdit.period_label)
        setBudgetAmount(String(budgetToEdit.budget_amount))
        setUsedAmount(String(budgetToEdit.used_amount || 0))
        setCurrency(budgetToEdit.currency)
        setUnit(budgetToEdit.unit || '')
        setStatus(budgetToEdit.status)
        setNotes(budgetToEdit.notes || '')
      } else {
        setAirlineKey('latam')
        setCategory('')
        setPeriodLabel(new Date().toLocaleDateString('pt-BR', { month: 'long', year: 'numeric' }))
        setBudgetAmount('')
        setUsedAmount('0')
        setCurrency('USD')
        setUnit('')
        setStatus('Ativo')
        setNotes('')
      }
    }
  }, [open, budgetToEdit])

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault()
    if (!category.trim() || !periodLabel.trim() || !budgetAmount) {
      toast({
        title: 'Campos obrigatórios',
        description: 'Preencha a categoria, período e o valor orçado.',
        variant: 'destructive',
      })
      return
    }

    const parsedBudget = parseFloat(budgetAmount)
    const parsedUsed = parseFloat(usedAmount) || 0

    if (isNaN(parsedBudget) || parsedBudget < 0) {
      toast({
        title: 'Valor orçado inválido',
        description: 'Informe um número válido.',
        variant: 'destructive',
      })
      return
    }

    setSubmitting(true)
    try {
      const payload: CreateBudgetDTO = {
        airline_key: airlineKey,
        category: category.trim(),
        period_label: periodLabel.trim(),
        budget_amount: parsedBudget,
        used_amount: parsedUsed,
        currency,
        unit: unit.trim() || undefined,
        status,
        notes: notes.trim() || undefined,
      }

      if (budgetToEdit) {
        await updateWaiverBudget(budgetToEdit.id, payload)
        toast({
          title: 'Verba atualizada!',
          description: 'Os dados foram gravados com sucesso.',
        })
      } else {
        await createWaiverBudget(payload)
        toast({
          title: 'Verba cadastrada!',
          description: 'Nova verba orçamentária criada com sucesso.',
        })
      }

      onSaved()
      onOpenChange(false)
    } catch (err: any) {
      console.error(err)
      toast({
        title: 'Erro ao salvar verba',
        description: err?.message || 'Não foi possível gravar os dados.',
        variant: 'destructive',
      })
    } finally {
      setSubmitting(false)
    }
  }

  return (
    <Dialog open={open} onOpenChange={onOpenChange}>
      <DialogContent className="max-w-lg">
        <form onSubmit={handleSubmit}>
          <DialogHeader>
            <div className="flex items-center gap-2">
              <div className="p-2 rounded-lg bg-indigo-50 border border-indigo-100 text-indigo-600">
                <DollarSign className="h-5 w-5" />
              </div>
              <div>
                <DialogTitle className="text-base font-bold text-slate-900">
                  {budgetToEdit ? 'Editar Verba Comercial' : 'Nova Verba Comercial'}
                </DialogTitle>
                <DialogDescription className="text-xs text-slate-500">
                  Configure o budget/orçado da companhia e moeda para controle e abatimento
                  automático.
                </DialogDescription>
              </div>
            </div>
          </DialogHeader>

          <div className="space-y-3 py-3 text-xs">
            <div className="grid grid-cols-2 gap-3">
              <div className="space-y-1">
                <Label className="text-xs">Companhia Aérea *</Label>
                <Select value={airlineKey} onValueChange={setAirlineKey}>
                  <SelectTrigger className="text-xs h-8">
                    <SelectValue />
                  </SelectTrigger>
                  <SelectContent>
                    <SelectItem value="latam">LATAM Airlines</SelectItem>
                    <SelectItem value="afkl">Air France / KLM</SelectItem>
                    <SelectItem value="gol">GOL Linhas Aéreas</SelectItem>
                    <SelectItem value="aa">American Airlines</SelectItem>
                    <SelectItem value="sky">SKY Airline</SelectItem>
                    <SelectItem value="assistencia">Assistência Aeroportos</SelectItem>
                  </SelectContent>
                </Select>
              </div>

              <div className="space-y-1">
                <Label className="text-xs">Moeda *</Label>
                <Select value={currency} onValueChange={(v) => setCurrency(v as any)}>
                  <SelectTrigger className="text-xs h-8">
                    <SelectValue />
                  </SelectTrigger>
                  <SelectContent>
                    <SelectItem value="USD">USD (Dólar)</SelectItem>
                    <SelectItem value="BRL">BRL (Real)</SelectItem>
                    <SelectItem value="EUR">EUR (Euro)</SelectItem>
                  </SelectContent>
                </Select>
              </div>
            </div>

            <div className="space-y-1">
              <Label className="text-xs">Categoria / Tipo da Verba *</Label>
              <Input
                placeholder="Ex: Isenção de Multa, Quebra Tarifária, Cota Geral"
                value={category}
                onChange={(e) => setCategory(e.target.value)}
                className="text-xs h-8"
                required
              />
            </div>

            <div className="grid grid-cols-2 gap-3">
              <div className="space-y-1">
                <Label className="text-xs">Período / Vigência *</Label>
                <Input
                  placeholder="Ex: Março/2026, 1º Semestre"
                  value={periodLabel}
                  onChange={(e) => setPeriodLabel(e.target.value)}
                  className="text-xs h-8"
                  required
                />
              </div>

              <div className="space-y-1">
                <Label className="text-xs">Unidade (Opcional)</Label>
                <Input
                  placeholder="Ex: Concierge, SAO (vazio = geral)"
                  value={unit}
                  onChange={(e) => setUnit(e.target.value)}
                  className="text-xs h-8"
                />
              </div>
            </div>

            <div className="grid grid-cols-2 gap-3">
              <div className="space-y-1">
                <Label className="text-xs">Valor Orçado ({currency}) *</Label>
                <Input
                  type="number"
                  step="any"
                  min="0"
                  placeholder="Ex: 10000.00"
                  value={budgetAmount}
                  onChange={(e) => setBudgetAmount(e.target.value)}
                  className="text-xs h-8 font-mono"
                  required
                />
              </div>

              <div className="space-y-1">
                <Label className="text-xs">Valor Já Utilizado ({currency})</Label>
                <Input
                  type="number"
                  step="any"
                  min="0"
                  placeholder="0.00"
                  value={usedAmount}
                  onChange={(e) => setUsedAmount(e.target.value)}
                  className="text-xs h-8 font-mono"
                />
              </div>
            </div>

            <div className="space-y-1">
              <Label className="text-xs">Status da Verba</Label>
              <Select value={status} onValueChange={(v) => setStatus(v as any)}>
                <SelectTrigger className="text-xs h-8">
                  <SelectValue />
                </SelectTrigger>
                <SelectContent>
                  <SelectItem value="Ativo">Ativo (Habilitada para consumo)</SelectItem>
                  <SelectItem value="Inativo">Inativo (Pausada)</SelectItem>
                  <SelectItem value="Encerrado">Encerrado</SelectItem>
                </SelectContent>
              </Select>
            </div>

            <div className="space-y-1">
              <Label className="text-xs">Observações / Detalhes</Label>
              <Textarea
                placeholder="Observações complementares sobre a vigência ou regras..."
                value={notes}
                onChange={(e) => setNotes(e.target.value)}
                rows={2}
                className="text-xs resize-none"
              />
            </div>
          </div>

          <DialogFooter className="mt-4 gap-2 sm:gap-0">
            <Button
              type="button"
              variant="outline"
              size="sm"
              onClick={() => onOpenChange(false)}
              disabled={submitting}
            >
              Cancelar
            </Button>
            <Button
              type="submit"
              size="sm"
              disabled={submitting}
              className="bg-indigo-600 hover:bg-indigo-700 text-white"
            >
              {submitting ? 'Salvando...' : 'Salvar Verba'}
            </Button>
          </DialogFooter>
        </form>
      </DialogContent>
    </Dialog>
  )
}
