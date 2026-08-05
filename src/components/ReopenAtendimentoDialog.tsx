import { useState, useEffect } from 'react'
import {
  Dialog,
  DialogContent,
  DialogHeader,
  DialogTitle,
  DialogFooter,
} from '@/components/ui/dialog'
import { Button } from '@/components/ui/button'
import { Label } from '@/components/ui/label'
import { Textarea } from '@/components/ui/textarea'
import { Loader2, RotateCcw } from 'lucide-react'

interface ReopenAtendimentoDialogProps {
  open: boolean
  onOpenChange: (open: boolean) => void
  onConfirm: (justification: string) => Promise<void>
  loading: boolean
}

export function ReopenAtendimentoDialog({
  open,
  onOpenChange,
  onConfirm,
  loading,
}: ReopenAtendimentoDialogProps) {
  const [justification, setJustification] = useState('')

  useEffect(() => {
    if (open) setJustification('')
  }, [open])

  const handleConfirm = async () => {
    if (!justification.trim()) return
    await onConfirm(justification.trim())
  }

  return (
    <Dialog open={open} onOpenChange={onOpenChange}>
      <DialogContent className="sm:max-w-[440px]">
        <DialogHeader>
          <DialogTitle className="flex items-center gap-2 text-indigo-950">
            <RotateCcw className="h-5 w-5 text-indigo-600" />
            Reabrir Atendimento
          </DialogTitle>
        </DialogHeader>
        <div className="space-y-2 py-2">
          <Label className="text-xs font-semibold text-slate-700">
            Justificativa <span className="text-red-500">*</span>
          </Label>
          <Textarea
            rows={3}
            value={justification}
            onChange={(e) => setJustification(e.target.value)}
            placeholder="Informe o motivo da reabertura do atendimento..."
            className="text-sm"
          />
          {!justification.trim() && (
            <p className="text-xs text-slate-400">
              A justificativa é obrigatória para reabrir o atendimento.
            </p>
          )}
        </div>
        <DialogFooter>
          <Button variant="outline" onClick={() => onOpenChange(false)} disabled={loading}>
            Cancelar
          </Button>
          <Button
            onClick={handleConfirm}
            disabled={!justification.trim() || loading}
            className="bg-indigo-600 hover:bg-indigo-700"
          >
            {loading ? (
              <Loader2 className="h-4 w-4 mr-1.5 animate-spin" />
            ) : (
              <RotateCcw className="h-4 w-4 mr-1.5" />
            )}
            Confirmar Reabertura
          </Button>
        </DialogFooter>
      </DialogContent>
    </Dialog>
  )
}
