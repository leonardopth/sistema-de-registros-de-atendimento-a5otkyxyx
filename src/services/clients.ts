import pb from '@/lib/pocketbase/client'
import { ClientRecord } from '@/types/service_record'

export const getClients = (filter?: string) => {
  return pb.collection('clients').getFullList<ClientRecord>({
    filter: filter || '',
    sort: 'name',
  })
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
