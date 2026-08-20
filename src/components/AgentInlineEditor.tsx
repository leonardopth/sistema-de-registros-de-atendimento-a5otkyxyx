import { useState } from 'react'
import { Button } from '@/components/ui/button'
import { Input } from '@/components/ui/input'
import { Label } from '@/components/ui/label'
import { updateAgent } from '@/services/agents'
import { AgentRecord } from '@/types/service_record'
import { useToast } from '@/hooks/use-toast'
import { extractFieldErrors, type FieldErrors } from '@/lib/pocketbase/errors'
import { Save, Loader2, X } from 'lucide-react'

interface AgentInlineEditorProps {
  agent: AgentRecord
  onSave: () => void
  onCancel: () => void
}

export function AgentInlineEditor({ agent, onSave, onCancel }: AgentInlineEditorProps) {
  const [name, setName] = useState(agent.name)
  const [email, setEmail] = useState(agent.email || '')
  const [phone, setPhone] = useState(agent.phone || '')
  const [birthday, setBirthday] = useState(agent.birthday ? agent.birthday.substring(0, 10) : '')
  const [saving, setSaving] = useState(false)
  const [fieldErrors, setFieldErrors] = useState<FieldErrors>({})
  const { toast } = useToast()

  const handleSave = async (e: React.FormEvent) => {
    e.preventDefault()
    if (!name.trim()) {
      setFieldErrors({ name: 'Nome é obrigatório' })
      return
    }
    setSaving(true)
    setFieldErrors({})
    try {
      await updateAgent(agent.id, {
        name: name.trim(),
        email: email.trim(),
        phone: phone.trim(),
        birthday: birthday || '',
      })
      toast({ title: 'Agente atualizado com sucesso' })
      onSave()
    } catch (err) {
      setFieldErrors(extractFieldErrors(err))
      toast({ variant: 'destructive', title: 'Erro ao salvar agente' })
    } finally {
      setSaving(false)
    }
  }

  return (
    <form
      onSubmit={handleSave}
      className="p-3 bg-indigo-50 rounded-lg border border-indigo-200 space-y-2"
    >
      <div className="space-y-1">
        <Label className="text-xs">Nome *</Label>
        <Input
          className="h-8 text-xs"
          value={name}
          onChange={(e) => setName(e.target.value)}
          placeholder="Nome completo"
        />
        {fieldErrors.name && <p className="text-xs text-red-500">{fieldErrors.name}</p>}
      </div>
      <div className="grid grid-cols-2 gap-2">
        <div className="space-y-1">
          <Label className="text-xs">E-mail</Label>
          <Input
            className="h-8 text-xs"
            type="email"
            value={email}
            onChange={(e) => setEmail(e.target.value)}
            placeholder="email@exemplo.com"
          />
          {fieldErrors.email && <p className="text-xs text-red-500">{fieldErrors.email}</p>}
        </div>
        <div className="space-y-1">
          <Label className="text-xs">Telefone</Label>
          <Input
            className="h-8 text-xs"
            value={phone}
            onChange={(e) => setPhone(e.target.value)}
            placeholder="(00) 00000-0000"
          />
          {fieldErrors.phone && <p className="text-xs text-red-500">{fieldErrors.phone}</p>}
        </div>
      </div>
      <div className="space-y-1">
        <Label className="text-xs">Data de Aniversário (opcional)</Label>
        <Input
          className="h-8 text-xs"
          type="date"
          value={birthday}
          onChange={(e) => setBirthday(e.target.value)}
        />
      </div>
      <div className="flex gap-2 pt-1">
        <Button
          type="submit"
          disabled={saving}
          size="sm"
          className="text-xs bg-indigo-600 hover:bg-indigo-700"
        >
          {saving ? (
            <Loader2 className="h-3.5 w-3.5 animate-spin mr-1" />
          ) : (
            <Save className="h-3.5 w-3.5 mr-1" />
          )}
          Salvar
        </Button>
        <Button type="button" size="sm" variant="ghost" className="text-xs" onClick={onCancel}>
          <X className="h-3.5 w-3.5 mr-1" /> Cancelar
        </Button>
      </div>
    </form>
  )
}
