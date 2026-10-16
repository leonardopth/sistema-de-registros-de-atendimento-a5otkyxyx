import { pb } from '@/lib/pocketbase/client'

export interface AgentChatMessage {
  id?: string
  role: 'user' | 'assistant'
  content: string
  created?: string
}

export interface AgentCitation {
  collection: string
  id: string
  label?: string
}

export interface AgentChatResponse {
  conversation_id: string
  content: string
  citations?: AgentCitation[]
  message_id?: string
}

export interface AgentConversationItem {
  id: string
  title?: string
  created: string
  updated?: string
  message_count?: number
}

/**
 * Envia uma mensagem para o Assistente Interno Nativo HUB AI (com persistência e contexto do usuário)
 */
export async function sendHubAIMessage(
  message: string,
  conversationId?: string | null,
): Promise<AgentChatResponse> {
  return await pb.send<AgentChatResponse>('/backend/v1/hub-ai/chat', {
    method: 'POST',
    body: {
      message,
      conversation_id: conversationId || undefined,
    },
  })
}

/**
 * Lista as conversas recentes do usuário logado com o assistente nativo
 */
export async function listHubAIConversations(limit = 20): Promise<AgentConversationItem[]> {
  try {
    const res = await pb.send<AgentConversationItem[]>('/backend/v1/hub-ai/conversations', {
      method: 'GET',
      params: { limit },
    })
    return Array.isArray(res) ? res : []
  } catch (err) {
    console.error('Falha ao listar conversas do HUB AI:', err)
    return []
  }
}

/**
 * Busca histórico de mensagens de uma conversa
 */
export async function listHubAIMessages(
  conversationId: string,
): Promise<{ messages: AgentChatMessage[] }> {
  try {
    return await pb.send<{ messages: AgentChatMessage[] }>(
      `/backend/v1/hub-ai/conversations/${encodeURIComponent(conversationId)}/messages`,
      { method: 'GET' },
    )
  } catch (err) {
    console.error('Falha ao buscar mensagens da conversa:', err)
    return { messages: [] }
  }
}

/**
 * Função de streaming SSE para o chat do Agente Nativo HUB AI
 */
export async function streamHubAIMessage(
  message: string,
  conversationId: string | null,
  onChunk: (chunk: string) => void,
  onDone: (fullText: string, finalConvId: string) => void,
  onError: (err: Error) => void,
) {
  try {
    const token = pb.authStore.token
    const url = `${pb.baseUrl}/backend/v1/hub-ai/chat-stream`

    const response = await fetch(url, {
      method: 'POST',
      headers: {
        'Content-Type': 'application/json',
        Authorization: token ? `Bearer ${token}` : '',
      },
      body: JSON.stringify({
        message,
        conversation_id: conversationId || undefined,
      }),
    })

    if (!response.ok) {
      // Fallback para chat simples se streaming falhar ou não retornar 200
      try {
        const fallbackRes = await sendHubAIMessage(message, conversationId)
        onChunk(fallbackRes.content)
        onDone(fallbackRes.content, fallbackRes.conversation_id)
        return
      } catch (fallbackErr) {
        throw new Error(`Erro na API do Assistente (${response.status})`)
      }
    }

    const convIdHeader = response.headers.get('X-Conversation-Id') || conversationId || ''
    const reader = response.body?.getReader()
    if (!reader) {
      throw new Error('Não foi possível ler o fluxo de dados da resposta')
    }

    const decoder = new TextDecoder()
    let accumulated = ''
    let activeConvId = convIdHeader

    while (true) {
      const { done, value } = await reader.read()
      if (done) break

      const chunkText = decoder.decode(value, { stream: true })
      // Analisar linhas SSE
      const lines = chunkText.split('\n')
      for (const line of lines) {
        const trimmed = line.trim()
        if (!trimmed) continue
        if (trimmed.startsWith('data:')) {
          const dataStr = trimmed.replace(/^data:\s*/, '')
          if (dataStr === '[DONE]') continue
          try {
            const parsed = JSON.parse(dataStr)
            // Se for delta do streaming do Skip AI
            const contentDelta =
              parsed?.choices?.[0]?.delta?.content ||
              parsed?.delta?.content ||
              parsed?.content ||
              ''
            if (contentDelta) {
              accumulated += contentDelta
              onChunk(contentDelta)
            }
            if (parsed?.conversation_id) {
              activeConvId = parsed.conversation_id
            }
          } catch {
            // Se não for JSON, pode ser texto puro transmitido
            accumulated += dataStr
            onChunk(dataStr)
          }
        }
      }
    }

    onDone(accumulated, activeConvId)
  } catch (err: any) {
    console.error('Erro em streamHubAIMessage:', err)
    onError(err instanceof Error ? err : new Error(String(err)))
  }
}

/**
 * Função de compatibilidade com o hook anterior askConsultantAI
 */
export async function askConsultantAI(question: string): Promise<string> {
  const res = await sendHubAIMessage(question, null)
  return res.content
}
