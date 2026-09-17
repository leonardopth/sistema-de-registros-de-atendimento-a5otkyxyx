import { UserRecord } from './service_record'

export type HourBankType = 'credito' | 'debito'
export type HourBankSource = 'manual' | 'lg_sync' | 'sistema'

export interface HourBankEntryRecord {
  id: string
  user_id: string
  date: string
  hours: number
  type: HourBankType
  description: string
  source?: HourBankSource
  external_id?: string
  created_by?: string
  created: string
  updated: string
  expand?: {
    user_id?: UserRecord
    created_by?: UserRecord
  }
}

export type AbsenceReason = 'Férias' | 'Banco de horas' | 'Dayoff' | 'Atestado'
export type AbsenceStatus =
  | 'Pendente'
  | 'Aprovada'
  | 'Rejeitada'
  | 'Cancelada'
  | 'agendada'
  | 'ativa'
  | 'encerrada'
  | 'cancelada'
export type AbsenceSource = 'manual' | 'lg_sync'

export interface AbsenceRecord {
  id: string
  user_id: string
  reason: AbsenceReason
  start_date: string
  end_date: string
  status?: AbsenceStatus
  notes?: string
  source?: AbsenceSource
  external_id?: string
  coverage_checked?: boolean
  created_by?: string
  approved_by?: string
  approved_at?: string
  rejection_reason?: string
  approval_notes?: string
  created: string
  updated: string
  expand?: {
    user_id?: UserRecord
    created_by?: UserRecord
    approved_by?: UserRecord
  }
}

export interface AbsenceAlertConfigRecord {
  id: string
  hour_bank_limit_hours: number
  hour_bank_negative_limit_hours?: number
  vacation_warning_days_before_expiry: number
  vacation_ideal_window_start_months: number
  vacation_ideal_window_end_months: number
  min_interjornada_hours: number
  max_consecutive_work_days: number
  max_team_absence_pct: number
  require_absence_approval?: boolean
  lg_integration_enabled?: boolean
  lg_api_base_url?: string
  updated_by?: string
  created: string
  updated: string
  expand?: {
    updated_by?: UserRecord
  }
}

export interface UserHourBankSummary {
  userId: string
  userName: string
  role: string
  serviceGroups: string[]
  bases: string[]
  totalCredited: number
  totalDebited: number
  balanceHours: number
  entriesCount: number
  exceedsPositiveLimit: boolean
  exceedsNegativeLimit: boolean
  lastEntryDate?: string
}

export interface VacationPeriodStatus {
  userId: string
  userName: string
  hireDate: string
  daysSinceHire: number
  isAquisitivoCompleted: boolean
  daysUntilExpiry: number
  isExpired: boolean
  isExpiringSoon: boolean
  isInIdealWindow: boolean
  hasUpcomingVacation: boolean
  upcomingVacation?: AbsenceRecord
  pastVacationsCount: number
}

export interface CoverageConflictCheck {
  date: string
  teamTotalCount: number
  absentCount: number
  absencePct: number
  conflictingUsers: {
    userId: string
    userName: string
    reason: AbsenceReason
  }[]
  hasConflict: boolean
  maxAllowedAbsencePct: number
}

export interface InterjornadaViolation {
  userId: string
  userName: string
  previousDate: string
  previousEndTime: string
  nextDate: string
  nextStartTime: string
  restHours: number
  minRequiredHours: number
}

export interface ConsecutiveWorkDaysViolation {
  userId: string
  userName: string
  consecutiveDaysCount: number
  startDate: string
  endDate: string
  maxAllowed: number
}
