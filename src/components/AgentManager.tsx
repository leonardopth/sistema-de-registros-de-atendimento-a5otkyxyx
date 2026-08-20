import { useState, useEffect } from 'react'
import { Button } from '@/components/ui/button'
import { Input } from '@/components/ui/input'
import { Label } from '@/components/ui/label'
import { getAgents, createAgent, updateAgent, deleteAgent } from '@/services/agents'
import { AgentRecord } from '@/types/service_record'
import { useRealtime } from '@/hooks/use-realtime'
import { useToast } from '@/hooks/use-toast'
import { UserPlus, Trash2, Save, Loader2, Pencil, X } from 'lucide-react'

interface AgentManagerProps {
  clientId: string
}

export function AgentManager({ clientId }: AgentManagerProps) {
  const [agents, setAgents] = useState<AgentRecord[]>([])
  const [loading, setLoading] = useState(false)
  const [showForm, setShowForm] = useState(false)
  const [editingId, setEditingId] = useState<string | null>(null)
  const [name, setName] = useState('')
  const [email, setEmail] = useState('')
  const [phone, setPhone] = useState('')
  const [birthday, setBirthday] = useState('')
  const [saving, setSaving] = useState(false)
  const { toast } = useToast()

  const loadAgents = async () => {
    setLoading(true)
    try {
      const data = await getAgents(clientId)
      setAgents(data)
    } catch (err) {
      console.error(err)
    } finally {
      setLoading(false)
    }
  }

  useEffect(() => {
    loadAgents()
  }, [clientId])

  useRealtime('agents', () => {
    loadAgents()
  })

  const resetForm = () => {
    setName('')
    setEmail('')
    setPhone('')
    setBirthday('')
    setEditingId(null)
    setShowForm(false)
  }

  const handleSave = async (e: React.FormEvent) => {
    e.preventDefault()
    if (!name.trim()) return
    setSaving(true)
    try {
      if (editingId) {
        await updateAgent(editingId, {
          name: name.trim(),
          email: email.trim(),
          phone: phone.trim(),
          birthday: birthday || '',
        })
        toast({ title: 'Agente atualizado com sucesso' })
      } else {
        await createAgent({
          name: name.trim(),
          email: email.trim(),
          phone: phone.trim(),
          birthday: birthday || undefined,
          client_id: clientId,
        })
        toast({ title: 'Agente adicionado com sucesso' })
      }
      resetForm()
      loadAgents()
    } catch (err) {
      toast({ variant: 'destructive', title: 'Erro ao salvar agente' })
    } finally {
      setSaving(false)
    }
  }

  const handleEdit = (agent: AgentRecord) => {
    setEditingId(agent.id)
    setName(agent.name)
    setEmail(agent.email || '')
    setPhone(agent.phone || '')
    setBirthday(agent.birthday ? agent.birthday.substring(0, 10) : '')
    setShowForm(true)
  }

  const handleDelete = async (id: string) => {
    if (!confirm('Deseja realmente excluir este agente?')) return
    try {
      await deleteAgent(id)
      toast({ title: 'Agente excluído' })
      loadAgents()
    } catch (err) {
      toast({ variant: 'destructive', title: 'Erro ao excluir agente' })
    }
  }

  return (
    <div className="space-y-3">
      <div className="flex items-center justify-between">
        <span className="text-xs font-semibold text-slate-700 uppercase tracking-wider">
          Agentes da Empresa ({agents.length})
        </span>
        {!showForm && (
          <Button
            type="button"
            variant="ghost"
            size="sm"
            className="text-xs text-indigo-600 h-7"
            onClick={() => {
              resetForm()
              setShowForm(true)
            }}
          >
            <UserPlus className="h-3.5 w-3.5 mr-1" /> Novo Agente
          </Button>
        )}
      </div>

      {showForm && (
        <form onSubmit={handleSave} className="space-y-2 p-3 bg-slate-50 border rounded-lg">
          <div className="flex items-center justify-between">
            <span className="text-xs font-bold text-slate-700">
              {editingId ? 'Editar Agente' : 'Novo Agente'}
            </span>
            <Button
              type="button"
              variant="ghost"
              size="icon"
              className="h-6 w-6"
              onClick={resetForm}
            >
              <X className="h-3.5 w-3.5" />
            </Button>
          </div>
          <div className="space-y-1">
            <Label className="text-xs">Nome do Agente *</Label>
            <Input
              className="h-9 text-xs"
              required
              value={name}
              onChange={(e) => setName(e.target.value)}
              placeholder="Nome completo"
            />
          </div>
          <div className="grid grid-cols-2 gap-2">
            <div className="space-y-1">
              <Label className="text-xs">E-mail do Agente</Label>
              <Input
                className="h-9 text-xs"
                type="email"
                value={email}
                onChange={(e) => setEmail(e.target.value)}
                placeholder="email@exemplo.com"
              />
            </div>
            <div className="space-y-1">
              <Label className="text-xs">Telefone</Label>
              <Input
                className="h-9 text-xs"
                value={phone}
                onChange={(e) => setPhone(e.target.value)}
                placeholder="(00) 00000-0000"
              />
            </div>
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
          <Button
            type="submit"
            disabled={saving}
            className="w-full bg-indigo-600 hover:bg-indigo-700 text-xs font-bold"
          >
            {saving ? (
              <Loader2 className="h-4 w-4 animate-spin mr-1.5" />
            ) : (
              <Save className="h-4 w-4 mr-1.5" />
            )}
            {editingId ? 'Atualizar Agente' : 'Adicionar Agente'}
          </Button>
        </form>
      )}

      <div className="space-y-2 max-h-[300px] overflow-y-auto pr-1">
        {loading ? (
          <div className="flex justify-center py-4">
            <Loader2 className="h-5 w-5 animate-spin text-slate-400" />
          </div>
        ) : agents.length === 0 ? (
          <p className="text-xs text-slate-400 text-center py-4">
            Nenhum agente cadastrado para esta empresa.
          </p>
        ) : (
          agents.map((agent) => (
            <div
              key={agent.id}
              className="flex items-center justify-between p-2.5 bg-white border rounded-lg"
            >
              <div className="space-y-0.5">
                <p className="text-xs font-semibold text-slate-900">{agent.name}</p>
                {agent.email && <p className="text-[11px] text-slate-500">{agent.email}</p>}
                {agent.phone && <p className="text-[11px] text-slate-500">{agent.phone}</p>}
                {agent.birthday && (
                  <p className="text-[11px] text-indigo-600">
                    🎂 Aniversário:{' '}
                    {new Date(agent.birthday).toLocaleDateString('pt-BR', { timeZone: 'UTC' })}
                  </p>
                )}
              </div>
              <div className="flex gap-1">
                <Button
                  variant="ghost"
                  size="icon"
                  className="h-7 w-7 text-indigo-600"
                  onClick={() => handleEdit(agent)}
                >
                  <Pencil className="h-3.5 w-3.5" />
                </Button>
                <Button
                  variant="ghost"
                  size="icon"
                  className="h-7 w-7 text-red-500"
                  onClick={() => handleDelete(agent.id)}
                >
                  <Trash2 className="h-3.5 w-3.5" />
                </Button>
              </div>
            </div>
          ))
        )}
      </div>
    </div>
  )
}
