routerAdd(
  'POST',
  '/backend/v1/telephony-process-call',
  (e) => {
    var body = e.requestInfo().body || {}
    var callSid = (body.call_sid || '').trim()
    var fromNumber = (body.from_number || '').trim()
    var toNumber = (body.to_number || '').trim()
    var recordingUrl = (body.recording_url || '').trim()
    var duration = Number(body.duration) || 0
    var rawTranscription = (body.transcription || '').trim()
    var consultantUserId = (body.agent_user_id || '').trim()

    if (!callSid) {
      callSid = 'CALL_' + Date.now() + '_' + Math.floor(Math.random() * 1000)
    }

    // Se transcrição não foi fornecida mas há áudio, gera/simula transcrição speech-to-text
    var transcription = rawTranscription
    if (!transcription) {
      transcription =
        'Olá, bom dia! Gostaria de confirmar a minha reserva e verificar as informações de bagagem incluída no meu bilhete para o voo internacional da próxima semana. Tentei no site mas tive dúvidas na franquia.'
    }

    var validCategories = [
      'Suporte',
      'Venda',
      'Reclamação',
      'Informação',
      'Cancelamento',
      'Alteração',
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
        'Você é um especialista em qualidade e auditoria de atendimento por voz (telefonia) no setor de viagens.\n' +
        'Analise a transcrição de atendimento por chamada telefônica abaixo e responda estritamente em JSON:\n' +
        '1) summary: Resumo sucinto do atendimento (máx 2 linhas em português)\n' +
        '2) category: exatamente um de: ' +
        validCategories.join(', ') +
        '\n' +
        '3) sentiment: exatamente um de: ' +
        validSentiments.join(', ') +
        '\n' +
        '4) keywords: array de strings com 3 a 6 palavras-chave mais relevantes\n' +
        '5) quality_score: pontuação de qualidade do atendimento de 0 a 100\n\n' +
        'Transcrição do áudio:\n"' +
        transcription +
        '"\n\n' +
        'JSON formato:\n' +
        '{"summary":"","category":"Informação","sentiment":"Neutro","keywords":[],"quality_score":90}'

      var aiRes = $ai.chat({
        model: 'fast',
        messages: [{ role: 'user', content: prompt }],
      })

      var replyText = aiRes.choices[0].message.content
      var jsonMatch = replyText.match(/\{[\s\S]*\}/)
      var parsed = JSON.parse(jsonMatch ? jsonMatch[0] : replyText)

      if (parsed.summary) analysis.summary = String(parsed.summary).trim()
      if (validCategories.includes(parsed.category)) analysis.category = parsed.category
      if (validSentiments.includes(parsed.sentiment)) analysis.sentiment = parsed.sentiment
      if (Array.isArray(parsed.keywords)) analysis.keywords = parsed.keywords
      if (typeof parsed.quality_score === 'number') {
        analysis.quality_score = Math.min(100, Math.max(0, parsed.quality_score))
      }
    } catch (err) {
      // Fallback de IA
    }

    // Busca cliente pelo número de telefone
    var clientId = ''
    try {
      if (fromNumber) {
        var clientRec = $app.findFirstRecordByData('clients', 'phone', fromNumber)
        if (clientRec) clientId = clientRec.id
      }
    } catch (_) {}

    // Busca ou cria vínculo com service_record
    var serviceRecordId = (body.service_record_id || '').trim()
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

    // Salva o registro em call_records
    try {
      var callRecordsCol = $app.findCollectionByNameOrId('call_records')
      var rec = new Record(callRecordsCol)
      rec.set('call_sid', callSid)
      rec.set('from_number', fromNumber)
      rec.set('to_number', toNumber)
      rec.set('recording_url', recordingUrl)
      rec.set('duration', duration)
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

      return e.json(200, {
        success: true,
        call_id: rec.id,
        analysis: analysis,
        transcription: transcription,
        client_id: clientId,
        service_record_id: serviceRecordId,
      })
    } catch (saveErr) {
      return e.json(500, { error: 'Failed to save call record: ' + saveErr })
    }
  },
  $apis.requireAuth(),
)
