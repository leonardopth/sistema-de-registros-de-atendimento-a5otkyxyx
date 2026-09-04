import pb from '@/lib/pocketbase/client'

export interface CsatRecordResponse {
  id?: string
  service_record_id?: string
  token: string
  client_name?: string
  service_id?: string
  contact_reason?: string
  rating?: number
  already_responded?: boolean
  current_rating?: number
  comment?: string
  responded_at?: string
  created?: string
}

export interface CsatStatItem {
  id: string
  service_record_id: string
  token: string
  rating: number
  comment?: string
  responded_at: string
  created: string
  assigned_user?: string
  user_id?: string
  contact_reason?: string
  record_created?: string
}

export async function getCsatPublicByToken(token: string): Promise<CsatRecordResponse> {
  const res = await pb.send<CsatRecordResponse>(`/api/csat/public/${encodeURIComponent(token)}`, {
    method: 'GET',
  })
  return res
}

export async function submitCsatResponse(
  token: string,
  rating: number,
  comment?: string,
): Promise<{ success: boolean; message: string; rating: number }> {
  const res = await pb.send<{ success: boolean; message: string; rating: number }>(
    '/api/csat/public/submit',
    {
      method: 'POST',
      body: { token, rating, comment },
    },
  )
  return res
}

export async function getCsatByRecordId(recordId: string): Promise<CsatRecordResponse> {
  const res = await pb.send<CsatRecordResponse>(
    `/api/csat/record/${encodeURIComponent(recordId)}`,
    {
      method: 'GET',
    },
  )
  return res
}

export async function getCsatStats(): Promise<CsatStatItem[]> {
  try {
    const res = await pb.send<{ items: CsatStatItem[] }>('/api/csat/stats', {
      method: 'GET',
    })
    return res.items || []
  } catch (err) {
    console.error('Erro ao buscar estatísticas de CSAT:', err)
    return []
  }
}
