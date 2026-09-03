import pb from '@/lib/pocketbase/client'

export interface ExecutiveReportMetrics {
  total: number
  prevTotal?: number
  totalDeltaPct?: number
  avgTma: number
  prevAvgTma?: number
  tmaDeltaPct?: number
  avgTfr: number
  prevAvgTfr?: number
  tfrDeltaPct?: number
  tfrCompliancePct: number
  avoidableCount: number
  avoidablePct: number
  avoidableDeltaPp?: number
  reopenCount: number
  reopenRate: number
  reopenDeltaPp?: number
}

export interface ExecutiveReportTargets {
  totalConsultants: number
  hitAttendanceCount: number
  missAttendanceCount: number
  hitResolutionCount: number
  missResolutionCount: number
}

export interface ExecutiveReportConsultantItem {
  userId: string
  name: string
  total: number
  resolved: number
  target: number
  minResolution: number
  resolutionRate: number
  attendancePct: number
}

export interface ExecutiveReportReasonGrowth {
  reason: string
  currentCount: number
  prevCount: number
  diff: number
  growthPct: number
}

export interface ExecutiveMonthlyReportData {
  targetYear: number
  targetMonth: number
  periodLabel: string
  prevPeriodLabel: string
  defaultTfrTarget: number
  defaultMonthlyTarget: number
  defaultMinResolution: number
  metrics: ExecutiveReportMetrics
  targets: ExecutiveReportTargets
  top5: ExecutiveReportConsultantItem[]
  bottom5: ExecutiveReportConsultantItem[]
  topGrowingReasons: ExecutiveReportReasonGrowth[]
}

export interface SendExecutiveReportResponse {
  success: boolean
  periodLabel: string
  sentCount: number
  totalRecipients: number
  errors: Array<{ email: string; error: string }>
  metrics?: ExecutiveReportMetrics
  targets?: ExecutiveReportTargets
  top5?: ExecutiveReportConsultantItem[]
  bottom5?: ExecutiveReportConsultantItem[]
  topGrowingReasons?: ExecutiveReportReasonGrowth[]
}

/**
 * Obtém os dados consolidados pré-calculados do relatório executivo mensal (mês alvo ou padrão = mês anterior).
 */
export async function getExecutiveMonthlyReportData(
  year?: number,
  month?: number,
): Promise<{ success: boolean; report: ExecutiveMonthlyReportData }> {
  const params: Record<string, string> = {}
  if (year) params.year = String(year)
  if (month) params.month = String(month)

  const searchParams = new URLSearchParams(params).toString()
  const path = `/backend/v1/reports/executive-monthly-data${searchParams ? `?${searchParams}` : ''}`

  return pb.send(path, {
    method: 'GET',
  })
}

/**
 * Dispara manualmente o envio por e-mail do relatório executivo mensal para a liderança.
 */
export async function sendExecutiveMonthlyReport(
  year?: number,
  month?: number,
): Promise<SendExecutiveReportResponse> {
  return pb.send('/backend/v1/reports/executive-monthly-send', {
    method: 'POST',
    body: {
      year,
      month,
    },
  })
}
