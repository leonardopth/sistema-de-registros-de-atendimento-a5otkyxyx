import { useState, useEffect, useRef } from 'react'
import { Button } from '@/components/ui/button'
import { Pause, Play, RotateCcw, Clock } from 'lucide-react'

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
    <div className="sticky top-0 z-50 flex items-center justify-between gap-3 rounded-lg bg-indigo-950 px-4 py-2.5 shadow-md">
      <div className="flex items-center gap-2">
        <Clock className="h-4 w-4 text-indigo-300 animate-pulse" />
        <span className="text-xs font-medium uppercase tracking-wider text-indigo-200">
          Cronômetro
        </span>
        <span className="font-mono text-lg font-bold tabular-nums text-white">{display}</span>
      </div>
      <div className="flex items-center gap-1.5">
        {timerRunning ? (
          <Button
            type="button"
            size="sm"
            variant="secondary"
            onClick={handlePause}
            className="h-7 text-xs"
          >
            <Pause className="h-3 w-3 mr-1" /> Pausar
          </Button>
        ) : (
          <Button
            type="button"
            size="sm"
            variant="secondary"
            onClick={onStart}
            className="h-7 text-xs"
          >
            <Play className="h-3 w-3 mr-1" /> Continuar
          </Button>
        )}
        <Button
          type="button"
          size="sm"
          variant="ghost"
          onClick={onReset}
          className="h-7 text-xs text-indigo-200 hover:bg-indigo-800 hover:text-white"
        >
          <RotateCcw className="h-3 w-3 mr-1" /> Reiniciar
        </Button>
      </div>
    </div>
  )
}
