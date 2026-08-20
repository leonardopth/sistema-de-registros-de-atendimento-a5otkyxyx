import { useState, useEffect } from 'react'
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
import { createUserTarget, updateUserTarget, type UserTargetRecord } from '@/services/user-targets'
import type { UserRecord } from '@/types/service_record'
import { Target, Loader2 } from 'lucide-react'
import { useToast } from '@/hooks/use-toast'

interface UserTargetDialogProps {
  open: boolean
  onOpenChange: (open: boolean) => void
  users: UserRecord[]
  editingTarget: UserTargetRecord | null
  existingUserIds: string[]
  onSaved: (target: UserTargetRecord, isEdit: boolean) => void
}

export function UserTargetDialog({
  open,
  onOpenChange,
  users,
  editingTarget,
  existingUserIds,
  onSaved,
}: UserTargetDialogProps) {
  const { toast } = useToast()
  const [userId, setUserId] = useState('')
  const [attendanceTarget, setAttendanceTarget] = useState('100')
  const [minResolutionRate, setMinResolutionRate] = useState('80')
  const [avgResponseTime, setAvgResponseTime] = useState('15')
  const [autoCategorizationTarget, setAutoCategorizationTarget] = useState('80')
  const [minSatisfactionTarget, setMinSatisfactionTarget] = useState('85')
  const [saving, setSaving] = useState(false)

  const isEdit = Boolean(editingTarget)

  useEffect(() => {
    if (editingTarget) {
      setUserId(editingTarget.user)
      setAttendanceTarget(String(editingTarget.monthly_attendance_target ?? 100))
      setMinResolutionRate(String(editingTarget.min_resolution_rate ?? 80))
      setAvgResponseTime(String(editingTarget.avg_response_time_target ?? 15))
      setAutoCategorizationTarget(String(editingTarget.auto_categorization_target ?? 80))
      setMinSatisfactionTarget(String(editingTarget.min_satisfaction_target ?? 85))
    } else {
      const available = users.filter((u) => !existingUserIds.includes(u.id))
      setUserId(available[0]?.id || '')
      setAttendanceTarget('100')
      setMinResolutionRate('80')
      setAvgResponseTime('15')
      setAutoCategorizationTarget('80')
      setMinSatisfactionTarget('85')
    }
  }, [editingTarget, open, users, existingUserIds])

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault()
    if (!userId) {
      toast({ variant: 'destructive', title: 'Selecione um colaborador' })
      return
    }
    const attendance = Number(attendanceTarget)
    const rate = Number(minResolutionRate)
    const respTime = Number(avgResponseTime)
    const autoCat = Number(autoCategorizationTarget)
    const satisf = Number(minSatisfactionTarget)

    if (isNaN(attendance) || attendance < 0) {
      toast({ variant: 'destructive', title: 'Meta de volume de atendimentos inválida' })
      return
    }
    if (isNaN(respTime) || respTime <= 0) {
      toast({ variant: 'destructive', title: 'Tempo médio de resposta alvo inválido' })
      return
    }
    if (isNaN(autoCat) || autoCat < 0 || autoCat > 100) {
      toast({ variant: 'destructive', title: 'Meta de categorização deve estar entre 0 e 100%' })
      return
    }
    if (isNaN(satisf) || satisf < 0 || satisf > 100) {
      toast({ variant: 'destructive', title: 'Meta de satisfação deve estar entre 0 e 100' })
      return
    }
    if (isNaN(rate) || rate < 0 || rate > 100) {
      toast({ variant: 'destructive', title: 'Taxa mínima deve estar entre 0 e 100%' })
      return
    }

    setSaving(true)
    try {
      if (isEdit && editingTarget) {
        const updated = await updateUserTarget(editingTarget.id, {
          monthly_attendance_target: attendance,
          min_resolution_rate: rate,
          avg_response_time_target: respTime,
          auto_categorization_target: autoCat,
          min_satisfaction_target: satisf,
        })
        toast({ title: 'Meta do colaborador atualizada!' })
        onSaved(updated, true)
      } else {
        const created = await createUserTarget({
          user: userId,
          monthly_attendance_target: attendance,
          min_resolution_rate: rate,
          avg_response_time_target: respTime,
          auto_categorization_target: autoCat,
          min_satisfaction_target: satisf,
        })
        toast({ title: 'Meta individual cadastrada!' })
        onSaved(created, false)
      }
      onOpenChange(false)
    } catch (err) {
      console.error(err)
      toast({ variant: 'destructive', title: 'Erro ao salvar meta' })
    } finally {
      setSaving(false)
    }
  }

  const availableUsers = isEdit ? users : users.filter((u) => !existingUserIds.includes(u.id))

  return (
    <Dialog open={open} onOpenChange={onOpenChange}>
      <DialogContent className="sm:max-w-[440px]">
        <DialogHeader>
          <DialogTitle className="flex items-center gap-2 text-indigo-950 font-bold">
            <Target className="h-5 w-5 text-indigo-600" />
            {isEdit ? 'Editar Meta de Colaborador' : 'Nova Meta Individual de Colaborador'}
          </DialogTitle>
        </DialogHeader>
        <form onSubmit={handleSubmit} className="space-y-4">
          <div className="space-y-1.5">
            <Label className="text-xs">Colaborador *</Label>
            {isEdit ? (
              <p className="text-xs font-semibold text-slate-800 p-2 bg-slate-50 border rounded-md">
                {users.find((u) => u.id === userId)?.name || 'Colaborador selecionado'}
              </p>
            ) : (
              <Select value={userId} onValueChange={setUserId}>
                <SelectTrigger className="h-9 text-xs">
                  <SelectValue placeholder="Selecione um colaborador" />
                </SelectTrigger>
                <SelectContent>
                  {availableUsers.map((u) => (
                    <SelectItem key={u.id} value={u.id} className="text-xs">
                      {u.name} ({u.role})
                    </SelectItem>
                  ))}
                  {availableUsers.length === 0 && (
                    <SelectItem value="_none" disabled className="text-xs text-slate-400">
                      Todos os colaboradores já possuem meta individual
                    </SelectItem>
                  )}
                </SelectContent>
              </Select>
            )}
          </div>

          <div className="grid grid-cols-2 gap-3">
            <div className="space-y-1.5">
              <Label className="text-xs">Volume Mensal (Atendimentos) *</Label>
              <Input
                type="number"
                min="0"
                className="h-9 text-xs"
                value={attendanceTarget}
                onChange={(e) => setAttendanceTarget(e.target.value)}
                placeholder="Ex: 120"
                required
              />
            </div>
            <div className="space-y-1.5">
              <Label className="text-xs">Tempo Médio Máximo (min) *</Label>
              <Input
                type="number"
                min="1"
                className="h-9 text-xs"
                value={avgResponseTime}
                onChange={(e) => setAvgResponseTime(e.target.value)}
                placeholder="Ex: 15"
                required
              />
            </div>
          </div>

          <div className="grid grid-cols-2 gap-3">
            <div className="space-y-1.5">
              <Label className="text-xs">Categorização Automática (%) *</Label>
              <Input
                type="number"
                min="0"
                max="100"
                className="h-9 text-xs"
                value={autoCategorizationTarget}
                onChange={(e) => setAutoCategorizationTarget(e.target.value)}
                placeholder="Ex: 80"
                required
              />
            </div>
            <div className="space-y-1.5">
              <Label className="text-xs">Satisfação Mínima (0-100) *</Label>
              <Input
                type="number"
                min="0"
                max="100"
                className="h-9 text-xs"
                value={minSatisfactionTarget}
                onChange={(e) => setMinSatisfactionTarget(e.target.value)}
                placeholder="Ex: 85"
                required
              />
            </div>
          </div>

          <div className="space-y-1.5">
            <Label className="text-xs">% Mínima de Resolução</Label>
            <Input
              type="number"
              min="0"
              max="100"
              className="h-9 text-xs"
              value={minResolutionRate}
              onChange={(e) => setMinResolutionRate(e.target.value)}
              placeholder="Ex: 80"
            />
          </div>

          <DialogFooter>
            <Button type="button" variant="outline" size="sm" onClick={() => onOpenChange(false)}>
              Cancelar
            </Button>
            <Button
              type="submit"
              size="sm"
              disabled={saving || (!isEdit && availableUsers.length === 0)}
              className="bg-indigo-600 hover:bg-indigo-700"
            >
              {saving && <Loader2 className="h-4 w-4 mr-1.5 animate-spin" />}
              Salvar Meta
            </Button>
          </DialogFooter>
        </form>
      </DialogContent>
    </Dialog>
  )
}
