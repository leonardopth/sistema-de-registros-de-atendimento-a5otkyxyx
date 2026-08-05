function escapeXml(value: string): string {
  return value
    .replace(/&/g, '&amp;')
    .replace(/</g, '&lt;')
    .replace(/>/g, '&gt;')
    .replace(/"/g, '&quot;')
    .replace(/'/g, '&apos;')
}

export function generateExcelXML(
  headers: string[],
  rows: (string | number)[][],
  sheetName = 'Planilha1',
): string {
  const headerRow =
    headers.length > 0
      ? `<Row>${headers
          .map(
            (h) => `<Cell ss:StyleID="Header"><Data ss:Type="String">${escapeXml(h)}</Data></Cell>`,
          )
          .join('')}</Row>`
      : ''

  const dataRows = rows
    .map((row) => {
      const cells = row
        .map((cell) => {
          const type = typeof cell === 'number' ? 'Number' : 'String'
          const val = cell == null ? '' : String(cell)
          return `<Cell><Data ss:Type="${type}">${escapeXml(val)}</Data></Cell>`
        })
        .join('')
      return `<Row>${cells}</Row>`
    })
    .join('')

  return `<?xml version="1.0" encoding="UTF-8"?>
<?mso-application progid="Excel.Sheet"?>
<Workbook xmlns="urn:schemas-microsoft-com:office:spreadsheet"
 xmlns:ss="urn:schemas-microsoft-com:office:spreadsheet">
 <Styles>
  <Style ss:ID="Header"><Font ss:Bold="1"/><Interior ss:Color="#E0E0E0" ss:Pattern="Solid"/></Style>
 </Styles>
 <Worksheet ss:Name="${escapeXml(sheetName)}">
  <Table>${headerRow}${dataRows}</Table>
 </Worksheet>
</Workbook>`
}

export function downloadExcel(xml: string, filename: string): void {
  const blob = new Blob(['\uFEFF' + xml], {
    type: 'application/vnd.ms-excel;charset=utf-8;',
  })
  const url = URL.createObjectURL(blob)
  const link = document.createElement('a')
  link.href = url
  link.download = filename
  link.click()
  URL.revokeObjectURL(url)
}
