import { STATUS_LABEL, type ComparisonRow, type Status } from '@/lib/metas'

export const COLUMNS: { key: keyof ComparisonRow; header: string }[] = [
  { key: 'userName', header: 'Colaborador' },
  { key: 'userRole', header: 'Função' },
  { key: 'source', header: 'Origem da meta' },
  { key: 'attendanceTarget', header: 'Meta de Atendimentos' },
  { key: 'realAttendance', header: 'Atendimentos Realizados' },
  { key: 'attendancePct', header: '% Atingimento Atendimentos' },
  { key: 'minResolutionRate', header: 'Meta Mín. Resolução (%)' },
  { key: 'realResolutionRate', header: 'Taxa Real Resolução (%)' },
  { key: 'avgDuration', header: 'Tempo Médio (min)' },
  { key: 'autoCategorizedRate', header: 'Categorização (%)' },
  { key: 'avgSatisfactionScore', header: 'Satisfação / Qualidade (pts)' },
  { key: 'attendanceStatus', header: 'Status Atendimentos' },
  { key: 'resolutionStatus', header: 'Status Resolução' },
  { key: 'overall', header: 'Status Geral' },
]

function formatCell(row: ComparisonRow, key: keyof ComparisonRow): string {
  const v = row[key]
  if (key === 'source') {
    return v === 'individual' ? 'Individual' : 'Global (padrão)'
  }
  if (key === 'attendanceStatus' || key === 'resolutionStatus' || key === 'overall') {
    return STATUS_LABEL[v as Status] || String(v ?? '')
  }
  if (
    key === 'attendancePct' ||
    key === 'minResolutionRate' ||
    key === 'realResolutionRate' ||
    key === 'autoCategorizedRate'
  ) {
    return `${v}%`
  }
  if (key === 'avgDuration') {
    return `${v} min`
  }
  if (key === 'avgSatisfactionScore') {
    return `${v}/100`
  }
  return String(v ?? '')
}

/** Gera e baixa o CSV do comparativo de metas de colaboradores. */
export function exportMetasCSV(rows: ComparisonRow[]): void {
  const headerLine = COLUMNS.map((c) => `"${c.header.replace(/"/g, '""')}"`).join(',')
  const dataLines = rows.map((r) =>
    COLUMNS.map((c) => `"${formatCell(r, c.key).replace(/"/g, '""')}"`).join(','),
  )
  const csvContent = '\uFEFF' + [headerLine, ...dataLines].join('\r\n')
  const blob = new Blob([csvContent], { type: 'text/csv;charset=utf-8;' })
  const url = URL.createObjectURL(blob)
  const a = document.createElement('a')
  a.href = url
  a.download = `metas-desempenho-colaboradores-${new Date().toISOString().substring(0, 10)}.csv`
  document.body.appendChild(a)
  a.click()
  document.body.removeChild(a)
  URL.revokeObjectURL(url)
}

/** Gera e abre a janela de impressão para exportar PDF do comparativo de metas. */
export function exportMetasPDF(rows: ComparisonRow[]): void {
  const headerCells = COLUMNS.map((c) => `<th>${c.header}</th>`).join('')
  const bodyRows = rows
    .map((r) => `<tr>${COLUMNS.map((c) => `<td>${formatCell(r, c.key)}</td>`).join('')}</tr>`)
    .join('')

  const html = `
    <h1>Metas de Desempenho — Colaboradores</h1>
    <p class="subtitle">Relatório de metas de atendimentos e resolução por colaborador interno</p>
    <table>
      <thead><tr>${headerCells}</tr></thead>
      <tbody>${bodyRows}</tbody>
    </table>
  `
  openPrintWindow(html, 'Metas de Desempenho - Colaboradores')
}

function openPrintWindow(bodyContent: string, title: string): void {
  const win = window.open('', '_blank')
  if (!win) return
  win.document.write(`
    <!DOCTYPE html>
    <html lang="pt-BR">
    <head>
      <meta charset="utf-8" />
      <title>${title}</title>
      <style>
        body { font-family: -apple-system, BlinkMacSystemFont, "Segoe UI", Roboto, sans-serif; margin: 24px; color: #1e293b; }
        h1 { font-size: 18px; margin: 0 0 4px 0; color: #0f172a; }
        .subtitle { font-size: 11px; color: #64748b; margin: 0 0 16px 0; }
        table { width: 100%; border-collapse: collapse; font-size: 10px; }
        th, td { border: 1px solid #cbd5e1; padding: 6px 8px; text-align: left; }
        th { background: #f1f5f9; font-weight: 700; color: #334155; }
        tr:nth-child(even) { background: #f8fafc; }
        @media print {
          body { margin: 12px; }
        }
      </style>
    </head>
    <body>
      ${bodyContent}
    </body>
    </html>
  `)
  win.document.close()
  win.focus()
  setTimeout(() => {
    win.print()
  }, 250)
}
