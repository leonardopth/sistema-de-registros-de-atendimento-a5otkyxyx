export interface KnowledgeArticle {
  id: string
  title: string
  summary: string
  tags: string[]
}

export const KNOWLEDGE_BASE: KnowledgeArticle[] = [
  {
    id: 'rf-reembolso',
    title: 'Como solicitar reembolso no RF',
    summary: 'Passo a passo para o cliente solicitar reembolso diretamente no sistema RF.',
    tags: ['reembolso', 'Disponível no RF'],
  },
  {
    id: 'rf-bagagem',
    title: 'Política de bagagem: como consultar',
    summary: 'Tutorial para o cliente consultar a política de bagagem no RF.',
    tags: ['Bagagem', 'Disponível no RF'],
  },
  {
    id: 'rf-assento',
    title: 'Como marcar/alterar assento no RF',
    summary: 'Guia para o cliente marcar ou alterar assento no sistema RF.',
    tags: ['Assento', 'Disponível no RF'],
  },
  {
    id: 'rf-cotacao',
    title: 'Como fazer cotação no RF',
    summary: 'Tutorial para o cliente realizar cotações de passagens no RF.',
    tags: ['cotação', 'Disponível no RF'],
  },
  {
    id: 'rf-reserva',
    title: 'Como gerenciar reservas no RF',
    summary: 'Guia para criação e gestão de reservas no sistema RF.',
    tags: ['reserva', 'Disponível no RF'],
  },
  {
    id: 'rf-cancelamento',
    title: 'Como cancelar uma reserva no RF',
    summary: 'Passo a passo para o cliente cancelar reservas no RF.',
    tags: ['cancelamento', 'Disponível no RF'],
  },
  {
    id: 'rf-regras',
    title: 'Como consultar regras tarifárias no RF',
    summary: 'Tutorial para consulta de regras tarifárias no RF.',
    tags: ['regras tarifárias', 'Disponível no RF'],
  },
  {
    id: 'rf-erro',
    title: 'Erros comuns no RF e como resolver',
    summary: 'Lista de erros frequentes no RF e soluções passo a passo.',
    tags: ['erro RF', 'Erro RF'],
  },
  {
    id: 'rf-reemissao',
    title: 'Como calcular reemissão no RF',
    summary: 'Guia para o cliente calcular reemissões no sistema RF.',
    tags: ['cálculo reemissão', 'Disponível no RF'],
  },
]

export function suggestArticles(
  contactReason: string,
  avoidableReason?: string,
): KnowledgeArticle[] {
  return KNOWLEDGE_BASE.filter((article) => {
    if (avoidableReason && article.tags.includes(avoidableReason)) return true
    if (article.tags.includes(contactReason)) return true
    return false
  }).slice(0, 3)
}
