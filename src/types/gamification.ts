import { UserRecord } from '@/types/service_record'

export type LevelTier = 'Aprendiz' | 'Júnior' | 'Pleno' | 'Sênior' | 'Expert' | 'Master'

export interface LevelInfo {
  name: LevelTier
  minXp: number
  maxXp: number
  color: string
  bgBadge: string
  borderBadge: string
  textColor: string
  icon: string
  description: string
}

export const LEVELS: LevelInfo[] = [
  {
    name: 'Aprendiz',
    minXp: 0,
    maxXp: 99,
    color: '#22c55e',
    bgBadge: 'bg-emerald-500/10',
    borderBadge: 'border-emerald-500/30',
    textColor: 'text-emerald-600 dark:text-emerald-400',
    icon: '🟢',
    description: 'Distintivo básico',
  },
  {
    name: 'Júnior',
    minXp: 100,
    maxXp: 299,
    color: '#3b82f6',
    bgBadge: 'bg-blue-500/10',
    borderBadge: 'border-blue-500/30',
    textColor: 'text-blue-600 dark:text-blue-400',
    icon: '🔵',
    description: 'Badge azul no perfil',
  },
  {
    name: 'Pleno',
    minXp: 300,
    maxXp: 599,
    color: '#a855f7',
    bgBadge: 'bg-purple-500/10',
    borderBadge: 'border-purple-500/30',
    textColor: 'text-purple-600 dark:text-purple-400',
    icon: '🟣',
    description: 'Badge roxo + nome destacado',
  },
  {
    name: 'Sênior',
    minXp: 600,
    maxXp: 999,
    color: '#f97316',
    bgBadge: 'bg-orange-500/10',
    borderBadge: 'border-orange-500/30',
    textColor: 'text-orange-600 dark:text-orange-400',
    icon: '🟠',
    description: 'Badge laranja + estrela ⭐',
  },
  {
    name: 'Expert',
    minXp: 1000,
    maxXp: 1999,
    color: '#ef4444',
    bgBadge: 'bg-rose-500/10',
    borderBadge: 'border-rose-500/30',
    textColor: 'text-rose-600 dark:text-rose-400',
    icon: '🔴',
    description: 'Badge vermelho + moldura premium',
  },
  {
    name: 'Master',
    minXp: 2000,
    maxXp: Infinity,
    color: '#eab308',
    bgBadge: 'bg-amber-500/10',
    borderBadge: 'border-amber-500/30',
    textColor: 'text-amber-600 dark:text-amber-400',
    icon: '👑',
    description: 'Coroa dourada',
  },
]

export interface BadgeDefinition {
  key: string
  name: string
  emoji: string
  criteria: string
  category: 'performance' | 'streak' | 'teamwork' | 'quality'
}

export const BADGE_DEFINITIONS: Record<string, BadgeDefinition> = {
  novato: {
    key: 'novato',
    name: 'Novato',
    emoji: '🆕',
    criteria: 'Primeiro atendimento concluído',
    category: 'performance',
  },
  velocista: {
    key: 'velocista',
    name: 'Velocista',
    emoji: '⚡',
    criteria: 'TMA abaixo da meta por 5 dias consecutivos',
    category: 'performance',
  },
  olho_clinico: {
    key: 'olho_clinico',
    name: 'Olho Clínico',
    emoji: '🔍',
    criteria: '10 contatos evitáveis identificados',
    category: 'quality',
  },
  cliente_feliz: {
    key: 'cliente_feliz',
    name: 'Cliente Feliz',
    emoji: '😊',
    criteria: '10 atendimentos com sentimento positivo',
    category: 'quality',
  },
  maratonista: {
    key: 'maratonista',
    name: 'Maratonista',
    emoji: '🔥',
    criteria: '50+ atendimentos num único dia',
    category: 'streak',
  },
  especialista: {
    key: 'especialista',
    name: 'Especialista',
    emoji: '📚',
    criteria: '100% da meta mensal por 3 meses seguidos',
    category: 'performance',
  },
  recorde_pessoal: {
    key: 'recorde_pessoal',
    name: 'Recorde Pessoal',
    emoji: '🚀',
    criteria: 'Bater o próprio recorde diário',
    category: 'streak',
  },
  lendario: {
    key: 'lendario',
    name: 'Lendário',
    emoji: '👑',
    criteria: 'Top 1 do ranking por uma semana',
    category: 'performance',
  },
  trabalho_equipe: {
    key: 'trabalho_equipe',
    name: 'Trabalho em Equipe',
    emoji: '🤝',
    criteria: 'Compartilhar atendimento que ajudou outro consultor',
    category: 'teamwork',
  },
  categorizador_nato: {
    key: 'categorizador_nato',
    name: 'Categorizador Nato',
    emoji: '💡',
    criteria: '90%+ de categorização IA no mês',
    category: 'quality',
  },
}

export interface GamificationRecord {
  id: string
  user_id: string
  xp: number
  level: LevelTier
  badges: string[]
  daily_record: number
  streak_days: number
  consecutive_months: number
  last_badge_unlocked_at?: string
  created: string
  updated: string
  expand?: {
    user_id?: UserRecord
  }
}

export interface BadgeRecord {
  id: string
  user_id: string
  badge_key: string
  unlocked_at: string
  created: string
  updated: string
  expand?: {
    user_id?: UserRecord
  }
}

export interface MonthlyAwardRecord {
  id: string
  user_id: string
  award_type: 'employee_of_month' | 'notable_evolution'
  month_year: string
  metric_value: number
  details?: {
    userName?: string
    completed?: number
    target?: number
    progressPct?: number
    currentCompleted?: number
    prevCompleted?: number
    growth?: number
  }
  awarded_at: string
  created: string
  updated: string
  expand?: {
    user_id?: UserRecord
  }
}

export interface UserRankingEntry {
  rank: number
  user: UserRecord
  xp: number
  level: LevelTier
  badgesCount: number
  badges: string[]
  dailyRecord: number
  streakDays: number
  completedCount: number
  serviceGroups: string[]
  departments: string[]
  bases: string[]
}
