import pb from '@/lib/pocketbase/client'
import { ScheduledReportRecord } from '@/types/service_record'

export const getScheduledReports = () =>
  pb.collection('scheduled_reports').getFullList<ScheduledReportRecord>({
    sort: '-created',
  })

export const createScheduledReport = (data: {
  user_id: string
  frequency: string
  email: string
  format: string
  active: boolean
}) => pb.collection('scheduled_reports').create(data)

export const updateScheduledReport = (id: string, data: Partial<ScheduledReportRecord>) =>
  pb.collection('scheduled_reports').update(id, data)

export const deleteScheduledReport = (id: string) => pb.collection('scheduled_reports').delete(id)

export const sendReportEmail = (email: string) =>
  pb.send('/backend/v1/reports/export-email', {
    method: 'POST',
    body: JSON.stringify({ email }),
    headers: { 'Content-Type': 'application/json' },
  })
