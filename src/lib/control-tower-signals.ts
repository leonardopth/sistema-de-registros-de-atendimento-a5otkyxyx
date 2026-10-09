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
 * Remove caracteres de controle (NUL, etc.) e espaços em branco das bordas sem violar regra eslint(no-control-regex).
 */
function cleanControlChars(str: string): string {
  if (!str) return ''
  let out = ''
  for (let i = 0; i < str.length; i++) {
    const code = str.charCodeAt(i)
    // Preserva tab (9), lf (10), cr (13); descarta caracteres de controle (0..31 exceto 9,10,13 e 127..159)
    if (
      (code >= 0 && code <= 8) ||
      code === 11 ||
      code === 12 ||
      (code >= 14 && code <= 31) ||
      (code >= 127 && code <= 159)
    ) {
      continue
    }
    out += str[i]
  }
  return out.trim()
}

/**
 * Tenta decodificar um array de números (ex.: bytes UTF-8 de JSON) para string.
 */
function tryDecodeByteArray(arr: number[]): string | null {
  try {
    // Filtra trailing zeros (NUL bytes) do final do array de bytes
    const nonNullCodes: number[] = []
    let trailingNull = true
    for (let i = arr.length - 1; i >= 0; i--) {
      if (trailingNull && arr[i] === 0) continue
      trailingNull = false
      nonNullCodes.unshift(arr[i])
    }

    if (nonNullCodes.length === 0) return null

    if (typeof TextDecoder !== 'undefined') {
      const u8 = new Uint8Array(nonNullCodes)
      return new TextDecoder('utf-8', { fatal: false }).decode(u8)
    }
  } catch {
    /* intentionally ignored */
  }

  try {
    return arr
      .filter((c) => c !== 0)
      .map((code) => String.fromCharCode(code))
      .join('')
  } catch (_) {
    return null
  }
}

/**
 * Converte qualquer formato recebido no campo `detected_signals` em uma lista
 * limpa e defensiva de strings sem caracteres de controle ou entradas vazias.
 */
export function normalizeSignals(raw: unknown): string[] {
  if (raw === null || raw === undefined) return []

  // Se já for string (possivelmente JSON string ou string com trailing NUL)
  if (typeof raw === 'string') {
    const cleaned = cleanControlChars(raw)
    if (!cleaned) return []

    if (cleaned.startsWith('[') || cleaned.startsWith('{')) {
      try {
        const parsed = JSON.parse(cleaned)
        return normalizeSignals(parsed)
      } catch (_) {
        // Tenta remover possíveis aspas ou caracteres estranhos caso o parse JSON direto falhe
        try {
          const sanitized = cleaned.replace(/,\s*([}\]])/g, '$1')
          const parsed = JSON.parse(sanitized)
          return normalizeSignals(parsed)
        } catch {
          // Se realmente não for JSON válido, extrai se parece com array em string
          if (cleaned.startsWith('[') && cleaned.endsWith(']')) {
            const inner = cleaned.slice(1, -1).trim()
            if (!inner) return []
            // Divide por vírgula considerando aspas
            const parts = inner
              .split(',')
              .map((p) => cleanControlChars(p.replace(/^["']|["']$/g, '')))
              .filter(Boolean)
            if (parts.length > 0) return parts
          }
          return [cleaned]
        }
      }
    }
    return [cleaned]
  }

  // Se for array
  if (Array.isArray(raw)) {
    if (raw.length === 0) return []

    // Caso especial: array de números (bytes UTF-8 serializados por engano pelo backend/driver)
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
      if (item === null || item === undefined) continue

      if (typeof item === 'string') {
        const cleaned = cleanControlChars(item)
        if (!cleaned) continue

        // Checar se a string individual é um JSON array serializado (ex: '["A", "B"]')
        if (
          (cleaned.startsWith('[') && cleaned.endsWith(']')) ||
          (cleaned.startsWith('{') && cleaned.endsWith('}'))
        ) {
          try {
            const inner = JSON.parse(cleaned)
            result.push(...normalizeSignals(inner))
            continue
          } catch {
            // Se falhou parse, tenta split manual se for array
            if (cleaned.startsWith('[') && cleaned.endsWith(']')) {
              const parts = cleaned
                .slice(1, -1)
                .split(',')
                .map((p) => cleanControlChars(p.replace(/^["']|["']$/g, '')))
                .filter(Boolean)
              if (parts.length > 0) {
                result.push(...parts)
                continue
              }
            }
          }
        }
        result.push(cleaned)
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

        if (typeof val === 'string') {
          const c = cleanControlChars(val)
          if (c) result.push(c)
        } else {
          try {
            const str = JSON.stringify(item)
            const c = cleanControlChars(str)
            if (c && c !== '{}') result.push(c)
          } catch {
            /* intentionally ignored */
          }
        }
      } else if (typeof item === 'number' || typeof item === 'boolean') {
        const c = cleanControlChars(String(item))
        if (c) result.push(c)
      }
    }

    // Garante que cada item no resultado final seja único (sem duplicatas desnecessárias),
    // trimmed, sem caracteres de controle e não vazio.
    const uniqueResult: string[] = []
    for (const s of result) {
      const finalStr = cleanControlChars(s)
      if (finalStr && uniqueResult.indexOf(finalStr) === -1) {
        uniqueResult.push(finalStr)
      }
    }

    return uniqueResult
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

    if (typeof val === 'string') {
      const c = cleanControlChars(val)
      if (c) return [c]
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
