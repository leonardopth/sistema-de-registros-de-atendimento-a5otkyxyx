import pb from '@/lib/pocketbase/client'
import type { ServiceRecord, AgentRecord } from '@/types/service_record'

export async function getClientServiceRecords(clientId: string): Promise<ServiceRecord[]> {
  const agents = (await pb.collection('agents').getFullList({
    filter: `client_id = "${clientId}"`,
  })) as unknown as AgentRecord[]

  const agentIds = agents.map((a) => a.id)

  const filters: string[] = [`client = "${clientId}"`]
  for (const id of agentIds) {
    filters.push(`agent = "${id}"`)
  }

  const records = (await pb.collection('service_records').getFullList({
    filter: filters.join(' || '),
    sort: '-created',
    expand: 'assigned_user,user_id,agent,client,account_executive',
  })) as unknown as ServiceRecord[]

  return records
}

export async function getClientAgents(clientId: string): Promise<AgentRecord[]> {
  const agents = (await pb.collection('agents').getFullList({
    filter: `client_id = "${clientId}"`,
    sort: 'name',
  })) as unknown as AgentRecord[]
  return agents
}
