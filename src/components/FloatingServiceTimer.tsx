import { useState, useEffect, useRef } from 'react'
import { Button } from '@/components/ui/button'
import { Pause, Play, RotateCcw, Clock } from 'lucide-react'
import { cn } from '@/lib/utils'

interface FloatingServiceTimerProps {
  timerStart: string | null
  timerRunning: boolean
  accumulatedMs: number
  onStart: () => void
  onPause: (totalElapsedMs: number) => void
  onReset: () => void
}

export function FloatingServiceTimer({
  timerStart,
  timerRunning,
  accumulatedMs,
  onStart,
  onPause,
  onReset,
}: FloatingServiceTimerProps) {
  const [elapsed, setElapsed] = useState(accumulatedMs)
  const intervalRef = useRef<ReturnType<typeof setInterval> | null>(null)

  useEffect(() => {
    if (timerRunning && timerStart) {
      intervalRef.current = setInterval(() => {
        setElapsed(accumulatedMs + (Date.now() - new Date(timerStart).getTime()))
      }, 1000)
    } else {
      if (intervalRef.current) clearInterval(intervalRef.current)
      setElapsed(accumulatedMs)
    }
    return () => {
      if (intervalRef.current) clearInterval(intervalRef.current)
    }
  }, [timerRunning, timerStart, accumulatedMs])

  const totalSeconds = Math.floor(elapsed / 1000)
  const hours = Math.floor(totalSeconds / 3600)
  const minutes = Math.floor((totalSeconds % 3600) / 60)
  const seconds = totalSeconds % 60
  const display =
    hours > 0
      ? `${String(hours).padStart(2, '0')}:${String(minutes).padStart(2, '0')}:${String(seconds).padStart(2, '0')}`
      : `${String(minutes).padStart(2, '0')}:${String(seconds).padStart(2, '0')}`

  const handlePause = () => {
    if (!timerStart) return
    const totalElapsedMs = accumulatedMs + (Date.now() - new Date(timerStart).getTime())
    onPause(totalElapsedMs)
  }

  return (
    <div className="fixed top-20 right-4 z-50 animate-fade-in">
      <div className="flex flex-col items-center gap-1.5 rounded-xl border border-slate-200 bg-white/90 px-3 py-2 shadow-sm backdrop-blur-sm">
        <div className="flex items-center gap-1.5">
          <Clock
            className={cn(
              'h-3 w-3 transition-colors',
              timerRunning ? 'text-emerald-500' : 'text-slate-400',
            )}
          />
          <span className="font-mono text-sm font-semibold tabular-nums text-slate-700">
            {display}
          </span>
        </div>
        <div className="flex items-center gap-1">
          {timerRunning ? (
            <Button
              type="button"
              size="sm"
              variant="ghost"
              onClick={handlePause}
              className="h-6 px-2 text-[11px] text-slate-500 hover:text-slate-700"
            >
              <Pause className="h-2.5 w-2.5" /> Pausar
            </Button>
          ) : (
            <Button
              type="button"
              size="sm"
              variant="ghost"
              onClick={onStart}
              className="h-6 px-2 text-[11px] text-slate-500 hover:text-slate-700"
            >
              <Play className="h-2.5 w-2.5" /> Continuar
            </Button>
          )}
          <Button
            type="button"
            size="sm"
            variant="ghost"
            onClick={onReset}
            className="h-6 px-2 text-[11px] text-slate-400 hover:text-slate-600"
          >
            <RotateCcw className="h-2.5 w-2.5" />
          </Button>
        </div>
      </div>
    </div>
  )
}
