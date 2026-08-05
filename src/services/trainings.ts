import pb from '@/lib/pocketbase/client'
import type { TrainingRecord } from '@/types/training'

export const getTrainings = (filter?: string) => {
  const params: { sort: string; filter?: string; expand: string } = {
    sort: '-training_date',
    expand: 'client,created_by',
  }
  if (filter) params.filter = filter
  return pb.collection('trainings').getFullList<TrainingRecord>(params)
}

export const getTraining = (id: string) =>
  pb.collection('trainings').getOne<TrainingRecord>(id, { expand: 'client,created_by' })

export const createTraining = (data: Partial<TrainingRecord>) =>
  pb.collection('trainings').create<TrainingRecord>({
    ...data,
    created_by: pb.authStore.record?.id,
  })

export const updateTraining = (id: string, data: Partial<TrainingRecord>) =>
  pb.collection('trainings').update<TrainingRecord>(id, data)

export const deleteTraining = (id: string) => pb.collection('trainings').delete(id)
