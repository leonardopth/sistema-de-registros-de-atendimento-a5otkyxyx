import React, { useEffect, useState } from 'react'
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card'
import { Badge } from '@/components/ui/badge'
import { Button } from '@/components/ui/button'
import { ServiceRecord } from '@/types/service_record'
import { getGamificationByUser, getLevelDetails } from '@/services/gamification'
import { GamificationRecord, BADGE_DEFINITIONS } from '@/types/gamification'
import { useNavigate } from 'react-router-dom'
import { Trophy, Star, CheckCircle2, Flame, Award, ArrowRight, Sparkles } from 'lucide-react'

interface ConsultantGamificationProps {
  records?: ServiceRecord[]
  userName?: string
  userId?: string
  userRole?: string
}

export function ConsultantGamification({
  records = [],
  userName = '',
  userId,
  userRole,
}: ConsultantGamificationProps) {
  const navigate = useNavigate()
  const [gamification, setGamification] = useState<GamificationRecord | null>(null)

  useEffect(() => {
    if (userId) {
      getGamificationByUser(userId).then((res) => {
        if (res) setGamification(res)
      })
    }
  }, [userId, records])

  const safeRecords = Array.isArray(records) ? records : []
  const todayStr = new Date().toISOString().substring(0, 10)

  const todayRecords = safeRecords.filter(
    (r) => r && typeof r.created === 'string' && r.created.startsWith(todayStr),
  )
  const completedToday = todayRecords.filter((r) => r && r.status === 'Concluído').length
  const totalCompleted = safeRecords.filter((r) => r && r.status === 'Concluído').length

  // Se tiver registro no banco usa o XP real do sistema, senão calcula estimativa
  const xp =
    gamification?.xp !== undefined ? gamification.xp : completedToday * 10 + totalCompleted * 2
  const { currentLevel, nextLevel, currentXpInLevel, xpToNextLevel, progressPct } =
    getLevelDetails(xp)

  const badgesCount = (gamification?.badges || []).length
  const streakDays = gamification?.streak_days || 0

  return (
    <Card className="border-slate-200 shadow-subtle bg-gradient-to-br from-slate-900 via-indigo-950 to-slate-900 text-white relative overflow-hidden">
      {/* Brilho decorativo de fundo */}
      <div className="absolute top-0 right-0 -mt-6 -mr-6 w-32 h-32 bg-indigo-500/10 rounded-full blur-2xl pointer-events-none" />

      <CardHeader className="pb-2 relative z-10">
        <CardTitle className="text-sm font-bold text-white flex items-center justify-between">
          <span className="flex items-center gap-2">
            <Trophy className="h-4 w-4 text-amber-400" />{' '}
            {userRole === 'Executivo de Contas'
              ? 'Gamificação de Carteira & XP'
              : 'Meu Desempenho & XP'}
          </span>
          <Badge
            variant="outline"
            className={`${currentLevel.bgBadge} ${currentLevel.borderBadge} ${currentLevel.textColor} text-xs font-semibold px-2 py-0.5 rounded-full border backdrop-blur-sm`}
          >
            {currentLevel.icon} Nível {currentLevel.name}
          </Badge>
        </CardTitle>
      </CardHeader>
      <CardContent className="space-y-3 relative z-10">
        <div className="grid grid-cols-2 gap-2">
          <div className="p-2.5 rounded-xl bg-white/10 backdrop-blur-sm border border-white/5">
            <div className="flex items-center gap-1.5 text-xs text-slate-300">
              <Star className="h-3.5 w-3.5 text-amber-400" /> Pontuação
            </div>
            <p className="text-lg font-extrabold text-white mt-1">
              {xp.toLocaleString('pt-BR')}{' '}
              <span className="text-xs text-amber-300 font-normal">XP</span>
            </p>
          </div>
          <div className="p-2.5 rounded-xl bg-white/10 backdrop-blur-sm border border-white/5">
            <div className="flex items-center gap-1.5 text-xs text-slate-300">
              <CheckCircle2 className="h-3.5 w-3.5 text-emerald-400" />{' '}
              {userRole === 'Executivo de Contas' ? 'Alta Autonomia' : 'Hoje'}
            </div>
            <p className="text-lg font-extrabold text-white mt-1">
              {userRole === 'Executivo de Contas'
                ? `${gamification?.daily_record || 0}`
                : completedToday}{' '}
              <span className="text-xs text-slate-300 font-normal">
                {userRole === 'Executivo de Contas' ? 'clientes >80%' : 'concluídos'}
              </span>
            </p>
          </div>
        </div>

        {/* Barra de progresso para o próximo nível */}
        <div className="space-y-1">
          <div className="flex justify-between text-[11px] text-slate-300">
            <span className="flex items-center gap-1">
              <Sparkles className="h-3 w-3 text-amber-400" />
              {nextLevel ? `Para Nível ${nextLevel.name}` : 'Nível Máximo'}
            </span>
            <span className="font-semibold text-amber-300">
              {nextLevel ? `${xpToNextLevel} XP restantes` : 'Master 👑'}
            </span>
          </div>
          <div className="w-full h-2 bg-slate-800 rounded-full overflow-hidden p-0.5 border border-white/10">
            <div
              className="h-full bg-gradient-to-r from-amber-400 via-indigo-400 to-emerald-400 transition-all duration-500 rounded-full"
              style={{ width: `${progressPct}%` }}
            />
          </div>
        </div>

        {/* Badges e Botão para Ranking */}
        <div className="pt-1 flex items-center justify-between border-t border-white/10">
          <div className="flex items-center gap-2 text-xs text-slate-300">
            <Award className="h-3.5 w-3.5 text-indigo-400" />
            <span>
              <strong>{badgesCount}</strong> / 10 badges
            </span>
            {streakDays > 0 && (
              <span className="flex items-center gap-0.5 text-amber-300 font-bold ml-1">
                <Flame className="h-3 w-3 fill-amber-400" /> {streakDays}d
              </span>
            )}
          </div>

          <Button
            variant="ghost"
            size="sm"
            onClick={() => navigate('/ranking')}
            className="h-7 text-xs text-amber-300 hover:text-amber-200 hover:bg-white/10 p-1 px-2"
          >
            Ver Ranking <ArrowRight className="h-3 w-3 ml-1" />
          </Button>
        </div>
      </CardContent>
    </Card>
  )
}
