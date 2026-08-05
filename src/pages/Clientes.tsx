import { useState, useEffect } from 'react'
import { Card } from '@/components/ui/card'
import { Button } from '@/components/ui/button'
import { Input } from '@/components/ui/input'
import {
  Table,
  TableHeader,
  TableBody,
  TableRow,
  TableHead,
  TableCell,
} from '@/components/ui/table'
import { getClients, updateClient } from '@/services/clients'
import { getServiceRecords } from '@/services/service_records'
import { getAccountExecutives } from '@/services/account_executives'
import { AccountExecutiveRecord, ClientRecord, ServiceRecord } from '@/types/service_record'
import { NewClientModal } from '@/components/NewClientModal'
import { StateCitySelect } from '@/components/StateCitySelect'
import { SearchableSelect } from '@/components/SearchableSelect'
import { STATE_OPTIONS, normalizeStateValue } from '@/lib/brazilian-states'
import { useIbgeCities } from '@/hooks/use-ibge-cities'
import { AgentManager } from '@/components/AgentManager'
import { CompanyDetailsModal } from '@/components/CompanyDetailsModal'
import { StatusBadge } from '@/components/StatusBadge'
import { useRealtime } from '@/hooks/use-realtime'
import { useToast } from '@/hooks/use-toast'
import { UserPlus, Search, Headset, ArrowLeft, Loader2, Save, Pencil, FilterX } from 'lucide-react'
import { format } from 'date-fns'
import { ptBR } from 'date-fns/locale'

export default function Clientes() {
  const [clients, setClients] = useState<ClientRecord[]>([])
  const [search, setSearch] = useState('')
  const [selectedClient, setSelectedClient] = useState<ClientRecord | null>(null)
  const [clientRecords, setClientRecords] = useState<ServiceRecord[]>([])
  const [newModalOpen, setNewModalOpen] = useState(false)
  const [detailsModalOpen, setDetailsModalOpen] = useState(false)
  const [detailsCompany, setDetailsCompany] = useState('')
  const [editName, setEditName] = useState('')
  const [executives, setExecutives] = useState<AccountExecutiveRecord[]>([])
  const [editExecutiveId, setEditExecutiveId] = useState('')
  const [executiveError, setExecutiveError] = useState('')
  const [editPhone, setEditPhone] = useState('')
  const [editCompany, setEditCompany] = useState('')
  const [editCity, setEditCity] = useState('')
  const [editState, setEditState] = useState('')
  const [editNotes, setEditNotes] = useState('')
  const [saving, setSaving] = useState(false)
  const [filterState, setFilterState] = useState('')
  const [filterCity, setFilterCity] = useState('')
  const normalizedFilterState = normalizeStateValue(filterState)
  const {
    cities: filterCities,
    loading: filterCitiesLoading,
    error: filterCitiesError,
  } = useIbgeCities(normalizedFilterState)
  const { toast } = useToast()

  const loadClients = async () => {
    try {
      setClients(await getClients())
    } catch (err) {
      console.error(err)
    }
    try {
      setExecutives(await getAccountExecutives())
    } catch (err) {
      console.error(err)
    }
  }

  useEffect(() => {
    loadClients()
  }, [])
  useRealtime('clients', () => {
    loadClients()
  })

  const handleSelectClient = async (c: ClientRecord) => {
    setSelectedClient(c)
    setEditName(c.name)
    setEditExecutiveId(executives.find((ex) => ex.name === c.name)?.id || '')
    setExecutiveError('')
    setEditPhone(c.phone || '')
    setEditCompany(c.company || '')
    setEditCity(c.city || '')
    setEditState(c.state || '')
    setEditNotes(c.notes || '')
    try {
      const records = await getServiceRecords('', '-created')
      setClientRecords(
        records.filter(
          (r) =>
            r.client_name.toLowerCase() === c.name.toLowerCase() ||
            (c.email && r.client_email && r.client_email.toLowerCase() === c.email.toLowerCase()),
        ),
      )
    } catch (err) {
      console.error(err)
    }
  }

  const handleSaveClient = async () => {
    if (!selectedClient) return
    const selectedExec = executives.find((ex) => ex.id === editExecutiveId)
    if (!selectedExec) {
      setExecutiveError('Selecione um executivo de contas válido')
      return
    }
    setExecutiveError('')
    setSaving(true)
    try {
      await updateClient(selectedClient.id, {
        name: selectedExec.name,
        phone: editPhone,
        company: editCompany,
        city: editCity,
        state: editState,
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

  const openDetails = (c: ClientRecord) => {
    setDetailsCompany(c.company || c.name)
    setDetailsModalOpen(true)
  }

  const filteredClients = clients.filter((c) => {
    const matchesSearch =
      (c.company || '').toLowerCase().includes(search.toLowerCase()) ||
      c.name.toLowerCase().includes(search.toLowerCase())
    const matchesState =
      !filterState || normalizeStateValue(c.state || '') === normalizedFilterState
    const matchesCity = !filterCity || (c.city || '') === filterCity
    return matchesSearch && matchesState && matchesCity
  })

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
                  <p className="text-xs text-slate-500">
                    Executivo de Contas: {selectedClient.name}
                  </p>
                </div>
              </div>
              <div className="space-y-3">
                <div className="space-y-1">
                  <label className="text-xs font-semibold text-slate-600">Agência</label>
                  <Input
                    className="h-9 text-xs"
                    value={editCompany}
                    onChange={(e) => setEditCompany(e.target.value)}
                  />
                </div>
                <div className="grid grid-cols-2 gap-2">
                  <StateCitySelect
                    stateValue={editState}
                    cityValue={editCity}
                    onStateChange={setEditState}
                    onCityChange={setEditCity}
                    compact
                  />
                </div>
                <div className="space-y-1">
                  <label className="text-xs font-semibold text-slate-600">Telefone / Celular</label>
                  <Input
                    className="h-9 text-xs"
                    value={editPhone}
                    onChange={(e) => setEditPhone(e.target.value)}
                  />
                </div>
                <div className="space-y-1">
                  <label className="text-xs font-semibold text-slate-600">
                    Executivo de Contas RA *
                  </label>
                  <SearchableSelect
                    options={executives.map((ex) => ({ value: ex.id, label: ex.name }))}
                    value={editExecutiveId}
                    onValueChange={(v) => {
                      setEditExecutiveId(v)
                      setExecutiveError('')
                    }}
                    placeholder="Selecione um executivo de contas"
                    emptyText="Nenhum executivo encontrado."
                    className="h-9 text-xs"
                  />
                  {executiveError && <p className="text-xs text-red-500">{executiveError}</p>}
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
          <div className="flex flex-wrap items-end gap-3">
            <div className="flex-1 min-w-[200px] relative">
              <Search className="absolute left-2.5 top-2.5 h-4 w-4 text-slate-400" />
              <Input
                placeholder="Buscar por empresa ou executivo..."
                value={search}
                onChange={(e) => setSearch(e.target.value)}
                className="pl-9 h-9 text-xs"
              />
            </div>
            <div className="space-y-1">
              <label className="text-xs font-semibold text-slate-600">Estado</label>
              <SearchableSelect
                options={STATE_OPTIONS}
                value={normalizedFilterState}
                onValueChange={(v) => {
                  setFilterState(v)
                  setFilterCity('')
                }}
                placeholder="Todos"
                emptyText="Nenhum estado encontrado."
                className="h-9 text-xs w-[180px]"
              />
            </div>
            <div className="space-y-1">
              <label className="text-xs font-semibold text-slate-600">Cidade</label>
              <SearchableSelect
                options={filterCities}
                value={filterCity}
                onValueChange={setFilterCity}
                placeholder={
                  !normalizedFilterState
                    ? 'Selecione um estado primeiro'
                    : filterCitiesLoading
                      ? 'Carregando cidades...'
                      : 'Todas'
                }
                emptyText="Nenhuma cidade encontrada."
                className="h-9 text-xs w-[200px]"
                disabled={!normalizedFilterState || filterCitiesLoading}
              />
              {filterCitiesError && (
                <p className="text-xs text-red-500">Erro ao carregar cidades. Tente novamente.</p>
              )}
            </div>
            {(filterState || filterCity) && (
              <Button
                variant="ghost"
                size="sm"
                className="text-xs h-9 text-slate-500"
                onClick={() => {
                  setFilterState('')
                  setFilterCity('')
                }}
              >
                <FilterX className="h-3.5 w-3.5 mr-1" /> Limpar filtros
              </Button>
            )}
          </div>
          <Card className="border-slate-200 overflow-hidden">
            <Table>
              <TableHeader>
                <TableRow className="bg-slate-50 hover:bg-slate-50">
                  <TableHead className="text-xs font-bold text-slate-600">
                    Nome da Empresa
                  </TableHead>
                  <TableHead className="text-xs font-bold text-slate-600">Cidade</TableHead>
                  <TableHead className="text-xs font-bold text-slate-600">Estado</TableHead>
                  <TableHead className="text-xs font-bold text-slate-600">
                    Executivo de Contas
                  </TableHead>
                  <TableHead className="text-xs font-bold text-slate-600 text-right w-[80px]">
                    Ações
                  </TableHead>
                </TableRow>
              </TableHeader>
              <TableBody>
                {filteredClients.map((c) => (
                  <TableRow
                    key={c.id}
                    className="cursor-pointer hover:bg-indigo-50/50 transition-colors"
                    onClick={() => openDetails(c)}
                  >
                    <TableCell className="text-xs font-semibold text-slate-900">
                      {c.company || 'Pessoa Física'}
                    </TableCell>
                    <TableCell className="text-xs text-slate-600">{c.city || '—'}</TableCell>
                    <TableCell className="text-xs text-slate-600">{c.state || '—'}</TableCell>
                    <TableCell className="text-xs text-slate-600">{c.name || '—'}</TableCell>
                    <TableCell className="text-right">
                      <Button
                        variant="ghost"
                        size="sm"
                        className="text-xs h-7 text-indigo-600"
                        onClick={(e) => {
                          e.stopPropagation()
                          handleSelectClient(c)
                        }}
                      >
                        <Pencil className="h-3.5 w-3.5 mr-1" /> Editar
                      </Button>
                    </TableCell>
                  </TableRow>
                ))}
                {filteredClients.length === 0 && (
                  <TableRow>
                    <TableCell colSpan={5} className="text-center text-xs text-slate-400 py-8">
                      Nenhum cliente encontrado.
                    </TableCell>
                  </TableRow>
                )}
              </TableBody>
            </Table>
          </Card>
        </div>
      )}

      <NewClientModal open={newModalOpen} onOpenChange={setNewModalOpen} onSuccess={loadClients} />
      <CompanyDetailsModal
        open={detailsModalOpen}
        onOpenChange={setDetailsModalOpen}
        companyName={detailsCompany}
      />
    </div>
  )
}
