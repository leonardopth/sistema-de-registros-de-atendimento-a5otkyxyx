import React, { useState, useEffect } from 'react'
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card'
import { Avatar, AvatarFallback } from '@/components/ui/avatar'
import { Badge } from '@/components/ui/badge'
import { NotificationRecord } from '@/types/service_record'
import { getAllGamification, getAllBadges } from '@/services/gamification'
import { GamificationRecord, BadgeRecord, BADGE_DEFINITIONS, LEVELS } from '@/types/gamification'
import { Sparkles, Trophy, Award, Flame, UserCheck, Star } from 'lucide-react'
import { format } from 'date-fns'
import { ptBR } from 'date-fns/locale'

interface AchievementFeedItem {
  id: string
  userName: string
  type: 'level_up' | 'badge_unlocked' | 'streak_record' | 'daily_record'
  title: string
  description: string
  timeAgo: string
  icon: string
  badgeBg: string
}

interface AchievementFeedProps {
  notifications?: NotificationRecord[]
  limit?: number
}

export function AchievementFeed({ notifications = [], limit = 6 }: AchievementFeedProps) {
  const [gamificationList, setGamificationList] = useState<GamificationRecord[]>([])
  const [badgesList, setBadgesList] = useState<BadgeRecord[]>([])
  const [loading, setLoading] = useState(true)

  useEffect(() => {
    async function loadFeed() {
      try {
        const [gList, bList] = await Promise.all([getAllGamification(), getAllBadges()])
        setGamificationList(gList || [])
        setBadgesList(bList || [])
      } catch (e) {
        console.warn('Erro ao carregar achievement feed:', e)
      } finally {
        setLoading(false)
      }
    }
    loadFeed()
  }, [])

  // Regra de Reconhecimento Social: Apenas Consultor e Executivo de Contas
  const isEligibleRole = (role?: string) => {
    return role === 'Consultor' || role === 'Executivo de Contas'
  }

  // Construir itens de feed baseados nas badges recentes e nos níveis alcançados
  const feedItems: AchievementFeedItem[] = []

  // 1. Badges recentes (filtrar apenas consultores e executivos)
  badgesList.forEach((b) => {
    const user = b.expand?.user_id
    if (user?.role && !isEligibleRole(user.role)) return
    const userName = user?.name || 'Consultor'
    const bDef = BADGE_DEFINITIONS[b.badge_key]

    feedItems.push({
      id: `badge-${b.id}`,
      userName,
      type: 'badge_unlocked',
      title: `${userName} desbloqueou o badge "${bDef?.name || b.badge_key}"!`,
      description: bDef ? bDef.criteria : 'Nova conquista desbloqueada no atendimento.',
      timeAgo: b.unlocked_at ? formatTimeAgo(b.unlocked_at) : 'Recentemente',
      icon: bDef?.emoji || '🏅',
      badgeBg: 'bg-amber-50 text-amber-700 border-amber-200',
    })
  })

  // 2. Níveis altos (filtrar apenas consultores e executivos)
  gamificationList.forEach((g) => {
    const user = g.expand?.user_id
    if (user?.role && !isEligibleRole(user.role)) return
    const userName = user?.name || 'Consultor'
    if (g.level && g.level !== 'Aprendiz') {
      const lvlCfg = LEVELS.find((l) => l.name === g.level)
      feedItems.push({
        id: `level-${g.id}`,
        userName,
        type: 'level_up',
        title: `${userName} atingiu o nível ${g.level}!`,
        description: `Com ${g.xp.toLocaleString('pt-BR')} XP acumulados e ${g.streak_days} dias de sequência.`,
        timeAgo: g.updated ? formatTimeAgo(g.updated) : 'Recentemente',
        icon: lvlCfg?.icon || '⭐',
        badgeBg: `${lvlCfg?.bgBadge || 'bg-indigo-50'} ${lvlCfg?.textColor || 'text-indigo-700'} ${lvlCfg?.borderBadge || 'border-indigo-200'}`,
      })
    }
  })

  const displayItems = feedItems.slice(0, limit)

  return (
    <Card className="border-slate-200 shadow-subtle bg-white">
      <CardHeader className="pb-3 border-b border-slate-100 flex flex-row items-center justify-between">
        <CardTitle className="text-sm font-bold text-slate-900 flex items-center gap-2">
          <Sparkles className="h-4 w-4 text-amber-500" />
          Feed de Conquistas da Equipe
        </CardTitle>
        <Badge variant="outline" className="text-[10px] bg-slate-50 text-slate-500">
          Tempo Real
        </Badge>
      </CardHeader>
      <CardContent className="p-4 space-y-3">
        {displayItems.length === 0 ? (
          <p className="text-xs text-slate-400 text-center py-4">
            Nenhuma conquista recente registrada. Conclua atendimentos para movimentar o feed!
          </p>
        ) : (
          displayItems.map((item) => {
            const initials = item.userName
              .split(' ')
              .map((n) => n[0])
              .slice(0, 2)
              .join('')
              .toUpperCase()

            return (
              <div
                key={item.id}
                className="flex items-start gap-3 p-2.5 rounded-xl bg-slate-50/80 hover:bg-slate-100/80 transition-colors border border-slate-100"
              >
                <div className="relative shrink-0">
                  <Avatar className="h-9 w-9 ring-1 ring-slate-200">
                    <AvatarFallback className="bg-indigo-100 text-indigo-700 font-bold text-xs">
                      {initials}
                    </AvatarFallback>
                  </Avatar>
                  <span className="absolute -bottom-1 -right-1 text-xs bg-white rounded-full p-0.5 shadow-xs">
                    {item.icon}
                  </span>
                </div>

                <div className="min-w-0 flex-1">
                  <p className="text-xs font-bold text-slate-900 leading-snug">{item.title}</p>
                  <p className="text-[11px] text-slate-500 mt-0.5 leading-snug">
                    {item.description}
                  </p>
                  <div className="flex items-center gap-2 mt-1">
                    <span className="text-[10px] text-slate-400">{item.timeAgo}</span>
                  </div>
                </div>
              </div>
            )
          })
        )}
      </CardContent>
    </Card>
  )
}

function formatTimeAgo(dateStr: string) {
  try {
    const d = new Date(dateStr)
    const now = new Date()
    const diffMs = now.getTime() - d.getTime()
    const diffMins = Math.floor(diffMs / (1000 * 60))
    const diffHours = Math.floor(diffMs / (1000 * 60 * 60))
    const diffDays = Math.floor(diffMs / (1000 * 60 * 60 * 24))

    if (diffMins < 5) return 'Agora mesmo'
    if (diffMins < 60) return `Há ${diffMins} min`
    if (diffHours < 24) return `Há ${diffHours}h`
    if (diffDays === 1) return 'Ontem'
    if (diffDays < 7) return `Há ${diffDays} dias`
    return format(d, "dd 'de' MMM", { locale: ptBR })
  } catch {
    return 'Recentemente'
  }
}
