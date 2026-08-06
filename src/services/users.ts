import pb from '@/lib/pocketbase/client'
import { UserRecord, ApprovalStatus, UserRole } from '@/types/service_record'
import { extractFieldErrors, type FieldErrors } from '@/lib/pocketbase/errors'

export { extractFieldErrors, type FieldErrors }

export const getUsers = () => {
  return pb.collection('users').getFullList<UserRecord>({
    sort: 'name',
  })
}

export const getUsersWithEmails = () => {
  return pb.send('/backend/v1/users-with-emails', { method: 'GET' }) as Promise<UserRecord[]>
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
      | 'master_access'
    >
  >,
) => {
  return pb.collection('users').update<UserRecord>(id, data)
}

export const toggleMasterAccess = (id: string, master_access: boolean) =>
  pb.collection('users').update<UserRecord>(id, { master_access })

export const approveUser = (id: string) => updateUser(id, { approval_status: 'Aprovado' })

export const rejectUser = (id: string) => updateUser(id, { approval_status: 'Rejeitado' })

export const updateTelegramSettings = (id: string, telegram_id: string, telegram_alerts: boolean) =>
  pb.collection('users').update<UserRecord>(id, { telegram_id, telegram_alerts })

export const deleteUser = (id: string) => pb.collection('users').delete(id)

export const testTelegram = () => pb.send('/backend/v1/telegram/test', { method: 'POST' })

export const updateUserEmail = (id: string, email: string) =>
  pb.send(`/backend/v1/users/${id}/email`, {
    method: 'PATCH',
    body: JSON.stringify({ email }),
    headers: { 'Content-Type': 'application/json' },
  })

export const updateUserServiceGroups = (id: string, service_groups: string[]) =>
  pb.send(`/backend/v1/users/${id}/service-groups`, {
    method: 'PATCH',
    body: JSON.stringify({ service_groups }),
    headers: { 'Content-Type': 'application/json' },
  })

export const updateUserBases = (id: string, bases: string[]) =>
  pb.send(`/backend/v1/users/${id}/bases`, {
    method: 'PATCH',
    body: JSON.stringify({ bases }),
    headers: { 'Content-Type': 'application/json' },
  })
