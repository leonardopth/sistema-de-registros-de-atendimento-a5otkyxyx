import { useState } from 'react'
import {
  DropdownMenu,
  DropdownMenuContent,
  DropdownMenuItem,
  DropdownMenuLabel,
  DropdownMenuSeparator,
  DropdownMenuTrigger,
} from '@/components/ui/dropdown-menu'
import { Button } from '@/components/ui/button'
import { MANUAL_COLLABORATOR_STATUSES, STATUS_CONFIG } from '@/services/collaborator-status'
import { CollaboratorStatus } from '@/types/service_record'
import { usePresence } from '@/hooks/use-presence'
import { useToast } from '@/hooks/use-toast'
import { cn } from '@/lib/utils'
import { ChevronDown, Loader2, Sparkles, UserCheck } from 'lucide-react'

interface CollaboratorStatusSelectorProps {
  className?: string
  compact?: boolean
}

export function CollaboratorStatusSelector({
  className,
  compact = false,
}: CollaboratorStatusSelectorProps) {
  const { toast } = useToast()
  const { derivedStatus, presenceSource, setManualStatus, resumeAutomatic, idleSinceMinutes } =
    usePresence()
  const [updating, setUpdating] = useState(false)

  const config = STATUS_CONFIG[derivedStatus] || STATUS_CONFIG.Offline
  const isAutoMode = presenceSource === 'auto'

  const handleStatusChange = async (newStatus: CollaboratorStatus) => {
    if (newStatus === derivedStatus && !isAutoMode) return
    setUpdating(true)
    try {
      if (newStatus === 'Disponível') {
        await resumeAutomatic()
        toast({
          title: 'Modo Automático ativado',
          description: 'Sua presença será gerenciada automaticamente pela sua atividade.',
        })
      } else {
        await setManualStatus(newStatus)
        toast({
          title: 'Status definido manualmente',
          description: `Seu status agora é: ${newStatus}`,
        })
      }
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

  const handleResumeAuto = async () => {
    setUpdating(true)
    try {
      await resumeAutomatic()
      toast({
        title: 'Disponibilidade Automática ativada',
        description: 'Status sincronizado com sua atividade (Disponível / Ausente após 15 min).',
      })
    } catch (err) {
      console.error(err)
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
          title={
            isAutoMode
              ? `Status Automático: ${config.label}${
                  derivedStatus === 'Ausente' ? ` (sem interação há ${idleSinceMinutes}min)` : ''
                }`
              : `Status Manual: ${config.label}`
          }
          className={cn(
            'h-8 text-xs font-semibold flex items-center gap-1.5 border transition-all shadow-none',
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
          {!compact && (
            <span className="flex items-center gap-1">
              <span>{config.label}</span>
              {isAutoMode && (
                <span className="text-[9px] px-1 py-0.2 rounded bg-white/70 border border-slate-200/80 text-slate-600 font-mono font-medium">
                  auto
                </span>
              )}
            </span>
          )}
          <ChevronDown className="h-3 w-3 opacity-60 ml-0.5 shrink-0" />
        </Button>
      </DropdownMenuTrigger>
      <DropdownMenuContent align="end" className="w-60">
        <DropdownMenuLabel className="text-[11px] font-bold text-slate-500 uppercase tracking-wider flex items-center justify-between">
          <span>Definir disponibilidade</span>
          {isAutoMode ? (
            <span className="text-[10px] text-emerald-600 font-normal flex items-center gap-0.5">
              <Sparkles className="h-2.5 w-2.5" /> Auto ativo
            </span>
          ) : (
            <span className="text-[10px] text-indigo-600 font-normal flex items-center gap-0.5">
              <UserCheck className="h-2.5 w-2.5" /> Manual
            </span>
          )}
        </DropdownMenuLabel>
        <DropdownMenuSeparator />

        {/* Opção rápida de Modo Automático se estiver em manual */}
        {!isAutoMode && (
          <>
            <DropdownMenuItem
              onClick={handleResumeAuto}
              className="text-xs py-2 cursor-pointer font-semibold text-emerald-700 bg-emerald-50/60 hover:bg-emerald-100/70 mb-1"
            >
              <div className="flex items-center gap-2">
                <Sparkles className="h-3.5 w-3.5 text-emerald-600" />
                <div>
                  <p className="font-bold leading-tight">Retomar Automático</p>
                  <p className="text-[10px] text-emerald-600/80 font-normal leading-tight">
                    Disponível / Ausente após 15 min
                  </p>
                </div>
              </div>
            </DropdownMenuItem>
            <DropdownMenuSeparator />
          </>
        )}

        {MANUAL_COLLABORATOR_STATUSES.map((status) => {
          const itemConfig = STATUS_CONFIG[status]
          const isSelected = status === derivedStatus
          const isDisponivel = status === 'Disponível'
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
                {isDisponivel && (
                  <span className="text-[9px] text-slate-400 font-normal">(Automático)</span>
                )}
              </div>
              {isSelected && (
                <span className="text-[10px] text-slate-500 font-normal">
                  {isAutoMode ? 'Atual (auto)' : 'Atual'}
                </span>
              )}
            </DropdownMenuItem>
          )
        })}

        <DropdownMenuSeparator />
        <div className="px-2 py-1.5 text-[10px] text-slate-500 leading-snug">
          Sem atividade por 15 min → <span className="font-semibold text-amber-700">Ausente</span>
          <br />
          Ao interagir → <span className="font-semibold text-emerald-700">Disponível</span>
        </div>
      </DropdownMenuContent>
    </DropdownMenu>
  )
}
