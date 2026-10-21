import { useEffect, useRef, useState, useCallback } from 'react'
import { useAuth } from '@/hooks/use-auth'
import {
  sendUserHeartbeat,
  deriveCollaboratorStatus,
  updateCollaboratorStatus,
} from '@/services/collaborator-status'
import { CollaboratorStatus } from '@/types/service_record'

// Limiar de inatividade para mudar para Ausente: 15 minutos (em ms)
export const INACTIVITY_TIMEOUT_MS = 15 * 60 * 1000

// Intervalo regular de heartbeat enquanto ativo: 45 segundos (em ms)
export const ACTIVE_HEARTBEAT_INTERVAL_MS = 45 * 1000

// Chave para sincronizar atividade entre múltiplas abas do mesmo navegador
const STORAGE_LAST_ACTIVITY_KEY = 'hub_ai_last_user_activity'

export interface PresenceState {
  isIdle: boolean // true se inativo há 15min+
  idleSinceMinutes: number
  lastActivityTimestamp: number
  derivedStatus: CollaboratorStatus
  presenceSource: 'auto' | 'manual'
  setManualStatus: (status: CollaboratorStatus, note?: string) => Promise<void>
  resumeAutomatic: () => Promise<void>
}

/**
 * Hook global de presença e batimento cardíaco (Heartbeat).
 * - Monitora interações do usuário (mouse, clique, teclado, scroll, touch, focus, visibility).
 * - Sincroniza a última atividade entre múltiplas abas via localStorage / storage event.
 * - Envia heartbeat a cada ~45s enquanto o colaborador está ativo.
 * - Ao completar 15 minutos de inatividade ininterrupta, atualiza o status para "Ausente".
 * - Ao retomar a atividade (qualquer clique, digitação, movimento), restaura "Disponível" imediatamente
 *   (a não ser que o colaborador esteja em status manual deliberado como Pausa/Almoço).
 */
export function usePresence(): PresenceState {
  const { user, isAuthenticated } = useAuth()
  const userId = user?.id

  const [lastActivity, setLastActivity] = useState<number>(() => {
    const saved = localStorage.getItem(STORAGE_LAST_ACTIVITY_KEY)
    const parsed = saved ? parseInt(saved, 10) : NaN
    return !isNaN(parsed) && parsed > 0 ? parsed : Date.now()
  })

  const [isIdle, setIsIdle] = useState<boolean>(false)
  const isIdleRef = useRef<boolean>(false)
  const lastActivityRef = useRef<number>(lastActivity)
  const lastHeartbeatSentRef = useRef<number>(0)
  const updatingRef = useRef<boolean>(false)

  // Atualiza timestamp de atividade local e em outras abas
  const recordActivity = useCallback(() => {
    const now = Date.now()
    // Debounce de gravação no localStorage para não saturar em movimento de mouse
    if (now - lastActivityRef.current > 2000) {
      lastActivityRef.current = now
      setLastActivity(now)
      try {
        localStorage.setItem(STORAGE_LAST_ACTIVITY_KEY, String(now))
      } catch {
        // Ignora quota / erro de storage
      }
    }

    // Se estava marcado como ocioso/ausente, reativa imediatamente
    if (isIdleRef.current && userId && !updatingRef.current) {
      isIdleRef.current = false
      setIsIdle(false)
      updatingRef.current = true
      sendUserHeartbeat(userId, true)
        .catch((err) => console.warn('Erro ao restaurar status ativo:', err))
        .finally(() => {
          updatingRef.current = false
          lastHeartbeatSentRef.current = Date.now()
        })
    }
  }, [userId])

  // Ouvintes de eventos do usuário para detectar atividade
  useEffect(() => {
    if (!isAuthenticated || !userId) return

    const events: Array<keyof WindowEventMap> = [
      'mousemove',
      'mousedown',
      'keydown',
      'scroll',
      'touchstart',
      'wheel',
      'pointerdown',
    ]

    let throttleTimer: number | null = null
    const handleUserInteraction = () => {
      if (throttleTimer) return
      throttleTimer = window.setTimeout(() => {
        throttleTimer = null
        recordActivity()
      }, 1000)
    }

    events.forEach((evt) => {
      window.addEventListener(evt, handleUserInteraction, { passive: true })
    })

    const handleVisibilityChange = () => {
      if (document.visibilityState === 'visible') {
        recordActivity()
      }
    }
    document.addEventListener('visibilitychange', handleVisibilityChange)

    const handleFocus = () => {
      recordActivity()
    }
    window.addEventListener('focus', handleFocus)

    // Sincroniza atividade reportada por OUTRAS abas do mesmo usuário
    const handleStorage = (e: StorageEvent) => {
      if (e.key === STORAGE_LAST_ACTIVITY_KEY && e.newValue) {
        const remoteTimestamp = parseInt(e.newValue, 10)
        if (!isNaN(remoteTimestamp) && remoteTimestamp > lastActivityRef.current) {
          lastActivityRef.current = remoteTimestamp
          setLastActivity(remoteTimestamp)
          if (isIdleRef.current) {
            isIdleRef.current = false
            setIsIdle(false)
          }
        }
      }
    }
    window.addEventListener('storage', handleStorage)

    return () => {
      if (throttleTimer) clearTimeout(throttleTimer)
      events.forEach((evt) => {
        window.removeEventListener(evt, handleUserInteraction)
      })
      document.removeEventListener('visibilitychange', handleVisibilityChange)
      window.removeEventListener('focus', handleFocus)
      window.removeEventListener('storage', handleStorage)
    }
  }, [isAuthenticated, userId, recordActivity])

  // Loop de monitoramento de heartbeat e checagem de ociosidade (roda a cada 15s)
  useEffect(() => {
    if (!isAuthenticated || !userId) return

    // Envia heartbeat inicial imediato ao montar/logar
    sendUserHeartbeat(userId, true)
      .catch((e) => console.warn('Erro no heartbeat inicial:', e))
      .finally(() => {
        lastHeartbeatSentRef.current = Date.now()
      })

    const interval = window.setInterval(async () => {
      if (updatingRef.current) return
      const now = Date.now()
      const timeSinceLastActivity = now - lastActivityRef.current

      // 1. Verificar se passou do tempo de inatividade (15 min)
      if (timeSinceLastActivity >= INACTIVITY_TIMEOUT_MS) {
        if (!isIdleRef.current) {
          isIdleRef.current = true
          setIsIdle(true)
          updatingRef.current = true
          try {
            await sendUserHeartbeat(userId, false) // envia transição para Ausente
          } catch (err) {
            console.warn('Erro ao atualizar ausência automática:', err)
          } finally {
            updatingRef.current = false
            lastHeartbeatSentRef.current = Date.now()
          }
        }
      } else {
        // Usuário está ativo dentro da janela de 15min
        if (isIdleRef.current) {
          isIdleRef.current = false
          setIsIdle(false)
        }

        // Envia heartbeat periódico a cada ~45s para manter last_heartbeat_at fresco no banco
        if (now - lastHeartbeatSentRef.current >= ACTIVE_HEARTBEAT_INTERVAL_MS) {
          updatingRef.current = true
          try {
            await sendUserHeartbeat(userId, true)
          } catch (err) {
            console.warn('Erro no heartbeat periódico:', err)
          } finally {
            updatingRef.current = false
            lastHeartbeatSentRef.current = Date.now()
          }
        }
      }
    }, 15000)

    return () => {
      window.clearInterval(interval)
    }
  }, [isAuthenticated, userId])

  const idleSinceMinutes = Math.max(0, Math.floor((Date.now() - lastActivity) / 60000))

  const derived = deriveCollaboratorStatus({
    current_status: user?.current_status,
    presence_source: user?.presence_source,
    last_heartbeat_at: user?.last_heartbeat_at,
    status_updated_at: user?.status_updated_at,
  })

  const setManualStatus = useCallback(
    async (newStatus: CollaboratorStatus, note?: string) => {
      if (!userId) return
      const isAutoDisponivel = newStatus === 'Disponível'
      await updateCollaboratorStatus(userId, newStatus, {
        note,
        presenceSource: isAutoDisponivel ? 'auto' : 'manual',
        heartbeatIso: new Date().toISOString(),
      })
      lastActivityRef.current = Date.now()
      setLastActivity(Date.now())
      isIdleRef.current = false
      setIsIdle(false)
    },
    [userId],
  )

  const resumeAutomatic = useCallback(async () => {
    if (!userId) return
    const nowIso = new Date().toISOString()
    await updateCollaboratorStatus(userId, 'Disponível', {
      note: 'Retomada de disponibilidade automática',
      presenceSource: 'auto',
      heartbeatIso: nowIso,
    })
    lastActivityRef.current = Date.now()
    setLastActivity(Date.now())
    isIdleRef.current = false
    setIsIdle(false)
  }, [userId])

  return {
    isIdle,
    idleSinceMinutes,
    lastActivityTimestamp: lastActivity,
    derivedStatus: derived.status,
    presenceSource: (user?.presence_source as 'auto' | 'manual') || 'auto',
    setManualStatus,
    resumeAutomatic,
  }
}
