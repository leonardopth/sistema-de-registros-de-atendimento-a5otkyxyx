import { getGMT3DayRange } from '@/lib/timezone'

export function getLocalDayRange(date: Date = new Date()): { start: Date; end: Date } {
  return getGMT3DayRange(date)
}

export function isCreatedToday(created: string | undefined): boolean {
  if (!created) return false
  const createdDate = new Date(created)
  if (isNaN(createdDate.getTime())) return false
  const { start, end } = getGMT3DayRange()
  return createdDate >= start && createdDate <= end
}

export function isCreatedInRange(
  created: string | undefined,
  startStr: string | undefined,
  endStr: string | undefined,
): boolean {
  if (!created) return false
  const createdDate = new Date(created)
  if (isNaN(createdDate.getTime())) return false
  if (startStr) {
    const [sy, sm, sd] = startStr.split('-').map(Number)
    const start = new Date(Date.UTC(sy, sm - 1, sd, 3, 0, 0, 0))
    if (createdDate < start) return false
  }
  if (endStr) {
    const [ey, em, ed] = endStr.split('-').map(Number)
    const end = new Date(Date.UTC(ey, em - 1, ed, 3, 0, 0, 0) + 24 * 60 * 60 * 1000 - 1)
    if (createdDate > end) return false
  }
  return true
}
