import pb from '@/lib/pocketbase/client'
import type { MasterAccessHistory } from '@/types/master-access-history'

export const getMasterAccessHistory = () => {
  return pb.collection('master_access_history').getFullList<MasterAccessHistory>({
    sort: '-created',
    expand: 'user,actioned_by',
  })
}
