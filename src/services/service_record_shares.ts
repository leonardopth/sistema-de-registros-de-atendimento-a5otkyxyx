import pb from '@/lib/pocketbase/client'
import { createNotification } from '@/services/notifications'
import { createAuditLog } from '@/services/audit-log'
import type { ServiceRecordShare } from '@/types/service_record'

export async function getSharesByRecord(recordId: string): Promise<ServiceRecordShare[]> {
  return await pb.collection('service_record_shares').getFullList<ServiceRecordShare>({
    filter: `service_record = "${recordId}"`,
    expand: 'user,shared_by',
  })
}

export async function getSharesByUser(userId: string): Promise<ServiceRecordShare[]> {
  return await pb.collection('service_record_shares').getFullList<ServiceRecordShare>({
    filter: `user = "${userId}"`,
    expand: 'service_record',
  })
}

export async function createShare(data: {
  service_record: string
  user: string
  shared_by: string
  permission: 'Visualizar' | 'Editar'
}) {
  const share = await pb.collection('service_record_shares').create(data)

  try {
    const sharerName = pb.authStore.record?.name || 'Um colaborador'
    await createNotification({
      user_id: data.user,
      title: 'Novo Atendimento Compartilhado',
      message: `${sharerName} compartilhou um atendimento com você.`,
      type: 'info',
      link: '/atendimentos',
    })
  } catch (err) {
    console.error('Error creating share notification:', err)
  }

  try {
    await createAuditLog({
      user: data.shared_by || pb.authStore.record?.id,
      action: 'Granted Share',
      entity: 'service_record_shares',
      entity_id: share.id,
      details: {
        service_record: data.service_record,
        shared_with: data.user,
        permission: data.permission,
      },
    })
  } catch (err) {
    console.error('Error creating share audit log:', err)
  }

  return share
}

export async function updateSharePermission(shareId: string, permission: 'Visualizar' | 'Editar') {
  const updated = await pb.collection('service_record_shares').update(shareId, { permission })

  try {
    await createAuditLog({
      action: 'Updated Share Permission',
      entity: 'service_record_shares',
      entity_id: shareId,
      details: { permission },
    })
  } catch (err) {
    console.error('Error logging share update:', err)
  }

  return updated
}

export async function deleteShare(shareId: string) {
  try {
    const share = await pb.collection('service_record_shares').getOne(shareId)
    await pb.collection('service_record_shares').delete(shareId)

    await createAuditLog({
      action: 'Revoked Share',
      entity: 'service_record_shares',
      entity_id: shareId,
      details: {
        service_record: share.service_record,
        user: share.user,
      },
    })
  } catch (err) {
    console.error('Error deleting share:', err)
    throw err
  }
}
