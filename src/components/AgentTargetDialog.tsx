import { useEffect, useState } from 'react'
import { Dialog, DialogContent, DialogHeader, DialogTitle } from '@/components/ui/dialog'
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
import { createAgentTarget, updateAgentTarget } from '@/services/agent-targets'
import { useToast } from '@/hooks/use-toast'
import { extractFieldErrors, type FieldErrors } from '@/lib/pocketbase/errors'
import { Loader2, Target } from 'lucide-react'
import type { AgentRecord, AgentTargetRecord } from '@/types/service_record'

interface AgentTargetDialogProps {
  open: boolean
  onOpenChange: (open: boolean) => void
  agents: AgentRecord[]
  editingTarget?: AgentTargetRecord | null
  /** ids de agentes que já possuem meta (não podem ser selecionados novamente no modo criação) */
  existingAgentIds: string[]
  onSaved: (target: AgentTargetRecord, isEdit: boolean) => void
}

export function AgentTargetDialog({
  open,
  onOpenChange,
  agents,
  editingTarget,
  existingAgentIds,
  onSaved,
}: AgentTargetDialogProps) {
  const { toast } = useToast()
  const [agentId, setAgentId] = useState('')
  const [monthlyTarget, setMonthlyTarget] = useState('')
  const [minResolution, setMinResolution] = useState('')
  const [saving, setSaving] = useState(false)
  const [fieldErrors, setFieldErrors] = useState<FieldErrors>({})

  const isEdit = Boolean(editingTarget)

  useEffect(() => {
    if (open) {
      setAgentId(editingTarget?.agent || '')
      setMonthlyTarget(editingTarget ? String(editingTarget.monthly_attendance_target) : '')
      setMinResolution(editingTarget ? String(editingTarget.min_resolution_rate) : '')
      setFieldErrors({})
    }
  }, [open, editingTarget])

  const availableAgents = agents.filter((a) => isEdit || !existingAgentIds.includes(a.id))

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault()
    const monthly = Number(monthlyTarget)
    const resolution = Number(minResolution)

    if (!agentId) {
      setFieldErrors({ agent: 'Selecione um agente' })
      return
    }
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
      const payload = {
        agent: agentId,
        monthly_attendance_target: Math.round(monthly),
        min_resolution_rate: Math.round(resolution),
      }
      const saved = isEdit
        ? await updateAgentTarget(editingTarget!.id, payload)
        : await createAgentTarget(payload)
      toast({
        title: isEdit ? 'Meta atualizada com sucesso!' : 'Meta cadastrada com sucesso!',
      })
      onSaved(saved, isEdit)
      onOpenChange(false)
    } catch (err) {
      setFieldErrors(extractFieldErrors(err))
      toast({ variant: 'destructive', title: 'Erro ao salvar meta' })
    } finally {
      setSaving(false)
    }
  }

  return (
    <Dialog open={open} onOpenChange={onOpenChange}>
      <DialogContent className="sm:max-w-[440px]">
        <DialogHeader>
          <DialogTitle className="flex items-center gap-2 text-indigo-950 font-bold">
            <Target className="h-5 w-5 text-indigo-600" />
            {isEdit ? 'Editar Meta de Desempenho' : 'Nova Meta de Desempenho'}
          </DialogTitle>
        </DialogHeader>
        <form onSubmit={handleSubmit} className="space-y-3">
          <div className="space-y-1">
            <Label className="text-xs">Agente *</Label>
            <Select value={agentId} onValueChange={setAgentId} disabled={isEdit}>
              <SelectTrigger className="h-9 text-xs">
                <SelectValue placeholder="Selecione o agente" />
              </SelectTrigger>
              <SelectContent>
                {availableAgents.length === 0 ? (
                  <div className="px-2 py-1.5 text-xs text-slate-400">Nenhum agente disponível</div>
                ) : (
                  availableAgents.map((a) => (
                    <SelectItem key={a.id} value={a.id} className="text-xs">
                      {a.name}
                      {a.expand?.client_id ? ` — ${a.expand.client_id.name}` : ''}
                    </SelectItem>
                  ))
                )}
              </SelectContent>
            </Select>
            {fieldErrors.agent && <p className="text-xs text-red-500">{fieldErrors.agent}</p>}
          </div>

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
              {isEdit ? 'Salvar' : 'Cadastrar'}
            </Button>
          </div>
        </form>
      </DialogContent>
    </Dialog>
  )
}
