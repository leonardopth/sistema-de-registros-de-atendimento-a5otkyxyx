import pb from '@/lib/pocketbase/client'
import { ClientRecord } from '@/types/service_record'

export const getClients = (filter?: string) => {
  const params: { sort: string; filter?: string; expand: string } = {
    sort: 'name',
    expand: 'account_executive_rel,blocked_by',
  }
  if (filter) params.filter = filter
  return pb.collection('clients').getFullList<ClientRecord>(params)
}

export const getClient = (id: string) => {
  return pb.collection('clients').getOne<ClientRecord>(id, {
    expand: 'account_executive_rel,blocked_by',
  })
}

export const createClient = (data: Partial<ClientRecord>) => {
  return pb.collection('clients').create<ClientRecord>(data)
}

export const updateClient = (id: string, data: Partial<ClientRecord>) => {
  return pb.collection('clients').update<ClientRecord>(id, data)
}

export const deleteClient = (id: string) => {
  return pb.collection('clients').delete(id)
}

export const blockClient = (id: string, reason: string, userId: string) => {
  return pb.collection('clients').update<ClientRecord>(id, {
    blocked: true,
    block_reason: reason,
    blocked_by: userId,
    blocked_at: new Date().toISOString(),
  })
}

export const unblockClient = (id: string) => {
  return pb.collection('clients').update<ClientRecord>(id, {
    blocked: false,
    block_reason: '',
    blocked_by: null,
    blocked_at: null,
  })
}
