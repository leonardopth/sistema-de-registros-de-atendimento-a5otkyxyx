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

    if (!senderEmail || !emailBody) {
      return e.badRequestError('sender_email and body are required')
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

    try {
      var prompt =
        'Você é um assistente de IA especializado em analisar e-mails de atendimento ao cliente para o setor de viagens/turismo.\n' +
        'Analise o e-mail de resposta do cliente abaixo e extraia em formato JSON:\n' +
        '1) main_topic: Breve resumo do assunto principal (máx 1 linha em português)\n' +
        '2) sentiment: exatamente um de: ' +
        validSentiments.join(', ') +
        '\n' +
        '3) category: exatamente um de: ' +
        validCategories.join(', ') +
        '\n' +
        '4) confidence_score: número de 0 a 100 indicando a certeza da análise\n\n' +
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
        '{"main_topic":"","sentiment":"Neutro","category":"Dúvida","confidence_score":90}'

      var aiRes = $ai.chat({
        model: 'fast',
        messages: [{ role: 'user', content: prompt }],
      })

      var replyText = aiRes.choices[0].message.content
      var jsonMatch = replyText.match(/\{[\s\S]*\}/)
      var parsed = JSON.parse(jsonMatch ? jsonMatch[0] : replyText)

      if (parsed.main_topic) analysis.main_topic = String(parsed.main_topic).trim()
      if (validSentiments.includes(parsed.sentiment)) analysis.sentiment = parsed.sentiment
      if (validCategories.includes(parsed.category)) analysis.category = parsed.category
      if (typeof parsed.confidence_score === 'number')
        analysis.confidence_score = Math.min(100, Math.max(0, parsed.confidence_score))
    } catch (err) {
      // Fallback em caso de falha de IA
    }

    // Tenta encontrar cliente pelo e-mail
    var clientId = ''
    try {
      var clientRec = $app.findFirstRecordByData('clients', 'email', senderEmail)
      if (clientRec) clientId = clientRec.id
    } catch (_) {}

    // Tenta encontrar ou vincular a um atendimento aberto com este cliente/e-mail
    var serviceRecordId = ''
    try {
      var srRecords = $app.findRecordsByFilter(
        'service_records',
        "client_email = '" + senderEmail + "' && status != 'Concluído' && status != 'Cancelado'",
        '-created',
        1,
        0,
      )
      if (srRecords && srRecords.length > 0) {
        serviceRecordId = srRecords[0].id
      }
    } catch (_) {}

    // Salva o log de e-mail na coleção email_logs
    try {
      var emailLogsCol = $app.findCollectionByNameOrId('email_logs')
      var logRecord = new Record(emailLogsCol)
      logRecord.set('sender_email', senderEmail)
      logRecord.set('sender_name', senderName)
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
      logRecord.set('received_at', new Date().toISOString())

      $app.save(logRecord)

      return e.json(200, {
        success: true,
        log_id: logRecord.id,
        analysis: analysis,
        client_id: clientId,
        service_record_id: serviceRecordId,
      })
    } catch (saveErr) {
      return e.json(500, { error: 'Failed to save email log: ' + saveErr })
    }
  },
  $apis.requireAuth(),
)
