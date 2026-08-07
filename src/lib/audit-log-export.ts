import type { AuditLogRecord } from '@/types/audit-log'
import { generateExcelXML, downloadExcel } from '@/lib/excel-export'
import { downloadPDF } from '@/lib/pdf-export'

const HEADERS = ['Data e Hora', 'Usuário', 'Ação', 'Entidade', 'ID da Entidade', 'Detalhes']

function fmtDate(dateStr?: string): string {
  if (!dateStr) return ''
  try {
    const d = new Date(dateStr)
    if (isNaN(d.getTime())) return ''
    const p = (n: number) => String(n).padStart(2, '0')
    return `${p(d.getDate())}/${p(d.getMonth() + 1)}/${d.getFullYear()} ${p(d.getHours())}:${p(d.getMinutes())}:${p(d.getSeconds())}`
  } catch {
    return ''
  }
}

export function auditLogsToRows(
  logs: AuditLogRecord[],
  userNames: Map<string, string>,
): string[][] {
  return logs.map((log) => [
    fmtDate(log.created),
    log.expand?.user?.name || userNames.get(log.user) || log.user || 'Sistema',
    log.action || '',
    log.entity || '',
    log.entity_id || '',
    log.details ? JSON.stringify(log.details) : '',
  ])
}

export function downloadAuditLogCSV(logs: AuditLogRecord[], userNames: Map<string, string>): void {
  const rows = auditLogsToRows(logs, userNames)
  const csv = [
    HEADERS.map((h) => `"${h}"`).join(','),
    ...rows.map((row) => row.map((cell) => `"${cell.replace(/"/g, '""')}"`).join(',')),
  ].join('\r\n')
  const blob = new Blob(['\uFEFF' + csv], { type: 'text/csv;charset=utf-8;' })
  const url = URL.createObjectURL(blob)
  const link = document.createElement('a')
  link.href = url
  link.download = 'audit-log.csv'
  link.click()
  URL.revokeObjectURL(url)
}

export function downloadAuditLogExcel(
  logs: AuditLogRecord[],
  userNames: Map<string, string>,
): void {
  const xml = generateExcelXML(HEADERS, auditLogsToRows(logs, userNames), 'Audit Log')
  downloadExcel(xml, 'audit-log.xls')
}

export function downloadAuditLogPDF(logs: AuditLogRecord[], userNames: Map<string, string>): void {
  const headerCells = HEADERS.map((h) => `<th>${h}</th>`).join('')
  const bodyRows = auditLogsToRows(logs, userNames)
    .map(
      (row) => `<tr>${row.map((c) => `<td>${String(c).replace(/</g, '&lt;')}</td>`).join('')}</tr>`,
    )
    .join('')
  downloadPDF(
    `<h1>Relatório de Auditoria</h1><p>Total: ${logs.length} registro(s)</p><table><thead><tr>${headerCells}</tr></thead><tbody>${bodyRows}</tbody></table>`,
    'Relatório de Auditoria',
  )
}
