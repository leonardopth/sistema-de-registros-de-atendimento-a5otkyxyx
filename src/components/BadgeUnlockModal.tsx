import React, { useEffect } from 'react'
import confetti from 'canvas-confetti'
import {
  Dialog,
  DialogContent,
  DialogHeader,
  DialogTitle,
  DialogDescription,
} from '@/components/ui/dialog'
import { Button } from '@/components/ui/button'
import { BadgeDefinition } from '@/types/gamification'
import { Sparkles, Trophy, Check } from 'lucide-react'

interface BadgeUnlockModalProps {
  badge: BadgeDefinition | null
  open: boolean
  onClose: () => void
}

export function BadgeUnlockModal({ badge, open, onClose }: BadgeUnlockModalProps) {
  useEffect(() => {
    if (open && badge) {
      // Disparar efeito festivo de confete
      try {
        confetti({
          particleCount: 80,
          spread: 70,
          origin: { y: 0.6 },
          colors: ['#6366f1', '#f59e0b', '#10b981', '#ec4899', '#8b5cf6'],
        })
      } catch {
        /* intentionally ignored */
      }
    }
  }, [open, badge])

  if (!badge) return null

  return (
    <Dialog open={open} onOpenChange={(isOpen) => !isOpen && onClose()}>
      <DialogContent className="max-w-sm text-center p-6 border-amber-300 shadow-2xl bg-gradient-to-b from-amber-500/10 via-white to-white">
        <DialogHeader className="space-y-2">
          <div className="mx-auto w-20 h-20 rounded-3xl bg-gradient-to-tr from-amber-400 to-amber-200 ring-4 ring-amber-400/40 shadow-lg flex items-center justify-center text-4xl animate-bounce">
            {badge.emoji}
          </div>
          <DialogTitle className="text-xl font-extrabold text-slate-900 flex items-center justify-center gap-2">
            <Sparkles className="h-5 w-5 text-amber-500" />
            Nova Conquista!
          </DialogTitle>
          <DialogDescription className="text-xs text-slate-500">
            Você desbloqueou uma nova medalha com o seu desempenho!
          </DialogDescription>
        </DialogHeader>

        <div className="my-3 p-3 bg-amber-500/10 rounded-2xl border border-amber-200">
          <h4 className="text-base font-bold text-amber-950">{badge.name}</h4>
          <p className="text-xs text-slate-600 mt-1">{badge.criteria}</p>
        </div>

        <Button
          onClick={onClose}
          className="w-full bg-gradient-to-r from-amber-500 to-amber-600 hover:from-amber-600 hover:to-amber-700 text-white font-bold"
        >
          <Check className="h-4 w-4 mr-1.5" /> Continuar Arrasando!
        </Button>
      </DialogContent>
    </Dialog>
  )
}
