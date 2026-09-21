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

/**
 * Identifica se um usuário pertence ao time comercial:
 * - Cargo "Gestor Comercial" ou "Executivo de Contas"
 * - Ou possui vínculo com regionais (bases) configurado
 */
export function isCommercialUser(user: UserRecord | null | undefined): boolean {
  if (!user) return false
  if (user.role === 'Gestor Comercial' || user.role === 'Executivo de Contas') return true
  if (Array.isArray(user.bases) && user.bases.length > 0 && user.role !== 'Master') return true
  return false
}

export function getUserServiceGroups(user: UserRecord | null): ServiceGroup[] {
  if (!user || !Array.isArray(user.service_groups)) return []
  return user.service_groups
}

export function getUserBases(user: UserRecord | null): CommercialBase[] {
  if (!user || !Array.isArray(user.bases)) return []
  return user.bases
}

export function getUserDepartments(user: UserRecord | null): string[] {
  if (!user) return []
  return normalizeStringArray(user.departments)
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

/**
 * Normaliza array de strings/grupos para evitar discrepâncias (ex.: undefined, null, formato string JSON)
 */
function normalizeStringArray(val: unknown): string[] {
  if (!val) return []
  if (Array.isArray(val)) return val.map((v) => String(v).trim()).filter(Boolean)
  if (typeof val === 'string' && val.trim().length > 0) {
    try {
      const parsed = JSON.parse(val)
      if (Array.isArray(parsed)) return parsed.map((v) => String(v).trim()).filter(Boolean)
      return [val.trim()]
    } catch {
      return [val.trim()]
    }
  }
  return []
}

/**
 * Regra de acesso estrita e de correspondência CONJUNTA (Núcleo + Equipe) para o módulo Banco de Horas & Férias:
 * - Master ou master_access = true: visão irrestrita (todos os colaboradores).
 * - O próprio usuário sempre acessa seus próprios dados.
 * - Vínculo direto de supervisão (target.supervisor_id === currentUser.id): permitido.
 * - Gerente ou Gestor Comercial sem nenhum service_groups E sem departments: gestor geral irrestrito (acesso a todos).
 * - Gestores / Supervisores / Líderes / Gestores Comerciais:
 *     1. Validação de Núcleo (service_groups):
 *        Se o gestor possuir service_groups, o alvo DEVE ter interseção EXATA em pelo menos um núcleo.
 *        Se o gestor não possuir service_groups, passa (não tem restrição de núcleo).
 *     2. Validação de Equipe (departments - 'Internacional' / 'Nacional'):
 *        Se o gestor possuir departments definidos (ex: apenas ['Internacional'] ou ['Nacional']):
 *        o alvo DEVE compartilhar pelo menos um departamento com o gestor.
 *        Gestor só INTER não vê NAC e vice-versa; gestor com ambos vê as duas equipes.
 *        Se o gestor NÃO possuir departments definidos, aplica apenas a restrição de núcleo (não trava gestor sem equipe marcada).
 * - Consultores ou demais colaboradores: acessam APENAS a si mesmos.
 */
export function canAccessUserInBancoHoras(
  targetUser: UserRecord | null | undefined,
  currentUser: UserRecord | null | undefined,
): boolean {
  if (!targetUser || !currentUser) return false
  if (isMasterUser(currentUser)) return true
  if (targetUser.id === currentUser.id) return true

  const role = currentUser.role
  const isManager =
    role === 'Gerente' || role === 'Supervisor' || role === 'Líder' || role === 'Gestor Comercial'

  if (!isManager) {
    // Consultor ou outros colaboradores: apenas si próprio
    return false
  }

  // 1. Vínculo direto de supervisão
  const targetSupervisorId = (targetUser as any).supervisor_id
  if (targetSupervisorId && targetSupervisorId === currentUser.id) {
    return true
  }

  const managerGroups = normalizeStringArray(currentUser.service_groups)
  const managerDepts = normalizeStringArray(currentUser.departments)

  // Gerente ou Gestor Comercial geral sem grupos específicos e sem departamentos tem visão irrestrita
  if (
    managerGroups.length === 0 &&
    managerDepts.length === 0 &&
    (role === 'Gerente' || role === 'Gestor Comercial')
  ) {
    return true
  }

  // 2. Validação do Núcleo (service_groups)
  if (managerGroups.length > 0) {
    const targetGroups = normalizeStringArray(targetUser.service_groups)
    const hasGroupMatch = managerGroups.some((g) => targetGroups.includes(g))
    if (!hasGroupMatch) {
      return false
    }
  }

  // 3. Validação da Equipe / Departamento (departments: Internacional / Nacional)
  if (managerDepts.length > 0) {
    const targetDepts = normalizeStringArray(targetUser.departments)
    const hasDeptMatch = managerDepts.some((d) => targetDepts.includes(d))
    if (!hasDeptMatch) {
      return false
    }
  }

  return true
}

/**
 * Filtra a lista de usuários para o escopo permitido no Banco de Horas & Férias
 */
export function getAccessibleUsersInBancoHoras(
  allUsers: UserRecord[] | undefined | null,
  currentUser: UserRecord | null | undefined,
): UserRecord[] {
  if (!Array.isArray(allUsers)) return []
  if (!currentUser) return []
  if (isMasterUser(currentUser)) return allUsers

  return allUsers.filter((u) => canAccessUserInBancoHoras(u, currentUser))
}
