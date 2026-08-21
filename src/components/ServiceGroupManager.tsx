import { useState } from 'react'
import { Card } from '@/components/ui/card'
import { Button } from '@/components/ui/button'
import { Label } from '@/components/ui/label'
import { Checkbox } from '@/components/ui/checkbox'
import { Badge } from '@/components/ui/badge'
import { useToast } from '@/hooks/use-toast'
import { updateUserServiceGroups } from '@/services/users'
import { UserRecord } from '@/types/service_record'
import { SERVICE_GROUP_OPTIONS } from '@/lib/service-groups'
import { Save, Loader2, Users } from 'lucide-react'

interface ServiceGroupManagerProps {
  users: UserRecord[]
  onSaved: () => void
}

export function ServiceGroupManager({ users, onSaved }: ServiceGroupManagerProps) {
  const gerentes = users.filter((u) => u.role === 'Gerente')
  const [editingId, setEditingId] = useState<string | null>(null)
  const [groups, setGroups] = useState<string[]>([])
  const [saving, setSaving] = useState(false)
  const { toast } = useToast()

  const handleStartEdit = (u: UserRecord) => {
    setEditingId(u.id)
    setGroups(u.service_groups || [])
  }

  const handleSave = async () => {
    if (!editingId) return
    setSaving(true)
    try {
      await updateUserServiceGroups(editingId, groups)
      toast({ title: 'Grupos de atendimento atualizados' })
      setEditingId(null)
      onSaved()
    } catch {
      toast({ variant: 'destructive', title: 'Erro ao atualizar grupos' })
    } finally {
      setSaving(false)
    }
  }

  return (
    <Card className="p-4 border-slate-200 shadow-subtle">
      <div className="flex items-center gap-2 mb-4">
        <Users className="h-5 w-5 text-indigo-600" />
        <h3 className="text-sm font-bold text-slate-800">Gerente e seus Grupos de Atendimento</h3>
      </div>
      <div className="space-y-3">
        {gerentes.map((u) => (
          <div key={u.id} className="border border-slate-200 rounded-lg p-3">
            <div className="flex items-center justify-between mb-2">
              <div>
                <p className="text-sm font-semibold text-slate-900">{u.name}</p>
                <p className="text-xs text-slate-500">{u.email}</p>
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
                  Editar Grupos
                </Button>
              )}
            </div>
            {editingId === u.id ? (
              <div className="grid grid-cols-2 sm:grid-cols-4 gap-2 mt-2">
                {SERVICE_GROUP_OPTIONS.map((opt) => (
                  <div key={opt.value} className="flex items-center space-x-2">
                    <Checkbox
                      id={`sgm-${u.id}-${opt.value}`}
                      checked={groups.includes(opt.value)}
                      onCheckedChange={(checked) => {
                        if (checked) setGroups([...groups, opt.value])
                        else setGroups(groups.filter((g) => g !== opt.value))
                      }}
                    />
                    <Label
                      htmlFor={`sgm-${u.id}-${opt.value}`}
                      className="cursor-pointer text-xs font-normal"
                    >
                      {opt.label}
                    </Label>
                  </div>
                ))}
              </div>
            ) : (
              <div className="flex flex-wrap gap-1">
                {u.service_groups && u.service_groups.length > 0 ? (
                  u.service_groups.map((g) => (
                    <Badge key={g} variant="secondary" className="text-[10px]">
                      {g}
                    </Badge>
                  ))
                ) : (
                  <span className="text-xs text-slate-400">Nenhum grupo atribuído</span>
                )}
              </div>
            )}
          </div>
        ))}
        {gerentes.length === 0 && (
          <p className="text-center text-xs text-slate-400 py-8">Nenhum gerente encontrado.</p>
        )}
      </div>
    </Card>
  )
}
