import { useState } from 'react'
import {
  Dialog,
  DialogContent,
  DialogHeader,
  DialogTitle,
  DialogFooter,
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
import { Clock } from 'lucide-react'
import { UserRecord } from '@/types/service_record'
import { createHourBankEntry } from '@/services/banco-ferias'
import { isManagerRole } from '@/services/clt-validation'
import { toast } from '@/hooks/use-toast'

interface NewHourBankModalProps {
  open: boolean
  onOpenChange: (open: boolean) => void
  users: UserRecord[]
  prefilledUserId?: string
  onSaved: () => void
}

export function NewHourBankModal({
  open,
  onOpenChange,
  users,
  prefilledUserId,
  onSaved,
}: NewHourBankModalProps) {
  // Apenas não-gestores podem receber banco de horas (respeitando a lista escopada de users)
  const eligibleUsers = users.filter((u) => !isManagerRole(u.role))

  const [userId, setUserId] = useState<string>('')
  const [date, setDate] = useState<string>(new Date().toISOString().substring(0, 10))
  const [hours, setHours] = useState<string>('2')
  const [type, setType] = useState<'credito' | 'debito'>('credito')
  const [description, setDescription] = useState<string>('')
  const [isSubmitting, setIsSubmitting] = useState(false)

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault()
    const targetUserId = userId || prefilledUserId || eligibleUsers[0]?.id
    const numHours = parseFloat(hours)

    if (!targetUserId || isNaN(numHours) || numHours <= 0 || !description.trim()) {
      toast({
        variant: 'destructive',
        title: 'Campos incompletos',
        description: 'Preencha o colaborador, a quantidade de horas e a justificativa.',
      })
      return
    }

    setIsSubmitting(true)
    try {
      await createHourBankEntry({
        user_id: targetUserId,
        date: `${date} 12:00:00.000Z`,
        hours: numHours,
        type,
        description: description.trim(),
        source: 'manual',
      })

      toast({
        title: 'Lançamento efetuado!',
        description: `${type === 'credito' ? 'Crédito' : 'Débito'} de ${numHours}h registrado no banco de horas.`,
      })
      onSaved()
      onOpenChange(false)
      setDescription('')
    } catch (err: any) {
      console.error('Erro ao lançar banco de horas:', err)
      toast({
        variant: 'destructive',
        title: 'Erro no lançamento',
        description: err?.message || 'Falha ao registrar.',
      })
    } finally {
      setIsSubmitting(false)
    }
  }

  return (
    <Dialog open={open} onOpenChange={onOpenChange}>
      <DialogContent className="max-w-md">
        <DialogHeader>
          <DialogTitle className="text-base font-bold text-slate-900 flex items-center gap-2">
            <Clock className="h-5 w-5 text-indigo-600" />
            Novo Lançamento de Banco de Horas
          </DialogTitle>
        </DialogHeader>

        <form onSubmit={handleSubmit} className="space-y-4 pt-2">
          {/* Colaborador */}
          <div className="space-y-1.5">
            <Label className="text-xs font-semibold text-slate-700">Colaborador *</Label>
            <Select
              value={userId || prefilledUserId || eligibleUsers[0]?.id || ''}
              onValueChange={setUserId}
            >
              <SelectTrigger className="h-9 text-xs">
                <SelectValue placeholder="Selecione o colaborador" />
              </SelectTrigger>
              <SelectContent className="max-h-56">
                {eligibleUsers.map((u) => (
                  <SelectItem key={u.id} value={u.id} className="text-xs">
                    {u.name} — {u.role}
                  </SelectItem>
                ))}
              </SelectContent>
            </Select>
            <p className="text-[10px] text-slate-400">
              *Gestores e líderes não possuem banco de horas e não são listados.
            </p>
          </div>

          {/* Tipo e Horas */}
          <div className="grid grid-cols-2 gap-3">
            <div className="space-y-1.5">
              <Label className="text-xs font-semibold text-slate-700">Tipo de Lançamento *</Label>
              <Select value={type} onValueChange={(v: any) => setType(v)}>
                <SelectTrigger className="h-9 text-xs">
                  <SelectValue />
                </SelectTrigger>
                <SelectContent>
                  <SelectItem value="credito" className="text-xs text-emerald-700 font-semibold">
                    + Crédito (Horas extras/trabalhadas)
                  </SelectItem>
                  <SelectItem value="debito" className="text-xs text-rose-700 font-semibold">
                    - Débito (Folga/Compensação)
                  </SelectItem>
                </SelectContent>
              </Select>
            </div>

            <div className="space-y-1.5">
              <Label className="text-xs font-semibold text-slate-700">Horas (ex: 2 ou 1.5) *</Label>
              <Input
                type="number"
                step="0.5"
                min="0.5"
                max="24"
                value={hours}
                onChange={(e) => setHours(e.target.value)}
                className="h-9 text-xs"
                required
              />
            </div>
          </div>

          {/* Data */}
          <div className="space-y-1.5">
            <Label className="text-xs font-semibold text-slate-700">Data de Referência *</Label>
            <Input
              type="date"
              value={date}
              onChange={(e) => setDate(e.target.value)}
              className="h-9 text-xs"
              required
            />
          </div>

          {/* Motivo / Descrição */}
          <div className="space-y-1.5">
            <Label className="text-xs font-semibold text-slate-700">Justificativa / Motivo *</Label>
            <Input
              type="text"
              value={description}
              onChange={(e) => setDescription(e.target.value)}
              placeholder="Ex.: Cobertura de plantão emergencial no sábado"
              className="h-9 text-xs"
              required
            />
          </div>

          <DialogFooter className="pt-2 border-t border-slate-100">
            <Button
              type="button"
              variant="outline"
              size="sm"
              onClick={() => onOpenChange(false)}
              className="text-xs"
            >
              Cancelar
            </Button>
            <Button
              type="submit"
              size="sm"
              disabled={isSubmitting}
              className="text-xs bg-indigo-600 hover:bg-indigo-700"
            >
              {isSubmitting ? 'Salvando...' : 'Registrar Lançamento'}
            </Button>
          </DialogFooter>
        </form>
      </DialogContent>
    </Dialog>
  )
}
