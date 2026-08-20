import { useState, useEffect, useMemo } from 'react'
import {
  Dialog,
  DialogContent,
  DialogHeader,
  DialogTitle,
  DialogFooter,
  DialogDescription,
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
import { Badge } from '@/components/ui/badge'
import { useAuth } from '@/hooks/use-auth'
import { useToast } from '@/hooks/use-toast'
import { getUsers } from '@/services/users'
import { getAccountExecutives } from '@/services/account_executives'
import { createShare } from '@/services/service_record_shares'
import type { UserRecord, AccountExecutiveRecord } from '@/types/service_record'
import { Search, Share2, Loader2, UserCheck, Briefcase } from 'lucide-react'

interface ShareSelectDialogProps {
  recordIds?: string[]
  open: boolean
  onOpenChange: (open: boolean) => void
  onSuccess?: () => void
  users?: UserRecord[]
  selectedIds?: string[]
  currentUserId?: string
  onConfirm?: (ids: string[]) => void
}

export function ShareSelectDialog({
  recordIds = [],
  open,
  onOpenChange,
  onSuccess,
}: ShareSelectDialogProps) {
  const safeRecordIds = recordIds || []
  const { user } = useAuth()
  const { toast } = useToast()
  const [users, setUsers] = useState<UserRecord[]>([])
  const [executives, setExecutives] = useState<AccountExecutiveRecord[]>([])
  const [selectedUserIds, setSelectedUserIds] = useState<string[]>([])
  const [selectedExecutiveIds, setSelectedExecutiveIds] = useState<string[]>([])
  const [permission, setPermission] = useState<'Visualizar' | 'Editar'>('Visualizar')
  const [search, setSearch] = useState('')
  const [loading, setLoading] = useState(false)

  useEffect(() => {
    if (!open || safeRecordIds.length === 0) return
    const load = async () => {
      setLoading(true)
      try {
        const [allUsers, allExecs] = await Promise.all([getUsers(), getAccountExecutives()])
        setUsers(allUsers)
        setExecutives(allExecs)
      } catch (e) {
        console.error('Error loading users for batch share:', e)
      } finally {
        setLoading(false)
      }
    }
    load()
    setSelectedUserIds([])
    setSelectedExecutiveIds([])
    setSearch('')
  }, [open, safeRecordIds])

  const availableUsers = useMemo(() => {
    return users.filter((u) => u.id !== user?.id && u.approval_status !== 'Rejeitado')
  }, [users, user?.id])

  const filteredUsers = useMemo(() => {
    if (!search.trim()) return availableUsers
    const q = search.toLowerCase()
    return availableUsers.filter(
      (u) =>
        u.name.toLowerCase().includes(q) ||
        u.email.toLowerCase().includes(q) ||
        u.role?.toLowerCase().includes(q),
    )
  }, [availableUsers, search])

  const filteredExecutives = useMemo(() => {
    if (!search.trim()) return executives
    const q = search.toLowerCase()
    return executives.filter(
      (e) => e.name.toLowerCase().includes(q) || (e.email && e.email.toLowerCase().includes(q)),
    )
  }, [executives, search])

  const toggleUser = (id: string) => {
    setSelectedUserIds((prev) => (prev.includes(id) ? prev.filter((x) => x !== id) : [...prev, id]))
  }

  const toggleExec = (id: string) => {
    setSelectedExecutiveIds((prev) =>
      prev.includes(id) ? prev.filter((x) => x !== id) : [...prev, id],
    )
  }

  const totalSelected = selectedUserIds.length + selectedExecutiveIds.length

  const handleShare = async () => {
    if (safeRecordIds.length === 0 || !user?.id || totalSelected === 0) return
    setLoading(true)
    try {
      const promises: Promise<any>[] = []

      for (const recordId of safeRecordIds) {
        for (const userId of selectedUserIds) {
          promises.push(
            createShare({
              service_record: recordId,
              user: userId,
              shared_by: user.id,
              permission,
            }),
          )
        }
        for (const execId of selectedExecutiveIds) {
          promises.push(
            createShare({
              service_record: recordId,
              account_executive: execId,
              shared_by: user.id,
              permission: 'Visualizar',
            }),
          )
        }
      }

      await Promise.all(promises)

      toast({
        title: 'Compartilhamento realizado',
        description: `${safeRecordIds.length} atendimento(s) compartilhado(s) com ${totalSelected} destinatário(s).`,
      })
      onOpenChange(false)
      onSuccess?.()
    } catch (e) {
      console.error('Error sharing service records:', e)
      toast({
        title: 'Erro ao compartilhar',
        description: 'Não foi possível compartilhar os atendimentos selecionados.',
        variant: 'destructive',
      })
    } finally {
      setLoading(false)
    }
  }

  return (
    <Dialog open={open} onOpenChange={onOpenChange}>
      <DialogContent className="max-w-lg">
        <DialogHeader>
          <DialogTitle className="flex items-center gap-2">
            <Share2 className="h-5 w-5 text-indigo-600" />
            Compartilhar {safeRecordIds.length > 0 ? `${safeRecordIds.length} ` : ''}Atendimento(s)
          </DialogTitle>
          <DialogDescription>
            Selecione consultores ou executivos de contas para dar acesso aos atendimentos
            {safeRecordIds.length > 0 ? ' selecionados' : ''}.
          </DialogDescription>
        </DialogHeader>

        <div className="space-y-4 py-2">
          <div className="flex items-center justify-between gap-4 p-3 bg-slate-50 rounded-lg border">
            <div>
              <div className="text-xs font-semibold text-slate-900">
                Permissão para Colaboradores
              </div>
              <div className="text-[11px] text-slate-500">
                Executivos de contas recebem automaticamente acesso de{' '}
                <span className="font-semibold text-indigo-600">apenas visualização</span>.
              </div>
            </div>
            <Select
              value={permission}
              onValueChange={(v) => setPermission(v as 'Visualizar' | 'Editar')}
            >
              <SelectTrigger className="w-32 h-8 text-xs bg-white">
                <SelectValue />
              </SelectTrigger>
              <SelectContent>
                <SelectItem value="Visualizar" className="text-xs">
                  Visualizar
                </SelectItem>
                <SelectItem value="Editar" className="text-xs">
                  Editar
                </SelectItem>
              </SelectContent>
            </Select>
          </div>

          <div className="relative">
            <Search className="absolute left-2.5 top-2.5 h-4 w-4 text-slate-400" />
            <Input
              value={search}
              onChange={(e) => setSearch(e.target.value)}
              placeholder="Buscar colaboradores ou executivos..."
              className="pl-8 text-xs h-9"
            />
          </div>

          <div className="max-h-72 overflow-y-auto space-y-3 pr-1">
            {/* Executivos */}
            <div className="border rounded-md p-2.5 bg-cyan-50/30">
              <div className="flex items-center gap-1.5 mb-2 pb-1.5 border-b border-cyan-100">
                <Briefcase className="h-3.5 w-3.5 text-cyan-700" />
                <span className="text-xs font-bold text-cyan-900 uppercase tracking-wider">
                  Executivos de Contas ({filteredExecutives.length})
                </span>
                <span className="ml-auto text-[10px] text-cyan-700 font-medium bg-cyan-100 px-1.5 py-0.5 rounded">
                  Apenas visualização
                </span>
              </div>

              {filteredExecutives.length === 0 ? (
                <p className="text-[11px] text-slate-400 py-1 italic">
                  Nenhum executivo encontrado.
                </p>
              ) : (
                <div className="space-y-1">
                  {filteredExecutives.map((exec) => {
                    const checked = selectedExecutiveIds.includes(exec.id)
                    return (
                      <label
                        key={exec.id}
                        className={`flex items-center justify-between p-1.5 rounded cursor-pointer transition-colors text-xs ${
                          checked ? 'bg-cyan-100/60' : 'hover:bg-slate-100'
                        }`}
                      >
                        <div className="flex items-center gap-2 flex-1 min-w-0">
                          <Checkbox checked={checked} onCheckedChange={() => toggleExec(exec.id)} />
                          <div className="truncate">
                            <span className="font-semibold text-slate-900">{exec.name}</span>
                            {exec.email && (
                              <span className="block text-[11px] text-slate-500 truncate">
                                {exec.email}
                              </span>
                            )}
                          </div>
                        </div>
                        <Badge
                          variant="outline"
                          className="text-[10px] border-cyan-300 text-cyan-700"
                        >
                          Executivo
                        </Badge>
                      </label>
                    )
                  })}
                </div>
              )}
            </div>

            {/* Colaboradores */}
            <div className="border rounded-md p-2.5 bg-slate-50/40">
              <div className="flex items-center gap-1.5 mb-2 pb-1.5 border-b border-slate-200">
                <UserCheck className="h-3.5 w-3.5 text-indigo-600" />
                <span className="text-xs font-bold text-slate-800 uppercase tracking-wider">
                  Colaboradores / Consultores ({filteredUsers.length})
                </span>
              </div>

              {filteredUsers.length === 0 ? (
                <p className="text-[11px] text-slate-400 py-1 italic">
                  Nenhum colaborador encontrado.
                </p>
              ) : (
                <div className="space-y-1">
                  {filteredUsers.map((u) => {
                    const checked = selectedUserIds.includes(u.id)
                    return (
                      <label
                        key={u.id}
                        className={`flex items-center justify-between p-1.5 rounded cursor-pointer transition-colors text-xs ${
                          checked ? 'bg-indigo-50' : 'hover:bg-slate-100'
                        }`}
                      >
                        <div className="flex items-center gap-2 flex-1 min-w-0">
                          <Checkbox checked={checked} onCheckedChange={() => toggleUser(u.id)} />
                          <div className="truncate">
                            <span className="font-semibold text-slate-900">{u.name}</span>
                            <span className="block text-[11px] text-slate-500 truncate">
                              {u.email}
                            </span>
                          </div>
                        </div>
                        <Badge variant="outline" className="text-[10px]">
                          {u.role || 'Colaborador'}
                        </Badge>
                      </label>
                    )
                  })}
                </div>
              )}
            </div>
          </div>
        </div>

        <DialogFooter className="gap-2">
          <Button variant="outline" onClick={() => onOpenChange(false)} disabled={loading}>
            Cancelar
          </Button>
          <Button
            onClick={handleShare}
            disabled={totalSelected === 0 || loading}
            className="bg-indigo-600 hover:bg-indigo-700 text-white"
          >
            {loading && <Loader2 className="h-4 w-4 mr-2 animate-spin" />}
            Compartilhar ({totalSelected})
          </Button>
        </DialogFooter>
      </DialogContent>
    </Dialog>
  )
}
