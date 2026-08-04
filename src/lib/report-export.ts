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
