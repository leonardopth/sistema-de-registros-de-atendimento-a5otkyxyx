/**
 * Helper utilitário defensivo para tratamento e extração de sinais detectados
 * da Torre de Controle (`control_tower_emails.detected_signals`).
 *
 * Suporta formatos legados e híbridos:
 * - string direta (ex: "Embarque <24h")
 * - JSON serializado em string (ex: '["Embarque <24h"]')
 * - Array de bytes UTF-8 numéricos serializados por engano (ex: [91, 34, ...])
 * - Objetos estruturados (ex: { type: "Embarque <24h", label: "...", detail: "..." })
 * - Arrays aninhados ou itens nulos/inválidos
 */

export interface NormalizedSignal {
  /** Texto puro do sinal pronto para exibição e verificações */
  label: string
  /** Indica se possui alta gravidade / cor vermelha */
  isRed: boolean
  /** Indica se é sinal de persistência / cliente insistente (ícone de fogo / cor roxa) */
  isPersistent: boolean
}

/**
 * Tenta decodificar um array de números (ex.: bytes UTF-8 de JSON) para string.
 */
function tryDecodeByteArray(arr: number[]): string | null {
  try {
    if (typeof TextDecoder !== 'undefined') {
      const u8 = new Uint8Array(arr)
      return new TextDecoder('utf-8').decode(u8)
    }
  } catch {
    /* intentionally ignored */
  }

  try {
    return arr.map((code) => String.fromCharCode(code)).join('')
  } catch (_) {
    return null
  }
}

/**
 * Converte qualquer formato recebido no campo `detected_signals` em uma lista
 * limpa e defensiva de strings.
 */
export function normalizeSignals(raw: unknown): string[] {
  if (raw === null || raw === undefined) return []

  // Se já for string (possivelmente JSON string)
  if (typeof raw === 'string') {
    const trimmed = raw.trim()
    if (!trimmed) return []

    if (trimmed.startsWith('[') || trimmed.startsWith('{')) {
      try {
        const parsed = JSON.parse(trimmed)
        return normalizeSignals(parsed)
      } catch (_) {
        return [trimmed]
      }
    }
    return [trimmed]
  }

  // Se for array
  if (Array.isArray(raw)) {
    if (raw.length === 0) return []

    // Caso especial: array de números (bytes UTF-8 serializados)
    if (typeof raw[0] === 'number') {
      const allNumbers = raw.every((n) => typeof n === 'number')
      if (allNumbers) {
        const decoded = tryDecodeByteArray(raw as number[])
        if (decoded) {
          return normalizeSignals(decoded)
        }
      }
    }

    const result: string[] = []
    for (const item of raw) {
      if (!item) continue

      if (typeof item === 'string') {
        const t = item.trim()
        if (t) {
          // Checar se a string individual é um JSON array
          if (t.startsWith('[') && t.endsWith(']')) {
            try {
              const inner = JSON.parse(t)
              result.push(...normalizeSignals(inner))
              continue
            } catch {
              /* intentionally ignored */
            }
          }
          result.push(t)
        }
      } else if (typeof item === 'object') {
        // Objeto { type, label, name, signal, message, detail, text, ... }
        const obj = item as Record<string, unknown>
        const val =
          obj.label ??
          obj.name ??
          obj.type ??
          obj.signal ??
          obj.title ??
          obj.detail ??
          obj.message ??
          obj.text

        if (typeof val === 'string' && val.trim()) {
          result.push(val.trim())
        } else {
          try {
            const str = JSON.stringify(item)
            if (str && str !== '{}') result.push(str)
          } catch {
            /* intentionally ignored */
          }
        }
      } else if (typeof item === 'number' || typeof item === 'boolean') {
        result.push(String(item))
      }
    }

    return result
  }

  // Se for objeto individual (não-array)
  if (typeof raw === 'object') {
    const obj = raw as Record<string, unknown>
    const val =
      obj.label ??
      obj.name ??
      obj.type ??
      obj.signal ??
      obj.title ??
      obj.detail ??
      obj.message ??
      obj.text

    if (typeof val === 'string' && val.trim()) {
      return [val.trim()]
    }
    if (Array.isArray(obj.signals)) {
      return normalizeSignals(obj.signals)
    }
    if (Array.isArray(obj.items)) {
      return normalizeSignals(obj.items)
    }
  }

  return []
}

/**
 * Analisa cada sinal de forma defensiva e retorna os dados de apresentação
 * (se é crítico, se é persistente, etc.), garantindo que nunca lance TypeError.
 */
export function getAnalyzedSignals(raw: unknown): NormalizedSignal[] {
  const strings = normalizeSignals(raw)
  return strings.map((sig) => {
    const label = typeof sig === 'string' ? sig : String(sig ?? '')
    const lower = label.toLowerCase()

    const isRed =
      lower.includes('24h') ||
      lower.includes('formal') ||
      lower.includes('vip') ||
      lower.includes('urgente')

    const isPersistent =
      lower.includes('insistente') ||
      lower.includes('reincidente') ||
      lower.includes('msgs') ||
      lower.includes('mensagens')

    return {
      label,
      isRed,
      isPersistent,
    }
  })
}
