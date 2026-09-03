import pb from '@/lib/pocketbase/client'
import type { MetaSnapshotRecord } from '@/types/meta_snapshot'

export interface FreezeSnapshotsResponse {
  success: boolean
  result: {
    monthYear: string
    periodLabel: string
    totalEligible: number
    created: number
    updated: number
  }
}

/**
 * Busca snapshots mensais de um colaborador específico ou todos aos quais o usuário tem acesso.
 */
export async function getMetaSnapshots(userId?: string): Promise<MetaSnapshotRecord[]> {
  try {
    const filter = userId ? `user_id = '${userId}'` : ''
    const records = await pb.collection('meta_snapshots').getFullList<MetaSnapshotRecord>({
      filter: filter || undefined,
      sort: '-year,-month',
    })
    return records
  } catch (err) {
    console.warn('Aviso: Falha ao carregar meta_snapshots:', err)
    return []
  }
}

/**
 * Busca os snapshots de uma competência (ex: "2026-08").
 */
export async function getMetaSnapshotsByMonthYear(
  monthYear: string,
): Promise<MetaSnapshotRecord[]> {
  try {
    const records = await pb.collection('meta_snapshots').getFullList<MetaSnapshotRecord>({
      filter: `month_year = '${monthYear}'`,
      sort: 'user_name',
    })
    return records
  } catch (err) {
    console.warn(`Aviso: Falha ao carregar meta_snapshots para ${monthYear}:`, err)
    return []
  }
}

/**
 * Dispara congelamento manual de snapshots para uma competência (mês/ano) via endpoint de backend.
 */
export async function triggerFreezeSnapshots(
  year?: number,
  month?: number,
): Promise<FreezeSnapshotsResponse> {
  const token = pb.authStore.token
  const baseUrl = pb.baseUrl || ''

  const resp = await fetch(`${baseUrl}/backend/v1/meta-snapshots/freeze`, {
    method: 'POST',
    headers: {
      'Content-Type': 'application/json',
      Authorization: `Bearer ${token}`,
    },
    body: JSON.stringify({ year, month }),
  })

  if (!resp.ok) {
    const data = await resp.json().catch(() => ({}))
    throw new Error(data.error || 'Erro ao congelar snapshots de metas.')
  }

  return await resp.json()
}
