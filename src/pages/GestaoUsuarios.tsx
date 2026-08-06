import { useState, useEffect, useCallback } from 'react'
import { getUsers, approveUser, rejectUser, deleteUser } from '@/services/users'
import { useRealtime } from '@/hooks/use-realtime'
import { useAuth } from '@/hooks/use-auth'
import { useToast } from '@/hooks/use-toast'
import { Button } from '@/components/ui/button'
import { Badge } from '@/components/ui/badge'
import {
  Table,
  TableBody,
  TableCell,
  TableHead,
  TableHeader,
  TableRow,
} from '@/components/ui/table'
import { Input } from '@/components/ui/input'
import { UserPlus, Check, X, Trash2, Loader2 } from 'lucide-react'
import { NewUserDialog } from '@/components/NewUserDialog'
import type { UserRecord, ApprovalStatus } from '@/types/service_record'

function StatusBadge({ status }: { status?: ApprovalStatus }) {
  if (status === 'Aprovado')
    return <Badge className="bg-green-100 text-green-700 hover:bg-green-100">Aprovado</Badge>
  if (status === 'Rejeitado') return <Badge variant="destructive">Rejeitado</Badge>
  return <Badge variant="secondary">Pendente</Badge>
}

export default function GestaoUsuarios() {
  const { user } = useAuth()
  const { toast } = useToast()
  const [users, setUsers] = useState<UserRecord[]>([])
  const [search, setSearch] = useState('')
  const [showNewUser, setShowNewUser] = useState(false)
  const [loading, setLoading] = useState(true)

  const loadUsers = useCallback(async () => {
    try {
      const data = await getUsers()
      setUsers(data as UserRecord[])
    } catch {
      toast({ variant: 'destructive', title: 'Erro ao carregar usuários' })
    } finally {
      setLoading(false)
    }
  }, [toast])

  useEffect(() => {
    loadUsers()
  }, [loadUsers])
  useRealtime('users', () => loadUsers())

  const handleApprove = async (id: string) => {
    try {
      await approveUser(id)
      toast({ title: 'Usuário aprovado!' })
    } catch {
      toast({ variant: 'destructive', title: 'Erro ao aprovar' })
    }
  }
  const handleReject = async (id: string) => {
    try {
      await rejectUser(id)
      toast({ title: 'Usuário rejeitado' })
    } catch {
      toast({ variant: 'destructive', title: 'Erro ao rejeitar' })
    }
  }
  const handleDelete = async (id: string) => {
    if (!confirm('Tem certeza que deseja remover este usuário?')) return
    try {
      await deleteUser(id)
      toast({ title: 'Usuário removido' })
    } catch {
      toast({ variant: 'destructive', title: 'Erro ao remover' })
    }
  }

  const filtered = users.filter(
    (u) =>
      u.name?.toLowerCase().includes(search.toLowerCase()) ||
      u.email?.toLowerCase().includes(search.toLowerCase()),
  )

  return (
    <div className="space-y-4 p-4 md:p-6">
      <div className="flex items-center justify-between flex-wrap gap-2">
        <h1 className="text-2xl font-bold text-indigo-950">Gestão de Usuários</h1>
        <Button onClick={() => setShowNewUser(true)} className="bg-indigo-600 hover:bg-indigo-700">
          <UserPlus className="h-4 w-4 mr-2" /> Novo Usuário
        </Button>
      </div>
      <Input
        placeholder="Buscar por nome ou e-mail..."
        value={search}
        onChange={(e) => setSearch(e.target.value)}
        className="max-w-sm"
      />
      {loading ? (
        <div className="flex justify-center py-8">
          <Loader2 className="h-6 w-6 animate-spin text-indigo-600" />
        </div>
      ) : (
        <div className="rounded-lg border overflow-x-auto">
          <Table>
            <TableHeader>
              <TableRow>
                <TableHead>Nome</TableHead>
                <TableHead>E-mail</TableHead>
                <TableHead>Cargo</TableHead>
                <TableHead>Status</TableHead>
                <TableHead>Grupos / Bases</TableHead>
                <TableHead className="text-right">Ações</TableHead>
              </TableRow>
            </TableHeader>
            <TableBody>
              {filtered.map((u) => (
                <TableRow key={u.id}>
                  <TableCell className="font-medium">{u.name || '-'}</TableCell>
                  <TableCell className="text-sm text-slate-600">{u.email || '-'}</TableCell>
                  <TableCell className="text-sm">{u.role}</TableCell>
                  <TableCell>
                    <StatusBadge status={u.approval_status} />
                  </TableCell>
                  <TableCell className="text-sm text-slate-600">
                    {u.service_groups?.length
                      ? u.service_groups.join(', ')
                      : u.bases?.length
                        ? u.bases.join(', ')
                        : '-'}
                  </TableCell>
                  <TableCell className="text-right">
                    <div className="flex justify-end gap-1">
                      {u.approval_status === 'Pendente' && (
                        <>
                          <Button size="sm" variant="ghost" onClick={() => handleApprove(u.id)}>
                            <Check className="h-4 w-4 text-green-600" />
                          </Button>
                          <Button size="sm" variant="ghost" onClick={() => handleReject(u.id)}>
                            <X className="h-4 w-4 text-red-600" />
                          </Button>
                        </>
                      )}
                      {u.id !== user?.id && u.role !== 'Master' && (
                        <Button size="sm" variant="ghost" onClick={() => handleDelete(u.id)}>
                          <Trash2 className="h-4 w-4 text-red-600" />
                        </Button>
                      )}
                    </div>
                  </TableCell>
                </TableRow>
              ))}
              {filtered.length === 0 && (
                <TableRow>
                  <TableCell colSpan={6} className="text-center text-slate-400 py-8">
                    Nenhum usuário encontrado.
                  </TableCell>
                </TableRow>
              )}
            </TableBody>
          </Table>
        </div>
      )}
      <NewUserDialog open={showNewUser} onOpenChange={setShowNewUser} onSuccess={loadUsers} />
    </div>
  )
}
