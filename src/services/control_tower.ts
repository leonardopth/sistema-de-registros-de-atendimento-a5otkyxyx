import pb from '@/lib/pocketbase/client'
import {
  ControlTowerEmailRecord,
  ControlTowerConfigRecord,
  ControlTowerStatus,
} from '@/types/control_tower'

export const DEFAULT_CONTROL_TOWER_CONFIG: Omit<
  ControlTowerConfigRecord,
  'id' | 'created' | 'updated'
> = {
  weight_departure_24h: 50,
  weight_departure_48h: 30,
  weight_cancellation: 35,
  weight_priority_client: 25,
  weight_per_hour_inbox: 5,
  weight_promised_deadline: 20,
  weight_formal_complaint: 40,
  weight_repeat_contact: 15,
  weight_persistent_client: 20,
  score_threshold_p1: 60,
  score_threshold_p2: 30,
  business_hours_start: '08:00',
  business_hours_end: '18:00',
  business_days: [1, 2, 3, 4, 5],
  target_sla_p1_hours: 2,
  target_sla_p2_hours: 4,
  target_sla_p3_hours: 8,
}

export async function getControlTowerEmails(onlyRoots = false): Promise<ControlTowerEmailRecord[]> {
  try {
    const filter = onlyRoots ? 'is_thread_child != true' : ''
    const list = await pb.collection('control_tower_emails').getFullList<ControlTowerEmailRecord>({
      filter: filter || undefined,
      sort: '-score,-last_message_at,-received_at',
      expand: 'client,assigned_to,thread_root',
    })
    return Array.isArray(list) ? list : []
  } catch (error) {
    console.error('Error fetching control tower emails:', error)
    return []
  }
}

export async function getThreadMessages(threadId: string): Promise<ControlTowerEmailRecord[]> {
  try {
    if (!threadId) return []
    const res = await pb.send<{
      thread_id: string
      count: number
      messages: ControlTowerEmailRecord[]
    }>(`/backend/v1/control-tower/threads/${encodeURIComponent(threadId)}`, { method: 'GET' })
    if (res && Array.isArray(res.messages)) {
      return res.messages
    }
    // Fallback caso a rota retorne vazio: busca direta via PocketBase SDK
    const fallbackList = await pb
      .collection('control_tower_emails')
      .getFullList<ControlTowerEmailRecord>({
        filter: `thread_id = '${threadId}' || id = '${threadId}'`,
        sort: 'received_at,created',
        expand: 'client,assigned_to',
      })
    return Array.isArray(fallbackList) ? fallbackList : []
  } catch (error) {
    console.error(`Error fetching thread messages for ${threadId}:`, error)
    try {
      const fallbackList = await pb
        .collection('control_tower_emails')
        .getFullList<ControlTowerEmailRecord>({
          filter: `thread_id = '${threadId}' || id = '${threadId}'`,
          sort: 'received_at,created',
          expand: 'client,assigned_to',
        })
      return Array.isArray(fallbackList) ? fallbackList : []
    } catch (_) {
      return []
    }
  }
}

export async function getControlTowerEmail(id: string): Promise<ControlTowerEmailRecord | null> {
  try {
    if (!id) return null
    return await pb.collection('control_tower_emails').getOne<ControlTowerEmailRecord>(id, {
      expand: 'client,assigned_to',
    })
  } catch (error) {
    console.error(`Error fetching control tower email ${id}:`, error)
    return null
  }
}

export async function updateControlTowerEmailStatus(
  id: string,
  status: ControlTowerStatus,
): Promise<ControlTowerEmailRecord> {
  return await pb.collection('control_tower_emails').update<ControlTowerEmailRecord>(id, {
    status,
  })
}

export async function assignControlTowerEmail(
  emailId: string,
  userId?: string,
): Promise<{ success: boolean; record_id: string; assigned_to: string; status: string }> {
  return await pb.send('/backend/v1/control-tower/assign', {
    method: 'POST',
    body: JSON.stringify({ email_id: emailId, user_id: userId }),
    headers: { 'Content-Type': 'application/json' },
  })
}

export async function recalculateControlTowerScores(): Promise<{
  success: boolean
  updated_count: number
  message: string
}> {
  return await pb.send('/backend/v1/control-tower/recalculate', {
    method: 'POST',
  })
}

export async function ingestLogsToControlTower(limit = 50): Promise<{
  success: boolean
  processed: number
  skipped: number
  message: string
}> {
  return await pb.send('/backend/v1/control-tower/ingest-from-logs', {
    method: 'POST',
    body: JSON.stringify({ limit }),
    headers: { 'Content-Type': 'application/json' },
  })
}

export async function getControlTowerConfig(): Promise<ControlTowerConfigRecord | null> {
  try {
    const list = await pb
      .collection('control_tower_configs')
      .getFullList<ControlTowerConfigRecord>({
        sort: '-created',
        limit: 1,
        expand: 'updated_by',
      })
    if (list && list.length > 0) {
      return list[0]
    }
    return null
  } catch (error) {
    console.error('Error fetching control tower config:', error)
    return null
  }
}

export async function updateControlTowerConfig(
  id: string,
  data: Partial<ControlTowerConfigRecord>,
): Promise<ControlTowerConfigRecord> {
  return await pb.collection('control_tower_configs').update<ControlTowerConfigRecord>(id, data)
}

export async function createControlTowerEmail(
  data: Partial<ControlTowerEmailRecord>,
): Promise<ControlTowerEmailRecord> {
  return await pb.collection('control_tower_emails').create<ControlTowerEmailRecord>(data)
}
