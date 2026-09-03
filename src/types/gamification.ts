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
  category: 'performance' | 'streak' | 'teamwork' | 'quality' | 'autonomy' | 'client_evolution'
  targetRole?: 'Consultor' | 'Executivo de Contas' | 'all'
}

export const CONSULTANT_BADGE_DEFINITIONS: Record<string, BadgeDefinition> = {
  novato: {
    key: 'novato',
    name: 'Novato',
    emoji: '🆕',
    criteria: 'Primeiro atendimento concluído',
    category: 'performance',
    targetRole: 'Consultor',
  },
  velocista: {
    key: 'velocista',
    name: 'Velocista',
    emoji: '⚡',
    criteria: 'TMA abaixo da meta por 5 dias consecutivos',
    category: 'performance',
    targetRole: 'Consultor',
  },
  olho_clinico: {
    key: 'olho_clinico',
    name: 'Olho Clínico',
    emoji: '🔍',
    criteria: '10 contatos evitáveis identificados',
    category: 'quality',
    targetRole: 'Consultor',
  },
  cliente_feliz: {
    key: 'cliente_feliz',
    name: 'Cliente Feliz',
    emoji: '😊',
    criteria: '10 atendimentos com sentimento positivo',
    category: 'quality',
    targetRole: 'Consultor',
  },
  maratonista: {
    key: 'maratonista',
    name: 'Maratonista',
    emoji: '🔥',
    criteria: '50+ atendimentos num único dia',
    category: 'streak',
    targetRole: 'Consultor',
  },
  especialista: {
    key: 'especialista',
    name: 'Especialista',
    emoji: '📚',
    criteria: '100% da meta mensal por 3 meses seguidos',
    category: 'performance',
    targetRole: 'Consultor',
  },
  recorde_pessoal: {
    key: 'recorde_pessoal',
    name: 'Recorde Pessoal',
    emoji: '🚀',
    criteria: 'Bater o próprio recorde diário de atendimentos',
    category: 'streak',
    targetRole: 'Consultor',
  },
  lendario: {
    key: 'lendario',
    name: 'Lendário',
    emoji: '👑',
    criteria: 'Top 1 do ranking de consultores',
    category: 'performance',
    targetRole: 'Consultor',
  },
  trabalho_equipe: {
    key: 'trabalho_equipe',
    name: 'Trabalho em Equipe',
    emoji: '🤝',
    criteria: 'Compartilhar atendimento que ajudou outro consultor',
    category: 'teamwork',
    targetRole: 'Consultor',
  },
  categorizador_nato: {
    key: 'categorizador_nato',
    name: 'Categorizador Nato',
    emoji: '💡',
    criteria: '90%+ de categorização IA no mês',
    category: 'quality',
    targetRole: 'Consultor',
  },
}

export const EXECUTIVE_BADGE_DEFINITIONS: Record<string, BadgeDefinition> = {
  gestor_autonomia: {
    key: 'gestor_autonomia',
    name: 'Guardião da Autonomia',
    emoji: '🛡️',
    criteria: 'Pelo menos 3 clientes com autonomia acima de 80%',
    category: 'autonomy',
    targetRole: 'Executivo de Contas',
  },
  mestre_da_evolucao: {
    key: 'mestre_da_evolucao',
    name: 'Mestre da Evolução',
    emoji: '📈',
    criteria: 'Evolução positiva de autonomia mês a mês em clientes gerenciados',
    category: 'client_evolution',
    targetRole: 'Executivo de Contas',
  },
  scorecard_ouro: {
    key: 'scorecard_ouro',
    name: 'Scorecard Ouro',
    emoji: '🌟',
    criteria: 'Mais de 70% da carteira com scorecard de autonomia positivo',
    category: 'autonomy',
    targetRole: 'Executivo de Contas',
  },
  cliente_blindado: {
    key: 'cliente_blindado',
    name: 'Cliente Blindado',
    emoji: '💎',
    criteria: 'Cliente gerenciado com 100% de autonomia no período (zero evitáveis)',
    category: 'autonomy',
    targetRole: 'Executivo de Contas',
  },
  mentor_de_agencias: {
    key: 'mentor_de_agencias',
    name: 'Mentor de Agências',
    emoji: '🎓',
    criteria: 'Cliente com treinamento registrado e redução comprovada de contatos evitáveis',
    category: 'client_evolution',
    targetRole: 'Executivo de Contas',
  },
  carteira_satisfeita: {
    key: 'carteira_satisfeita',
    name: 'Carteira Satisfeita',
    emoji: '✨',
    criteria: '5+ atendimentos de clientes gerenciados com sentimento positivo',
    category: 'quality',
    targetRole: 'Executivo de Contas',
  },
  expansao_autonoma: {
    key: 'expansao_autonoma',
    name: 'Expansão Autônoma',
    emoji: '🚀',
    criteria: '5+ clientes ativos gerenciados operando com alta autonomia',
    category: 'client_evolution',
    targetRole: 'Executivo de Contas',
  },
  executivo_diamante: {
    key: 'executivo_diamante',
    name: 'Executivo Diamante',
    emoji: '👑',
    criteria: 'Top 1 no ranking de autonomia e progresso de clientes',
    category: 'performance',
    targetRole: 'Executivo de Contas',
  },
}

export const BADGE_DEFINITIONS: Record<string, BadgeDefinition> = {
  ...CONSULTANT_BADGE_DEFINITIONS,
  ...EXECUTIVE_BADGE_DEFINITIONS,
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

export type SocialReactionItemType =
  | 'employee_of_month'
  | 'notable_evolution'
  | 'badge_unlock'
  | 'level_up'

export interface SocialReactionRecord {
  id: string
  user_id: string
  item_type: SocialReactionItemType
  item_id: string
  emoji: string
  created: string
  updated: string
  expand?: {
    user_id?: UserRecord
  }
}

export interface ReactionSummary {
  emojiCounts: Record<string, number>
  userReaction?: string
  totalCount: number
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
  // Métricas específicas de progresso dos clientes para Executivos de Contas
  managedClientsCount?: number
  avgAutonomyRate?: number
  highAutonomyClientsCount?: number
  evolutionPositiveCount?: number
  satisfactionCount?: number
}
