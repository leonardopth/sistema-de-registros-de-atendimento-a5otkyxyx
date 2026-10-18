import type { UserRecord } from '@/types/service_record'

export type WaiverStatus =
  | 'Pendente'
  | 'Em análise'
  | 'Standby'
  | 'Aprovada'
  | 'Negociada'
  | 'Recusada'

export type WaiverPriority = 'BAIXA' | 'MÉDIA' | 'ALTA'

export interface WaiverConfigRecord {
  id: string
  units: string[]
  approvers_latam: string[]
  approvers_afkl: string[]
  approvers_assistencia: string[]
  approvers_gol?: string[]
  approvers_aa?: string[]
  approvers_latam2?: string[]
  approvers_sky?: string[]
  approvers_default?: string[]
  airlines_config?: Record<string, unknown>
  updated_by?: string
  created: string
  updated: string
  expand?: {
    updated_by?: UserRecord
  }
}

export type WaiverBudgetStatus = 'Ativo' | 'Inativo' | 'Encerrado'

export interface WaiverBudgetRecord {
  id: string
  airline_key: string // 'latam' | 'afkl' | 'gol' | 'aa' | 'sky' | 'assistencia'
  airline_name?: string
  category: string
  period_label: string
  start_date?: string
  end_date?: string
  budget_amount: number
  used_amount: number
  currency: 'USD' | 'BRL' | 'EUR'
  unit?: string
  status: WaiverBudgetStatus
  notes?: string
  created_by?: string
  created: string
  updated: string
  expand?: {
    created_by?: UserRecord
  }
}

export interface WaiverRequestRecord {
  id: string
  airline_key: string
  airline_name: string
  request_type?: string
  unit: string
  gds_locator?: string
  airline_locator?: string
  pax_count?: number
  pax_name?: string
  amount?: number
  currency?: string
  priority?: WaiverPriority | string
  approver_name: string
  approver_id?: string
  status: WaiverStatus
  form_data: Record<string, any>
  requester: string
  reviewed_by?: string
  reviewed_at?: string
  review_notes?: string
  negotiated_amount?: number
  created: string
  updated: string
  expand?: {
    requester?: UserRecord
    reviewed_by?: UserRecord
    approver_id?: UserRecord
  }
}

export interface WaiverHistoryRecord {
  id: string
  waiver_request: string
  action: string
  previous_status?: string
  new_status?: string
  user: string
  notes?: string
  details?: Record<string, any>
  created: string
  updated: string
  expand?: {
    user?: UserRecord
  }
}

/**
 * Definição declarativa e extensível de campos de formulário dinâmico
 */
export type FieldType =
  | 'text'
  | 'number'
  | 'email'
  | 'select'
  | 'radio'
  | 'date'
  | 'textarea'
  | 'code_paste'

export interface DynamicFormField {
  name: string
  label: string
  type: FieldType
  required?: boolean
  onlyInt?: boolean
  placeholder?: string
  helperText?: string
  options?: { label: string; value: string }[] | string[]
  min?: number
  max?: number
  step?: number
  dependsOn?: {
    field: string
    condition: (val: any) => boolean
  }
  validation?: {
    customValidator?: (val: any, allValues: Record<string, any>) => string | null
  }
  gridCols?: 1 | 2 | 3 | 4
}

export interface AirlineFormConfig {
  key: string
  name: string
  airlineName: string
  iconName?: string
  logoBadge?: string
  active: boolean
  comingSoon?: boolean
  description: string
  rules: string[]
  fields: DynamicFormField[]
  approversKey:
    | 'approvers_latam'
    | 'approvers_afkl'
    | 'approvers_assistencia'
    | 'approvers_gol'
    | 'approvers_aa'
    | 'approvers_latam2'
    | 'approvers_sky'
    | 'approvers_default'
}
