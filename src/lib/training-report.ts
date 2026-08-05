import type { ServiceRecord, ClientRecord, ContactReason } from '@/types/service_record'

export interface TrainingReportData {
  agencyName: string
  city: string
  state: string
  totalRecords: number
  topReasons: { reason: string; count: number; percentage: number }[]
  avoidableRate: number
  previousAvoidableRate: number
  trend: 'up' | 'down' | 'stable'
  recommendedTutorials: { title: string; summary: string }[]
  checklist: string[]
}

export function computeTrainingReport(
  records: ServiceRecord[],
  client?: ClientRecord,
): TrainingReportData {
  const now = new Date()
  const thirtyAgo = new Date(now.getTime() - 30 * 86400000)
  const sixtyAgo = new Date(now.getTime() - 60 * 86400000)

  const recent = records.filter((r) => new Date(r.created) >= thirtyAgo)
  const older = records.filter(
    (r) => new Date(r.created) >= sixtyAgo && new Date(r.created) < thirtyAgo,
  )

  const calcRate = (list: ServiceRecord[]) => {
    if (list.length === 0) return 0
    return Math.round((list.filter((r) => r.avoidable_contact).length / list.length) * 100)
  }

  const avoidableRate = calcRate(recent)
  const previousAvoidableRate = calcRate(older)
  const trend: 'up' | 'down' | 'stable' =
    avoidableRate > previousAvoidableRate
      ? 'up'
      : avoidableRate < previousAvoidableRate
        ? 'down'
        : 'stable'

  const reasonMap = new Map<string, number>()
  for (const r of records) {
    const reason = r.contact_reason || 'outros'
    reasonMap.set(reason, (reasonMap.get(reason) || 0) + 1)
  }
  const topReasons = Array.from(reasonMap.entries())
    .map(([reason, count]) => ({
      reason,
      count,
      percentage: records.length > 0 ? Math.round((count / records.length) * 100) : 0,
    }))
    .sort((a, b) => b.count - a.count)
    .slice(0, 5)

  const checklist = [
    ...topReasons
      .slice(0, 3)
      .map((r) => `Treinamento sobre "${r.reason}" (${r.count} ocorrências)`),
    'Distribuir tutoriais do Knowledge Base para todos os agentes',
    'Revisão do processo de triagem de contatos evitáveis',
    'Atualização e treinamento no sistema de reservas (RF)',
    'Avaliação prática dos agentes após treinamento',
  ]

  return {
    agencyName: client?.company || records[0]?.client_company || '—',
    city: client?.city || '—',
    state: client?.state || '—',
    totalRecords: records.length,
    topReasons,
    avoidableRate,
    previousAvoidableRate,
    trend,
    recommendedTutorials: [],
    checklist,
  }
}

export function generateReportHTML(data: TrainingReportData): string {
  const trendIcon = data.trend === 'down' ? '↓' : data.trend === 'up' ? '↑' : '→'
  const trendColor = data.trend === 'down' ? '#16a34a' : data.trend === 'up' ? '#dc2626' : '#64748b'
  const trendLabel =
    data.trend === 'down' ? 'Melhorando' : data.trend === 'up' ? 'Piorando' : 'Estável'

  return `<h1>Relatório de Treinamento</h1>
<h2>${data.agencyName}</h2>
<div class="info-grid">
  <div><strong>Cidade:</strong> ${data.city}</div>
  <div><strong>Estado:</strong> ${data.state}</div>
  <div><strong>Total de Atendimentos:</strong> ${data.totalRecords}</div>
  <div><strong>Taxa de Evitáveis:</strong> ${data.avoidableRate}% <span style="color:${trendColor}">${trendIcon} ${trendLabel}</span> <span style="font-size:9px;color:#94a3b8">(anterior: ${data.previousAvoidableRate}%)</span></div>
</div>
<h2>Top 5 Motivos de Contato</h2>
<table><thead><tr><th>Motivo</th><th>Ocorrências</th><th>%</th></tr></thead><tbody>
${data.topReasons.map((r) => `<tr><td>${r.reason}</td><td>${r.count}</td><td>${r.percentage}%</td></tr>`).join('')}
</tbody></table>
<h2>Checklist de Aprendizado</h2>
<ul class="checklist">
${data.checklist.map((c) => `<li>☐ ${c}</li>`).join('')}
</ul>
<p style="margin-top:24px;font-size:9px;color:#94a3b8">Gerado em ${new Date().toLocaleString('pt-BR')}</p>`
}

export function printTrainingReport(data: TrainingReportData): void {
  const win = window.open('', '_blank')
  if (!win) return
  win.document.write(`<!DOCTYPE html><html lang="pt-BR"><head><meta charset="UTF-8">
<title>Relatório de Treinamento - ${data.agencyName}</title>
<style>
*{margin:0;padding:0;box-sizing:border-box}
body{font-family:Arial,Helvetica,sans-serif;padding:30px;color:#1e293b;max-width:210mm;margin:0 auto}
h1{font-size:20px;margin-bottom:4px;color:#0f172a}
h2{font-size:14px;margin-top:20px;margin-bottom:8px;color:#334155;border-bottom:2px solid #e2e8f0;padding-bottom:4px}
table{width:100%;border-collapse:collapse;font-size:11px;margin-bottom:12px}
th,td{border:1px solid #cbd5e1;padding:5px 8px;text-align:left}
th{background:#f1f5f9;font-weight:bold}
.info-grid{display:grid;grid-template-columns:1fr 1fr;gap:6px;margin:12px 0;font-size:12px}
.checklist{list-style:none;padding-left:0;font-size:12px}
.checklist li{padding:4px 0;border-bottom:1px solid #f1f5f9}
@media print{body{padding:15mm}@page{margin:1cm;size:A4}}
</style></head><body>${generateReportHTML(data)}</body></html>`)
  win.document.close()
  win.focus()
  setTimeout(() => win.print(), 300)
}
