import { useState, useEffect } from 'react'
import {
  getSharesByRecord,
  updateSharePermission,
  deleteShare,
} from '@/services/service_record_shares'
import { ServiceRecordShare } from '@/types/service_record'
import { useRealtime } from '@/hooks/use-realtime'
import { useToast } from '@/hooks/use-toast'
import { Button } from '@/components/ui/button'
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from '@/components/ui/select'
import { Loader2, Trash2, User, Share2 } from 'lucide-react'
import { format } from 'date-fns'
import { ptBR } from 'date-fns/locale'

interface SharedUsersListProps {
  recordId: string
}

export function SharedUsersList({ recordId }: SharedUsersListProps) {
  const [shares, setShares] = useState<ServiceRecordShare[]>([])
  const [loading, setLoading] = useState(true)
  const { toast } = useToast()

  const loadData = async () => {
    try {
      const data = await getSharesByRecord(recordId)
      setShares(data)
    } catch {
      setShares([])
    } finally {
      setLoading(false)
    }
  }

  useEffect(() => {
    if (recordId) {
      setLoading(true)
      loadData()
    }
  }, [recordId])

  useRealtime('service_record_shares', () => loadData(), !!recordId)

  const handlePermissionChange = async (shareId: string, permission: 'Visualizar' | 'Editar') => {
    try {
      await updateSharePermission(shareId, permission)
      toast({ title: 'Permissão atualizada' })
    } catch {
      toast({ variant: 'destructive', title: 'Erro ao atualizar permissão' })
    }
  }

  const handleRevoke = async (shareId: string, userName: string) => {
    if (!confirm(`Revogar acesso de ${userName}?`)) return
    try {
      await deleteShare(shareId)
      toast({ title: 'Acesso revogado', description: userName })
    } catch {
      toast({ variant: 'destructive', title: 'Erro ao revogar acesso' })
    }
  }

  if (loading) {
    return (
      <div className="flex justify-center py-4">
        <Loader2 className="h-4 w-4 animate-spin text-slate-400" />
      </div>
    )
  }

  if (shares.length === 0) {
    return (
      <div className="flex flex-col items-center py-4 text-center">
        <Share2 className="h-6 w-6 text-slate-300 mb-1" />
        <p className="text-xs text-slate-400">Nenhum usuário compartilhado.</p>
      </div>
    )
  }

  return (
    <div className="space-y-1.5">
      {shares.map((share) => (
        <div
          key={share.id}
          className="flex items-center gap-2 p-2 bg-slate-50 rounded border border-slate-100"
        >
          <div className="flex-1 flex flex-col gap-0.5">
            <div className="flex items-center gap-1.5 text-xs font-medium text-slate-800">
              <User className="h-3 w-3 text-slate-400" />
              {share.expand?.account_executive?.name ||
                share.expand?.user?.name ||
                'Usuário / Executivo'}
              <span className="text-[10px] text-slate-400 font-normal">
                (
                {share.account_executive || share.expand?.account_executive
                  ? 'Executivo de Contas'
                  : share.expand?.user?.role || 'Colaborador'}
                )
              </span>
            </div>
            <div className="text-[10px] text-slate-500">
              Compartilhado por {share.expand?.shared_by?.name || '—'} em{' '}
              {share.created
                ? format(new Date(share.created), 'dd/MM/yyyy HH:mm', { locale: ptBR })
                : ''}
            </div>
          </div>
          {share.account_executive || share.expand?.account_executive ? (
            <span className="text-[11px] font-medium text-cyan-700 bg-cyan-50 border border-cyan-200 px-2.5 py-1 rounded">
              Apenas Visualizar
            </span>
          ) : (
            <Select
              value={share.permission}
              onValueChange={(v) => handlePermissionChange(share.id, v as 'Visualizar' | 'Editar')}
            >
              <SelectTrigger className="h-7 w-[120px] text-xs">
                <SelectValue />
              </SelectTrigger>
              <SelectContent>
                <SelectItem value="Visualizar">Visualizar</SelectItem>
                <SelectItem value="Editar">Editar</SelectItem>
              </SelectContent>
            </Select>
          )}
          <Button
            variant="ghost"
            size="icon"
            className="h-7 w-7 text-red-500 hover:text-red-700"
            onClick={() =>
              handleRevoke(
                share.id,
                share.expand?.account_executive?.name || share.expand?.user?.name || 'Destinatário',
              )
            }
          >
            <Trash2 className="h-3.5 w-3.5" />
          </Button>
        </div>
      ))}
    </div>
  )
}
