import { useState, useEffect, useMemo } from 'react'
import {
  Dialog,
  DialogContent,
  DialogHeader,
  DialogTitle,
  DialogFooter,
} from '@/components/ui/dialog'
import { Button } from '@/components/ui/button'
import { Input } from '@/components/ui/input'
import { Checkbox } from '@/components/ui/checkbox'
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from '@/components/ui/select'
import { Loader2, Share2, Search } from 'lucide-react'
import { getUsers } from '@/services/users'
import { createShare, getSharesByRecord } from '@/services/service_record_shares'
import { UserRecord, UserRole } from '@/types/service_record'
import { useAuth } from '@/hooks/use-auth'
import { useToast } from '@/hooks/use-toast'

const SHAREABLE_ROLES: UserRole[] = ['Gerentes', 'Supervisores', 'Líderes', 'Consultores']

interface ShareDialogProps {
  recordId: string
  open: boolean
  onOpenChange: (open: boolean) => void
  onSuccess?: () => void
}

export function ShareDialog({ recordId, open, onOpenChange, onSuccess }: ShareDialogProps) {
  const { user } = useAuth()
  const { toast } = useToast()
  const [users, setUsers] = useState<UserRecord[]>([])
  const [selectedIds, setSelectedIds] = useState<string[]>([])
  const [permission, setPermission] = useState<'Visualizar' | 'Editar'>('Visualizar')
  const [search, setSearch] = useState('')
  const [loading, setLoading] = useState(false)
  const [existingShareUserIds, setExistingShareUserIds] = useState<string[]>([])

  useEffect(() => {
    if (open) {
      getUsers()
        .then((all) => {
          setUsers(all.filter((u) => SHAREABLE_ROLES.includes(u.role) && u.id !== user?.id))
        })
        .catch(() => {})
      getSharesByRecord(recordId)
        .then((shares) => setExistingShareUserIds(shares.map((s) => s.user)))
        .catch(() => {})
      setSelectedIds([])
      setPermission('Visualizar')
      setSearch('')
    }
  }, [open, recordId, user?.id])

  const filteredUsers = useMemo(() => {
    if (!search) return users
    return users.filter((u) => u.name.toLowerCase().includes(search.toLowerCase()))
  }, [users, search])

  const toggleUser = (id: string) => {
    setSelectedIds((prev) => (prev.includes(id) ? prev.filter((i) => i !== id) : [...prev, id]))
  }

  const handleShare = async () => {
    if (selectedIds.length === 0) {
      toast({ variant: 'destructive', title: 'Selecione ao menos um usuário' })
      return
    }
    setLoading(true)
    try {
      await Promise.all(
        selectedIds.map((userId) =>
          createShare({
            service_record: recordId,
            user: userId,
            shared_by: user?.id || '',
            permission,
          }),
        ),
      )
      toast({
        title: 'Atendimento compartilhado',
        description: `${selectedIds.length} usuário(s) adicionado(s).`,
      })
      onOpenChange(false)
      onSuccess?.()
    } catch {
      toast({ variant: 'destructive', title: 'Erro ao compartilhar' })
    } finally {
      setLoading(false)
    }
  }

  return (
    <Dialog open={open} onOpenChange={onOpenChange}>
      <DialogContent className="sm:max-w-[480px]">
        <DialogHeader>
          <DialogTitle className="flex items-center gap-2">
            <Share2 className="h-5 w-5" /> Compartilhar Atendimento
          </DialogTitle>
        </DialogHeader>
        <div className="space-y-4">
          <div className="space-y-2">
            <span className="text-xs font-semibold">Nível de Permissão</span>
            <Select
              value={permission}
              onValueChange={(v) => setPermission(v as 'Visualizar' | 'Editar')}
            >
              <SelectTrigger className="h-9">
                <SelectValue />
              </SelectTrigger>
              <SelectContent>
                <SelectItem value="Visualizar">Visualizar (somente leitura)</SelectItem>
                <SelectItem value="Editar">Editar (pode alterar)</SelectItem>
              </SelectContent>
            </Select>
          </div>
          <div className="space-y-2">
            <span className="text-xs font-semibold">Selecionar Usuários</span>
            <div className="relative">
              <Search className="absolute left-2.5 top-2 h-4 w-4 text-slate-400" />
              <Input
                placeholder="Buscar usuário..."
                value={search}
                onChange={(e) => setSearch(e.target.value)}
                className="pl-8 h-9 text-sm"
              />
            </div>
            <div className="max-h-[240px] overflow-y-auto space-y-1 border rounded-md p-2">
              {filteredUsers.map((u) => (
                <label
                  key={u.id}
                  className="flex items-center gap-2 p-1.5 hover:bg-slate-50 rounded cursor-pointer text-sm"
                >
                  <Checkbox
                    checked={selectedIds.includes(u.id)}
                    onCheckedChange={() => toggleUser(u.id)}
                    disabled={existingShareUserIds.includes(u.id)}
                  />
                  <span className="flex-1">{u.name}</span>
                  <span className="text-xs text-slate-400">{u.role}</span>
                  {existingShareUserIds.includes(u.id) && (
                    <span className="text-[10px] text-emerald-600">já compartilhado</span>
                  )}
                </label>
              ))}
              {filteredUsers.length === 0 && (
                <p className="text-xs text-slate-400 text-center py-4">
                  Nenhum usuário encontrado.
                </p>
              )}
            </div>
          </div>
        </div>
        <DialogFooter>
          <Button variant="outline" onClick={() => onOpenChange(false)}>
            Cancelar
          </Button>
          <Button onClick={handleShare} disabled={loading || selectedIds.length === 0}>
            {loading && <Loader2 className="h-4 w-4 animate-spin mr-2" />}
            Compartilhar ({selectedIds.length})
          </Button>
        </DialogFooter>
      </DialogContent>
    </Dialog>
  )
}
