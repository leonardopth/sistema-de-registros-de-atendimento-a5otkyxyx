import pb from '@/lib/pocketbase/client'
import type { GlobalTargetRecord } from '@/types/service_record'

/** Valores padrão exibidos quando nenhuma meta global foi cadastrada ainda. */
export const DEFAULT_GLOBAL_TARGET: GlobalTargetRecord = {
  id: 'default',
  monthly_attendance_target: 100,
  min_resolution_rate: 80,
  avg_response_time_target: 15,
  auto_categorization_target: 80,
  min_satisfaction_target: 85,
  created: '',
  updated: '',
}

/**
 * Busca o registro único de meta global.
 * Caso ainda não exista (estado inicial), retorna um padrão em memória.
 */
export const getGlobalTarget = async (): Promise<GlobalTargetRecord> => {
  try {
    const list = await pb
      .collection('global_targets')
      .getFullList<GlobalTargetRecord>({ sort: 'created', expand: 'updated_by' })
    if (list && list.length > 0) return list[0]
    return { ...DEFAULT_GLOBAL_TARGET }
  } catch (error) {
    console.error('Error fetching global target:', error)
    return { ...DEFAULT_GLOBAL_TARGET }
  }
}

/** Cria o registro único de meta global (quando ainda não existe). */
export const createGlobalTarget = async (
  data: Partial<GlobalTargetRecord>,
): Promise<GlobalTargetRecord> => {
  return await pb.collection('global_targets').create<GlobalTargetRecord>(data)
}

/** Atualiza o registro de meta global existente. */
export const updateGlobalTarget = async (
  id: string,
  data: Partial<GlobalTargetRecord>,
): Promise<GlobalTargetRecord> => {
  return await pb.collection('global_targets').update<GlobalTargetRecord>(id, data)
}

/** Cria ou atualiza a meta global (singleton), garantindo que exista sempre no máximo um registro. */
export const saveGlobalTarget = async (
  data: Partial<GlobalTargetRecord>,
  current?: GlobalTargetRecord | null,
): Promise<GlobalTargetRecord> => {
  const payload: Partial<GlobalTargetRecord> = {
    monthly_attendance_target:
      data.monthly_attendance_target != null ? Math.round(data.monthly_attendance_target) : 100,
    min_resolution_rate:
      data.min_resolution_rate != null ? Math.round(data.min_resolution_rate) : 80,
    avg_response_time_target:
      data.avg_response_time_target != null ? Math.round(data.avg_response_time_target) : 15,
    auto_categorization_target:
      data.auto_categorization_target != null ? Math.round(data.auto_categorization_target) : 80,
    min_satisfaction_target:
      data.min_satisfaction_target != null ? Math.round(data.min_satisfaction_target) : 85,
    updated_by: pb.authStore.record?.id || '',
  }
  if (current && current.id && current.id !== 'default') {
    return await updateGlobalTarget(current.id, payload)
  }
  return await createGlobalTarget(payload)
}
