import pb from '@/lib/pocketbase/client'
import { ClientRecord } from '@/types/service_record'

export const getClients = (filter?: string) => {
  const params: { sort: string; filter?: string; expand: string } = {
    sort: 'name',
    expand: 'account_executive_rel',
  }
  if (filter) params.filter = filter
  return pb.collection('clients').getFullList<ClientRecord>(params)
}

export const getClient = (id: string) => {
  return pb.collection('clients').getOne<ClientRecord>(id)
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
