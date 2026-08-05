import pb from '@/lib/pocketbase/client'
import { NotificationRecord } from '@/types/service_record'

export const getNotifications = () =>
  pb.collection('notifications').getFullList<NotificationRecord>({
    sort: '-created',
    limit: 50,
  })

export const markNotificationRead = (id: string) =>
  pb.collection('notifications').update(id, { read: true })

export const markAllNotificationsRead = async () => {
  const unread = await pb.collection('notifications').getFullList<NotificationRecord>({
    filter: 'read = false',
  })
  await Promise.all(unread.map((n) => pb.collection('notifications').update(n.id, { read: true })))
}

export const deleteNotification = (id: string) => pb.collection('notifications').delete(id)
