// Hook para Frente C3 — CSAT Direto
// No PocketBase JSVM, cada callback roda num pool isolado.
// Funções auxiliares devem ficar inline dentro de cada handler.

onRecordAfterCreateSuccess((e) => {
  e.next()
  var rec = e.record
  if (rec.getString('status') === 'Concluído') {
    try {
      var csatCol = $app.findCollectionByNameOrId('csat_responses')
      var existing = null
      try {
        existing = $app.findFirstRecordByData('csat_responses', 'service_record_id', rec.id)
      } catch (_) {}

      var csatRec = existing
      if (!csatRec) {
        csatRec = new Record(csatCol)
        csatRec.set('service_record_id', rec.id)
        csatRec.set('token', $security.randomString(28))
        csatRec.set('rating', 0)
        csatRec.set('client_name', rec.getString('client_name') || '')
        csatRec.set('client_email', rec.getString('client_email') || '')
        $app.save(csatRec)
      }

      var clientEmail = (rec.getString('client_email') || '').trim()
      if (clientEmail && clientEmail.indexOf('@') > 0 && csatRec.getInt('rating') === 0) {
        try {
          var clientName = rec.getString('client_name') || 'Cliente'
          var token = csatRec.getString('token')
          var csatPath = '/csat/' + token
          var subject = 'Como foi seu atendimento? - Avaliação rápida'

          var html =
            '<div style="font-family: -apple-system, BlinkMacSystemFont, \'Segoe UI\', Roboto, sans-serif; max-width: 580px; margin: 0 auto; padding: 24px; color: #1e293b; background: #ffffff; border: 1px solid #e2e8f0; border-radius: 8px;">' +
            '  <div style="text-align: center; margin-bottom: 24px;">' +
            '    <h2 style="color: #4338ca; margin: 0 0 8px 0; font-size: 22px;">Sua opinião é fundamental</h2>' +
            '    <p style="color: #64748b; font-size: 14px; margin: 0;">Atendimento finalizado com sucesso</p>' +
            '  </div>' +
            '  <p style="font-size: 15px; line-height: 1.5;">Olá, <strong>' +
            clientName +
            '</strong>!</p>' +
            '  <p style="font-size: 14px; line-height: 1.5; color: #475569;">Gostaríamos de saber: <strong>como foi a sua experiência com o nosso atendimento?</strong> Leva menos de 10 segundos para responder.</p>' +
            '  <div style="background: #f8fafc; border: 1px solid #e2e8f0; border-radius: 6px; padding: 14px; margin: 20px 0; font-size: 13px; color: #64748b;">' +
            '    <div><strong>Atendimento:</strong> #' +
            rec.id.substring(0, 8) +
            '</div>' +
            '    <div><strong>Motivo:</strong> ' +
            (rec.getString('contact_reason') || 'Atendimento Geral') +
            '</div>' +
            '  </div>' +
            '  <div style="text-align: center; margin: 30px 0;">' +
            '    <p style="font-size: 14px; font-weight: bold; margin-bottom: 12px; color: #334155;">Como você avalia a resolução?</p>' +
            '    <div style="margin-top: 16px;">' +
            '      <a href="' +
            csatPath +
            '" style="display: inline-block; background: #4f46e5; color: #ffffff; padding: 12px 24px; text-decoration: none; border-radius: 6px; font-weight: bold; font-size: 14px;">Avaliar Atendimento</a>' +
            '    </div>' +
            '  </div>' +
            '  <div style="border-top: 1px solid #f1f5f9; padding-top: 16px; margin-top: 24px; text-align: center; font-size: 12px; color: #94a3b8;">' +
            '    Link de avaliação exclusivo para este atendimento.' +
            '  </div>' +
            '</div>'

          var mail = new MailerMessage({
            to: [{ address: clientEmail, name: clientName }],
            subject: subject,
            html: html,
          })

          $app.newMailClient().send(mail)
          $app
            .logger()
            .info(
              'E-mail de CSAT enviado com sucesso para: ' +
                clientEmail +
                ' (chamado ' +
                rec.id +
                ')',
            )
        } catch (mailErr) {
          $app.logger().error('Falha ao enviar e-mail de CSAT: ' + String(mailErr))
        }
      }
    } catch (err) {
      $app
        .logger()
        .error('Erro ao processar CSAT no create do chamado ' + rec.id + ': ' + String(err))
    }
  }
}, 'service_records')

onRecordAfterUpdateSuccess((e) => {
  e.next()
  var rec = e.record
  var oldStatus = ''
  try {
    oldStatus = rec.original().getString('status')
  } catch (_) {}
  var newStatus = rec.getString('status')

  if (newStatus === 'Concluído' && oldStatus !== 'Concluído') {
    try {
      var csatCol = $app.findCollectionByNameOrId('csat_responses')
      var existing = null
      try {
        existing = $app.findFirstRecordByData('csat_responses', 'service_record_id', rec.id)
      } catch (_) {}

      var csatRec = existing
      if (!csatRec) {
        csatRec = new Record(csatCol)
        csatRec.set('service_record_id', rec.id)
        csatRec.set('token', $security.randomString(28))
        csatRec.set('rating', 0)
        csatRec.set('client_name', rec.getString('client_name') || '')
        csatRec.set('client_email', rec.getString('client_email') || '')
        $app.save(csatRec)
      }

      var clientEmail = (rec.getString('client_email') || '').trim()
      if (clientEmail && clientEmail.indexOf('@') > 0 && csatRec.getInt('rating') === 0) {
        try {
          var clientName = rec.getString('client_name') || 'Cliente'
          var token = csatRec.getString('token')
          var csatPath = '/csat/' + token
          var subject = 'Como foi seu atendimento? - Avaliação rápida'

          var html =
            '<div style="font-family: -apple-system, BlinkMacSystemFont, \'Segoe UI\', Roboto, sans-serif; max-width: 580px; margin: 0 auto; padding: 24px; color: #1e293b; background: #ffffff; border: 1px solid #e2e8f0; border-radius: 8px;">' +
            '  <div style="text-align: center; margin-bottom: 24px;">' +
            '    <h2 style="color: #4338ca; margin: 0 0 8px 0; font-size: 22px;">Sua opinião é fundamental</h2>' +
            '    <p style="color: #64748b; font-size: 14px; margin: 0;">Atendimento finalizado com sucesso</p>' +
            '  </div>' +
            '  <p style="font-size: 15px; line-height: 1.5;">Olá, <strong>' +
            clientName +
            '</strong>!</p>' +
            '  <p style="font-size: 14px; line-height: 1.5; color: #475569;">Gostaríamos de saber: <strong>como foi a sua experiência com o nosso atendimento?</strong> Leva menos de 10 segundos para responder.</p>' +
            '  <div style="background: #f8fafc; border: 1px solid #e2e8f0; border-radius: 6px; padding: 14px; margin: 20px 0; font-size: 13px; color: #64748b;">' +
            '    <div><strong>Atendimento:</strong> #' +
            rec.id.substring(0, 8) +
            '</div>' +
            '    <div><strong>Motivo:</strong> ' +
            (rec.getString('contact_reason') || 'Atendimento Geral') +
            '</div>' +
            '  </div>' +
            '  <div style="text-align: center; margin: 30px 0;">' +
            '    <p style="font-size: 14px; font-weight: bold; margin-bottom: 12px; color: #334155;">Como você avalia a resolução?</p>' +
            '    <div style="margin-top: 16px;">' +
            '      <a href="' +
            csatPath +
            '" style="display: inline-block; background: #4f46e5; color: #ffffff; padding: 12px 24px; text-decoration: none; border-radius: 6px; font-weight: bold; font-size: 14px;">Avaliar Atendimento</a>' +
            '    </div>' +
            '  </div>' +
            '  <div style="border-top: 1px solid #f1f5f9; padding-top: 16px; margin-top: 24px; text-align: center; font-size: 12px; color: #94a3b8;">' +
            '    Link de avaliação exclusivo para este atendimento.' +
            '  </div>' +
            '</div>'

          var mail = new MailerMessage({
            to: [{ address: clientEmail, name: clientName }],
            subject: subject,
            html: html,
          })

          $app.newMailClient().send(mail)
          $app
            .logger()
            .info(
              'E-mail de CSAT enviado com sucesso para: ' +
                clientEmail +
                ' (chamado ' +
                rec.id +
                ')',
            )
        } catch (mailErr) {
          $app.logger().error('Falha ao enviar e-mail de CSAT: ' + String(mailErr))
        }
      }
    } catch (err) {
      $app
        .logger()
        .error('Erro ao processar CSAT no update do chamado ' + rec.id + ': ' + String(err))
    }
  }
}, 'service_records')

// Endpoint público para consultar dados de avaliação por token
routerAdd('GET', '/api/csat/public/:token', (c) => {
  var token = c.pathParam('token')
  if (!token) {
    return c.json(400, { error: 'Token obrigatório' })
  }

  try {
    var csat = $app.findFirstRecordByData('csat_responses', 'token', token)
    var record = $app.findRecordById('service_records', csat.getString('service_record_id'))

    return c.json(200, {
      token: csat.getString('token'),
      client_name: csat.getString('client_name') || record.getString('client_name') || 'Cliente',
      service_id: record.id,
      contact_reason: record.getString('contact_reason') || '',
      already_responded: csat.getInt('rating') > 0,
      current_rating: csat.getInt('rating'),
      responded_at: csat.getString('responded_at'),
    })
  } catch (_) {
    return c.json(404, { error: 'Avaliação não encontrada ou token inválido' })
  }
})

// Endpoint público para submeter a avaliação por token
routerAdd('POST', '/api/csat/public/submit', (c) => {
  var data = {}
  try {
    data = c.bindBody()
  } catch (_) {}

  var token = data.token
  var rating = parseInt(data.rating, 10)
  var comment = data.comment || ''

  if (!token) {
    return c.json(400, { error: 'Token é obrigatório' })
  }
  if (isNaN(rating) || rating < 1 || rating > 5) {
    return c.json(400, { error: 'Rating deve ser entre 1 e 5' })
  }

  try {
    var csat = $app.findFirstRecordByData('csat_responses', 'token', token)

    if (csat.getInt('rating') > 0) {
      return c.json(400, { error: 'Esta avaliação já foi respondida anteriormente.' })
    }

    csat.set('rating', rating)
    if (comment) {
      csat.set('comment', String(comment).trim())
    }
    csat.set('responded_at', new Date().toISOString())
    $app.save(csat)

    return c.json(200, {
      success: true,
      message: 'Avaliação registrada com sucesso! Muito obrigado pelo feedback.',
      rating: rating,
    })
  } catch (err) {
    return c.json(404, { error: 'Token não encontrado ou inválido' })
  }
})

// Endpoint interno autenticado para obter ou criar token de avaliação do chamado
routerAdd('GET', '/api/csat/record/:id', (c) => {
  var recordId = c.pathParam('id')
  var auth = c.get('authRecord')
  if (!auth) {
    return c.json(401, { error: 'Não autorizado' })
  }

  try {
    var rec = $app.findRecordById('service_records', recordId)
    var csatCol = $app.findCollectionByNameOrId('csat_responses')
    var csat = null
    try {
      csat = $app.findFirstRecordByData('csat_responses', 'service_record_id', recordId)
    } catch (_) {}

    if (!csat) {
      csat = new Record(csatCol)
      csat.set('service_record_id', recordId)
      csat.set('token', $security.randomString(28))
      csat.set('rating', 0)
      csat.set('client_name', rec.getString('client_name') || '')
      csat.set('client_email', rec.getString('client_email') || '')
      $app.save(csat)
    }

    return c.json(200, {
      id: csat.id,
      service_record_id: csat.getString('service_record_id'),
      token: csat.getString('token'),
      rating: csat.getInt('rating'),
      comment: csat.getString('comment'),
      responded_at: csat.getString('responded_at'),
      created: csat.getString('created'),
    })
  } catch (err) {
    return c.json(404, { error: 'Registro não encontrado' })
  }
})

// Endpoint autenticado para listar todas as respostas de CSAT recebidas para relatórios e dashboards
routerAdd('GET', '/api/csat/stats', (c) => {
  var auth = c.get('authRecord')
  if (!auth) {
    return c.json(401, { error: 'Não autorizado' })
  }

  try {
    var query =
      'SELECT c.id, c.service_record_id, c.token, c.rating, c.comment, c.responded_at, c.created, ' +
      's.assigned_user, s.user_id, s.contact_reason, s.created as record_created ' +
      'FROM csat_responses c ' +
      'LEFT JOIN service_records s ON c.service_record_id = s.id ' +
      'WHERE c.rating > 0'

    var rows = []
    $app.db().newQuery(query).all(rows)

    return c.json(200, {
      items: rows,
    })
  } catch (err) {
    return c.json(500, { error: String(err) })
  }
})
