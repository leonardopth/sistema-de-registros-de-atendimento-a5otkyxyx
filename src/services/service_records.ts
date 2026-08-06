import pb from '@/lib/pocketbase/client'
import { ServiceRecord } from '@/types/service_record'

export const getServiceRecords = async (): Promise<ServiceRecord[]> => {
  try {
    const records = await pb.collection('service_records').getFullList<ServiceRecord>({
      sort: '-created',
      expand: 'account_executive,client,agent,assigned_user,user_id',
    })
    return Array.isArray(records) ? records : []
  } catch (error) {
    console.error('Error fetching service records:', error)
    return []
  }
}

export const getMyServiceRecords = async (userId: string): Promise<ServiceRecord[]> => {
  try {
    if (!userId) return []
    const records = await pb.collection('service_records').getFullList<ServiceRecord>({
      filter: `user_id = "${userId}" || assigned_user = "${userId}"`,
      sort: '-created',
      expand: 'account_executive,client,agent,assigned_user,user_id',
    })
    return Array.isArray(records) ? records : []
  } catch (error) {
    console.error('Error fetching my service records:', error)
    return []
  }
}

export const getServiceRecord = async (id: string): Promise<ServiceRecord | null> => {
  try {
    if (!id) return null
    return await pb.collection('service_records').getOne<ServiceRecord>(id, {
      expand: 'account_executive,client,agent,assigned_user,user_id',
    })
  } catch (error) {
    console.error(`Error fetching service record ${id}:`, error)
    return null
  }
}

export const createServiceRecord = async (data: Partial<ServiceRecord>): Promise<ServiceRecord> => {
  return await pb.collection('service_records').create<ServiceRecord>(data)
}

export const updateServiceRecord = async (
  id: string,
  data: Partial<ServiceRecord>,
): Promise<ServiceRecord> => {
  return await pb.collection('service_records').update<ServiceRecord>(id, data)
}

export const updateServiceRecordWithHistory = async (
  id: string,
  data: Partial<ServiceRecord>,
  justification?: string,
): Promise<ServiceRecord> => {
  const current = await getServiceRecord(id)
  const updated = await pb.collection('service_records').update<ServiceRecord>(id, data)

  if (current && justification) {
    try {
      const changedFields: string[] = []
      if (data.status && data.status !== current.status) {
        changedFields.push(`status: ${current.status} -> ${data.status}`)
      }
      if (data.description && data.description !== current.description) {
        changedFields.push('descrição')
      }
      if (data.priority && data.priority !== current.priority) {
        changedFields.push(`prioridade: ${current.priority} -> ${data.priority}`)
      }

      await pb.collection('service_record_history').create({
        service_record: id,
        user: pb.authStore.record?.id || '',
        field: changedFields.join(', ') || 'alteração geral',
        old_value: current.status,
        new_value: data.status || current.status,
        justification,
      })
    } catch (e) {
      console.warn('Failed to record history entry:', e)
    }
  }

  return updated
}

export const deleteServiceRecord = async (id: string): Promise<boolean> => {
  await pb.collection('service_records').delete(id)
  return true
}

export const batchUpdateStatus = async (
  ids: string[],
  status: string,
  justification?: string,
): Promise<void> => {
  if (!Array.isArray(ids)) return
  for (const id of ids) {
    await updateServiceRecordWithHistory(id, { status: status as any }, justification)
  }
}

export const batchDeleteServiceRecords = async (ids: string[]): Promise<void> => {
  if (!Array.isArray(ids)) return
  for (const id of ids) {
    await deleteServiceRecord(id)
  }
}

export const getSharedRecordIds = async (userId: string): Promise<string[]> => {
  try {
    if (!userId) return []
    const shares = await pb.collection('service_record_shares').getFullList({
      filter: `user = "${userId}"`,
    })
    return Array.isArray(shares) ? shares.map((s: any) => s.service_record).filter(Boolean) : []
  } catch (error) {
    console.error('Error fetching shared record ids:', error)
    return []
  }
}

export const getSharedServiceRecords = async (userId: string): Promise<ServiceRecord[]> => {
  try {
    const ids = await getSharedRecordIds(userId)
    if (!Array.isArray(ids) || ids.length === 0) return []
    const filter = ids.map((id) => `id = "${id}"`).join(' || ')
    const records = await pb.collection('service_records').getFullList<ServiceRecord>({
      filter,
      sort: '-created',
      expand: 'account_executive,client,agent,assigned_user,user_id',
    })
    return Array.isArray(records) ? records : []
  } catch (error) {
    console.error('Error fetching shared service records:', error)
    return []
  }
}

export const mergeSharedRecords = (
  ownRecords: ServiceRecord[],
  sharedRecords: ServiceRecord[],
): ServiceRecord[] => {
  const own = Array.isArray(ownRecords) ? ownRecords : []
  const shared = Array.isArray(sharedRecords) ? sharedRecords : []
  const map = new Map<string, ServiceRecord>()
  for (const r of own) {
    if (r && r.id) map.set(r.id, r)
  }
  for (const r of shared) {
    if (r && r.id && !map.has(r.id)) map.set(r.id, r)
  }
  return Array.from(map.values())
}
