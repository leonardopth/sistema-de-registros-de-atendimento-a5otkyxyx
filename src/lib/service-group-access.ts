import type {
  UserRecord,
  ServiceRecord,
  ClientRecord,
  AccountExecutiveRecord,
  ServiceGroup,
  CommercialBase,
} from '@/types/service_record'

export function isMasterUser(user: UserRecord | null | undefined): boolean {
  if (!user) return false
  return user.role === 'Master' || user.master_access === true
}

export function isManagerUser(user: UserRecord | null | undefined): boolean {
  if (!user) return false
  if (isMasterUser(user)) return true
  return ['Gerentes', 'Supervisores', 'Líderes'].includes(user.role)
}

export function isExecutivoContas(user: UserRecord | null | undefined): boolean {
  return user?.role === 'Executivo de contas'
}

export function isGestorComercial(user: UserRecord | null | undefined): boolean {
  return user?.role === 'Gestor Comercial'
}

export function getUserServiceGroups(user: UserRecord | null | undefined): ServiceGroup[] {
  return (user?.service_groups as ServiceGroup[]) || []
}

export function getUserBases(user: UserRecord | null | undefined): CommercialBase[] {
  return (user?.bases as CommercialBase[]) || []
}

export function hasGroupRestriction(user: UserRecord | null | undefined): boolean {
  if (!user) return false
  if (isMasterUser(user)) return false
  if (isManagerUser(user)) return false
  return getUserServiceGroups(user).length > 0
}

export function hasBaseRestriction(user: UserRecord | null | undefined): boolean {
  if (!user) return false
  if (isMasterUser(user)) return false
  if (isManagerUser(user)) return false
  return getUserBases(user).length > 0
}

export function canAccessClient(
  user: UserRecord | null | undefined,
  client: ClientRecord,
): boolean {
  if (!user) return false
  if (isMasterUser(user)) return true
  if (isManagerUser(user)) return true
  const userGroups = getUserServiceGroups(user)
  if (userGroups.length > 0 && client.service_group) {
    return userGroups.includes(client.service_group as ServiceGroup)
  }
  return true
}

export function canAccessRecord(
  user: UserRecord | null | undefined,
  record: ServiceRecord,
): boolean {
  if (!user) return false
  if (isMasterUser(user)) return true
  if (isManagerUser(user)) return true
  if (record.user_id === user.id) return true
  if (record.assigned_user === user.id) return true
  if (record.expand?.client) {
    return canAccessClient(user, record.expand.client)
  }
  return true
}

export function canEditRecord(user: UserRecord | null | undefined, record: ServiceRecord): boolean {
  return canAccessRecord(user, record)
}

export function filterRecordsByUserAccess(
  user: UserRecord | null | undefined,
  records: ServiceRecord[],
): ServiceRecord[] {
  if (!user) return []
  if (isMasterUser(user)) return records
  if (isManagerUser(user)) return records
  return records.filter((r) => canAccessRecord(user, r))
}

export function getAccessibleExecutiveIds(
  user: UserRecord | null | undefined,
  executives: AccountExecutiveRecord[],
): string[] {
  if (!user) return []
  if (isMasterUser(user)) return executives.map((e) => e.id)
  if (isManagerUser(user)) return executives.map((e) => e.id)
  return executives.map((e) => e.id)
}

export function filterClientsByUserAccess(
  user: UserRecord | null | undefined,
  clients: ClientRecord[],
): ClientRecord[] {
  if (!user) return []
  if (isMasterUser(user)) return clients
  if (isManagerUser(user)) return clients
  return clients.filter((c) => canAccessClient(user, c))
}
