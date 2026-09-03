import { ServiceRecord } from '@/types/service_record'

/**
 * Verifica se um atendimento foi reaberto.
 * Considera:
 * - is_reopened === true
 * - reopen_count > 0
 * - reopen_justification preenchida
 */
export function isRecordReopened(r: ServiceRecord | null | undefined): boolean {
  if (!r) return false
  if (r.is_reopened === true) return true
  if (typeof r.reopen_count === 'number' && r.reopen_count > 0) return true
  if (typeof r.reopen_justification === 'string' && r.reopen_justification.trim() !== '')
    return true
  return false
}

/**
 * Calcula a Taxa de Reabertura (%) para uma lista de atendimentos.
 * Fórmula: (atendimentos reabertos / total de atendimentos) * 100
 * (ou 0 se o total for 0).
 */
export function calculateReopenRate(records: ServiceRecord[]): {
  reopenedCount: number
  totalCount: number
  rate: number // percentual arredondado (0-100)
} {
  if (!Array.isArray(records) || records.length === 0) {
    return { reopenedCount: 0, totalCount: 0, rate: 0 }
  }

  const reopened = records.filter(isRecordReopened)
  const rate = Math.round((reopened.length / records.length) * 100)

  return {
    reopenedCount: reopened.length,
    totalCount: records.length,
    rate,
  }
}
