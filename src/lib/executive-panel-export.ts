import type { ClientRecord } from '@/types/service_record'

interface ExecutivePanelStat {
  client: Pick<ClientRecord, 'company' | 'name'>
  total: number
  avoidable: number
  rate: number
  reasonBreakdown: Record<string, number>
}

const HEADERS = [
  'Agência',
  'Total de Atendimentos',
  'Contatos Evitáveis',
  'Taxa de Evitáveis (%)',
  'Disponível no RF',
  'Fora do Escopo',
  'Erro RF',
  'Outros',
]

function escapeCsv(value: string): string {
  return `"${value.replace(/"/g, '""')}"`
}

export function exportExecutivePanelCSV(
  stats: ExecutivePanelStat[],
  filename = 'painel-executivo.csv',
): void {
  const rows = stats.map((s) =>
    [
      s.client.company || s.client.name,
      String(s.total),
      String(s.avoidable),
      String(s.rate),
      String(s.reasonBreakdown['Disponível no RF'] || 0),
      String(s.reasonBreakdown['Fora do Escopo'] || 0),
      String(s.reasonBreakdown['Erro RF'] || 0),
      String(s.reasonBreakdown['Outros'] || 0),
    ]
      .map(escapeCsv)
      .join(','),
  )

  const csv = '\uFEFF' + [HEADERS.map(escapeCsv).join(','), ...rows].join('\r\n')
  const blob = new Blob([csv], { type: 'text/csv;charset=utf-8;' })
  const url = URL.createObjectURL(blob)
  const link = document.createElement('a')
  link.href = url
  link.download = filename
  link.click()
  URL.revokeObjectURL(url)
}
