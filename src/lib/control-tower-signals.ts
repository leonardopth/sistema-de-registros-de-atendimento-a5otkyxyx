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
  /** Indica se é sinal de frustração do cliente */
  isFrustrated?: boolean
}

export interface SentimentVisual {
  label: 'Positivo' | 'Neutro' | 'Frustrado' | 'Crítico'
  emoji: string
  colorBadgeClass: string
  borderClass: string
  description: string
}

/**
 * Normaliza dados de análise de sentimento e devolve estrutura padronizada para UI.
 */
export function getSentimentVisual(
  label?: unknown,
  score?: unknown,
  intensity?: unknown,
): SentimentVisual {
  const lbl = String(label || '')
    .toLowerCase()
    .trim()
  const numScore = typeof score === 'number' ? score : Number(score) || 0

  if (lbl === 'crítico' || lbl === 'critico' || numScore <= -60) {
    return {
      label: 'Crítico',
      emoji: '😡',
      colorBadgeClass:
        'bg-rose-100 text-rose-800 dark:bg-rose-950/70 dark:text-rose-300 border-rose-300 dark:border-rose-800',
      borderClass: 'border-rose-400 dark:border-rose-800',
      description: 'Cliente altamente insatisfeito com menções a processos, Procon ou danos.',
    }
  }

  if (lbl === 'frustrado' || numScore < -5) {
    const intensStr = intensity ? ` (${intensity})` : ''
    return {
      label: 'Frustrado',
      emoji: '😠',
      colorBadgeClass:
        'bg-amber-100 text-amber-900 dark:bg-amber-950/70 dark:text-amber-300 border-amber-300 dark:border-amber-800',
      borderClass: 'border-amber-400 dark:border-amber-800',
      description: `Tom de frustração detectado${intensStr}: insatisfação com demora ou problemas.`,
    }
  }

  if (lbl === 'positivo' || numScore >= 20) {
    return {
      label: 'Positivo',
      emoji: '😊',
      colorBadgeClass:
        'bg-emerald-100 text-emerald-800 dark:bg-emerald-950/70 dark:text-emerald-300 border-emerald-300 dark:border-emerald-800',
      borderClass: 'border-emerald-400 dark:border-emerald-800',
      description: 'Tom cordial, elogio ou agradecimento detectado.',
    }
  }

  return {
    label: 'Neutro',
    emoji: '😐',
    colorBadgeClass:
      'bg-slate-100 text-slate-700 dark:bg-slate-800 dark:text-slate-300 border-slate-200 dark:border-slate-700',
    borderClass: 'border-slate-300 dark:border-slate-700',
    description: 'Tom factual ou padrão operacional.',
  }
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
 * Verifica se uma string representa apenas dígitos numéricos de byte (ex.: "91", " 34 ", "195").
 */
export function isNumericByteString(val: string): boolean {
  return /^\s*\d{1,3}\s*$/.test(val)
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
  return strings
    .filter((sig) => typeof sig === 'string' && sig.trim().length > 0 && !isNumericByteString(sig))
    .map((sig) => {
      const label = sig.trim()
      const lower = label.toLowerCase()

      const isFrustrated =
        lower.includes('frustrado') || lower.includes('crítico') || lower.includes('critico')

      const isRed =
        lower.includes('24h') ||
        lower.includes('formal') ||
        lower.includes('vip') ||
        lower.includes('urgente') ||
        isFrustrated

      const isPersistent =
        lower.includes('insistente') ||
        lower.includes('reincidente') ||
        lower.includes('msgs') ||
        lower.includes('mensagens')

      return {
        label,
        isRed,
        isPersistent,
        isFrustrated,
      }
    })
}
