import {
  Dialog,
  DialogContent,
  DialogHeader,
  DialogTitle,
  DialogFooter,
} from '@/components/ui/dialog'
import { Button } from '@/components/ui/button'
import { Loader2, Trash2, AlertTriangle } from 'lucide-react'

interface DeleteClientDialogProps {
  open: boolean
  onOpenChange: (open: boolean) => void
  clientName: string
  onConfirm: () => Promise<void>
  loading?: boolean
}

export function DeleteClientDialog({
  open,
  onOpenChange,
  clientName,
  onConfirm,
  loading,
}: DeleteClientDialogProps) {
  const handleConfirm = async () => {
    await onConfirm()
    onOpenChange(false)
  }

  return (
    <Dialog open={open} onOpenChange={onOpenChange}>
      <DialogContent className="sm:max-w-[440px]">
        <DialogHeader>
          <DialogTitle className="flex items-center gap-2 text-indigo-950">
            <AlertTriangle className="h-5 w-5 text-red-500" />
            Excluir Cliente
          </DialogTitle>
        </DialogHeader>
        <div className="py-2">
          <p className="text-sm text-slate-600">
            Tem certeza que deseja excluir <strong>{clientName}</strong>? Esta ação não pode ser
            desfeita e todos os dados relacionados serão perdidos.
          </p>
        </div>
        <DialogFooter>
          <Button type="button" variant="outline" onClick={() => onOpenChange(false)}>
            Cancelar
          </Button>
          <Button
            type="button"
            onClick={handleConfirm}
            disabled={loading}
            className="bg-red-600 hover:bg-red-700 text-white"
          >
            {loading ? (
              <Loader2 className="mr-2 h-4 w-4 animate-spin" />
            ) : (
              <Trash2 className="mr-2 h-4 w-4" />
            )}
            Excluir
          </Button>
        </DialogFooter>
      </DialogContent>
    </Dialog>
  )
}
