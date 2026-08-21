import { useState } from 'react'
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
import { Loader2, UserPlus } from 'lucide-react'
import pb from '@/lib/pocketbase/client'
import { useToast } from '@/hooks/use-toast'
import { extractFieldErrors, type FieldErrors } from '@/lib/pocketbase/errors'
import type { UserRole, ServiceGroup, CommercialBase } from '@/types/service_record'

const ATENDIMENTO_ROLES: UserRole[] = ['Gerente', 'Supervisor', 'Líder', 'Consultor']
const VENDAS_ROLES: UserRole[] = ['Gestor Comercial', 'Executivo de Contas']
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

interface NewUserDialogProps {
  open: boolean
  onOpenChange: (open: boolean) => void
  onSuccess?: () => void
}

export function NewUserDialog({ open, onOpenChange, onSuccess }: NewUserDialogProps) {
  const { toast } = useToast()
  const [name, setName] = useState('')
  const [email, setEmail] = useState('')
  const [password, setPassword] = useState('')
  const [role, setRole] = useState<UserRole | ''>('')
  const [serviceGroups, setServiceGroups] = useState<ServiceGroup[]>([])
  const [bases, setBases] = useState<CommercialBase[]>([])
  const [loading, setLoading] = useState(false)
  const [fieldErrors, setFieldErrors] = useState<FieldErrors>({})

  const isAtendimento = ATENDIMENTO_ROLES.includes(role as UserRole)
  const isVendas = VENDAS_ROLES.includes(role as UserRole)

  const reset = () => {
    setName('')
    setEmail('')
    setPassword('')
    setRole('')
    setServiceGroups([])
    setBases([])
    setFieldErrors({})
  }

  const toggleGroup = (g: ServiceGroup) =>
    setServiceGroups((prev) => (prev.includes(g) ? prev.filter((x) => x !== g) : [...prev, g]))
  const toggleBase = (b: CommercialBase) =>
    setBases((prev) => (prev.includes(b) ? prev.filter((x) => x !== b) : [...prev, b]))

  const handleSubmit = async () => {
    if (!name.trim() || !email.trim() || !password.trim() || !role) {
      toast({ variant: 'destructive', title: 'Preencha todos os campos obrigatórios' })
      return
    }
    setLoading(true)
    setFieldErrors({})
    try {
      await pb.collection('users').create({
        name: name.trim(),
        email: email.trim(),
        password,
        passwordConfirm: password,
        role,
        service_groups: isAtendimento ? serviceGroups : [],
        bases: isVendas ? bases : [],
        approval_status: 'Aprovado',
      })
      toast({ title: 'Usuário criado com sucesso!' })
      reset()
      onOpenChange(false)
      onSuccess?.()
    } catch (err) {
      setFieldErrors(extractFieldErrors(err))
      toast({ variant: 'destructive', title: 'Erro ao criar usuário' })
    } finally {
      setLoading(false)
    }
  }

  return (
    <Dialog
      open={open}
      onOpenChange={(v) => {
        if (!v) reset()
        onOpenChange(v)
      }}
    >
      <DialogContent className="sm:max-w-[480px]">
        <DialogHeader>
          <DialogTitle className="flex items-center gap-2">
            <UserPlus className="h-5 w-5" /> Novo Usuário
          </DialogTitle>
        </DialogHeader>
        <div className="space-y-4">
          <div className="space-y-1.5">
            <Label className="text-xs font-semibold">Nome *</Label>
            <Input
              value={name}
              onChange={(e) => setName(e.target.value)}
              placeholder="Nome completo"
              className="h-9"
            />
            {fieldErrors.name && <p className="text-xs text-red-500">{fieldErrors.name}</p>}
          </div>
          <div className="space-y-1.5">
            <Label className="text-xs font-semibold">E-mail *</Label>
            <Input
              type="email"
              value={email}
              onChange={(e) => setEmail(e.target.value)}
              placeholder="email@exemplo.com"
              className="h-9"
            />
            {fieldErrors.email && <p className="text-xs text-red-500">{fieldErrors.email}</p>}
          </div>
          <div className="space-y-1.5">
            <Label className="text-xs font-semibold">Senha *</Label>
            <Input
              type="password"
              value={password}
              onChange={(e) => setPassword(e.target.value)}
              placeholder="Mínimo 8 caracteres"
              className="h-9"
            />
            {fieldErrors.password && <p className="text-xs text-red-500">{fieldErrors.password}</p>}
          </div>
          <div className="space-y-1.5">
            <Label className="text-xs font-semibold">Cargo *</Label>
            <Select
              value={role}
              onValueChange={(v) => {
                setRole(v as UserRole)
                setServiceGroups([])
                setBases([])
              }}
            >
              <SelectTrigger className="h-9">
                <SelectValue placeholder="Selecione o cargo..." />
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
              </SelectContent>
            </Select>
            {fieldErrors.role && <p className="text-xs text-red-500">{fieldErrors.role}</p>}
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
        </div>
        <DialogFooter>
          <Button variant="outline" onClick={() => onOpenChange(false)}>
            Cancelar
          </Button>
          <Button onClick={handleSubmit} disabled={loading}>
            {loading && <Loader2 className="h-4 w-4 animate-spin mr-2" />}
            Criar Usuário
          </Button>
        </DialogFooter>
      </DialogContent>
    </Dialog>
  )
}
