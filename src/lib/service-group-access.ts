import { ServiceRecord, ClientRecord } from '@/types/service_record'

const MANAGER_ROLES = ['Gerentes', 'Supervisores', 'Líderes']

export function isMasterUser(user: any): boolean {
  return user?.role === 'Master'
}

export function isManagerUser(user: any): boolean {
  return MANAGER_ROLES.includes(user?.role)
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
  creatorServiceGroups?: string[],
): boolean {
  if (!user) return false
  if (isMasterUser(user)) return true
  if (record.user_id === user.id || record.assigned_user === user.id) return true
  const groups = getUserServiceGroups(user)
  if (groups.length === 0) return true

  if (clientServiceGroup && groups.includes(clientServiceGroup)) return true

  if (isManagerUser(user) && creatorServiceGroups) {
    if (creatorServiceGroups.some((g) => groups.includes(g))) return true
  }

  return false
}

export function canEditRecord(
  user: any,
  record: ServiceRecord,
  clientServiceGroup?: string,
  creatorServiceGroups?: string[],
): boolean {
  return canAccessRecord(user, record, clientServiceGroup, creatorServiceGroups)
}

export function filterRecordsByUserAccess(
  records: ServiceRecord[],
  user: any,
  clientMap?: Map<string, { service_group?: string }>,
  userMap?: Map<string, { service_groups?: string[] }>,
): ServiceRecord[] {
  if (!user) return []
  if (isMasterUser(user)) return records
  const groups = getUserServiceGroups(user)
  if (groups.length === 0) return records

  const manager = isManagerUser(user)

  return records.filter((r) => {
    if (r.user_id === user.id || r.assigned_user === user.id) return true

    const sg = r.expand?.client?.service_group || clientMap?.get(r.client || '')?.service_group
    if (sg && groups.includes(sg)) return true

    if (manager) {
      const creatorId = r.assigned_user || r.user_id
      if (creatorId) {
        const creatorGroups =
          r.expand?.assigned_user?.service_groups ||
          r.expand?.user_id?.service_groups ||
          userMap?.get(creatorId)?.service_groups
        if (creatorGroups && creatorGroups.some((g: string) => groups.includes(g))) return true
      }
    }

    return false
  })
}

export function isExecutivoContas(user: any): boolean {
  return user?.role === 'Executivo de contas'
}

export function isGestorComercial(user: any): boolean {
  return user?.role === 'Gestor Comercial'
}

export function getUserBases(user: any): string[] {
  if (!user) return []
  return (user.bases as string[]) || []
}

export function hasBaseRestriction(user: any): boolean {
  return isExecutivoContas(user) || isGestorComercial(user)
}

export function getAccessibleExecutiveIds(
  user: any,
  executives: Array<{ id: string; email?: string; name: string; bases?: string[] }>,
): string[] {
  if (!user) return []
  if (isMasterUser(user)) return executives.map((e) => e.id)

  if (isExecutivoContas(user)) {
    return executives.filter((e) => e.email === user.email || e.name === user.name).map((e) => e.id)
  }

  if (isGestorComercial(user)) {
    const userBases = getUserBases(user)
    if (userBases.length === 0) return []
    return executives
      .filter((e) => {
        const execBases = (e.bases as string[]) || []
        return execBases.some((b) => userBases.includes(b))
      })
      .map((e) => e.id)
  }

  return []
}

export function filterClientsByUserAccess(clients: ClientRecord[], user: any): ClientRecord[] {
  if (!user) return []
  if (isMasterUser(user)) return clients
  const groups = getUserServiceGroups(user)
  if (groups.length === 0) return clients
  return clients.filter((c) => (c.service_group ? groups.includes(c.service_group) : false))
}
