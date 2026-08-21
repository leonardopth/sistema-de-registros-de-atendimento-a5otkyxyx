import { downloadPDF } from '@/lib/pdf-export'

export interface UserExportRow {
  name: string
  email: string
  role: string
  departments?: string
  service_groups: string
  approval_status: string
  created: string
}

const HEADERS = [
  'Nome',
  'E-mail',
  'Perfil',
  'Departamento',
  'Grupo de Atendimento',
  'Status de Aprovação',
  'Data de Criação',
]

function escapeCsvCell(value: string): string {
  return `"${value.replace(/"/g, '""')}"`
}

export function formatDateTime(dateStr?: string): string {
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

export function usersToCSV(rows: UserExportRow[]): string {
  const dataRows = rows.map((r) =>
    [
      r.name || '',
      r.email || '',
      r.role || '',
      r.departments || '',
      r.service_groups || '',
      r.approval_status || '',
      formatDateTime(r.created),
    ]
      .map(escapeCsvCell)
      .join(','),
  )
  return [HEADERS.map(escapeCsvCell).join(','), ...dataRows].join('\r\n')
}

export function downloadUsersCSV(rows: UserExportRow[], filename = 'usuarios.csv'): void {
  const csv = '\uFEFF' + usersToCSV(rows)
  const blob = new Blob([csv], { type: 'text/csv;charset=utf-8;' })
  const url = URL.createObjectURL(blob)
  const link = document.createElement('a')
  link.href = url
  link.download = filename
  link.click()
  URL.revokeObjectURL(url)
}

export function downloadUsersPDF(rows: UserExportRow[], title = 'Lista de Usuários'): void {
  const tableRows = rows
    .map(
      (r) =>
        `<tr><td>${r.name || ''}</td><td>${r.email || ''}</td><td>${r.role || ''}</td><td>${r.departments || ''}</td><td>${r.service_groups || ''}</td><td>${r.approval_status || ''}</td><td>${formatDateTime(r.created)}</td></tr>`,
    )
    .join('')

  const html = `
    <h1>${title}</h1>
    <p>Total: ${rows.length} usuário(s)</p>
    <table>
      <thead><tr>${HEADERS.map((h) => `<th>${h}</th>`).join('')}</tr></thead>
      <tbody>${tableRows}</tbody>
    </table>
  `
  downloadPDF(html, title)
}
