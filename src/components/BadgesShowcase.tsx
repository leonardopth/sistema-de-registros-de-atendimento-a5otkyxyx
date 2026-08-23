import React, { useState } from 'react'
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card'
import { Badge } from '@/components/ui/badge'
import { Button } from '@/components/ui/button'
import { BADGE_DEFINITIONS, BadgeDefinition } from '@/types/gamification'
import { Award, Lock, CheckCircle2, Sparkles, Trophy } from 'lucide-react'

interface BadgesShowcaseProps {
  unlockedBadgeKeys: string[]
  userName?: string
  onBadgeClick?: (badge: BadgeDefinition, unlocked: boolean) => void
}

export function BadgesShowcase({
  unlockedBadgeKeys = [],
  userName,
  onBadgeClick,
}: BadgesShowcaseProps) {
  const [filter, setFilter] = useState<'all' | 'unlocked' | 'locked'>('all')

  const badgeList = Object.values(BADGE_DEFINITIONS)
  const unlockedSet = new Set(unlockedBadgeKeys)

  const filteredBadges = badgeList.filter((b) => {
    const isUnlocked = unlockedSet.has(b.key)
    if (filter === 'unlocked') return isUnlocked
    if (filter === 'locked') return !isUnlocked
    return true
  })

  return (
    <Card className="border-slate-200 shadow-subtle bg-white">
      <CardHeader className="pb-3 border-b border-slate-100 flex flex-col sm:flex-row sm:items-center sm:justify-between gap-3">
        <div>
          <CardTitle className="text-base font-bold text-slate-900 flex items-center gap-2">
            <Award className="h-5 w-5 text-indigo-600" />
            Galeria de Badges e Conquistas
          </CardTitle>
          <p className="text-xs text-slate-500 mt-0.5">
            {unlockedSet.size} de {badgeList.length} conquistas desbloqueadas
          </p>
        </div>

        <div className="flex items-center gap-1.5 self-start sm:self-auto">
          <Button
            variant={filter === 'all' ? 'default' : 'outline'}
            size="sm"
            onClick={() => setFilter('all')}
            className="h-7 text-xs px-2.5"
          >
            Todas ({badgeList.length})
          </Button>
          <Button
            variant={filter === 'unlocked' ? 'default' : 'outline'}
            size="sm"
            onClick={() => setFilter('unlocked')}
            className="h-7 text-xs px-2.5 text-emerald-700 border-emerald-200 bg-emerald-50 hover:bg-emerald-100"
          >
            Desbloqueadas ({unlockedSet.size})
          </Button>
          <Button
            variant={filter === 'locked' ? 'default' : 'outline'}
            size="sm"
            onClick={() => setFilter('locked')}
            className="h-7 text-xs px-2.5"
          >
            Bloqueadas ({badgeList.length - unlockedSet.size})
          </Button>
        </div>
      </CardHeader>

      <CardContent className="p-4 md:p-6">
        <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-5 gap-3.5">
          {filteredBadges.map((badge) => {
            const isUnlocked = unlockedSet.has(badge.key)

            return (
              <div
                key={badge.key}
                onClick={() => onBadgeClick && onBadgeClick(badge, isUnlocked)}
                className={`relative rounded-2xl p-4 border transition-all duration-200 flex flex-col justify-between text-left ${
                  isUnlocked
                    ? 'bg-gradient-to-b from-amber-500/10 via-amber-500/5 to-white border-amber-300 shadow-xs hover:scale-105 hover:shadow-md cursor-pointer'
                    : 'bg-slate-50/70 border-slate-200/80 opacity-60 hover:opacity-80'
                }`}
              >
                <div>
                  <div className="flex items-center justify-between gap-2 mb-2">
                    <div
                      className={`w-12 h-12 rounded-2xl flex items-center justify-center text-2xl shadow-xs ${
                        isUnlocked
                          ? 'bg-gradient-to-tr from-amber-400 to-amber-200 ring-2 ring-amber-400/50'
                          : 'bg-slate-200 text-slate-400 grayscale'
                      }`}
                    >
                      {badge.emoji}
                    </div>

                    {isUnlocked ? (
                      <Badge className="bg-emerald-100 text-emerald-800 hover:bg-emerald-200 text-[10px] font-semibold border-emerald-200 gap-1 px-1.5 py-0.5">
                        <CheckCircle2 className="h-3 w-3 text-emerald-600" /> Conquistado
                      </Badge>
                    ) : (
                      <Badge
                        variant="outline"
                        className="text-slate-400 text-[10px] gap-1 px-1.5 py-0.5"
                      >
                        <Lock className="h-3 w-3" /> Bloqueado
                      </Badge>
                    )}
                  </div>

                  <p
                    className={`text-sm font-bold truncate ${
                      isUnlocked ? 'text-slate-900 font-extrabold' : 'text-slate-600'
                    }`}
                  >
                    {badge.name}
                  </p>
                  <p className="text-xs text-slate-500 mt-1 line-clamp-2 leading-relaxed">
                    {badge.criteria}
                  </p>
                </div>

                <div className="mt-3 pt-2 border-t border-slate-100 flex items-center justify-between text-[10px] text-slate-400">
                  <span className="capitalize">{badge.category}</span>
                  {isUnlocked && (
                    <span className="text-amber-600 font-semibold flex items-center gap-0.5">
                      <Sparkles className="h-2.5 w-2.5" /> Ativo
                    </span>
                  )}
                </div>
              </div>
            )
          })}
        </div>
      </CardContent>
    </Card>
  )
}
