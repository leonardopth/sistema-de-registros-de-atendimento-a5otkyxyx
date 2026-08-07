import { useState, useEffect, useMemo } from 'react'
import { AgentRecord, ServiceRecord } from '@/types/service_record'
import { isRecordForAgent } from '@/lib/client-record-helpers'
import { getServiceRecords } from '@/services/service_records'
import { getAgents } from '@/services/agents'
import { useRealtime } from '@/hooks/use-realtime'
import { Headset, AlertTriangle, TrendingUp, User } from 'lucide-react'

interface AgentStatsListProps {
  clientId?: string
  companyName?: string
  clientRecords?: ServiceRecord[]
  agents?: AgentRecord[]
}

export function AgentStatsList({
  clientId,
  companyName,
  clientRecords: propClientRecords,
  agents: propAgents,
}: AgentStatsListProps) {
  const [fetchedRecords, setFetchedRecords] = useState<ServiceRecord[]>([])
  const [fetchedAgents, setFetchedAgents] = useState<AgentRecord[]>([])

  useEffect(() => {
    if (
      clientId &&
      (!propClientRecords || !Array.isArray(propClientRecords) || propClientRecords.length === 0)
    ) {
      Promise.all([getServiceRecords(), getAgents()])
        .then(([r, a]) => {
          const recordsArr = Array.isArray(r) ? r : []
          const agentsArr = Array.isArray(a) ? a : []
          setFetchedRecords(
            recordsArr.filter(
              (rec) => rec.client === clientId || rec.expand?.client?.id === clientId,
            ),
          )
          setFetchedAgents(
            agentsArr.filter(
              (ag) => ag.client_id === clientId || ag.expand?.client_id?.id === clientId,
            ),
          )
        })
        .catch(() => {
          setFetchedRecords([])
          setFetchedAgents([])
        })
    }
  }, [clientId, propClientRecords])

  useRealtime('service_records', () => {
    if (
      clientId &&
      (!propClientRecords || !Array.isArray(propClientRecords) || propClientRecords.length === 0)
    ) {
      getServiceRecords()
        .then((r) => {
          const recordsArr = Array.isArray(r) ? r : []
          setFetchedRecords(
            recordsArr.filter(
              (rec) => rec.client === clientId || rec.expand?.client?.id === clientId,
            ),
          )
        })
        .catch(() => {})
    }
  })

  const clientRecords =
    Array.isArray(propClientRecords) && propClientRecords.length > 0
      ? propClientRecords
      : fetchedRecords
  const agents = Array.isArray(propAgents) && propAgents.length > 0 ? propAgents : fetchedAgents

  const safeClientRecords = Array.isArray(clientRecords) ? clientRecords : []
  const safeAgents = Array.isArray(agents) ? agents : []

  const agentStats = useMemo(() => {
    const map = new Map<
      string,
      {
        agent: AgentRecord | { id: string; name: string }
        total: number
        avoidable: number
      }
    >()

    for (const agent of safeAgents) {
      if (!agent || !agent.id) continue
      map.set(agent.id, {
        agent,
        total: 0,
        avoidable: 0,
      })
    }

    for (const record of safeClientRecords) {
      if (!record) continue
      let matchedAgentId: string | null = null

      for (const agent of safeAgents) {
        if (agent && isRecordForAgent(record, agent)) {
          matchedAgentId = agent.id
          break
        }
      }

      if (matchedAgentId && map.has(matchedAgentId)) {
        const item = map.get(matchedAgentId)!
        item.total += 1
        if (record.avoidable_contact) {
          item.avoidable += 1
        }
      } else {
        const agentName = record.expand?.agent?.name || record.assigned_agent || 'Sem agente'
        const agentKey = record.agent || record.assigned_agent || agentName

        if (!map.has(agentKey)) {
          map.set(agentKey, {
            agent: { id: agentKey, name: agentName },
            total: 0,
            avoidable: 0,
          })
        }
        const item = map.get(agentKey)!
        item.total += 1
        if (record.avoidable_contact) {
          item.avoidable += 1
        }
      }
    }

    return Array.from(map.values())
  }, [safeAgents, safeClientRecords])

  if (agentStats.length === 0) {
    return (
      <div className="text-center py-4 text-xs text-slate-400">
        Nenhum histórico de agentes disponível.
      </div>
    )
  }

  return (
    <div className="space-y-3">
      <h4 className="text-xs font-bold uppercase tracking-wider text-slate-500">
        HISTÓRICO DE AGENTES
      </h4>
      <div className="grid gap-2 sm:grid-cols-1">
        {agentStats.map(({ agent, total, avoidable }) => (
          <div
            key={agent.id}
            className="flex items-center justify-between p-3 bg-slate-50 border border-slate-200 rounded-lg text-xs"
          >
            <div className="space-y-1">
              <div className="flex items-center gap-1.5 font-semibold text-slate-800">
                <User className="h-3.5 w-3.5 text-slate-500" />
                <span>{agent.name}</span>
              </div>
              <div className="flex items-center gap-4 text-slate-500 text-[11px]">
                <span className="flex items-center gap-1">
                  <Headset className="h-3 w-3 text-indigo-600" />
                  <strong className="font-semibold text-slate-700">{total}</strong> atendimento(s)
                </span>
                <span className="flex items-center gap-1">
                  <TrendingUp className="h-3 w-3 text-emerald-600" /> —
                </span>
                <span className="flex items-center gap-1">
                  <AlertTriangle className="h-3 w-3 text-amber-500" />
                  <strong className="font-semibold text-slate-700">{avoidable}</strong>{' '}
                  evitável(eis)
                </span>
              </div>
            </div>
          </div>
        ))}
      </div>
    </div>
  )
}
