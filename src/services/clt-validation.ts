import { ServiceRecord, UserRecord } from '@/types/service_record'
import {
  InterjornadaViolation,
  ConsecutiveWorkDaysViolation,
  AbsenceRecord,
  CoverageConflictCheck,
  VacationPeriodStatus,
  AbsenceReason,
} from '@/types/banco-ferias'
import { getGMT3DateString } from '@/lib/timezone'

/**
 * Gestores não marcam ponto nem possuem banco de horas.
 * Não são apurados para interjornada ou DSR.
 */
export const MANAGEMENT_ROLES = [
  'Gerente',
  'Supervisor',
  'Líder',
  'Gestor Comercial',
  'Master',
  'Gerentes',
  'Supervisores',
  'Líderes',
]

export function isManagerRole(role?: string): boolean {
  if (!role) return false
  return MANAGEMENT_ROLES.includes(role)
}

/**
 * Validação de Interjornada (CLT Art. 66: mínimo de 11h consecutivas de descanso entre duas jornadas).
 * Usa os registros de atendimentos (`service_records`) como proxy das atividades enquanto não há integração com LG.
 */
export function checkInterjornadaViolations(
  records: ServiceRecord[],
  users: UserRecord[],
  minRequiredHours = 11,
): InterjornadaViolation[] {
  const violations: InterjornadaViolation[] = []
  const usersMap = new Map<string, UserRecord>(users.map((u) => [u.id, u]))

  // Agrupa atendimentos por colaborador (apenas não-gestores)
  const recordsByUser = new Map<string, ServiceRecord[]>()
  for (const r of records) {
    const userId = r.assigned_user || r.user_id
    if (!userId) continue
    const u = usersMap.get(userId)
    if (u && isManagerRole(u.role)) continue // Gestores isentos

    const list = recordsByUser.get(userId) || []
    list.push(r)
    recordsByUser.set(userId, list)
  }

  recordsByUser.forEach((userRecords, userId) => {
    const user = usersMap.get(userId)
    const userName = user?.name || 'Colaborador'

    // Agrupa horários por dia (data GMT-3)
    const dayMap = new Map<string, { minTime: number; maxTime: number }>()

    for (const rec of userRecords) {
      if (!rec.created) continue
      const dateKey = getGMT3DateString(rec.created)
      const recTime = new Date(rec.created).getTime()

      // Se tiver end_time ou duration, considera o encerramento do atendimento
      let endTime = recTime
      if (rec.end_time) {
        endTime = new Date(rec.end_time).getTime()
      } else if (rec.duration && rec.duration > 0) {
        endTime = recTime + rec.duration * 60 * 1000
      }

      const existing = dayMap.get(dateKey)
      if (!existing) {
        dayMap.set(dateKey, { minTime: recTime, maxTime: endTime })
      } else {
        if (recTime < existing.minTime) existing.minTime = recTime
        if (endTime > existing.maxTime) existing.maxTime = endTime
      }
    }

    const sortedDates = Array.from(dayMap.keys()).sort()

    for (let i = 1; i < sortedDates.length; i++) {
      const prevDateStr = sortedDates[i - 1]
      const currDateStr = sortedDates[i]

      const prevDay = dayMap.get(prevDateStr)!
      const currDay = dayMap.get(currDateStr)!

      // Checa se são dias consecutivos
      const prevMidnight = new Date(`${prevDateStr}T00:00:00Z`).getTime()
      const currMidnight = new Date(`${currDateStr}T00:00:00Z`).getTime()
      const diffDays = Math.round((currMidnight - prevMidnight) / (24 * 3600 * 1000))

      if (diffDays === 1) {
        // Intervalo entre o fim do dia anterior e início do dia seguinte
        const restMs = currDay.minTime - prevDay.maxTime
        const restHours = Math.round((restMs / (3600 * 1000)) * 10) / 10

        if (restHours >= 0 && restHours < minRequiredHours) {
          violations.push({
            userId,
            userName,
            previousDate: prevDateStr,
            previousEndTime: new Date(prevDay.maxTime).toISOString(),
            nextDate: currDateStr,
            nextStartTime: new Date(currDay.minTime).toISOString(),
            restHours,
            minRequiredHours,
          })
        }
      }
    }
  })

  return violations
}

/**
 * Validação de DSR (CLT Art. 67: descanso semanal remunerado — alertar quando um colaborador
 * trabalha 7 dias consecutivos sem folga).
 */
export function checkConsecutiveWorkDaysViolations(
  records: ServiceRecord[],
  users: UserRecord[],
  maxAllowedDays = 7,
): ConsecutiveWorkDaysViolation[] {
  const violations: ConsecutiveWorkDaysViolation[] = []
  const usersMap = new Map<string, UserRecord>(users.map((u) => [u.id, u]))

  const recordsByUser = new Map<string, ServiceRecord[]>()
  for (const r of records) {
    const userId = r.assigned_user || r.user_id
    if (!userId) continue
    const u = usersMap.get(userId)
    if (u && isManagerRole(u.role)) continue

    const list = recordsByUser.get(userId) || []
    list.push(r)
    recordsByUser.set(userId, list)
  }

  recordsByUser.forEach((userRecords, userId) => {
    const user = usersMap.get(userId)
    const userName = user?.name || 'Colaborador'

    const distinctDates = Array.from(
      new Set(userRecords.map((r) => getGMT3DateString(r.created)).filter(Boolean)),
    ).sort()

    if (distinctDates.length < maxAllowedDays) return

    let streak = 1
    let streakStart = distinctDates[0]

    for (let i = 1; i < distinctDates.length; i++) {
      const prevTime = new Date(`${distinctDates[i - 1]}T00:00:00Z`).getTime()
      const currTime = new Date(`${distinctDates[i]}T00:00:00Z`).getTime()
      const diffDays = Math.round((currTime - prevTime) / (24 * 3600 * 1000))

      if (diffDays === 1) {
        streak++
        if (streak >= maxAllowedDays) {
          violations.push({
            userId,
            userName,
            consecutiveDaysCount: streak,
            startDate: streakStart,
            endDate: distinctDates[i],
            maxAllowed: maxAllowedDays,
          })
        }
      } else {
        streak = 1
        streakStart = distinctDates[i]
      }
    }
  })

  return violations
}

/**
 * Validação de Política de Férias:
 * - Período aquisitivo (12 meses): concluído?
 * - Período concessivo (até 24 meses após admissão): dias restantes ou vencido?
 * - Janela ideal de concessão: entre 6 e 11 meses após aquisição
 * - Férias já agendadas ou em gozo
 */
export function evaluateVacationStatus(
  user: UserRecord,
  userAbsences: AbsenceRecord[],
  options: {
    warningDaysBeforeExpiry?: number
    idealWindowStartMonths?: number
    idealWindowEndMonths?: number
  } = {},
): VacationPeriodStatus {
  const {
    warningDaysBeforeExpiry = 60,
    idealWindowStartMonths = 6,
    idealWindowEndMonths = 11,
  } = options

  // Usa created do usuário como proxy de data de contratação (admissão)
  const hireDateStr = user.created || new Date().toISOString()
  const hireDate = new Date(hireDateStr)
  const now = new Date()

  const diffMs = now.getTime() - hireDate.getTime()
  const daysSinceHire = Math.max(0, Math.floor(diffMs / (24 * 3600 * 1000)))

  // 1 ano = 365 dias
  const isAquisitivoCompleted = daysSinceHire >= 365

  // Ciclo concessivo = 2 anos (730 dias)
  const daysUntilExpiry = 730 - daysSinceHire
  const isExpired = isAquisitivoCompleted && daysUntilExpiry <= 0
  const isExpiringSoon =
    isAquisitivoCompleted && !isExpired && daysUntilExpiry <= warningDaysBeforeExpiry

  // Janela ideal (ex.: entre mês 18 e 23 de contrato)
  const monthsSinceHire = daysSinceHire / 30.4
  const isInIdealWindow =
    isAquisitivoCompleted &&
    monthsSinceHire >= 12 + idealWindowStartMonths &&
    monthsSinceHire <= 12 + idealWindowEndMonths

  const nowIso = now.toISOString()
  const vacations = userAbsences.filter((a) => a.reason === 'Férias' && a.status !== 'cancelada')

  const upcomingVacation = vacations.find((v) => v.start_date > nowIso)
  const hasUpcomingVacation = Boolean(upcomingVacation)
  const pastVacationsCount = vacations.filter((v) => v.end_date < nowIso).length

  return {
    userId: user.id,
    userName: user.name,
    hireDate: hireDateStr,
    daysSinceHire,
    isAquisitivoCompleted,
    daysUntilExpiry,
    isExpired,
    isExpiringSoon,
    isInIdealWindow,
    hasUpcomingVacation,
    upcomingVacation,
    pastVacationsCount,
  }
}

/**
 * Validação de Cobertura da Equipe:
 * Verifica se a inclusão de uma nova ausência ou as ausências existentes deixariam a equipe
 * sem cobertura mínima no mesmo Núcleo (% máximo ausente no período).
 */
export function checkTeamCoverage(
  targetDate: string,
  teamUsers: UserRecord[],
  allAbsences: AbsenceRecord[],
  maxAllowedAbsencePct = 30,
): CoverageConflictCheck {
  const teamUserIds = new Set(teamUsers.map((u) => u.id))
  const teamTotalCount = teamUsers.length || 1

  const targetDatePrefix = targetDate.substring(0, 10)

  // Encontra ausências que intersectam a data alvo
  const activeAbsencesOnDate = allAbsences.filter((abs) => {
    if (abs.status === 'cancelada') return false
    if (!teamUserIds.has(abs.user_id)) return false
    const start = abs.start_date.substring(0, 10)
    const end = abs.end_date.substring(0, 10)
    return targetDatePrefix >= start && targetDatePrefix <= end
  })

  const conflictingUsers: { userId: string; userName: string; reason: AbsenceReason }[] = []
  const uniqueAbsentUserIds = new Set<string>()

  for (const abs of activeAbsencesOnDate) {
    if (!uniqueAbsentUserIds.has(abs.user_id)) {
      uniqueAbsentUserIds.add(abs.user_id)
      const u = teamUsers.find((t) => t.id === abs.user_id)
      conflictingUsers.push({
        userId: abs.user_id,
        userName: u?.name || 'Colaborador',
        reason: abs.reason,
      })
    }
  }

  const absentCount = uniqueAbsentUserIds.size
  const absencePct = Math.round((absentCount / teamTotalCount) * 100)
  const hasConflict = absencePct > maxAllowedAbsencePct

  return {
    date: targetDatePrefix,
    teamTotalCount,
    absentCount,
    absencePct,
    conflictingUsers,
    hasConflict,
    maxAllowedAbsencePct,
  }
}
