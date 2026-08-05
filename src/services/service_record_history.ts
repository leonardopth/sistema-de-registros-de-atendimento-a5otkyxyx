import pb from '@/lib/pocketbase/client'
import { ServiceRecordHistory } from '@/types/service_record'

export const getHistoryByServiceRecord = (serviceRecordId: string) =>
  pb.collection('service_record_history').getFullList<ServiceRecordHistory>({
    filter: `service_record = "${serviceRecordId}"`,
    sort: '-created',
    expand: 'user',
  })

export const createHistoryEntry = (data: Partial<ServiceRecordHistory>) =>
  pb.collection('service_record_history').create<ServiceRecordHistory>(data)
