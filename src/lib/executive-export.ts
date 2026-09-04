import type { ServiceRecord } from '@/types/service_record'

const HEADERS = [
  'Cliente',
  'Agente',
  'Executivo de Contas',
  'Motivo do Contato',
  'Contato Evitável',
  'Motivo do Evitável',
  'Explicação',
  'Status',
  'Prioridade',
  'Duração (min)',
  'Canal',
  'Criado em',
]

function escapeCsv(value: string): string {
  return `"${value.replace(/"/g, '""')}"`
}

function formatDate(dateStr?: string): string {
  if (!dateStr) return ''
  try {
    const d = new Date(dateStr)
    if (isNaN(d.getTime())) return ''
    const p = (n: number) => String(n).padStart(2, '0')
    return `${p(d.getDate())}/${p(d.getMonth() + 1)}/${d.getFullYear()} ${p(d.getHours())}:${p(d.getMinutes())}`
  } catch {
    return ''
  }
}

export interface ExecutiveExportMeta {
  period?: string
  filters?: string
  generatedBy?: string
}

export function exportServiceRecordsByExecutiveCSV(
  records: ServiceRecord[],
  filename = 'relatorio-atendimentos.csv',
  meta?: ExecutiveExportMeta,
): void {
  const metaParts: string[] = []
  if (meta) {
    if (meta.period) metaParts.push(`Período: ${meta.period}`)
    if (meta.filters) metaParts.push(`Filtros: ${meta.filters}`)
    const timestamp = new Date().toLocaleString('pt-BR')
    metaParts.push(`Gerado por: ${meta.generatedBy || 'Sistema'} em ${timestamp}`)
  }
  const metaHeaderLine = metaParts.length > 0 ? escapeCsv(metaParts.join(' | ')) : null

  const rows = records.map((r) =>
    [
      r.client_name || '',
      r.assigned_agent || '',
      r.expand?.account_executive?.name || r.assigned_agent || '',
      r.contact_reason || '',
      r.avoidable_contact ? 'Sim' : 'Não',
      r.avoidable_contact ? (r.avoidable_contact_reason as string) || '' : '',
      r.avoidable_contact ? r.avoidable_contact_explanation || '' : '',
      r.status || '',
      r.priority || '',
      r.duration != null ? String(r.duration) : '',
      r.channel || '',
      formatDate(r.created),
    ]
      .map(escapeCsv)
      .join(','),
  )
  const headerRows = metaHeaderLine
    ? [metaHeaderLine, HEADERS.map(escapeCsv).join(',')]
    : [HEADERS.map(escapeCsv).join(',')]
  const csv = '\uFEFF' + [...headerRows, ...rows].join('\r\n')
  const blob = new Blob([csv], { type: 'text/csv;charset=utf-8;' })
  const url = URL.createObjectURL(blob)
  const link = document.createElement('a')
  link.href = url
  link.download = filename
  link.click()
  URL.revokeObjectURL(url)
}
