import pb from '@/lib/pocketbase/client'
import { AgentRecord } from '@/types/service_record'

export const getAgents = (clientId?: string) => {
  const params: { sort: string; filter?: string; expand: string } = {
    sort: 'name',
    expand: 'client_id',
  }
  if (clientId) params.filter = `client_id = "${clientId}"`
  return pb.collection('agents').getFullList<AgentRecord>(params)
}

export const getAgent = (id: string) => {
  return pb.collection('agents').getOne<AgentRecord>(id, { expand: 'client_id' })
}

export const createAgent = (data: Partial<AgentRecord>) => {
  return pb.collection('agents').create<AgentRecord>(data)
}

export const updateAgent = (id: string, data: Partial<AgentRecord>) => {
  return pb.collection('agents').update<AgentRecord>(id, data)
}

export const deleteAgent = (id: string) => {
  return pb.collection('agents').delete(id)
}
