import { useState, useRef, useCallback } from 'react'

interface SpeechResultList {
  length: number
  [index: number]: { length: number; [index: number]: { transcript: string }; isFinal: boolean }
}
interface SpeechRecognitionEventLike {
  results: SpeechResultList
}

export function useSpeechRecognition(lang = 'pt-BR') {
  const [isListening, setIsListening] = useState(false)
  const [interimTranscript, setInterimTranscript] = useState('')
  const recognitionRef = useRef<any>(null)
  const finalRef = useRef('')
  const cbRef = useRef<((text: string) => void) | null>(null)

  const supported =
    typeof window !== 'undefined' &&
    ('SpeechRecognition' in window || 'webkitSpeechRecognition' in window)

  const start = useCallback(
    (onComplete?: (text: string) => void) => {
      if (!supported) return
      const SR = (window as any).SpeechRecognition || (window as any).webkitSpeechRecognition
      const rec = new SR()
      rec.lang = lang
      rec.continuous = false
      rec.interimResults = true
      finalRef.current = ''
      cbRef.current = onComplete ?? null

      rec.onresult = (e: SpeechRecognitionEventLike) => {
        let interim = ''
        for (let i = 0; i < e.results.length; i++) {
          const r = e.results[i]
          if (r.isFinal) finalRef.current += r[0].transcript
          else interim += r[0].transcript
        }
        setInterimTranscript(interim)
      }
      rec.onend = () => {
        setIsListening(false)
        setInterimTranscript('')
        if (cbRef.current && finalRef.current.trim()) {
          cbRef.current(finalRef.current.trim())
        }
      }
      rec.onerror = () => {
        setIsListening(false)
        setInterimTranscript('')
      }

      recognitionRef.current = rec
      rec.start()
      setIsListening(true)
    },
    [lang, supported],
  )

  const stop = useCallback(() => {
    recognitionRef.current?.stop()
    setIsListening(false)
  }, [])

  return { isListening, interimTranscript, start, stop, supported }
}
