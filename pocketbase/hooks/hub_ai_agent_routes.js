// Rotas oficiais para o Agente Nativo Skip Cloud "hub-ai-assistant"
// Inclui suporte a streaming (SSE), histórico de conversas e mensagens com segregação de usuário

routerAdd(
  'POST',
  '/backend/v1/hub-ai/chat',
  (e) => {
    try {
      var body = e.requestInfo().body || {}
      var userId = e.auth ? e.auth.id : null
      if (!userId) return e.unauthorizedError('Autenticação necessária')
      var message = (body.message || '').trim()
      if (!message) return e.badRequestError('Mensagem é obrigatória')

      // Carregar contexto do usuário para enriquecer prompt se necessário
      var userRole = e.auth.getString('role')
      var userName = e.auth.getString('name')
      var isMaster = userRole === 'Master' || e.auth.getBool('master_access') === true

      var agent = $ai.agent('hub-ai-assistant')
      var result = agent.chat({
        user_id: userId,
        conversation_id: body.conversation_id || null,
        message: message,
      })

      return e.json(200, {
        conversation_id: result.conversation_id,
        content: result.content,
        citations: result.citations,
        message_id: result.message_id,
      })
    } catch (err) {
      if (err instanceof SkipAiConfigError) {
        return e.json(503, { error: 'HUB AI temporariamente indisponível' })
      }
      if (err instanceof SkipAiAgentsError) {
        var status = err.status || 500
        return e.json(status, {
          error: status >= 500 ? 'Falha ao processar requisição do assistente' : err.message,
        })
      }
      if (err instanceof SkipAiError) {
        var aStatus = err.status || 502
        return e.json(aStatus, {
          error: aStatus >= 500 ? 'HUB AI temporariamente indisponível' : err.message,
        })
      }
      return e.json(500, { error: 'Erro inesperado: ' + String(err) })
    }
  },
  $apis.requireAuth(),
)

// Endpoint Streaming SSE para o chat do Agente
routerAdd(
  'POST',
  '/backend/v1/hub-ai/chat-stream',
  (e) => {
    try {
      var body = e.requestInfo().body || {}
      var userId = e.auth ? e.auth.id : null
      if (!userId) return e.unauthorizedError('Autenticação necessária')
      var message = (body.message || '').trim()
      if (!message) return e.badRequestError('Mensagem é obrigatória')

      var agent = $ai.agent('hub-ai-assistant')
      var conv = agent.getOrCreateConversation({
        user_id: userId,
        id: body.conversation_id || null,
      })

      var iter = agent.chat({
        user_id: userId,
        conversation_id: conv.id,
        message: message,
        stream: true,
      })

      e.response.header().set('Content-Type', 'text/event-stream')
      e.response.header().set('Cache-Control', 'no-cache')
      e.response.header().set('X-Conversation-Id', conv.id)
      $response.stream(e, iter)
    } catch (err) {
      if (err instanceof SkipAiConfigError) {
        return e.json(503, { error: 'HUB AI temporariamente indisponível' })
      }
      if (err instanceof SkipAiAgentsError) {
        var status = err.status || 500
        return e.json(status, {
          error: status >= 500 ? 'Falha na comunicação com o assistente' : err.message,
        })
      }
      return e.json(500, { error: 'Erro ao iniciar transmissão do assistente: ' + String(err) })
    }
  },
  $apis.requireAuth(),
)

// Listar conversas do usuário autenticado
routerAdd(
  'GET',
  '/backend/v1/hub-ai/conversations',
  (e) => {
    try {
      var userId = e.auth ? e.auth.id : null
      if (!userId) return e.unauthorizedError('Autenticação necessária')
      var limit = parseInt(e.requestInfo().query?.limit || '20', 10) || 20
      var agent = $ai.agent('hub-ai-assistant')
      var list = agent.listConversations({ user_id: userId, limit: limit })
      return e.json(200, list)
    } catch (err) {
      return e.json(500, { error: 'Erro ao listar conversas: ' + String(err) })
    }
  },
  $apis.requireAuth(),
)

// Listar mensagens de uma conversa específica
routerAdd(
  'GET',
  '/backend/v1/hub-ai/conversations/{conversationId}/messages',
  (e) => {
    try {
      var userId = e.auth ? e.auth.id : null
      if (!userId) return e.unauthorizedError('Autenticação necessária')
      var convId = e.request.pathValue('conversationId')
      var agent = $ai.agent('hub-ai-assistant')
      var res = agent.listMessages({
        conversation_id: convId,
        user_id: userId,
      })
      return e.json(200, res)
    } catch (err) {
      if (err instanceof SkipAiAgentsError) {
        var status = err.status || 500
        return e.json(status, {
          error: status >= 500 ? 'Falha ao buscar mensagens' : err.message,
        })
      }
      return e.json(500, { error: 'Erro ao carregar mensagens: ' + String(err) })
    }
  },
  $apis.requireAuth(),
)

// Mantém retrocompatibilidade com o endpoint anterior /backend/v1/consultant-ai
// redirecionando diretamente para o agente nativo com a mesma assinatura simplificada
routerAdd(
  'POST',
  '/backend/v1/consultant-ai',
  (e) => {
    try {
      var body = e.requestInfo().body || {}
      var question = (body.question || '').trim()
      if (!question) return e.badRequestError('question is required')
      var userId = e.auth ? e.auth.id : null
      if (!userId) return e.unauthorizedError('auth required')

      var agent = $ai.agent('hub-ai-assistant')
      var result = agent.chat({
        user_id: userId,
        conversation_id: null,
        message: question,
      })

      return e.json(200, {
        answer: result.content,
        conversation_id: result.conversation_id,
        citations: result.citations,
      })
    } catch (err) {
      $app.logger().warn('Erro em /backend/v1/consultant-ai: ' + String(err))
      return e.json(503, { error: 'AI temporarily unavailable' })
    }
  },
  $apis.requireAuth(),
)
