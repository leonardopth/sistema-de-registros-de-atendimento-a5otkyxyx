import React from 'react'
import { Card, CardContent } from '@/components/ui/card'
import { Badge } from '@/components/ui/badge'
import { Avatar, AvatarFallback } from '@/components/ui/avatar'
import { MonthlyAwardRecord } from '@/types/gamification'
import { Trophy, TrendingUp, Sparkles, Star, Award, Calendar } from 'lucide-react'

interface SocialRecognitionBannerProps {
  awards: MonthlyAwardRecord[]
  monthYear?: string
}

export function SocialRecognitionBanner({ awards = [], monthYear }: SocialRecognitionBannerProps) {
  // Apenas Consultor e Executivo de Contas podem aparecer no reconhecimento social
  const isEligibleUser = (award: MonthlyAwardRecord) => {
    const userRole = award.expand?.user_id?.role
    // Se o cargo estiver presente no expand, deve ser Consultor ou Executivo de Contas
    if (userRole) {
      return userRole === 'Consultor' || userRole === 'Executivo de Contas'
    }
    return true
  }

  const eligibleAwards = awards.filter(isEligibleUser)
  const employeeOfMonth = eligibleAwards.find((a) => a.award_type === 'employee_of_month')
  const notableEvolution = eligibleAwards.find((a) => a.award_type === 'notable_evolution')

  const renderAwardCard = (award: MonthlyAwardRecord, type: 'employee' | 'evolution') => {
    const isEmployee = type === 'employee'
    const user = award.expand?.user_id
    const userName = award.details?.userName || user?.name || 'Colaborador Destaque'
    const initials = userName
      .split(' ')
      .map((n) => n[0])
      .slice(0, 2)
      .join('')
      .toUpperCase()

    return (
      <div
        key={award.id || type}
        className={`relative overflow-hidden rounded-2xl p-4 border transition-all ${
          isEmployee
            ? 'bg-gradient-to-br from-amber-500/15 via-amber-500/5 to-white border-amber-300 shadow-sm'
            : 'bg-gradient-to-br from-indigo-500/15 via-purple-500/5 to-white border-indigo-200 shadow-sm'
        }`}
      >
        <div className="flex items-start justify-between gap-3">
          <div className="flex items-center gap-3">
            <div className="relative">
              <Avatar
                className={`w-12 h-12 ring-2 ${isEmployee ? 'ring-amber-400' : 'ring-indigo-400'}`}
              >
                <AvatarFallback
                  className={`font-bold text-sm ${
                    isEmployee ? 'bg-amber-500 text-amber-950' : 'bg-indigo-600 text-white'
                  }`}
                >
                  {initials}
                </AvatarFallback>
              </Avatar>
              <div className="absolute -bottom-1 -right-1 text-sm bg-white rounded-full p-0.5 shadow">
                {isEmployee ? '👑' : '🚀'}
              </div>
            </div>

            <div>
              <div className="flex items-center gap-2">
                <Badge
                  className={`text-[10px] font-bold uppercase tracking-wider ${
                    isEmployee ? 'bg-amber-400 text-amber-950' : 'bg-indigo-600 text-white'
                  }`}
                >
                  {isEmployee ? '⭐ Colaborador do Mês' : '🚀 Evolução Notável'}
                </Badge>
                {award.month_year && (
                  <span className="text-[10px] text-slate-400 flex items-center gap-1">
                    <Calendar className="h-2.5 w-2.5" />
                    {award.month_year}
                  </span>
                )}
              </div>
              <p className="text-sm font-extrabold text-slate-900 mt-1">{userName}</p>
              <p className="text-xs text-slate-600 mt-0.5">
                {isEmployee ? (
                  <span>
                    Atingiu{' '}
                    <strong className="text-amber-700">
                      {award.details?.progressPct || award.metric_value}% da meta
                    </strong>{' '}
                    com {award.details?.completed || 0} atendimentos concluídos!
                  </span>
                ) : (
                  <span>
                    Maior crescimento vs. mês anterior (+
                    <strong className="text-indigo-700">
                      {award.details?.growth || award.metric_value} atendimentos
                    </strong>
                    )!
                  </span>
                )}
              </p>
            </div>
          </div>
        </div>
      </div>
    )
  }

  return (
    <Card className="border-indigo-100 bg-white shadow-subtle overflow-hidden">
      <CardContent className="p-4 md:p-5 space-y-3">
        <div className="flex items-center justify-between">
          <div className="flex items-center gap-2">
            <Trophy className="h-5 w-5 text-amber-500" />
            <h4 className="text-sm font-bold text-slate-900">
              Reconhecimento Social — Destaques do Mês
            </h4>
          </div>
          <Badge variant="outline" className="text-[10px] bg-slate-50 text-slate-600">
            Automático & Atualizado
          </Badge>
        </div>

        <div className="grid grid-cols-1 md:grid-cols-2 gap-3">
          {employeeOfMonth ? (
            renderAwardCard(employeeOfMonth, 'employee')
          ) : (
            <div className="rounded-2xl p-4 border border-dashed border-slate-200 bg-slate-50/60 flex items-center gap-3 text-slate-500">
              <div className="w-12 h-12 rounded-full bg-slate-100 flex items-center justify-center text-xl shrink-0">
                ⭐
              </div>
              <div>
                <Badge
                  variant="outline"
                  className="text-[10px] uppercase font-bold text-slate-500 bg-white"
                >
                  Colaborador do Mês
                </Badge>
                <p className="text-xs font-semibold text-slate-700 mt-1">Apurando destaques...</p>
                <p className="text-[11px] text-slate-400">
                  Elegível para Consultores e Executivos de Contas com maior % de meta batida.
                </p>
              </div>
            </div>
          )}

          {notableEvolution ? (
            renderAwardCard(notableEvolution, 'evolution')
          ) : (
            <div className="rounded-2xl p-4 border border-dashed border-slate-200 bg-slate-50/60 flex items-center gap-3 text-slate-500">
              <div className="w-12 h-12 rounded-full bg-slate-100 flex items-center justify-center text-xl shrink-0">
                🚀
              </div>
              <div>
                <Badge
                  variant="outline"
                  className="text-[10px] uppercase font-bold text-slate-500 bg-white"
                >
                  Evolução Notável
                </Badge>
                <p className="text-xs font-semibold text-slate-700 mt-1">Apurando destaques...</p>
                <p className="text-[11px] text-slate-400">
                  Elegível para Consultores e Executivos de Contas com maior crescimento mensal.
                </p>
              </div>
            </div>
          )}
        </div>
      </CardContent>
    </Card>
  )
}
