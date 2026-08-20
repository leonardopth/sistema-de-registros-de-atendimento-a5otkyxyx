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
  const [avgResponseTime, setAvgResponseTime] = useState('15')
  const [autoCategorization, setAutoCategorization] = useState('80')
  const [minSatisfaction, setMinSatisfaction] = useState('85')
  const [saving, setSaving] = useState(false)
  const [fieldErrors, setFieldErrors] = useState<FieldErrors>({})

  useEffect(() => {
    if (open) {
      setMonthlyTarget(
        current && current.monthly_attendance_target != null
          ? String(current.monthly_attendance_target)
          : '100',
      )
      setMinResolution(
        current && current.min_resolution_rate != null ? String(current.min_resolution_rate) : '80',
      )
      setAvgResponseTime(
        current && current.avg_response_time_target != null
          ? String(current.avg_response_time_target)
          : '15',
      )
      setAutoCategorization(
        current && current.auto_categorization_target != null
          ? String(current.auto_categorization_target)
          : '80',
      )
      setMinSatisfaction(
        current && current.min_satisfaction_target != null
          ? String(current.min_satisfaction_target)
          : '85',
      )
      setFieldErrors({})
    }
  }, [open, current])

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault()
    const monthly = Number(monthlyTarget)
    const resolution = Number(minResolution)
    const respTime = Number(avgResponseTime)
    const autoCat = Number(autoCategorization)
    const satisf = Number(minSatisfaction)

    if (!monthlyTarget || isNaN(monthly) || monthly < 0) {
      setFieldErrors({ monthly_attendance_target: 'Informe uma meta válida' })
      return
    }
    if (isNaN(respTime) || respTime <= 0) {
      setFieldErrors({ avg_response_time_target: 'Informe um tempo médio válido' })
      return
    }
    if (isNaN(autoCat) || autoCat < 0 || autoCat > 100) {
      setFieldErrors({ auto_categorization_target: 'Informe um percentual entre 0 e 100' })
      return
    }
    if (isNaN(satisf) || satisf < 0 || satisf > 100) {
      setFieldErrors({ min_satisfaction_target: 'Informe um valor entre 0 e 100' })
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
          avg_response_time_target: respTime,
          auto_categorization_target: autoCat,
          min_satisfaction_target: satisf,
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
      <DialogContent className="sm:max-w-[480px]">
        <DialogHeader>
          <DialogTitle className="flex items-center gap-2 text-indigo-950 font-bold">
            <Globe className="h-5 w-5 text-indigo-600" />
            Meta Global (Padrão para Colaboradores)
          </DialogTitle>
        </DialogHeader>
        <form onSubmit={handleSubmit} className="space-y-3">
          <p className="text-[11px] text-slate-500 leading-relaxed">
            Estas metas padrão se aplicam automaticamente a todos os colaboradores (consultores) que{' '}
            <strong>não</strong> possuam meta individual cadastrada. A meta individual sempre
            prevalece sobre a global.
          </p>

          <div className="grid grid-cols-2 gap-3">
            <div className="space-y-1">
              <Label className="text-xs">Volume Mensal (Atendimentos) *</Label>
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
              <Label className="text-xs">Tempo Médio Máximo (min) *</Label>
              <Input
                className="h-9 text-xs"
                type="number"
                min={1}
                value={avgResponseTime}
                onChange={(e) => setAvgResponseTime(e.target.value)}
                placeholder="Ex.: 15"
              />
              {fieldErrors.avg_response_time_target && (
                <p className="text-xs text-red-500">{fieldErrors.avg_response_time_target}</p>
              )}
            </div>
          </div>

          <div className="grid grid-cols-2 gap-3">
            <div className="space-y-1">
              <Label className="text-xs">Categorização Automática (%) *</Label>
              <Input
                className="h-9 text-xs"
                type="number"
                min={0}
                max={100}
                value={autoCategorization}
                onChange={(e) => setAutoCategorization(e.target.value)}
                placeholder="Ex.: 80"
              />
              {fieldErrors.auto_categorization_target && (
                <p className="text-xs text-red-500">{fieldErrors.auto_categorization_target}</p>
              )}
            </div>

            <div className="space-y-1">
              <Label className="text-xs">Satisfação do Cliente (0-100) *</Label>
              <Input
                className="h-9 text-xs"
                type="number"
                min={0}
                max={100}
                value={minSatisfaction}
                onChange={(e) => setMinSatisfaction(e.target.value)}
                placeholder="Ex.: 85"
              />
              {fieldErrors.min_satisfaction_target && (
                <p className="text-xs text-red-500">{fieldErrors.min_satisfaction_target}</p>
              )}
            </div>
          </div>

          <div className="space-y-1">
            <Label className="text-xs">% Mínima de Resolução *</Label>
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
              Salvar Meta Global
            </Button>
          </div>
        </form>
      </DialogContent>
    </Dialog>
  )
}
