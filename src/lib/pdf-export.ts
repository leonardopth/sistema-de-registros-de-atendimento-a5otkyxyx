export function downloadPDF(htmlContent: string, title = 'Relatório'): void {
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
  h1 { font-size: 18px; margin-bottom: 12px; color: #0f172a; }
  h2 { font-size: 13px; margin-top: 16px; margin-bottom: 6px; color: #334155; border-bottom: 1px solid #e2e8f0; padding-bottom: 3px; }
  table { width: 100%; border-collapse: collapse; font-size: 9px; margin-bottom: 12px; }
  th, td { border: 1px solid #cbd5e1; padding: 3px 5px; text-align: left; vertical-align: top; }
  th { background: #f1f5f9; font-weight: bold; }
  tr:nth-child(even) td { background: #f8fafc; }
  .stat-grid { display: grid; grid-template-columns: repeat(2, 1fr); gap: 8px; margin: 10px 0; }
  .stat-item { padding: 8px 10px; border: 1px solid #e2e8f0; border-radius: 6px; background: #f8fafc; }
  .stat-label { font-size: 10px; color: #64748b; text-transform: uppercase; }
  .stat-value { font-size: 18px; font-weight: bold; color: #0f172a; }
  @media print { body { padding: 10px; } @page { margin: 1cm; } }
</style>
</head>
<body>${htmlContent}</body>
</html>`)
  win.document.close()
  win.focus()
  setTimeout(() => win.print(), 300)
}
