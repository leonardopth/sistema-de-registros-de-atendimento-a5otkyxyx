import { useState, useMemo } from 'react'
import {
  Dialog,
  DialogContent,
  DialogHeader,
  DialogTitle,
  DialogFooter,
} from '@/components/ui/dialog'
import { Button } from '@/components/ui/button'
import { Input } from '@/components/ui/input'
import { UserRecord } from '@/types/service_record'
import { User, Search, Check, ShieldAlert } from 'lucide-react'

interface ControlTowerAssignModalProps {
  emailId: string | null
  open: boolean
  onOpenChange: (open: boolean) => void
  users: UserRecord[]
  currentAssignedId?: string
  onAssign: (emailId: string, targetUserId: string) => void
}

export function ControlTowerAssignModal({
  emailId,
  open,
  onOpenChange,
  users,
  currentAssignedId,
  onAssign,
}: ControlTowerAssignModalProps) {
  const [search, setSearch] = useState('')
  const [selectedUser, setSelectedUser] = useState<string>(currentAssignedId || '')

  const filteredUsers = useMemo(() => {
    return users.filter((u) => {
      const q = search.toLowerCase()
      return (
        (u.name || '').toLowerCase().includes(q) ||
        (u.email || '').toLowerCase().includes(q) ||
        (u.role || '').toLowerCase().includes(q)
      )
    })
  }, [users, search])

  const handleConfirm = () => {
    if (!emailId) return
    onAssign(emailId, selectedUser)
    onOpenChange(false)
  }

  return (
    <Dialog open={open} onOpenChange={onOpenChange}>
      <DialogContent className="sm:max-w-[480px]">
        <DialogHeader>
          <DialogTitle className="flex items-center gap-2 text-indigo-950 text-base">
            <User className="h-5 w-5 text-indigo-600" />
            Atribuir Responsável (Ownership)
          </DialogTitle>
        </DialogHeader>

        <div className="space-y-3 py-2 text-xs">
          <div className="relative">
            <Search className="absolute left-2.5 top-2.5 h-3.5 w-3.5 text-slate-400" />
            <Input
              type="text"
              placeholder="Buscar colaborador por nome, cargo ou e-mail..."
              value={search}
              onChange={(e) => setSearch(e.target.value)}
              className="pl-8 h-8 text-xs"
            />
          </div>

          <div className="border border-slate-200 rounded-lg max-h-60 overflow-y-auto divide-y divide-slate-100">
            {/* Opção para desatribuir (fila livre) */}
            <button
              type="button"
              onClick={() => setSelectedUser('')}
              className={`w-full text-left p-2.5 flex items-center justify-between hover:bg-slate-50 transition-colors ${
                selectedUser === '' ? 'bg-indigo-50/50 font-bold text-indigo-900' : 'text-slate-700'
              }`}
            >
              <div>
                <span className="block font-semibold">Liberar na Fila (Sem Responsável)</span>
                <span className="text-[10px] text-slate-400">
                  Qualquer atendente poderá assumir
                </span>
              </div>
              {selectedUser === '' && <Check className="h-4 w-4 text-indigo-600" />}
            </button>

            {filteredUsers.map((u) => {
              const isSelected = selectedUser === u.id
              return (
                <button
                  key={u.id}
                  type="button"
                  onClick={() => setSelectedUser(u.id)}
                  className={`w-full text-left p-2.5 flex items-center justify-between hover:bg-slate-50 transition-colors ${
                    isSelected ? 'bg-indigo-50/60 text-indigo-950 font-semibold' : 'text-slate-700'
                  }`}
                >
                  <div className="min-w-0 pr-2">
                    <div className="flex items-center gap-1.5 truncate">
                      <span className="font-semibold truncate">{u.name}</span>
                      <span className="text-[10px] text-slate-400 font-normal">({u.role})</span>
                    </div>
                    <p className="text-[10px] text-slate-500 truncate">{u.email}</p>
                  </div>
                  {isSelected && <Check className="h-4 w-4 text-indigo-600 shrink-0" />}
                </button>
              )
            })}

            {filteredUsers.length === 0 && (
              <div className="p-4 text-center text-slate-400 text-xs">
                Nenhum colaborador encontrado.
              </div>
            )}
          </div>
        </div>

        <DialogFooter className="gap-2">
          <Button variant="outline" size="sm" onClick={() => onOpenChange(false)}>
            Cancelar
          </Button>
          <Button
            size="sm"
            onClick={handleConfirm}
            className="bg-indigo-600 hover:bg-indigo-700 text-white font-bold"
          >
            Confirmar Atribuição
          </Button>
        </DialogFooter>
      </DialogContent>
    </Dialog>
  )
}
