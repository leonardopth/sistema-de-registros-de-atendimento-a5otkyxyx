import pb from '@/lib/pocketbase/client'
import { ServiceRecord } from '@/types/service_record'

export const getServiceRecords = (filter?: string, sort: string = '-created') => {
  return pb.collection('service_records').getFullList<ServiceRecord>({
    filter: filter || '',
    sort,
  })
}

export const getServiceRecord = (id: string) => {
  return pb.collection('service_records').getOne<ServiceRecord>(id)
}

export const createServiceRecord = (data: Partial<ServiceRecord>) => {
  return pb.collection('service_records').create<ServiceRecord>({
    ...data,
    user_id: pb.authStore.record?.id,
  })
}

export const updateServiceRecord = (id: string, data: Partial<ServiceRecord>) => {
  return pb.collection('service_records').update<ServiceRecord>(id, data)
}

export const deleteServiceRecord = (id: string) => {
  return pb.collection('service_records').delete(id)
}

export const batchUpdateStatus = async (ids: string[], status: ServiceRecord['status']) => {
  const promises = ids.map((id) => pb.collection('service_records').update(id, { status }))
  return Promise.all(promises)
}

export const batchDeleteServiceRecords = async (ids: string[]) => {
  const promises = ids.map((id) => pb.collection('service_records').delete(id))
  return Promise.all(promises)
}
