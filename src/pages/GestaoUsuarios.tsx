import { useState, useEffect } from 'react'
import { Card } from '@/components/ui/card'
import { Button } from '@/components/ui/button'
import { Input } from '@/components/ui/input'
import { Label } from '@/components/ui/label'
import { Badge } from '@/components/ui/badge'
import {
  Dialog,
  DialogContent,
  DialogHeader,
  DialogTitle,
  DialogFooter,
} from '@/components/ui/dialog'
import {
  AlertDialog,
  AlertDialogAction,
  AlertDialogCancel,
  AlertDialogContent,
  AlertDialogDescription,
  AlertDialogFooter,
  AlertDialogHeader,
  AlertDialogTitle,
} from '@/components/ui/alert-dialog'
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from '@/components/ui/select'
import {
  Table,
  TableHeader,
  TableBody,
  TableRow,
  TableHead,
  TableCell,
} from '@/components/ui/table'
import { getUsers, updateUser, approveUser, rejectUser, deleteUser } from '@/services/users'
import { extractFieldErrors, type FieldErrors } from '@/lib/pocketbase/errors'
import { UserRecord, UserRole, ApprovalStatus } from '@/types/service_record'
import { useAuth } from '@/hooks/use-auth'
import { useRealtime } from '@/hooks/use-realtime'
import { useToast } from '@/hooks/use-toast'
import { cn } from '@/lib/utils'
import { UserCheck, Check, X, Pencil, Loader2, Trash2, Clock } from 'lucide-react'
import { Mail } from 'lucide-react'

const EMAIL_REGEX = /^[^\s@]+@[^\s@]+\.[^\s@]+$/

const ROLES: UserRole[] = [
  'Gerentes',
  'Supervisores',
  'Líderes',
  'Consultores',
  'Executivo de contas',
  'Master',
]
const STATUSES: ApprovalStatus[] = ['Pendente', 'Aprovado', 'Rejeitado']

function StatusBadge({ status }: { status?: string }) {
  if (status === 'Pendente')
    return <Badge className="bg-amber-100 text-amber-700 hover:bg-amber-100">Pendente</Badge>
  if (status === 'Aprovado')
    return <Badge className="bg-emerald-100 text-emerald-700 hover:bg-emerald-100">Aprovado</Badge>
  if (status === 'Rejeitado')
    return <Badge className="bg-rose-100 text-rose-700 hover:bg-rose-100">Rejeitado</Badge>
  return <Badge variant="secondary">—</Badge>
}

function formatApprovalDate(dateStr?: string): string {
  if (!dateStr) return ''
  try {
    const d = new Date(dateStr)
    return d.toLocaleDateString('pt-BR', {
      day: '2-digit',
      month: '2-digit',
      year: 'numeric',
      hour: '2-digit',
      minute: '2-digit',
    })
  } catch {
    return ''
  }
}

export default function GestaoUsuarios() {
  const { user } = useAuth()
  const { toast } = useToast()
  const [users, setUsers] = useState<UserRecord[]>([])
  const [loading, setLoading] = useState(true)
  const [search, setSearch] = useState('')
  const [dialogOpen, setDialogOpen] = useState(false)
  const [editingId, setEditingId] = useState<string | null>(null)
  const [editName, setEditName] = useState('')
  const [editEmail, setEditEmail] = useState('')
  const [editRole, setEditRole] = useState<UserRole>('Consultores')
  const [editStatus, setEditStatus] = useState<ApprovalStatus>('Aprovado')
  const [fieldErrors, setFieldErrors] = useState<FieldErrors>({})
  const [saving, setSaving] = useState(false)
  const [deleteTarget, setDeleteTarget] = useState<UserRecord | null>(null)
  const [deleting, setDeleting] = useState(false)

  const loadData = async () => {
    setLoading(true)
    try {
      const data = await getUsers()
      setUsers(data)
    } catch (e) {
      console.error(e)
    } finally {
      setLoading(false)
    }
  }

  useEffect(() => {
    loadData()
  }, [])
  useRealtime('users', () => {
    loadData()
  })

  const filtered = users.filter(
    (u) =>
      u.name?.toLowerCase().includes(search.toLowerCase()) ||
      u.email?.toLowerCase().includes(search.toLowerCase()),
  )
  const pendingCount = users.filter((u) => u.approval_status === 'Pendente').length

  const handleEdit = (u: UserRecord) => {
    setEditingId(u.id)
    setEditName(u.name || '')
    setEditEmail(u.email || '')
    setEditRole(u.role || 'Consultores')
    setEditStatus(u.approval_status || 'Aprovado')
    setFieldErrors({})
    setDialogOpen(true)
  }

  const handleSave = async (e: React.FormEvent) => {
    e.preventDefault()
    setFieldErrors({})

    const trimmedEmail = editEmail.trim()
    if (!trimmedEmail) {
      setFieldErrors({ email: 'E-mail é obrigatório.' })
      return
    }
    if (!EMAIL_REGEX.test(trimmedEmail)) {
      setFieldErrors({ email: 'Formato de e-mail inválido.' })
      return
    }

    setSaving(true)
    try {
      await updateUser(editingId!, {
        name: editName,
        email: trimmedEmail,
        role: editRole,
        approval_status: editStatus,
      })
      toast({ title: 'Usuário atualizado com sucesso' })
      setDialogOpen(false)
      loadData()
    } catch (err) {
      const errors = extractFieldErrors(err)
      if (Object.keys(errors).length > 0) {
        setFieldErrors(errors)
      }
      toast({ variant: 'destructive', title: 'Erro ao atualizar usuário' })
    } finally {
      setSaving(false)
    }
  }

  const handleApprove = async (id: string) => {
    try {
      await approveUser(id)
      toast({ title: 'Usuário aprovado com sucesso' })
      loadData()
    } catch {
      toast({ variant: 'destructive', title: 'Erro ao aprovar usuário' })
    }
  }

  const handleReject = async (id: string) => {
    try {
      await rejectUser(id)
      toast({ title: 'Usuário rejeitado' })
      loadData()
    } catch {
      toast({ variant: 'destructive', title: 'Erro ao rejeitar usuário' })
    }
  }

  const handleDelete = async () => {
    if (!deleteTarget) return
    setDeleting(true)
    try {
      await deleteUser(deleteTarget.id)
      toast({ title: 'Usuário excluído com sucesso' })
      setDeleteTarget(null)
      loadData()
    } catch {
      toast({ variant: 'destructive', title: 'Erro ao excluir usuário' })
    } finally {
      setDeleting(false)
    }
  }

  return (
    <div className="space-y-6">
      <div className="flex flex-col sm:flex-row sm:items-center sm:justify-between gap-4">
        <div>
          <h2 className="text-2xl font-extrabold tracking-tight text-slate-900 flex items-center gap-2">
            <UserCheck className="h-6 w-6 text-indigo-600" />
            Gestão de Usuários
          </h2>
          <p className="text-xs text-slate-500">
            Revise e gerencie registros de usuários e aprovações
            {pendingCount > 0 && (
              <span className="ml-2 text-amber-600 font-semibold">
                ({pendingCount} pendente{pendingCount > 1 ? 's' : ''})
              </span>
            )}
          </p>
        </div>
      </div>

      <Card className="p-4 border-slate-200 shadow-subtle">
        <Input
          placeholder="Buscar por nome ou e-mail..."
          value={search}
          onChange={(e) => setSearch(e.target.value)}
          className="h-9 text-xs mb-4"
        />
        {loading ? (
          <div className="flex justify-center py-12">
            <Loader2 className="h-6 w-6 animate-spin text-slate-400" />
          </div>
        ) : (
          <div className="overflow-x-auto">
            <Table>
              <TableHeader>
                <TableRow className="bg-slate-50">
                  <TableHead className="text-xs font-bold">Nome</TableHead>
                  <TableHead className="text-xs font-bold">E-mail</TableHead>
                  <TableHead className="text-xs font-bold">Categoria</TableHead>
                  <TableHead className="text-xs font-bold">Status</TableHead>
                  <TableHead className="text-xs font-bold text-right">Ações</TableHead>
                </TableRow>
              </TableHeader>
              <TableBody>
                {filtered.map((u) => (
                  <TableRow
                    key={u.id}
                    className={cn(
                      'hover:bg-slate-50',
                      u.approval_status === 'Pendente' && 'bg-amber-50/50',
                    )}
                  >
                    <TableCell className="text-xs font-semibold text-slate-900">
                      {u.name}
                      {u.id === user?.id && (
                        <span className="ml-1 text-[10px] text-indigo-500">(você)</span>
                      )}
                    </TableCell>
                    <TableCell
                      className="text-xs text-slate-600 truncate max-w-[260px]"
                      title={u.email || ''}
                    >
                      {u.email || '—'}
                    </TableCell>
                    <TableCell className="text-xs text-slate-600">{u.role}</TableCell>
                    <TableCell>
                      <StatusBadge status={u.approval_status} />
                      {u.approved_by && (
                        <p className="text-[10px] text-slate-400 mt-1">
                          por {u.approved_by}
                          {u.approved_at ? ` em ${formatApprovalDate(u.approved_at)}` : ''}
                        </p>
                      )}
                    </TableCell>
                    <TableCell className="text-right">
                      <div className="flex items-center justify-end gap-1">
                        {u.approval_status === 'Pendente' && (
                          <>
                            <Button
                              variant="ghost"
                              size="sm"
                              className="text-xs h-7 text-emerald-600"
                              onClick={() => handleApprove(u.id)}
                            >
                              <Check className="h-3.5 w-3.5 mr-1" /> Aprovar
                            </Button>
                            <Button
                              variant="ghost"
                              size="sm"
                              className="text-xs h-7 text-rose-500"
                              onClick={() => handleReject(u.id)}
                            >
                              <X className="h-3.5 w-3.5 mr-1" /> Rejeitar
                            </Button>
                          </>
                        )}
                        <Button
                          variant="ghost"
                          size="sm"
                          className="text-xs h-7 text-indigo-600"
                          onClick={() => handleEdit(u)}
                        >
                          <Pencil className="h-3.5 w-3.5 mr-1" /> Editar
                        </Button>
                        <Button
                          variant="ghost"
                          size="sm"
                          className="text-xs h-7 text-rose-500 disabled:opacity-40 disabled:cursor-not-allowed"
                          disabled={u.id === user?.id}
                          onClick={() => setDeleteTarget(u)}
                        >
                          <Trash2 className="h-3.5 w-3.5 mr-1" /> Excluir
                        </Button>
                      </div>
                    </TableCell>
                  </TableRow>
                ))}
                {filtered.length === 0 && (
                  <TableRow>
                    <TableCell colSpan={5} className="text-center text-xs text-slate-400 py-8">
                      Nenhum usuário encontrado.
                    </TableCell>
                  </TableRow>
                )}
              </TableBody>
            </Table>
          </div>
        )}
      </Card>

      <Dialog open={dialogOpen} onOpenChange={setDialogOpen}>
        <DialogContent className="sm:max-w-[480px]">
          <DialogHeader>
            <DialogTitle className="flex items-center gap-2 text-indigo-950">
              <UserCheck className="h-5 w-5 text-indigo-600" />
              Editar Usuário
            </DialogTitle>
          </DialogHeader>
          <form onSubmit={handleSave} className="space-y-4 py-2">
            <div className="space-y-1.5">
              <Label>Nome</Label>
              <Input value={editName} onChange={(e) => setEditName(e.target.value)} />
            </div>
            <div className="space-y-1.5">
              <Label className="flex items-center gap-1.5">
                <Mail className="h-3.5 w-3.5 text-slate-400" />
                E-mail
              </Label>
              <Input
                type="email"
                value={editEmail}
                onChange={(e) => {
                  setEditEmail(e.target.value)
                  if (fieldErrors.email) setFieldErrors((prev) => ({ ...prev, email: undefined }))
                }}
                placeholder="usuario@email.com"
                className={cn(fieldErrors.email && 'border-rose-400 focus-visible:ring-rose-400')}
              />
              {fieldErrors.email && <p className="text-xs text-rose-500">{fieldErrors.email}</p>}
            </div>
            <div className="space-y-1.5">
              <Label>Categoria</Label>
              <Select value={editRole} onValueChange={(v) => setEditRole(v as UserRole)}>
                <SelectTrigger>
                  <SelectValue />
                </SelectTrigger>
                <SelectContent>
                  {ROLES.map((r) => (
                    <SelectItem key={r} value={r}>
                      {r}
                    </SelectItem>
                  ))}
                </SelectContent>
              </Select>
            </div>
            <div className="space-y-1.5">
              <Label>Status de Aprovação</Label>
              <Select value={editStatus} onValueChange={(v) => setEditStatus(v as ApprovalStatus)}>
                <SelectTrigger>
                  <SelectValue />
                </SelectTrigger>
                <SelectContent>
                  {STATUSES.map((s) => (
                    <SelectItem key={s} value={s}>
                      {s}
                    </SelectItem>
                  ))}
                </SelectContent>
              </Select>
            </div>
            <DialogFooter className="pt-2">
              <Button type="button" variant="outline" onClick={() => setDialogOpen(false)}>
                Cancelar
              </Button>
              <Button type="submit" disabled={saving} className="bg-indigo-600 hover:bg-indigo-700">
                {saving && <Loader2 className="mr-2 h-4 w-4 animate-spin" />}
                Salvar Alterações
              </Button>
            </DialogFooter>
          </form>
        </DialogContent>
      </Dialog>

      <AlertDialog open={!!deleteTarget} onOpenChange={(open) => !open && setDeleteTarget(null)}>
        <AlertDialogContent>
          <AlertDialogHeader>
            <AlertDialogTitle>Confirmar Exclusão</AlertDialogTitle>
            <AlertDialogDescription>
              Tem certeza que deseja excluir o usuário <strong>{deleteTarget?.name}</strong>
              {deleteTarget?.email ? ` (${deleteTarget.email})` : ''}? Esta ação é irreversível. Os
              registros relacionados serão reatribuídos ou removidos.
            </AlertDialogDescription>
          </AlertDialogHeader>
          <AlertDialogFooter>
            <AlertDialogCancel>Cancelar</AlertDialogCancel>
            <AlertDialogAction
              onClick={handleDelete}
              disabled={deleting}
              className="bg-rose-600 hover:bg-rose-700"
            >
              {deleting && <Loader2 className="mr-2 h-4 w-4 animate-spin" />}
              Excluir Usuário
            </AlertDialogAction>
          </AlertDialogFooter>
        </AlertDialogContent>
      </AlertDialog>
    </div>
  )
}
