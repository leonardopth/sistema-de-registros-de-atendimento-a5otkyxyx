import pb from '@/lib/pocketbase/client'
import type { NotificationRecord, NotificationType } from '@/types/service_record'

export async function createNotification(data: {
  user_id: string
  title: string
  message: string
  type: NotificationType
  link?: string
}) {
  return await pb.collection('notifications').create({
    user_id: data.user_id,
    title: data.title,
    message: data.message,
    type: data.type,
    read: false,
    link: data.link || '',
  })
}

export async function getUserNotifications(userId: string): Promise<NotificationRecord[]> {
  return await pb.collection('notifications').getFullList<NotificationRecord>({
    filter: `user_id = "${userId}"`,
    sort: '-created',
  })
}

export async function markNotificationAsRead(id: string) {
  return await pb.collection('notifications').update(id, { read: true })
}
