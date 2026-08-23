import React from 'react'
import { Card, CardContent } from '@/components/ui/card'
import { Avatar, AvatarFallback } from '@/components/ui/avatar'
import { Badge } from '@/components/ui/badge'
import { LEVELS, BADGE_DEFINITIONS, UserRankingEntry } from '@/types/gamification'
import { Trophy, Medal, Crown, Star, Sparkles, Flame } from 'lucide-react'

interface RankingPodiumProps {
  topUsers: UserRankingEntry[]
}

export function RankingPodium({ topUsers }: RankingPodiumProps) {
  if (!topUsers || topUsers.length === 0) {
    return (
      <div className="p-8 text-center bg-slate-50 border border-slate-200 rounded-xl">
        <Trophy className="h-10 w-10 text-slate-400 mx-auto mb-2" />
        <p className="text-sm font-semibold text-slate-700">Nenhum consultor classificado ainda</p>
        <p className="text-xs text-slate-500 mt-0.5">
          Conclua atendimentos para acumular XP e aparecer no pódio!
        </p>
      </div>
    )
  }

  const first = topUsers[0]
  const second = topUsers.length > 1 ? topUsers[1] : null
  const third = topUsers.length > 2 ? topUsers[2] : null

  const renderCard = (entry: UserRankingEntry, position: 1 | 2 | 3) => {
    const isFirst = position === 1
    const isSecond = position === 2
    const isThird = position === 3

    const levelCfg = LEVELS.find((l) => l.name === entry.level) || LEVELS[0]

    const posConfig = {
      1: {
        bg: 'from-amber-500/15 via-amber-500/5 to-white',
        border: 'border-amber-400 shadow-md shadow-amber-500/10 ring-1 ring-amber-400/50',
        badgeBg: 'bg-amber-400 text-amber-950 font-extrabold',
        icon: '🥇',
        title: '1º Lugar',
        avatarRing: 'ring-4 ring-amber-400 shadow-lg shadow-amber-500/20',
        height: 'md:-mt-4',
      },
      2: {
        bg: 'from-slate-200/50 via-slate-100/30 to-white',
        border: 'border-slate-300 shadow-sm',
        badgeBg: 'bg-slate-300 text-slate-800 font-bold',
        icon: '🥈',
        title: '2º Lugar',
        avatarRing: 'ring-4 ring-slate-300',
        height: 'mt-0',
      },
      3: {
        bg: 'from-amber-700/10 via-amber-600/5 to-white',
        border: 'border-amber-300 shadow-sm',
        badgeBg: 'bg-amber-600/20 text-amber-900 font-bold',
        icon: '🥉',
        title: '3º Lugar',
        avatarRing: 'ring-4 ring-amber-600/40',
        height: 'mt-0',
      },
    }[position]

    const initials =
      entry.user.name
        ?.split(' ')
        .map((n) => n[0])
        .slice(0, 2)
        .join('')
        .toUpperCase() || '?'

    return (
      <Card
        key={entry.user.id}
        className={`relative overflow-hidden bg-gradient-to-b ${posConfig.bg} ${posConfig.border} ${posConfig.height} transition-all duration-300 hover:scale-[1.02]`}
      >
        {isFirst && <div className="absolute top-2 right-2 text-2xl animate-bounce">👑</div>}

        <CardContent className="p-5 flex flex-col items-center text-center space-y-3">
          {/* Posição Pódio */}
          <div className="flex items-center gap-1.5">
            <span className="text-xl">{posConfig.icon}</span>
            <span
              className={`px-2.5 py-0.5 rounded-full text-xs uppercase tracking-wider ${posConfig.badgeBg}`}
            >
              {posConfig.title}
            </span>
          </div>

          {/* Avatar com Moldura de Nível */}
          <div className="relative my-1">
            <Avatar
              className={`w-16 h-16 ${posConfig.avatarRing} ${
                entry.level === 'Master'
                  ? 'ring-amber-400'
                  : entry.level === 'Expert'
                    ? 'ring-rose-500'
                    : ''
              }`}
            >
              <AvatarFallback className="bg-indigo-600 text-white font-bold text-lg">
                {initials}
              </AvatarFallback>
            </Avatar>
            <span className="absolute -bottom-1 -right-1 text-sm bg-white rounded-full p-0.5 shadow">
              {levelCfg.icon}
            </span>
          </div>

          {/* Nome e Nível */}
          <div className="min-w-0 w-full">
            <p
              className={`text-sm md:text-base font-extrabold text-slate-900 truncate ${
                entry.level === 'Pleno' ||
                entry.level === 'Sênior' ||
                entry.level === 'Expert' ||
                entry.level === 'Master'
                  ? 'text-indigo-950 font-black'
                  : ''
              }`}
            >
              {entry.user.name}
            </p>
            <div className="flex items-center justify-center gap-1.5 mt-1 flex-wrap">
              <Badge
                variant="outline"
                className={`text-[10px] px-2 py-0.5 ${levelCfg.bgBadge} ${levelCfg.borderBadge} ${levelCfg.textColor} font-semibold`}
              >
                {levelCfg.icon} Nível {entry.level}
              </Badge>
              {entry.level === 'Sênior' && <span className="text-amber-500 text-xs">⭐</span>}
            </div>
          </div>

          {/* XP & Atendimentos */}
          <div className="w-full bg-slate-50/80 rounded-xl p-2.5 border border-slate-200/60 grid grid-cols-2 gap-2">
            <div>
              <p className="text-[10px] text-slate-500 font-medium">Pontuação</p>
              <p className="text-base font-extrabold text-indigo-700">
                {entry.xp.toLocaleString('pt-BR')} <span className="text-[10px]">XP</span>
              </p>
            </div>
            <div>
              <p className="text-[10px] text-slate-500 font-medium">Concluídos</p>
              <p className="text-base font-bold text-slate-800">{entry.completedCount}</p>
            </div>
          </div>

          {/* Badges Conquistadas */}
          <div className="w-full pt-1">
            <div className="flex items-center justify-center gap-1 flex-wrap min-h-[26px]">
              {entry.badges && entry.badges.length > 0 ? (
                entry.badges.slice(0, 5).map((badgeKey) => {
                  const bDef = BADGE_DEFINITIONS[badgeKey]
                  return (
                    <span
                      key={badgeKey}
                      title={bDef ? `${bDef.name}: ${bDef.criteria}` : badgeKey}
                      className="inline-flex items-center justify-center w-6 h-6 rounded-full bg-white shadow-xs border border-slate-200 text-xs cursor-help hover:scale-125 transition-transform"
                    >
                      {bDef?.emoji || '🏅'}
                    </span>
                  )
                })
              ) : (
                <span className="text-[10px] text-slate-400 italic">Nenhum badge ainda</span>
              )}
              {entry.badges && entry.badges.length > 5 && (
                <span className="text-[10px] text-slate-500 font-bold ml-0.5">
                  +{entry.badges.length - 5}
                </span>
              )}
            </div>
          </div>
        </CardContent>
      </Card>
    )
  }

  return (
    <div className="grid grid-cols-1 md:grid-cols-3 gap-4 md:items-end">
      {/* Ordem no Desktop: 2º Lugar (Esquerda), 1º Lugar (Centro Mais Alto), 3º Lugar (Direita) */}
      {second ? renderCard(second, 2) : <div className="hidden md:block" />}
      {renderCard(first, 1)}
      {third ? renderCard(third, 3) : <div className="hidden md:block" />}
    </div>
  )
}
