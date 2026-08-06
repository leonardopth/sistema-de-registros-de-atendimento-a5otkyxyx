import { ServiceRecord, ClientRecord } from '@/types/service_record'

export function isMasterUser(user: any): boolean {
  return user?.role === 'Master'
}

export function getUserServiceGroups(user: any): string[] {
  if (!user || isMasterUser(user)) return []
  return (user.service_groups as string[]) || []
}

export function hasGroupRestriction(user: any): boolean {
  return getUserServiceGroups(user).length > 0
}

export function canAccessClient(user: any, client: ClientRecord): boolean {
  if (!user) return false
  if (isMasterUser(user)) return true
  const groups = getUserServiceGroups(user)
  if (groups.length === 0) return true
  return client.service_group ? groups.includes(client.service_group) : false
}

export function canAccessRecord(
  user: any,
  record: ServiceRecord,
  clientServiceGroup?: string,
): boolean {
  if (!user) return false
  if (isMasterUser(user)) return true
  if (record.user_id === user.id || record.assigned_user === user.id) return true
  const groups = getUserServiceGroups(user)
  if (groups.length === 0) return true
  return clientServiceGroup ? groups.includes(clientServiceGroup) : false
}

export function canEditRecord(
  user: any,
  record: ServiceRecord,
  clientServiceGroup?: string,
): boolean {
  return canAccessRecord(user, record, clientServiceGroup)
}

export function filterRecordsByUserAccess(
  records: ServiceRecord[],
  user: any,
  clientMap?: Map<string, { service_group?: string }>,
): ServiceRecord[] {
  if (!user) return []
  if (isMasterUser(user)) return records
  const groups = getUserServiceGroups(user)
  if (groups.length === 0) return records
  return records.filter((r) => {
    if (r.user_id === user.id || r.assigned_user === user.id) return true
    const sg = r.expand?.client?.service_group || clientMap?.get(r.client || '')?.service_group
    return sg ? groups.includes(sg) : false
  })
}

export function filterClientsByUserAccess(clients: ClientRecord[], user: any): ClientRecord[] {
  if (!user) return []
  if (isMasterUser(user)) return clients
  const groups = getUserServiceGroups(user)
  if (groups.length === 0) return clients
  return clients.filter((c) => (c.service_group ? groups.includes(c.service_group) : false))
}
