import pb from '@/lib/pocketbase/client'
import { SocialReactionRecord, SocialReactionItemType, ReactionSummary } from '@/types/gamification'

export const DEFAULT_REACTION_EMOJIS = ['👍', '🎉', '👏', '❤️', '🔥', '💪'] as const
export type ReactionEmoji = (typeof DEFAULT_REACTION_EMOJIS)[number]

/**
 * Busca todas as reações de um tipo específico ou geral.
 */
export async function getSocialReactions(params?: {
  itemType?: SocialReactionItemType
  itemId?: string
}): Promise<SocialReactionRecord[]> {
  try {
    const filters: string[] = []
    if (params?.itemType) {
      filters.push(`item_type = '${params.itemType}'`)
    }
    if (params?.itemId) {
      filters.push(`item_id = '${params.itemId}'`)
    }
    const filter = filters.length > 0 ? filters.join(' && ') : ''

    return await pb.collection('social_reactions').getFullList<SocialReactionRecord>({
      filter,
      sort: '-created',
      expand: 'user_id',
    })
  } catch (err) {
    console.warn('Erro ao carregar reações sociais:', err)
    return []
  }
}

/**
 * Alterna reação do usuário para um item:
 * - Se clicar no mesmo emoji já existente: deleta (toggle off)
 * - Se já reagiu com outro emoji: atualiza para o novo
 * - Se não reagiu: cria nova reação
 */
export async function toggleSocialReaction(
  itemType: SocialReactionItemType,
  itemId: string,
  emoji: string,
  userId: string,
): Promise<{ action: 'added' | 'removed' | 'updated'; record?: SocialReactionRecord | null }> {
  try {
    // Buscar se o usuário já reagiu a este item
    const existing = await pb.collection('social_reactions').getFullList<SocialReactionRecord>({
      filter: `user_id = '${userId}' && item_type = '${itemType}' && item_id = '${itemId}'`,
      limit: 1,
    })

    if (existing.length > 0) {
      const current = existing[0]
      if (current.emoji === emoji) {
        // Clicar no mesmo emoji remove a reação
        await pb.collection('social_reactions').delete(current.id)
        return { action: 'removed', record: null }
      } else {
        // Clicar em outro emoji troca a reação
        const updated = await pb
          .collection('social_reactions')
          .update<SocialReactionRecord>(current.id, {
            emoji,
          })
        return { action: 'updated', record: updated }
      }
    }

    // Criar nova reação
    const created = await pb.collection('social_reactions').create<SocialReactionRecord>({
      user_id: userId,
      item_type: itemType,
      item_id: itemId,
      emoji,
    })
    return { action: 'added', record: created }
  } catch (err) {
    console.error('Erro ao alternar reação social:', err)
    throw err
  }
}

/**
 * Agrupa reações por item_id para facilitar o consumo em lote nos componentes.
 */
export function groupReactionsByItemId(
  reactions: SocialReactionRecord[],
  currentUserId?: string,
): Record<string, ReactionSummary> {
  const result: Record<string, ReactionSummary> = {}

  for (const r of reactions) {
    if (!result[r.item_id]) {
      result[r.item_id] = {
        emojiCounts: {},
        totalCount: 0,
      }
    }
    const item = result[r.item_id]
    item.emojiCounts[r.emoji] = (item.emojiCounts[r.emoji] || 0) + 1
    item.totalCount += 1

    if (currentUserId && r.user_id === currentUserId) {
      item.userReaction = r.emoji
    }
  }

  return result
}
