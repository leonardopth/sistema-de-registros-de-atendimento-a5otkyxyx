import React, { useState } from 'react'
import {
  Table,
  TableHeader,
  TableBody,
  TableRow,
  TableHead,
  TableCell,
} from '@/components/ui/table'
import { Avatar, AvatarFallback } from '@/components/ui/avatar'
import { Badge } from '@/components/ui/badge'
import { Button } from '@/components/ui/button'
import {
  Dialog,
  DialogContent,
  DialogHeader,
  DialogTitle,
  DialogDescription,
} from '@/components/ui/dialog'
import { LEVELS, BADGE_DEFINITIONS, UserRankingEntry } from '@/types/gamification'
import { Trophy, Medal, Award, Flame, Zap, CheckCircle2 } from 'lucide-react'

interface RankingTableProps {
  entries: UserRankingEntry[]
  currentUserId?: string
}

export function RankingTable({ entries, currentUserId }: RankingTableProps) {
  const [selectedUser, setSelectedUser] = useState<UserRankingEntry | null>(null)

  if (!entries || entries.length === 0) {
    return (
      <div className="p-8 text-center text-xs text-slate-400 bg-white rounded-xl border border-slate-200">
        Nenhum participante encontrado para este filtro.
      </div>
    )
  }

  const getPosIcon = (pos: number) => {
    if (pos === 1) return <span className="text-lg">🥇</span>
    if (pos === 2) return <span className="text-lg">🥈</span>
    if (pos === 3) return <span className="text-lg">🥉</span>
    return (
      <span className="inline-flex items-center justify-center w-6 h-6 rounded-full bg-slate-100 text-xs font-bold text-slate-600">
        {pos}º
      </span>
    )
  }

  return (
    <>
      <div className="overflow-hidden rounded-xl border border-slate-200 bg-white shadow-subtle">
        <Table>
          <TableHeader className="bg-slate-50/80">
            <TableRow>
              <TableHead className="w-16 text-center text-xs font-bold">Posição</TableHead>
              <TableHead className="text-xs font-bold">Consultor / Colaborador</TableHead>
              <TableHead className="text-xs font-bold">Nível</TableHead>
              <TableHead className="text-xs font-bold text-center">XP Total</TableHead>
              <TableHead className="text-xs font-bold text-center">Atendimentos</TableHead>
              <TableHead className="text-xs font-bold text-center">Badges</TableHead>
              <TableHead className="text-xs font-bold text-center">Sequência</TableHead>
              <TableHead className="w-20 text-center text-xs font-bold">Ações</TableHead>
            </TableRow>
          </TableHeader>
          <TableBody>
            {entries.map((entry) => {
              const isCurrentUser = entry.user.id === currentUserId
              const levelCfg = LEVELS.find((l) => l.name === entry.level) || LEVELS[0]
              const initials =
                entry.user.name
                  ?.split(' ')
                  .map((n) => n[0])
                  .slice(0, 2)
                  .join('')
                  .toUpperCase() || '?'
              const isExec = entry.user.role === 'Executivo de Contas'

              return (
                <TableRow
                  key={entry.user.id}
                  className={`hover:bg-slate-50/80 transition-colors ${
                    isCurrentUser ? 'bg-indigo-50/60 font-semibold' : ''
                  }`}
                >
                  <TableCell className="text-center">{getPosIcon(entry.rank)}</TableCell>

                  <TableCell>
                    <div className="flex items-center gap-3">
                      <Avatar className="h-9 w-9 ring-1 ring-slate-200 shrink-0">
                        <AvatarFallback className="bg-indigo-100 text-indigo-700 text-xs font-bold">
                          {initials}
                        </AvatarFallback>
                      </Avatar>
                      <div className="min-w-0">
                        <div className="flex items-center gap-1.5 flex-wrap">
                          <p
                            className={`text-xs font-bold truncate ${
                              entry.level === 'Pleno' ||
                              entry.level === 'Sênior' ||
                              entry.level === 'Expert' ||
                              entry.level === 'Master'
                                ? 'text-indigo-950'
                                : 'text-slate-900'
                            }`}
                          >
                            {entry.user.name}
                          </p>
                          {isCurrentUser && (
                            <Badge
                              variant="secondary"
                              className="text-[9px] px-1.5 py-0 bg-indigo-600 text-white font-semibold"
                            >
                              Você
                            </Badge>
                          )}
                          {entry.level === 'Master' && (
                            <span className="text-xs" title="Master">
                              👑
                            </span>
                          )}
                          {entry.level === 'Sênior' && (
                            <span className="text-xs text-amber-500" title="Sênior">
                              ⭐
                            </span>
                          )}
                        </div>
                        <p className="text-[10px] text-slate-500 truncate">
                          {entry.user.role || 'Consultor'}
                          {isExec && entry.managedClientsCount !== undefined
                            ? ` • ${entry.managedClientsCount} clientes gerenciados`
                            : entry.serviceGroups && entry.serviceGroups.length > 0
                              ? ` • ${entry.serviceGroups.join(', ')}`
                              : ''}
                        </p>
                      </div>
                    </div>
                  </TableCell>

                  <TableCell>
                    <Badge
                      variant="outline"
                      className={`text-[10px] px-2 py-0.5 ${levelCfg.bgBadge} ${levelCfg.borderBadge} ${levelCfg.textColor} font-semibold`}
                    >
                      {levelCfg.icon} {entry.level}
                    </Badge>
                  </TableCell>

                  <TableCell className="text-center">
                    <span className="text-xs font-extrabold text-indigo-700">
                      {entry.xp.toLocaleString('pt-BR')}{' '}
                      <span className="text-[10px] text-slate-400 font-normal">XP</span>
                    </span>
                    {isExec && (
                      <span className="block text-[9px] text-emerald-600 font-semibold">
                        Autonomia: {entry.avgAutonomyRate ?? 85}%
                      </span>
                    )}
                  </TableCell>

                  <TableCell className="text-center text-xs font-medium text-slate-700">
                    {isExec ? (
                      <span
                        className="inline-flex items-center gap-1 font-semibold text-indigo-600"
                        title="Clientes gerenciados / Em alta autonomia"
                      >
                        {entry.managedClientsCount ?? 0} ({entry.highAutonomyClientsCount ?? 0}{' '}
                        &gt;80%)
                      </span>
                    ) : (
                      entry.completedCount
                    )}
                  </TableCell>

                  <TableCell className="text-center">
                    <div className="flex items-center justify-center gap-0.5 flex-wrap max-w-[140px] mx-auto">
                      {entry.badges && entry.badges.length > 0 ? (
                        entry.badges.slice(0, 4).map((bKey) => {
                          const bDef = BADGE_DEFINITIONS[bKey]
                          return (
                            <span
                              key={bKey}
                              title={bDef ? `${bDef.name}: ${bDef.criteria}` : bKey}
                              className="inline-flex items-center justify-center w-5 h-5 rounded-full bg-slate-100 text-[11px] cursor-help hover:scale-125 transition-transform"
                            >
                              {bDef?.emoji || '🏅'}
                            </span>
                          )
                        })
                      ) : (
                        <span className="text-[10px] text-slate-400">—</span>
                      )}
                      {entry.badges && entry.badges.length > 4 && (
                        <span className="text-[10px] font-bold text-slate-500 ml-1">
                          +{entry.badges.length - 4}
                        </span>
                      )}
                    </div>
                  </TableCell>

                  <TableCell className="text-center">
                    {isExec ? (
                      entry.evolutionPositiveCount && entry.evolutionPositiveCount > 0 ? (
                        <span
                          className="inline-flex items-center gap-1 text-[11px] font-bold text-emerald-600 bg-emerald-50 px-2 py-0.5 rounded-full border border-emerald-200"
                          title="Clientes com melhora de autonomia"
                        >
                          <Flame className="h-3 w-3 text-emerald-500 fill-emerald-500" />+
                          {entry.evolutionPositiveCount} evoluindo
                        </span>
                      ) : (
                        <span className="text-[10px] text-slate-400">—</span>
                      )
                    ) : entry.streakDays > 0 ? (
                      <span className="inline-flex items-center gap-1 text-[11px] font-bold text-amber-600 bg-amber-50 px-2 py-0.5 rounded-full border border-amber-200">
                        <Flame className="h-3 w-3 text-amber-500 fill-amber-500" />
                        {entry.streakDays}d
                      </span>
                    ) : (
                      <span className="text-[10px] text-slate-400">—</span>
                    )}
                  </TableCell>

                  <TableCell className="text-center">
                    <Button
                      variant="ghost"
                      size="sm"
                      onClick={() => setSelectedUser(entry)}
                      className="h-7 text-xs text-indigo-600 hover:text-indigo-800 hover:bg-indigo-50 px-2"
                    >
                      Ver perfil
                    </Button>
                  </TableCell>
                </TableRow>
              )
            })}
          </TableBody>
        </Table>
      </div>

      {/* Modal de Detalhes do Usuário Selecionado */}
      {selectedUser && (
        <Dialog open={!!selectedUser} onOpenChange={(open) => !open && setSelectedUser(null)}>
          <DialogContent className="max-w-md">
            <DialogHeader>
              <DialogTitle className="flex items-center gap-2 text-base">
                <Trophy className="h-5 w-5 text-amber-500" /> Perfil de Gamificação
              </DialogTitle>
              <DialogDescription className="text-xs text-slate-500">
                Conquistas e métricas detalhadas do colaborador
              </DialogDescription>
            </DialogHeader>

            <div className="space-y-4 pt-2">
              <div className="flex items-center gap-3 p-3 bg-slate-50 rounded-xl border border-slate-200">
                <Avatar className="h-12 w-12 ring-2 ring-indigo-500/30">
                  <AvatarFallback className="bg-indigo-600 text-white font-bold text-sm">
                    {selectedUser.user.name
                      ?.split(' ')
                      .map((n) => n[0])
                      .slice(0, 2)
                      .join('')
                      .toUpperCase() || '?'}
                  </AvatarFallback>
                </Avatar>
                <div className="min-w-0 flex-1">
                  <p className="text-sm font-bold text-slate-900">{selectedUser.user.name}</p>
                  <p className="text-xs text-slate-500">{selectedUser.user.role || 'Consultor'}</p>
                  <div className="flex items-center gap-1.5 mt-1">
                    <Badge variant="outline" className="text-[10px] bg-white">
                      Posição #{selectedUser.rank} no Ranking
                    </Badge>
                  </div>
                </div>
              </div>

              <div className="grid grid-cols-2 gap-2">
                <div className="p-3 bg-indigo-50/60 rounded-xl border border-indigo-100">
                  <p className="text-[10px] font-semibold text-indigo-700 uppercase">
                    XP Acumulado
                  </p>
                  <p className="text-xl font-extrabold text-indigo-900 mt-0.5">
                    {selectedUser.xp.toLocaleString('pt-BR')}{' '}
                    <span className="text-xs font-normal">XP</span>
                  </p>
                </div>

                <div className="p-3 bg-emerald-50/60 rounded-xl border border-emerald-100">
                  <p className="text-[10px] font-semibold text-emerald-700 uppercase">
                    {selectedUser.user.role === 'Executivo de Contas'
                      ? 'Autonomia da Carteira'
                      : 'Atendimentos Concluídos'}
                  </p>
                  <p className="text-xl font-extrabold text-emerald-900 mt-0.5">
                    {selectedUser.user.role === 'Executivo de Contas'
                      ? `${selectedUser.avgAutonomyRate ?? 85}% (${selectedUser.managedClientsCount ?? 0} clientes)`
                      : selectedUser.completedCount}
                  </p>
                </div>
              </div>

              {/* Todas as Badges */}
              <div className="space-y-2">
                <p className="text-xs font-bold text-slate-800 flex items-center gap-1.5">
                  <Award className="h-4 w-4 text-indigo-600" />
                  Badges Desbloqueados ({selectedUser.badges.length}/10)
                </p>

                <div className="grid grid-cols-2 gap-2 max-h-56 overflow-y-auto p-1">
                  {Object.values(BADGE_DEFINITIONS).map((badge) => {
                    const isUnlocked = selectedUser.badges.includes(badge.key)
                    return (
                      <div
                        key={badge.key}
                        className={`p-2.5 rounded-xl border text-left flex items-start gap-2.5 transition-colors ${
                          isUnlocked
                            ? 'bg-amber-50/40 border-amber-200'
                            : 'bg-slate-50/60 border-slate-200 opacity-50'
                        }`}
                      >
                        <span className="text-xl shrink-0">{badge.emoji}</span>
                        <div className="min-w-0">
                          <p
                            className={`text-xs font-bold truncate ${
                              isUnlocked ? 'text-amber-950' : 'text-slate-500'
                            }`}
                          >
                            {badge.name}
                          </p>
                          <p className="text-[10px] text-slate-500 line-clamp-2 mt-0.5">
                            {badge.criteria}
                          </p>
                        </div>
                      </div>
                    )
                  })}
                </div>
              </div>
            </div>
          </DialogContent>
        </Dialog>
      )}
    </>
  )
}
