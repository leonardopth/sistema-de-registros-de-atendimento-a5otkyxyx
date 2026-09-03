import pb from '@/lib/pocketbase/client'
import type { UserRecord } from '@/types/service_record'

export interface UserTargetRecord {
  id: string
  user: string
  monthly_attendance_target?: number
  min_resolution_rate?: number
  avg_response_time_target?: number // minutos
  auto_categorization_target?: number // %
  min_satisfaction_target?: number // %
  tfr_target?: number // minutos TFR
  created_by?: string
  created?: string
  updated?: string
  expand?: {
    user?: UserRecord
    created_by?: UserRecord
  }
}
export const getUserTargets = async (): Promise<UserTargetRecord[]> => {
  try {
    const records = await pb.collection('user_targets').getFullList<UserTargetRecord>({
      sort: '-created',
      expand: 'user,created_by',
    })
    return Array.isArray(records) ? records : []
  } catch (error) {
    console.error('Error fetching user targets:', error)
    return []
  }
}

export const getUserTarget = async (id: string): Promise<UserTargetRecord | null> => {
  try {
    return await pb.collection('user_targets').getOne<UserTargetRecord>(id, {
      expand: 'user,created_by',
    })
  } catch (error) {
    console.error(`Error fetching user target ${id}:`, error)
    return null
  }
}

export const createUserTarget = async (
  data: Partial<UserTargetRecord>,
): Promise<UserTargetRecord> => {
  return await pb.collection('user_targets').create<UserTargetRecord>({
    ...data,
    created_by: pb.authStore.record?.id || data.created_by,
  })
}

export const updateUserTarget = async (
  id: string,
  data: Partial<UserTargetRecord>,
): Promise<UserTargetRecord> => {
  return await pb.collection('user_targets').update<UserTargetRecord>(id, data)
}

export const deleteUserTarget = async (id: string): Promise<void> => {
  await pb.collection('user_targets').delete(id)
}
