import pb from '@/lib/pocketbase/client'
import { UserRecord, ApprovalStatus, UserRole } from '@/types/service_record'
import { extractFieldErrors, type FieldErrors } from '@/lib/pocketbase/errors'

export { extractFieldErrors, type FieldErrors }

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
    Pick<
      UserRecord,
      | 'name'
      | 'email'
      | 'role'
      | 'approval_status'
      | 'telegram_id'
      | 'telegram_alerts'
      | 'service_groups'
    >
  >,
) => {
  return pb.collection('users').update<UserRecord>(id, data)
}

export const approveUser = (id: string) => updateUser(id, { approval_status: 'Aprovado' })

export const rejectUser = (id: string) => updateUser(id, { approval_status: 'Rejeitado' })

export const updateTelegramSettings = (id: string, telegram_id: string, telegram_alerts: boolean) =>
  pb.collection('users').update<UserRecord>(id, { telegram_id, telegram_alerts })

export const deleteUser = (id: string) => pb.collection('users').delete(id)

export const testTelegram = () => pb.send('/backend/v1/telegram/test', { method: 'POST' })
