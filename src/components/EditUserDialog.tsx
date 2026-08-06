import { useState, useEffect } from 'react'
import {
  Dialog,
  DialogContent,
  DialogHeader,
  DialogTitle,
  DialogFooter,
} from '@/components/ui/dialog'
import { Button } from '@/components/ui/button'
import { Input } from '@/components/ui/input'
import { Label } from '@/components/ui/label'
import {
  Select,
  SelectContent,
  SelectGroup,
  SelectItem,
  SelectLabel,
  SelectTrigger,
  SelectValue,
} from '@/components/ui/select'
import { Checkbox } from '@/components/ui/checkbox'
import { Loader2, Pencil } from 'lucide-react'
import { useToast } from '@/hooks/use-toast'
import { extractFieldErrors, type FieldErrors } from '@/lib/pocketbase/errors'
import {
  updateUser,
  toggleMasterAccess,
  updateUserEmail,
  updateUserServiceGroups,
  updateUserBases,
} from '@/services/users'
import type {
  UserRecord,
  UserRole,
  ServiceGroup,
  CommercialBase,
  ApprovalStatus,
} from '@/types/service_record'

const ATENDIMENTO_ROLES: UserRole[] = ['Gerentes', 'Supervisores', 'Líderes', 'Consultores']
const VENDAS_ROLES: UserRole[] = ['Gestor Comercial', 'Executivo de contas']
const SERVICE_GROUP_OPTIONS: ServiceGroup[] = [
  'Concierge',
  'Exclusivo',
  'LOT',
  'BR1',
  'BR2',
  'SAO',
  'SPI',
  'SUL',
]
const BASE_OPTIONS: CommercialBase[] = [
  'NO/NE',
  'CO',
  'RJ/ES/MG',
  'SAO',
  'SPI',
  'SUL',
  'LOT',
  'INSIDE SALES',
]
const APPROVAL_OPTIONS: ApprovalStatus[] = ['Pendente', 'Aprovado', 'Rejeitado']

interface EditUserDialogProps {
  user: UserRecord | null
  open: boolean
  onOpenChange: (open: boolean) => void
  onSuccess?: () => void
}

export function EditUserDialog({ user, open, onOpenChange, onSuccess }: EditUserDialogProps) {
  const { toast } = useToast()
  const [name, setName] = useState('')
  const [email, setEmail] = useState('')
  const [role, setRole] = useState<UserRole | ''>('')
  const [approvalStatus, setApprovalStatus] = useState<ApprovalStatus>('Pendente')
  const [masterAccess, setMasterAccess] = useState(false)
  const [serviceGroups, setServiceGroups] = useState<ServiceGroup[]>([])
  const [bases, setBases] = useState<CommercialBase[]>([])
  const [loading, setLoading] = useState(false)
  const [fieldErrors, setFieldErrors] = useState<FieldErrors>({})

  useEffect(() => {
    if (user) {
      setName(user.name || '')
      setEmail(user.email || '')
      setRole(user.role || '')
      setApprovalStatus(user.approval_status || 'Pendente')
      setMasterAccess(user.master_access || false)
      setServiceGroups(user.service_groups || [])
      setBases(user.bases || [])
      setFieldErrors({})
    }
  }, [user])

  const isAtendimento = ATENDIMENTO_ROLES.includes(role as UserRole)
  const isVendas = VENDAS_ROLES.includes(role as UserRole)

  const toggleGroup = (g: ServiceGroup) =>
    setServiceGroups((prev) => (prev.includes(g) ? prev.filter((x) => x !== g) : [...prev, g]))
  const toggleBase = (b: CommercialBase) =>
    setBases((prev) => (prev.includes(b) ? prev.filter((x) => x !== b) : [...prev, b]))

  const handleSave = async () => {
    if (!user || !name.trim()) return
    setLoading(true)
    setFieldErrors({})
    try {
      await updateUser(user.id, {
        name: name.trim(),
        role: role as UserRole,
        approval_status: approvalStatus,
      })
      if (email.trim() !== user.email) {
        await updateUserEmail(user.id, email.trim())
      }
      if (isAtendimento) {
        await updateUserServiceGroups(user.id, serviceGroups)
      }
      if (isVendas) {
        await updateUserBases(user.id, bases)
      }
      if (masterAccess !== (user.master_access || false)) {
        await toggleMasterAccess(user.id, masterAccess)
      }
      toast({ title: 'Usuário atualizado com sucesso!' })
      onOpenChange(false)
      onSuccess?.()
    } catch (err) {
      setFieldErrors(extractFieldErrors(err))
      toast({ variant: 'destructive', title: 'Erro ao atualizar usuário' })
    } finally {
      setLoading(false)
    }
  }

  return (
    <Dialog open={open} onOpenChange={onOpenChange}>
      <DialogContent className="sm:max-w-[480px]">
        <DialogHeader>
          <DialogTitle className="flex items-center gap-2">
            <Pencil className="h-5 w-5" /> Editar Usuário
          </DialogTitle>
        </DialogHeader>
        <div className="space-y-4">
          <div className="space-y-1.5">
            <Label className="text-xs font-semibold">Nome *</Label>
            <Input value={name} onChange={(e) => setName(e.target.value)} className="h-9" />
            {fieldErrors.name && <p className="text-xs text-red-500">{fieldErrors.name}</p>}
          </div>
          <div className="space-y-1.5">
            <Label className="text-xs font-semibold">E-mail</Label>
            <Input
              type="email"
              value={email}
              onChange={(e) => setEmail(e.target.value)}
              className="h-9"
            />
            {fieldErrors.email && <p className="text-xs text-red-500">{fieldErrors.email}</p>}
          </div>
          <div className="space-y-1.5">
            <Label className="text-xs font-semibold">Cargo</Label>
            <Select
              value={role}
              onValueChange={(v) => {
                setRole(v as UserRole)
                setServiceGroups([])
                setBases([])
              }}
            >
              <SelectTrigger className="h-9">
                <SelectValue placeholder="Selecione..." />
              </SelectTrigger>
              <SelectContent>
                <SelectGroup>
                  <SelectLabel>Atendimento</SelectLabel>
                  {ATENDIMENTO_ROLES.map((r) => (
                    <SelectItem key={r} value={r}>
                      {r}
                    </SelectItem>
                  ))}
                </SelectGroup>
                <SelectGroup>
                  <SelectLabel>Vendas</SelectLabel>
                  {VENDAS_ROLES.map((r) => (
                    <SelectItem key={r} value={r}>
                      {r}
                    </SelectItem>
                  ))}
                </SelectGroup>
                <SelectGroup>
                  <SelectLabel>Admin</SelectLabel>
                  <SelectItem value="Master">Master</SelectItem>
                </SelectGroup>
              </SelectContent>
            </Select>
          </div>
          <div className="space-y-1.5">
            <Label className="text-xs font-semibold">Status de Aprovação</Label>
            <Select
              value={approvalStatus}
              onValueChange={(v) => setApprovalStatus(v as ApprovalStatus)}
            >
              <SelectTrigger className="h-9">
                <SelectValue />
              </SelectTrigger>
              <SelectContent>
                {APPROVAL_OPTIONS.map((s) => (
                  <SelectItem key={s} value={s}>
                    {s}
                  </SelectItem>
                ))}
              </SelectContent>
            </Select>
          </div>
          {isAtendimento && (
            <div className="space-y-2">
              <Label className="text-xs font-semibold">Grupos de Atendimento</Label>
              <div className="grid grid-cols-2 gap-2">
                {SERVICE_GROUP_OPTIONS.map((g) => (
                  <label key={g} className="flex items-center gap-2 text-sm cursor-pointer">
                    <Checkbox
                      checked={serviceGroups.includes(g)}
                      onCheckedChange={() => toggleGroup(g)}
                    />
                    {g}
                  </label>
                ))}
              </div>
            </div>
          )}
          {isVendas && (
            <div className="space-y-2">
              <Label className="text-xs font-semibold">Bases</Label>
              <div className="grid grid-cols-2 gap-2">
                {BASE_OPTIONS.map((b) => (
                  <label key={b} className="flex items-center gap-2 text-sm cursor-pointer">
                    <Checkbox checked={bases.includes(b)} onCheckedChange={() => toggleBase(b)} />
                    {b}
                  </label>
                ))}
              </div>
            </div>
          )}
          <label className="flex items-center gap-2 text-sm cursor-pointer">
            <Checkbox checked={masterAccess} onCheckedChange={(v) => setMasterAccess(v === true)} />
            <span className="font-semibold">Acesso Master</span>
          </label>
        </div>
        <DialogFooter>
          <Button variant="outline" onClick={() => onOpenChange(false)}>
            Cancelar
          </Button>
          <Button onClick={handleSave} disabled={loading}>
            {loading && <Loader2 className="h-4 w-4 animate-spin mr-2" />}
            Salvar
          </Button>
        </DialogFooter>
      </DialogContent>
    </Dialog>
  )
}
