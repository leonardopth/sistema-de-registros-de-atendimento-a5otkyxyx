import { Button } from '@/components/ui/button'
import { Mic } from 'lucide-react'
import { useSpeechRecognition } from '@/hooks/use-speech-recognition'
import { useToast } from '@/hooks/use-toast'
import { cn } from '@/lib/utils'

interface VoiceInputButtonProps {
  onTranscript: (text: string) => void
  disabled?: boolean
  className?: string
}

export function VoiceInputButton({ onTranscript, disabled, className }: VoiceInputButtonProps) {
  const { isListening, interimTranscript, start, stop, supported } = useSpeechRecognition()
  const { toast } = useToast()

  const handleError = (error: { type: string; message: string }) => {
    if (!error.message) return
    toast({ variant: 'destructive', title: 'Erro na transcrição', description: error.message })
  }

  const handleClick = () => {
    if (!supported) {
      toast({
        variant: 'destructive',
        title: 'Navegador não suportado',
        description:
          'Seu navegador não suporta reconhecimento de voz. Use o Google Chrome ou Microsoft Edge.',
      })
      return
    }

    if (isListening) {
      stop()
    } else {
      start(onTranscript, handleError)
    }
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
        disabled={disabled && !isListening}
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
