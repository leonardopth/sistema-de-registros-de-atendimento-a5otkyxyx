import { useState } from 'react'
import { Card } from '@/components/ui/card'
import { Button } from '@/components/ui/button'
import { Label } from '@/components/ui/label'
import { Checkbox } from '@/components/ui/checkbox'
import { Badge } from '@/components/ui/badge'
import { useToast } from '@/hooks/use-toast'
import { updateUserBases } from '@/services/users'
import { UserRecord } from '@/types/service_record'
import { COMMERCIAL_BASE_OPTIONS } from '@/lib/commercial-bases'
import { Save, Loader2, Building } from 'lucide-react'

interface CommercialBasesManagerProps {
  users: UserRecord[]
  onSaved: () => void
}

export function CommercialBasesManager({ users, onSaved }: CommercialBasesManagerProps) {
  const targetUsers = users.filter(
    (u) => u.role === 'Gestor Comercial' || u.role === 'Executivo de Contas',
  )
  const [editingId, setEditingId] = useState<string | null>(null)
  const [bases, setBases] = useState<string[]>([])
  const [saving, setSaving] = useState(false)
  const { toast } = useToast()

  const handleStartEdit = (u: UserRecord) => {
    setEditingId(u.id)
    setBases((u.bases as string[] | undefined) || [])
  }

  const handleSave = async () => {
    if (!editingId) return
    setSaving(true)
    try {
      await updateUserBases(editingId, bases)
      toast({ title: 'Bases atualizadas' })
      setEditingId(null)
      onSaved()
    } catch {
      toast({ variant: 'destructive', title: 'Erro ao atualizar bases' })
    } finally {
      setSaving(false)
    }
  }

  return (
    <Card className="p-4 border-slate-200 shadow-subtle">
      <div className="flex items-center gap-2 mb-4">
        <Building className="h-5 w-5 text-indigo-600" />
        <h3 className="text-sm font-bold text-slate-800">
          Gestor Comercial e Executivo de Contas — Bases
        </h3>
      </div>
      <div className="space-y-3">
        {targetUsers.map((u) => (
          <div key={u.id} className="border border-slate-200 rounded-lg p-3">
            <div className="flex items-center justify-between mb-2">
              <div>
                <p className="text-sm font-semibold text-slate-900">{u.name}</p>
                <p className="text-xs text-slate-500">
                  {u.email} — {u.role}
                </p>
              </div>
              {editingId === u.id ? (
                <div className="flex gap-1">
                  <Button
                    size="sm"
                    className="h-7 text-xs bg-indigo-600 hover:bg-indigo-700"
                    onClick={handleSave}
                    disabled={saving}
                  >
                    {saving ? (
                      <Loader2 className="h-3.5 w-3.5 animate-spin mr-1" />
                    ) : (
                      <Save className="h-3.5 w-3.5 mr-1" />
                    )}
                    Salvar
                  </Button>
                  <Button
                    size="sm"
                    variant="ghost"
                    className="h-7 text-xs"
                    onClick={() => setEditingId(null)}
                  >
                    Cancelar
                  </Button>
                </div>
              ) : (
                <Button
                  size="sm"
                  variant="ghost"
                  className="h-7 text-xs text-indigo-600"
                  onClick={() => handleStartEdit(u)}
                >
                  Editar Bases
                </Button>
              )}
            </div>
            {editingId === u.id ? (
              <div className="grid grid-cols-2 sm:grid-cols-4 gap-2 mt-2">
                {COMMERCIAL_BASE_OPTIONS.map((opt) => (
                  <div key={opt.value} className="flex items-center space-x-2">
                    <Checkbox
                      id={`cbm-${u.id}-${opt.value}`}
                      checked={bases.includes(opt.value)}
                      onCheckedChange={(checked) => {
                        if (checked) setBases([...bases, opt.value])
                        else setBases(bases.filter((b) => b !== opt.value))
                      }}
                    />
                    <Label
                      htmlFor={`cbm-${u.id}-${opt.value}`}
                      className="cursor-pointer text-xs font-normal"
                    >
                      {opt.label}
                    </Label>
                  </div>
                ))}
              </div>
            ) : (
              <div className="flex flex-wrap gap-1">
                {u.bases && (u.bases as string[]).length > 0 ? (
                  (u.bases as string[]).map((b) => (
                    <Badge key={b} variant="secondary" className="text-[10px]">
                      {b}
                    </Badge>
                  ))
                ) : (
                  <span className="text-xs text-slate-400">Nenhuma base atribuída</span>
                )}
              </div>
            )}
          </div>
        ))}
        {targetUsers.length === 0 && (
          <p className="text-center text-xs text-slate-400 py-8">
            Nenhum Gestor Comercial ou Executivo de Contas encontrado.
          </p>
        )}
      </div>
    </Card>
  )
}
