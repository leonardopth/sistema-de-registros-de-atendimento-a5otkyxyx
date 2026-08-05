import pb from '@/lib/pocketbase/client'
import { AccountExecutiveRecord } from '@/types/service_record'

export const getAccountExecutives = () => {
  return pb.collection('account_executives').getFullList<AccountExecutiveRecord>({ sort: 'name' })
}

export const getAccountExecutive = (id: string) => {
  return pb.collection('account_executives').getOne<AccountExecutiveRecord>(id)
}

export const createAccountExecutive = (data: Partial<AccountExecutiveRecord>) => {
  return pb.collection('account_executives').create<AccountExecutiveRecord>(data)
}

export const updateAccountExecutive = (id: string, data: Partial<AccountExecutiveRecord>) => {
  return pb.collection('account_executives').update<AccountExecutiveRecord>(id, data)
}

export const deleteAccountExecutive = (id: string) => {
  return pb.collection('account_executives').delete(id)
}
