import { ServiceRecord } from '@/types/service_record'
import { generateExcelXML, downloadExcel } from '@/lib/excel-export'
import { downloadPDF } from '@/lib/pdf-export'

const HEADERS = [
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

function fmtDate(dateStr?: string): string {
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

export function recordsToRows(records: ServiceRecord[]): (string | number)[][] {
  return records.map((r) => [
    r.client_name || '',
    r.client_email || '',
    r.client_phone || '',
    r.client_company || '',
    r.contact_reason || '',
    r.channel || '',
    r.priority || '',
    r.status || '',
    r.assigned_agent || '',
    fmtDate(r.start_time),
    fmtDate(r.end_time),
    r.duration != null ? r.duration : '',
    r.description || '',
    r.avoidable_contact ? 'Sim' : 'Não',
    r.avoidable_contact ? r.avoidable_contact_explanation || '' : '',
    fmtDate(r.created),
  ])
}

export function downloadServiceRecordsExcel(
  records: ServiceRecord[],
  filename = 'relatorio-atendimentos.xls',
): void {
  const xml = generateExcelXML(HEADERS, recordsToRows(records), 'Atendimentos')
  downloadExcel(xml, filename)
}

export function downloadServiceRecordsPDF(
  records: ServiceRecord[],
  title = 'Relatório de Atendimentos',
): void {
  const headerCells = HEADERS.map((h) => `<th>${h}</th>`).join('')
  const bodyRows = recordsToRows(records)
    .map(
      (row) => `<tr>${row.map((c) => `<td>${String(c).replace(/</g, '&lt;')}</td>`).join('')}</tr>`,
    )
    .join('')
  downloadPDF(
    `<h1>${title}</h1><p>Total: ${records.length} registro(s)</p><table><thead><tr>${headerCells}</tr></thead><tbody>${bodyRows}</tbody></table>`,
    title,
  )
}
