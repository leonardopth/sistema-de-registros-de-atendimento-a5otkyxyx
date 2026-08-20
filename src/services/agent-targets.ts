import pb from '@/lib/pocketbase/client'
import type { AgentTargetRecord } from '@/types/service_record'

export const getAgentTargets = async (): Promise<AgentTargetRecord[]> => {
  try {
    const records = await pb
      .collection('agent_targets')
      .getFullList<AgentTargetRecord>({ sort: 'created', expand: 'agent,created_by' })
    return Array.isArray(records) ? records : []
  } catch (error) {
    console.error('Error fetching agent targets:', error)
    return []
  }
}

export const getAgentTarget = async (id: string): Promise<AgentTargetRecord | null> => {
  try {
    return await pb.collection('agent_targets').getOne<AgentTargetRecord>(id, {
      expand: 'agent,created_by',
    })
  } catch (error) {
    console.error(`Error fetching agent target ${id}:`, error)
    return null
  }
}

export const createAgentTarget = async (
  data: Partial<AgentTargetRecord>,
): Promise<AgentTargetRecord> => {
  return await pb.collection('agent_targets').create<AgentTargetRecord>(data)
}

export const updateAgentTarget = async (
  id: string,
  data: Partial<AgentTargetRecord>,
): Promise<AgentTargetRecord> => {
  return await pb.collection('agent_targets').update<AgentTargetRecord>(id, data)
}

export const deleteAgentTarget = async (id: string): Promise<void> => {
  await pb.collection('agent_targets').delete(id)
}
