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
import {
  getClients,
  updateClient,
  blockClient,
  unblockClient,
  deleteClient,
} from '@/services/clients'
import { getAccountExecutives } from '@/services/account_executives'
import { AccountExecutiveRecord, ClientRecord, ServiceGroup } from '@/types/service_record'
import { NewClientModal } from '@/components/NewClientModal'
import { StateCitySelect } from '@/components/StateCitySelect'
import { SearchableSelect } from '@/components/SearchableSelect'
import { SERVICE_GROUP_OPTIONS, getServiceGroupLabel } from '@/lib/service-groups'
import { STATE_OPTIONS, normalizeStateValue } from '@/lib/brazilian-states'
import { useIbgeCities } from '@/hooks/use-ibge-cities'
import { AgentManager } from '@/components/AgentManager'
import { AgentStatsList } from '@/components/AgentStatsList'
import { CompanyDetailsModal } from '@/components/CompanyDetailsModal'
import { TableColumnFilter } from '@/components/TableColumnFilter'
import { useRealtime } from '@/hooks/use-realtime'
import { useToast } from '@/hooks/use-toast'
import { useAuth } from '@/hooks/use-auth'
import { formatGMT3DateTime } from '@/lib/timezone'
import {
  UserPlus,
  Search,
  ArrowLeft,
  Loader2,
  Save,
  Pencil,
  FilterX,
  Ban,
  ShieldCheck,
  Trash2,
  AlertTriangle,
} from 'lucide-react'
import {
  Dialog,
  DialogContent,
  DialogHeader,
  DialogTitle,
  DialogDescription,
  DialogFooter,
} from '@/components/ui/dialog'
import {
  AlertDialog,
  AlertDialogAction,
  AlertDialogCancel,
  AlertDialogContent,
  AlertDialogDescription,
  AlertDialogFooter,
  AlertDialogHeader,
  AlertDialogTitle,
} from '@/components/ui/alert-dialog'

export default function Clientes() {
  const [clients, setClients] = useState<ClientRecord[]>([])
  const [search, setSearch] = useState('')
  const [selectedClient, setSelectedClient] = useState<ClientRecord | null>(null)
  const [newModalOpen, setNewModalOpen] = useState(false)
  const [detailsModalOpen, setDetailsModalOpen] = useState(false)
  const [detailsCompany, setDetailsCompany] = useState('')
  const [detailsClientId, setDetailsClientId] = useState<string | undefined>(undefined)
  const [editName, setEditName] = useState('')
  const [executives, setExecutives] = useState<AccountExecutiveRecord[]>([])
  const [editExecutiveId, setEditExecutiveId] = useState('')
  const [executiveError, setExecutiveError] = useState('')
  const [editPhone, setEditPhone] = useState('')
  const [editCompany, setEditCompany] = useState('')
  const [editCity, setEditCity] = useState('')
  const [editState, setEditState] = useState('')
  const [editNotes, setEditNotes] = useState('')
  const [editServiceGroup, setEditServiceGroup] = useState('')
  const [serviceGroupError, setServiceGroupError] = useState('')
  const [saving, setSaving] = useState(false)
  const [blockDialogOpen, setBlockDialogOpen] = useState(false)
  const [blockTargetClient, setBlockTargetClient] = useState<ClientRecord | null>(null)
  const [blockReason, setBlockReason] = useState('')
  const [blockError, setBlockError] = useState('')
  const [blockSaving, setBlockSaving] = useState(false)
  const [deleteDialogOpen, setDeleteDialogOpen] = useState(false)
  const [deleteTargetClient, setDeleteTargetClient] = useState<ClientRecord | null>(null)
  const [deleteSaving, setDeleteSaving] = useState(false)
  const [filterState, setFilterState] = useState('')
  const [filterCity, setFilterCity] = useState('')
  const [filterServiceGroup, setFilterServiceGroup] = useState('')

  // Filtros por coluna na tabela
  const [colCompanies, setColCompanies] = useState<string[]>([])
  const [colGroups, setColGroups] = useState<string[]>([])
  const [colStatuses, setColStatuses] = useState<string[]>([])
  const [colCities, setColCities] = useState<string[]>([])
  const [colStates, setColStates] = useState<string[]>([])
  const [colExecs, setColExecs] = useState<string[]>([])
  const normalizedFilterState = normalizeStateValue(filterState)
  const {
    cities: filterCities,
    loading: filterCitiesLoading,
    error: filterCitiesError,
  } = useIbgeCities(normalizedFilterState)
  const { toast } = useToast()
  const { user } = useAuth()

  const userServiceGroups = (user?.service_groups as string[] | undefined) || []
  const hasGroupRestriction = userServiceGroups.length > 0 && user?.role !== 'Master'
  const canDeleteClient =
    user?.role === 'Gerentes' || user?.role === 'Master' || user?.master_access === true

  const autoAtendimentoExec = executives.find((ex) => ex.name === 'Auto-Atendimento')
  const regularExecutives = executives.filter((ex) => ex.name !== 'Auto-Atendimento')

  const loadClients = async () => {
    try {
      const data = await getClients()
      setClients(Array.isArray(data) ? data : [])
    } catch (err) {
      console.error(err)
      setClients([])
    }
    try {
      const execs = await getAccountExecutives()
      setExecutives(Array.isArray(execs) ? execs : [])
    } catch (err) {
      console.error(err)
      setExecutives([])
    }
  }

  useEffect(() => {
    loadClients()
  }, [])
  useRealtime('clients', () => {
    loadClients()
  })

  const handleSelectClient = (c: ClientRecord) => {
    if (!c) return
    setSelectedClient(c)
    setEditName(c.name || '')
    const execsArr = Array.isArray(executives) ? executives : []
    setEditExecutiveId(
      c.account_executive_rel || execsArr.find((ex) => ex.name === c.name)?.id || '',
    )
    setExecutiveError('')
    setEditPhone(c.phone || '')
    setEditCompany(c.company || '')
    setEditCity(c.city || '')
    setEditState(c.state || '')
    setEditNotes(c.notes || '')
    setEditServiceGroup(c.service_group || '')
    setServiceGroupError('')
  }

  const handleSaveClient = async () => {
    if (!selectedClient) return
    const selectedExec = executives.find((ex) => ex.id === editExecutiveId)
    if (!selectedExec) {
      setExecutiveError('Selecione um executivo de contas válido')
      return
    }
    if (!editServiceGroup) {
      setServiceGroupError('Selecione um grupo de atendimento')
      return
    }
    setServiceGroupError('')
    setSaving(true)
    try {
      await updateClient(selectedClient.id, {
        name: selectedExec.name,
        account_executive_rel: editExecutiveId,
        phone: editPhone,
        company: editCompany,
        city: editCity,
        state: editState,
        notes: editNotes,
        service_group: editServiceGroup as ServiceGroup,
      })
      toast({ title: 'Cliente atualizado com sucesso' })
      loadClients()
    } catch (err) {
      toast({ variant: 'destructive', title: 'Erro ao salvar cliente' })
    } finally {
      setSaving(false)
    }
  }

  const handleBlockClick = (c: ClientRecord) => {
    setBlockTargetClient(c)
    setBlockReason('')
    setBlockError('')
    setBlockDialogOpen(true)
  }

  const handleBlockConfirm = async () => {
    if (!blockTargetClient) return
    if (!blockReason.trim()) {
      setBlockError('Motivo é obrigatório')
      return
    }
    setBlockSaving(true)
    try {
      await blockClient(blockTargetClient.id, blockReason.trim(), user?.id || '')
      toast({ title: 'Cliente bloqueado com sucesso' })
      setBlockDialogOpen(false)
      loadClients()
    } catch (err) {
      toast({ variant: 'destructive', title: 'Erro ao bloquear cliente' })
    } finally {
      setBlockSaving(false)
    }
  }

  const handleUnblock = async (c: ClientRecord) => {
    try {
      await unblockClient(c.id)
      toast({ title: 'Cliente desbloqueado com sucesso' })
      loadClients()
    } catch (err) {
      toast({ variant: 'destructive', title: 'Erro ao desbloquear cliente' })
    }
  }

  const handleDeleteClick = (c: ClientRecord) => {
    setDeleteTargetClient(c)
    setDeleteDialogOpen(true)
  }

  const handleDeleteConfirm = async () => {
    if (!deleteTargetClient) return
    setDeleteSaving(true)
    try {
      await deleteClient(deleteTargetClient.id)
      toast({ title: 'Cliente excluído com sucesso' })
      setDeleteDialogOpen(false)
      if (selectedClient?.id === deleteTargetClient.id) {
        setSelectedClient(null)
      }
      loadClients()
    } catch (err) {
      toast({ variant: 'destructive', title: 'Erro ao excluir cliente' })
    } finally {
      setDeleteSaving(false)
    }
  }

  const openDetails = (c: ClientRecord) => {
    setDetailsCompany(c.company || c.name)
    setDetailsClientId(c.id)
    setDetailsModalOpen(true)
  }

  const safeClients = Array.isArray(clients) ? clients : []
  const filteredClients = safeClients.filter((c) => {
    const matchesSearch =
      (c.company || '').toLowerCase().includes(search.toLowerCase()) ||
      c.name.toLowerCase().includes(search.toLowerCase())
    const matchesState =
      !filterState || normalizeStateValue(c.state || '') === normalizedFilterState
    const matchesCity = !filterCity || (c.city || '') === filterCity
    const matchesServiceGroup = !filterServiceGroup || c.service_group === filterServiceGroup
    const matchesGroupRestriction =
      !hasGroupRestriction ||
      (c.service_group ? userServiceGroups.includes(c.service_group) : false)

    // Filtros por coluna
    const compName = c.company || 'Pessoa Física'
    const matchesColCompany = colCompanies.length === 0 || colCompanies.includes(compName)
    const grpName = c.service_group ? getServiceGroupLabel(c.service_group) : '—'
    const matchesColGroup = colGroups.length === 0 || colGroups.includes(grpName)
    const statusLabel = c.blocked ? 'Bloqueado' : 'Ativo'
    const matchesColStatus = colStatuses.length === 0 || colStatuses.includes(statusLabel)
    const matchesColCity = colCities.length === 0 || colCities.includes(c.city || '—')
    const matchesColState = colStates.length === 0 || colStates.includes(c.state || '—')
    const matchesColExec = colExecs.length === 0 || colExecs.includes(c.name || '—')

    return (
      matchesSearch &&
      matchesState &&
      matchesCity &&
      matchesServiceGroup &&
      matchesGroupRestriction &&
      matchesColCompany &&
      matchesColGroup &&
      matchesColStatus &&
      matchesColCity &&
      matchesColState &&
      matchesColExec
    )
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
          <Card className="border-slate-200 p-5 space-y-4">
            <div className="flex items-center gap-3 border-b pb-3">
              <div className="h-10 w-10 rounded-full bg-indigo-100 text-indigo-700 font-bold flex items-center justify-center">
                {(selectedClient.company || selectedClient.name).substring(0, 2).toUpperCase()}
              </div>
              <div>
                <h3 className="font-bold text-slate-900 text-base">
                  {selectedClient.company || 'Pessoa Física'}
                </h3>
                <p className="text-xs text-slate-500">Executivo de Contas: {selectedClient.name}</p>
              </div>
            </div>
            {selectedClient.blocked && (
              <div className="bg-red-50 border border-red-200 rounded-lg p-3 space-y-1">
                <div className="flex items-center gap-2">
                  <Ban className="h-4 w-4 text-red-600" />
                  <span className="text-sm font-bold text-red-700">Cliente Bloqueado</span>
                </div>
                <p className="text-xs text-red-600">
                  <strong>Motivo:</strong> {selectedClient.block_reason}
                </p>
                {selectedClient.expand?.blocked_by && (
                  <p className="text-xs text-red-600">
                    <strong>Bloqueado por:</strong> {selectedClient.expand.blocked_by.name}
                  </p>
                )}
                {selectedClient.blocked_at && (
                  <p className="text-xs text-red-600">
                    <strong>Data:</strong> {formatGMT3DateTime(selectedClient.blocked_at)}
                  </p>
                )}
              </div>
            )}
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
                  pinnedOptions={
                    autoAtendimentoExec
                      ? [{ value: autoAtendimentoExec.id, label: autoAtendimentoExec.name }]
                      : []
                  }
                  pinnedHeading="Auto-Atendimento"
                  options={regularExecutives.map((ex) => ({ value: ex.id, label: ex.name }))}
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
                <label className="text-xs font-semibold text-slate-600">
                  Grupo de Atendimento *
                </label>
                <SearchableSelect
                  options={SERVICE_GROUP_OPTIONS.map((o) => ({
                    value: o.value,
                    label: o.label,
                  }))}
                  value={editServiceGroup}
                  onValueChange={(v) => {
                    setEditServiceGroup(v)
                    setServiceGroupError('')
                  }}
                  placeholder="Selecione um grupo de atendimento"
                  emptyText="Nenhum grupo encontrado."
                  className="h-9 text-xs"
                />
                {serviceGroupError && <p className="text-xs text-red-500">{serviceGroupError}</p>}
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
          <Card className="border-slate-200 p-5">
            <AgentManager clientId={selectedClient.id} />
          </Card>
          <Card className="border-slate-200 p-5">
            <AgentStatsList clientId={selectedClient.id} />
          </Card>
        </div>
      ) : (
        <div className="space-y-4">
          <Card className="p-3 border-slate-200 shadow-subtle space-y-2">
            <div className="grid grid-cols-1 sm:grid-cols-2 md:grid-cols-4 lg:grid-cols-12 gap-2 items-center">
              {/* Busca por empresa ou executivo */}
              <div className="sm:col-span-2 md:col-span-2 lg:col-span-4 relative">
                <Search className="absolute left-2.5 top-2 h-3.5 w-3.5 text-slate-400" />
                <Input
                  placeholder="Buscar por empresa ou executivo..."
                  value={search}
                  onChange={(e) => setSearch(e.target.value)}
                  className="pl-8 h-8 text-xs w-full"
                />
              </div>

              {/* Estado */}
              <div className="sm:col-span-1 md:col-span-1 lg:col-span-2">
                <SearchableSelect
                  options={STATE_OPTIONS}
                  value={normalizedFilterState}
                  onValueChange={(v) => {
                    setFilterState(v)
                    setFilterCity('')
                  }}
                  placeholder="Estado (Todos)"
                  emptyText="Nenhum estado encontrado."
                  className="h-8 text-xs w-full"
                />
              </div>

              {/* Cidade */}
              <div className="sm:col-span-1 md:col-span-1 lg:col-span-3">
                <SearchableSelect
                  options={filterCities}
                  value={filterCity}
                  onValueChange={setFilterCity}
                  placeholder={
                    !normalizedFilterState
                      ? 'Cidade (selecione UF)'
                      : filterCitiesLoading
                        ? 'Carregando cidades...'
                        : 'Cidade (Todas)'
                  }
                  emptyText="Nenhuma cidade encontrada."
                  className="h-8 text-xs w-full"
                  disabled={!normalizedFilterState || filterCitiesLoading}
                />
                {filterCitiesError && (
                  <p className="text-[10px] text-red-500 mt-0.5">Erro ao carregar cidades IBGE.</p>
                )}
              </div>

              {/* Grupo de Atendimento */}
              <div className="sm:col-span-2 md:col-span-2 lg:col-span-3">
                <SearchableSelect
                  options={SERVICE_GROUP_OPTIONS.map((o) => ({ value: o.value, label: o.label }))}
                  value={filterServiceGroup}
                  onValueChange={setFilterServiceGroup}
                  placeholder="Grupo (Todos)"
                  emptyText="Nenhum grupo encontrado."
                  className="h-8 text-xs w-full"
                />
              </div>
            </div>

            {/* Linha de status/limpeza de filtros */}
            {(search ||
              filterState ||
              filterCity ||
              filterServiceGroup ||
              colCompanies.length > 0 ||
              colGroups.length > 0 ||
              colStatuses.length > 0 ||
              colCities.length > 0 ||
              colStates.length > 0 ||
              colExecs.length > 0) && (
              <div className="flex items-center justify-between pt-1 border-t border-slate-100 text-[11px] text-slate-500">
                <span>
                  Filtros ativos ({filteredClients.length} de {safeClients.length} clientes
                  exibidos)
                </span>
                <Button
                  variant="ghost"
                  size="sm"
                  className="text-xs h-7 text-slate-500 hover:text-slate-900 px-2"
                  onClick={() => {
                    setSearch('')
                    setFilterState('')
                    setFilterCity('')
                    setFilterServiceGroup('')
                    setColCompanies([])
                    setColGroups([])
                    setColStatuses([])
                    setColCities([])
                    setColStates([])
                    setColExecs([])
                  }}
                >
                  <FilterX className="h-3.5 w-3.5 mr-1" /> Limpar todos os filtros
                </Button>
              </div>
            )}
          </Card>
          <Card className="border-slate-200 overflow-hidden">
            <Table>
              <TableHeader>
                <TableRow className="bg-slate-50 hover:bg-slate-50">
                  <TableHead className="text-xs font-bold text-slate-600">
                    <div className="flex items-center justify-between gap-1">
                      <span>Nome da Empresa</span>
                      <TableColumnFilter
                        title="Empresa"
                        options={safeClients.map((c) => c.company || 'Pessoa Física')}
                        selectedValues={colCompanies}
                        onChange={setColCompanies}
                      />
                    </div>
                  </TableHead>
                  <TableHead className="text-xs font-bold text-slate-600">
                    <div className="flex items-center justify-between gap-1">
                      <span>Grupo</span>
                      <TableColumnFilter
                        title="Grupo"
                        options={SERVICE_GROUP_OPTIONS.map((g) => g.label)}
                        selectedValues={colGroups}
                        onChange={setColGroups}
                      />
                    </div>
                  </TableHead>
                  <TableHead className="text-xs font-bold text-slate-600">
                    <div className="flex items-center justify-between gap-1">
                      <span>Status</span>
                      <TableColumnFilter
                        title="Status"
                        options={['Ativo', 'Bloqueado']}
                        selectedValues={colStatuses}
                        onChange={setColStatuses}
                      />
                    </div>
                  </TableHead>
                  <TableHead className="text-xs font-bold text-slate-600">
                    <div className="flex items-center justify-between gap-1">
                      <span>Cidade</span>
                      <TableColumnFilter
                        title="Cidade"
                        options={safeClients.map((c) => c.city || '—')}
                        selectedValues={colCities}
                        onChange={setColCities}
                      />
                    </div>
                  </TableHead>
                  <TableHead className="text-xs font-bold text-slate-600">
                    <div className="flex items-center justify-between gap-1">
                      <span>Estado</span>
                      <TableColumnFilter
                        title="Estado"
                        options={safeClients.map((c) => c.state || '—')}
                        selectedValues={colStates}
                        onChange={setColStates}
                      />
                    </div>
                  </TableHead>
                  <TableHead className="text-xs font-bold text-slate-600">
                    <div className="flex items-center justify-between gap-1">
                      <span>Executivo</span>
                      <TableColumnFilter
                        title="Executivo"
                        options={safeClients.map((c) => c.name || '—')}
                        selectedValues={colExecs}
                        onChange={setColExecs}
                      />
                    </div>
                  </TableHead>
                  <TableHead className="text-xs font-bold text-slate-600 text-right w-[260px]">
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
                    <TableCell className="text-xs">
                      {c.service_group ? (
                        <span className="inline-flex items-center rounded-full bg-indigo-50 px-2 py-0.5 text-[11px] font-semibold text-indigo-700">
                          {getServiceGroupLabel(c.service_group)}
                        </span>
                      ) : (
                        <span className="text-slate-400">—</span>
                      )}
                    </TableCell>
                    <TableCell className="text-xs">
                      {c.blocked ? (
                        <span className="inline-flex items-center rounded-full bg-red-50 px-2 py-0.5 text-[11px] font-semibold text-red-700">
                          <Ban className="h-3 w-3 mr-1" /> Bloqueado
                        </span>
                      ) : (
                        <span className="inline-flex items-center rounded-full bg-green-50 px-2 py-0.5 text-[11px] font-semibold text-green-700">
                          Ativo
                        </span>
                      )}
                    </TableCell>
                    <TableCell className="text-xs text-slate-600">{c.city || '—'}</TableCell>
                    <TableCell className="text-xs text-slate-600">{c.state || '—'}</TableCell>
                    <TableCell className="text-xs text-slate-600">{c.name || '—'}</TableCell>
                    <TableCell className="text-right">
                      <div className="flex items-center justify-end gap-1">
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
                        {c.blocked ? (
                          <Button
                            variant="ghost"
                            size="sm"
                            className="text-xs h-7 text-green-600"
                            onClick={(e) => {
                              e.stopPropagation()
                              handleUnblock(c)
                            }}
                          >
                            <ShieldCheck className="h-3.5 w-3.5 mr-1" /> Desbloquear
                          </Button>
                        ) : (
                          <Button
                            variant="ghost"
                            size="sm"
                            className="text-xs h-7 text-amber-600"
                            onClick={(e) => {
                              e.stopPropagation()
                              handleBlockClick(c)
                            }}
                          >
                            <Ban className="h-3.5 w-3.5 mr-1" /> Bloquear
                          </Button>
                        )}
                        {canDeleteClient && (
                          <Button
                            variant="ghost"
                            size="sm"
                            className="text-xs h-7 text-red-600"
                            onClick={(e) => {
                              e.stopPropagation()
                              handleDeleteClick(c)
                            }}
                          >
                            <Trash2 className="h-3.5 w-3.5" />
                          </Button>
                        )}
                      </div>
                    </TableCell>
                  </TableRow>
                ))}
                {filteredClients.length === 0 && (
                  <TableRow>
                    <TableCell colSpan={7} className="text-center text-xs text-slate-400 py-8">
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
        clientId={detailsClientId}
      />
      <Dialog open={blockDialogOpen} onOpenChange={setBlockDialogOpen}>
        <DialogContent className="sm:max-w-[440px]">
          <DialogHeader>
            <DialogTitle className="flex items-center gap-2 text-amber-700">
              <Ban className="h-5 w-5" />
              Bloquear Cliente
            </DialogTitle>
            <DialogDescription>
              {blockTargetClient && (
                <span>
                  Tem certeza que deseja bloquear{' '}
                  <strong>{blockTargetClient.company || blockTargetClient.name}</strong>?
                </span>
              )}
            </DialogDescription>
          </DialogHeader>
          <div className="space-y-2 py-2">
            <label className="text-sm font-semibold text-slate-700">Motivo do bloqueio *</label>
            <textarea
              rows={3}
              className="w-full text-sm p-2 border rounded-md resize-none"
              placeholder="Descreva o motivo do bloqueio..."
              value={blockReason}
              onChange={(e) => {
                setBlockReason(e.target.value)
                if (e.target.value.trim()) setBlockError('')
              }}
            />
            {blockError && <p className="text-xs text-red-500">{blockError}</p>}
          </div>
          <DialogFooter>
            <Button variant="outline" onClick={() => setBlockDialogOpen(false)}>
              Cancelar
            </Button>
            <Button
              onClick={handleBlockConfirm}
              disabled={blockSaving}
              className="bg-amber-600 hover:bg-amber-700 text-white"
            >
              {blockSaving && <Loader2 className="mr-2 h-4 w-4 animate-spin" />}
              Confirmar Bloqueio
            </Button>
          </DialogFooter>
        </DialogContent>
      </Dialog>
      <AlertDialog open={deleteDialogOpen} onOpenChange={setDeleteDialogOpen}>
        <AlertDialogContent className="sm:max-w-[440px]">
          <AlertDialogHeader>
            <AlertDialogTitle className="flex items-center gap-2 text-red-700">
              <AlertTriangle className="h-5 w-5" />
              Excluir Cliente
            </AlertDialogTitle>
            <AlertDialogDescription>
              {deleteTargetClient && (
                <span>
                  Tem certeza que deseja excluir{' '}
                  <strong>{deleteTargetClient.company || deleteTargetClient.name}</strong>? Esta
                  ação não pode ser desfeita.
                </span>
              )}
            </AlertDialogDescription>
          </AlertDialogHeader>
          <AlertDialogFooter>
            <AlertDialogCancel>Cancelar</AlertDialogCancel>
            <AlertDialogAction
              onClick={handleDeleteConfirm}
              disabled={deleteSaving}
              className="bg-red-600 hover:bg-red-700 text-white"
            >
              {deleteSaving && <Loader2 className="mr-2 h-4 w-4 animate-spin" />}
              Excluir
            </AlertDialogAction>
          </AlertDialogFooter>
        </AlertDialogContent>
      </AlertDialog>
    </div>
  )
}
