import { useState, useEffect } from 'react'
import { Card } from '@/components/ui/card'
import { Button } from '@/components/ui/button'
import { Input } from '@/components/ui/input'
import { Label } from '@/components/ui/label'
import {
  Dialog,
  DialogContent,
  DialogHeader,
  DialogTitle,
  DialogFooter,
} from '@/components/ui/dialog'
import {
  Table,
  TableHeader,
  TableBody,
  TableRow,
  TableHead,
  TableCell,
} from '@/components/ui/table'
import {
  getAccountExecutives,
  createAccountExecutive,
  updateAccountExecutive,
  deleteAccountExecutive,
} from '@/services/account_executives'
import { AccountExecutiveRecord, CommercialBase } from '@/types/service_record'
import { useAuth } from '@/hooks/use-auth'
import { useRealtime } from '@/hooks/use-realtime'
import { useToast } from '@/hooks/use-toast'
import { extractFieldErrors, getErrorMessage, type FieldErrors } from '@/lib/pocketbase/errors'
import { UserCog, Plus, Pencil, Trash2, Loader2, FilterX } from 'lucide-react'
import { Checkbox } from '@/components/ui/checkbox'
import { COMMERCIAL_BASE_OPTIONS } from '@/lib/commercial-bases'
import { TableColumnFilter } from '@/components/TableColumnFilter'

export default function ExecutivosContas() {
  const { user } = useAuth()
  const { toast } = useToast()
  const [executives, setExecutives] = useState<AccountExecutiveRecord[]>([])
  const [loading, setLoading] = useState(true)
  const [search, setSearch] = useState('')
  const [dialogOpen, setDialogOpen] = useState(false)
  const [editingId, setEditingId] = useState<string | null>(null)
  const [name, setName] = useState('')
  const [email, setEmail] = useState('')
  const [phone, setPhone] = useState('')
  const [selectedBases, setSelectedBases] = useState<CommercialBase[]>([])
  const [saving, setSaving] = useState(false)
  const [fieldErrors, setFieldErrors] = useState<FieldErrors>({})
  const canManage = ['Gerentes', 'Supervisores', 'Líderes', 'Master'].includes(user?.role)

  // Filtros por coluna
  const [colNames, setColNames] = useState<string[]>([])
  const [colEmails, setColEmails] = useState<string[]>([])
  const [colPhones, setColPhones] = useState<string[]>([])
  const [colBases, setColBases] = useState<string[]>([])

  const loadData = async () => {
    setLoading(true)
    try {
      const data = await getAccountExecutives()
      setExecutives(data)
    } catch (e) {
      console.error(e)
    } finally {
      setLoading(false)
    }
  }

  useEffect(() => {
    loadData()
  }, [])
  useRealtime('account_executives', () => {
    loadData()
  })

  const hasColFilters =
    colNames.length > 0 || colEmails.length > 0 || colPhones.length > 0 || colBases.length > 0

  const filtered = executives.filter((a) => {
    const matchesSearch =
      a.name.toLowerCase().includes(search.toLowerCase()) ||
      (a.email || '').toLowerCase().includes(search.toLowerCase()) ||
      (a.phone || '').toLowerCase().includes(search.toLowerCase())

    const matchesName = colNames.length === 0 || colNames.includes(a.name)
    const matchesEmail = colEmails.length === 0 || colEmails.includes(a.email || '—')
    const matchesPhone = colPhones.length === 0 || colPhones.includes(a.phone || '—')
    const basesFormatted =
      a.bases && (a.bases as string[]).length > 0 ? (a.bases as string[]).join(', ') : '—'
    const matchesBases = colBases.length === 0 || colBases.includes(basesFormatted)

    return matchesSearch && matchesName && matchesEmail && matchesPhone && matchesBases
  })

  const resetForm = () => {
    setName('')
    setEmail('')
    setPhone('')
    setSelectedBases([])
    setEditingId(null)
    setFieldErrors({})
  }

  const handleEdit = (a: AccountExecutiveRecord) => {
    setEditingId(a.id)
    setName(a.name)
    setEmail(a.email || '')
    setPhone(a.phone || '')
    setSelectedBases((a.bases as CommercialBase[] | undefined) || [])
    setFieldErrors({})
    setDialogOpen(true)
  }

  const validateForm = () => {
    const errors: FieldErrors = {}
    if (!name.trim()) errors.name = 'Nome é obrigatório'
    if (email.trim() && !/^[^\s@]+@[^\s@]+\.[^\s@]+$/.test(email.trim())) {
      errors.email = 'E-mail inválido'
    }
    setFieldErrors(errors)
    return Object.keys(errors).length === 0
  }

  const handleSave = async (e: React.FormEvent) => {
    e.preventDefault()
    if (!validateForm()) return
    setSaving(true)
    setFieldErrors({})
    try {
      const data = {
        name: name.trim(),
        email: email.trim(),
        phone: phone.trim(),
        bases: selectedBases,
      }
      if (editingId) {
        await updateAccountExecutive(editingId, data)
        toast({ title: 'Executivo atualizado com sucesso' })
      } else {
        await createAccountExecutive(data)
        toast({ title: 'Executivo criado com sucesso' })
      }
      setDialogOpen(false)
      resetForm()
      loadData()
    } catch (err) {
      setFieldErrors(extractFieldErrors(err))
      toast({
        variant: 'destructive',
        title: 'Erro ao salvar executivo',
        description: getErrorMessage(err),
      })
    } finally {
      setSaving(false)
    }
  }

  const handleDelete = async (id: string) => {
    if (!confirm('Deseja realmente excluir este executivo de contas?')) return
    try {
      await deleteAccountExecutive(id)
      toast({ title: 'Executivo excluído' })
      loadData()
    } catch {
      toast({ variant: 'destructive', title: 'Erro ao excluir executivo' })
    }
  }

  return (
    <div className="space-y-6">
      <div className="flex flex-col sm:flex-row sm:items-center sm:justify-between gap-4">
        <div>
          <h2 className="text-2xl font-extrabold tracking-tight text-slate-900">
            Executivos de Contas
          </h2>
          <p className="text-xs text-slate-500">
            Gerencie os executivos de contas internos da equipe
          </p>
        </div>
        {canManage && (
          <Button
            onClick={() => {
              resetForm()
              setDialogOpen(true)
            }}
            className="bg-indigo-600 hover:bg-indigo-700 text-white font-bold"
          >
            <Plus className="h-4 w-4 mr-1.5" /> Novo Executivo
          </Button>
        )}
      </div>

      <Card className="p-4 border-slate-200 shadow-subtle">
        <div className="flex items-center gap-2 mb-4">
          <Input
            placeholder="Buscar por nome, e-mail ou telefone..."
            value={search}
            onChange={(e) => setSearch(e.target.value)}
            className="h-9 text-xs max-w-sm"
          />
          {hasColFilters && (
            <Button
              variant="ghost"
              size="sm"
              className="text-xs h-9 text-slate-500"
              onClick={() => {
                setColNames([])
                setColEmails([])
                setColPhones([])
                setColBases([])
              }}
            >
              <FilterX className="h-3.5 w-3.5 mr-1" /> Limpar filtros de coluna
            </Button>
          )}
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
                  <TableHead className="text-xs font-bold text-slate-700">
                    <div className="flex items-center justify-between gap-1">
                      <span>Nome</span>
                      <TableColumnFilter
                        title="Nome"
                        options={executives.map((e) => e.name).filter(Boolean)}
                        selectedValues={colNames}
                        onChange={setColNames}
                      />
                    </div>
                  </TableHead>
                  <TableHead className="text-xs font-bold text-slate-700">
                    <div className="flex items-center justify-between gap-1">
                      <span>E-mail</span>
                      <TableColumnFilter
                        title="E-mail"
                        options={executives.map((e) => e.email || '—')}
                        selectedValues={colEmails}
                        onChange={setColEmails}
                      />
                    </div>
                  </TableHead>
                  <TableHead className="text-xs font-bold text-slate-700">
                    <div className="flex items-center justify-between gap-1">
                      <span>Telefone</span>
                      <TableColumnFilter
                        title="Telefone"
                        options={executives.map((e) => e.phone || '—')}
                        selectedValues={colPhones}
                        onChange={setColPhones}
                      />
                    </div>
                  </TableHead>
                  <TableHead className="text-xs font-bold text-slate-700">
                    <div className="flex items-center justify-between gap-1">
                      <span>Bases</span>
                      <TableColumnFilter
                        title="Bases"
                        options={executives.map((e) =>
                          e.bases && (e.bases as string[]).length > 0
                            ? (e.bases as string[]).join(', ')
                            : '—',
                        )}
                        selectedValues={colBases}
                        onChange={setColBases}
                      />
                    </div>
                  </TableHead>
                  {canManage && (
                    <TableHead className="text-xs font-bold text-right">Ações</TableHead>
                  )}
                </TableRow>
              </TableHeader>
              <TableBody>
                {filtered.map((a) => (
                  <TableRow key={a.id} className="hover:bg-slate-50">
                    <TableCell className="text-xs font-semibold text-slate-900">{a.name}</TableCell>
                    <TableCell className="text-xs text-slate-600">{a.email || '—'}</TableCell>
                    <TableCell className="text-xs text-slate-600">{a.phone || '—'}</TableCell>
                    <TableCell className="text-xs text-slate-600">
                      {a.bases && (a.bases as string[]).length > 0
                        ? (a.bases as string[]).join(', ')
                        : '—'}
                    </TableCell>
                    {canManage && (
                      <TableCell className="text-right">
                        <Button
                          variant="ghost"
                          size="sm"
                          className="text-xs h-7 text-indigo-600 mr-1"
                          onClick={() => handleEdit(a)}
                        >
                          <Pencil className="h-3.5 w-3.5 mr-1" />
                          Editar
                        </Button>
                        <Button
                          variant="ghost"
                          size="sm"
                          className="text-xs h-7 text-red-500"
                          onClick={() => handleDelete(a.id)}
                        >
                          <Trash2 className="h-3.5 w-3.5" />
                        </Button>
                      </TableCell>
                    )}
                  </TableRow>
                ))}
                {filtered.length === 0 && (
                  <TableRow>
                    <TableCell
                      colSpan={canManage ? 5 : 4}
                      className="text-center text-xs text-slate-400 py-8"
                    >
                      Nenhum executivo de contas encontrado.
                    </TableCell>
                  </TableRow>
                )}
              </TableBody>
            </Table>
          </div>
        )}
      </Card>

      <Dialog
        open={dialogOpen}
        onOpenChange={(v) => {
          if (!v) resetForm()
          setDialogOpen(v)
        }}
      >
        <DialogContent className="sm:max-w-[480px]">
          <DialogHeader>
            <DialogTitle className="flex items-center gap-2 text-indigo-950">
              <UserCog className="h-5 w-5 text-indigo-600" />
              {editingId ? 'Editar Executivo de Contas' : 'Novo Executivo de Contas'}
            </DialogTitle>
          </DialogHeader>
          <form onSubmit={handleSave} className="space-y-4 py-2">
            <div className="space-y-1.5">
              <Label>Nome *</Label>
              <Input
                value={name}
                onChange={(e) => setName(e.target.value)}
                placeholder="Nome completo"
              />
              {fieldErrors.name && <p className="text-xs text-red-500">{fieldErrors.name}</p>}
            </div>
            <div className="space-y-1.5">
              <Label>E-mail</Label>
              <Input
                type="email"
                value={email}
                onChange={(e) => setEmail(e.target.value)}
                placeholder="email@exemplo.com"
              />
              {fieldErrors.email && <p className="text-xs text-red-500">{fieldErrors.email}</p>}
            </div>
            <div className="space-y-1.5">
              <Label>Telefone</Label>
              <Input
                value={phone}
                onChange={(e) => setPhone(e.target.value)}
                placeholder="(00) 00000-0000"
              />
              {fieldErrors.phone && <p className="text-xs text-red-500">{fieldErrors.phone}</p>}
            </div>
            <div className="space-y-2">
              <Label>Bases</Label>
              <div className="grid grid-cols-2 sm:grid-cols-4 gap-2">
                {COMMERCIAL_BASE_OPTIONS.map((opt) => (
                  <div key={opt.value} className="flex items-center space-x-2">
                    <Checkbox
                      id={`exec-base-${opt.value}`}
                      checked={selectedBases.includes(opt.value as CommercialBase)}
                      onCheckedChange={(checked) => {
                        if (checked)
                          setSelectedBases([...selectedBases, opt.value as CommercialBase])
                        else setSelectedBases(selectedBases.filter((b) => b !== opt.value))
                      }}
                    />
                    <Label
                      htmlFor={`exec-base-${opt.value}`}
                      className="cursor-pointer text-xs font-normal"
                    >
                      {opt.label}
                    </Label>
                  </div>
                ))}
              </div>
            </div>
            <DialogFooter className="pt-2">
              <Button type="button" variant="outline" onClick={() => setDialogOpen(false)}>
                Cancelar
              </Button>
              <Button type="submit" disabled={saving} className="bg-indigo-600 hover:bg-indigo-700">
                {saving && <Loader2 className="mr-2 h-4 w-4 animate-spin" />}
                {editingId ? 'Salvar Alterações' : 'Criar Executivo'}
              </Button>
            </DialogFooter>
          </form>
        </DialogContent>
      </Dialog>
    </div>
  )
}
