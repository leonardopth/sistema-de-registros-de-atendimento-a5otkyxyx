import pb from '@/lib/pocketbase/client'
import { createAuditLog } from '@/services/audit-log'
import type { UserRecord } from '@/types/service_record'

export async function getUsers(): Promise<UserRecord[]> {
  try {
    const customUsers = await pb.send<UserRecord[]>('/backend/v1/users-with-emails', {
      method: 'GET',
    })
    if (Array.isArray(customUsers) && customUsers.length > 0) {
      return customUsers
    }
  } catch (err) {
    console.warn('Fallback to SDK list for users:', err)
  }
  return await pb.collection('users').getFullList<UserRecord>({
    sort: 'name',
  })
}

export async function getUsersWithEmails(): Promise<UserRecord[]> {
  return getUsers()
}

export async function getUser(id: string): Promise<UserRecord> {
  return await pb.collection('users').getOne<UserRecord>(id)
}

export async function updateUser(id: string, data: Partial<UserRecord>) {
  const updated = await pb.collection('users').update(id, data)
  try {
    await createAuditLog({
      action: 'Updated User',
      entity: 'users',
      entity_id: id,
      details: data as Record<string, unknown>,
    })
  } catch (e) {
    console.error('Audit log user update error:', e)
  }
  return updated
}

export async function toggleMasterAccess(userId: string, masterAccess: boolean) {
  const updated = await pb.send(`/backend/v1/users/${userId}/master-access`, {
    method: 'PATCH',
    body: JSON.stringify({ master_access: masterAccess }),
    headers: { 'Content-Type': 'application/json' },
  })
  try {
    await createAuditLog({
      action: masterAccess ? 'Granted Master Access' : 'Revoked Master Access',
      entity: 'users',
      entity_id: userId,
      details: { master_access: masterAccess },
    })
  } catch (e) {
    console.error('Audit log master access error:', e)
  }
  return updated
}

export async function approveUser(userId: string, approvedById: string, approvedByName: string) {
  const updated = await pb.collection('users').update(userId, {
    approval_status: 'Aprovado',
    approved_by_id: approvedById,
    approved_by: approvedByName,
    approved_at: new Date().toISOString(),
  })
  try {
    await createAuditLog({
      action: 'Approved User',
      entity: 'users',
      entity_id: userId,
      details: { approval_status: 'Aprovado', approved_by: approvedByName },
    })
  } catch (e) {
    console.error('Audit log approve user error:', e)
  }
  return updated
}

export async function rejectUser(userId: string) {
  const updated = await pb.collection('users').update(userId, {
    approval_status: 'Rejeitado',
  })
  try {
    await createAuditLog({
      action: 'Rejected User',
      entity: 'users',
      entity_id: userId,
      details: { approval_status: 'Rejeitado' },
    })
  } catch (e) {
    console.error('Audit log reject user error:', e)
  }
  return updated
}

export async function updateTelegramSettings(userId: string, telegramId: string, alerts: boolean) {
  return await pb.collection('users').update(userId, {
    telegram_id: telegramId,
    telegram_alerts: alerts,
  })
}

export async function updateEmailNotifications(userId: string, enabled: boolean) {
  return await pb.collection('users').update(userId, {
    email_notifications: enabled,
  })
}

export async function deleteUser(id: string) {
  try {
    await createAuditLog({
      action: 'Deleted User',
      entity: 'users',
      entity_id: id,
    })
  } catch (e) {
    console.error('Audit log delete user error:', e)
  }
  return await pb.collection('users').delete(id)
}

export async function testTelegram(userId: string) {
  return await pb.send('/backend/v1/telegram-test', {
    method: 'POST',
    body: JSON.stringify({ userId }),
  })
}

export async function updateUserEmail(userId: string, email: string) {
  return await pb.send(`/backend/v1/users/${userId}/email`, {
    method: 'PATCH',
    body: JSON.stringify({ email }),
    headers: { 'Content-Type': 'application/json' },
  })
}

export async function resetUserPassword(userId: string, password: string) {
  try {
    const res = await pb.send(`/backend/v1/users/${userId}/reset-password`, {
      method: 'POST',
      body: JSON.stringify({ password }),
      headers: { 'Content-Type': 'application/json' },
    })
    try {
      await createAuditLog({
        action: 'Reset User Password',
        entity: 'users',
        entity_id: userId,
        details: { reset_by_master: true },
      })
    } catch (e) {
      console.error('Audit log reset password error:', e)
    }
    return res
  } catch (err) {
    // Fallback: try client-side update with password/passwordConfirm
    const updated = await pb.collection('users').update(userId, {
      password,
      passwordConfirm: password,
    })
    try {
      await createAuditLog({
        action: 'Reset User Password (client)',
        entity: 'users',
        entity_id: userId,
        details: { reset_by_master: true },
      })
    } catch (e) {
      console.error('Audit log reset password error:', e)
    }
    return updated
  }
}

export async function updateUserServiceGroups(userId: string, serviceGroups: string[]) {
  return await pb.collection('users').update(userId, { service_groups: serviceGroups })
}

export async function updateUserBases(userId: string, bases: string[]) {
  return await pb.collection('users').update(userId, { bases })
}

export async function updateUserDepartments(userId: string, departments: string[]) {
  return await pb.collection('users').update(userId, { departments })
}
