import pb from '@/lib/pocketbase/client'
import { ServiceRecordShare } from '@/types/service_record'

export const getSharesByRecord = (recordId: string) =>
  pb.collection('service_record_shares').getFullList<ServiceRecordShare>({
    filter: `service_record = "${recordId}"`,
    expand: 'user,shared_by',
    sort: '-created',
  })

export const getSharesByUser = (userId: string) =>
  pb.collection('service_record_shares').getFullList<ServiceRecordShare>({
    filter: `user = "${userId}"`,
    expand: 'service_record,user,shared_by',
    sort: '-created',
  })

export const createShare = (data: Partial<ServiceRecordShare>) =>
  pb.collection('service_record_shares').create<ServiceRecordShare>(data)

export const updateSharePermission = (id: string, permission: string) =>
  pb.collection('service_record_shares').update<ServiceRecordShare>(id, { permission })

export const deleteShare = (id: string) => pb.collection('service_record_shares').delete(id)
