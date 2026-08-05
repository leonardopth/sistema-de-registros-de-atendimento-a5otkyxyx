export interface CompanyReportItem {
  company: string
  city: string
  state: string
  agentCount: number
  totalRecords: number
  statusBreakdown: Record<string, number>
  executives: string[]
  agents: {
    name: string
    recordCount: number
  }[]
}

const STATUSES = ['Aberto', 'Em Andamento', 'Concluído', 'Cancelado']

export function reportToCSV(items: CompanyReportItem[]): string {
  const headers = [
    'Empresa',
    'Cidade',
    'Estado',
    'Agentes',
    'Total Atendimentos',
    'Executivos',
    ...STATUSES,
  ]
  const rows = items.map((item) => [
    item.company,
    item.city,
    item.state,
    String(item.agentCount),
    String(item.totalRecords),
    item.executives.join('; '),
    ...STATUSES.map((s) => String(item.statusBreakdown[s] || 0)),
  ])
  return [headers, ...rows]
    .map((row) => row.map((cell) => `"${cell.replace(/"/g, '""')}"`).join(','))
    .join('\n')
}

export function reportToText(items: CompanyReportItem[]): string {
  return items
    .map((item) => {
      const lines = [
        `Empresa: ${item.company}`,
        `Cidade: ${item.city}`,
        `Estado: ${item.state}`,
        `Agentes: ${item.agentCount}`,
        `Total de Atendimentos: ${item.totalRecords}`,
        `Executivos: ${item.executives.join(', ') || '—'}`,
        ...STATUSES.map((s) => `  ${s}: ${item.statusBreakdown[s] || 0}`),
      ]
      if (item.agents.length > 0) {
        lines.push('Agentes:')
        item.agents.forEach((a) => lines.push(`  - ${a.name} (${a.recordCount})`))
      }
      return lines.join('\n')
    })
    .join('\n\n---\n\n')
}

export function downloadCSV(csv: string, filename: string): void {
  const blob = new Blob([csv], { type: 'text/csv;charset=utf-8;' })
  const url = URL.createObjectURL(blob)
  const link = document.createElement('a')
  link.href = url
  link.download = filename
  link.click()
  URL.revokeObjectURL(url)
}

export async function copyToClipboard(text: string): Promise<void> {
  await navigator.clipboard.writeText(text)
}

export function printReport(items: CompanyReportItem[]): void {
  const text = reportToText(items)
  const win = window.open('', '_blank')
  if (!win) return
  win.document.write(
    `<pre style="font-family: monospace; font-size: 12px; white-space: pre-wrap;">${text.replace(/</g, '&lt;')}</pre>`,
  )
  win.document.close()
  win.print()
}

export interface ServiceRecordExportRow {
  client_name: string
  client_email?: string
  client_phone?: string
  client_company?: string
  contact_reason: string
  channel?: string
  priority: string
  status: string
  assigned_agent?: string
  start_time?: string
  end_time?: string
  duration?: number
  description: string
  avoidable_contact?: boolean
  avoidable_contact_explanation?: string
  created?: string
}

const SERVICE_EXPORT_HEADERS = [
  'Cliente',
  'E-mail',
  'Telefone',
  'Empresa',
  'Motivo do Contato',
  'Canal',
  'Prioridade',
  'Status',
  'Atendente Responsável',
  'Data de Início',
  'Data de Conclusão',
  'Duração (min)',
  'Descrição',
  'Contato Evitável',
  'Explicação do Contato Evitável',
  'Criado em',
]

function escapeCsvCell(value: string): string {
  return `"${value.replace(/"/g, '""')}"`
}

function formatDateTime(dateStr?: string): string {
  if (!dateStr) return ''
  try {
    const d = new Date(dateStr)
    if (isNaN(d.getTime())) return ''
    const pad = (n: number) => String(n).padStart(2, '0')
    return `${pad(d.getDate())}/${pad(d.getMonth() + 1)}/${d.getFullYear()} ${pad(d.getHours())}:${pad(d.getMinutes())}`
  } catch {
    return ''
  }
}

export function serviceRecordsToCSV(rows: ServiceRecordExportRow[]): string {
  const dataRows = rows.map((r) =>
    [
      r.client_name || '',
      r.client_email || '',
      r.client_phone || '',
      r.client_company || '',
      r.contact_reason || '',
      r.channel || '',
      r.priority || '',
      r.status || '',
      r.assigned_agent || '',
      formatDateTime(r.start_time),
      formatDateTime(r.end_time),
      r.duration != null ? String(r.duration) : '',
      r.description || '',
      r.avoidable_contact ? 'Sim' : 'Não',
      r.avoidable_contact ? r.avoidable_contact_explanation || '' : '',
      formatDateTime(r.created),
    ]
      .map(escapeCsvCell)
      .join(','),
  )
  return [SERVICE_EXPORT_HEADERS.map(escapeCsvCell).join(','), ...dataRows].join('\r\n')
}

export function downloadServiceRecordsCSV(
  rows: ServiceRecordExportRow[],
  filename: string = 'relatorio-atendimentos.csv',
): void {
  const csv = '\uFEFF' + serviceRecordsToCSV(rows)
  const blob = new Blob([csv], { type: 'text/csv;charset=utf-8;' })
  const url = URL.createObjectURL(blob)
  const link = document.createElement('a')
  link.href = url
  link.download = filename
  link.click()
  URL.revokeObjectURL(url)
}
