import pb from '@/lib/pocketbase/client'
import { ClientRecord } from '@/types/service_record'

export const getClients = async (): Promise<ClientRecord[]> => {
  try {
    const list = await pb.collection('clients').getFullList<ClientRecord>({
      sort: '-created',
      expand: 'account_executive_rel',
    })
    return Array.isArray(list) ? list : []
  } catch (error) {
    console.error('Error fetching clients list:', error)
    return []
  }
}

export const getClient = async (id: string): Promise<ClientRecord | null> => {
  try {
    if (!id) return null
    return await pb.collection('clients').getOne<ClientRecord>(id, {
      expand: 'account_executive_rel',
    })
  } catch (error) {
    console.error(`Error fetching client ${id}:`, error)
    return null
  }
}

export const createClient = async (data: Partial<ClientRecord>): Promise<ClientRecord> => {
  return await pb.collection('clients').create<ClientRecord>(data)
}

export const updateClient = async (
  id: string,
  data: Partial<ClientRecord>,
): Promise<ClientRecord> => {
  return await pb.collection('clients').update<ClientRecord>(id, data)
}

export const deleteClient = async (id: string): Promise<boolean> => {
  await pb.collection('clients').delete(id)
  return true
}

export const blockClient = async (
  id: string,
  reason: string,
  userId: string,
): Promise<ClientRecord> => {
  return await pb.collection('clients').update<ClientRecord>(id, {
    blocked: true,
    block_reason: reason,
    blocked_by: userId,
    blocked_at: new Date().toISOString(),
  })
}

export const unblockClient = async (id: string): Promise<ClientRecord> => {
  return await pb.collection('clients').update<ClientRecord>(id, {
    blocked: false,
    block_reason: '',
    blocked_by: null,
    blocked_at: null,
  })
}
