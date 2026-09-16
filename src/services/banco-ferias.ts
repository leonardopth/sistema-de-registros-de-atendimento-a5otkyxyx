import pb from '@/lib/pocketbase/client'
import { HourBankEntryRecord, AbsenceRecord, AbsenceAlertConfigRecord } from '@/types/banco-ferias'

export const DEFAULT_ABSENCE_ALERT_CONFIG: Omit<
  AbsenceAlertConfigRecord,
  'id' | 'created' | 'updated'
> = {
  hour_bank_limit_hours: 10,
  hour_bank_negative_limit_hours: 10,
  vacation_warning_days_before_expiry: 60,
  vacation_ideal_window_start_months: 6,
  vacation_ideal_window_end_months: 11,
  min_interjornada_hours: 11,
  max_consecutive_work_days: 7,
  max_team_absence_pct: 30,
  lg_integration_enabled: false,
  lg_api_base_url: 'https://api.lugar-de-gente.com.br/v1',
}

// ==========================================
// CONFIGURAÇÕES DE ALERTAS (SINGLETON)
// ==========================================

export async function getAbsenceAlertConfig(): Promise<AbsenceAlertConfigRecord> {
  try {
    const list = await pb
      .collection('absence_alert_configs')
      .getList<AbsenceAlertConfigRecord>(1, 1, {
        sort: '-created',
      })
    if (list.items.length > 0) {
      return list.items[0]
    }

    // Cria caso não exista
    return await pb.collection('absence_alert_configs').create<AbsenceAlertConfigRecord>({
      ...DEFAULT_ABSENCE_ALERT_CONFIG,
    })
  } catch (error) {
    console.warn('Erro ao carregar configurações de alertas de ausência, usando padrão:', error)
    return {
      id: 'default',
      ...DEFAULT_ABSENCE_ALERT_CONFIG,
      created: new Date().toISOString(),
      updated: new Date().toISOString(),
    }
  }
}

export async function updateAbsenceAlertConfig(
  id: string,
  data: Partial<AbsenceAlertConfigRecord>,
): Promise<AbsenceAlertConfigRecord> {
  if (id === 'default' || !id) {
    return await pb.collection('absence_alert_configs').create<AbsenceAlertConfigRecord>({
      ...DEFAULT_ABSENCE_ALERT_CONFIG,
      ...data,
      updated_by: pb.authStore.record?.id,
    })
  }
  return await pb.collection('absence_alert_configs').update<AbsenceAlertConfigRecord>(id, {
    ...data,
    updated_by: pb.authStore.record?.id,
  })
}

// ==========================================
// BANCO DE HORAS
// ==========================================

export async function getHourBankEntries(
  filter = '',
  sort = '-date',
): Promise<HourBankEntryRecord[]> {
  try {
    return await pb.collection('hour_bank_entries').getFullList<HourBankEntryRecord>({
      filter,
      sort,
      expand: 'user_id,created_by',
    })
  } catch (error) {
    console.error('Erro ao buscar lançamentos de banco de horas:', error)
    return []
  }
}

export async function getHourBankEntriesByUser(userId: string): Promise<HourBankEntryRecord[]> {
  return getHourBankEntries(`user_id = "${userId}"`, '-date')
}

export async function createHourBankEntry(data: {
  user_id: string
  date: string
  hours: number
  type: 'credito' | 'debito'
  description: string
  source?: 'manual' | 'lg_sync' | 'sistema'
  external_id?: string
}): Promise<HourBankEntryRecord> {
  return await pb.collection('hour_bank_entries').create<HourBankEntryRecord>({
    ...data,
    source: data.source || 'manual',
    created_by: pb.authStore.record?.id,
  })
}

export async function updateHourBankEntry(
  id: string,
  data: Partial<HourBankEntryRecord>,
): Promise<HourBankEntryRecord> {
  return await pb.collection('hour_bank_entries').update<HourBankEntryRecord>(id, data)
}

export async function deleteHourBankEntry(id: string): Promise<boolean> {
  return await pb.collection('hour_bank_entries').delete(id)
}

// ==========================================
// AUSÊNCIAS (FÉRIAS, DAYOFF, ATESTADO, ETC.)
// ==========================================

export async function getAbsences(filter = '', sort = '-start_date'): Promise<AbsenceRecord[]> {
  try {
    return await pb.collection('absences').getFullList<AbsenceRecord>({
      filter,
      sort,
      expand: 'user_id,created_by',
    })
  } catch (error) {
    console.error('Erro ao buscar ausências:', error)
    return []
  }
}

export async function getAbsencesByUser(userId: string): Promise<AbsenceRecord[]> {
  return getAbsences(`user_id = "${userId}"`, '-start_date')
}

export async function getActiveAbsencesForDate(dateStr: string): Promise<AbsenceRecord[]> {
  // ISO date compare: start_date <= date 23:59:59 && end_date >= date 00:00:00 && status != 'cancelada'
  const filter = `start_date <= "${dateStr} 23:59:59.999Z" && end_date >= "${dateStr} 00:00:00.000Z" && status != "cancelada"`
  return getAbsences(filter, 'start_date')
}

export async function createAbsence(data: {
  user_id: string
  reason: 'Férias' | 'Banco de horas' | 'Dayoff' | 'Atestado'
  start_date: string
  end_date: string
  status?: 'agendada' | 'ativa' | 'encerrada' | 'cancelada'
  notes?: string
  source?: 'manual' | 'lg_sync'
  external_id?: string
  coverage_checked?: boolean
}): Promise<AbsenceRecord> {
  return await pb.collection('absences').create<AbsenceRecord>({
    ...data,
    status: data.status || 'agendada',
    source: data.source || 'manual',
    created_by: pb.authStore.record?.id,
  })
}

export async function updateAbsence(
  id: string,
  data: Partial<AbsenceRecord>,
): Promise<AbsenceRecord> {
  return await pb.collection('absences').update<AbsenceRecord>(id, data)
}

export async function deleteAbsence(id: string): Promise<boolean> {
  return await pb.collection('absences').delete(id)
}
