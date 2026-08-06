import { useState, useMemo, useEffect } from 'react'
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
import { Search, Share2 } from 'lucide-react'
import type { UserRecord, UserRole } from '@/types/service_record'

const SHAREABLE_ROLES: UserRole[] = ['Gerentes', 'Supervisores', 'Líderes', 'Consultores']

interface ShareSelectDialogProps {
  open: boolean
  onOpenChange: (open: boolean) => void
  users: UserRecord[]
  selectedIds: string[]
  currentUserId?: string
  onConfirm: (ids: string[]) => void
}

export function ShareSelectDialog({
  open,
  onOpenChange,
  users,
  selectedIds,
  currentUserId,
  onConfirm,
}: ShareSelectDialogProps) {
  const [tempSelected, setTempSelected] = useState<string[]>([])
  const [search, setSearch] = useState('')

  useEffect(() => {
    if (open) {
      setTempSelected(selectedIds)
      setSearch('')
    }
  }, [open, selectedIds])

  const filteredUsers = useMemo(() => {
    const eligible = users.filter((u) => SHAREABLE_ROLES.includes(u.role) && u.id !== currentUserId)
    if (!search) return eligible
    return eligible.filter((u) => u.name.toLowerCase().includes(search.toLowerCase()))
  }, [users, search, currentUserId])

  const toggleUser = (id: string) => {
    setTempSelected((prev) => (prev.includes(id) ? prev.filter((i) => i !== id) : [...prev, id]))
  }

  const handleConfirm = () => {
    onConfirm(tempSelected)
  }

  return (
    <Dialog open={open} onOpenChange={onOpenChange}>
      <DialogContent className="sm:max-w-[480px]">
        <DialogHeader>
          <DialogTitle className="flex items-center gap-2">
            <Share2 className="h-5 w-5" /> Compartilhar Atendimento
          </DialogTitle>
        </DialogHeader>
        <div className="space-y-3">
          <div className="relative">
            <Search className="absolute left-2.5 top-2 h-4 w-4 text-slate-400" />
            <Input
              placeholder="Buscar usuário..."
              value={search}
              onChange={(e) => setSearch(e.target.value)}
              className="pl-8 h-9 text-sm"
            />
          </div>
          <div className="max-h-[280px] overflow-y-auto space-y-1 border rounded-md p-2">
            {filteredUsers.map((u) => (
              <label
                key={u.id}
                className="flex items-center gap-2 p-1.5 hover:bg-slate-50 rounded cursor-pointer text-sm"
              >
                <Checkbox
                  checked={tempSelected.includes(u.id)}
                  onCheckedChange={() => toggleUser(u.id)}
                />
                <span className="flex-1">{u.name}</span>
                <span className="text-xs text-slate-400">{u.role}</span>
              </label>
            ))}
            {filteredUsers.length === 0 && (
              <p className="text-xs text-slate-400 text-center py-4">Nenhum usuário encontrado.</p>
            )}
          </div>
        </div>
        <DialogFooter>
          <Button variant="outline" onClick={() => onOpenChange(false)}>
            Cancelar
          </Button>
          <Button onClick={handleConfirm} disabled={tempSelected.length === 0}>
            Confirmar ({tempSelected.length})
          </Button>
        </DialogFooter>
      </DialogContent>
    </Dialog>
  )
}
