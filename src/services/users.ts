import pb from '@/lib/pocketbase/client'
import { UserRecord } from '@/types/service_record'

export const getUsers = () => {
  return pb.collection('users').getFullList<UserRecord>({
    sort: 'name',
  })
}

export const getUser = (id: string) => {
  return pb.collection('users').getOne<UserRecord>(id)
}
