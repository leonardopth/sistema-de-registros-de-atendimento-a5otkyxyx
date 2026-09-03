import React, { useState } from 'react'
import { useAuth } from '@/hooks/use-auth'
import { DEFAULT_REACTION_EMOJIS, toggleSocialReaction } from '@/services/social_reactions'
import { SocialReactionItemType, ReactionSummary } from '@/types/gamification'
import { useToast } from '@/hooks/use-toast'
import { Popover, PopoverContent, PopoverTrigger } from '@/components/ui/popover'
import { Button } from '@/components/ui/button'
import { SmilePlus } from 'lucide-react'

interface ReactionBarProps {
  itemType: SocialReactionItemType
  itemId: string
  summary?: ReactionSummary
  onReactionChange?: (updatedSummary: ReactionSummary) => void
  size?: 'sm' | 'default'
  compact?: boolean
  className?: string
}

export function ReactionBar({
  itemType,
  itemId,
  summary = { emojiCounts: {}, totalCount: 0 },
  onReactionChange,
  size = 'default',
  compact = false,
  className = '',
}: ReactionBarProps) {
  const { user } = useAuth()
  const { toast } = useToast()
  const [popoverOpen, setPopoverOpen] = useState(false)
  const [isSubmitting, setIsSubmitting] = useState(false)

  // Estado local otimista
  const [localSummary, setLocalSummary] = useState<ReactionSummary>(summary)

  // Sincroniza se a prop mudar
  React.useEffect(() => {
    setLocalSummary(summary)
  }, [summary.totalCount, summary.userReaction, JSON.stringify(summary.emojiCounts)])

  const handleEmojiClick = async (emoji: string) => {
    if (!user?.id) {
      toast({
        title: 'Login necessário',
        description: 'Faça login para interagir com reações.',
        variant: 'destructive',
      })
      return
    }

    if (isSubmitting) return

    // Cálculo otimista
    const prevReaction = localSummary.userReaction
    const prevCounts = { ...localSummary.emojiCounts }
    let nextCounts = { ...prevCounts }
    let nextUserReaction: string | undefined = undefined
    let nextTotal = localSummary.totalCount

    if (prevReaction === emoji) {
      // Toggle off
      nextCounts[emoji] = Math.max(0, (nextCounts[emoji] || 1) - 1)
      if (nextCounts[emoji] === 0) delete nextCounts[emoji]
      nextUserReaction = undefined
      nextTotal = Math.max(0, nextTotal - 1)
    } else {
      // Troca ou adição
      if (prevReaction) {
        nextCounts[prevReaction] = Math.max(0, (nextCounts[prevReaction] || 1) - 1)
        if (nextCounts[prevReaction] === 0) delete nextCounts[prevReaction]
      } else {
        nextTotal += 1
      }
      nextCounts[emoji] = (nextCounts[emoji] || 0) + 1
      nextUserReaction = emoji
    }

    const nextSummary: ReactionSummary = {
      emojiCounts: nextCounts,
      userReaction: nextUserReaction,
      totalCount: nextTotal,
    }

    setLocalSummary(nextSummary)
    if (onReactionChange) {
      onReactionChange(nextSummary)
    }
    setPopoverOpen(false)

    try {
      setIsSubmitting(true)
      await toggleSocialReaction(itemType, itemId, emoji, user.id)
    } catch (err: any) {
      // Reverter em caso de falha
      setLocalSummary(localSummary)
      if (onReactionChange) {
        onReactionChange(localSummary)
      }
      toast({
        title: 'Erro ao reagir',
        description: 'Não foi possível salvar sua reação. Tente novamente.',
        variant: 'destructive',
      })
    } finally {
      setIsSubmitting(false)
    }
  }

  // Lista de emojis que já têm reações registradas
  const activeEmojisWithCounts = Object.entries(localSummary.emojiCounts).filter(
    ([, count]) => count > 0,
  )

  const isSmall = size === 'sm'

  return (
    <div className={`flex items-center flex-wrap gap-1.5 ${className}`}>
      {/* Botões dos emojis já reagidos */}
      {activeEmojisWithCounts.map(([emoji, count]) => {
        const isMyReaction = localSummary.userReaction === emoji
        return (
          <button
            key={emoji}
            type="button"
            onClick={() => handleEmojiClick(emoji)}
            disabled={isSubmitting}
            title={isMyReaction ? 'Clique para remover sua reação' : `Reagir com ${emoji}`}
            className={`inline-flex items-center gap-1 rounded-full border transition-all select-none cursor-pointer active:scale-95 ${
              isSmall ? 'px-1.5 py-0.5 text-[11px]' : 'px-2 py-0.5 text-xs'
            } ${
              isMyReaction
                ? 'bg-amber-100/90 text-amber-900 border-amber-300 font-bold shadow-xs hover:bg-amber-200/90'
                : 'bg-white/90 text-slate-700 border-slate-200/90 hover:bg-slate-100 hover:border-slate-300 shadow-xs'
            }`}
          >
            <span className={isSmall ? 'text-xs' : 'text-sm'}>{emoji}</span>
            <span className="font-semibold tabular-nums">{count}</span>
          </button>
        )
      })}

      {/* Popover / Seletor de emojis para adicionar nova reação */}
      <Popover open={popoverOpen} onOpenChange={setPopoverOpen}>
        <PopoverTrigger asChild>
          <Button
            variant="ghost"
            size="sm"
            className={`h-6 px-1.5 text-slate-400 hover:text-slate-700 hover:bg-slate-100/80 rounded-full border border-dashed border-slate-200/80 transition-colors ${
              isSmall ? 'h-5 px-1.5 text-[10px]' : 'h-6 px-2 text-xs'
            }`}
            title="Adicionar reação"
          >
            <SmilePlus className={isSmall ? 'h-3 w-3 mr-0.5' : 'h-3.5 w-3.5 mr-1'} />
            {!compact && <span className="font-medium text-[11px]">Reagir</span>}
            {compact && localSummary.totalCount === 0 && (
              <span className="font-normal text-[10px] text-slate-400 ml-0.5">Reagir</span>
            )}
          </Button>
        </PopoverTrigger>
        <PopoverContent
          side="top"
          align="start"
          sideOffset={4}
          className="w-auto p-1.5 bg-white shadow-lg border border-slate-200 rounded-2xl flex items-center gap-1 z-50 animate-in fade-in-50 zoom-in-95 duration-100"
        >
          {DEFAULT_REACTION_EMOJIS.map((emoji) => {
            const isSelected = localSummary.userReaction === emoji
            return (
              <button
                key={emoji}
                type="button"
                onClick={() => handleEmojiClick(emoji)}
                className={`p-1.5 text-base rounded-xl transition-all hover:scale-125 hover:bg-slate-100 active:scale-95 select-none ${
                  isSelected ? 'bg-amber-100 ring-2 ring-amber-400 scale-110' : ''
                }`}
                title={`Reagir com ${emoji}`}
              >
                {emoji}
              </button>
            )
          })}
        </PopoverContent>
      </Popover>

      {/* Total consolidado se houver reações */}
      {localSummary.totalCount > 0 && !compact && (
        <span className="text-[10px] text-slate-400 select-none ml-0.5">
          {localSummary.totalCount} {localSummary.totalCount === 1 ? 'reação' : 'reações'}
        </span>
      )}
    </div>
  )
}
