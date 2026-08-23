import pb from '@/lib/pocketbase/client'
import {
  GamificationRecord,
  BadgeRecord,
  MonthlyAwardRecord,
  LEVELS,
  LevelTier,
  LevelInfo,
} from '@/types/gamification'

export function getLevelDetails(xp: number): {
  currentLevel: LevelInfo
  nextLevel: LevelInfo | null
  currentXpInLevel: number
  xpToNextLevel: number
  progressPct: number
} {
  const safeXp = Math.max(0, xp || 0)
  let currentLevel = LEVELS[0]
  let nextLevel: LevelInfo | null = LEVELS[1]

  for (let i = 0; i < LEVELS.length; i++) {
    const lvl = LEVELS[i]
    if (safeXp >= lvl.minXp && (lvl.maxXp === Infinity || safeXp <= lvl.maxXp)) {
      currentLevel = lvl
      nextLevel = i + 1 < LEVELS.length ? LEVELS[i + 1] : null
      break
    }
  }

  if (!nextLevel) {
    return {
      currentLevel,
      nextLevel: null,
      currentXpInLevel: safeXp - currentLevel.minXp,
      xpToNextLevel: 0,
      progressPct: 100,
    }
  }

  const range = nextLevel.minXp - currentLevel.minXp
  const currentXpInLevel = safeXp - currentLevel.minXp
  const xpToNextLevel = Math.max(0, nextLevel.minXp - safeXp)
  const progressPct = Math.min(100, Math.max(0, Math.round((currentXpInLevel / range) * 100)))

  return {
    currentLevel,
    nextLevel,
    currentXpInLevel,
    xpToNextLevel,
    progressPct,
  }
}

export async function getGamificationByUser(userId: string): Promise<GamificationRecord | null> {
  try {
    const records = await pb.collection('gamification').getFullList<GamificationRecord>({
      filter: `user_id = '${userId}'`,
      expand: 'user_id',
    })
    return records[0] || null
  } catch (err) {
    console.warn('Erro ao buscar gamification do usuário:', err)
    return null
  }
}

export async function getAllGamification(): Promise<GamificationRecord[]> {
  try {
    return await pb.collection('gamification').getFullList<GamificationRecord>({
      sort: '-xp',
      expand: 'user_id',
    })
  } catch (err) {
    console.warn('Erro ao listar gamification:', err)
    return []
  }
}

export async function getUserBadges(userId: string): Promise<BadgeRecord[]> {
  try {
    return await pb.collection('badges').getFullList<BadgeRecord>({
      filter: `user_id = '${userId}'`,
      sort: '-unlocked_at',
      expand: 'user_id',
    })
  } catch (err) {
    console.warn('Erro ao buscar badges:', err)
    return []
  }
}

export async function getAllBadges(): Promise<BadgeRecord[]> {
  try {
    return await pb.collection('badges').getFullList<BadgeRecord>({
      sort: '-created',
      expand: 'user_id',
    })
  } catch (err) {
    console.warn('Erro ao buscar todas as badges:', err)
    return []
  }
}

export async function getMonthlyAwards(monthYear?: string): Promise<MonthlyAwardRecord[]> {
  try {
    const filter = monthYear ? `month_year = '${monthYear}'` : ''
    return await pb.collection('monthly_awards').getFullList<MonthlyAwardRecord>({
      filter,
      sort: '-awarded_at',
      expand: 'user_id',
    })
  } catch (err) {
    console.warn('Erro ao buscar premiações mensais:', err)
    return []
  }
}

export async function recalculateGamification(userId?: string, all = false): Promise<any> {
  try {
    return await pb.send('/backend/v1/gamification/recalculate', {
      method: 'POST',
      body: { user_id: userId, all },
    })
  } catch (err) {
    console.warn('Erro ao chamar recalculate gamification:', err)
    return null
  }
}

export async function closeMonthAwards(monthYear?: string): Promise<any> {
  try {
    return await pb.send('/backend/v1/gamification/close-month', {
      method: 'POST',
      body: { month_year: monthYear },
    })
  } catch (err) {
    console.warn('Erro ao fechar mês:', err)
    return null
  }
}
