import pb from '@/lib/pocketbase/client'
import { UserRecord, ApprovalStatus, UserRole } from '@/types/service_record'

export const getUsers = () => {
  return pb.collection('users').getFullList<UserRecord>({
    sort: 'name',
  })
}

export const getUser = (id: string) => {
  return pb.collection('users').getOne<UserRecord>(id)
}

export const updateUser = (
  id: string,
  data: Partial<
    Pick<UserRecord, 'name' | 'role' | 'approval_status' | 'telegram_id' | 'telegram_alerts'>
  >,
) => {
  return pb.collection('users').update<UserRecord>(id, data)
}

export const approveUser = (id: string) => updateUser(id, { approval_status: 'Aprovado' })

export const rejectUser = (id: string) => updateUser(id, { approval_status: 'Rejeitado' })

export const updateTelegramSettings = (id: string, telegram_id: string, telegram_alerts: boolean) =>
  pb.collection('users').update<UserRecord>(id, { telegram_id, telegram_alerts })

export const testTelegram = () => pb.send('/backend/v1/telegram/test', { method: 'POST' })
