import pb from '@/lib/pocketbase/client'
import { createAuditLog } from '@/services/audit-log'
import type { ServiceRecord } from '@/types/service_record'

export async function getServiceRecords(): Promise<ServiceRecord[]> {
  const currentUser = pb.authStore.record
  const isMaster = currentUser?.role === 'Master' || currentUser?.master_access === true

  if (isMaster) {
    return await pb.collection('service_records').getFullList<ServiceRecord>({
      sort: '-created',
      expand: 'account_executive,client,agent,assigned_user,user_id',
    })
  }

  const userId = currentUser?.id
  if (!userId) return []

  const [ownedRecords, shares] = await Promise.all([
    pb
      .collection('service_records')
      .getFullList<ServiceRecord>({
        filter: `user_id = "${userId}" || assigned_user = "${userId}"`,
        sort: '-created',
        expand: 'account_executive,client,agent,assigned_user,user_id',
      })
      .catch(() => []),
    pb
      .collection('service_record_shares')
      .getFullList({
        filter: `user = "${userId}"`,
        expand: 'service_record',
      })
      .catch(() => []),
  ])

  const sharedRecordIds = shares
    .map((s: { service_record?: string }) => s.service_record)
    .filter(Boolean) as string[]

  let sharedRecords: ServiceRecord[] = []
  if (sharedRecordIds.length > 0) {
    const idFilter = sharedRecordIds.map((id) => `id = "${id}"`).join(' || ')
    sharedRecords = await pb
      .collection('service_records')
      .getFullList<ServiceRecord>({
        filter: idFilter,
        sort: '-created',
        expand: 'account_executive,client,agent,assigned_user,user_id',
      })
      .catch(() => [])
  }

  const recordMap = new Map<string, ServiceRecord>()
  ownedRecords.forEach((r) => recordMap.set(r.id, r))
  sharedRecords.forEach((r) => recordMap.set(r.id, r))

  return Array.from(recordMap.values()).sort(
    (a, b) => new Date(b.created).getTime() - new Date(a.created).getTime(),
  )
}

export async function getMyServiceRecords(userId: string): Promise<ServiceRecord[]> {
  return await pb.collection('service_records').getFullList<ServiceRecord>({
    filter: `user_id = "${userId}" || assigned_user = "${userId}"`,
    sort: '-created',
    expand: 'account_executive,client,agent,assigned_user,user_id',
  })
}

export async function getServiceRecord(id: string): Promise<ServiceRecord> {
  return await pb.collection('service_records').getOne<ServiceRecord>(id, {
    expand: 'account_executive,client,agent,assigned_user,user_id',
  })
}

export async function createServiceRecord(data: Partial<ServiceRecord>) {
  const currentUserId = pb.authStore.record?.id
  const payload = {
    ...data,
    user_id: data.user_id || currentUserId,
    assigned_user: data.assigned_user || currentUserId,
  }

  const record = await pb.collection('service_records').create(payload)

  try {
    await createAuditLog({
      action: 'Created Record',
      entity: 'service_records',
      entity_id: record.id,
      details: {
        client_name: record.client_name,
        contact_reason: record.contact_reason,
        status: record.status,
        priority: record.priority,
        channel: record.channel,
      },
    })
  } catch (err) {
    console.error('Audit log error on creation:', err)
  }

  return record
}

export async function updateServiceRecord(id: string, data: Partial<ServiceRecord>) {
  const updated = await pb.collection('service_records').update(id, data)

  try {
    await createAuditLog({
      action: 'Updated Record',
      entity: 'service_records',
      entity_id: id,
      details: data as Record<string, unknown>,
    })
  } catch (err) {
    console.error('Audit log error on update:', err)
  }

  return updated
}

export async function updateServiceRecordWithHistory(
  id: string,
  data: Partial<ServiceRecord>,
  userId: string,
) {
  const updated = await pb.collection('service_records').update(id, data)

  try {
    await createAuditLog({
      user: userId || pb.authStore.record?.id,
      action: 'Updated Record',
      entity: 'service_records',
      entity_id: id,
      details: data as Record<string, unknown>,
    })
  } catch (err) {
    console.error('Audit log error on update with history:', err)
  }

  return updated
}

export async function deleteServiceRecord(id: string) {
  try {
    await createAuditLog({
      action: 'Deleted Record',
      entity: 'service_records',
      entity_id: id,
    })
  } catch (err) {
    console.error('Audit log error on deletion:', err)
  }

  return await pb.collection('service_records').delete(id)
}

export async function batchUpdateStatus(ids: string[], status: string) {
  return await Promise.all(
    ids.map((id) => updateServiceRecord(id, { status: status as ServiceRecord['status'] })),
  )
}

export async function batchDeleteServiceRecords(ids: string[]) {
  return await Promise.all(ids.map((id) => deleteServiceRecord(id)))
}

export async function getSharedRecordIds(userId: string): Promise<string[]> {
  const shares = await pb
    .collection('service_record_shares')
    .getFullList({ filter: `user = "${userId}"` })
  return shares
    .map((s: { service_record?: string }) => s.service_record)
    .filter(Boolean) as string[]
}

export async function getSharedServiceRecords(userId: string): Promise<ServiceRecord[]> {
  const sharedIds = await getSharedRecordIds(userId)
  if (sharedIds.length === 0) return []
  const filter = sharedIds.map((id) => `id = "${id}"`).join(' || ')
  return await pb.collection('service_records').getFullList<ServiceRecord>({
    filter,
    sort: '-created',
    expand: 'account_executive,client,agent,assigned_user,user_id',
  })
}

export function mergeSharedRecords(
  owned: ServiceRecord[],
  shared: ServiceRecord[],
): ServiceRecord[] {
  const map = new Map<string, ServiceRecord>()
  owned.forEach((r) => map.set(r.id, r))
  shared.forEach((r) => map.set(r.id, r))
  return Array.from(map.values()).sort(
    (a, b) => new Date(b.created).getTime() - new Date(a.created).getTime(),
  )
}
