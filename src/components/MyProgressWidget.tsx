import React, { useEffect, useState } from 'react'
import { Card, CardContent } from '@/components/ui/card'
import { Progress } from '@/components/ui/progress'
import { Badge } from '@/components/ui/badge'
import { Button } from '@/components/ui/button'
import { getLevelDetails, recalculateGamification } from '@/services/gamification'
import { GamificationRecord } from '@/types/gamification'
import { Trophy, Zap, Award, Flame, RefreshCw, Star, Sparkles } from 'lucide-react'

interface MyProgressWidgetProps {
  userId: string
  userName: string
  userGamification: GamificationRecord | null
  onRefresh?: () => void
}

export function MyProgressWidget({
  userId,
  userName,
  userGamification,
  onRefresh,
}: MyProgressWidgetProps) {
  const [recalculating, setRecalculating] = useState(false)
  const xp = userGamification?.xp || 0
  const { currentLevel, nextLevel, currentXpInLevel, xpToNextLevel, progressPct } =
    getLevelDetails(xp)

  const handleRecalculate = async () => {
    setRecalculating(true)
    try {
      await recalculateGamification(userId)
      if (onRefresh) onRefresh()
    } finally {
      setRecalculating(false)
    }
  }

  const streakDays = userGamification?.streak_days || 0
  const dailyRecord = userGamification?.daily_record || 0
  const badgesCount = (userGamification?.badges || []).length

  return (
    <Card className="border-indigo-100/60 bg-gradient-to-r from-slate-900 via-indigo-950 to-slate-900 text-white shadow-lg overflow-hidden relative">
      {/* Detalhes de iluminação sutil de fundo */}
      <div className="absolute top-0 right-0 -mt-8 -mr-8 w-48 h-48 bg-indigo-500/10 rounded-full blur-3xl pointer-events-none" />
      <div className="absolute bottom-0 left-1/3 -mb-10 w-40 h-40 bg-purple-500/10 rounded-full blur-2xl pointer-events-none" />

      <CardContent className="p-5 md:p-6 relative z-10 space-y-4">
        <div className="flex flex-col md:flex-row md:items-center justify-between gap-4">
          <div className="flex items-center gap-3.5">
            <div className="relative">
              <div className="w-14 h-14 rounded-2xl bg-gradient-to-tr from-amber-500 to-indigo-500 p-0.5 shadow-md flex items-center justify-center">
                <div className="w-full h-full bg-slate-900 rounded-[14px] flex items-center justify-center text-2xl">
                  {currentLevel.icon}
                </div>
              </div>
              {currentLevel.name === 'Master' && (
                <div className="absolute -top-2 -right-1 text-base animate-bounce">👑</div>
              )}
            </div>

            <div>
              <div className="flex items-center gap-2 flex-wrap">
                <h3 className="text-lg md:text-xl font-bold tracking-tight text-white flex items-center gap-2">
                  Meu Progresso — {userName}
                </h3>
                <Badge
                  variant="outline"
                  className={`${currentLevel.bgBadge} ${currentLevel.borderBadge} ${currentLevel.textColor} text-xs font-semibold px-2.5 py-0.5 rounded-full border backdrop-blur-sm`}
                >
                  {currentLevel.icon} Nível {currentLevel.name}
                </Badge>
              </div>
              <p className="text-xs text-slate-300 mt-0.5 flex items-center gap-2">
                <span>{xp.toLocaleString('pt-BR')} XP Total acumulado</span>
                <span>•</span>
                <span className="text-amber-300 font-medium">
                  {nextLevel
                    ? `${xpToNextLevel} XP para ${nextLevel.name}`
                    : 'Nível Máximo Atingido! 🏆'}
                </span>
              </p>
            </div>
          </div>

          <div className="flex items-center gap-2 shrink-0 self-start md:self-auto">
            <Button
              variant="outline"
              size="sm"
              disabled={recalculating}
              onClick={handleRecalculate}
              className="h-8 text-xs bg-white/10 hover:bg-white/20 text-white border-white/20 hover:border-white/30 backdrop-blur-sm"
            >
              <RefreshCw className={`h-3.5 w-3.5 mr-1.5 ${recalculating ? 'animate-spin' : ''}`} />
              {recalculating ? 'Sincronizando...' : 'Atualizar XP'}
            </Button>
          </div>
        </div>

        {/* Barra de Progresso do Nível */}
        <div className="space-y-1.5 bg-black/20 p-3 rounded-xl border border-white/5">
          <div className="flex justify-between items-center text-xs">
            <span className="text-slate-300 flex items-center gap-1.5 font-medium">
              <Sparkles className="h-3.5 w-3.5 text-amber-400" />
              Progresso para {nextLevel ? nextLevel.name : 'Master'}:
            </span>
            <span className="font-bold text-amber-300">
              {progressPct}% ({currentXpInLevel} /{' '}
              {nextLevel ? nextLevel.minXp - currentLevel.minXp : currentXpInLevel} XP)
            </span>
          </div>
          <div className="w-full bg-slate-800/80 rounded-full h-2.5 overflow-hidden p-0.5 border border-white/10">
            <div
              className="h-full rounded-full bg-gradient-to-r from-amber-400 via-indigo-400 to-purple-400 transition-all duration-700 ease-out"
              style={{ width: `${progressPct}%` }}
            />
          </div>
        </div>

        {/* Estatísticas Rápidas: Badges, Recorde Diário, Streak */}
        <div className="grid grid-cols-3 gap-2 md:gap-3 pt-1">
          <div className="bg-white/5 border border-white/10 rounded-xl p-2.5 flex items-center gap-3">
            <div className="p-2 rounded-lg bg-amber-500/20 text-amber-300 shrink-0">
              <Award className="h-4 w-4" />
            </div>
            <div className="min-w-0">
              <p className="text-[10px] text-slate-400 uppercase tracking-wider font-semibold">
                Conquistas
              </p>
              <p className="text-base font-bold text-white">{badgesCount} / 10</p>
            </div>
          </div>

          <div className="bg-white/5 border border-white/10 rounded-xl p-2.5 flex items-center gap-3">
            <div className="p-2 rounded-lg bg-emerald-500/20 text-emerald-300 shrink-0">
              <Flame className="h-4 w-4" />
            </div>
            <div className="min-w-0">
              <p className="text-[10px] text-slate-400 uppercase tracking-wider font-semibold">
                Sequência Meta
              </p>
              <p className="text-base font-bold text-emerald-300">
                {streakDays} {streakDays === 1 ? 'dia' : 'dias'}
              </p>
            </div>
          </div>

          <div className="bg-white/5 border border-white/10 rounded-xl p-2.5 flex items-center gap-3">
            <div className="p-2 rounded-lg bg-purple-500/20 text-purple-300 shrink-0">
              <Zap className="h-4 w-4" />
            </div>
            <div className="min-w-0">
              <p className="text-[10px] text-slate-400 uppercase tracking-wider font-semibold">
                Recorde Diário
              </p>
              <p className="text-base font-bold text-white">{dailyRecord} atendimentos</p>
            </div>
          </div>
        </div>
      </CardContent>
    </Card>
  )
}
