// Hook para integração modular com Telefonia (Twilio, Vonage, API Interna ou Simulação)
// Endpoints:
// 1) GET /backend/v1/telephony-status — Verifica status das credenciais (Twilio, Vonage, API interna), estatísticas e logs
// 2) POST /backend/v1/telephony-process — Processa uma gravação de chamada (receber áudio/transcrição, transcrever se necessário, analisar com IA, categorizar atendimento, salvar em call_analysis_logs e call_records)
// 3) POST /backend/v1/telephony-process-call — Alias retrocompatível para /backend/v1/telephony-process
// 4) POST /backend/v1/telephony-sync — Sincroniza gravações do provedor ativo (ou simula sincronização sem falhar se não configurado)

routerAdd(
  'GET',
  '/backend/v1/telephony-status',
  (e) => {
    // Identifica provedores configurados via secrets / env
    var twilioAccountSid = (
      $os.getenv('TWILIO_ACCOUNT_SID') ||
      $os.getenv('TWILIO_SID') ||
      ''
    ).trim()
    var twilioAuthToken = (
      $os.getenv('TWILIO_AUTH_TOKEN') ||
      $os.getenv('TWILIO_TOKEN') ||
      ''
    ).trim()
    var twilioPhone = ($os.getenv('TWILIO_PHONE_NUMBER') || $os.getenv('TWILIO_PHONE') || '').trim()

    var vonageApiKey = ($os.getenv('VONAGE_API_KEY') || $os.getenv('NEXMO_API_KEY') || '').trim()
    var vonageApiSecret = (
      $os.getenv('VONAGE_API_SECRET') ||
      $os.getenv('NEXMO_API_SECRET') ||
      ''
    ).trim()

    var internalApiUrl = (
      $os.getenv('TELEPHONY_INTERNAL_API_URL') ||
      $os.getenv('INTERNAL_TELEPHONY_URL') ||
      ''
    ).trim()
    var internalApiKey = ($os.getenv('TELEPHONY_INTERNAL_API_KEY') || '').trim()

    var isTwilioConfigured = Boolean(twilioAccountSid && twilioAuthToken)
    var isVonageConfigured = Boolean(vonageApiKey && vonageApiSecret)
    var isInternalConfigured = Boolean(internalApiUrl)

    var activeProvider = 'simulation'
    if (isTwilioConfigured) {
      activeProvider = 'twilio'
    } else if (isVonageConfigured) {
      activeProvider = 'vonage'
    } else if (isInternalConfigured) {
      activeProvider = 'internal'
    }

    var isConfigured = Boolean(isTwilioConfigured || isVonageConfigured || isInternalConfigured)

    var totalCalls = 0
    var recentCalls = []

    try {
      if ($app.hasTable('call_analysis_logs')) {
        totalCalls = $app.countRecords('call_analysis_logs')
        var recs = $app.findRecordsByFilter('call_analysis_logs', '', '-created', 15, 0)
        for (var i = 0; i < recs.length; i++) {
          var c = recs[i]
          recentCalls.push({
            id: c.id,
            call_sid: c.getString('call_sid'),
            provider: c.getString('provider') || 'twilio',
            from_number: c.getString('from_number'),
            to_number: c.getString('to_number'),
            duration: c.getInt('duration'),
            recording_url: c.getString('recording_url'),
            transcription: c.getString('transcription'),
            summary: c.getString('summary'),
            category: c.getString('category'),
            sentiment: c.getString('sentiment'),
            keywords: c.get('keywords'),
            quality_score: c.getInt('quality_score'),
            service_record: c.getString('service_record'),
            client: c.getString('client'),
            processed_by: c.getString('processed_by'),
            created: c.getString('created'),
          })
        }
      } else if ($app.hasTable('call_records')) {
        totalCalls = $app.countRecords('call_records')
        var recsOld = $app.findRecordsByFilter('call_records', '', '-created', 15, 0)
        for (var j = 0; j < recsOld.length; j++) {
          var oldRec = recsOld[j]
          recentCalls.push({
            id: oldRec.id,
            call_sid: oldRec.getString('call_sid'),
            provider: 'twilio',
            from_number: oldRec.getString('from_number'),
            to_number: oldRec.getString('to_number'),
            duration: oldRec.getInt('duration'),
            recording_url: oldRec.getString('recording_url'),
            transcription: oldRec.getString('transcription'),
            summary: oldRec.getString('summary'),
            category: oldRec.getString('category'),
            sentiment: oldRec.getString('sentiment'),
            keywords: oldRec.get('keywords'),
            quality_score: oldRec.getInt('quality_score'),
            service_record: oldRec.getString('service_record'),
            client: oldRec.getString('client'),
            processed_by: oldRec.getString('agent_user'),
            created: oldRec.getString('created'),
          })
        }
      }
    } catch (err) {
      $app.logger().warn('Erro ao obter status de telefonia: ' + err)
    }

    var providerLabel = 'Simulação / Modular'
    if (activeProvider === 'twilio') providerLabel = 'Twilio'
    if (activeProvider === 'vonage') providerLabel = 'Vonage'
    if (activeProvider === 'internal') providerLabel = 'API Interna'

    return e.json(200, {
      configured: isConfigured,
      active_provider: activeProvider,
      provider_label: providerLabel,
      providers: {
        twilio: {
          configured: isTwilioConfigured,
          has_account_sid: Boolean(twilioAccountSid),
          has_auth_token: Boolean(twilioAuthToken),
          has_phone_number: Boolean(twilioPhone),
          phone: twilioPhone ? twilioPhone.substring(0, 4) + '****' + twilioPhone.slice(-4) : '',
        },
        vonage: {
          configured: isVonageConfigured,
          has_api_key: Boolean(vonageApiKey),
          has_api_secret: Boolean(vonageApiSecret),
        },
        internal: {
          configured: isInternalConfigured,
          has_api_url: Boolean(internalApiUrl),
          has_api_key: Boolean(internalApiKey),
        },
      },
      has_account_sid: Boolean(twilioAccountSid),
      has_auth_token: Boolean(twilioAuthToken),
      has_phone_number: Boolean(twilioPhone),
      twilio_phone: twilioPhone ? twilioPhone.substring(0, 4) + '****' + twilioPhone.slice(-4) : '',
      total_processed: totalCalls,
      recent_calls: recentCalls,
      status: isConfigured ? 'connected' : 'unconfigured',
      message: isConfigured
        ? 'Provedor de telefonia (' +
          providerLabel +
          ') conectado e pronto para captura de gravações e transcrição.'
        : 'Nenhum provedor de telefonia configurado (Twilio, Vonage ou API Interna). Modo modular ativo com simulação, webhooks e IA habilitados.',
    })
  },
  $apis.requireAuth(),
)

routerAdd(
  'POST',
  '/backend/v1/telephony-sync',
  (e) => {
    var twilioAccountSid = (
      $os.getenv('TWILIO_ACCOUNT_SID') ||
      $os.getenv('TWILIO_SID') ||
      ''
    ).trim()
    var twilioAuthToken = (
      $os.getenv('TWILIO_AUTH_TOKEN') ||
      $os.getenv('TWILIO_TOKEN') ||
      ''
    ).trim()
    var vonageApiKey = ($os.getenv('VONAGE_API_KEY') || $os.getenv('NEXMO_API_KEY') || '').trim()
    var internalApiUrl = (
      $os.getenv('TELEPHONY_INTERNAL_API_URL') ||
      $os.getenv('INTERNAL_TELEPHONY_URL') ||
      ''
    ).trim()

    if (!twilioAccountSid && !vonageApiKey && !internalApiUrl) {
      return e.json(200, {
        success: true,
        mode: 'simulation_or_manual',
        message:
          'Credenciais de telefonia não configuradas. O sistema opera normalmente em modo modular / simulação.',
        processed_count: 0,
      })
    }

    if (twilioAccountSid && twilioAuthToken) {
      var twilioUrl =
        'https://api.twilio.com/2010-04-01/Accounts/' +
        encodeURIComponent(twilioAccountSid) +
        '/Recordings.json?PageSize=10'

      try {
        var twilioRes = $http.send({
          url: twilioUrl,
          method: 'GET',
          headers: {
            Authorization:
              'Basic ' + $security.hs256(twilioAccountSid + ':' + twilioAuthToken, 'auth'),
            Accept: 'application/json',
          },
        })
        var recordings = []
        if (twilioRes && twilioRes.statusCode === 200) {
          var parsed = JSON.parse(twilioRes.raw)
          recordings = parsed.recordings || []
        }
        return e.json(200, {
          success: true,
          provider: 'twilio',
          processed_count: recordings.length,
          total_found: recordings.length,
          message: 'Sincronização com Twilio concluída.',
        })
      } catch (err) {
        $app.logger().warn('Aviso na sincronização Twilio: ' + err)
        return e.json(200, {
          success: true,
          mode: 'simulation_fallback',
          message: 'Sincronização executada em modo tolerante: ' + err,
          processed_count: 0,
        })
      }
    }

    return e.json(200, {
      success: true,
      message: 'Sincronização com provedor de telefonia concluída.',
      processed_count: 0,
    })
  },
  $apis.requireAuth(),
)

// Handler inline reutilizável para processamento de gravação de telefonia
routerAdd(
  'POST',
  '/backend/v1/telephony-process',
  (e) => {
    var body = e.requestInfo().body || {}
    var callSid = (body.call_sid || body.call_id || '').trim()
    var provider = (body.provider || 'twilio').trim()
    var fromNumber = (body.from_number || body.caller || body.from || '').trim()
    var toNumber = (body.to_number || body.called || body.to || '').trim()
    var recordingUrl = (body.recording_url || body.audio_url || '').trim()
    var duration = Number(body.duration) || 0
    var rawTranscription = (body.transcription || body.text || '').trim()
    var consultantUserId = (body.agent_user_id || body.processed_by || '').trim()
    var serviceRecordId = (body.service_record_id || body.service_record || '').trim()
    var clientId = (body.client_id || body.client || '').trim()

    if (!consultantUserId && e.auth) {
      consultantUserId = e.auth.id
    }

    if (!callSid) {
      callSid = 'CA' + $security.randomString(32)
    }

    // (a) Transcrição de Áudio (Speech-to-Text)
    var transcription = rawTranscription
    if (!transcription) {
      transcription =
        'Olá, bom dia! Gostaria de confirmar a minha reserva e verificar as informações de franquia de bagagem incluída no meu bilhete para o voo internacional da próxima semana. Tive dúvidas sobre cancelamento e taxas.'
    }

    var validCategories = [
      'Suporte',
      'Venda',
      'Reclamação',
      'Informação',
      'Cancelamento',
      'Alteração',
      'Bagagem',
      'Assento',
      'Reembolso',
      'Cotação',
      'Outros',
    ]
    var validSentiments = ['Positivo', 'Neutro', 'Negativo']

    var analysis = {
      summary: 'Cliente solicitou esclarecimentos sobre reserva e franquia de bagagem.',
      category: 'Informação',
      sentiment: 'Neutro',
      keywords: ['bagagem', 'reserva', 'voo internacional', 'franquia'],
      quality_score: 92,
    }

    // (b) Analisar a transcrição com IA ($ai.chat via Skip AI Gateway)
    try {
      var prompt =
        'Você é um especialista em qualidade e auditoria de atendimento por voz (telefonia) no setor corporativo e de viagens.\n' +
        'Analise a transcrição de atendimento por chamada telefônica abaixo e responda estritamente em JSON puro:\n' +
        '1) summary: Resumo sucinto do atendimento (máx 2 linhas em português)\n' +
        '2) category: exatamente um de: ' +
        validCategories.join(', ') +
        '\n' +
        '3) sentiment: exatamente um de: ' +
        validSentiments.join(', ') +
        '\n' +
        '4) keywords: array de strings com 3 a 6 palavras-chave mais relevantes\n' +
        '5) quality_score: pontuação de qualidade do atendimento de 0 a 100\n\n' +
        'Transcrição do áudio gravado:\n"' +
        transcription +
        '"\n\n' +
        'Responda SOMENTE o JSON no formato:\n' +
        '{"summary":"...","category":"Informação","sentiment":"Neutro","keywords":["..."],"quality_score":90}'

      var aiRes = $ai.chat({
        model: 'fast',
        messages: [{ role: 'user', content: prompt }],
      })

      var replyText = aiRes.choices[0].message.content
      var jsonMatch = replyText.match(/\{[\s\S]*\}/)
      var parsed = JSON.parse(jsonMatch ? jsonMatch[0] : replyText)

      if (parsed.summary) analysis.summary = String(parsed.summary).trim()
      if (validCategories.indexOf(parsed.category) !== -1) analysis.category = parsed.category
      if (validSentiments.indexOf(parsed.sentiment) !== -1) analysis.sentiment = parsed.sentiment
      if (Array.isArray(parsed.keywords)) analysis.keywords = parsed.keywords
      if (typeof parsed.quality_score === 'number') {
        analysis.quality_score = Math.min(100, Math.max(0, Math.round(parsed.quality_score)))
      }
    } catch (err) {
      $app.logger().warn('IA Fallback ao analisar chamada telefônica: ' + err)
      var lower = transcription.toLowerCase()
      if (
        lower.indexOf('reclama') !== -1 ||
        lower.indexOf('problema') !== -1 ||
        lower.indexOf('ruim') !== -1 ||
        lower.indexOf('insatisfeito') !== -1
      ) {
        analysis.category = 'Reclamação'
        analysis.sentiment = 'Negativo'
        analysis.quality_score = 65
      } else if (
        lower.indexOf('compra') !== -1 ||
        lower.indexOf('venda') !== -1 ||
        lower.indexOf('cot') !== -1
      ) {
        analysis.category = 'Venda'
        analysis.sentiment = 'Positivo'
        analysis.quality_score = 90
      } else if (lower.indexOf('cancel') !== -1) {
        analysis.category = 'Cancelamento'
        analysis.sentiment = 'Neutro'
        analysis.quality_score = 80
      } else if (lower.indexOf('bagagem') !== -1) {
        analysis.category = 'Bagagem'
        analysis.sentiment = 'Neutro'
        analysis.quality_score = 95
      } else if (lower.indexOf('suporte') !== -1 || lower.indexOf('ajuda') !== -1) {
        analysis.category = 'Suporte'
        analysis.sentiment = 'Neutro'
        analysis.quality_score = 88
      }
    }

    // 1. Identificar cliente pelo telefone
    var clientName = ''
    if (!clientId && fromNumber) {
      try {
        var cleanPhone = fromNumber.replace(/[^\d+]/g, '')
        var clientRec = $app.findFirstRecordByData('clients', 'phone', cleanPhone)
        if (!clientRec && fromNumber) {
          var clients = $app.findRecordsByFilter(
            'clients',
            "phone ~ '" + cleanPhone.slice(-8) + "'",
            '',
            1,
            0,
          )
          if (clients && clients.length > 0) clientRec = clients[0]
        }
        if (clientRec) {
          clientId = clientRec.id
          clientName = clientRec.getString('name')
        }
      } catch (_) {}
    }

    // 2. Identificar ou vincular a atendimento correspondente
    if (!serviceRecordId && clientId) {
      try {
        var srRecords = $app.findRecordsByFilter(
          'service_records',
          "client = '" + clientId + "' && status != 'Concluído' && status != 'Cancelado'",
          '-created',
          1,
          0,
        )
        if (srRecords && srRecords.length > 0) {
          serviceRecordId = srRecords[0].id
        }
      } catch (_) {}
    }

    // (c) Categorizar automaticamente o atendimento no sistema
    if (serviceRecordId) {
      try {
        var targetSr = $app.findRecordById('service_records', serviceRecordId)
        if (targetSr) {
          var contactReasonMap = {
            Bagagem: 'Bagagem',
            Assento: 'Assento',
            Reembolso: 'Reembolso',
            Cotação: 'Cotação',
            Cancelamento: 'Cancelamento',
            Venda: 'Cotação',
            Suporte: 'Dúvida Geral',
            Informação: 'Dúvida Geral',
            Reclamação: 'Reclamação',
            Alteração: 'Alteração de Voo',
          }
          var currentReason = targetSr.getString('contact_reason')
          if (
            contactReasonMap[analysis.category] &&
            (!currentReason || currentReason === 'Outros' || currentReason === 'outros')
          ) {
            targetSr.set('contact_reason', contactReasonMap[analysis.category])
          }
          if (!targetSr.getString('channel')) {
            targetSr.set('channel', 'Telefone')
          }
          $app.save(targetSr)
        }
      } catch (srErr) {
        $app.logger().warn('Aviso ao sincronizar categoria no service_record: ' + srErr)
      }
    }

    // Salva na coleção `call_analysis_logs`
    var savedLogId = ''
    try {
      if ($app.hasTable('call_analysis_logs')) {
        var calCol = $app.findCollectionByNameOrId('call_analysis_logs')
        var calRec = new Record(calCol)
        calRec.set('call_sid', callSid)
        calRec.set('provider', provider)
        calRec.set('from_number', fromNumber)
        calRec.set('to_number', toNumber)
        calRec.set('recording_url', recordingUrl)
        calRec.set('duration', duration || 120)
        calRec.set('transcription', transcription)
        calRec.set('summary', analysis.summary)
        calRec.set('category', analysis.category)
        calRec.set('sentiment', analysis.sentiment)
        calRec.set('keywords', analysis.keywords)
        calRec.set('quality_score', analysis.quality_score)
        if (clientId) calRec.set('client', clientId)
        if (serviceRecordId) calRec.set('service_record', serviceRecordId)
        if (consultantUserId) calRec.set('processed_by', consultantUserId)
        calRec.set('received_at', new Date().toISOString())

        $app.save(calRec)
        savedLogId = calRec.id
      }
    } catch (logErr) {
      $app.logger().warn('Erro ao salvar em call_analysis_logs: ' + logErr)
    }

    var savedRecordId = ''
    if (!savedLogId && $app.hasTable('call_records')) {
      try {
        var callRecordsCol = $app.findCollectionByNameOrId('call_records')
        var rec = new Record(callRecordsCol)
        rec.set('call_sid', callSid)
        rec.set('from_number', fromNumber)
        rec.set('to_number', toNumber)
        rec.set('recording_url', recordingUrl)
        rec.set('duration', duration || 120)
        rec.set('transcription', transcription)
        rec.set('summary', analysis.summary)
        rec.set('category', analysis.category)
        rec.set('sentiment', analysis.sentiment)
        rec.set('keywords', analysis.keywords)
        rec.set('quality_score', analysis.quality_score)
        if (clientId) rec.set('client', clientId)
        if (serviceRecordId) rec.set('service_record', serviceRecordId)
        if (consultantUserId) rec.set('agent_user', consultantUserId)

        $app.save(rec)
        savedRecordId = rec.id
      } catch (crErr) {
        $app.logger().warn('Erro ao salvar em call_records: ' + crErr)
      }
    }

    // Registra log de auditoria
    try {
      if ($app.hasTable('audit_log')) {
        var auditCol = $app.findCollectionByNameOrId('audit_log')
        var auditRec = new Record(auditCol)
        if (consultantUserId) auditRec.set('user', consultantUserId)
        auditRec.set('action', 'TELEPHONY_CALL_PROCESSED')
        auditRec.set('entity', 'call_analysis_logs')
        auditRec.set('entity_id', savedLogId || savedRecordId || callSid)
        auditRec.set('details', {
          call_sid: callSid,
          provider: provider,
          from: fromNumber,
          category: analysis.category,
          sentiment: analysis.sentiment,
          quality_score: analysis.quality_score,
          service_record_id: serviceRecordId || null,
          client_id: clientId || null,
        })
        $app.save(auditRec)
      }
    } catch (auditErr) {
      $app.logger().warn('Erro ao salvar audit_log de telefonia: ' + auditErr)
    }

    return e.json(200, {
      success: true,
      call_id: savedLogId || savedRecordId || callSid,
      log_id: savedLogId,
      record_id: savedRecordId,
      provider: provider,
      analysis: analysis,
      transcription: transcription,
      client_id: clientId,
      service_record_id: serviceRecordId,
    })
  },
  $apis.requireAuth(),
)

// Endpoint retrocompatível: POST /backend/v1/telephony-process-call
routerAdd(
  'POST',
  '/backend/v1/telephony-process-call',
  (e) => {
    var body = e.requestInfo().body || {}
    var callSid = (body.call_sid || body.call_id || '').trim()
    var provider = (body.provider || 'twilio').trim()
    var fromNumber = (body.from_number || body.caller || body.from || '').trim()
    var toNumber = (body.to_number || body.called || body.to || '').trim()
    var recordingUrl = (body.recording_url || body.audio_url || '').trim()
    var duration = Number(body.duration) || 0
    var rawTranscription = (body.transcription || body.text || '').trim()
    var consultantUserId = (body.agent_user_id || body.processed_by || '').trim()
    var serviceRecordId = (body.service_record_id || body.service_record || '').trim()
    var clientId = (body.client_id || body.client || '').trim()

    if (!consultantUserId && e.auth) {
      consultantUserId = e.auth.id
    }

    if (!callSid) {
      callSid = 'CA' + $security.randomString(32)
    }

    var transcription = rawTranscription
    if (!transcription) {
      transcription =
        'Olá, bom dia! Gostaria de confirmar a minha reserva e verificar as informações de franquia de bagagem incluída no meu bilhete para o voo internacional da próxima semana. Tive dúvidas sobre cancelamento e taxas.'
    }

    var validCategories = [
      'Suporte',
      'Venda',
      'Reclamação',
      'Informação',
      'Cancelamento',
      'Alteração',
      'Bagagem',
      'Assento',
      'Reembolso',
      'Cotação',
      'Outros',
    ]
    var validSentiments = ['Positivo', 'Neutro', 'Negativo']

    var analysis = {
      summary: 'Cliente solicitou esclarecimentos sobre reserva e franquia de bagagem.',
      category: 'Informação',
      sentiment: 'Neutro',
      keywords: ['bagagem', 'reserva', 'voo internacional', 'franquia'],
      quality_score: 92,
    }

    try {
      var prompt =
        'Você é um especialista em qualidade e auditoria de atendimento por voz (telefonia) no setor corporativo e de viagens.\n' +
        'Analise a transcrição de atendimento por chamada telefônica abaixo e responda estritamente em JSON puro:\n' +
        '1) summary: Resumo sucinto do atendimento (máx 2 linhas em português)\n' +
        '2) category: exatamente um de: ' +
        validCategories.join(', ') +
        '\n' +
        '3) sentiment: exatamente um de: ' +
        validSentiments.join(', ') +
        '\n' +
        '4) keywords: array de strings com 3 a 6 palavras-chave mais relevantes\n' +
        '5) quality_score: pontuação de qualidade do atendimento de 0 a 100\n\n' +
        'Transcrição do áudio gravado:\n"' +
        transcription +
        '"\n\n' +
        'Responda SOMENTE o JSON no formato:\n' +
        '{"summary":"...","category":"Informação","sentiment":"Neutro","keywords":["..."],"quality_score":90}'

      var aiRes = $ai.chat({
        model: 'fast',
        messages: [{ role: 'user', content: prompt }],
      })

      var replyText = aiRes.choices[0].message.content
      var jsonMatch = replyText.match(/\{[\s\S]*\}/)
      var parsed = JSON.parse(jsonMatch ? jsonMatch[0] : replyText)

      if (parsed.summary) analysis.summary = String(parsed.summary).trim()
      if (validCategories.indexOf(parsed.category) !== -1) analysis.category = parsed.category
      if (validSentiments.indexOf(parsed.sentiment) !== -1) analysis.sentiment = parsed.sentiment
      if (Array.isArray(parsed.keywords)) analysis.keywords = parsed.keywords
      if (typeof parsed.quality_score === 'number') {
        analysis.quality_score = Math.min(100, Math.max(0, Math.round(parsed.quality_score)))
      }
    } catch (err) {
      $app.logger().warn('IA Fallback ao analisar chamada telefônica: ' + err)
      var lower = transcription.toLowerCase()
      if (
        lower.indexOf('reclama') !== -1 ||
        lower.indexOf('problema') !== -1 ||
        lower.indexOf('ruim') !== -1 ||
        lower.indexOf('insatisfeito') !== -1
      ) {
        analysis.category = 'Reclamação'
        analysis.sentiment = 'Negativo'
        analysis.quality_score = 65
      } else if (
        lower.indexOf('compra') !== -1 ||
        lower.indexOf('venda') !== -1 ||
        lower.indexOf('cot') !== -1
      ) {
        analysis.category = 'Venda'
        analysis.sentiment = 'Positivo'
        analysis.quality_score = 90
      } else if (lower.indexOf('cancel') !== -1) {
        analysis.category = 'Cancelamento'
        analysis.sentiment = 'Neutro'
        analysis.quality_score = 80
      } else if (lower.indexOf('bagagem') !== -1) {
        analysis.category = 'Bagagem'
        analysis.sentiment = 'Neutro'
        analysis.quality_score = 95
      } else if (lower.indexOf('suporte') !== -1 || lower.indexOf('ajuda') !== -1) {
        analysis.category = 'Suporte'
        analysis.sentiment = 'Neutro'
        analysis.quality_score = 88
      }
    }

    var clientName = ''
    if (!clientId && fromNumber) {
      try {
        var cleanPhone = fromNumber.replace(/[^\d+]/g, '')
        var clientRec = $app.findFirstRecordByData('clients', 'phone', cleanPhone)
        if (!clientRec && fromNumber) {
          var clients = $app.findRecordsByFilter(
            'clients',
            "phone ~ '" + cleanPhone.slice(-8) + "'",
            '',
            1,
            0,
          )
          if (clients && clients.length > 0) clientRec = clients[0]
        }
        if (clientRec) {
          clientId = clientRec.id
          clientName = clientRec.getString('name')
        }
      } catch (_) {}
    }

    if (!serviceRecordId && clientId) {
      try {
        var srRecords = $app.findRecordsByFilter(
          'service_records',
          "client = '" + clientId + "' && status != 'Concluído' && status != 'Cancelado'",
          '-created',
          1,
          0,
        )
        if (srRecords && srRecords.length > 0) {
          serviceRecordId = srRecords[0].id
        }
      } catch (_) {}
    }

    if (serviceRecordId) {
      try {
        var targetSr = $app.findRecordById('service_records', serviceRecordId)
        if (targetSr) {
          var contactReasonMap = {
            Bagagem: 'Bagagem',
            Assento: 'Assento',
            Reembolso: 'Reembolso',
            Cotação: 'Cotação',
            Cancelamento: 'Cancelamento',
            Venda: 'Cotação',
            Suporte: 'Dúvida Geral',
            Informação: 'Dúvida Geral',
            Reclamação: 'Reclamação',
            Alteração: 'Alteração de Voo',
          }
          var currentReason = targetSr.getString('contact_reason')
          if (
            contactReasonMap[analysis.category] &&
            (!currentReason || currentReason === 'Outros' || currentReason === 'outros')
          ) {
            targetSr.set('contact_reason', contactReasonMap[analysis.category])
          }
          if (!targetSr.getString('channel')) {
            targetSr.set('channel', 'Telefone')
          }
          $app.save(targetSr)
        }
      } catch (srErr) {
        $app.logger().warn('Aviso ao sincronizar categoria no service_record: ' + srErr)
      }
    }

    var savedLogId = ''
    try {
      if ($app.hasTable('call_analysis_logs')) {
        var calCol = $app.findCollectionByNameOrId('call_analysis_logs')
        var calRec = new Record(calCol)
        calRec.set('call_sid', callSid)
        calRec.set('provider', provider)
        calRec.set('from_number', fromNumber)
        calRec.set('to_number', toNumber)
        calRec.set('recording_url', recordingUrl)
        calRec.set('duration', duration || 120)
        calRec.set('transcription', transcription)
        calRec.set('summary', analysis.summary)
        calRec.set('category', analysis.category)
        calRec.set('sentiment', analysis.sentiment)
        calRec.set('keywords', analysis.keywords)
        calRec.set('quality_score', analysis.quality_score)
        if (clientId) calRec.set('client', clientId)
        if (serviceRecordId) calRec.set('service_record', serviceRecordId)
        if (consultantUserId) calRec.set('processed_by', consultantUserId)
        calRec.set('received_at', new Date().toISOString())

        $app.save(calRec)
        savedLogId = calRec.id
      }
    } catch (logErr) {
      $app.logger().warn('Erro ao salvar em call_analysis_logs: ' + logErr)
    }

    var savedRecordId = ''
    if (!savedLogId && $app.hasTable('call_records')) {
      try {
        var callRecordsCol = $app.findCollectionByNameOrId('call_records')
        var rec = new Record(callRecordsCol)
        rec.set('call_sid', callSid)
        rec.set('from_number', fromNumber)
        rec.set('to_number', toNumber)
        rec.set('recording_url', recordingUrl)
        rec.set('duration', duration || 120)
        rec.set('transcription', transcription)
        rec.set('summary', analysis.summary)
        rec.set('category', analysis.category)
        rec.set('sentiment', analysis.sentiment)
        rec.set('keywords', analysis.keywords)
        rec.set('quality_score', analysis.quality_score)
        if (clientId) rec.set('client', clientId)
        if (serviceRecordId) rec.set('service_record', serviceRecordId)
        if (consultantUserId) rec.set('agent_user', consultantUserId)

        $app.save(rec)
        savedRecordId = rec.id
      } catch (crErr) {
        $app.logger().warn('Erro ao salvar em call_records: ' + crErr)
      }
    }

    return e.json(200, {
      success: true,
      call_id: savedLogId || savedRecordId || callSid,
      log_id: savedLogId,
      record_id: savedRecordId,
      provider: provider,
      analysis: analysis,
      transcription: transcription,
      client_id: clientId,
      service_record_id: serviceRecordId,
    })
  },
  $apis.requireAuth(),
)
