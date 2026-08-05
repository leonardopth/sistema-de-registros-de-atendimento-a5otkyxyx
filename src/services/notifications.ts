import pb from '@/lib/pocketbase/client'
import { NotificationRecord } from '@/types/service_record'

export const getNotifications = (filter?: 'all' | 'pending' | 'resolved') => {
  const params: { sort: string; limit: number; filter?: string } = {
    sort: '-created',
    limit: 50,
  }
  if (filter === 'pending') params.filter = 'resolved != true'
  else if (filter === 'resolved') params.filter = 'resolved = true'
  return pb.collection('notifications').getFullList<NotificationRecord>(params)
}

export const markNotificationRead = (id: string) =>
  pb.collection('notifications').update(id, { read: true })

export const markNotificationResolved = (id: string) =>
  pb.collection('notifications').update(id, { resolved: true })

export const markAllNotificationsRead = async () => {
  const unread = await pb.collection('notifications').getFullList<NotificationRecord>({
    filter: 'read = false',
  })
  await Promise.all(unread.map((n) => pb.collection('notifications').update(n.id, { read: true })))
}

export const deleteNotification = (id: string) => pb.collection('notifications').delete(id)
