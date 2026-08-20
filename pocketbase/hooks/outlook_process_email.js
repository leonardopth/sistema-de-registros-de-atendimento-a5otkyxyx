// Hook para integração Microsoft Outlook via Graph API e Análise de E-mails com IA
// Endpoints:
// 1) GET /backend/v1/outlook-status — Consulta se as credenciais do MS Graph estão configuradas
// 2) POST /backend/v1/outlook-sync — Sincroniza e monitora e-mails da caixa de entrada via Microsoft Graph API (ou simulação se credenciais não configuradas)
// 3) POST /backend/v1/outlook-process-email — Processa e analisa um e-mail com IA e salva o log na coleção email_analysis_logs (e email_logs)

routerAdd(
  'GET',
  '/backend/v1/outlook-status',
  (e) => {
    var clientId = ($os.getenv('MICROSOFT_CLIENT_ID') || $os.getenv('AZURE_CLIENT_ID') || '').trim()
    var clientSecret = (
      $os.getenv('MICROSOFT_CLIENT_SECRET') ||
      $os.getenv('AZURE_CLIENT_SECRET') ||
      ''
    ).trim()
    var tenantId = (
      $os.getenv('MICROSOFT_TENANT_ID') ||
      $os.getenv('AZURE_TENANT_ID') ||
      $os.getenv('MICROSOFT_GRAPH_TENANT_ID') ||
      ''
    ).trim()

    var isConfigured = Boolean(clientId && clientSecret && tenantId)

    // Contagem de logs processados
    var totalProcessed = 0
    var recentLogs = []
    try {
      var colName = $app.hasTable('email_analysis_logs') ? 'email_analysis_logs' : 'email_logs'
      var logs = $app.findRecordsByFilter(colName, '', '-created', 10, 0)
      totalProcessed = $app.countRecords(colName)
      for (var i = 0; i < logs.length; i++) {
        var l = logs[i]
        recentLogs.push({
          id: l.id,
          sender_email: l.getString('sender_email'),
          sender_name: l.getString('sender_name'),
          subject: l.getString('subject'),
          category: l.getString('category'),
          sentiment: l.getString('sentiment'),
          main_topic: l.getString('main_topic'),
          confidence_score: l.getInt('confidence_score'),
          received_at: l.getString('received_at') || l.getString('created'),
          service_record: l.getString('service_record'),
          client: l.getString('client'),
          created: l.getString('created'),
        })
      }
    } catch (err) {
      $app.logger().warn('Erro ao carregar estatísticas do Outlook: ' + err)
    }

    return e.json(200, {
      configured: isConfigured,
      has_client_id: Boolean(clientId),
      has_client_secret: Boolean(clientSecret),
      has_tenant_id: Boolean(tenantId),
      total_processed: totalProcessed,
      recent_logs: recentLogs,
      status: isConfigured ? 'connected' : 'unconfigured',
      message: isConfigured
        ? 'Microsoft Graph API configurada e pronta para monitoramento.'
        : 'Credenciais do Microsoft Graph API não configuradas (variáveis MICROSOFT_CLIENT_ID, MICROSOFT_CLIENT_SECRET, MICROSOFT_TENANT_ID). Modo de teste / processamento manual disponível.',
    })
  },
  $apis.requireAuth(),
)

routerAdd(
  'POST',
  '/backend/v1/outlook-process-email',
  (e) => {
    var body = e.requestInfo().body || {}
    var senderEmail = (body.sender_email || '').trim()
    var senderName = (body.sender_name || '').trim()
    var recipientEmail = (body.recipient_email || '').trim()
    var subject = (body.subject || '').trim()
    var emailBody = (body.body || '').trim()
    var isReply = body.is_reply !== undefined ? Boolean(body.is_reply) : true
    var consultantUserId = (body.consultant_user_id || '').trim()
    var messageId = (body.outlook_message_id || '').trim()

    if (!senderEmail || !emailBody) {
      return e.badRequestError('sender_email e body são obrigatórios.')
    }

    // Se o usuário logado não passou consultantUserId, usa o auth id
    if (!consultantUserId && e.auth) {
      consultantUserId = e.auth.id
    }

    var validCategories = [
      'Dúvida',
      'Reclamação',
      'Solicitação',
      'Confirmação',
      'Cancelamento',
      'Outros',
    ]
    var validSentiments = ['Positivo', 'Neutro', 'Negativo']

    var analysis = {
      main_topic: subject || 'Atendimento por E-mail',
      sentiment: 'Neutro',
      category: 'Dúvida',
      confidence_score: 85,
    }

    // Análise de conteúdo com IA (Skip AI)
    try {
      var prompt =
        'Você é um assistente de IA especializado em analisar e-mails de atendimento ao cliente para o setor de viagens e corporativo.\n' +
        'Analise o e-mail recebido do cliente abaixo e extraia com precisão:\n' +
        '1) main_topic: Breve resumo do assunto principal (máx 1 linha em português)\n' +
        '2) sentiment: exatamente um de: ' +
        validSentiments.join(', ') +
        '\n' +
        '3) category: exatamente um de: ' +
        validCategories.join(', ') +
        ' (ex: Dúvida, Reclamação, Solicitação, Confirmação, Cancelamento, Outros)\n' +
        '4) confidence_score: número inteiro de 0 a 100 indicando o grau de confiança da categorização\n\n' +
        'Assunto: ' +
        subject +
        '\n' +
        'Remetente: ' +
        senderName +
        ' <' +
        senderEmail +
        '>\n' +
        'Conteúdo:\n' +
        emailBody +
        '\n\n' +
        'Responda SOMENTE o JSON puro no seguinte formato:\n' +
        '{"main_topic":"...","sentiment":"Positivo|Neutro|Negativo","category":"Dúvida|Reclamação|Solicitação|Confirmação|Cancelamento|Outros","confidence_score":90}'

      var aiRes = $ai.chat({
        model: 'fast',
        messages: [{ role: 'user', content: prompt }],
      })

      var replyText = aiRes.choices[0].message.content
      var jsonMatch = replyText.match(/\{[\s\S]*\}/)
      var parsed = JSON.parse(jsonMatch ? jsonMatch[0] : replyText)

      if (parsed.main_topic) analysis.main_topic = String(parsed.main_topic).trim()
      if (validSentiments.indexOf(parsed.sentiment) !== -1) analysis.sentiment = parsed.sentiment
      if (validCategories.indexOf(parsed.category) !== -1) analysis.category = parsed.category
      if (typeof parsed.confidence_score === 'number') {
        analysis.confidence_score = Math.min(100, Math.max(0, Math.round(parsed.confidence_score)))
      }
    } catch (err) {
      $app.logger().warn('IA Fallback ao processar e-mail: ' + err)
      // Fallback heurístico inteligente caso a IA falhe
      var lower = (subject + ' ' + emailBody).toLowerCase()
      if (
        lower.indexOf('reclama') !== -1 ||
        lower.indexOf('problema') !== -1 ||
        lower.indexOf('insatisfeito') !== -1 ||
        lower.indexOf('erro') !== -1
      ) {
        analysis.category = 'Reclamação'
        analysis.sentiment = 'Negativo'
      } else if (
        lower.indexOf('confirmo') !== -1 ||
        lower.indexOf('confirmar') !== -1 ||
        lower.indexOf('aprovado') !== -1 ||
        lower.indexOf('obrigado') !== -1
      ) {
        analysis.category = 'Confirmação'
        analysis.sentiment = 'Positivo'
      } else if (
        lower.indexOf('solicito') !== -1 ||
        lower.indexOf('gostaria de') !== -1 ||
        lower.indexOf('preciso de') !== -1 ||
        lower.indexOf('emissão') !== -1 ||
        lower.indexOf('cotação') !== -1
      ) {
        analysis.category = 'Solicitação'
        analysis.sentiment = 'Neutro'
      } else if (lower.indexOf('cancel') !== -1) {
        analysis.category = 'Cancelamento'
        analysis.sentiment = 'Neutro'
      }
    }

    // 1. Identificar se o remetente é um cliente cadastrado no sistema
    var clientId = ''
    var clientName = ''
    try {
      var clientRec = $app.findFirstRecordByData('clients', 'email', senderEmail)
      if (clientRec) {
        clientId = clientRec.id
        clientName = clientRec.getString('name')
      }
    } catch (_) {}

    // 2. Identificar atendimento correspondente
    var serviceRecordId = ''
    try {
      var srFilter =
        "client_email = '" + senderEmail + "' && status != 'Concluído' && status != 'Cancelado'"
      var srRecords = $app.findRecordsByFilter('service_records', srFilter, '-created', 1, 0)
      if (srRecords && srRecords.length > 0) {
        serviceRecordId = srRecords[0].id
      } else if (clientId) {
        // Tenta buscar por cliente relation
        var srByClient = $app.findRecordsByFilter(
          'service_records',
          "client = '" + clientId + "' && status != 'Concluído' && status != 'Cancelado'",
          '-created',
          1,
          0,
        )
        if (srByClient && srByClient.length > 0) {
          serviceRecordId = srByClient[0].id
        }
      }
    } catch (_) {}

    var nowIso = new Date().toISOString()
    var savedLogId = ''

    // Salvar na coleção oficial email_analysis_logs
    if ($app.hasTable('email_analysis_logs')) {
      try {
        var ealCol = $app.findCollectionByNameOrId('email_analysis_logs')
        var ealRecord = new Record(ealCol)
        ealRecord.set('sender_email', senderEmail)
        ealRecord.set('sender_name', senderName || clientName)
        ealRecord.set('recipient_email', recipientEmail)
        ealRecord.set('subject', subject)
        ealRecord.set('body_snippet', emailBody.substring(0, 500))
        ealRecord.set('is_reply', isReply)
        ealRecord.set('category', analysis.category)
        ealRecord.set('sentiment', analysis.sentiment)
        ealRecord.set('main_topic', analysis.main_topic)
        ealRecord.set('confidence_score', analysis.confidence_score)
        ealRecord.set('outlook_message_id', messageId)
        if (clientId) ealRecord.set('client', clientId)
        if (serviceRecordId) ealRecord.set('service_record', serviceRecordId)
        if (consultantUserId) ealRecord.set('processed_by', consultantUserId)
        ealRecord.set('received_at', nowIso)

        $app.save(ealRecord)
        savedLogId = ealRecord.id
      } catch (saveErr) {
        $app.logger().error('Erro ao salvar email_analysis_logs: ' + saveErr)
      }
    }

    // Manter compatibilidade com email_logs se existir
    if ($app.hasTable('email_logs')) {
      try {
        var emailLogsCol = $app.findCollectionByNameOrId('email_logs')
        var logRecord = new Record(emailLogsCol)
        logRecord.set('sender_email', senderEmail)
        logRecord.set('sender_name', senderName || clientName)
        logRecord.set('recipient_email', recipientEmail)
        logRecord.set('subject', subject)
        logRecord.set('body_snippet', emailBody.substring(0, 500))
        logRecord.set('is_reply', isReply)
        logRecord.set('category', analysis.category)
        logRecord.set('sentiment', analysis.sentiment)
        logRecord.set('main_topic', analysis.main_topic)
        logRecord.set('confidence_score', analysis.confidence_score)
        if (clientId) logRecord.set('client', clientId)
        if (serviceRecordId) logRecord.set('service_record', serviceRecordId)
        if (consultantUserId) logRecord.set('processed_by', consultantUserId)
        logRecord.set('received_at', nowIso)

        $app.save(logRecord)
        if (!savedLogId) savedLogId = logRecord.id
      } catch (_) {}
    }

    return e.json(200, {
      success: true,
      log_id: savedLogId,
      analysis: analysis,
      client_id: clientId,
      service_record_id: serviceRecordId,
      is_client: Boolean(clientId),
    })
  },
  $apis.requireAuth(),
)

// Endpoint de sincronização ativa com o Microsoft Graph API
routerAdd(
  'POST',
  '/backend/v1/outlook-sync',
  (e) => {
    var clientId = ($os.getenv('MICROSOFT_CLIENT_ID') || $os.getenv('AZURE_CLIENT_ID') || '').trim()
    var clientSecret = (
      $os.getenv('MICROSOFT_CLIENT_SECRET') ||
      $os.getenv('AZURE_CLIENT_SECRET') ||
      ''
    ).trim()
    var tenantId = (
      $os.getenv('MICROSOFT_TENANT_ID') ||
      $os.getenv('AZURE_TENANT_ID') ||
      $os.getenv('MICROSOFT_GRAPH_TENANT_ID') ||
      ''
    ).trim()

    var consultantEmail = ''
    var consultantId = ''
    if (e.auth) {
      consultantEmail = e.auth.getString('email')
      consultantId = e.auth.id
    }

    if (!clientId || !clientSecret || !tenantId) {
      return e.json(200, {
        success: true,
        mode: 'simulation_or_manual',
        message:
          'Credenciais do Microsoft Graph API não configuradas nas variáveis de ambiente. O sistema está pronto para processar e-mails via webhook / importação manual.',
        processed_count: 0,
      })
    }

    // Obter Access Token do Azure AD / Microsoft Graph
    var tokenUrl = 'https://login.microsoftonline.com/' + tenantId + '/oauth2/v2.0/token'
    var tokenBody =
      'client_id=' +
      encodeURIComponent(clientId) +
      '&client_secret=' +
      encodeURIComponent(clientSecret) +
      '&scope=' +
      encodeURIComponent('https://graph.microsoft.com/.default') +
      '&grant_type=client_credentials'

    var tokenRes = null
    try {
      tokenRes = $http.send({
        url: tokenUrl,
        method: 'POST',
        headers: { 'Content-Type': 'application/x-www-form-urlencoded' },
        body: tokenBody,
      })
    } catch (err) {
      return e.json(500, {
        success: false,
        error: 'Falha na autenticação com Microsoft Azure AD: ' + err,
      })
    }

    if (tokenRes.statusCode !== 200) {
      return e.json(400, {
        success: false,
        error: 'Erro de token do Azure AD: ' + tokenRes.raw,
      })
    }

    var tokenJson = JSON.parse(tokenRes.raw)
    var accessToken = tokenJson.access_token

    // Buscar mensagens recentes da caixa de entrada do consultor no Microsoft Graph
    // https://graph.microsoft.com/v1.0/users/{id | userPrincipalName}/mailFolders/Inbox/messages
    var targetUser = consultantEmail || 'me'
    var graphUrl =
      'https://graph.microsoft.com/v1.0/users/' +
      encodeURIComponent(targetUser) +
      '/mailFolders/Inbox/messages?$top=15&$select=id,subject,bodyPreview,body,from,receivedDateTime,conversationId&$orderby=receivedDateTime DESC'

    var mailRes = null
    try {
      mailRes = $http.send({
        url: graphUrl,
        method: 'GET',
        headers: {
          Authorization: 'Bearer ' + accessToken,
          Accept: 'application/json',
        },
      })
    } catch (err) {
      return e.json(500, {
        success: false,
        error: 'Erro ao consultar mensagens no Microsoft Graph: ' + err,
      })
    }

    if (mailRes.statusCode !== 200) {
      return e.json(400, {
        success: false,
        error: 'Erro da API Microsoft Graph: ' + mailRes.raw,
      })
    }

    var mailData = JSON.parse(mailRes.raw)
    var messages = mailData.value || []
    var processedCount = 0
    var skippedCount = 0

    // Carrega e-mails de clientes conhecidos
    var knownClients = []
    try {
      var allClients = $app.findRecordsByFilter('clients', "email != ''", '', 1000, 0)
      for (var k = 0; k < allClients.length; k++) {
        var cEmail = allClients[k].getString('email').toLowerCase().trim()
        if (cEmail) knownClients.push(cEmail)
      }
    } catch (_) {}

    for (var m = 0; m < messages.length; m++) {
      var msg = messages[m]
      var msgSender = (msg.from && msg.from.emailAddress && msg.from.emailAddress.address) || ''
      var msgSenderName = (msg.from && msg.from.emailAddress && msg.from.emailAddress.name) || ''
      var msgSubject = msg.subject || ''
      var msgBody = (msg.body && msg.body.content) || msg.bodyPreview || ''

      // Ignora e-mails enviados pelo próprio consultor
      if (msgSender.toLowerCase() === consultantEmail.toLowerCase()) {
        skippedCount++
        continue
      }

      // Verifica se é resposta / e-mail de um cliente cadastrado
      var isClientEmail = knownClients.indexOf(msgSender.toLowerCase()) !== -1

      // Verifica se já foi processado anteriormente
      var alreadyLogged = false
      try {
        if ($app.hasTable('email_analysis_logs')) {
          var exists = $app.findRecordsByFilter(
            'email_analysis_logs',
            "outlook_message_id = '" + msg.id + "'",
            '',
            1,
            0,
          )
          if (exists && exists.length > 0) alreadyLogged = true
        }
      } catch (_) {}

      if (!alreadyLogged && isClientEmail) {
        // Executa análise IA chamando a lógica interna
        var cat = 'Dúvida'
        var sent = 'Neutro'
        var top = msgSubject
        var conf = 85

        try {
          var aiRes2 = $ai.chat({
            model: 'fast',
            messages: [
              {
                role: 'user',
                content:
                  'Analise este e-mail de cliente e responda apenas JSON: {"category":"Dúvida|Reclamação|Solicitação|Confirmação|Cancelamento|Outros","sentiment":"Positivo|Neutro|Negativo","main_topic":"...","confidence_score":90}\nAssunto: ' +
                  msgSubject +
                  '\nTexto: ' +
                  msgBody.substring(0, 1000),
              },
            ],
          })
          var parsed2 = JSON.parse(
            aiRes2.choices[0].message.content.match(/\{[\s\S]*\}/)?.[0] || '{}',
          )
          if (parsed2.category) cat = parsed2.category
          if (parsed2.sentiment) sent = parsed2.sentiment
          if (parsed2.main_topic) top = parsed2.main_topic
          if (parsed2.confidence_score) conf = parsed2.confidence_score
        } catch (_) {}

        // Busca cliente e atendimento
        var matchedClientId = ''
        var matchedSrId = ''
        try {
          var cRec = $app.findFirstRecordByData('clients', 'email', msgSender)
          if (cRec) matchedClientId = cRec.id
          var srList = $app.findRecordsByFilter(
            'service_records',
            "client_email = '" + msgSender + "' && status != 'Concluído' && status != 'Cancelado'",
            '-created',
            1,
            0,
          )
          if (srList && srList.length > 0) matchedSrId = srList[0].id
        } catch (_) {}

        if ($app.hasTable('email_analysis_logs')) {
          var ealCol2 = $app.findCollectionByNameOrId('email_analysis_logs')
          var ealRec2 = new Record(ealCol2)
          ealRec2.set('sender_email', msgSender)
          ealRec2.set('sender_name', msgSenderName)
          ealRec2.set('recipient_email', consultantEmail)
          ealRec2.set('subject', msgSubject)
          ealRec2.set('body_snippet', msgBody.substring(0, 500))
          ealRec2.set('is_reply', true)
          ealRec2.set('category', cat)
          ealRec2.set('sentiment', sent)
          ealRec2.set('main_topic', top)
          ealRec2.set('confidence_score', conf)
          ealRec2.set('outlook_message_id', msg.id)
          if (matchedClientId) ealRec2.set('client', matchedClientId)
          if (matchedSrId) ealRec2.set('service_record', matchedSrId)
          if (consultantId) ealRec2.set('processed_by', consultantId)
          ealRec2.set('received_at', msg.receivedDateTime || new Date().toISOString())
          $app.save(ealRec2)
          processedCount++
        }
      }
    }

    return e.json(200, {
      success: true,
      processed_count: processedCount,
      skipped_count: skippedCount,
      total_found: messages.length,
      message: 'Sincronização concluída com sucesso com o Microsoft Graph.',
    })
  },
  $apis.requireAuth(),
)
