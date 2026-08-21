import {
  ServiceRecord,
  ClientRecord,
  UserRecord,
  ServiceGroup,
  CommercialBase,
} from '@/types/service_record'

export function isMasterUser(user: UserRecord | null): boolean {
  if (!user) return false
  return user.role === 'Master' || Boolean(user.master_access)
}

export function isManagerUser(user: UserRecord | null): boolean {
  if (!user) return false
  return (
    isMasterUser(user) ||
    user.role === 'Gerente' ||
    user.role === 'Supervisor' ||
    user.role === 'Líder'
  )
}

export function isExecutivoContas(user: UserRecord | null): boolean {
  if (!user) return false
  return user.role === 'Executivo de Contas'
}

export function isGestorComercial(user: UserRecord | null): boolean {
  if (!user) return false
  return user.role === 'Gestor Comercial'
}

export function getUserServiceGroups(user: UserRecord | null): ServiceGroup[] {
  if (!user || !Array.isArray(user.service_groups)) return []
  return user.service_groups
}

export function getUserBases(user: UserRecord | null): CommercialBase[] {
  if (!user || !Array.isArray(user.bases)) return []
  return user.bases
}

export function hasGroupRestriction(user: UserRecord | null): boolean {
  if (!user || isMasterUser(user)) return false
  const groups = getUserServiceGroups(user)
  return groups.length > 0
}

export function hasBaseRestriction(user: UserRecord | null): boolean {
  if (!user || isMasterUser(user)) return false
  if (isGestorComercial(user) || isExecutivoContas(user)) {
    const bases = getUserBases(user)
    return bases.length > 0
  }
  return false
}

export function canAccessClient(client: ClientRecord | null, user: UserRecord | null): boolean {
  if (!client || !user) return false
  if (isMasterUser(user)) return true

  if (isManagerUser(user)) {
    const userGroups = getUserServiceGroups(user)
    if (userGroups.length === 0) return true
    return client.service_group ? userGroups.includes(client.service_group as any) : true
  }

  if (isGestorComercial(user) || isExecutivoContas(user)) {
    const userBases = getUserBases(user)
    if (userBases.length === 0) return true
    const execRel = client.expand?.account_executive_rel
    if (!execRel || !Array.isArray(execRel.bases)) return true
    return execRel.bases.some((b) => userBases.includes(b))
  }

  const userGroups = getUserServiceGroups(user)
  if (userGroups.length === 0) return true
  return client.service_group ? userGroups.includes(client.service_group as any) : true
}

export function canAccessRecord(record: ServiceRecord | null, user: UserRecord | null): boolean {
  if (!record || !user) return false
  if (isMasterUser(user)) return true
  if (record.user_id === user.id || record.assigned_user === user.id) return true

  if (record.expand?.client) {
    return canAccessClient(record.expand.client, user)
  }

  return true
}

export function canEditRecord(record: ServiceRecord | null, user: UserRecord | null): boolean {
  if (!record || !user) return false
  if (isMasterUser(user)) return true
  if (record.user_id === user.id || record.assigned_user === user.id) return true
  if (isManagerUser(user)) return canAccessRecord(record, user)
  return false
}

export function filterRecordsByUserAccess(
  records: ServiceRecord[] | undefined | null,
  user: UserRecord | null,
): ServiceRecord[] {
  if (!Array.isArray(records)) return []
  if (!user) return []
  if (isMasterUser(user)) return records.filter(Boolean)

  return records.filter((r) => r && canAccessRecord(r, user))
}

export function getAccessibleExecutiveIds(
  executives: any[] | undefined | null,
  user: UserRecord | null,
): string[] {
  if (!Array.isArray(executives)) return []
  if (!user) return []
  if (isMasterUser(user)) return executives.map((e) => e?.id).filter(Boolean)

  const userBases = getUserBases(user)
  if (userBases.length === 0) return executives.map((e) => e?.id).filter(Boolean)

  return executives
    .filter((exec) => {
      if (!exec) return false
      if (!Array.isArray(exec.bases) || exec.bases.length === 0) return true
      return exec.bases.some((b: any) => userBases.includes(b))
    })
    .map((e) => e.id)
    .filter(Boolean)
}

export function filterClientsByUserAccess(
  clients: ClientRecord[] | undefined | null,
  user: UserRecord | null,
): ClientRecord[] {
  if (!Array.isArray(clients)) return []
  if (!user) return []
  if (isMasterUser(user)) return clients.filter(Boolean)

  return clients.filter((c) => c && canAccessClient(c, user))
}
