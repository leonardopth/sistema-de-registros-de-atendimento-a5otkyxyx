import pb from '@/lib/pocketbase/client'
import { ServiceRecord } from '@/types/service_record'

export const getServiceRecords = async (
  sort = '-created',
  filter?: string,
): Promise<ServiceRecord[]> => {
  try {
    const records = await pb.collection('service_records').getFullList<ServiceRecord>({
      sort,
      filter: filter || undefined,
      expand: 'account_executive,client,agent,assigned_user,user_id',
    })
    return Array.isArray(records) ? records : []
  } catch (error) {
    console.error('Error fetching service records:', error)
    return []
  }
}

/**
 * Busca atendimentos aplicando a regra de acesso centralizada (RBAC no backend):
 * - Usuários 'Master' ou master_access = true visualizam TODOS os atendimentos
 * - Usuários normais visualizam APENAS: (a) seus próprios atendimentos (user_id ou assigned_user); (b) atendimentos compartilhados com eles.
 */
export const getAccessibleServiceRecords = async (
  userId?: string,
  userRole?: string,
  masterAccess?: boolean,
  sort = '-created',
): Promise<ServiceRecord[]> => {
  try {
    const isMaster = userRole === 'Master' || masterAccess === true
    if (isMaster || !userId) {
      return await getServiceRecords(sort)
    }

    // Busca IDs dos atendimentos compartilhados com o usuário
    const sharedIds = await getSharedRecordIds(userId)

    let filter = `user_id = "${userId}" || assigned_user = "${userId}"`
    if (sharedIds.length > 0) {
      const sharesFilter = sharedIds.map((id) => `id = "${id}"`).join(' || ')
      filter = `(${filter}) || (${sharesFilter})`
    }

    return await getServiceRecords(sort, filter)
  } catch (error) {
    console.error('Error fetching accessible service records:', error)
    return []
  }
}

/**
 * Busca atendimentos e usuários aplicando restrição de acesso a nível de consulta backend para o Relatório Consultor:
 * - Master (ou master_access=true): busca TODOS os atendimentos e TODOS os usuários/consultores sem restrição
 * - Líderes / Gestão (Gerentes, Supervisores, Líderes): filtra no backend consultores dos seus grupos de atendimento e os atendimentos correspondentes
 * - Consultores comuns e outros não-master: filtra no backend apenas os registros do próprio usuário
 */
export const getConsultantReportData = async (
  currentUser: any,
): Promise<{ records: ServiceRecord[]; users: any[] }> => {
  try {
    if (!currentUser) {
      return { records: [], users: [] }
    }

    const isMaster = currentUser.role === 'Master' || currentUser.master_access === true
    const isLeadership =
      isMaster ||
      currentUser.role === 'Gerentes' ||
      currentUser.role === 'Supervisores' ||
      currentUser.role === 'Líderes'

    // 1. Caso Master: sem nenhuma restrição no backend (vê todos os consultores e registros)
    if (isMaster) {
      const [records, users] = await Promise.all([
        getServiceRecords('-created'),
        pb
          .collection('users')
          .getFullList({ sort: 'name' })
          .catch(async () => {
            const { getUsers } = await import('@/services/users')
            return getUsers()
          }),
      ])
      return { records, users: Array.isArray(users) ? users : [] }
    }

    // 2. Caso Líder / Gestão: filtra consultores dos mesmos grupos de atendimento e busca atendimentos desses consultores
    if (isLeadership) {
      const userGroups: string[] = Array.isArray(currentUser.service_groups)
        ? currentUser.service_groups
        : []

      let userFilter = `id = "${currentUser.id}"`
      if (userGroups.length > 0) {
        const groupConds = userGroups.map((g) => `service_groups ~ "${g}"`).join(' || ')
        userFilter = `(${userFilter}) || (role = 'Consultores' && (${groupConds}))`
      } else {
        // Se o líder não tiver grupos específicos definidos, vê todos os consultores ou todos do sistema
        userFilter = `role = 'Consultores' || id = "${currentUser.id}"`
      }

      let teamUsers: any[] = []
      try {
        teamUsers = await pb.collection('users').getFullList({
          filter: userFilter,
          sort: 'name',
        })
      } catch (err) {
        console.warn('Fallback loading team users:', err)
        const { getUsers } = await import('@/services/users')
        const all = await getUsers()
        teamUsers = all.filter((u: any) => {
          if (u.id === currentUser.id) return true
          if (u.role !== 'Consultores') return false
          if (userGroups.length === 0) return true
          const cg = Array.isArray(u.service_groups) ? u.service_groups : []
          return cg.some((g: string) => userGroups.includes(g))
        })
      }

      // Agora busca no backend os atendimentos vinculados a essa equipe
      const teamUserIds = Array.from(new Set(teamUsers.map((u) => u.id).filter(Boolean)))
      if (teamUserIds.length === 0) {
        teamUserIds.push(currentUser.id)
      }

      // Constrói filtro backend para service_records
      const userConditions = teamUserIds
        .map((id) => `user_id = "${id}" || assigned_user = "${id}"`)
        .join(' || ')

      const records = await getServiceRecords('-created', userConditions)
      return { records, users: teamUsers }
    }

    // 3. Caso Consultor comum / não-master: busca no backend apenas os próprios dados
    const myFilter = `user_id = "${currentUser.id}" || assigned_user = "${currentUser.id}"`
    const [records, myUserRec] = await Promise.all([
      getServiceRecords('-created', myFilter),
      pb
        .collection('users')
        .getOne(currentUser.id)
        .catch(() => currentUser),
    ])

    return {
      records,
      users: myUserRec ? [myUserRec] : [currentUser],
    }
  } catch (error) {
    console.error('Error fetching consultant report data:', error)
    return { records: [], users: [] }
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

  if (
    current &&
    (justification ||
      (current.status === 'Concluído' && data.status && data.status !== 'Concluído'))
  ) {
    try {
      const isReopening =
        current.status === 'Concluído' && data.status && data.status !== 'Concluído'
      const changedFields: string[] = []
      if (isReopening) {
        changedFields.push(`Reabertura de atendimento: Concluído -> ${data.status}`)
      } else if (data.status && data.status !== current.status) {
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
        justification: justification || data.reopen_justification || '',
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

export const batchReassignConsultant = async (
  ids: string[],
  assignedUserId: string,
  assignedAgentName?: string,
): Promise<void> => {
  if (!Array.isArray(ids)) return
  for (const id of ids) {
    await updateServiceRecordWithHistory(
      id,
      {
        assigned_user: assignedUserId,
        assigned_agent: assignedAgentName,
      },
      `Reatribuição em lote para consultor: ${assignedAgentName || assignedUserId}`,
    )
  }
}

export const batchUpdateAvoidable = async (
  ids: string[],
  avoidable: boolean,
  explanation?: string,
): Promise<void> => {
  if (!Array.isArray(ids)) return
  for (const id of ids) {
    await updateServiceRecordWithHistory(
      id,
      {
        avoidable_contact: avoidable,
        avoidable_contact_explanation: avoidable ? explanation : '',
      },
      avoidable ? 'Marcado como evitável em lote' : 'Marcado como não evitável em lote',
    )
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
