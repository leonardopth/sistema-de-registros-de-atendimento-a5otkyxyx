// Hook com endpoint para re-gerar ou atualizar o resumo por IA de um atendimento
// a partir da thread da Torre de Controle sob demanda (ou incrementalmente).

routerAdd(
  'POST',
  '/backend/v1/service-records/{id}/refresh-summary',
  (e) => {
    var srId = (e.request.pathValue('id') || '').trim()
    if (!srId) return e.badRequestError('ID do atendimento é obrigatório.')

    try {
      var srRecord = $app.findRecordById('service_records', srId)
      var threadId = srRecord.getString('thread_id')
      var cteId = srRecord.getString('control_tower_email')

      var threadMessages = []
      if (threadId) {
        try {
          threadMessages = $app.findRecordsByFilter(
            'control_tower_emails',
            "thread_id = '" + threadId + "'",
            'received_at, created',
            50,
            0,
          )
        } catch (_) {}
      } else if (cteId) {
        try {
          threadMessages = [$app.findRecordById('control_tower_emails', cteId)]
        } catch (_) {}
      }

      if (!threadMessages || threadMessages.length === 0) {
        return e.badRequestError('Nenhuma mensagem de e-mail associada a este atendimento.')
      }

      var threadTranscript = ''
      var allReservationNumbers = []
      var allDates = []
      var worstSentiment = 'Neutro'
      var worstIntensity = 'Leve'

      function parseList(val) {
        if (!val) return []
        if (Array.isArray(val)) return val
        if (typeof val === 'string') {
          try {
            var p = JSON.parse(val)
            if (Array.isArray(p)) return p
          } catch (_) {}
          return [val]
        }
        return []
      }

      for (var i = 0; i < threadMessages.length; i++) {
        var tm = threadMessages[i]
        var sName = tm.getString('sender_name')
        var sEmail = tm.getString('sender_email')
        var sLabel = tm.getString('sentiment_label')
        var sInt = tm.getString('sentiment_intensity')
        if (sLabel === 'Crítico') {
          worstSentiment = 'Crítico'
          worstIntensity = 'Forte'
        } else if (sLabel === 'Frustrado' && worstSentiment !== 'Crítico') {
          worstSentiment = 'Frustrado'
          worstIntensity = sInt || 'Moderado'
        }

        var rNum = tm.getString('reservation_number')
        if (rNum && allReservationNumbers.indexOf(rNum) === -1) {
          allReservationNumbers.push(rNum)
        }

        var dts = parseList(tm.get('detected_dates'))
        for (var d = 0; d < dts.length; d++) {
          if (allDates.indexOf(dts[d]) === -1) allDates.push(dts[d])
        }

        threadTranscript +=
          '---\n' +
          'Mensagem #' +
          (i + 1) +
          ' | De: ' +
          (sName ? sName + ' <' + sEmail + '>' : sEmail) +
          ' | Data: ' +
          (tm.getString('received_at') || tm.getString('created')) +
          '\n' +
          'Assunto: ' +
          tm.getString('subject') +
          '\n' +
          'Conteúdo:\n' +
          (tm.getString('body_snippet') || '(sem conteúdo)') +
          '\n'
      }

      var generatedSummary = ''
      var suggestedReason = 'Outros'
      try {
        var summaryPrompt =
          'Você é o motor de IA HUB AI da RexturAdvance / agência de viagens corporativa.\n' +
          'Sua tarefa é redigir um RESUMO EXECUTIVO ATUALIZADO DO ATENDIMENTO a partir da conversa de e-mails abaixo da Torre de Controle.\n' +
          'O resumo deve ser em Português do Brasil, profissional, estruturado em tópicos objetivos:\n' +
          '- Motivo do Contato: (resumo direto do que o cliente/agência precisa)\n' +
          '- Pontos Principais: (itens acordados, dúvidas ou solicitações cruciais)\n' +
          '- Urgência / Sentimento: (destaque se o cliente está Crítico/Frustrado/Urgente, prazos prometidos ou riscos de embarque)\n' +
          '- Dados Detectados: (número de reserva/PNR e datas de viagem se identificados)\n\n' +
          'Classifique também o contact_reason em um dos valores: Bagagem, Assento, Cálculo de Reemissão, Reembolso, Cotação, Reserva, Cancelamento, Regras Tarifárias, Erro RF, Remarcação, Check-in, Alteração de Voo, Reclamação, Dúvida Geral, Outros.\n\n' +
          'Responda em formato JSON com as chaves "summary" (texto com os tópicos) e "contact_reason":\n' +
          '{"summary":"...","contact_reason":"..."}'

        var aiSummaryRes = $ai.chat({
          model: 'fast',
          messages: [
            { role: 'system', content: summaryPrompt },
            { role: 'user', content: threadTranscript },
          ],
        })

        var aiSummaryText = aiSummaryRes.choices[0].message.content
        var summaryJsonMatch = aiSummaryText.match(/\{[\s\S]*\}/)
        if (summaryJsonMatch) {
          var parsedSumm = JSON.parse(summaryJsonMatch[0])
          if (parsedSumm.summary) generatedSummary = String(parsedSumm.summary).trim()
          if (parsedSumm.contact_reason) suggestedReason = String(parsedSumm.contact_reason).trim()
        } else if (aiSummaryText.trim()) {
          generatedSummary = aiSummaryText.trim()
        }
      } catch (aiErr) {
        $app.logger().warn('IA Fallback ao atualizar resumo de atendimento: ' + aiErr)
      }

      if (!generatedSummary) {
        var resStr =
          allReservationNumbers.length > 0 ? allReservationNumbers.join(', ') : 'Não detectado'
        var datesStr = allDates.length > 0 ? allDates.join(', ') : 'Não detectadas'
        generatedSummary =
          '• Motivo do Contato: ' +
          (srRecord.getString('client_name') || 'Atendimento Torre') +
          '\n' +
          '• Pontos Principais: Conversa com ' +
          threadMessages.length +
          ' mensagem(ns) na thread.\n' +
          '• Urgência / Sentimento: ' +
          worstSentiment +
          ' (' +
          worstIntensity +
          ')\n' +
          '• Dados Detectados: Reserva/PNR: ' +
          resStr +
          ' | Datas: ' +
          datesStr
      }

      var nowIso = new Date().toISOString()
      srRecord.set('ai_summary', generatedSummary)
      srRecord.set('ai_summary_generated_at', nowIso)
      srRecord.set('ai_summary_messages_count', threadMessages.length)

      // Atualiza a descrição apenas se o usuário não tiver customizado manualmente
      var isManualEdited = srRecord.getBool('ai_summary_edited_by_user')
      if (!isManualEdited) {
        srRecord.set(
          'description',
          '📋 [Resumo gerado por HUB AI]\n' +
            generatedSummary +
            '\n\n' +
            '━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━\n' +
            'Histórico da Conversa (' +
            threadMessages.length +
            ' msg(s)):\n' +
            threadTranscript,
        )
      }

      $app.save(srRecord)

      return e.json(200, {
        success: true,
        summary: generatedSummary,
        messages_count: threadMessages.length,
        generated_at: nowIso,
        suggested_contact_reason: suggestedReason,
      })
    } catch (err) {
      return e.badRequestError('Erro ao gerar resumo do atendimento: ' + err)
    }
  },
  $apis.requireAuth(),
)
