import { useState } from 'react'
import { useAuth } from '@/hooks/use-auth'
import {
  DropdownMenu,
  DropdownMenuContent,
  DropdownMenuItem,
  DropdownMenuLabel,
  DropdownMenuSeparator,
  DropdownMenuTrigger,
} from '@/components/ui/dropdown-menu'
import { Button } from '@/components/ui/button'
import {
  COLLABORATOR_STATUSES,
  STATUS_CONFIG,
  updateCollaboratorStatus,
} from '@/services/collaborator-status'
import { CollaboratorStatus } from '@/types/service_record'
import { useToast } from '@/hooks/use-toast'
import { cn } from '@/lib/utils'
import { ChevronDown, Loader2 } from 'lucide-react'

interface CollaboratorStatusSelectorProps {
  className?: string
  compact?: boolean
}

export function CollaboratorStatusSelector({
  className,
  compact = false,
}: CollaboratorStatusSelectorProps) {
  const { user } = useAuth()
  const { toast } = useToast()
  const [updating, setUpdating] = useState(false)

  const currentStatus: CollaboratorStatus = user?.current_status || 'Offline'
  const config = STATUS_CONFIG[currentStatus] || STATUS_CONFIG.Offline

  const handleStatusChange = async (newStatus: CollaboratorStatus) => {
    if (!user?.id || newStatus === currentStatus) return
    setUpdating(true)
    try {
      await updateCollaboratorStatus(user.id, newStatus)
      toast({
        title: 'Status atualizado',
        description: `Seu status agora é: ${newStatus}`,
      })
    } catch (err) {
      console.error(err)
      toast({
        variant: 'destructive',
        title: 'Erro ao atualizar status',
        description: 'Não foi possível registrar seu novo status.',
      })
    } finally {
      setUpdating(false)
    }
  }

  return (
    <DropdownMenu>
      <DropdownMenuTrigger asChild>
        <Button
          variant="outline"
          size="sm"
          disabled={updating}
          className={cn(
            'h-8 text-xs font-semibold flex items-center gap-2 border transition-all shadow-none',
            config.bgColor,
            config.textColor,
            config.borderColor,
            className,
          )}
        >
          {updating ? (
            <Loader2 className="h-3 w-3 animate-spin" />
          ) : (
            <span className={cn('h-2 w-2 rounded-full shrink-0', config.dotColor)} />
          )}
          {!compact && <span>{config.label}</span>}
          <ChevronDown className="h-3 w-3 opacity-60 ml-0.5 shrink-0" />
        </Button>
      </DropdownMenuTrigger>
      <DropdownMenuContent align="end" className="w-52">
        <DropdownMenuLabel className="text-[11px] font-bold text-slate-500 uppercase tracking-wider">
          Definir disponibilidade
        </DropdownMenuLabel>
        <DropdownMenuSeparator />
        {COLLABORATOR_STATUSES.map((status) => {
          const itemConfig = STATUS_CONFIG[status]
          const isSelected = status === currentStatus
          return (
            <DropdownMenuItem
              key={status}
              onClick={() => handleStatusChange(status)}
              className={cn(
                'flex items-center justify-between text-xs py-2 cursor-pointer font-medium',
                isSelected && 'bg-slate-100 font-bold',
              )}
            >
              <div className="flex items-center gap-2">
                <span className={cn('h-2 w-2 rounded-full shrink-0', itemConfig.dotColor)} />
                <span>{itemConfig.label}</span>
              </div>
              {isSelected && <span className="text-[10px] text-slate-400 font-normal">Atual</span>}
            </DropdownMenuItem>
          )
        })}
      </DropdownMenuContent>
    </DropdownMenu>
  )
}
