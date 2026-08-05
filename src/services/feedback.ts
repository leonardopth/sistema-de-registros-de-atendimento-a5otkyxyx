import pb from '@/lib/pocketbase/client'
import type { FeedbackRecord, FeedbackCategory } from '@/types/training'

export const createFeedback = (message: string, category: FeedbackCategory) =>
  pb.collection('feedback').create<FeedbackRecord>({
    message,
    category,
    user_id: pb.authStore.record?.id,
  })

export const getFeedbacks = () =>
  pb.collection('feedback').getFullList<FeedbackRecord>({
    sort: '-created',
    expand: 'user_id',
  })
