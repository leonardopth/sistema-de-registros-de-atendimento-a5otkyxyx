import pb from '@/lib/pocketbase/client'
import { FeedbackRecord } from '@/types/service_record'

export const getFeedback = () =>
  pb.collection('feedback').getFullList<FeedbackRecord>({
    sort: '-created',
    expand: 'user_id',
  })

export const createFeedback = (
  dataOrMessage: { message: string; category: string; user_id?: string } | string,
  category?: string,
  userId?: string,
) => {
  if (typeof dataOrMessage === 'string') {
    const currentUserId = pb.authStore.model?.id || ''
    return pb.collection('feedback').create({
      message: dataOrMessage,
      category: category || 'Sugestão',
      user_id: userId || currentUserId,
    })
  }
  return pb.collection('feedback').create({
    user_id: dataOrMessage.user_id || pb.authStore.model?.id || '',
    ...dataOrMessage,
  })
}

export const deleteFeedback = (id: string) => pb.collection('feedback').delete(id)
