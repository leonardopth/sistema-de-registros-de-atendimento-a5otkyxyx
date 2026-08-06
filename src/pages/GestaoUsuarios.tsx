import { useState, useEffect, useMemo } from 'react'
import { Card } from '@/components/ui/card'
import { Button } from '@/components/ui/button'
import { Input } from '@/components/ui/input'
import { Label } from '@/components/ui/label'
import { Badge } from '@/components/ui/badge'
import { Tabs, TabsList, TabsTrigger, TabsContent } from '@/components/ui/tabs'
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
import { Checkbox } from '@/components/ui/checkbox'
import {
  getUsersWithEmails,
  updateUser,
  approveUser,
  rejectUser,
  deleteUser,
} from '@/services/users'
import { extractFieldErrors, type FieldErrors } from '@/lib/pocketbase/errors'
import { UserRecord, UserRole, ApprovalStatus } from '@/types/service_record'
import { useAuth } from '@/hooks/use-auth'
import { useRealtime } from '@/hooks/use-realtime'
import { useToast } from '@/hooks/use-toast'
import { cn } from '@/lib/utils'
import { SERVICE_GROUP_OPTIONS } from '@/lib/service-groups'
import { UserInlineEmailEdit } from '@/components/UserInlineEmailEdit'
import { ServiceGroupManager } from '@/components/ServiceGroupManager'
import {
  downloadUsersCSV,
  downloadUsersPDF,
  formatDateTime,
  type UserExportRow,
} from '@/lib/user-export'
import {
  UserCheck,
  Check,
  X,
  Pencil,
  Loader2,
  Trash2,
  ShieldX,
  FileText,
  FileType,
} from 'lucide-react'
import { Mail } from 'lucide-react'

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

export default function GestaoUsuarios() {
  const { user, isMaster } = useAuth()
  const { toast } = useToast()
  const [users, setUsers] = useState<UserRecord[]>([])
  const [loading, setLoading] = useState(true)
  const [search, setSearch] = useState('')
  const [filterStatus, setFilterStatus] = useState('all')
  const [filterRole, setFilterRole] = useState('all')
  const [filterGroup, setFilterGroup] = useState('all')
  const [activeTab, setActiveTab] = useState('list')
  const [accessDenied, setAccessDenied] = useState(false)
  const [dialogOpen, setDialogOpen] = useState(false)
  const [editingId, setEditingId] = useState<string | null>(null)
  const [editName, setEditName] = useState('')
  const [editEmail, setEditEmail] = useState('')
  const [editRole, setEditRole] = useState<UserRole>('Consultores')
  const [editStatus, setEditStatus] = useState<ApprovalStatus>('Aprovado')
  const [editServiceGroups, setEditServiceGroups] = useState<string[]>([])
  const [fieldErrors, setFieldErrors] = useState<FieldErrors>({})
  const [saving, setSaving] = useState(false)
  const [deleteTarget, setDeleteTarget] = useState<UserRecord | null>(null)
  const [deleting, setDeleting] = useState(false)

  const loadData = async () => {
    setLoading(true)
    setAccessDenied(false)
    try {
      const data = await getUsersWithEmails()
      setUsers(data)
    } catch (e: any) {
      if (e?.status === 403) setAccessDenied(true)
      else if (e?.status === 401)
        toast({
          variant: 'destructive',
          title: 'Não autenticado',
          description: 'Faça login novamente.',
        })
      else toast({ variant: 'destructive', title: 'Erro ao carregar usuários' })
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

  const canEditEmail = isMaster || user?.role === 'Gerentes'

  const filtered = useMemo(
    () =>
      users.filter((u) => {
        const q = search.toLowerCase()
        const ms = !q || u.name?.toLowerCase().includes(q) || u.email?.toLowerCase().includes(q)
        const mst = filterStatus === 'all' || u.approval_status === filterStatus
        const mr = filterRole === 'all' || u.role === filterRole
        const mg = filterGroup === 'all' || (u.service_groups || []).includes(filterGroup)
        return ms && mst && mr && mg
      }),
    [users, search, filterStatus, filterRole, filterGroup],
  )

  const pendingCount = users.filter((u) => u.approval_status === 'Pendente').length

  const exportRows = useMemo<UserExportRow[]>(
    () =>
      filtered.map((u) => ({
        name: u.name || '',
        email: u.email || '',
        role: u.role || '',
        service_groups: (u.service_groups || []).join(', '),
        approval_status: u.approval_status || '',
        created: u.created || '',
      })),
    [filtered],
  )

  const handleExportCSV = () => downloadUsersCSV(exportRows)
  const handleExportPDF = () => downloadUsersPDF(exportRows)

  const handleEdit = (u: UserRecord) => {
    setEditingId(u.id)
    setEditName(u.name || '')
    setEditEmail(u.email || '')
    setEditRole(u.role || 'Consultores')
    setEditStatus(u.approval_status || 'Aprovado')
    setEditServiceGroups(u.service_groups || [])
    setFieldErrors({})
    setDialogOpen(true)
  }

  const handleSave = async (e: React.FormEvent) => {
    e.preventDefault()
    setFieldErrors({})
    if (!editEmail.trim()) {
      setFieldErrors({ email: 'E-mail é obrigatório.' })
      return
    }
    setSaving(true)
    try {
      await updateUser(editingId!, {
        name: editName,
        email: editEmail.trim(),
        role: editRole,
        approval_status: editStatus,
        service_groups: ['Gerentes', 'Supervisores', 'Líderes', 'Consultores'].includes(editRole)
          ? editServiceGroups
          : [],
      })
      toast({ title: 'Usuário atualizado com sucesso' })
      setDialogOpen(false)
      loadData()
    } catch (err) {
      const errors = extractFieldErrors(err)
      if (Object.keys(errors).length > 0) setFieldErrors(errors)
      toast({ variant: 'destructive', title: 'Erro ao atualizar usuário' })
    } finally {
      setSaving(false)
    }
  }

  const handleApprove = async (id: string) => {
    try {
      await approveUser(id)
      toast({ title: 'Usuário aprovado' })
      loadData()
    } catch {
      toast({ variant: 'destructive', title: 'Erro ao aprovar' })
    }
  }
  const handleReject = async (id: string) => {
    try {
      await rejectUser(id)
      toast({ title: 'Usuário rejeitado' })
      loadData()
    } catch {
      toast({ variant: 'destructive', title: 'Erro ao rejeitar' })
    }
  }
  const handleDelete = async () => {
    if (!deleteTarget) return
    setDeleting(true)
    try {
      await deleteUser(deleteTarget.id)
      toast({ title: 'Usuário excluído' })
      setDeleteTarget(null)
      loadData()
    } catch {
      toast({ variant: 'destructive', title: 'Erro ao excluir usuário' })
    } finally {
      setDeleting(false)
    }
  }

  if (accessDenied) {
    return (
      <div className="flex flex-col items-center justify-center py-20">
        <ShieldX className="h-12 w-12 text-rose-400 mb-4" />
        <h2 className="text-xl font-bold text-slate-700">Acesso Negado</h2>
        <p className="text-sm text-slate-500 mt-2 max-w-md text-center">
          Você não tem permissão para acessar esta página. Apenas usuários Master e Gerentes podem
          visualizar a gestão de usuários.
        </p>
      </div>
    )
  }

  const renderListContent = () => (
    <Card className="p-4 border-slate-200 shadow-subtle">
      <div className="flex flex-wrap items-center gap-2 mb-4">
        <Input
          placeholder="Buscar por nome ou e-mail..."
          value={search}
          onChange={(e) => setSearch(e.target.value)}
          className="h-9 text-xs flex-1 min-w-[180px]"
        />
        <Select value={filterStatus} onValueChange={setFilterStatus}>
          <SelectTrigger className="h-9 text-xs w-[130px]">
            <SelectValue placeholder="Status" />
          </SelectTrigger>
          <SelectContent>
            <SelectItem value="all">Todos os status</SelectItem>
            {STATUSES.map((s) => (
              <SelectItem key={s} value={s}>
                {s}
              </SelectItem>
            ))}
          </SelectContent>
        </Select>
        <Select value={filterRole} onValueChange={setFilterRole}>
          <SelectTrigger className="h-9 text-xs w-[150px]">
            <SelectValue placeholder="Perfil" />
          </SelectTrigger>
          <SelectContent>
            <SelectItem value="all">Todos os perfis</SelectItem>
            {ROLES.map((r) => (
              <SelectItem key={r} value={r}>
                {r}
              </SelectItem>
            ))}
          </SelectContent>
        </Select>
        <Select value={filterGroup} onValueChange={setFilterGroup}>
          <SelectTrigger className="h-9 text-xs w-[150px]">
            <SelectValue placeholder="Grupo" />
          </SelectTrigger>
          <SelectContent>
            <SelectItem value="all">Todos os grupos</SelectItem>
            {SERVICE_GROUP_OPTIONS.map((g) => (
              <SelectItem key={g.value} value={g.value}>
                {g.label}
              </SelectItem>
            ))}
          </SelectContent>
        </Select>
        <div className="ml-auto flex gap-1">
          <Button
            variant="outline"
            size="sm"
            className="text-xs"
            onClick={handleExportCSV}
            disabled={filtered.length === 0}
          >
            <FileText className="h-3.5 w-3.5 mr-1" />
            CSV
          </Button>
          <Button
            variant="outline"
            size="sm"
            className="text-xs"
            onClick={handleExportPDF}
            disabled={filtered.length === 0}
          >
            <FileType className="h-3.5 w-3.5 mr-1" />
            PDF
          </Button>
        </div>
      </div>
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
                <TableHead className="text-xs font-bold">Perfil</TableHead>
                <TableHead className="text-xs font-bold">Grupo</TableHead>
                <TableHead className="text-xs font-bold">Status</TableHead>
                <TableHead className="text-xs font-bold">Criado em</TableHead>
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
                  <TableCell className="max-w-[220px]">
                    <UserInlineEmailEdit
                      userId={u.id}
                      email={u.email || ''}
                      canEdit={canEditEmail}
                      onSaved={loadData}
                    />
                  </TableCell>
                  <TableCell className="text-xs text-slate-600">{u.role}</TableCell>
                  <TableCell className="text-xs">
                    {u.service_groups && u.service_groups.length > 0 ? (
                      <div className="flex flex-wrap gap-1">
                        {u.service_groups.map((g) => (
                          <Badge key={g} variant="secondary" className="text-[10px]">
                            {g}
                          </Badge>
                        ))}
                      </div>
                    ) : (
                      <span className="text-slate-400">—</span>
                    )}
                  </TableCell>
                  <TableCell>
                    <StatusBadge status={u.approval_status} />
                    {u.approved_by && (
                      <p className="text-[10px] text-slate-400 mt-1">
                        por {u.approved_by}
                        {u.approved_at ? ` em ${formatDateTime(u.approved_at)}` : ''}
                      </p>
                    )}
                  </TableCell>
                  <TableCell className="text-xs text-slate-500 whitespace-nowrap">
                    {formatDateTime(u.created)}
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
                            <Check className="h-3.5 w-3.5 mr-1" />
                            Aprovar
                          </Button>
                          <Button
                            variant="ghost"
                            size="sm"
                            className="text-xs h-7 text-rose-500"
                            onClick={() => handleReject(u.id)}
                          >
                            <X className="h-3.5 w-3.5 mr-1" />
                            Rejeitar
                          </Button>
                        </>
                      )}
                      <Button
                        variant="ghost"
                        size="sm"
                        className="text-xs h-7 text-indigo-600"
                        onClick={() => handleEdit(u)}
                      >
                        <Pencil className="h-3.5 w-3.5 mr-1" />
                        Editar
                      </Button>
                      <Button
                        variant="ghost"
                        size="sm"
                        className="text-xs h-7 text-rose-500 disabled:opacity-40 disabled:cursor-not-allowed"
                        disabled={u.id === user?.id}
                        onClick={() => setDeleteTarget(u)}
                      >
                        <Trash2 className="h-3.5 w-3.5 mr-1" />
                        Excluir
                      </Button>
                    </div>
                  </TableCell>
                </TableRow>
              ))}
              {filtered.length === 0 && (
                <TableRow>
                  <TableCell colSpan={7} className="text-center text-xs text-slate-400 py-8">
                    Nenhum usuário encontrado.
                  </TableCell>
                </TableRow>
              )}
            </TableBody>
          </Table>
        </div>
      )}
    </Card>
  )

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

      {isMaster ? (
        <Tabs value={activeTab} onValueChange={setActiveTab}>
          <TabsList>
            <TabsTrigger value="list" className="text-xs">
              Lista de Usuários
            </TabsTrigger>
            <TabsTrigger value="groups" className="text-xs">
              Grupos de Atendimento
            </TabsTrigger>
          </TabsList>
          <TabsContent value="list">{renderListContent()}</TabsContent>
          <TabsContent value="groups">
            <ServiceGroupManager users={users} onSaved={loadData} />
          </TabsContent>
        </Tabs>
      ) : (
        renderListContent()
      )}

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
                  if (fieldErrors.email) setFieldErrors((p) => ({ ...p, email: undefined }))
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
            {['Gerentes', 'Supervisores', 'Líderes', 'Consultores'].includes(editRole) && (
              <div className="space-y-2">
                <Label>Grupo de Atendimento</Label>
                <p className="text-xs text-slate-500">
                  Selecione um ou mais grupos para restringir o acesso do usuário.
                </p>
                <div className="grid grid-cols-2 gap-2">
                  {SERVICE_GROUP_OPTIONS.map((opt) => (
                    <div key={opt.value} className="flex items-center space-x-2">
                      <Checkbox
                        id={`sg-${opt.value}`}
                        checked={editServiceGroups.includes(opt.value)}
                        onCheckedChange={(checked) => {
                          if (checked) setEditServiceGroups([...editServiceGroups, opt.value])
                          else
                            setEditServiceGroups(editServiceGroups.filter((g) => g !== opt.value))
                        }}
                      />
                      <Label
                        htmlFor={`sg-${opt.value}`}
                        className="cursor-pointer text-sm font-normal"
                      >
                        {opt.label}
                      </Label>
                    </div>
                  ))}
                </div>
              </div>
            )}
            <DialogFooter className="pt-2">
              <Button type="button" variant="outline" onClick={() => setDialogOpen(false)}>
                Cancelar
              </Button>
              <Button type="submit" disabled={saving} className="bg-indigo-600 hover:bg-indigo-700">
                {saving && <Loader2 className="mr-2 h-4 w-4 animate-spin" />}Salvar Alterações
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
              {deleteTarget?.email ? ` (${deleteTarget.email})` : ''}? Esta ação é irreversível.
            </AlertDialogDescription>
          </AlertDialogHeader>
          <AlertDialogFooter>
            <AlertDialogCancel>Cancelar</AlertDialogCancel>
            <AlertDialogAction
              onClick={handleDelete}
              disabled={deleting}
              className="bg-rose-600 hover:bg-rose-700"
            >
              {deleting && <Loader2 className="mr-2 h-4 w-4 animate-spin" />}Excluir Usuário
            </AlertDialogAction>
          </AlertDialogFooter>
        </AlertDialogContent>
      </AlertDialog>
    </div>
  )
}
