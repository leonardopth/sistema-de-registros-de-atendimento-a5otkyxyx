import { useState } from 'react'
import {
  Dialog,
  DialogContent,
  DialogHeader,
  DialogTitle,
  DialogFooter,
} from '@/components/ui/dialog'
import { Button } from '@/components/ui/button'
import { Textarea } from '@/components/ui/textarea'
import { Label } from '@/components/ui/label'
import { Loader2, Ban } from 'lucide-react'

interface BlockClientDialogProps {
  open: boolean
  onOpenChange: (open: boolean) => void
  clientName: string
  onConfirm: (reason: string) => Promise<void>
}

export function BlockClientDialog({
  open,
  onOpenChange,
  clientName,
  onConfirm,
}: BlockClientDialogProps) {
  const [reason, setReason] = useState('')
  const [error, setError] = useState('')
  const [loading, setLoading] = useState(false)

  const handleConfirm = async () => {
    if (!reason.trim()) {
      setError('Motivo é obrigatório')
      return
    }
    setError('')
    setLoading(true)
    try {
      await onConfirm(reason.trim())
      setReason('')
      onOpenChange(false)
    } catch {
      setError('Erro ao bloquear cliente. Tente novamente.')
    } finally {
      setLoading(false)
    }
  }

  const handleClose = (v: boolean) => {
    if (!v) {
      setReason('')
      setError('')
    }
    onOpenChange(v)
  }

  return (
    <Dialog open={open} onOpenChange={handleClose}>
      <DialogContent className="sm:max-w-[440px]">
        <DialogHeader>
          <DialogTitle className="flex items-center gap-2 text-indigo-950">
            <Ban className="h-5 w-5 text-red-500" />
            Bloquear Cliente
          </DialogTitle>
        </DialogHeader>
        <div className="space-y-3 py-2">
          <p className="text-sm text-slate-600">
            Você está prestes a bloquear <strong>{clientName}</strong>. Informe o motivo do
            bloqueio.
          </p>
          <div className="space-y-1.5">
            <Label htmlFor="block-reason">
              Motivo do Bloqueio <span className="text-red-500">*</span>
            </Label>
            <Textarea
              id="block-reason"
              rows={3}
              value={reason}
              onChange={(e) => {
                setReason(e.target.value)
                setError('')
              }}
              placeholder="Descreva o motivo do bloqueio..."
            />
            {error && <p className="text-xs text-red-500">{error}</p>}
          </div>
        </div>
        <DialogFooter>
          <Button type="button" variant="outline" onClick={() => handleClose(false)}>
            Cancelar
          </Button>
          <Button
            type="button"
            onClick={handleConfirm}
            disabled={loading}
            className="bg-red-600 hover:bg-red-700 text-white"
          >
            {loading && <Loader2 className="mr-2 h-4 w-4 animate-spin" />}
            Bloquear
          </Button>
        </DialogFooter>
      </DialogContent>
    </Dialog>
  )
}
