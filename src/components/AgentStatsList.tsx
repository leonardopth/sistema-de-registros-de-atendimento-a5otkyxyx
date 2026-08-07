import { useState, useEffect, useMemo } from 'react'
import { AgentRecord, ServiceRecord } from '@/types/service_record'
import { getAgents } from '@/services/agents'
import { getServiceRecords } from '@/services/service_records'
import { getClients } from '@/services/clients'
import { useRealtime } from '@/hooks/use-realtime'
import { useAuth } from '@/hooks/use-auth'
import { isRecordForClient, isRecordForAgent } from '@/lib/client-record-helpers'
import { filterRecordsByUserAccess } from '@/lib/service-group-access'
import { Headset, AlertTriangle, TrendingUp } from 'lucide-react'

interface AgentStatsListProps {
  clientId?: string
  companyName?: string
  clientRecords?: ServiceRecord[]
}

export function AgentStatsList({ clientId, companyName, clientRecords }: AgentStatsListProps) {
  const [agents, setAgents] = useState<AgentRecord[]>([])
  const [fetchedRecords, setFetchedRecords] = useState<ServiceRecord[]>([])
  const { user } = useAuth()

  const loadData = async () => {
    try {
      const [agentList, allRecords, clientList] = await Promise.all([
        getAgents(),
        getServiceRecords(),
        getClients(),
      ])

      const matchingClient = clientList.find(
        (c) => (clientId && c.id === clientId) || (companyName && c.company === companyName),
      )
      const matchingClientIds = new Set(
        clientList
          .filter(
            (c) => (clientId && c.id === clientId) || (companyName && c.company === companyName),
          )
          .map((c) => c.id),
      )

      const filteredAgents = agentList.filter((a: AgentRecord) =>
        matchingClientIds.has(a.client_id),
      )
      setAgents(filteredAgents)

      if (!clientRecords) {
        const filteredRecs = allRecords.filter((r) =>
          isRecordForClient(r, matchingClient, clientId, companyName),
        )
        setFetchedRecords(filterRecordsByUserAccess(user, filteredRecs))
      }
    } catch (err) {
      console.error(err)
    }
  }

  useEffect(() => {
    loadData()
  }, [clientId, companyName])

  useRealtime('service_records', () => loadData())
  useRealtime('agents', () => loadData())

  const effectiveRecords = clientRecords || fetchedRecords

  const stats = useMemo(() => {
    return agents.map((agent) => {
      const agentRecords = effectiveRecords.filter((r) => isRecordForAgent(r, agent))
      const total = agentRecords.length
      const avoidable = agentRecords.filter((r) => r.avoidable_contact).length
      const reasonCount: Record<string, number> = {}
      agentRecords.forEach((r) => {
        if (r.contact_reason) {
          reasonCount[r.contact_reason] = (reasonCount[r.contact_reason] || 0) + 1
        }
      })
      const mostFrequent = Object.entries(reasonCount).sort((a, b) => b[1] - a[1])[0]?.[0] || '—'
      return { agent, total, avoidable, mostFrequent }
    })
  }, [agents, effectiveRecords])

  if (agents.length === 0) {
    return (
      <p className="text-xs text-slate-400 text-center py-4">
        Nenhum agente cadastrado para esta empresa.
      </p>
    )
  }

  return (
    <div className="space-y-2">
      <span className="text-xs font-semibold text-slate-700 uppercase tracking-wider">
        Histórico de Agentes
      </span>
      {stats.map(({ agent, total, avoidable, mostFrequent }) => (
        <div
          key={agent.id}
          className="flex items-center justify-between p-3 bg-white border rounded-lg"
        >
          <div className="space-y-0.5">
            <p className="text-xs font-semibold text-slate-900">{agent.name}</p>
            <div className="flex items-center gap-3 text-[11px] text-slate-500">
              <span className="flex items-center gap-1">
                <Headset className="h-3 w-3" /> {total} atendimento(s)
              </span>
              <span className="flex items-center gap-1">
                <TrendingUp className="h-3 w-3" /> {mostFrequent}
              </span>
              <span className="flex items-center gap-1">
                <AlertTriangle className="h-3 w-3 text-amber-500" /> {avoidable} evitável(eis)
              </span>
            </div>
          </div>
        </div>
      ))}
    </div>
  )
}
