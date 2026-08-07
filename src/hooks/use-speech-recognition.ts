import { useState, useRef, useCallback } from 'react'

interface SpeechResultList {
  length: number
  [index: number]: { length: number; [index: number]: { transcript: string }; isFinal: boolean }
}
interface SpeechRecognitionEventLike {
  results: SpeechResultList
}

interface SpeechErrorEventLike {
  error: string
  message?: string
}

export interface SpeechRecognitionError {
  type: string
  message: string
}

function mapSpeechError(error: string): SpeechRecognitionError {
  switch (error) {
    case 'not-allowed':
    case 'service-not-allowed':
      return {
        type: error,
        message:
          'Permissão de microfone negada. Clique no ícone de cadeado na barra do navegador e permita o acesso ao microfone, depois recarregue a página.',
      }
    case 'no-speech':
      return {
        type: error,
        message: 'Nenhuma fala detectada. Tente novamente falando mais perto do microfone.',
      }
    case 'audio-capture':
      return {
        type: error,
        message:
          'Nenhum microfone encontrado. Verifique se um microfone está conectado e funcionando.',
      }
    case 'network':
      return {
        type: error,
        message:
          'Erro de rede na transcrição. Verifique sua conexão com a internet e tente novamente.',
      }
    case 'aborted':
      return { type: error, message: '' }
    default:
      return {
        type: error,
        message: `Erro na transcrição por voz: ${error}. Tente novamente.`,
      }
  }
}

export function useSpeechRecognition(lang = 'pt-BR') {
  const [isListening, setIsListening] = useState(false)
  const [interimTranscript, setInterimTranscript] = useState('')
  const recognitionRef = useRef<any>(null)
  const finalRef = useRef('')
  const completeCbRef = useRef<((text: string) => void) | null>(null)
  const errorCbRef = useRef<((error: SpeechRecognitionError) => void) | null>(null)
  const manualStopRef = useRef(false)

  const supported =
    typeof window !== 'undefined' &&
    ('SpeechRecognition' in window || 'webkitSpeechRecognition' in window)

  const start = useCallback(
    (onComplete?: (text: string) => void, onError?: (error: SpeechRecognitionError) => void) => {
      if (!supported) {
        onError?.({
          type: 'not-supported',
          message:
            'Seu navegador não suporta reconhecimento de voz. Use o Google Chrome ou Microsoft Edge para esta funcionalidade.',
        })
        return
      }

      try {
        recognitionRef.current?.stop()
      } catch {
        // ignore
      }

      const SR = (window as any).SpeechRecognition || (window as any).webkitSpeechRecognition
      const rec = new SR()
      rec.lang = lang
      rec.continuous = false
      rec.interimResults = true
      finalRef.current = ''
      manualStopRef.current = false
      completeCbRef.current = onComplete ?? null
      errorCbRef.current = onError ?? null

      rec.onresult = (e: SpeechRecognitionEventLike) => {
        let interim = ''
        for (let i = 0; i < e.results.length; i++) {
          const r = e.results[i]
          if (r.isFinal) finalRef.current += r[0].transcript
          else interim += r[0].transcript
        }
        setInterimTranscript(interim)
      }

      rec.onerror = (e: SpeechErrorEventLike) => {
        const mapped = mapSpeechError(e.error)
        if (mapped.message && !manualStopRef.current) {
          errorCbRef.current?.(mapped)
        }
        setIsListening(false)
        setInterimTranscript('')
      }

      rec.onend = () => {
        setIsListening(false)
        setInterimTranscript('')
        if (completeCbRef.current && finalRef.current.trim()) {
          completeCbRef.current(finalRef.current.trim())
        }
      }

      recognitionRef.current = rec

      try {
        rec.start()
        setIsListening(true)
      } catch {
        errorCbRef.current?.({
          type: 'start-failed',
          message: 'Não foi possível iniciar a captura de áudio. Tente novamente.',
        })
        setIsListening(false)
      }
    },
    [lang, supported],
  )

  const stop = useCallback(() => {
    manualStopRef.current = true
    try {
      recognitionRef.current?.stop()
    } catch {
      // ignore
    }
    setIsListening(false)
  }, [])

  return { isListening, interimTranscript, start, stop, supported }
}
