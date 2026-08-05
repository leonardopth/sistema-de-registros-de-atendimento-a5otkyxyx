import { Button } from '@/components/ui/button'
import { Mic } from 'lucide-react'
import { useSpeechRecognition } from '@/hooks/use-speech-recognition'
import { cn } from '@/lib/utils'

interface VoiceInputButtonProps {
  onTranscript: (text: string) => void
  disabled?: boolean
  className?: string
}

export function VoiceInputButton({ onTranscript, disabled, className }: VoiceInputButtonProps) {
  const { isListening, interimTranscript, start, stop, supported } = useSpeechRecognition()

  if (!supported) return null

  const handleClick = () => {
    if (isListening) stop()
    else start(onTranscript)
  }

  return (
    <div className="flex items-center gap-2">
      {isListening && interimTranscript && (
        <span className="text-xs text-slate-500 italic truncate max-w-[180px]">
          {interimTranscript}
        </span>
      )}
      <Button
        type="button"
        variant="outline"
        size="sm"
        onClick={handleClick}
        disabled={disabled}
        className={cn('text-xs', className)}
      >
        {isListening ? (
          <>
            <span className="h-2 w-2 rounded-full bg-red-500 animate-pulse mr-1.5" />
            Parar
          </>
        ) : (
          <>
            <Mic className="h-3.5 w-3.5 mr-1" /> Falar
          </>
        )}
      </Button>
    </div>
  )
}
