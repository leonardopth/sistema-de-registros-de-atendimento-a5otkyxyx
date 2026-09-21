import React, { useMemo } from 'react'
import { Link } from 'react-router-dom'
import { Card, CardHeader, CardTitle, CardContent } from '@/components/ui/card'
import { Progress } from '@/components/ui/progress'
import { Badge } from '@/components/ui/badge'
import { Button } from '@/components/ui/button'
import { Target, CheckCircle2, TrendingUp, ArrowRight, Award } from 'lucide-react'
import { ServiceRecord, UserRecord } from '@/types/service_record'
import { UserTargetRecord } from '@/services/user-targets'
import { DEFAULT_GLOBAL_TARGET } from '@/services/global-targets'
import type { GlobalTargetRecord } from '@/types/service_record'
import { resolveEffectiveTarget, getGMT3MonthParts, currentGMT3Date } from '@/lib/metas'

interface ConsultantTargetsWidgetProps {
  user: UserRecord | null
  records: ServiceRecord[]
  targets: UserTargetRecord[]
  globalTarget?: GlobalTargetRecord | null
  className?: string
}

export function ConsultantTargetsWidget({
  user,
  records,
  targets,
  globalTarget = null,
  className = '',
}: ConsultantTargetsWidgetProps) {
  const currentMonthDate = useMemo(() => currentGMT3Date(), [])

  // Metas vigentes para o consultor
  const effectiveTarget = useMemo(() => {
    const targetUserId = user?.id || ''
    const fallbackGlobal = globalTarget || DEFAULT_GLOBAL_TARGET
    return resolveEffectiveTarget(targetUserId, targets, fallbackGlobal)
  }, [user, targets, globalTarget])

  // Atendimentos do consultor no mês corrente
  const monthRecords = useMemo(() => {
    if (!user) return []
    return records.filter((r) => {
      const isMine = r && (r.assigned_user === user.id || r.user_id === user.id)
      if (!isMine) return false
      const parts = getGMT3MonthParts(r.created)
      if (!parts) return false
      return parts.year === currentMonthDate.year && parts.month === currentMonthDate.month
    })
  }, [records, user, currentMonthDate])

  const totalMonth = monthRecords.length
  const resolvedMonth = monthRecords.filter((r) => r.status === 'Concluído').length
  const resolutionRate = totalMonth > 0 ? Math.round((resolvedMonth / totalMonth) * 100) : 0

  const attendanceTarget = effectiveTarget.monthly_attendance_target || 100
  const minResolutionTarget = effectiveTarget.min_resolution_rate || 80

  const attendancePct = Math.min(100, Math.round((totalMonth / attendanceTarget) * 100))
  const attendanceRealPct = Math.round((totalMonth / attendanceTarget) * 100)

  // Cores de status
  const attendanceStatusColor =
    attendanceRealPct >= 100
      ? 'text-emerald-700 bg-emerald-50 border-emerald-200'
      : attendanceRealPct >= 70
        ? 'text-indigo-700 bg-indigo-50 border-indigo-200'
        : 'text-amber-700 bg-amber-50 border-amber-200'

  const resolutionStatusColor =
    resolutionRate >= minResolutionTarget
      ? 'text-emerald-700 bg-emerald-50 border-emerald-200'
      : resolutionRate >= minResolutionTarget - 10
        ? 'text-amber-700 bg-amber-50 border-amber-200'
        : 'text-rose-700 bg-rose-50 border-rose-200'

  return (
    <Card className={`border-slate-200 shadow-subtle ${className}`}>
      <CardHeader className="p-3.5 pb-2 border-b border-slate-100 flex flex-row items-center justify-between">
        <CardTitle className="text-sm font-bold text-slate-900 flex items-center gap-2">
          <Target className="h-4 w-4 text-indigo-600" />
          <span>Minhas Metas do Mês</span>
        </CardTitle>
        <Button
          asChild
          variant="ghost"
          size="sm"
          className="text-xs h-7 text-indigo-600 hover:text-indigo-700 hover:bg-indigo-50 p-1 px-2"
        >
          <Link to="/metas-desempenho">
            Ver detalhes <ArrowRight className="h-3 w-3 ml-1" />
          </Link>
        </Button>
      </CardHeader>

      <CardContent className="p-3.5 space-y-3.5">
        {/* Meta 1: Volume Mensal de Atendimentos */}
        <div className="space-y-1.5">
          <div className="flex items-center justify-between text-xs">
            <span className="font-semibold text-slate-700 flex items-center gap-1.5">
              <TrendingUp className="h-3.5 w-3.5 text-indigo-600" />
              Volume de Atendimentos:
            </span>
            <div className="flex items-center gap-1.5">
              <span className="font-extrabold text-slate-900">
                {totalMonth} / {attendanceTarget}
              </span>
              <Badge
                variant="outline"
                className={`text-[10px] py-0 px-1.5 ${attendanceStatusColor}`}
              >
                {attendanceRealPct}%
              </Badge>
            </div>
          </div>
          <Progress value={attendancePct} className="h-2 bg-slate-100" />
          <p className="text-[10px] text-slate-400">
            {totalMonth >= attendanceTarget
              ? '🎉 Parabéns! Meta de atendimentos atingida neste mês!'
              : `Faltam ${attendanceTarget - totalMonth} atendimentos para completar a meta mensal.`}
          </p>
        </div>

        {/* Meta 2: Taxa de Resolução */}
        <div className="space-y-1.5">
          <div className="flex items-center justify-between text-xs">
            <span className="font-semibold text-slate-700 flex items-center gap-1.5">
              <CheckCircle2 className="h-3.5 w-3.5 text-emerald-600" />
              Taxa de Resolução:
            </span>
            <div className="flex items-center gap-1.5">
              <span className="font-extrabold text-slate-900">
                {resolutionRate}%{' '}
                <span className="text-[11px] font-normal text-slate-400">
                  (mín. {minResolutionTarget}%)
                </span>
              </span>
              <Badge
                variant="outline"
                className={`text-[10px] py-0 px-1.5 ${resolutionStatusColor}`}
              >
                {resolutionRate >= minResolutionTarget ? 'Na Meta' : 'Abaixo'}
              </Badge>
            </div>
          </div>
          <Progress value={Math.min(100, resolutionRate)} className="h-2 bg-slate-100" />
          <p className="text-[10px] text-slate-400">
            {resolvedMonth} de {totalMonth} atendimentos concluídos com sucesso neste mês.
          </p>
        </div>
      </CardContent>
    </Card>
  )
}
