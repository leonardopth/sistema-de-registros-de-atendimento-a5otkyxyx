export const TIMEZONE = 'America/Sao_Paulo'
const GMT3_OFFSET_MS = 3 * 60 * 60 * 1000

export function getGMT3DateString(isoString: string | undefined): string {
  if (!isoString) return ''
  const date = new Date(isoString)
  if (isNaN(date.getTime())) return ''
  return new Date(date.getTime() - GMT3_OFFSET_MS).toISOString().substring(0, 10)
}

function getGMT3Parts(isoString: string | undefined): Intl.DateTimeFormatPart[] | null {
  if (!isoString) return null
  const d = new Date(isoString)
  if (isNaN(d.getTime())) return null
  return new Intl.DateTimeFormat('en-CA', {
    timeZone: TIMEZONE,
    year: 'numeric',
    month: '2-digit',
    day: '2-digit',
    hour: '2-digit',
    minute: '2-digit',
    hour12: false,
  }).formatToParts(d)
}

function partVal(parts: Intl.DateTimeFormatPart[], type: string): string {
  return parts.find((p) => p.type === type)?.value || ''
}

export function formatGMT3DateTime(isoString: string | undefined): string {
  const parts = getGMT3Parts(isoString)
  if (!parts) return ''
  return `${partVal(parts, 'day')}/${partVal(parts, 'month')}/${partVal(parts, 'year')} ${partVal(parts, 'hour')}:${partVal(parts, 'minute')}`
}

export function formatGMT3Date(isoString: string | undefined): string {
  const parts = getGMT3Parts(isoString)
  if (!parts) return ''
  return `${partVal(parts, 'day')}/${partVal(parts, 'month')}/${partVal(parts, 'year')}`
}

export function formatGMT3DateTimeAt(isoString: string | undefined): string {
  const parts = getGMT3Parts(isoString)
  if (!parts) return ''
  return `${partVal(parts, 'day')}/${partVal(parts, 'month')}/${partVal(parts, 'year')} às ${partVal(parts, 'hour')}:${partVal(parts, 'minute')}`
}

export function getGMT3DayRange(date: Date = new Date()): { start: Date; end: Date } {
  const parts = new Intl.DateTimeFormat('en-CA', {
    timeZone: TIMEZONE,
    year: 'numeric',
    month: '2-digit',
    day: '2-digit',
  }).formatToParts(date)
  const get = (t: string) => parseInt(parts.find((p) => p.type === t)?.value || '0', 10)
  const y = get('year')
  const m = get('month')
  const d = get('day')
  const start = new Date(Date.UTC(y, m - 1, d, 3, 0, 0, 0))
  const end = new Date(start.getTime() + 24 * 60 * 60 * 1000 - 1)
  return { start, end }
}
