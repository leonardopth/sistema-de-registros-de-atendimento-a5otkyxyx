import { generateExcelXML, downloadExcel } from '@/lib/excel-export'
import { downloadPDF } from '@/lib/pdf-export'

export interface GroupReportStat {
  group: string
  label: string
  total: number
  avoidable: number
  rate: number
  reasonBreakdown: Record<string, number>
}

const AVOIDABLE_REASONS = ['Disponível no RF', 'Fora do Escopo', 'Erro RF', 'Outros']
const HEADERS = [
  'Grupo de Atendimento',
  'Total de Atendimentos',
  'Contatos Evitáveis',
  'Taxa de Evitáveis (%)',
  ...AVOIDABLE_REASONS,
]

function esc(value: string): string {
  return `"${value.replace(/"/g, '""')}"`
}

export interface ExportMetadataOptions {
  period?: string
  filters?: string
  generatedBy?: string
}

function formatMetaHeaderLine(meta?: ExportMetadataOptions): string | null {
  if (!meta) return null
  const parts: string[] = []
  if (meta.period) parts.push(`Período: ${meta.period}`)
  if (meta.filters) parts.push(`Filtros: ${meta.filters}`)
  const timestamp = new Date().toLocaleString('pt-BR')
  const author = meta.generatedBy || 'Sistema'
  parts.push(`Gerado por: ${author} em ${timestamp}`)
  return parts.join(' | ')
}

export function downloadGroupReportCSV(
  stats: GroupReportStat[],
  meta?: ExportMetadataOptions,
): void {
  const metaLine = formatMetaHeaderLine(meta)
  const rows = stats.map((s) =>
    [
      s.label,
      String(s.total),
      String(s.avoidable),
      String(s.rate),
      ...AVOIDABLE_REASONS.map((r) => String(s.reasonBreakdown[r] || 0)),
    ]
      .map(esc)
      .join(','),
  )
  const headerLines = metaLine
    ? [esc(metaLine), HEADERS.map(esc).join(',')]
    : [HEADERS.map(esc).join(',')]
  const csv = '\uFEFF' + [...headerLines, ...rows].join('\r\n')
  const blob = new Blob([csv], { type: 'text/csv;charset=utf-8;' })
  const url = URL.createObjectURL(blob)
  const link = document.createElement('a')
  link.href = url
  link.download = 'relatorio-grupo-atendimento.csv'
  link.click()
  URL.revokeObjectURL(url)
}

export function downloadGroupReportExcel(stats: GroupReportStat[]): void {
  const rows = stats.map((s) => [
    s.label,
    s.total,
    s.avoidable,
    `${s.rate}%`,
    ...AVOIDABLE_REASONS.map((r) => s.reasonBreakdown[r] || 0),
  ])
  downloadExcel(
    generateExcelXML(HEADERS, rows, 'Relatório por Grupo'),
    'relatorio-grupo-atendimento.xls',
  )
}

export function downloadGroupReportPDF(stats: GroupReportStat[]): void {
  const totalAll = stats.reduce((a, s) => a + s.total, 0)
  const avoidableAll = stats.reduce((a, s) => a + s.avoidable, 0)
  const rateAll = totalAll > 0 ? Math.round((avoidableAll / totalAll) * 100) : 0

  const tableRows = stats
    .map(
      (s) =>
        `<tr><td>${s.label}</td><td>${s.total}</td><td>${s.avoidable}</td><td>${s.rate}%</td>${AVOIDABLE_REASONS.map((r) => `<td>${s.reasonBreakdown[r] || 0}</td>`).join('')}</tr>`,
    )
    .join('')

  const html = `
    <h1>Relatório por Grupo de Atendimento</h1>
    <div class="stat-grid">
      <div class="stat-item"><div class="stat-label">Total de Atendimentos</div><div class="stat-value">${totalAll}</div></div>
      <div class="stat-item"><div class="stat-label">Contatos Evitáveis</div><div class="stat-value">${avoidableAll}</div></div>
      <div class="stat-item"><div class="stat-label">Taxa de Evitáveis</div><div class="stat-value">${rateAll}%</div></div>
    </div>
    <table>
      <thead><tr><th>Grupo</th><th>Total</th><th>Evitáveis</th><th>Taxa</th>${AVOIDABLE_REASONS.map((r) => `<th>${r}</th>`).join('')}</tr></thead>
      <tbody>${tableRows}</tbody>
    </table>
  `
  downloadPDF(html, 'Relatório por Grupo de Atendimento')
}
