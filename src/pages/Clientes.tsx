import { useState, useEffect } from 'react'
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card'
import { Button } from '@/components/ui/button'
import { Input } from '@/components/ui/input'
import { getClients, updateClient } from '@/services/clients'
import { getServiceRecords } from '@/services/service_records'
import { ClientRecord, ServiceRecord } from '@/types/service_record'
import { NewClientModal } from '@/components/NewClientModal'
import { AgentManager } from '@/components/AgentManager'
import { StatusBadge } from '@/components/StatusBadge'
import { useToast } from '@/hooks/use-toast'
import {
  Users,
  UserPlus,
  Search,
  Building,
  Mail,
  Phone,
  FileText,
  Save,
  Headset,
  ArrowLeft,
  Loader2,
} from 'lucide-react'
import { format } from 'date-fns'
import { ptBR } from 'date-fns/locale'

export default function Clientes() {
  const [clients, setClients] = useState<ClientRecord[]>([])
  const [search, setSearch] = useState('')
  const [selectedClient, setSelectedClient] = useState<ClientRecord | null>(null)
  const [clientRecords, setClientRecords] = useState<ServiceRecord[]>([])
  const [newModalOpen, setNewModalOpen] = useState(false)

  const [editName, setEditName] = useState('')
  const [editEmail, setEditEmail] = useState('')
  const [editPhone, setEditPhone] = useState('')
  const [editCompany, setEditCompany] = useState('')
  const [editNotes, setEditNotes] = useState('')
  const [saving, setSaving] = useState(false)

  const { toast } = useToast()

  const loadClients = async () => {
    try {
      const data = await getClients()
      setClients(data)
    } catch (err) {
      console.error(err)
    }
  }

  useEffect(() => {
    loadClients()
  }, [])

  const handleSelectClient = async (c: ClientRecord) => {
    setSelectedClient(c)
    setEditName(c.name)
    setEditEmail(c.email || '')
    setEditPhone(c.phone || '')
    setEditCompany(c.company || '')
    setEditNotes(c.notes || '')

    try {
      const records = await getServiceRecords('', '-created')
      const filtered = records.filter(
        (r) =>
          r.client_name.toLowerCase() === c.name.toLowerCase() ||
          (c.email && r.client_email && r.client_email.toLowerCase() === c.email.toLowerCase()),
      )
      setClientRecords(filtered)
    } catch (err) {
      console.error(err)
    }
  }

  const handleSaveClient = async () => {
    if (!selectedClient) return
    setSaving(true)
    try {
      await updateClient(selectedClient.id, {
        name: editName,
        email: editEmail,
        phone: editPhone,
        company: editCompany,
        notes: editNotes,
      })
      toast({ title: 'Cliente atualizado com sucesso' })
      loadClients()
    } catch (err) {
      toast({ variant: 'destructive', title: 'Erro ao salvar cliente' })
    } finally {
      setSaving(false)
    }
  }

  const filteredClients = clients.filter(
    (c) =>
      c.name.toLowerCase().includes(search.toLowerCase()) ||
      (c.company && c.company.toLowerCase().includes(search.toLowerCase())) ||
      (c.email && c.email.toLowerCase().includes(search.toLowerCase())),
  )

  return (
    <div className="space-y-6">
      <div className="flex flex-col sm:flex-row sm:items-center sm:justify-between gap-4">
        <div>
          <h2 className="text-2xl font-extrabold tracking-tight text-slate-900">
            Gestão de Clientes
          </h2>
          <p className="text-xs text-slate-500">
            Cadastre clientes e acompanhe o histórico completo de atendimentos
          </p>
        </div>
        <Button
          onClick={() => setNewModalOpen(true)}
          className="bg-gradient-to-r from-cyan-600 via-indigo-600 to-purple-600 hover:from-cyan-700 hover:via-indigo-700 hover:to-purple-700 text-white font-bold shadow-md"
        >
          <UserPlus className="h-4 w-4 mr-1.5" /> Novo Cliente
        </Button>
      </div>

      {selectedClient ? (
        <div className="space-y-6 animate-fade-in">
          <Button
            variant="ghost"
            size="sm"
            onClick={() => setSelectedClient(null)}
            className="text-cyan-700 font-bold"
          >
            <ArrowLeft className="h-4 w-4 mr-1.5" /> Voltar para lista de clientes
          </Button>

          <div className="grid grid-cols-1 lg:grid-cols-3 gap-6">
            <Card className="lg:col-span-1 border-slate-200 p-5 space-y-4">
              <div className="flex items-center gap-3 border-b pb-3">
                <div className="h-10 w-10 rounded-full bg-indigo-100 text-indigo-700 font-bold flex items-center justify-center">
                  {(selectedClient.company || selectedClient.name).substring(0, 2).toUpperCase()}
                </div>
                <div>
                  <h3 className="font-bold text-slate-900 text-base">
                    {selectedClient.company || 'Pessoa Física'}
                  </h3>
                  <p className="text-xs text-slate-500">{selectedClient.name}</p>
                </div>
              </div>
              <div className="space-y-3">
                <div className="space-y-1">
                  <label className="text-xs font-semibold text-slate-600">Empresa</label>
                  <Input
                    className="h-9 text-xs"
                    value={editCompany}
                    onChange={(e) => setEditCompany(e.target.value)}
                  />
                </div>
                <div className="space-y-1">
                  <label className="text-xs font-semibold text-slate-600">Nome do agente</label>
                  <Input
                    className="h-9 text-xs"
                    value={editName}
                    onChange={(e) => setEditName(e.target.value)}
                  />
                </div>
                <div className="space-y-1">
                  <label className="text-xs font-semibold text-slate-600">e-mail do agente</label>
                  <Input
                    className="h-9 text-xs"
                    value={editEmail}
                    onChange={(e) => setEditEmail(e.target.value)}
                  />
                </div>
                <div className="space-y-1">
                  <label className="text-xs font-semibold text-slate-600">Telefone</label>
                  <Input
                    className="h-9 text-xs"
                    value={editPhone}
                    onChange={(e) => setEditPhone(e.target.value)}
                  />
                </div>
                <div className="space-y-1">
                  <label className="text-xs font-semibold text-slate-600">Anotações Internas</label>
                  <textarea
                    rows={3}
                    className="w-full text-xs p-2 border rounded-md"
                    value={editNotes}
                    onChange={(e) => setEditNotes(e.target.value)}
                  />
                </div>
              </div>

              <Button
                onClick={handleSaveClient}
                disabled={saving}
                className="w-full bg-gradient-to-r from-cyan-600 to-indigo-600 hover:from-cyan-700 hover:to-indigo-700 text-xs font-bold text-white shadow-sm"
              >
                {saving ? (
                  <Loader2 className="h-4 w-4 animate-spin mr-1.5" />
                ) : (
                  <Save className="h-4 w-4 mr-1.5" />
                )}
                Salvar Alterações
              </Button>
            </Card>

            <Card className="lg:col-span-2 border-slate-200 p-5 space-y-4">
              <div className="flex items-center justify-between border-b pb-3">
                <h3 className="font-bold text-slate-900 text-sm flex items-center gap-2">
                  <Headset className="h-4 w-4 text-indigo-600" /> Histórico de Atendimentos (
                  {clientRecords.length})
                </h3>
              </div>

              <div className="space-y-3 max-h-[500px] overflow-y-auto pr-1">
                {clientRecords.map((r) => (
                  <div key={r.id} className="p-3.5 bg-slate-50 border rounded-lg space-y-2">
                    <div className="flex items-center justify-between text-xs">
                      <span className="font-semibold text-indigo-950">{r.contact_reason}</span>
                      <StatusBadge status={r.status} />
                    </div>
                    <p className="text-xs text-slate-700">{r.description}</p>
                    <div className="flex items-center justify-between text-[11px] text-slate-400 pt-1 border-t">
                      <span>Atendente: {r.assigned_agent || '-'}</span>
                      <span>
                        {r.created
                          ? format(new Date(r.created), 'dd/MM/yyyy HH:mm', { locale: ptBR })
                          : ''}
                      </span>
                    </div>
                  </div>
                ))}
                {clientRecords.length === 0 && (
                  <p className="text-xs text-slate-400 text-center py-8">
                    Nenhum atendimento registrado para este cliente.
                  </p>
                )}
              </div>
            </Card>
          </div>

          <Card className="border-slate-200 p-5">
            <AgentManager clientId={selectedClient.id} />
          </Card>
        </div>
      ) : (
        <div className="space-y-4">
          <div className="max-w-md relative">
            <Search className="absolute left-2.5 top-2.5 h-4 w-4 text-slate-400" />
            <Input
              placeholder="Buscar cliente por nome, empresa ou email..."
              value={search}
              onChange={(e) => setSearch(e.target.value)}
              className="pl-9 h-9 text-xs"
            />
          </div>

          <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-4">
            {filteredClients.map((c) => (
              <Card
                key={c.id}
                className="border-slate-200 hover:border-indigo-300 hover:shadow-elevation transition-all cursor-pointer p-4 space-y-3"
                onClick={() => handleSelectClient(c)}
              >
                <div className="flex items-start justify-between">
                  <div className="flex items-center gap-2.5">
                    <div className="h-9 w-9 rounded-full bg-indigo-50 text-indigo-700 font-bold flex items-center justify-center text-xs">
                      {(c.company || c.name).substring(0, 2).toUpperCase()}
                    </div>
                    <div>
                      <h3 className="font-bold text-slate-900 text-sm">
                        {c.company || 'Pessoa Física'}
                      </h3>
                      <p className="text-xs text-slate-500">{c.name}</p>
                    </div>
                  </div>
                </div>

                <div className="space-y-1 text-xs text-slate-600 border-t pt-2">
                  {c.email && (
                    <div className="flex items-center gap-1.5">
                      <Mail className="h-3.5 w-3.5 text-slate-400" />
                      {c.email}
                    </div>
                  )}
                  {c.phone && (
                    <div className="flex items-center gap-1.5">
                      <Phone className="h-3.5 w-3.5 text-slate-400" />
                      {c.phone}
                    </div>
                  )}
                </div>
              </Card>
            ))}

            {filteredClients.length === 0 && (
              <div className="col-span-full py-12 text-center text-slate-400 text-xs">
                Nenhum cliente cadastrado.
              </div>
            )}
          </div>
        </div>
      )}

      <NewClientModal open={newModalOpen} onOpenChange={setNewModalOpen} onSuccess={loadClients} />
    </div>
  )
}
