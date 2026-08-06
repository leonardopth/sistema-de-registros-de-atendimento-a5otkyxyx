import { useState, useEffect, useCallback } from 'react'
import { getMasterAccessHistory } from '@/services/master-access-history'
import { useRealtime } from '@/hooks/use-realtime'
import { useToast } from '@/hooks/use-toast'
import { Dialog, DialogContent, DialogHeader, DialogTitle } from '@/components/ui/dialog'
import { ScrollArea } from '@/components/ui/scroll-area'
import { Badge } from '@/components/ui/badge'
import { Crown, Loader2 } from 'lucide-react'
import { format } from 'date-fns'
import { ptBR } from 'date-fns/locale'
import type { MasterAccessHistory } from '@/types/master-access-history'

export function MasterAccessHistoryDialog({
  open,
  onOpenChange,
}: {
  open: boolean
  onOpenChange: (open: boolean) => void
}) {
  const { toast } = useToast()
  const [history, setHistory] = useState<MasterAccessHistory[]>([])
  const [loading, setLoading] = useState(true)

  const loadHistory = useCallback(async () => {
    try {
      const data = await getMasterAccessHistory()
      setHistory(data)
    } catch {
      toast({ variant: 'destructive', title: 'Erro ao carregar histórico' })
    } finally {
      setLoading(false)
    }
  }, [toast])

  useEffect(() => {
    if (open) loadHistory()
  }, [open, loadHistory])

  useRealtime('master_access_history', () => loadHistory())

  return (
    <Dialog open={open} onOpenChange={onOpenChange}>
      <DialogContent className="sm:max-w-[600px]">
        <DialogHeader>
          <DialogTitle className="flex items-center gap-2 text-base font-bold">
            <Crown className="h-4 w-4 text-amber-500" />
            Histórico de Acesso Master
          </DialogTitle>
        </DialogHeader>
        <ScrollArea className="h-[400px] rounded-lg border">
          {loading ? (
            <div className="flex justify-center py-8">
              <Loader2 className="h-6 w-6 animate-spin text-indigo-600" />
            </div>
          ) : history.length === 0 ? (
            <div className="flex flex-col items-center justify-center py-8 text-slate-400">
              <Crown className="h-8 w-8 mb-2 opacity-30" />
              <p className="text-sm">Nenhum registro encontrado.</p>
            </div>
          ) : (
            <div className="divide-y">
              {history.map((h) => (
                <div key={h.id} className="p-3 hover:bg-slate-50">
                  <div className="flex items-center justify-between">
                    <div className="flex items-center gap-2">
                      <Badge
                        className={
                          h.action === 'Concedido'
                            ? 'bg-green-100 text-green-700 hover:bg-green-100'
                            : 'bg-red-100 text-red-700 hover:bg-red-100'
                        }
                      >
                        {h.action}
                      </Badge>
                      <span className="text-sm font-medium text-slate-900">
                        {h.expand?.user?.name || 'Usuário'}
                      </span>
                    </div>
                    <span className="text-xs text-slate-400">
                      {format(new Date(h.created), "dd/MM/yyyy 'às' HH:mm", { locale: ptBR })}
                    </span>
                  </div>
                  <p className="text-xs text-slate-500 mt-1">
                    Por: {h.expand?.actioned_by?.name || 'Desconhecido'}
                  </p>
                </div>
              ))}
            </div>
          )}
        </ScrollArea>
      </DialogContent>
    </Dialog>
  )
}
