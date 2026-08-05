import pb from '@/lib/pocketbase/client'
import { FeedbackRecord } from '@/types/service_record'

export const getFeedback = () =>
  pb.collection('feedback').getFullList<FeedbackRecord>({
    sort: '-created',
    expand: 'user_id',
  })

export const createFeedback = (data: { message: string; category: string; user_id: string }) =>
  pb.collection('feedback').create(data)

export const deleteFeedback = (id: string) => pb.collection('feedback').delete(id)
