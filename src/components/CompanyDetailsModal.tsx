import { useState, useEffect, useMemo, useCallback } from 'react'
import { Dialog, DialogContent, DialogHeader, DialogTitle } from '@/components/ui/dialog'
import { Badge } from '@/components/ui/badge'
import { Button } from '@/components/ui/button'
import { Card } from '@/components/ui/card'
import { StatusBadge } from '@/components/StatusBadge'
import { PriorityBadge } from '@/components/PriorityBadge'
import { AgentInlineEditor } from '@/components/AgentInlineEditor'
import { AgentStatsList } from '@/components/AgentStatsList'
import { getClients } from '@/services/clients'
import { getAgents } from '@/services/agents'
import { getServiceRecords } from '@/services/service_records'
import { isRecordForAgent } from '@/lib/client-record-helpers'
import { ClientRecord, AgentRecord, ServiceRecord } from '@/types/service_record'
import { useRealtime } from '@/hooks/use-realtime'
import { useAuth } from '@/hooks/use-auth'
import { Building, Mail, Phone, Loader2, Pencil, Headset } from 'lucide-react'
import { format } from 'date-fns'
import { ptBR } from 'date-fns/locale'

function cleanStr(str?: string | null): string {
  if (!str) return ''
  return str.trim().toLowerCase()
}

interface CompanyDetailsModalProps {
  open: boolean
  onOpenChange: (open: boolean) => void
  companyName: string
  clientId?: string
}

export function CompanyDetailsModal({
  open,
  onOpenChange,
  companyName,
  clientId,
}: CompanyDetailsModalProps) {
  const [clients, setClients] = useState<ClientRecord[]>([])
  const [agents, setAgents] = useState<AgentRecord[]>([])
  const [records, setRecords] = useState<ServiceRecord[]>([])
  const [loading, setLoading] = useState(false)
  const [editingAgentId, setEditingAgentId] = useState<string | null>(null)
  const { user } = useAuth()

  const loadData = useCallback(() => {
    setLoading(true)
    Promise.all([getClients(), getAgents(), getServiceRecords()])
      .then(([c, a, r]) => {
        setClients(c)
        setAgents(a)
        setRecords(r)
      })
      .catch(() => {})
      .finally(() => setLoading(false))
  }, [])

  useEffect(() => {
    if (open && companyName) {
      setEditingAgentId(null)
      loadData()
    }
  }, [open, companyName, loadData])

  useRealtime(
    'service_records',
    () => {
      if (open) loadData()
    },
    open,
  )
  useRealtime(
    'agents',
    () => {
      if (open) loadData()
    },
    open,
  )
  useRealtime(
    'clients',
    () => {
      if (open) loadData()
    },
    open,
  )
  useRealtime(
    'service_record_history',
    () => {
      if (open) loadData()
    },
    open,
  )

  const matchingClients = useMemo(
    () =>
      clients.filter(
        (c) =>
          (clientId && c.id === clientId) ||
          cleanStr(c.company) === cleanStr(companyName) ||
          cleanStr(c.name) === cleanStr(companyName),
      ),
    [clients, clientId, companyName],
  )

  const matchingClient =
    matchingClients[0] || (clientId ? clients.find((c) => c.id === clientId) : null) || null
  const effectiveClientId = clientId || matchingClient?.id

  const clientRecords = useMemo(() => {
    if (!effectiveClientId) return []
    return records.filter(
      (r) => r.client === effectiveClientId || r.expand?.client?.id === effectiveClientId,
    )
  }, [records, effectiveClientId])

  const companyAgents = useMemo(() => {
    const matchingClientIds = new Set(matchingClients.map((c) => c.id))
    if (effectiveClientId) matchingClientIds.add(effectiveClientId)

    const agentMap = new Map<string, AgentRecord>()

    for (const a of agents) {
      if (
        matchingClientIds.has(a.client_id) ||
        (a.expand?.client_id?.id && matchingClientIds.has(a.expand.client_id.id))
      ) {
        agentMap.set(a.id, a)
      }
    }

    for (const r of clientRecords) {
      if (r.agent && !agentMap.has(r.agent)) {
        const found = agents.find((a) => a.id === r.agent)
        if (found) agentMap.set(found.id, found)
      }
      if (r.assigned_agent) {
        const found = agents.find(
          (a) => a.id === r.assigned_agent || cleanStr(a.name) === cleanStr(r.assigned_agent),
        )
        if (found && !agentMap.has(found.id)) agentMap.set(found.id, found)
      }
    }

    return Array.from(agentMap.values())
  }, [agents, matchingClients, effectiveClientId, clientRecords])

  const getAgentRecords = useCallback(
    (agent: AgentRecord): ServiceRecord[] => {
      return clientRecords.filter((r) => isRecordForAgent(r, agent))
    },
    [clientRecords],
  )

  return (
    <Dialog open={open} onOpenChange={onOpenChange}>
      <DialogContent className="sm:max-w-[700px] max-h-[90vh] overflow-y-auto">
        <DialogHeader className="border-b pb-3">
          <DialogTitle className="text-xl font-bold text-slate-900 flex items-center gap-2">
            <Building className="h-5 w-5 text-indigo-600" />
            {companyName}
          </DialogTitle>
        </DialogHeader>

        {loading ? (
          <div className="flex justify-center py-8">
            <Loader2 className="h-6 w-6 animate-spin text-slate-400" />
          </div>
        ) : (
          <div className="space-y-4 py-3">
            {companyAgents.length === 0 ? (
              <p className="text-xs text-slate-400 text-center py-8">
                Nenhum agente cadastrado para esta empresa.
              </p>
            ) : (
              companyAgents.map((agent) => {
                const agentRecords = getAgentRecords(agent)
                const isEditing = editingAgentId === agent.id
                return (
                  <div key={agent.id} className="space-y-2">
                    {isEditing ? (
                      <AgentInlineEditor
                        agent={agent}
                        onSave={() => {
                          setEditingAgentId(null)
                          loadData()
                        }}
                        onCancel={() => setEditingAgentId(null)}
                      />
                    ) : (
                      <>
                        <div className="flex items-center justify-between p-3 bg-slate-50 rounded-lg border border-slate-200">
                          <div className="space-y-0.5">
                            <p className="text-sm font-bold text-slate-900">{agent.name}</p>
                            <div className="flex items-center gap-3 text-xs text-slate-500">
                              {agent.email && (
                                <span className="flex items-center gap-1">
                                  <Mail className="h-3 w-3" /> {agent.email}
                                </span>
                              )}
                              {agent.phone && (
                                <span className="flex items-center gap-1">
                                  <Phone className="h-3 w-3" /> {agent.phone}
                                </span>
                              )}
                            </div>
                          </div>
                          <div className="flex items-center gap-2">
                            <Badge variant="secondary" className="text-xs font-semibold">
                              {agentRecords.length} atendimento(s)
                            </Badge>
                            <Button
                              variant="ghost"
                              size="icon"
                              className="h-7 w-7 text-indigo-600"
                              onClick={() => setEditingAgentId(agent.id)}
                            >
                              <Pencil className="h-3.5 w-3.5" />
                            </Button>
                          </div>
                        </div>

                        {agentRecords.length === 0 ? (
                          <p className="text-xs text-slate-400 italic pl-4">
                            Nenhum atendimento registrado para este agente.
                          </p>
                        ) : (
                          <div className="space-y-1.5 pl-4">
                            {agentRecords.map((r) => (
                              <div
                                key={r.id}
                                className="p-2.5 bg-white border border-slate-200 rounded-lg text-xs space-y-1.5"
                              >
                                <div className="flex items-center justify-between gap-2">
                                  <span className="font-semibold text-indigo-950">
                                    {r.contact_reason}
                                  </span>
                                  <div className="flex items-center gap-1.5">
                                    <PriorityBadge priority={r.priority} />
                                    <StatusBadge status={r.status} />
                                  </div>
                                </div>
                                <p className="text-slate-700 leading-relaxed">{r.description}</p>
                                <div className="flex items-center gap-3 text-[11px] text-slate-400 pt-1 border-t border-slate-100">
                                  <span>
                                    {r.created
                                      ? format(new Date(r.created), 'dd/MM/yyyy HH:mm', {
                                          locale: ptBR,
                                        })
                                      : '-'}
                                  </span>
                                  {r.channel && <span>Canal: {r.channel}</span>}
                                </div>
                              </div>
                            ))}
                          </div>
                        )}
                      </>
                    )}
                  </div>
                )
              })
            )}
          </div>
        )}

        {(effectiveClientId || clientRecords.length > 0 || companyAgents.length > 0) && (
          <div className="space-y-4 pt-2">
            <Card className="border-slate-200 p-4 space-y-3">
              <div className="flex items-center justify-between border-b pb-2">
                <h3 className="text-sm font-bold text-slate-900 flex items-center gap-2">
                  <Headset className="h-4 w-4 text-indigo-600" /> Histórico de Atendimentos (
                  {clientRecords.length})
                </h3>
              </div>
              <div className="space-y-3 max-h-[400px] overflow-y-auto pr-1">
                {clientRecords.map((r) => (
                  <div key={r.id} className="p-3.5 bg-slate-50 border rounded-lg space-y-2">
                    <div className="flex items-center justify-between text-xs">
                      <span className="font-semibold text-indigo-950">{r.contact_reason}</span>
                      <StatusBadge status={r.status} />
                    </div>
                    <p className="text-xs text-slate-700">{r.description}</p>
                    <div className="flex items-center justify-between text-[11px] text-slate-400 pt-1 border-t">
                      <div className="flex items-center gap-3">
                        <span>Agente: {r.expand?.agent?.name || r.assigned_agent || '-'}</span>
                        {r.expand?.assigned_user?.name && (
                          <span>Consultor: {r.expand.assigned_user.name}</span>
                        )}
                      </div>
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

            <Card className="border-slate-200 p-4">
              <AgentStatsList
                clientId={effectiveClientId || ''}
                companyName={companyName}
                clientRecords={clientRecords}
                agents={companyAgents}
              />
            </Card>
          </div>
        )}
      </DialogContent>
    </Dialog>
  )
}
