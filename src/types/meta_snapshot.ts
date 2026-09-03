export type AssessmentType = 'individual' | 'team'
export type TargetSource = 'individual' | 'global'
export type MetaStatus = 'atingiu' | 'perto' | 'abaixo'

export interface MetaSnapshotRecord {
  id: string
  collectionId: string
  collectionName: string
  user_id: string
  year: number
  month: number // 1..12
  period_label: string // ex: "Agosto de 2026"
  month_year: string // ex: "2026-08"
  user_name?: string
  user_role?: string
  assessment_type: AssessmentType
  team_members_count?: number
  // Números realizados apurados
  total_attendance: number
  resolved_attendance: number
  resolution_rate: number
  avg_duration_minutes: number
  avoidable_count?: number
  avoidable_rate?: number
  reopen_count?: number
  reopen_rate?: number
  auto_categorized_count?: number
  auto_categorized_rate?: number
  categorization_accuracy?: number
  avg_satisfaction_score?: number
  // Metas esperadas
  target_attendance: number
  target_min_resolution_rate: number
  target_avg_response_time?: number
  target_auto_categorization?: number
  target_min_satisfaction?: number
  target_source?: TargetSource
  // Atingimento
  attendance_achievement_pct: number
  hit_attendance: boolean
  hit_resolution: boolean
  hit_overall: boolean
  attendance_status: MetaStatus
  resolution_status: MetaStatus
  overall_status: MetaStatus
  snapshot_at?: string
  details?: Record<string, any> | string
  created: string
  updated: string
}
