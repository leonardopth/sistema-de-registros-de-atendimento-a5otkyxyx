import { useEffect, useState } from 'react'
import { Dialog, DialogContent, DialogHeader, DialogTitle } from '@/components/ui/dialog'
import { Button } from '@/components/ui/button'
import { Input } from '@/components/ui/input'
import { Label } from '@/components/ui/label'
import { saveGlobalTarget } from '@/services/global-targets'
import { useToast } from '@/hooks/use-toast'
import { extractFieldErrors, type FieldErrors } from '@/lib/pocketbase/errors'
import { Loader2, Globe } from 'lucide-react'
import type { GlobalTargetRecord } from '@/types/service_record'

interface GlobalTargetDialogProps {
  open: boolean
  onOpenChange: (open: boolean) => void
  current: GlobalTargetRecord | null
  onSaved: (target: GlobalTargetRecord) => void
}

export function GlobalTargetDialog({
  open,
  onOpenChange,
  current,
  onSaved,
}: GlobalTargetDialogProps) {
  const { toast } = useToast()
  const [monthlyTarget, setMonthlyTarget] = useState('')
  const [minResolution, setMinResolution] = useState('')
  const [saving, setSaving] = useState(false)
  const [fieldErrors, setFieldErrors] = useState<FieldErrors>({})

  useEffect(() => {
    if (open) {
      setMonthlyTarget(
        current && current.monthly_attendance_target != null
          ? String(current.monthly_attendance_target)
          : '',
      )
      setMinResolution(
        current && current.min_resolution_rate != null ? String(current.min_resolution_rate) : '',
      )
      setFieldErrors({})
    }
  }, [open, current])

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault()
    const monthly = Number(monthlyTarget)
    const resolution = Number(minResolution)

    if (!monthlyTarget || isNaN(monthly) || monthly < 0) {
      setFieldErrors({ monthly_attendance_target: 'Informe uma meta válida' })
      return
    }
    if (!minResolution || isNaN(resolution) || resolution < 0 || resolution > 100) {
      setFieldErrors({ min_resolution_rate: 'Informe um percentual entre 0 e 100' })
      return
    }

    setSaving(true)
    setFieldErrors({})
    try {
      const saved = await saveGlobalTarget(
        {
          monthly_attendance_target: monthly,
          min_resolution_rate: resolution,
        },
        current,
      )
      toast({ title: 'Meta global salva com sucesso!' })
      onSaved(saved)
      onOpenChange(false)
    } catch (err) {
      setFieldErrors(extractFieldErrors(err))
      toast({ variant: 'destructive', title: 'Erro ao salvar meta global' })
    } finally {
      setSaving(false)
    }
  }

  return (
    <Dialog open={open} onOpenChange={onOpenChange}>
      <DialogContent className="sm:max-w-[440px]">
        <DialogHeader>
          <DialogTitle className="flex items-center gap-2 text-indigo-950 font-bold">
            <Globe className="h-5 w-5 text-indigo-600" />
            Meta Global (Padrão)
          </DialogTitle>
        </DialogHeader>
        <form onSubmit={handleSubmit} className="space-y-3">
          <p className="text-[11px] text-slate-500 leading-relaxed">
            Estas metas padrão se aplicam automaticamente a todos os colaboradores (consultores) que{' '}
            <strong>não</strong> possuam meta individual cadastrada. A meta individual sempre
            prevalece sobre a global.
          </p>

          <div className="space-y-1">
            <Label className="text-xs">Meta mensal de atendimentos *</Label>
            <Input
              className="h-9 text-xs"
              type="number"
              min={0}
              value={monthlyTarget}
              onChange={(e) => setMonthlyTarget(e.target.value)}
              placeholder="Ex.: 100"
            />
            {fieldErrors.monthly_attendance_target && (
              <p className="text-xs text-red-500">{fieldErrors.monthly_attendance_target}</p>
            )}
          </div>

          <div className="space-y-1">
            <Label className="text-xs">% mínima de resolução *</Label>
            <Input
              className="h-9 text-xs"
              type="number"
              min={0}
              max={100}
              value={minResolution}
              onChange={(e) => setMinResolution(e.target.value)}
              placeholder="Ex.: 80"
            />
            {fieldErrors.min_resolution_rate && (
              <p className="text-xs text-red-500">{fieldErrors.min_resolution_rate}</p>
            )}
          </div>

          <div className="flex justify-end gap-2 pt-2">
            <Button type="button" variant="outline" onClick={() => onOpenChange(false)}>
              Cancelar
            </Button>
            <Button type="submit" disabled={saving} className="bg-indigo-600 hover:bg-indigo-700">
              {saving && <Loader2 className="h-4 w-4 mr-1 animate-spin" />}
              Salvar
            </Button>
          </div>
        </form>
      </DialogContent>
    </Dialog>
  )
}
