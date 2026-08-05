import { ServiceRecord } from '@/types/service_record'
import { generateExcelXML, downloadExcel } from '@/lib/excel-export'
import { downloadPDF } from '@/lib/pdf-export'

export interface ConsolidatedReportData {
  totalRecords: number
  avgDuration: number
  avoidableContactCount: number
  avoidableContactPercentage: number
  statusBreakdown: Record<string, number>
  channelBreakdown: Record<string, number>
  reasonBreakdown: Record<string, number>
  priorityBreakdown: Record<string, number>
}

const STATUSES = ['Aberto', 'Em Andamento', 'Concluído', 'Cancelado']
const CHANNELS = ['Telefone', 'e-mail', 'whatsapp', 'comercial', 'outros']
const REASONS = [
  'Bagagem',
  'Assento',
  'cálculo reemissão',
  'reembolso',
  'cotação',
  'reserva',
  'cancelamento',
  'regras tarifárias',
  'erro RF',
  'outros',
]
const PRIORITIES = ['Baixa', 'Média', 'Alta']

function initBreakdown(keys: string[]): Record<string, number> {
  const obj: Record<string, number> = {}
  keys.forEach((k) => (obj[k] = 0))
  return obj
}

export function generateConsolidatedReport(records: ServiceRecord[]): ConsolidatedReportData {
  const total = records.length
  const totalDuration = records.reduce((acc, r) => acc + (r.duration || 0), 0)
  const avoidableCount = records.filter((r) => r.avoidable_contact === true).length

  const statusBreakdown = initBreakdown(STATUSES)
  const channelBreakdown = initBreakdown(CHANNELS)
  const reasonBreakdown = initBreakdown(REASONS)
  const priorityBreakdown = initBreakdown(PRIORITIES)

  records.forEach((r) => {
    if (r.status && statusBreakdown[r.status] !== undefined) statusBreakdown[r.status]++
    if (r.channel && channelBreakdown[r.channel] !== undefined) channelBreakdown[r.channel]++
    if (r.contact_reason && reasonBreakdown[r.contact_reason] !== undefined)
      reasonBreakdown[r.contact_reason]++
    if (r.priority && priorityBreakdown[r.priority] !== undefined) priorityBreakdown[r.priority]++
  })

  return {
    totalRecords: total,
    avgDuration: total > 0 ? Math.round(totalDuration / total) : 0,
    avoidableContactCount: avoidableCount,
    avoidableContactPercentage: total > 0 ? Math.round((avoidableCount / total) * 100) : 0,
    statusBreakdown,
    channelBreakdown,
    reasonBreakdown,
    priorityBreakdown,
  }
}

function distRows(
  label: string,
  keys: string[],
  breakdown: Record<string, number>,
  total: number,
): (string | number)[][] {
  const rows: (string | number)[][] = [[label, 'Quantidade', 'Percentual']]
  keys.forEach((k) => {
    const count = breakdown[k] || 0
    rows.push([k, count, total > 0 ? `${Math.round((count / total) * 100)}%` : '0%'])
  })
  return rows
}

function escCsv(value: string): string {
  return `"${value.replace(/"/g, '""')}"`
}

export function consolidatedReportToCSV(data: ConsolidatedReportData): string {
  const lines: string[] = []
  lines.push(['Indicador', 'Valor'].map(escCsv).join(','))
  lines.push(['Total de Atendimentos', String(data.totalRecords)].map(escCsv).join(','))
  lines.push(['Tempo Médio de Atendimento (min)', String(data.avgDuration)].map(escCsv).join(','))
  lines.push(
    ['Contatos Evitáveis (total)', String(data.avoidableContactCount)].map(escCsv).join(','),
  )
  lines.push(
    ['Contatos Evitáveis (%)', `${data.avoidableContactPercentage}%`].map(escCsv).join(','),
  )
  lines.push('')
  const sections = [
    distRows('Status', STATUSES, data.statusBreakdown, data.totalRecords),
    distRows('Canal', CHANNELS, data.channelBreakdown, data.totalRecords),
    distRows('Motivo do Contato', REASONS, data.reasonBreakdown, data.totalRecords),
    distRows('Prioridade', PRIORITIES, data.priorityBreakdown, data.totalRecords),
  ]
  sections.forEach((section) => {
    section.forEach((row) => lines.push(row.map((c) => escCsv(String(c))).join(',')))
    lines.push('')
  })
  return lines.join('\r\n')
}

export function downloadConsolidatedCSV(
  data: ConsolidatedReportData,
  filename = 'relatorio-consolidado.csv',
): void {
  const csv = '\uFEFF' + consolidatedReportToCSV(data)
  const blob = new Blob([csv], { type: 'text/csv;charset=utf-8;' })
  const url = URL.createObjectURL(blob)
  const link = document.createElement('a')
  link.href = url
  link.download = filename
  link.click()
  URL.revokeObjectURL(url)
}

export function downloadConsolidatedExcel(
  data: ConsolidatedReportData,
  filename = 'relatorio-consolidado.xls',
): void {
  const rows: (string | number)[][] = [
    ['Relatório Consolidado por Período'],
    [],
    ['Indicador', 'Valor'],
    ['Total de Atendimentos', data.totalRecords],
    ['Tempo Médio de Atendimento (min)', data.avgDuration],
    ['Contatos Evitáveis (total)', data.avoidableContactCount],
    ['Contatos Evitáveis (%)', `${data.avoidableContactPercentage}%`],
    [],
    ...distRows('Status', STATUSES, data.statusBreakdown, data.totalRecords),
    [],
    ...distRows('Canal', CHANNELS, data.channelBreakdown, data.totalRecords),
    [],
    ...distRows('Motivo do Contato', REASONS, data.reasonBreakdown, data.totalRecords),
    [],
    ...distRows('Prioridade', PRIORITIES, data.priorityBreakdown, data.totalRecords),
  ]
  downloadExcel(generateExcelXML([], rows, 'Relatório Consolidado'), filename)
}

export function downloadConsolidatedPDF(
  data: ConsolidatedReportData,
  title = 'Relatório Consolidado por Período',
): void {
  const distTable = (label: string, keys: string[], breakdown: Record<string, number>) => {
    const rows = keys
      .map((k) => {
        const count = breakdown[k] || 0
        const pct = data.totalRecords > 0 ? Math.round((count / data.totalRecords) * 100) : 0
        return `<tr><td>${k}</td><td>${count}</td><td>${pct}%</td></tr>`
      })
      .join('')
    return `<h2>${label}</h2><table><thead><tr><th>Categoria</th><th>Quantidade</th><th>Percentual</th></tr></thead><tbody>${rows}</tbody></table>`
  }

  const html = `
    <h1>${title}</h1>
    <div class="stat-grid">
      <div class="stat-item"><div class="stat-label">Total de Atendimentos</div><div class="stat-value">${data.totalRecords}</div></div>
      <div class="stat-item"><div class="stat-label">Tempo Médio (min)</div><div class="stat-value">${data.avgDuration}</div></div>
      <div class="stat-item"><div class="stat-label">Contatos Evitáveis</div><div class="stat-value">${data.avoidableContactCount}</div></div>
      <div class="stat-item"><div class="stat-label">Contatos Evitáveis (%)</div><div class="stat-value">${data.avoidableContactPercentage}%</div></div>
    </div>
    ${distTable('Distribuição por Status', STATUSES, data.statusBreakdown)}
    ${distTable('Distribuição por Canal', CHANNELS, data.channelBreakdown)}
    ${distTable('Distribuição por Motivo do Contato', REASONS, data.reasonBreakdown)}
    ${distTable('Distribuição por Prioridade', PRIORITIES, data.priorityBreakdown)}
  `
  downloadPDF(html, title)
}
