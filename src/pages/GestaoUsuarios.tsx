import { useState, useEffect } from 'react'
import pb from '@/lib/pocketbase/client'
import {
  getUsersWithEmails,
  approveUser,
  rejectUser,
  deleteUser,
  updateUser,
  updateUserServiceGroups,
  updateUserBases,
} from '@/services/users'
import { useRealtime } from '@/hooks/use-realtime'
import { useToast } from '@/hooks/use-toast'
import { useAuth } from '@/hooks/use-auth'
import { ROLE_OPTIONS, getRoleLabel } from '@/lib/role-labels'
import { SERVICE_GROUP_OPTIONS, getServiceGroupLabel } from '@/lib/service-groups'
import { COMMERCIAL_BASE_OPTIONS } from '@/lib/commercial-bases'
import { UserRecord, UserRole } from '@/types/service_record'
import { Card } from '@/components/ui/card'
import { Button } from '@/components/ui/button'
import { Input } from '@/components/ui/input'
import { Label } from '@/components/ui/label'
import {
  Table,
  TableHeader,
  TableBody,
  TableRow,
  TableHead,
  TableCell,
} from '@/components/ui/table'
import {
  Dialog,
  DialogContent,
  DialogHeader,
  DialogTitle,
  DialogFooter,
} from '@/components/ui/dialog'
import { SearchableSelect } from '@/components/SearchableSelect'
import { Checkbox } from '@/components/ui/checkbox'
import { extractFieldErrors, type FieldErrors } from '@/lib/pocketbase/errors'
import { UserPlus, Search, Loader2, Check, X, Trash2, Pencil, FilterX } from 'lucide-react'

export default function GestaoUsuarios() {
  const { user: currentUser } = useAuth()
  const { toast } = useToast()

  const [users, setUsers] = useState<UserRecord[]>([])
  const [search, setSearch] = useState('')
  const [filterRole, setFilterRole] = useState('')
  const [filterStatus, setFilterStatus] = useState('')
  const [newUserOpen, setNewUserOpen] = useState(false)
  const [editTarget, setEditTarget] = useState<UserRecord | null>(null)
  const [loading, setLoading] = useState(false)

  const [nuName, setNuName] = useState('')
  const [nuEmail, setNuEmail] = useState('')
  const [nuPassword, setNuPassword] = useState('')
  const [nuRole, setNuRole] = useState<UserRole | ''>('')
  const [nuGroups, setNuGroups] = useState<string[]>([])
  const [nuBases, setNuBases] = useState<string[]>([])
  const [nuErrors, setNuErrors] = useState<FieldErrors>({})

  const [edName, setEdName] = useState('')
  const [edRole, setEdRole] = useState<UserRole | ''>('')
  const [edGroups, setEdGroups] = useState<string[]>([])
  const [edBases, setEdBases] = useState<string[]>([])

  const loadUsers = async () => {
    try {
      setUsers(await getUsersWithEmails())
    } catch (err) {
      console.error(err)
    }
  }

  useEffect(() => {
    loadUsers()
  }, [])
  useRealtime('users', () => loadUsers())

  const isMaster = currentUser?.role === 'Master'

  const toggleArrayValue = (arr: string[], value: string): string[] =>
    arr.includes(value) ? arr.filter((v) => v !== value) : [...arr, value]

  const filteredUsers = users.filter((u) => {
    const matchesSearch =
      !search ||
      (u.name || '').toLowerCase().includes(search.toLowerCase()) ||
      (u.email || '').toLowerCase().includes(search.toLowerCase())
    const matchesRole = !filterRole || u.role === filterRole
    const matchesStatus = !filterStatus || (u.approval_status || 'Pendente') === filterStatus
    return matchesSearch && matchesRole && matchesStatus
  })

  const resetNewUser = () => {
    setNuName('')
    setNuEmail('')
    setNuPassword('')
    setNuRole('')
    setNuGroups([])
    setNuBases([])
    setNuErrors({})
  }

  const handleCreateUser = async (e: React.FormEvent) => {
    e.preventDefault()
    if (!nuName.trim() || !nuEmail.trim() || !nuPassword.trim() || !nuRole) {
      toast({ variant: 'destructive', title: 'Preencha todos os campos obrigatórios' })
      return
    }
    setLoading(true)
    setNuErrors({})
    try {
      await pb.collection('users').create({
        email: nuEmail.trim(),
        password: nuPassword,
        passwordConfirm: nuPassword,
        name: nuName.trim(),
        role: nuRole,
        approval_status: 'Pendente',
        service_groups: nuGroups.length > 0 ? nuGroups : undefined,
        bases: nuBases.length > 0 ? nuBases : undefined,
      })
      toast({ title: 'Usuário criado com sucesso' })
      resetNewUser()
      setNewUserOpen(false)
      loadUsers()
    } catch (err) {
      setNuErrors(extractFieldErrors(err))
      toast({ variant: 'destructive', title: 'Erro ao criar usuário' })
    } finally {
      setLoading(false)
    }
  }

  const openEdit = (u: UserRecord) => {
    setEditTarget(u)
    setEdName(u.name || '')
    setEdRole(u.role || '')
    setEdGroups(((u as Record<string, unknown>).service_groups as string[]) || [])
    setEdBases(((u as Record<string, unknown>).bases as string[]) || [])
  }

  const handleSaveEdit = async () => {
    if (!editTarget) return
    setLoading(true)
    try {
      await updateUser(editTarget.id, {
        name: edName.trim(),
        ...(edRole ? { role: edRole } : {}),
      })
      await updateUserServiceGroups(editTarget.id, edGroups)
      await updateUserBases(editTarget.id, edBases)
      toast({ title: 'Usuário atualizado' })
      setEditTarget(null)
      loadUsers()
    } catch {
      toast({ variant: 'destructive', title: 'Erro ao atualizar usuário' })
    } finally {
      setLoading(false)
    }
  }

  const handleApprove = async (id: string) => {
    try {
      await approveUser(id)
      toast({ title: 'Usuário aprovado' })
      loadUsers()
    } catch {
      toast({ variant: 'destructive', title: 'Erro ao aprovar usuário' })
    }
  }

  const handleReject = async (id: string) => {
    try {
      await rejectUser(id)
      toast({ title: 'Usuário rejeitado' })
      loadUsers()
    } catch {
      toast({ variant: 'destructive', title: 'Erro ao rejeitar usuário' })
    }
  }

  const handleDelete = async (id: string) => {
    if (!window.confirm('Tem certeza que deseja excluir este usuário?')) return
    try {
      await deleteUser(id)
      toast({ title: 'Usuário excluído' })
      loadUsers()
    } catch {
      toast({ variant: 'destructive', title: 'Erro ao excluir usuário' })
    }
  }

  const statusBadge = (status?: string) => {
    const s = status || 'Pendente'
    const styles: Record<string, string> = {
      Pendente: 'bg-amber-100 text-amber-700',
      Aprovado: 'bg-green-100 text-green-700',
      Rejeitado: 'bg-red-100 text-red-700',
    }
    return (
      <span
        className={`inline-flex items-center rounded-full px-2 py-0.5 text-[11px] font-semibold ${styles[s] || styles.Pendente}`}
      >
        {s}
      </span>
    )
  }

  const hasFilters = filterRole || filterStatus

  return (
    <div className="space-y-6">
      <div className="flex flex-col sm:flex-row sm:items-center sm:justify-between gap-4">
        <div>
          <h2 className="text-2xl font-extrabold tracking-tight text-slate-900">
            Gestão de Usuários
          </h2>
          <p className="text-xs text-slate-500">
            Gerencie usuários, aprovações e permissões do sistema
          </p>
        </div>
        <Button
          onClick={() => setNewUserOpen(true)}
          className="bg-gradient-to-r from-cyan-600 via-indigo-600 to-purple-600 hover:from-cyan-700 hover:via-indigo-700 hover:to-purple-700 text-white font-bold shadow-md"
        >
          <UserPlus className="h-4 w-4 mr-1.5" /> Novo Usuário
        </Button>
      </div>

      <div className="flex flex-wrap items-end gap-3">
        <div className="flex-1 min-w-[200px] relative">
          <Search className="absolute left-2.5 top-2.5 h-4 w-4 text-slate-400" />
          <Input
            placeholder="Buscar por nome ou email..."
            value={search}
            onChange={(e) => setSearch(e.target.value)}
            className="pl-9 h-9 text-xs"
          />
        </div>
        <div className="space-y-1">
          <label className="text-xs font-semibold text-slate-600">Cargo</label>
          <SearchableSelect
            options={ROLE_OPTIONS.map((r) => ({ value: r.value, label: r.label }))}
            value={filterRole}
            onValueChange={setFilterRole}
            placeholder="Todos"
            emptyText="Nenhum cargo encontrado."
            className="h-9 text-xs w-[180px]"
          />
        </div>
        <div className="space-y-1">
          <label className="text-xs font-semibold text-slate-600">Status</label>
          <SearchableSelect
            options={[
              { value: 'Pendente', label: 'Pendente' },
              { value: 'Aprovado', label: 'Aprovado' },
              { value: 'Rejeitado', label: 'Rejeitado' },
            ]}
            value={filterStatus}
            onValueChange={setFilterStatus}
            placeholder="Todos"
            emptyText="Nenhum status encontrado."
            className="h-9 text-xs w-[150px]"
          />
        </div>
        {hasFilters && (
          <Button
            variant="ghost"
            size="sm"
            className="text-xs h-9 text-slate-500"
            onClick={() => {
              setFilterRole('')
              setFilterStatus('')
            }}
          >
            <FilterX className="h-3.5 w-3.5 mr-1" /> Limpar filtros
          </Button>
        )}
      </div>

      <Card className="border-slate-200 overflow-hidden">
        <Table>
          <TableHeader>
            <TableRow className="bg-slate-50 hover:bg-slate-50">
              <TableHead className="text-xs font-bold text-slate-600">Nome</TableHead>
              <TableHead className="text-xs font-bold text-slate-600">Email</TableHead>
              <TableHead className="text-xs font-bold text-slate-600">Cargo</TableHead>
              <TableHead className="text-xs font-bold text-slate-600">Status</TableHead>
              <TableHead className="text-xs font-bold text-slate-600">Grupos</TableHead>
              <TableHead className="text-xs font-bold text-slate-600 text-right w-[220px]">
                Ações
              </TableHead>
            </TableRow>
          </TableHeader>
          <TableBody>
            {filteredUsers.map((u) => (
              <TableRow key={u.id} className="hover:bg-indigo-50/50 transition-colors">
                <TableCell className="text-xs font-semibold text-slate-900">
                  {u.name || '—'}
                </TableCell>
                <TableCell className="text-xs text-slate-600">{u.email || '—'}</TableCell>
                <TableCell className="text-xs">
                  <span className="inline-flex items-center rounded-full bg-indigo-50 px-2 py-0.5 text-[11px] font-semibold text-indigo-700">
                    {getRoleLabel(u.role)}
                  </span>
                </TableCell>
                <TableCell className="text-xs">{statusBadge(u.approval_status)}</TableCell>
                <TableCell className="text-xs text-slate-600">
                  {u.service_groups && u.service_groups.length > 0
                    ? u.service_groups.map((g) => getServiceGroupLabel(g)).join(', ')
                    : '—'}
                </TableCell>
                <TableCell className="text-right">
                  <div className="flex items-center justify-end gap-1">
                    {u.approval_status === 'Pendente' && (
                      <>
                        <Button
                          variant="ghost"
                          size="sm"
                          className="text-xs h-7 text-green-600"
                          onClick={() => handleApprove(u.id)}
                        >
                          <Check className="h-3.5 w-3.5 mr-1" /> Aprovar
                        </Button>
                        <Button
                          variant="ghost"
                          size="sm"
                          className="text-xs h-7 text-red-500"
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
                      onClick={() => openEdit(u)}
                    >
                      <Pencil className="h-3.5 w-3.5 mr-1" /> Editar
                    </Button>
                    {isMaster && (
                      <Button
                        variant="ghost"
                        size="sm"
                        className="text-xs h-7 text-red-500"
                        onClick={() => handleDelete(u.id)}
                      >
                        <Trash2 className="h-3.5 w-3.5" />
                      </Button>
                    )}
                  </div>
                </TableCell>
              </TableRow>
            ))}
            {filteredUsers.length === 0 && (
              <TableRow>
                <TableCell colSpan={6} className="text-center text-xs text-slate-400 py-8">
                  Nenhum usuário encontrado.
                </TableCell>
              </TableRow>
            )}
          </TableBody>
        </Table>
      </Card>

      <Dialog
        open={newUserOpen}
        onOpenChange={(v) => {
          if (!v) resetNewUser()
          setNewUserOpen(v)
        }}
      >
        <DialogContent className="sm:max-w-[480px] max-h-[90vh] overflow-y-auto">
          <DialogHeader>
            <DialogTitle className="flex items-center gap-2 text-indigo-950">
              <UserPlus className="h-5 w-5 text-indigo-600" />
              Novo Usuário
            </DialogTitle>
          </DialogHeader>
          <form onSubmit={handleCreateUser} className="space-y-4 py-2">
            <div className="space-y-1.5">
              <Label htmlFor="nu-name">Nome *</Label>
              <Input
                id="nu-name"
                value={nuName}
                onChange={(e) => setNuName(e.target.value)}
                placeholder="Nome completo"
              />
              {nuErrors.name && <p className="text-xs text-red-500">{nuErrors.name}</p>}
            </div>
            <div className="space-y-1.5">
              <Label htmlFor="nu-email">Email *</Label>
              <Input
                id="nu-email"
                type="email"
                value={nuEmail}
                onChange={(e) => setNuEmail(e.target.value)}
                placeholder="email@exemplo.com"
              />
              {nuErrors.email && <p className="text-xs text-red-500">{nuErrors.email}</p>}
            </div>
            <div className="space-y-1.5">
              <Label htmlFor="nu-pass">Senha *</Label>
              <Input
                id="nu-pass"
                type="password"
                value={nuPassword}
                onChange={(e) => setNuPassword(e.target.value)}
                placeholder="Mínimo 8 caracteres"
              />
              {nuErrors.password && <p className="text-xs text-red-500">{nuErrors.password}</p>}
            </div>
            <div className="space-y-1.5">
              <Label>Cargo *</Label>
              <SearchableSelect
                options={ROLE_OPTIONS.map((r) => ({ value: r.value, label: r.label }))}
                value={nuRole}
                onValueChange={(v) => setNuRole(v as UserRole)}
                placeholder="Selecione um cargo"
                emptyText="Nenhum cargo encontrado."
                className="h-9"
              />
              {nuErrors.role && <p className="text-xs text-red-500">{nuErrors.role}</p>}
            </div>
            <div className="space-y-2">
              <Label>Grupos de Atendimento</Label>
              <div className="grid grid-cols-3 gap-2">
                {SERVICE_GROUP_OPTIONS.map((g: { value: string; label: string }) => (
                  <div key={g.value} className="flex items-center space-x-2">
                    <Checkbox
                      id={`nu-g-${g.value}`}
                      checked={nuGroups.includes(g.value)}
                      onCheckedChange={() => setNuGroups(toggleArrayValue(nuGroups, g.value))}
                    />
                    <Label htmlFor={`nu-g-${g.value}`} className="text-xs cursor-pointer">
                      {g.label}
                    </Label>
                  </div>
                ))}
              </div>
            </div>
            <div className="space-y-2">
              <Label>Bases</Label>
              <div className="grid grid-cols-3 gap-2">
                {COMMERCIAL_BASE_OPTIONS.map((b: { value: string; label: string }) => (
                  <div key={b.value} className="flex items-center space-x-2">
                    <Checkbox
                      id={`nu-b-${b.value}`}
                      checked={nuBases.includes(b.value)}
                      onCheckedChange={() => setNuBases(toggleArrayValue(nuBases, b.value))}
                    />
                    <Label htmlFor={`nu-b-${b.value}`} className="text-xs cursor-pointer">
                      {b.label}
                    </Label>
                  </div>
                ))}
              </div>
            </div>
            <DialogFooter className="pt-2">
              <Button
                type="button"
                variant="outline"
                onClick={() => {
                  resetNewUser()
                  setNewUserOpen(false)
                }}
              >
                Cancelar
              </Button>
              <Button
                type="submit"
                disabled={loading}
                className="bg-indigo-600 hover:bg-indigo-700"
              >
                {loading && <Loader2 className="mr-2 h-4 w-4 animate-spin" />}
                Criar Usuário
              </Button>
            </DialogFooter>
          </form>
        </DialogContent>
      </Dialog>

      <Dialog open={!!editTarget} onOpenChange={(v) => !v && setEditTarget(null)}>
        <DialogContent className="sm:max-w-[480px] max-h-[90vh] overflow-y-auto">
          <DialogHeader>
            <DialogTitle className="flex items-center gap-2 text-indigo-950">
              <Pencil className="h-5 w-5 text-indigo-600" />
              Editar Usuário
            </DialogTitle>
          </DialogHeader>
          <div className="space-y-4 py-2">
            <div className="space-y-1.5">
              <Label htmlFor="ed-name">Nome</Label>
              <Input id="ed-name" value={edName} onChange={(e) => setEdName(e.target.value)} />
            </div>
            <div className="space-y-1.5">
              <Label>Email</Label>
              <Input
                value={editTarget?.email || ''}
                disabled
                className="bg-slate-50 text-slate-500"
              />
            </div>
            <div className="space-y-1.5">
              <Label>Cargo</Label>
              <SearchableSelect
                options={ROLE_OPTIONS.map((r) => ({ value: r.value, label: r.label }))}
                value={edRole}
                onValueChange={(v) => setEdRole(v as UserRole)}
                placeholder="Selecione um cargo"
                emptyText="Nenhum cargo encontrado."
                className="h-9"
              />
            </div>
            <div className="space-y-2">
              <Label>Grupos de Atendimento</Label>
              <div className="grid grid-cols-3 gap-2">
                {SERVICE_GROUP_OPTIONS.map((g: { value: string; label: string }) => (
                  <div key={g.value} className="flex items-center space-x-2">
                    <Checkbox
                      id={`ed-g-${g.value}`}
                      checked={edGroups.includes(g.value)}
                      onCheckedChange={() => setEdGroups(toggleArrayValue(edGroups, g.value))}
                    />
                    <Label htmlFor={`ed-g-${g.value}`} className="text-xs cursor-pointer">
                      {g.label}
                    </Label>
                  </div>
                ))}
              </div>
            </div>
            <div className="space-y-2">
              <Label>Bases</Label>
              <div className="grid grid-cols-3 gap-2">
                {COMMERCIAL_BASE_OPTIONS.map((b: { value: string; label: string }) => (
                  <div key={b.value} className="flex items-center space-x-2">
                    <Checkbox
                      id={`ed-b-${b.value}`}
                      checked={edBases.includes(b.value)}
                      onCheckedChange={() => setEdBases(toggleArrayValue(edBases, b.value))}
                    />
                    <Label htmlFor={`ed-b-${b.value}`} className="text-xs cursor-pointer">
                      {b.label}
                    </Label>
                  </div>
                ))}
              </div>
            </div>
            <DialogFooter className="pt-2">
              <Button type="button" variant="outline" onClick={() => setEditTarget(null)}>
                Cancelar
              </Button>
              <Button
                type="button"
                disabled={loading}
                onClick={handleSaveEdit}
                className="bg-indigo-600 hover:bg-indigo-700"
              >
                {loading && <Loader2 className="mr-2 h-4 w-4 animate-spin" />}
                Salvar Alterações
              </Button>
            </DialogFooter>
          </div>
        </DialogContent>
      </Dialog>
    </div>
  )
}
