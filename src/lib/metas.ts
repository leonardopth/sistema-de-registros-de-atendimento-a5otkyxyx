import type { UserRecord, GlobalTargetRecord, ServiceRecord } from '@/types/service_record'
import type { UserTargetRecord } from '@/services/user-targets'
import { TIMEZONE } from '@/lib/timezone'

/** Funções/papéis com permissão de gestão sobre metas. */
export const MANAGER_ROLES = ['Gerentes', 'Supervisores', 'Líderes', 'Master']

export function canManageTargets(role?: string, masterAccess?: boolean): boolean {
  if (!role) return false
  if (MANAGER_ROLES.includes(role)) return true
  return masterAccess === true
}

export type Status = 'atingiu' | 'perto' | 'abaixo'

export const STATUS_STYLES: Record<Status, { bar: string; badge: string; label: string }> = {
  atingiu: {
    bar: 'bg-emerald-500',
    badge: 'bg-emerald-100 text-emerald-700',
    label: 'Atingiu',
  },
  perto: {
    bar: 'bg-amber-500',
    badge: 'bg-amber-100 text-amber-700',
    label: 'Perto',
  },
  abaixo: {
    bar: 'bg-rose-500',
    badge: 'bg-rose-100 text-rose-700',
    label: 'Abaixo',
  },
}

export function getAttendanceStatus(real: number, target: number): Status {
  if (target <= 0) return 'atingiu'
  const ratio = real / target
  if (ratio >= 1) return 'atingiu'
  if (ratio >= 0.8) return 'perto'
  return 'abaixo'
}

export function getResolutionStatus(realRate: number, minRate: number): Status {
  if (minRate <= 0) return 'atingiu'
  if (realRate >= minRate) return 'atingiu'
  if (realRate >= minRate - 10) return 'perto'
  return 'abaixo'
}

export function getOverallStatus(a: Status, r: Status): Status {
  if (a === 'atingiu' && r === 'atingiu') return 'atingiu'
  if (a === 'abaixo' || r === 'abaixo') return 'abaixo'
  return 'perto'
}

export interface EffectiveTarget {
  /** 'individual' = meta própria do colaborador; 'global' = meta padrão herdada. */
  source: 'individual' | 'global'
  monthly_attendance_target: number
  min_resolution_rate: number
  avg_response_time_target: number
  auto_categorization_target: number
  targetRecord?: UserTargetRecord
}

/**
 * Resolve a meta efetiva de um colaborador (usuário interno): prevalece individual sobre global.
 */
export function resolveEffectiveTarget(
  userId: string,
  targets: UserTargetRecord[],
  global: GlobalTargetRecord,
): EffectiveTarget {
  const individual = targets.find((t) => t.user === userId)
  if (individual) {
    return {
      source: 'individual',
      monthly_attendance_target:
        individual.monthly_attendance_target ?? global.monthly_attendance_target,
      min_resolution_rate: individual.min_resolution_rate ?? global.min_resolution_rate,
      avg_response_time_target: individual.avg_response_time_target ?? 15,
      auto_categorization_target: individual.auto_categorization_target ?? 80,
      targetRecord: individual,
    }
  }
  return {
    source: 'global',
    monthly_attendance_target: global.monthly_attendance_target,
    min_resolution_rate: global.min_resolution_rate,
    avg_response_time_target: 15,
    auto_categorization_target: 80,
  }
}

export interface UserRealStats {
  total: number
  resolved: number
  rate: number
  avgDuration: number // minutos
  avoidableCount: number
  avoidableRate: number
}

/** Agrupa estatísticas reais por colaborador/usuário para um mês/ano específicos (GMT-3). */
export function computeStatsByUserForMonth(
  records: ServiceRecord[],
  year: number,
  month: number, // 0-based
): Map<string, UserRealStats> {
  const map = new Map<string, UserRealStats>()
  for (const r of records) {
    const uid = r.assigned_user || r.user_id
    if (!uid) continue
    const parts = getGMT3MonthParts(r.created)
    if (!parts) continue
    if (parts.year !== year || parts.month !== month) continue

    const cur = map.get(uid) || {
      total: 0,
      resolved: 0,
      rate: 0,
      avgDuration: 0,
      avoidableCount: 0,
      avoidableRate: 0,
    }

    cur.total += 1
    if (r.status === 'Concluído') cur.resolved += 1
    if (r.avoidable_contact) cur.avoidableCount += 1
    cur.avgDuration += r.duration || 0

    map.set(uid, cur)
  }

  for (const [, v] of map) {
    v.rate = v.total > 0 ? Math.round((v.resolved / v.total) * 100) : 0
    v.avoidableRate = v.total > 0 ? Math.round((v.avoidableCount / v.total) * 100) : 0
    v.avgDuration = v.total > 0 ? Math.round(v.avgDuration / v.total) : 0
  }
  return map
}

/** Estatísticas reais do mês corrente por colaborador (GMT-3). */
export function computeCurrentMonthStats(records: ServiceRecord[]): Map<string, UserRealStats> {
  const now = currentGMT3Date()
  return computeStatsByUserForMonth(records, now.year, now.month)
}

export interface MonthParts {
  year: number
  month: number // 0-based
}

/** Extrai ano/mês (0-based) de uma string ISO usando o fuso GMT-3. */
export function getGMT3MonthParts(isoString: string | undefined): MonthParts | null {
  if (!isoString) return null
  const d = new Date(isoString)
  if (isNaN(d.getTime())) return null
  const parts = new Intl.DateTimeFormat('en-CA', {
    timeZone: TIMEZONE,
    year: 'numeric',
    month: '2-digit',
  }).formatToParts(d)
  const y = parseInt(parts.find((p) => p.type === 'year')?.value || '0', 10)
  const m = parseInt(parts.find((p) => p.type === 'month')?.value || '0', 10)
  if (!y || !m) return null
  return { year: y, month: m - 1 }
}

/** Ano/mês corrente em GMT-3. */
export function currentGMT3Date(): MonthParts {
  return getGMT3MonthParts(new Date().toISOString()) || { year: 1970, month: 0 }
}

/** Nome do mês em pt-BR. */
export function monthLabel(year: number, month: number): string {
  const d = new Date(Date.UTC(year, month, 1, 12, 0, 0))
  return d.toLocaleDateString('pt-BR', { month: 'long', year: 'numeric', timeZone: TIMEZONE })
}

export interface HistoryRow {
  year: number
  month: number // 0-based
  label: string
  attendanceTarget: number
  minResolutionRate: number
  real: UserRealStats
  attendanceStatus: Status
  resolutionStatus: Status
  overall: Status
  hit: boolean
}

/**
 * Gera o histórico mensal (últimos N meses) para um colaborador interno.
 */
export function buildUserHistory(
  userId: string,
  records: ServiceRecord[],
  effective: EffectiveTarget,
  monthsBack = 12,
): HistoryRow[] {
  const out: HistoryRow[] = []
  const now = currentGMT3Date()
  for (let i = 0; i < monthsBack; i++) {
    const d = new Date(Date.UTC(now.year, now.month - i, 1, 12, 0, 0))
    const year = d.getUTCFullYear()
    const month = d.getUTCMonth()
    const statsMap = computeStatsByUserForMonth(records, year, month)
    const real = statsMap.get(userId) || {
      total: 0,
      resolved: 0,
      rate: 0,
      avgDuration: 0,
      avoidableCount: 0,
      avoidableRate: 0,
    }
    const attendanceStatus = getAttendanceStatus(real.total, effective.monthly_attendance_target)
    const resolutionStatus = getResolutionStatus(real.rate, effective.min_resolution_rate)
    const overall = getOverallStatus(attendanceStatus, resolutionStatus)
    out.push({
      year,
      month,
      label: monthLabel(year, month),
      attendanceTarget: effective.monthly_attendance_target,
      minResolutionRate: effective.min_resolution_rate,
      real,
      attendanceStatus,
      resolutionStatus,
      overall,
      hit: attendanceStatus !== 'abaixo' && resolutionStatus !== 'abaixo',
    })
  }
  return out
}

export interface PerformanceAlert {
  userId: string
  userName: string
  userRole?: string
  type: 'attendance' | 'resolution'
  metricLabel: string
  realValue: number
  expectedValue: number
  realDisplay: string
  expectedDisplay: string
  ratio: number
}

/**
 * Calcula alertas de desempenho para colaboradores:
 * - Atendimentos: abaixo de 50% da meta do mês corrente.
 * - Resolução: taxa real > 20 p.p. abaixo do mínimo.
 */
export function computePerformanceAlerts(
  users: UserRecord[],
  targets: UserTargetRecord[],
  global: GlobalTargetRecord,
  records: ServiceRecord[],
): PerformanceAlert[] {
  const stats = computeCurrentMonthStats(records)
  const alerts: PerformanceAlert[] = []
  for (const u of users) {
    const eff = resolveEffectiveTarget(u.id, targets, global)
    const real = stats.get(u.id) || {
      total: 0,
      resolved: 0,
      rate: 0,
      avgDuration: 0,
      avoidableCount: 0,
      avoidableRate: 0,
    }

    if (eff.monthly_attendance_target > 0) {
      const ratio = real.total / eff.monthly_attendance_target
      if (ratio < 0.5) {
        alerts.push({
          userId: u.id,
          userName: u.name,
          userRole: u.role,
          type: 'attendance',
          metricLabel: 'Atendimentos',
          realValue: real.total,
          expectedValue: eff.monthly_attendance_target,
          realDisplay: String(real.total),
          expectedDisplay: String(eff.monthly_attendance_target),
          ratio,
        })
      }
    }

    if (eff.min_resolution_rate > 0 && real.total > 0) {
      const diff = eff.min_resolution_rate - real.rate
      if (diff > 20) {
        alerts.push({
          userId: u.id,
          userName: u.name,
          userRole: u.role,
          type: 'resolution',
          metricLabel: 'Taxa de resolução',
          realValue: real.rate,
          expectedValue: eff.min_resolution_rate,
          realDisplay: `${real.rate}%`,
          expectedDisplay: `${eff.min_resolution_rate}%`,
          ratio: diff,
        })
      }
    }
  }

  alerts.sort((a, b) => {
    if (a.type !== b.type) return a.type === 'resolution' ? -1 : 1
    return a.ratio - b.ratio
  })
  return alerts
}

/** Linha de comparativo para exportação CSV/PDF de colaboradores. */
export interface ComparisonRow {
  userName: string
  userRole?: string
  source: 'individual' | 'global'
  attendanceTarget: number
  realAttendance: number
  attendancePct: number
  minResolutionRate: number
  realResolutionRate: number
  avgDuration: number
  attendanceStatus: Status
  resolutionStatus: Status
  overall: Status
}

export function buildComparisonRows(
  users: UserRecord[],
  targets: UserTargetRecord[],
  global: GlobalTargetRecord,
  records: ServiceRecord[],
): ComparisonRow[] {
  const stats = computeCurrentMonthStats(records)
  return users
    .map((u) => {
      const eff = resolveEffectiveTarget(u.id, targets, global)
      const real = stats.get(u.id) || {
        total: 0,
        resolved: 0,
        rate: 0,
        avgDuration: 0,
        avoidableCount: 0,
        avoidableRate: 0,
      }
      const attendanceStatus = getAttendanceStatus(real.total, eff.monthly_attendance_target)
      const resolutionStatus = getResolutionStatus(real.rate, eff.min_resolution_rate)
      const overall = getOverallStatus(attendanceStatus, resolutionStatus)
      const attendancePct =
        eff.monthly_attendance_target > 0
          ? Math.round((real.total / eff.monthly_attendance_target) * 100)
          : 0
      return {
        userName: u.name,
        userRole: u.role,
        source: eff.source,
        attendanceTarget: eff.monthly_attendance_target,
        realAttendance: real.total,
        attendancePct,
        minResolutionRate: eff.min_resolution_rate,
        realResolutionRate: real.rate,
        avgDuration: real.avgDuration,
        attendanceStatus,
        resolutionStatus,
        overall,
      }
    })
    .sort((a, b) => a.userName.localeCompare(b.userName))
}

export const STATUS_LABEL: Record<Status, string> = {
  atingiu: 'Atingiu',
  perto: 'Perto',
  abaixo: 'Abaixo',
}
