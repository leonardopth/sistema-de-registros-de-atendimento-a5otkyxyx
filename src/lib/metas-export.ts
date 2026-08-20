import { formatGMT3DateTime } from '@/lib/timezone'
import { STATUS_LABEL, type ComparisonRow, type Status } from '@/lib/metas'

/** Colunas do comparativo de metas. */
export interface ExportColumn {
  header: string
  accessor: (row: ComparisonRow) => string
}

const COLUMNS: ExportColumn[] = [
  { header: 'Agente', accessor: (r) => r.agentName },
  {
    header: 'Tipo de Meta',
    accessor: (r) => (r.source === 'individual' ? 'Individual' : 'Global'),
  },
  { header: 'Meta de Atendimentos', accessor: (r) => String(r.attendanceTarget) },
  { header: 'Atendimentos Realizados', accessor: (r) => String(r.realAttendance) },
  { header: '% Atingida', accessor: (r) => `${r.attendancePct}%` },
  { header: 'Taxa Resolução Mínima', accessor: (r) => `${r.minResolutionRate}%` },
  { header: 'Taxa Resolução Real', accessor: (r) => `${r.realResolutionRate}%` },
  {
    header: 'Status Atendimentos',
    accessor: (r) => STATUS_LABEL[r.attendanceStatus as Status],
  },
  {
    header: 'Status Resolução',
    accessor: (r) => STATUS_LABEL[r.resolutionStatus as Status],
  },
  { header: 'Status Geral', accessor: (r) => STATUS_LABEL[r.overall as Status] },
]

/** Gera e baixa o CSV do comparativo de metas (fuso GMT-3). */
export function exportMetasCSV(rows: ComparisonRow[]): void {
  const now = formatGMT3DateTime(new Date().toISOString())
  const escape = (v: string) => {
    const s = String(v ?? '')
    if (/[;",\n\r]/.test(s)) return `"${s.replace(/"/g, '""')}"`
    return s
  }
  const header = COLUMNS.map((c) => escape(c.header)).join(';')
  const body = rows.map((r) => COLUMNS.map((c) => escape(c.accessor(r))).join(';')).join('\r\n')
  const content = `${header}\r\n${body}\r\n\r\nGerado em: ${now} (GMT-3)\r\n`

  const blob = new Blob(['\ufeff' + content], { type: 'text/csv;charset=utf-8;' })
  const url = URL.createObjectURL(blob)
  const a = document.createElement('a')
  a.href = url
  a.download = `metas-desempenho-${new Date().toISOString().substring(0, 10)}.csv`
  document.body.appendChild(a)
  a.click()
  document.body.removeChild(a)
  setTimeout(() => URL.revokeObjectURL(url), 1000)
}

/**
 * Gera e baixa o PDF do comparativo de metas (fuso GMT-3).
 * Usa o helper `downloadPDF` (window.print) existente para evitar depêndencias extras.
 */
export function exportMetasPDF(rows: ComparisonRow[]): void {
  const now = formatGMT3DateTime(new Date().toISOString())
  const headerCells = COLUMNS.map((c) => `<th>${c.header}</th>`).join('')
  const bodyRows = rows
    .map((r) => {
      const cells = COLUMNS.map((c) => `<td>${escapeHtml(c.accessor(r))}</td>`).join('')
      return `<tr>${cells}</tr>`
    })
    .join('')

  const html = `
    <h1>Metas de Desempenho — Comparativo</h1>
    <p class="subtitle">Relatório de metas de atendimentos e resolução por agente</p>
    <table>
      <thead><tr>${headerCells}</tr></thead>
      <tbody>${bodyRows || '<tr><td colspan="' + COLUMNS.length + '" style="text-align:center">Nenhum dado</td></tr>'}</tbody>
    </table>
    <div class="footer">Gerado em: ${now} (GMT-3)</div>
  `

  openPrintWindow(html, 'Metas de Desempenho')
}

function escapeHtml(s: string): string {
  return String(s ?? '')
    .replace(/&/g, '&amp;')
    .replace(/</g, '&lt;')
    .replace(/>/g, '&gt;')
    .replace(/"/g, '&quot;')
}

function openPrintWindow(htmlContent: string, title: string): void {
  const win = window.open('', '_blank')
  if (!win) return
  win.document.write(`<!DOCTYPE html>
<html lang="pt-BR">
<head>
<meta charset="UTF-8">
<title>${title}</title>
<style>
  * { margin: 0; padding: 0; box-sizing: border-box; }
  body { font-family: Arial, Helvetica, sans-serif; padding: 20px; color: #1e293b; }
  h1 { font-size: 18px; margin-bottom: 4px; color: #0f172a; }
  .subtitle { font-size: 11px; color: #64748b; margin-bottom: 14px; }
  table { width: 100%; border-collapse: collapse; font-size: 9px; margin-bottom: 12px; }
  th, td { border: 1px solid #cbd5e1; padding: 4px 6px; text-align: left; vertical-align: top; }
  th { background: #f1f5f9; font-weight: bold; }
  tr:nth-child(even) td { background: #f8fafc; }
  .footer { margin-top: 16px; font-size: 10px; color: #64748b; border-top: 1px solid #e2e8f0; padding-top: 8px; }
  @media print { body { padding: 10px; } @page { margin: 1cm; } }
</style>
</head>
<body>${htmlContent}</body>
</html>`)
  win.document.close()
  win.focus()
  setTimeout(() => win.print(), 300)
}
