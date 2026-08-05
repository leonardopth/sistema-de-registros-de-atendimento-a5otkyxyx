import { useState, useEffect, useRef } from 'react'
import { Button } from '@/components/ui/button'
import { Play, Pause, RotateCcw, Timer as TimerIcon } from 'lucide-react'

interface ServiceTimerProps {
  timerStart: string | null
  timerRunning: boolean
  accumulatedMs: number
  duration: number
  onStart: () => void
  onPause: (totalElapsedMs: number) => void
  onReset: () => void
}

export function ServiceTimer({
  timerStart,
  timerRunning,
  accumulatedMs,
  duration,
  onStart,
  onPause,
  onReset,
}: ServiceTimerProps) {
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
    <div className="flex items-center gap-2 flex-wrap">
      <TimerIcon className="h-4 w-4 text-slate-500" />
      <span className="text-sm font-mono font-bold text-slate-900 min-w-[55px]">{display}</span>
      <span className="text-xs text-slate-500">
        Duração: {duration > 0 ? `${duration} min` : '—'}
      </span>
      {!timerRunning ? (
        <Button type="button" size="sm" variant="outline" onClick={onStart} className="h-8 text-xs">
          <Play className="h-3 w-3 mr-1" /> {accumulatedMs > 0 ? 'Continuar' : 'Iniciar'}
        </Button>
      ) : (
        <Button
          type="button"
          size="sm"
          variant="outline"
          onClick={handlePause}
          className="h-8 text-xs"
        >
          <Pause className="h-3 w-3 mr-1" /> Pausar
        </Button>
      )}
      <Button type="button" size="sm" variant="ghost" onClick={onReset} className="h-8 text-xs">
        <RotateCcw className="h-3 w-3 mr-1" /> Reiniciar
      </Button>
    </div>
  )
}
