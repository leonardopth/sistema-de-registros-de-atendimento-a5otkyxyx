import pb from '@/lib/pocketbase/client'
import { ServiceRecord } from '@/types/service_record'

export const getServiceRecords = (filter?: string, sort: string = '-created') => {
  const params: { sort: string; filter?: string; expand: string } = {
    sort,
    expand: 'account_executive,client,agent,assigned_user,user_id',
  }
  if (filter) params.filter = filter
  return pb.collection('service_records').getFullList<ServiceRecord>(params)
}

export const getMyServiceRecords = (userId: string) => {
  return pb.collection('service_records').getFullList<ServiceRecord>({
    filter: `assigned_user = "${userId}"`,
    sort: '-created',
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

export const updateServiceRecordWithHistory = async (
  id: string,
  data: Partial<ServiceRecord>,
  _userId?: string,
) => {
  return updateServiceRecord(id, data)
}

export const deleteServiceRecord = (id: string) => {
  return pb.collection('service_records').delete(id)
}

export const batchUpdateStatus = async (ids: string[], status: ServiceRecord['status']) => {
  const updateData: Record<string, unknown> = { status }
  if (status === 'Concluído') {
    updateData.end_time = new Date().toISOString()
  }
  const promises = ids.map((id) => pb.collection('service_records').update(id, updateData))
  return Promise.all(promises)
}

export const batchDeleteServiceRecords = async (ids: string[]) => {
  const promises = ids.map((id) => pb.collection('service_records').delete(id))
  return Promise.all(promises)
}
