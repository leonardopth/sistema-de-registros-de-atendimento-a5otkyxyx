/**
 * Constante canônica única compartilhada de Motivos de Contato (Reason).
 *
 * Centraliza a lista oficial com Title Case e acentuação correta em português,
 * eliminando variações como "cálculo reemissão", "reembolso", "cotação" misturadas
 * com "Bagagem" e "Assento".
 */

export const CONTACT_REASONS = [
  'Bagagem',
  'Assento',
  'Cálculo de Reemissão',
  'Reembolso',
  'Cotação',
  'Reserva',
  'Cancelamento',
  'Regras Tarifárias',
  'Erro RF',
  'Remarcação',
  'Check-in',
  'Alteração de Voo',
  'Reclamação',
  'Dúvida Geral',
  'Outros',
] as const

export type ContactReason = (typeof CONTACT_REASONS)[number]

/**
 * Remove acentos e converte para minúsculas para comparação permissiva.
 */
function normalizeKey(str: string): string {
  return str
    .normalize('NFD')
    .replace(/[\u0300-\u036f]/g, '')
    .toLowerCase()
    .trim()
}

/**
 * Mapeamento tolerante de variações históricas, capitalizações e sinônimos
 * para a forma canônica oficial.
 */
const CANONICAL_REASON_MAP: Record<string, ContactReason> = {
  // Bagagem
  bagagem: 'Bagagem',

  // Assento
  assento: 'Assento',

  // Cálculo de Reemissão
  'calculo de reemissao': 'Cálculo de Reemissão',
  'calculo reemissao': 'Cálculo de Reemissão',
  'calculo re-emissao': 'Cálculo de Reemissão',
  'calculo de re-emissao': 'Cálculo de Reemissão',
  reemissao: 'Cálculo de Reemissão',

  // Reembolso
  reembolso: 'Reembolso',

  // Cotação
  cotacao: 'Cotação',
  orcamento: 'Cotação',
  venda: 'Cotação',

  // Reserva
  reserva: 'Reserva',

  // Cancelamento
  cancelamento: 'Cancelamento',

  // Regras Tarifárias
  'regras tarifarias': 'Regras Tarifárias',
  'regra tarifaria': 'Regras Tarifárias',
  'regras tarifarias e penalidades': 'Regras Tarifárias',

  // Erro RF
  'erro rf': 'Erro RF',
  rf: 'Erro RF',

  // Remarcação
  remarcacao: 'Remarcação',
  remarcacoes: 'Remarcação',

  // Check-in
  'check-in': 'Check-in',
  checkin: 'Check-in',

  // Alteração de Voo
  'alteracao de voo': 'Alteração de Voo',
  'alteracao de data': 'Alteração de Voo',
  alteracao: 'Alteração de Voo',

  // Reclamação
  reclamacao: 'Reclamação',

  // Dúvida Geral
  'duvida geral': 'Dúvida Geral',
  duvida: 'Dúvida Geral',
  duvidas: 'Dúvida Geral',
  informacao: 'Dúvida Geral',
  informacoes: 'Dúvida Geral',
  'suporte tecnico': 'Dúvida Geral',
  suporte: 'Dúvida Geral',

  // Outros
  outros: 'Outros',
  outro: 'Outros',
}

/**
 * Normaliza qualquer valor de motivo (antigo ou com caixa diferente) para o valor canônico.
 * Se o valor for vazio ou nulo, retorna vazio (sem inventar motivo).
 * Se não corresponder a nada reconhecido, retorna 'Outros'.
 */
export function normalizeContactReason(rawReason: string | null | undefined): ContactReason | '' {
  if (!rawReason) return ''
  const trimmed = rawReason.trim()
  if (!trimmed) return ''

  // Verifica se já é exatamente um canônico
  if (CONTACT_REASONS.includes(trimmed as ContactReason)) {
    return trimmed as ContactReason
  }

  const key = normalizeKey(trimmed)
  if (CANONICAL_REASON_MAP[key]) {
    return CANONICAL_REASON_MAP[key]
  }

  // Busca se contém alguma das palavras-chave conhecidas
  for (const [canonicalKey, canonicalVal] of Object.entries(CANONICAL_REASON_MAP)) {
    if (key === canonicalKey) {
      return canonicalVal
    }
  }

  return 'Outros'
}

/**
 * Opções prontas para preencher selects e filtros no frontend.
 */
export const CONTACT_REASON_OPTIONS = CONTACT_REASONS.map((r) => ({
  value: r,
  label: r,
}))
