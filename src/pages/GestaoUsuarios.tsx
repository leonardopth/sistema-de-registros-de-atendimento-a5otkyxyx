import { useState, useEffect, useCallback, useMemo } from 'react'
import {
  getUsers,
  approveUser,
  rejectUser,
  deleteUser,
  toggleMasterAccess,
  updateUserDepartments,
} from '@/services/users'
import { cn } from '@/lib/utils'
import { useRealtime } from '@/hooks/use-realtime'
import { useAuth } from '@/hooks/use-auth'
import { useToast } from '@/hooks/use-toast'
import { Button } from '@/components/ui/button'
import { Badge } from '@/components/ui/badge'
import { Checkbox } from '@/components/ui/checkbox'
import {
  Table,
  TableBody,
  TableCell,
  TableHead,
  TableHeader,
  TableRow,
} from '@/components/ui/table'
import { Input } from '@/components/ui/input'
import {
  Dialog,
  DialogContent,
  DialogHeader,
  DialogTitle,
  DialogFooter,
  DialogDescription,
} from '@/components/ui/dialog'
import {
  UserPlus,
  Check,
  X,
  Trash2,
  Loader2,
  Crown,
  History,
  Pencil,
  FilterX,
  KeyRound,
  AlertTriangle,
  Layers,
} from 'lucide-react'
import { NewUserDialog } from '@/components/NewUserDialog'
import { EditUserDialog } from '@/components/EditUserDialog'
import { ResetPasswordDialog } from '@/components/ResetPasswordDialog'
import { MasterAccessHistoryDialog } from '@/components/MasterAccessHistoryDialog'
import { TableColumnFilter } from '@/components/TableColumnFilter'
import type { UserRecord, ApprovalStatus, TravelType } from '@/types/service_record'

function StatusBadge({ status }: { status?: ApprovalStatus }) {
  if (status === 'Aprovado')
    return <Badge className="bg-green-100 text-green-700 hover:bg-green-100">Aprovado</Badge>
  if (status === 'Rejeitado') return <Badge variant="destructive">Rejeitado</Badge>
  return <Badge variant="secondary">Pendente</Badge>
}

export default function GestaoUsuarios() {
  const { user, isMaster } = useAuth()
  const { toast } = useToast()
  const [users, setUsers] = useState<UserRecord[]>([])
  const [search, setSearch] = useState('')
  const [showNewUser, setShowNewUser] = useState(false)
  const [showMasterOnly, setShowMasterOnly] = useState(false)
  const [showHistory, setShowHistory] = useState(false)
  const [editingUser, setEditingUser] = useState<UserRecord | null>(null)
  const [resetPasswordUser, setResetPasswordUser] = useState<UserRecord | null>(null)
  const [loading, setLoading] = useState(true)

  // Ações em lote e seleção
  const [selectedUserIds, setSelectedUserIds] = useState<string[]>([])
  const [bulkDialogOpen, setBulkDialogOpen] = useState(false)
  const [bulkDepartments, setBulkDepartments] = useState<TravelType[]>([])
  const [bulkLoading, setBulkLoading] = useState(false)
  const [filterMissingDeptOnly, setFilterMissingDeptOnly] = useState(false)

  // Filtros por coluna
  const [colNames, setColNames] = useState<string[]>([])
  const [colEmails, setColEmails] = useState<string[]>([])
  const [colRoles, setColRoles] = useState<string[]>([])
  const [colDepartments, setColDepartments] = useState<string[]>([])
  const [colStatuses, setColStatuses] = useState<string[]>([])
  const [colGroups, setColGroups] = useState<string[]>([])

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
      await approveUser(id, user?.id || '', user?.name || '')
      toast({ title: 'Usuário aprovado!' })
      loadUsers()
    } catch {
      toast({ variant: 'destructive', title: 'Erro ao aprovar' })
    }
  }
  const handleReject = async (id: string) => {
    try {
      await rejectUser(id)
      toast({ title: 'Usuário rejeitado' })
      loadUsers()
    } catch {
      toast({ variant: 'destructive', title: 'Erro ao rejeitar' })
    }
  }
  const handleDelete = async (id: string) => {
    if (!confirm('Tem certeza que deseja remover este usuário?')) return
    try {
      await deleteUser(id)
      toast({ title: 'Usuário removido' })
      loadUsers()
    } catch {
      toast({ variant: 'destructive', title: 'Erro ao remover' })
    }
  }
  const handleToggleMaster = async (id: string, master_access: boolean) => {
    try {
      await toggleMasterAccess(id, master_access)
      toast({
        title: master_access ? 'Acesso Master concedido!' : 'Acesso Master revogado!',
      })
      loadUsers()
    } catch {
      toast({ variant: 'destructive', title: 'Erro ao alterar acesso Master' })
    }
  }

  const filtered = users.filter(
    (u) =>
      u.name?.toLowerCase().includes(search.toLowerCase()) ||
      u.email?.toLowerCase().includes(search.toLowerCase()),
  )
  const hasColFilters =
    colNames.length > 0 ||
    colEmails.length > 0 ||
    colRoles.length > 0 ||
    colDepartments.length > 0 ||
    colStatuses.length > 0 ||
    colGroups.length > 0 ||
    filterMissingDeptOnly

  const missingDeptUsers = useMemo(
    () => users.filter((u) => !u.departments || u.departments.length === 0),
    [users],
  )

  const visibleUsers = (showMasterOnly ? filtered.filter((u) => u.master_access) : filtered)
    .filter((u) => (!filterMissingDeptOnly ? true : !u.departments || u.departments.length === 0))
    .filter((u) => {
      const matchesName = colNames.length === 0 || colNames.includes(u.name || '-')
      const matchesEmail = colEmails.length === 0 || colEmails.includes(u.email || '-')
      const matchesRole = colRoles.length === 0 || colRoles.includes(u.role)
      const matchesStatus = colStatuses.length === 0 || colStatuses.includes(u.approval_status)
      const deptStr = u.departments?.length ? u.departments.join(', ') : '-'
      const matchesDept = colDepartments.length === 0 || colDepartments.includes(deptStr)
      const groupStr = u.service_groups?.length
        ? u.service_groups.join(', ')
        : u.bases?.length
          ? u.bases.join(', ')
          : '-'
      const matchesGroup = colGroups.length === 0 || colGroups.includes(groupStr)
      return (
        matchesName && matchesEmail && matchesRole && matchesDept && matchesStatus && matchesGroup
      )
    })

  const allVisibleSelected =
    visibleUsers.length > 0 && visibleUsers.every((u) => selectedUserIds.includes(u.id))

  const handleToggleSelectAll = () => {
    if (allVisibleSelected) {
      setSelectedUserIds([])
    } else {
      setSelectedUserIds(visibleUsers.map((u) => u.id))
    }
  }

  const handleToggleSelectUser = (id: string) => {
    setSelectedUserIds((prev) =>
      prev.includes(id) ? prev.filter((item) => item !== id) : [...prev, id],
    )
  }

  const handleSelectAllMissingDept = () => {
    setSelectedUserIds(missingDeptUsers.map((u) => u.id))
  }

  const handleBulkApplyDepartments = async () => {
    if (selectedUserIds.length === 0) {
      toast({ variant: 'destructive', title: 'Nenhum usuário selecionado' })
      return
    }
    if (bulkDepartments.length === 0) {
      toast({
        variant: 'destructive',
        title: 'Selecione pelo menos um departamento (Nacional ou Internacional)',
      })
      return
    }
    setBulkLoading(true)
    try {
      await Promise.all(
        selectedUserIds.map((userId) => updateUserDepartments(userId, bulkDepartments)),
      )
      toast({
        title: 'Departamentos atualizados em lote!',
        description: `${selectedUserIds.length} usuário(s) atualizado(s) com sucesso.`,
      })
      setBulkDialogOpen(false)
      setSelectedUserIds([])
      setBulkDepartments([])
      await loadUsers()
    } catch {
      toast({ variant: 'destructive', title: 'Erro ao aplicar departamentos em lote' })
    } finally {
      setBulkLoading(false)
    }
  }

  return (
    <div className="space-y-4 p-4 md:p-6">
      <div className="flex items-center justify-between flex-wrap gap-2">
        <div>
          <h1 className="text-2xl font-bold text-indigo-950">Gestão de Usuários</h1>
          {missingDeptUsers.length > 0 && (
            <p className="text-xs text-amber-700 font-medium flex items-center gap-1.5 mt-0.5">
              <AlertTriangle className="h-3.5 w-3.5 text-amber-600" />
              <span>
                <strong>{missingDeptUsers.length}</strong> usuário(s) legado(s) sem departamento
                definido.
              </span>
            </p>
          )}
        </div>
        <div className="flex items-center gap-2 flex-wrap">
          {isMaster && (
            <>
              <Button
                variant={showMasterOnly ? 'default' : 'outline'}
                onClick={() => setShowMasterOnly((v) => !v)}
                className={cn(showMasterOnly && 'bg-amber-500 hover:bg-amber-600 border-amber-500')}
              >
                <Crown className="h-4 w-4 mr-2" />
                {showMasterOnly ? 'Mostrando Masters' : 'Somente Masters'}
              </Button>
              <Button variant="outline" onClick={() => setShowHistory(true)}>
                <History className="h-4 w-4 mr-2" /> Histórico
              </Button>
            </>
          )}
          <Button
            onClick={() => setShowNewUser(true)}
            className="bg-indigo-600 hover:bg-indigo-700"
          >
            <UserPlus className="h-4 w-4 mr-2" /> Novo Usuário
          </Button>
        </div>
      </div>

      {/* Barra de ações e filtros */}
      <div className="flex items-center justify-between flex-wrap gap-2">
        <div className="flex items-center gap-2 flex-wrap flex-1">
          <Input
            placeholder="Buscar por nome ou e-mail..."
            value={search}
            onChange={(e) => setSearch(e.target.value)}
            className="max-w-sm"
          />
          <Button
            variant={filterMissingDeptOnly ? 'secondary' : 'outline'}
            size="sm"
            onClick={() => setFilterMissingDeptOnly((prev) => !prev)}
            className={cn(
              'text-xs h-9',
              filterMissingDeptOnly &&
                'bg-amber-100 text-amber-900 border-amber-300 hover:bg-amber-200',
            )}
          >
            <AlertTriangle className="h-3.5 w-3.5 mr-1.5 text-amber-600" />
            {filterMissingDeptOnly ? 'Mostrando Sem Depto' : 'Filtrar Sem Depto'}
            {missingDeptUsers.length > 0 && (
              <Badge className="ml-1.5 bg-amber-600 text-white hover:bg-amber-600 text-[10px] px-1.5 py-0">
                {missingDeptUsers.length}
              </Badge>
            )}
          </Button>
          {hasColFilters && (
            <Button
              variant="ghost"
              size="sm"
              className="text-xs h-9 text-slate-500"
              onClick={() => {
                setColNames([])
                setColEmails([])
                setColRoles([])
                setColDepartments([])
                setColStatuses([])
                setColGroups([])
                setFilterMissingDeptOnly(false)
              }}
            >
              <FilterX className="h-3.5 w-3.5 mr-1" /> Limpar filtros
            </Button>
          )}
        </div>

        {/* Ações em lote para Master */}
        {isMaster && (
          <div className="flex items-center gap-2">
            {missingDeptUsers.length > 0 && selectedUserIds.length === 0 && (
              <Button
                variant="outline"
                size="sm"
                className="text-xs h-9 text-amber-800 border-amber-300 bg-amber-50/50 hover:bg-amber-100"
                onClick={handleSelectAllMissingDept}
              >
                <AlertTriangle className="h-3.5 w-3.5 mr-1 text-amber-600" />
                Selecionar {missingDeptUsers.length} Sem Depto
              </Button>
            )}
            {selectedUserIds.length > 0 && (
              <div className="flex items-center gap-2 bg-indigo-50 border border-indigo-200 px-3 py-1 rounded-md">
                <span className="text-xs text-indigo-950 font-semibold">
                  {selectedUserIds.length} selecionado(s)
                </span>
                <Button
                  size="sm"
                  className="bg-indigo-600 hover:bg-indigo-700 text-white text-xs h-7"
                  onClick={() => setBulkDialogOpen(true)}
                >
                  <Layers className="h-3.5 w-3.5 mr-1" />
                  Definir Departamento em Lote
                </Button>
                <Button
                  variant="ghost"
                  size="sm"
                  className="text-xs h-7 text-slate-500 hover:text-slate-800"
                  onClick={() => setSelectedUserIds([])}
                >
                  Desmarcar
                </Button>
              </div>
            )}
          </div>
        )}
      </div>
      {loading ? (
        <div className="flex justify-center py-8">
          <Loader2 className="h-6 w-6 animate-spin text-indigo-600" />
        </div>
      ) : (
        <div className="rounded-lg border overflow-x-auto">
          <Table>
            <TableHeader>
              <TableRow>
                {isMaster && (
                  <TableHead className="w-10">
                    <Checkbox
                      checked={allVisibleSelected}
                      onCheckedChange={handleToggleSelectAll}
                      aria-label="Selecionar todos os usuários visíveis"
                    />
                  </TableHead>
                )}
                <TableHead>
                  <div className="flex items-center justify-between gap-1">
                    <span>Nome</span>
                    <TableColumnFilter
                      title="Nome"
                      options={users.map((u) => u.name || '-')}
                      selectedValues={colNames}
                      onChange={setColNames}
                    />
                  </div>
                </TableHead>
                <TableHead>
                  <div className="flex items-center justify-between gap-1">
                    <span>E-mail</span>
                    <TableColumnFilter
                      title="E-mail"
                      options={users.map((u) => u.email || '-')}
                      selectedValues={colEmails}
                      onChange={setColEmails}
                    />
                  </div>
                </TableHead>
                <TableHead>
                  <div className="flex items-center justify-between gap-1">
                    <span>Cargo</span>
                    <TableColumnFilter
                      title="Cargo"
                      options={users.map((u) => u.role)}
                      selectedValues={colRoles}
                      onChange={setColRoles}
                    />
                  </div>
                </TableHead>
                <TableHead>
                  <div className="flex items-center justify-between gap-1">
                    <span>Departamento</span>
                    <TableColumnFilter
                      title="Departamento"
                      options={users.map((u) =>
                        u.departments?.length ? u.departments.join(', ') : '-',
                      )}
                      selectedValues={colDepartments}
                      onChange={setColDepartments}
                    />
                  </div>
                </TableHead>
                <TableHead>
                  <div className="flex items-center justify-between gap-1">
                    <span>Status</span>
                    <TableColumnFilter
                      title="Status"
                      options={['Aprovado', 'Pendente', 'Rejeitado']}
                      selectedValues={colStatuses}
                      onChange={setColStatuses}
                    />
                  </div>
                </TableHead>
                <TableHead>
                  <div className="flex items-center justify-between gap-1">
                    <span>Grupos / Bases</span>
                    <TableColumnFilter
                      title="Grupos"
                      options={users.map((u) =>
                        u.service_groups?.length
                          ? u.service_groups.join(', ')
                          : u.bases?.length
                            ? u.bases.join(', ')
                            : '-',
                      )}
                      selectedValues={colGroups}
                      onChange={setColGroups}
                    />
                  </div>
                </TableHead>
                <TableHead className="text-right">Ações</TableHead>
              </TableRow>
            </TableHeader>
            <TableBody>
              {visibleUsers.map((u) => {
                const isSelected = selectedUserIds.includes(u.id)
                const hasNoDept = !u.departments || u.departments.length === 0
                return (
                  <TableRow
                    key={u.id}
                    className={cn(
                      isSelected && 'bg-indigo-50/60',
                      hasNoDept && !isSelected && 'bg-amber-50/30',
                    )}
                  >
                    {isMaster && (
                      <TableCell className="w-10">
                        <Checkbox
                          checked={isSelected}
                          onCheckedChange={() => handleToggleSelectUser(u.id)}
                          aria-label={`Selecionar ${u.name}`}
                        />
                      </TableCell>
                    )}
                    <TableCell className="font-medium">
                      <div className="flex items-center gap-1.5">
                        <span>{u.name || '-'}</span>
                        {hasNoDept && (
                          <span
                            title="Usuário legado sem departamento preenchido"
                            className="inline-flex items-center text-[10px] font-semibold text-amber-700 bg-amber-100/80 border border-amber-300 px-1.5 py-0.2 rounded"
                          >
                            <AlertTriangle className="h-3 w-3 mr-0.5 text-amber-600 inline" />
                            Sem Depto
                          </span>
                        )}
                      </div>
                    </TableCell>
                    <TableCell className="text-sm text-slate-600">{u.email || '-'}</TableCell>
                    <TableCell className="text-sm">
                      {u.role}
                      {u.master_access && u.role !== 'Master' && (
                        <Badge className="ml-2 bg-amber-100 text-amber-700 hover:bg-amber-100">
                          <Crown className="h-3 w-3 mr-1" /> Master
                        </Badge>
                      )}
                    </TableCell>
                    <TableCell>
                      <div className="flex flex-wrap gap-1">
                        {u.departments && u.departments.length > 0 ? (
                          u.departments.map((dept) => (
                            <Badge
                              key={dept}
                              className={cn(
                                'text-xs font-medium',
                                dept === 'Nacional'
                                  ? 'bg-emerald-100 text-emerald-800 border border-emerald-200 hover:bg-emerald-100'
                                  : 'bg-purple-100 text-purple-800 border border-purple-200 hover:bg-purple-100',
                              )}
                            >
                              {dept}
                            </Badge>
                          ))
                        ) : (
                          <Badge
                            variant="outline"
                            className="text-xs bg-amber-50 text-amber-800 border-dashed border-amber-300 hover:bg-amber-50"
                          >
                            ⚠️ Não preenchido
                          </Badge>
                        )}
                      </div>
                    </TableCell>
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
                        <Button
                          size="sm"
                          variant="ghost"
                          onClick={() => setEditingUser(u)}
                          title="Editar usuário"
                        >
                          <Pencil className="h-4 w-4 text-indigo-600" />
                        </Button>
                        {isMaster && (
                          <Button
                            size="sm"
                            variant="ghost"
                            onClick={() => setResetPasswordUser(u)}
                            title="Resetar Senha"
                          >
                            <KeyRound className="h-4 w-4 text-amber-600" />
                          </Button>
                        )}
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
                        {isMaster && u.id !== user?.id && u.role !== 'Master' && (
                          <Button
                            size="sm"
                            variant="ghost"
                            onClick={() => handleToggleMaster(u.id, !u.master_access)}
                            title={u.master_access ? 'Revogar Master' : 'Tornar Master'}
                          >
                            <Crown
                              className={cn(
                                'h-4 w-4',
                                u.master_access ? 'text-amber-500' : 'text-slate-400',
                              )}
                            />
                          </Button>
                        )}
                        {u.id !== user?.id && u.role !== 'Master' && (
                          <Button size="sm" variant="ghost" onClick={() => handleDelete(u.id)}>
                            <Trash2 className="h-4 w-4 text-red-600" />
                          </Button>
                        )}
                      </div>
                    </TableCell>
                  </TableRow>
                ))
              )}
              {visibleUsers.length === 0 ? (
                <TableRow>
                  <TableCell colSpan={isMaster ? 8 : 7} className="text-center text-slate-400 py-8">
                    Nenhum usuário encontrado.
                  </TableCell>
                </TableRow>
              ) : null}
            </TableBody>
          </Table>
        </div>
      )}
      <NewUserDialog open={showNewUser} onOpenChange={setShowNewUser} onSuccess={loadUsers} />
      <EditUserDialog
        user={editingUser}
        open={!!editingUser}
        onOpenChange={(v) => {
          if (!v) setEditingUser(null)
        }}
        onSuccess={loadUsers}
      />
      <ResetPasswordDialog
        user={resetPasswordUser}
        open={!!resetPasswordUser}
        onOpenChange={(v) => {
          if (!v) setResetPasswordUser(null)
        }}
        onSuccess={loadUsers}
      />
      <MasterAccessHistoryDialog open={showHistory} onOpenChange={setShowHistory} />

      {/* Diálogo de Preenchimento em Massa de Departamento */}
      <Dialog open={bulkDialogOpen} onOpenChange={setBulkDialogOpen}>
        <DialogContent className="sm:max-w-[420px]">
          <DialogHeader>
            <DialogTitle className="flex items-center gap-2 text-indigo-950 font-bold">
              <Layers className="h-5 w-5 text-indigo-600" />
              Preencher Departamentos em Lote
            </DialogTitle>
            <DialogDescription>
              Aplique os departamentos selecionados para os{' '}
              <strong>{selectedUserIds.length}</strong> usuário(s) selecionado(s).
            </DialogDescription>
          </DialogHeader>

          <div className="space-y-3 py-2">
            <p className="text-xs text-slate-600 font-medium">
              Selecione quais departamentos deseja atribuir aos usuários marcados:
            </p>
            <div className="flex items-center gap-6 pt-1">
              {(['Nacional', 'Internacional'] as TravelType[]).map((dept) => (
                <label key={dept} className="flex items-center gap-2 text-sm cursor-pointer">
                  <Checkbox
                    checked={bulkDepartments.includes(dept)}
                    onCheckedChange={(checked) => {
                      setBulkDepartments((prev) =>
                        checked ? [...prev, dept] : prev.filter((d) => d !== dept),
                      )
                    }}
                  />
                  <span className="font-medium text-slate-800">{dept}</span>
                </label>
              ))}
            </div>
            <p className="text-[11px] text-slate-500">
              * Você pode selecionar ambos se os colaboradores atuam tanto em Nacional quanto em
              Internacional.
            </p>
          </div>

          <DialogFooter>
            <Button
              variant="outline"
              onClick={() => setBulkDialogOpen(false)}
              disabled={bulkLoading}
            >
              Cancelar
            </Button>
            <Button
              onClick={handleBulkApplyDepartments}
              disabled={bulkLoading || bulkDepartments.length === 0}
              className="bg-indigo-600 hover:bg-indigo-700"
            >
              {bulkLoading && <Loader2 className="h-4 w-4 mr-2 animate-spin" />}
              Aplicar em {selectedUserIds.length} Usuário(s)
            </Button>
          </DialogFooter>
        </DialogContent>
      </Dialog>
    </div>
  )
}
