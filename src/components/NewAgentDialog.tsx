import { useState } from 'react'
import { Dialog, DialogContent, DialogHeader, DialogTitle } from '@/components/ui/dialog'
import { Button } from '@/components/ui/button'
import { Input } from '@/components/ui/input'
import { Label } from '@/components/ui/label'
import { createAgent } from '@/services/agents'
import { useToast } from '@/hooks/use-toast'
import { extractFieldErrors, type FieldErrors } from '@/lib/pocketbase/errors'
import { Loader2, UserPlus } from 'lucide-react'
import type { AgentRecord } from '@/types/service_record'

interface NewAgentDialogProps {
  open: boolean
  onOpenChange: (open: boolean) => void
  clientId: string
  onAgentCreated: (agent: AgentRecord) => void
}

export function NewAgentDialog({
  open,
  onOpenChange,
  clientId,
  onAgentCreated,
}: NewAgentDialogProps) {
  const { toast } = useToast()
  const [name, setName] = useState('')
  const [email, setEmail] = useState('')
  const [phone, setPhone] = useState('')
  const [birthday, setBirthday] = useState('')
  const [saving, setSaving] = useState(false)
  const [fieldErrors, setFieldErrors] = useState<FieldErrors>({})

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault()
    if (!name.trim()) {
      setFieldErrors({ name: 'Nome é obrigatório' })
      return
    }
    if (!clientId) {
      toast({ variant: 'destructive', title: 'Selecione uma agência primeiro' })
      return
    }
    setSaving(true)
    setFieldErrors({})
    try {
      const agent = await createAgent({
        name: name.trim(),
        email: email.trim() || undefined,
        phone: phone.trim() || undefined,
        birthday: birthday || undefined,
        client_id: clientId,
      })
      toast({ title: 'Agente cadastrado com sucesso!' })
      onAgentCreated(agent)
      setName('')
      setEmail('')
      setPhone('')
      setBirthday('')
      onOpenChange(false)
    } catch (err) {
      setFieldErrors(extractFieldErrors(err))
      toast({ variant: 'destructive', title: 'Erro ao cadastrar agente' })
    } finally {
      setSaving(false)
    }
  }

  return (
    <Dialog open={open} onOpenChange={onOpenChange}>
      <DialogContent className="sm:max-w-[400px]">
        <DialogHeader>
          <DialogTitle className="flex items-center gap-2 text-indigo-950 font-bold">
            <UserPlus className="h-5 w-5 text-indigo-600" />
            Cadastrar Novo Agente
          </DialogTitle>
        </DialogHeader>
        <form onSubmit={handleSubmit} className="space-y-3">
          <div className="space-y-1">
            <Label className="text-xs">Nome *</Label>
            <Input
              className="h-9 text-xs"
              value={name}
              onChange={(e) => setName(e.target.value)}
              placeholder="Nome completo do agente"
              autoFocus
            />
            {fieldErrors.name && <p className="text-xs text-red-500">{fieldErrors.name}</p>}
          </div>
          <div className="space-y-1">
            <Label className="text-xs">E-mail</Label>
            <Input
              className="h-9 text-xs"
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
              className="h-9 text-xs"
              value={phone}
              onChange={(e) => setPhone(e.target.value)}
              placeholder="(00) 00000-0000"
            />
            {fieldErrors.phone && <p className="text-xs text-red-500">{fieldErrors.phone}</p>}
          </div>
          <div className="space-y-1">
            <Label className="text-xs">Data de Aniversário (opcional)</Label>
            <Input
              className="h-9 text-xs"
              type="date"
              value={birthday}
              onChange={(e) => setBirthday(e.target.value)}
            />
          </div>
          <div className="flex justify-end gap-2 pt-2">
            <Button type="button" variant="outline" onClick={() => onOpenChange(false)}>
              Cancelar
            </Button>
            <Button type="submit" disabled={saving} className="bg-indigo-600 hover:bg-indigo-700">
              {saving && <Loader2 className="h-4 w-4 mr-1 animate-spin" />}
              Cadastrar
            </Button>
          </div>
        </form>
      </DialogContent>
    </Dialog>
  )
}
