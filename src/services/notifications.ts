import pb from '@/lib/pocketbase/client'
import { NotificationRecord } from '@/types/service_record'

export async function getNotifications(): Promise<NotificationRecord[]> {
  if (!pb.authStore.record?.id) return []
  try {
    return await pb.collection('notifications').getFullList<NotificationRecord>({
      filter: `user_id = "${pb.authStore.record.id}"`,
      sort: '-created',
    })
  } catch (error) {
    console.error('Error fetching notifications:', error)
    return []
  }
}

export async function createNotification(data: {
  user_id: string
  title: string
  message: string
  type?: 'info' | 'success' | 'warning' | 'error' | 'approval' | 'report' | 'alert'
  link?: string
}) {
  return pb.collection('notifications').create({
    read: false,
    resolved: false,
    ...data,
  })
}

export async function markNotificationRead(id: string) {
  return pb.collection('notifications').update(id, { read: true })
}

export async function markAllNotificationsRead() {
  if (!pb.authStore.record?.id) return
  const list = await getNotifications()
  const unread = list.filter((n) => !n.read)
  await Promise.all(unread.map((n) => pb.collection('notifications').update(n.id, { read: true })))
}

export async function deleteNotification(id: string) {
  return pb.collection('notifications').delete(id)
}

export async function markNotificationResolved(id: string) {
  return pb.collection('notifications').update(id, { resolved: true, read: true })
}
