export interface CompanyReportItem {
  company: string
  agentCount: number
  totalRecords: number
  statusBreakdown: Record<string, number>
  executives: string[]
  agents: { name: string; recordCount: number }[]
}

const STATUSES = ['Aberto', 'Em Andamento', 'Concluído', 'Cancelado']

export function reportToCSV(items: CompanyReportItem[]): string {
  const headers = [
    'Empresa',
    'Executivo de Contas',
    'Total Atendimentos',
    'Número de Agentes',
    ...STATUSES,
    'Performance por Agente',
  ]
  const rows = items.map((item) => [
    item.company,
    item.executives.join('; ') || '-',
    String(item.totalRecords),
    String(item.agentCount),
    ...STATUSES.map((s) => String(item.statusBreakdown[s] || 0)),
    item.agents.map((a) => `${a.name}: ${a.recordCount}`).join('; '),
  ])
  return [headers, ...rows]
    .map((row) => row.map((cell) => `"${cell.replace(/"/g, '""')}"`).join(','))
    .join('\n')
}

export function reportToText(items: CompanyReportItem[]): string {
  const lines: string[] = []
  lines.push('RELATÓRIO POR EMPRESA')
  lines.push('='.repeat(60))
  lines.push('')
  for (const item of items) {
    lines.push(`Empresa: ${item.company}`)
    lines.push(`  Executivo de Contas: ${item.executives.join(', ') || '-'}`)
    lines.push(`  Total de Atendimentos: ${item.totalRecords}`)
    lines.push(`  Número de Agentes: ${item.agentCount}`)
    lines.push(
      `  Status: Aberto=${item.statusBreakdown['Aberto'] || 0}, Em Andamento=${item.statusBreakdown['Em Andamento'] || 0}, Concluído=${item.statusBreakdown['Concluído'] || 0}, Cancelado=${item.statusBreakdown['Cancelado'] || 0}`,
    )
    if (item.agents.length > 0) {
      lines.push('  Performance por Agente:')
      for (const a of item.agents) {
        lines.push(`    - ${a.name}: ${a.recordCount} atendimento(s)`)
      }
    }
    lines.push('')
  }
  return lines.join('\n')
}

export function downloadCSV(csv: string, filename: string): void {
  const blob = new Blob(['\ufeff' + csv], { type: 'text/csv;charset=utf-8;' })
  const link = document.createElement('a')
  link.href = URL.createObjectURL(blob)
  link.download = filename
  link.click()
  URL.revokeObjectURL(link.href)
}

export async function copyToClipboard(text: string): Promise<void> {
  await navigator.clipboard.writeText(text)
}

export function printReport(items: CompanyReportItem[]): void {
  const html = generatePrintHTML(items)
  const win = window.open('', '_blank', 'width=900,height=700')
  if (!win) return
  win.document.write(html)
  win.document.close()
  win.focus()
  setTimeout(() => win.print(), 300)
}

function generatePrintHTML(items: CompanyReportItem[]): string {
  const rows = items
    .map(
      (item) => `<tr>
<td>${item.company}</td>
<td>${item.executives.join(', ') || '-'}</td>
<td style="text-align:center">${item.totalRecords}</td>
<td style="text-align:center">${item.agentCount}</td>
      <td style="text-align:center">${item.statusBreakdown['Aberto'] || 0}</td>
      <td style="text-align:center">${item.statusBreakdown['Em Andamento'] || 0}</td>
      <td style="text-align:center">${item.statusBreakdown['Concluído'] || 0}</td>
      <td style="text-align:center">${item.statusBreakdown['Cancelado'] || 0}</td>
      <td>${item.agents.map((a) => `${a.name} (${a.recordCount})`).join(', ')}</td>
    </tr>`,
    )
    .join('')

  return `<!DOCTYPE html><html lang="pt-BR"><head><meta charset="UTF-8">
<title>Relatório por Empresa</title>
<style>body{font-family:Arial,sans-serif;padding:24px}h1{font-size:20px;margin-bottom:16px}table{width:100%;border-collapse:collapse;font-size:12px}th,td{border:1px solid #ccc;padding:8px}th{background:#f5f5f5;text-align:left}@media print{body{padding:0}}</style>
</head><body><h1>Relatório por Empresa</h1>
<table><thead><tr><th>Empresa</th><th>Executivo de Contas</th><th>Total</th><th>Agentes</th><th>Aberto</th><th>Em Andamento</th><th>Concluído</th><th>Cancelado</th><th>Agentes (Atendimentos)</th></tr></thead><tbody>${rows}</tbody></table>
</body></html>`
}
