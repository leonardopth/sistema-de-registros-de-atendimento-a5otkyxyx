import pb from '@/lib/pocketbase/client'
import type { ServiceRecord, AgentRecord } from '@/types/service_record'

export async function getClientServiceRecords(clientId: string): Promise<ServiceRecord[]> {
  if (!clientId) return []
  try {
    const agentsResult = await pb.collection('agents').getFullList({
      filter: `client_id = "${clientId}"`,
    })
    const agents: AgentRecord[] = Array.isArray(agentsResult)
      ? (agentsResult as unknown as AgentRecord[])
      : []

    const agentIds = agents.map((a) => a.id)

    const filters: string[] = [`client = "${clientId}"`]
    for (const id of agentIds) {
      filters.push(`agent = "${id}"`)
    }

    const recordsResult = await pb.collection('service_records').getFullList({
      filter: filters.join(' || '),
      sort: '-created',
      expand: 'assigned_user,user_id,agent,client,account_executive',
    })

    return Array.isArray(recordsResult) ? (recordsResult as unknown as ServiceRecord[]) : []
  } catch (error) {
    console.error('Error fetching client service records:', error)
    return []
  }
}

export async function getClientAgents(clientId: string): Promise<AgentRecord[]> {
  if (!clientId) return []
  try {
    const agentsResult = await pb.collection('agents').getFullList({
      filter: `client_id = "${clientId}"`,
      sort: 'name',
    })
    return Array.isArray(agentsResult) ? (agentsResult as unknown as AgentRecord[]) : []
  } catch (error) {
    console.error('Error fetching client agents:', error)
    return []
  }
}
