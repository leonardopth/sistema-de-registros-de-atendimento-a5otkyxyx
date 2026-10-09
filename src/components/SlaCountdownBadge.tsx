import React from 'react'
import { Badge } from '@/components/ui/badge'
import { Clock, AlertTriangle, AlertCircle, CheckCircle2 } from 'lucide-react'

export interface SlaCountdownProps {
  deadline?: string | null
  status?: string
  priority?: string
  className?: string
  showIcon?: boolean
}

export interface SlaStatusInfo {
  state: 'ok' | 'warning' | 'breached' | 'resolved'
  label: string
  hoursRemaining: number
  isBreached: boolean
  badgeClass: string
  iconColor: string
}

export function computeSlaStatus(deadline?: string | null, status?: string): SlaStatusInfo {
  if (status === 'Resolvido') {
    return {
      state: 'resolved',
      label: 'Atendido',
      hoursRemaining: 0,
      isBreached: false,
      badgeClass: 'bg-emerald-50 text-emerald-700 border-emerald-300',
      iconColor: 'text-emerald-600',
    }
  }

  if (!deadline) {
    return {
      state: 'ok',
      label: 'SLA Ativo',
      hoursRemaining: 0,
      isBreached: false,
      badgeClass: 'bg-slate-100 text-slate-600 border-slate-300',
      iconColor: 'text-slate-500',
    }
  }

  const deadlineDate = new Date(deadline)
  const now = new Date()
  const diffMs = deadlineDate.getTime() - now.getTime()
  const diffMins = Math.round(diffMs / 60000)
  const diffHours = Math.round((diffMs / 3600000) * 10) / 10

  // Se vencido ou status explicitamente Escalado
  if (diffMs <= 0 || status === 'Escalado') {
    const overdueMins = Math.abs(diffMins)
    const overdueHours = Math.floor(overdueMins / 60)
    const overdueRestMins = overdueMins % 60
    const overdueLabel =
      overdueHours > 0
        ? `Estourado há ${overdueHours}h${overdueRestMins > 0 ? ` ${overdueRestMins}m` : ''}`
        : `Estourado há ${overdueMins}m`

    return {
      state: 'breached',
      label: overdueLabel,
      hoursRemaining: diffHours,
      isBreached: true,
      badgeClass: 'bg-rose-100 text-rose-800 border-rose-300 animate-pulse font-bold',
      iconColor: 'text-rose-600',
    }
  }

  // Se faltam menos de 60 minutos (Atenção / Amarelo)
  if (diffMins <= 60) {
    return {
      state: 'warning',
      label: `Resta ${diffMins} min`,
      hoursRemaining: diffHours,
      isBreached: false,
      badgeClass: 'bg-amber-100 text-amber-900 border-amber-300 font-bold',
      iconColor: 'text-amber-600',
    }
  }

  // Verde (Tempo confortável)
  const hours = Math.floor(diffMins / 60)
  const mins = diffMins % 60
  return {
    state: 'ok',
    label: mins > 0 ? `Resta ${hours}h ${mins}m` : `Resta ${hours}h`,
    hoursRemaining: diffHours,
    isBreached: false,
    badgeClass: 'bg-emerald-50 text-emerald-800 border-emerald-300 font-semibold',
    iconColor: 'text-emerald-600',
  }
}

export function SlaCountdownBadge({
  deadline,
  status,
  className = '',
  showIcon = true,
}: SlaCountdownProps) {
  const info = computeSlaStatus(deadline, status)

  return (
    <Badge
      variant="outline"
      className={`inline-flex items-center gap-1 text-[11px] px-2 py-0.5 rounded transition-all whitespace-nowrap ${info.badgeClass} ${className}`}
      title={
        deadline
          ? `Prazo de SLA: ${new Date(deadline).toLocaleString('pt-BR')}`
          : 'Prazo não definido'
      }
    >
      {showIcon && (
        <>
          {info.state === 'breached' ? (
            <AlertTriangle className={`h-3 w-3 shrink-0 ${info.iconColor}`} />
          ) : info.state === 'warning' ? (
            <AlertCircle className={`h-3 w-3 shrink-0 ${info.iconColor}`} />
          ) : info.state === 'resolved' ? (
            <CheckCircle2 className={`h-3 w-3 shrink-0 ${info.iconColor}`} />
          ) : (
            <Clock className={`h-3 w-3 shrink-0 ${info.iconColor}`} />
          )}
        </>
      )}
      <span>{info.label}</span>
    </Badge>
  )
}
