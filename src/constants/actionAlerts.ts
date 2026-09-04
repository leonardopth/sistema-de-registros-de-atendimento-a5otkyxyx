/**
 * Constantes e limites configuráveis para Alertas de Ação Automáticos
 * Frente C1 do plano de fase final:
 * - Backlog envelhecido (> 2h atenção, > 24h crítico com escalada à gerência)
 * - TFR estourado (> 15 min padrão configurável)
 * - Projeção de meta do mês em risco (< 70% da meta)
 */

export const ACTION_ALERT_THRESHOLDS = {
  // Limites de backlog na fila em minutos
  BACKLOG_WARNING_MINUTES: 120, // 2 horas
  BACKLOG_CRITICAL_MINUTES: 1440, // 24 horas

  // TFR padrão em minutos (caso não haja sobrescrita em global_targets ou user_targets)
  DEFAULT_TFR_TARGET_MINUTES: 15,

  // Percentual mínimo de projeção de meta de atendimentos no fim do mês
  PROJECTION_RISK_PCT: 70, // < 70% indica meta em risco
} as const

export type ActionAlertCategory =
  | 'backlog_warning'
  | 'backlog_critical'
  | 'tfr_breach'
  | 'projection_risk'

export type ActionAlertSeverity = 'warning' | 'critical'

export interface ActionAlertItem {
  id: string
  category: ActionAlertCategory
  severity: ActionAlertSeverity
  title: string
  description: string
  responsibleName?: string
  responsibleId?: string
  serviceRecordId?: string
  link: string
  badgeLabel: string
  timestamp?: string
  meta?: {
    diffMinutes?: number
    tfrMinutes?: number
    tfrLimit?: number
    projectedPct?: number
    projectedTotal?: number
    target?: number
  }
}
