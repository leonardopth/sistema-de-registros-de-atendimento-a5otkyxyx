import { UserRecord } from '@/types/service_record'
import { ControlTowerAgentLoad } from '@/types/control_tower'
import { Avatar, AvatarFallback } from '@/components/ui/avatar'
import { Badge } from '@/components/ui/badge'
import { Card } from '@/components/ui/card'
import { Users, AlertCircle } from 'lucide-react'

interface ControlTowerAgentLoadCardProps {
  loads: ControlTowerAgentLoad[]
  unassignedCount: number
  onFilterUser?: (userId: string) => void
  selectedUserId?: string
}

export function ControlTowerAgentLoadCard({
  loads,
  unassignedCount,
  onFilterUser,
  selectedUserId,
}: ControlTowerAgentLoadCardProps) {
  return (
    <Card className="p-3 border-slate-200 bg-white shadow-subtle space-y-2">
      <div className="flex items-center justify-between border-b pb-2">
        <div className="flex items-center gap-1.5 text-xs font-bold text-slate-800">
          <Users className="h-4 w-4 text-indigo-600" />
          <span>Carga de Atendimento por Colaborador</span>
        </div>
        <div className="flex items-center gap-2">
          {unassignedCount > 0 && (
            <Badge
              variant="outline"
              className="bg-amber-50 text-amber-800 border-amber-200 text-[10px] font-bold"
            >
              <AlertCircle className="h-3 w-3 mr-1 text-amber-600" />
              {unassignedCount} livres na fila
            </Badge>
          )}
        </div>
      </div>

      <div className="flex items-center gap-2 overflow-x-auto py-1 scrollbar-thin">
        {loads.map((agent) => {
          const isSelected = selectedUserId === agent.userId
          const initials =
            agent.userName
              ?.split(' ')
              .map((n) => n[0])
              .slice(0, 2)
              .join('')
              .toUpperCase() || '?'

          return (
            <button
              key={agent.userId}
              type="button"
              onClick={() => onFilterUser?.(agent.userId)}
              className={`flex items-center gap-2 px-2.5 py-1.5 rounded-lg border text-left shrink-0 transition-all ${
                isSelected
                  ? 'bg-indigo-50/80 border-indigo-400 ring-1 ring-indigo-400'
                  : 'bg-slate-50/60 border-slate-200 hover:bg-slate-100'
              }`}
            >
              <Avatar className="h-7 w-7 text-xs">
                <AvatarFallback className="bg-indigo-100 text-indigo-700 font-bold text-[10px]">
                  {initials}
                </AvatarFallback>
              </Avatar>
              <div className="min-w-0 pr-1">
                <p className="text-xs font-semibold text-slate-800 truncate max-w-[110px]">
                  {agent.userName}
                </p>
                <div className="flex items-center gap-1 mt-0.5">
                  <span className="text-[10px] font-bold text-slate-600">
                    {agent.activeCount} ativo{agent.activeCount === 1 ? '' : 's'}
                  </span>
                  {agent.p1Count > 0 && (
                    <span className="inline-block px-1 rounded bg-red-100 text-red-700 font-extrabold text-[9px]">
                      {agent.p1Count} P1
                    </span>
                  )}
                </div>
              </div>
            </button>
          )
        })}

        {loads.length === 0 && (
          <p className="text-xs text-slate-400 py-1">Nenhum atendimento atribuído no momento.</p>
        )}
      </div>
    </Card>
  )
}
