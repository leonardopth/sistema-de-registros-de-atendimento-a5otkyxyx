export function getLocalDayRange(date: Date = new Date()): { start: Date; end: Date } {
  const start = new Date(date.getFullYear(), date.getMonth(), date.getDate(), 0, 0, 0, 0)
  const end = new Date(date.getFullYear(), date.getMonth(), date.getDate(), 23, 59, 59, 999)
  return { start, end }
}

export function isCreatedToday(created: string | undefined): boolean {
  if (!created) return false
  const createdDate = new Date(created)
  if (isNaN(createdDate.getTime())) return false
  const { start, end } = getLocalDayRange()
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
    const start = new Date(startStr + 'T00:00:00')
    if (createdDate < start) return false
  }
  if (endStr) {
    const end = new Date(endStr + 'T23:59:59.999')
    if (createdDate > end) return false
  }
  return true
}
