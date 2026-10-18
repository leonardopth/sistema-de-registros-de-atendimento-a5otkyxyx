// PocketBase hook: waiver_approval_workflow.js
// Implementa:
// 1. Endpoint /backend/v1/waivers/send-approval-email:
//    - Gera 3 tokens exclusivos em waiver_decision_tokens (approve, reject, standby) com validade de 7 dias
//    - Identifica e-mail do aprovador (por approver_id ou por nome na lista de aprovadores/usuários)
//    - Envia e-mail formatado HUB AI com resumo da solicitação e 3 botões com links diretos de decisão
// 2. Hook onRecordAfterCreateSuccess('waiver_requests') como gatilho automático de envio
// 3. Endpoint público GET /backend/v1/waivers/decision:
//    - Valida token único, expiração e status da solicitação
//    - Aplica ação (Aprovada, Recusada, Standby)
//    - Registra no waiver_history
//    - Executa débito de verba comercial se Aprovada
//    - Marca token como usado
//    - Notifica o solicitante (sino + e-mail de confirmação visual HUB AI)
//    - Responde com página HTML amigável e moderna

// 1. Endpoint REST autenticado para disparo manual/re-envio do e-mail de aprovação
routerAdd(
  'POST',
  '/backend/v1/waivers/send-approval-email',
  (e) => {
    try {
      var body = e.requestInfo().body || {}
      var waiverId = body.waiver_id || body.waiverId
      if (!waiverId) {
        return e.badRequestError('waiver_id is required')
      }

      var waiver = $app.findRecordById('waiver_requests', waiverId)

      // Identifica aprovador
      var approverId = waiver.getString('approver_id')
      var approverName = (waiver.getString('approver_name') || '').trim()
      var approverUser = null
      var approverEmail = ''

      if (approverId) {
        try {
          approverUser = $app.findRecordById('users', approverId)
          approverEmail = (approverUser.getString('email') || '').trim()
        } catch (_) {}
      }

      if (!approverEmail && approverName) {
        try {
          var matched = $app.findRecordsByFilter(
            'users',
            "name ~ '" + approverName.replace(/'/g, "''") + "'",
            '-created',
            1,
            0,
          )
          if (matched && matched.length > 0) {
            approverUser = matched[0]
            approverEmail = (approverUser.getString('email') || '').trim()
          }
        } catch (_) {}
      }

      if (!approverEmail && approverName.indexOf('@') > 0) {
        approverEmail = approverName
      }

      if (!approverEmail) {
        try {
          var managers = $app.findRecordsByFilter(
            'users',
            "(role = 'Gerente' || role = 'Supervisor' || role = 'Master') && approval_status = 'Aprovado'",
            '-created',
            1,
            0,
          )
          if (managers && managers.length > 0) {
            approverUser = managers[0]
            approverEmail = (approverUser.getString('email') || '').trim()
          }
        } catch (_) {}
      }

      if (!approverEmail) {
        $app
          .logger()
          .warn('Não foi possível identificar e-mail de aprovador para a waiver ' + waiverId)
        return e.json(400, { error: 'E-mail do aprovador não encontrado' })
      }

      var requesterName = 'Consultor'
      var requesterId = waiver.getString('requester')
      if (requesterId) {
        try {
          var reqUser = $app.findRecordById('users', requesterId)
          requesterName = reqUser.getString('name') || requesterName
        } catch (_) {}
      }

      var tokensCol = $app.findCollectionByNameOrId('waiver_decision_tokens')
      var now = new Date()
      var expiresAt = new Date(now.getTime() + 7 * 24 * 60 * 60 * 1000).toISOString()

      var actions = ['approve', 'reject', 'standby']
      var tokenMap = {}

      for (var i = 0; i < actions.length; i++) {
        var act = actions[i]
        var tok = $security.randomString(36)
        var tokenRec = new Record(tokensCol)
        tokenRec.set('waiver_request', waiver.id)
        tokenRec.set('token', tok)
        tokenRec.set('action', act)
        tokenRec.set('approver_email', approverEmail)
        if (approverUser) {
          tokenRec.set('approver_user', approverUser.id)
        }
        tokenRec.set('used', false)
        tokenRec.set('expires_at', expiresAt)
        $app.save(tokenRec)
        tokenMap[act] = tok
      }

      // Base URL
      var baseUrl = $os.getenv('APP_URL') || $os.getenv('FRONTEND_URL') || ''
      if (!baseUrl) {
        try {
          var proto = e.request.header.get('X-Forwarded-Proto') || 'https'
          var host = e.request.header.get('X-Forwarded-Host') || e.request.host
          if (host) baseUrl = proto + '://' + host
        } catch (_) {}
      }
      if (!baseUrl) {
        baseUrl = 'https://sistema-de-registros-de-atendimento-b6923.shrd03.internal.goskip.dev'
      }
      baseUrl = baseUrl.replace(/\/+$/, '')

      var approveUrl =
        baseUrl + '/backend/v1/waivers/decision?token=' + tokenMap.approve + '&action=approve'
      var rejectUrl =
        baseUrl + '/backend/v1/waivers/decision?token=' + tokenMap.reject + '&action=reject'
      var standbyUrl =
        baseUrl + '/backend/v1/waivers/decision?token=' + tokenMap.standby + '&action=standby'

      var airlineName = waiver.getString('airline_name') || 'Companhia Aérea'
      var requestType = waiver.getString('request_type') || 'Waiver / Quebra Tarifária'
      var unit = waiver.getString('unit') || 'Operação'
      var gdsLoc = waiver.getString('gds_locator') || 'Não informado'
      var airLoc = waiver.getString('airline_locator') || ''
      var paxName = waiver.getString('pax_name') || 'Não informado'
      var amount = waiver.getFloat('amount') || 0
      var currency = waiver.getString('currency') || 'BRL'
      var priority = waiver.getString('priority') || 'MÉDIA'

      var reasonText = ''
      try {
        var formData = waiver.get('form_data')
        if (formData) {
          if (typeof formData === 'string') {
            formData = JSON.parse(formData)
          }
          reasonText =
            formData.motivo_solicitacao ||
            formData.motivo ||
            formData.descricao ||
            formData.justificativa ||
            formData.reason ||
            ''
        }
      } catch (_) {}
      if (!reasonText) {
        reasonText = 'Solicitação de waiver e quebra de regras tarifárias registrada no HUB AI.'
      }

      var subject =
        '📋 [Waiver & Favors] Pedido de Aprovação: ' +
        airlineName +
        ' — LOC ' +
        gdsLoc +
        ' (' +
        requesterName +
        ')'

      var htmlContent =
        '<!DOCTYPE html><html><head><meta charset="utf-8"></head>' +
        '<body style="margin:0;padding:24px;background-color:#f8fafc;font-family:-apple-system,BlinkMacSystemFont,\'Segoe UI\',Roboto,Helvetica,Arial,sans-serif;color:#1e293b;">' +
        '<div style="max-width:620px;margin:0 auto;background:#ffffff;border-radius:12px;border:1px solid #e2e8f0;overflow:hidden;box-shadow:0 4px 6px -1px rgba(0,0,0,0.06);">' +
        '  <div style="background:linear-gradient(135deg, #1e1b4b 0%, #312e81 50%, #4338ca 100%);padding:24px 28px;color:#ffffff;">' +
        '    <div style="display:flex;align-items:center;justify-content:space-between;margin-bottom:8px;">' +
        '      <span style="text-transform:uppercase;letter-spacing:1px;font-size:11px;font-weight:700;background:rgba(255,255,255,0.15);padding:4px 8px;border-radius:4px;">HUB AI • Waivers & Favors</span>' +
        '      <span style="font-size:11px;opacity:0.85;">Prioridade: <strong>' +
        priority +
        '</strong></span>' +
        '    </div>' +
        '    <h2 style="margin:6px 0 0;font-size:20px;font-weight:800;color:#ffffff;">Nova Solicitação de Aprovação</h2>' +
        '    <p style="margin:6px 0 0;font-size:13px;opacity:0.9;">Companhia: <strong>' +
        airlineName +
        '</strong> • Unidade: <strong>' +
        unit +
        '</strong></p>' +
        '  </div>' +
        '  <div style="padding:24px 28px;">' +
        '    <p style="font-size:14px;color:#475569;margin-top:0;line-height:1.5;">' +
        '      Olá, <strong>' +
        (approverUser ? approverUser.getString('name') : 'Aprovador') +
        '</strong>!<br>' +
        '      Uma nova solicitação foi registrada no <strong>HUB AI</strong> e aguarda a sua análise e decisão.' +
        '    </p>' +
        '    <div style="background:#f8fafc;border:1px solid #e2e8f0;border-radius:8px;padding:16px;margin:18px 0;font-size:13px;">' +
        '      <div style="display:grid;grid-template-columns:1fr 1fr;gap:10px;">' +
        '        <div><span style="color:#64748b;font-size:11px;text-transform:uppercase;font-weight:600;display:block;">Companhia Aérea</span><strong style="color:#0f172a;font-size:13px;">' +
        airlineName +
        '</strong></div>' +
        '        <div><span style="color:#64748b;font-size:11px;text-transform:uppercase;font-weight:600;display:block;">Tipo de Pedido</span><strong style="color:#0f172a;font-size:13px;">' +
        requestType +
        '</strong></div>' +
        '        <div><span style="color:#64748b;font-size:11px;text-transform:uppercase;font-weight:600;display:block;">Solicitante</span><strong style="color:#0f172a;font-size:13px;">' +
        requesterName +
        '</strong></div>' +
        '        <div><span style="color:#64748b;font-size:11px;text-transform:uppercase;font-weight:600;display:block;">Unidade / Núcleo</span><strong style="color:#0f172a;font-size:13px;">' +
        unit +
        '</strong></div>' +
        '        <div><span style="color:#64748b;font-size:11px;text-transform:uppercase;font-weight:600;display:block;">Localizador GDS</span><span style="font-family:monospace;font-weight:700;color:#4338ca;font-size:13px;">' +
        gdsLoc +
        (airLoc ? ' (Cia: ' + airLoc + ')' : '') +
        '</span></div>' +
        '        <div><span style="color:#64748b;font-size:11px;text-transform:uppercase;font-weight:600;display:block;">PAX / Passageiro</span><strong style="color:#0f172a;font-size:13px;">' +
        paxName +
        '</strong></div>' +
        '      </div>' +
        '      <div style="border-top:1px solid #e2e8f0;margin-top:12px;padding-top:10px;display:flex;justify-content:space-between;align-items:center;">' +
        '        <span style="color:#64748b;font-size:12px;font-weight:600;">Valor da Solicitação:</span>' +
        '        <span style="font-size:16px;font-weight:800;font-family:monospace;color:#0f172a;">' +
        (amount > 0 ? amount.toFixed(2) + ' ' + currency : 'Sem valor financeiro informado') +
        '</span>' +
        '      </div>' +
        '      <div style="margin-top:10px;padding-top:10px;border-top:1px dashed #e2e8f0;">' +
        '        <span style="color:#64748b;font-size:11px;text-transform:uppercase;font-weight:600;display:block;margin-bottom:4px;">Motivo / Justificativa:</span>' +
        '        <p style="margin:0;font-size:12.5px;color:#334155;line-height:1.4;background:#ffffff;padding:8px 10px;border-radius:4px;border:1px solid #e2e8f0;">' +
        reasonText +
        '</p>' +
        '      </div>' +
        '    </div>' +
        '    <div style="margin:26px 0 20px;text-align:center;">' +
        '      <p style="font-size:13px;font-weight:700;color:#0f172a;margin-bottom:14px;text-transform:uppercase;letter-spacing:0.5px;">Clique abaixo para decidir diretamente pelo e-mail:</p>' +
        '      <div style="display:inline-flex;gap:10px;flex-wrap:wrap;justify-content:center;">' +
        '        <a href="' +
        approveUrl +
        '" style="display:inline-block;background-color:#16a34a;color:#ffffff;text-decoration:none;font-weight:700;font-size:13px;padding:12px 22px;border-radius:6px;box-shadow:0 2px 4px rgba(22,163,74,0.3);margin:4px;">' +
        '          ✓ Aprovar' +
        '        </a>' +
        '        <a href="' +
        standbyUrl +
        '" style="display:inline-block;background-color:#d97706;color:#ffffff;text-decoration:none;font-weight:700;font-size:13px;padding:12px 22px;border-radius:6px;box-shadow:0 2px 4px rgba(217,119,6,0.3);margin:4px;">' +
        '          ⏸ Standby' +
        '        </a>' +
        '        <a href="' +
        rejectUrl +
        '" style="display:inline-block;background-color:#dc2626;color:#ffffff;text-decoration:none;font-weight:700;font-size:13px;padding:12px 22px;border-radius:6px;box-shadow:0 2px 4px rgba(220,38,38,0.3);margin:4px;">' +
        '          ✕ Rejeitar' +
        '        </a>' +
        '      </div>' +
        '      <p style="font-size:11px;color:#94a3b8;margin-top:12px;">Link com token de uso único, válido por 7 dias. Não compartilhe este e-mail.</p>' +
        '    </div>' +
        '    <div style="border-top:1px solid #e2e8f0;padding-top:16px;margin-top:24px;text-align:center;font-size:11px;color:#94a3b8;">' +
        '      HUB AI — Gestão de Atendimento &amp; Operação' +
        '    </div>' +
        '  </div>' +
        '</div></body></html>'

      var senderAddress = 'noreply@rexturadvance.com.br'
      var senderName = 'HUB AI'
      try {
        var appSettings = $app.settings()
        if (appSettings && appSettings.meta && appSettings.meta.senderAddress) {
          senderAddress = appSettings.meta.senderAddress
          senderName = appSettings.meta.senderName || senderName
        }
      } catch (_) {}

      var mail = new MailerMessage({
        from: { address: senderAddress, name: senderName },
        to: [
          {
            address: approverEmail,
            name: approverUser ? approverUser.getString('name') : 'Aprovador',
          },
        ],
        subject: subject,
        html: htmlContent,
      })

      $app.newMailClient().send(mail)
      $app
        .logger()
        .info(
          'E-mail de pedido de aprovação de waiver enviado com sucesso para: ' +
            approverEmail +
            ' (waiver ' +
            waiverId +
            ')',
        )

      return e.json(200, {
        success: true,
        recipient: approverEmail,
        waiver_id: waiverId,
      })
    } catch (err) {
      $app.logger().error('Erro em /backend/v1/waivers/send-approval-email: ' + String(err))
      return e.json(500, { error: 'Falha ao enviar e-mail ao aprovador: ' + String(err) })
    }
  },
  $apis.requireAuth(),
)

// 2. Hook pós-criação da solicitação de waiver (disparo automático resiliente)
onRecordAfterCreateSuccess((e) => {
  e.next()
  try {
    var waiver = e.record
    var waiverId = waiver.id

    // Identifica aprovador
    var approverId = waiver.getString('approver_id')
    var approverName = (waiver.getString('approver_name') || '').trim()
    var approverUser = null
    var approverEmail = ''

    if (approverId) {
      try {
        approverUser = $app.findRecordById('users', approverId)
        approverEmail = (approverUser.getString('email') || '').trim()
      } catch (_) {}
    }

    if (!approverEmail && approverName) {
      try {
        var matched = $app.findRecordsByFilter(
          'users',
          "name ~ '" + approverName.replace(/'/g, "''") + "'",
          '-created',
          1,
          0,
        )
        if (matched && matched.length > 0) {
          approverUser = matched[0]
          approverEmail = (approverUser.getString('email') || '').trim()
        }
      } catch (_) {}
    }

    if (!approverEmail && approverName.indexOf('@') > 0) {
      approverEmail = approverName
    }

    if (!approverEmail) {
      try {
        var managers = $app.findRecordsByFilter(
          'users',
          "(role = 'Gerente' || role = 'Supervisor' || role = 'Master') && approval_status = 'Aprovado'",
          '-created',
          1,
          0,
        )
        if (managers && managers.length > 0) {
          approverUser = managers[0]
          approverEmail = (approverUser.getString('email') || '').trim()
        }
      } catch (_) {}
    }

    if (!approverEmail) {
      $app.logger().warn('Hook create: aprovador sem e-mail válido para waiver ' + waiverId)
      return
    }

    var requesterName = 'Consultor'
    var requesterId = waiver.getString('requester')
    if (requesterId) {
      try {
        var reqUser = $app.findRecordById('users', requesterId)
        requesterName = reqUser.getString('name') || requesterName
      } catch (_) {}
    }

    var tokensCol = $app.findCollectionByNameOrId('waiver_decision_tokens')
    var now = new Date()
    var expiresAt = new Date(now.getTime() + 7 * 24 * 60 * 60 * 1000).toISOString()

    var actions = ['approve', 'reject', 'standby']
    var tokenMap = {}

    for (var i = 0; i < actions.length; i++) {
      var act = actions[i]
      var tok = $security.randomString(36)
      var tokenRec = new Record(tokensCol)
      tokenRec.set('waiver_request', waiver.id)
      tokenRec.set('token', tok)
      tokenRec.set('action', act)
      tokenRec.set('approver_email', approverEmail)
      if (approverUser) {
        tokenRec.set('approver_user', approverUser.id)
      }
      tokenRec.set('used', false)
      tokenRec.set('expires_at', expiresAt)
      $app.save(tokenRec)
      tokenMap[act] = tok
    }

    var baseUrl =
      $os.getenv('APP_URL') ||
      $os.getenv('FRONTEND_URL') ||
      'https://sistema-de-registros-de-atendimento-b6923.shrd03.internal.goskip.dev'
    baseUrl = baseUrl.replace(/\/+$/, '')

    var approveUrl =
      baseUrl + '/backend/v1/waivers/decision?token=' + tokenMap.approve + '&action=approve'
    var rejectUrl =
      baseUrl + '/backend/v1/waivers/decision?token=' + tokenMap.reject + '&action=reject'
    var standbyUrl =
      baseUrl + '/backend/v1/waivers/decision?token=' + tokenMap.standby + '&action=standby'

    var airlineName = waiver.getString('airline_name') || 'Companhia Aérea'
    var requestType = waiver.getString('request_type') || 'Waiver / Quebra Tarifária'
    var unit = waiver.getString('unit') || 'Operação'
    var gdsLoc = waiver.getString('gds_locator') || 'Não informado'
    var airLoc = waiver.getString('airline_locator') || ''
    var paxName = waiver.getString('pax_name') || 'Não informado'
    var amount = waiver.getFloat('amount') || 0
    var currency = waiver.getString('currency') || 'BRL'
    var priority = waiver.getString('priority') || 'MÉDIA'

    var reasonText = ''
    try {
      var formData = waiver.get('form_data')
      if (formData) {
        if (typeof formData === 'string') {
          formData = JSON.parse(formData)
        }
        reasonText =
          formData.motivo_solicitacao ||
          formData.motivo ||
          formData.descricao ||
          formData.justificativa ||
          formData.reason ||
          ''
      }
    } catch (_) {}
    if (!reasonText) {
      reasonText = 'Solicitação de waiver e quebra de regras tarifárias registrada no HUB AI.'
    }

    var subject =
      '📋 [Waiver & Favors] Pedido de Aprovação: ' +
      airlineName +
      ' — LOC ' +
      gdsLoc +
      ' (' +
      requesterName +
      ')'

    var htmlContent =
      '<!DOCTYPE html><html><head><meta charset="utf-8"></head>' +
      '<body style="margin:0;padding:24px;background-color:#f8fafc;font-family:-apple-system,BlinkMacSystemFont,\'Segoe UI\',Roboto,Helvetica,Arial,sans-serif;color:#1e293b;">' +
      '<div style="max-width:620px;margin:0 auto;background:#ffffff;border-radius:12px;border:1px solid #e2e8f0;overflow:hidden;box-shadow:0 4px 6px -1px rgba(0,0,0,0.06);">' +
      '  <div style="background:linear-gradient(135deg, #1e1b4b 0%, #312e81 50%, #4338ca 100%);padding:24px 28px;color:#ffffff;">' +
      '    <div style="display:flex;align-items:center;justify-content:space-between;margin-bottom:8px;">' +
      '      <span style="text-transform:uppercase;letter-spacing:1px;font-size:11px;font-weight:700;background:rgba(255,255,255,0.15);padding:4px 8px;border-radius:4px;">HUB AI • Waivers & Favors</span>' +
      '      <span style="font-size:11px;opacity:0.85;">Prioridade: <strong>' +
      priority +
      '</strong></span>' +
      '    </div>' +
      '    <h2 style="margin:6px 0 0;font-size:20px;font-weight:800;color:#ffffff;">Nova Solicitação de Aprovação</h2>' +
      '    <p style="margin:6px 0 0;font-size:13px;opacity:0.9;">Companhia: <strong>' +
      airlineName +
      '</strong> • Unidade: <strong>' +
      unit +
      '</strong></p>' +
      '  </div>' +
      '  <div style="padding:24px 28px;">' +
      '    <p style="font-size:14px;color:#475569;margin-top:0;line-height:1.5;">' +
      '      Olá, <strong>' +
      (approverUser ? approverUser.getString('name') : 'Aprovador') +
      '</strong>!<br>' +
      '      Uma nova solicitação foi registrada no <strong>HUB AI</strong> e aguarda a sua análise e decisão.' +
      '    </p>' +
      '    <div style="background:#f8fafc;border:1px solid #e2e8f0;border-radius:8px;padding:16px;margin:18px 0;font-size:13px;">' +
      '      <div style="display:grid;grid-template-columns:1fr 1fr;gap:10px;">' +
      '        <div><span style="color:#64748b;font-size:11px;text-transform:uppercase;font-weight:600;display:block;">Companhia Aérea</span><strong style="color:#0f172a;font-size:13px;">' +
      airlineName +
      '</strong></div>' +
      '        <div><span style="color:#64748b;font-size:11px;text-transform:uppercase;font-weight:600;display:block;">Tipo de Pedido</span><strong style="color:#0f172a;font-size:13px;">' +
      requestType +
      '</strong></div>' +
      '        <div><span style="color:#64748b;font-size:11px;text-transform:uppercase;font-weight:600;display:block;">Solicitante</span><strong style="color:#0f172a;font-size:13px;">' +
      requesterName +
      '</strong></div>' +
      '        <div><span style="color:#64748b;font-size:11px;text-transform:uppercase;font-weight:600;display:block;">Unidade / Núcleo</span><strong style="color:#0f172a;font-size:13px;">' +
      unit +
      '</strong></div>' +
      '        <div><span style="color:#64748b;font-size:11px;text-transform:uppercase;font-weight:600;display:block;">Localizador GDS</span><span style="font-family:monospace;font-weight:700;color:#4338ca;font-size:13px;">' +
      gdsLoc +
      (airLoc ? ' (Cia: ' + airLoc + ')' : '') +
      '</span></div>' +
      '        <div><span style="color:#64748b;font-size:11px;text-transform:uppercase;font-weight:600;display:block;">PAX / Passageiro</span><strong style="color:#0f172a;font-size:13px;">' +
      paxName +
      '</strong></div>' +
      '      </div>' +
      '      <div style="border-top:1px solid #e2e8f0;margin-top:12px;padding-top:10px;display:flex;justify-content:space-between;align-items:center;">' +
      '        <span style="color:#64748b;font-size:12px;font-weight:600;">Valor da Solicitação:</span>' +
      '        <span style="font-size:16px;font-weight:800;font-family:monospace;color:#0f172a;">' +
      (amount > 0 ? amount.toFixed(2) + ' ' + currency : 'Sem valor financeiro informado') +
      '</span>' +
      '      </div>' +
      '      <div style="margin-top:10px;padding-top:10px;border-top:1px dashed #e2e8f0;">' +
      '        <span style="color:#64748b;font-size:11px;text-transform:uppercase;font-weight:600;display:block;margin-bottom:4px;">Motivo / Justificativa:</span>' +
      '        <p style="margin:0;font-size:12.5px;color:#334155;line-height:1.4;background:#ffffff;padding:8px 10px;border-radius:4px;border:1px solid #e2e8f0;">' +
      reasonText +
      '</p>' +
      '      </div>' +
      '    </div>' +
      '    <div style="margin:26px 0 20px;text-align:center;">' +
      '      <p style="font-size:13px;font-weight:700;color:#0f172a;margin-bottom:14px;text-transform:uppercase;letter-spacing:0.5px;">Clique abaixo para decidir diretamente pelo e-mail:</p>' +
      '      <div style="display:inline-flex;gap:10px;flex-wrap:wrap;justify-content:center;">' +
      '        <a href="' +
      approveUrl +
      '" style="display:inline-block;background-color:#16a34a;color:#ffffff;text-decoration:none;font-weight:700;font-size:13px;padding:12px 22px;border-radius:6px;box-shadow:0 2px 4px rgba(22,163,74,0.3);margin:4px;">' +
      '          ✓ Aprovar' +
      '        </a>' +
      '        <a href="' +
      standbyUrl +
      '" style="display:inline-block;background-color:#d97706;color:#ffffff;text-decoration:none;font-weight:700;font-size:13px;padding:12px 22px;border-radius:6px;box-shadow:0 2px 4px rgba(217,119,6,0.3);margin:4px;">' +
      '          ⏸ Standby' +
      '        </a>' +
      '        <a href="' +
      rejectUrl +
      '" style="display:inline-block;background-color:#dc2626;color:#ffffff;text-decoration:none;font-weight:700;font-size:13px;padding:12px 22px;border-radius:6px;box-shadow:0 2px 4px rgba(220,38,38,0.3);margin:4px;">' +
      '          ✕ Rejeitar' +
      '        </a>' +
      '      </div>' +
      '      <p style="font-size:11px;color:#94a3b8;margin-top:12px;">Link com token de uso único, válido por 7 dias. Não compartilhe este e-mail.</p>' +
      '    </div>' +
      '    <div style="border-top:1px solid #e2e8f0;padding-top:16px;margin-top:24px;text-align:center;font-size:11px;color:#94a3b8;">' +
      '      HUB AI — Gestão de Atendimento &amp; Operação' +
      '    </div>' +
      '  </div>' +
      '</div></body></html>'

    var senderAddress = 'noreply@rexturadvance.com.br'
    var senderName = 'HUB AI'
    try {
      var appSettings = $app.settings()
      if (appSettings && appSettings.meta && appSettings.meta.senderAddress) {
        senderAddress = appSettings.meta.senderAddress
        senderName = appSettings.meta.senderName || senderName
      }
    } catch (_) {}

    var mail = new MailerMessage({
      from: { address: senderAddress, name: senderName },
      to: [
        {
          address: approverEmail,
          name: approverUser ? approverUser.getString('name') : 'Aprovador',
        },
      ],
      subject: subject,
      html: htmlContent,
    })

    $app.newMailClient().send(mail)
    $app
      .logger()
      .info('E-mail pós-criação enviado para: ' + approverEmail + ' (waiver ' + waiverId + ')')
  } catch (err) {
    $app.logger().error('Falha no envio automático pós-criação de waiver: ' + String(err))
  }
}, 'waiver_requests')

// 3. Endpoint público para decisão via clique no link do e-mail
routerAdd('GET', '/backend/v1/waivers/decision', (e) => {
  var token = (e.requestInfo().query['token'] || '').trim()
  var action = (e.requestInfo().query['action'] || '').trim().toLowerCase()

  function renderPage(title, headline, message, badgeText, badgeColor, actionInfo) {
    var html =
      '<!DOCTYPE html><html lang="pt-BR"><head><meta charset="utf-8">' +
      '<meta name="viewport" content="width=device-width, initial-scale=1">' +
      '<title>' +
      title +
      ' — HUB AI</title>' +
      '<style>' +
      'body{margin:0;padding:24px;background:#f8fafc;font-family:-apple-system,BlinkMacSystemFont,"Segoe UI",Roboto,sans-serif;color:#1e293b;display:flex;align-items:center;justify-content:center;min-height:90vh;}' +
      '.card{background:#ffffff;border:1px solid #e2e8f0;border-radius:16px;max-width:540px;width:100%;padding:32px;box-shadow:0 10px 15px -3px rgba(0,0,0,0.06);text-align:center;}' +
      '.badge{display:inline-block;padding:6px 14px;border-radius:9999px;font-size:12px;font-weight:700;margin-bottom:16px;text-transform:uppercase;letter-spacing:0.5px;background:' +
      badgeColor.bg +
      ';color:' +
      badgeColor.text +
      ';border:1px solid ' +
      badgeColor.border +
      ';}' +
      'h1{font-size:22px;font-weight:800;margin:0 0 10px 0;color:#0f172a;}' +
      'p{font-size:14px;color:#475569;line-height:1.6;margin:0 0 20px 0;}' +
      '.info-box{background:#f8fafc;border:1px solid #e2e8f0;border-radius:8px;padding:14px;margin:20px 0;text-align:left;font-size:13px;}' +
      '.footer{font-size:11px;color:#94a3b8;border-top:1px solid #f1f5f9;padding-top:16px;margin-top:24px;}' +
      '</style></head><body>' +
      '<div class="card">' +
      '<div class="badge">' +
      badgeText +
      '</div>' +
      '<h1>' +
      headline +
      '</h1>' +
      '<p>' +
      message +
      '</p>' +
      (actionInfo ? '<div class="info-box">' + actionInfo + '</div>' : '') +
      '<div class="footer">HUB AI — Gestão de Atendimento &amp; Operação</div>' +
      '</div></body></html>'
    return e.html(200, html)
  }

  if (!token) {
    return renderPage(
      'Token Não Informado',
      'Link Incompleto',
      'O link acessado não possui o token de segurança obrigatório. Por favor, verifique o e-mail recebido.',
      'Erro',
      { bg: '#fee2e2', text: '#991b1b', border: '#fca5a5' },
      null,
    )
  }

  var tokenRec = null
  try {
    tokenRec = $app.findFirstRecordByData('waiver_decision_tokens', 'token', token)
  } catch (_) {}

  if (!tokenRec) {
    return renderPage(
      'Token Inválido',
      'Token de Decisão Não Encontrado',
      'Este link não foi reconhecido pelo sistema ou pode ter sido removido.',
      'Inválido',
      { bg: '#fee2e2', text: '#991b1b', border: '#fca5a5' },
      null,
    )
  }

  var waiverId = tokenRec.getString('waiver_request')
  var waiverRec = null
  try {
    waiverRec = $app.findRecordById('waiver_requests', waiverId)
  } catch (_) {}

  if (!waiverRec) {
    return renderPage(
      'Solicitação Não Encontrada',
      'Solicitação Inexistente',
      'A solicitação de waiver associada a este link não foi localizada.',
      'Erro',
      { bg: '#fee2e2', text: '#991b1b', border: '#fca5a5' },
      null,
    )
  }

  var currentStatus = waiverRec.getString('status')
  var isUsed = tokenRec.getBool('used')

  if (isUsed || currentStatus === 'Aprovada' || currentStatus === 'Recusada') {
    var prevActionDesc =
      currentStatus === 'Aprovada'
        ? 'Esta solicitação já foi APROVADA anteriormente.'
        : currentStatus === 'Recusada'
          ? 'Esta solicitação já foi RECUSADA anteriormente.'
          : 'A sua decisão já havia sido registrada com este link anteriormente.'

    return renderPage(
      'Decisão Já Registrada',
      'Decisão Já Registrada',
      prevActionDesc + ' Nenhuma nova ação foi necessária.',
      'Concluído',
      { bg: '#f1f5f9', text: '#334155', border: '#cbd5e1' },
      '<div><strong>Solicitação:</strong> ' +
        waiverRec.getString('airline_name') +
        ' (LOC ' +
        (waiverRec.getString('gds_locator') || '—') +
        ')</div><div><strong>Status Atual:</strong> ' +
        currentStatus +
        '</div>',
    )
  }

  // Expiração 7 dias
  var expiresAtStr = tokenRec.getString('expires_at')
  if (expiresAtStr) {
    var expDate = new Date(expiresAtStr)
    if (expDate.getTime() < new Date().getTime()) {
      return renderPage(
        'Token Expirado',
        'Link Expirado',
        'Este link de aprovação expirou após 7 dias de validade. Acesse o painel do HUB AI para analisar a solicitação.',
        'Expirado',
        { bg: '#fef3c7', text: '#92400e', border: '#fcd34d' },
        null,
      )
    }
  }

  var tokenAction = (tokenRec.getString('action') || action).toLowerCase()
  var newStatus = 'Em análise'
  var actionLabel = ''
  var badgeStyle = { bg: '#dbeafe', text: '#1e40af', border: '#93c5fd' }

  if (tokenAction === 'approve' || tokenAction === 'aprovada') {
    newStatus = 'Aprovada'
    actionLabel = 'Aprovação Direta via E-mail'
    badgeStyle = { bg: '#dcfce7', text: '#166534', border: '#86efac' }
  } else if (tokenAction === 'reject' || tokenAction === 'recusada') {
    newStatus = 'Recusada'
    actionLabel = 'Recusa Direta via E-mail'
    badgeStyle = { bg: '#fee2e2', text: '#991b1b', border: '#fca5a5' }
  } else if (tokenAction === 'standby') {
    newStatus = 'Standby'
    actionLabel = 'Colocado em Standby via E-mail'
    badgeStyle = { bg: '#fef3c7', text: '#92400e', border: '#fcd34d' }
  } else {
    return renderPage(
      'Ação Inválida',
      'Ação Desconhecida',
      'A ação solicitada pelo link não é reconhecida.',
      'Erro',
      { bg: '#fee2e2', text: '#991b1b', border: '#fca5a5' },
      null,
    )
  }

  var nowIso = new Date().toISOString()
  var approverUserId = tokenRec.getString('approver_user') || waiverRec.getString('approver_id')

  // 1. Atualiza waiver_request
  var oldStatus = waiverRec.getString('status')
  waiverRec.set('status', newStatus)
  if (approverUserId) {
    waiverRec.set('reviewed_by', approverUserId)
  }
  waiverRec.set('reviewed_at', nowIso)
  waiverRec.set('review_notes', 'Decisão registrada diretamente através do e-mail do aprovador.')
  $app.save(waiverRec)

  // 2. Se Aprovada, consome verba comercial
  var budgetResult = { consumed: false, message: '' }
  if (newStatus === 'Aprovada') {
    var amount = waiverRec.getFloat('amount') || 0
    if (amount > 0) {
      var airlineKey = waiverRec.getString('airline_key') || ''
      var unit = waiverRec.getString('unit') || ''
      var currency = waiverRec.getString('currency') || ''

      try {
        var filter = "status = 'Ativo' && airline_key = '" + airlineKey.replace(/'/g, "''") + "'"
        if (currency) {
          filter += " && currency = '" + currency.replace(/'/g, "''") + "'"
        }

        var budgets = $app.findRecordsByFilter('waiver_budgets', filter, '-created', 100, 0)
        if (budgets && budgets.length > 0) {
          var selectedBudget = null
          if (unit) {
            for (var b = 0; b < budgets.length; b++) {
              var bUnit = (budgets[b].getString('unit') || '').toLowerCase().trim()
              if (bUnit && bUnit === unit.toLowerCase().trim()) {
                selectedBudget = budgets[b]
                break
              }
            }
          }
          if (!selectedBudget) {
            for (var g = 0; g < budgets.length; g++) {
              var gu = (budgets[g].getString('unit') || '').trim()
              if (!gu) {
                selectedBudget = budgets[g]
                break
              }
            }
          }
          if (!selectedBudget) {
            selectedBudget = budgets[0]
          }

          var currentUsed = selectedBudget.getFloat('used_amount') || 0
          var budgetTotal = selectedBudget.getFloat('budget_amount') || 0
          var newUsed = currentUsed + amount
          var remaining = budgetTotal - newUsed

          selectedBudget.set('used_amount', newUsed)
          $app.save(selectedBudget)

          budgetResult = {
            consumed: true,
            budgetId: selectedBudget.id,
            category: selectedBudget.getString('category'),
            remainingBalance: remaining,
            message:
              'Debitado ' +
              amount +
              ' ' +
              (selectedBudget.getString('currency') || '') +
              ' da verba "' +
              (selectedBudget.getString('category') || 'Comercial') +
              '" (' +
              (selectedBudget.getString('period_label') || 'Período') +
              '). Saldo disponível restante: ' +
              remaining.toFixed(2) +
              ' ' +
              (selectedBudget.getString('currency') || '') +
              '.',
          }
        } else {
          budgetResult = {
            consumed: false,
            message:
              'Aprovada sem verba vinculada (não há verba ativa configurada para esta companhia/moeda).',
          }
        }
      } catch (bErr) {
        $app.logger().error('Erro ao debitar verba no hook de decisão: ' + String(bErr))
        budgetResult = {
          consumed: false,
          message: 'Falha técnica ao processar débito de verba: ' + String(bErr),
        }
      }
    } else {
      budgetResult = {
        consumed: false,
        message: 'Valor zero ou não informado, nenhum débito efetuado.',
      }
    }
  }

  // 3. Registra em waiver_history
  try {
    var historyCol = $app.findCollectionByNameOrId('waiver_history')
    var hist = new Record(historyCol)
    hist.set('waiver_request', waiverRec.id)
    hist.set('action', actionLabel)
    hist.set('previous_status', oldStatus)
    hist.set('new_status', newStatus)
    if (approverUserId) {
      hist.set('user', approverUserId)
    }
    var notesText = 'Decisão via link seguro de e-mail (' + newStatus + ').'
    if (budgetResult.message) {
      notesText += ' ' + budgetResult.message
    }
    hist.set('notes', notesText)
    hist.set('details', {
      action: tokenAction,
      via: 'email_link',
      budget_consumption: budgetResult,
    })
    $app.save(hist)
  } catch (hErr) {
    $app.logger().error('Erro ao salvar waiver_history via decisão de e-mail: ' + String(hErr))
  }

  // 4. Marca o token como usado
  tokenRec.set('used', true)
  tokenRec.set('used_at', nowIso)
  $app.save(tokenRec)

  // Invalida outros tokens desta mesma requisição
  try {
    var sisterTokens = $app.findRecordsByFilter(
      'waiver_decision_tokens',
      "waiver_request = '" + waiverRec.id + "' && used != true",
      '',
      10,
      0,
    )
    for (var s = 0; s < sisterTokens.length; s++) {
      sisterTokens[s].set('used', true)
      sisterTokens[s].set('used_at', nowIso)
      $app.save(sisterTokens[s])
    }
  } catch (_) {}

  // 5. Notificar o consultor solicitante (sino + e-mail de confirmação visual HUB AI)
  var requesterId = waiverRec.getString('requester')
  if (requesterId) {
    try {
      var requesterUser = $app.findRecordById('users', requesterId)
      var requesterEmail = (requesterUser.getString('email') || '').trim()
      var requesterName = requesterUser.getString('name') || 'Consultor'

      var notifTitle =
        newStatus === 'Aprovada'
          ? 'Waiver Aprovada: ' + waiverRec.getString('airline_name')
          : newStatus === 'Recusada'
            ? 'Waiver Recusada: ' + waiverRec.getString('airline_name')
            : 'Waiver em Standby: ' + waiverRec.getString('airline_name')

      var locInfo = waiverRec.getString('gds_locator')
        ? ' (LOC ' + waiverRec.getString('gds_locator') + ')'
        : ''

      var notifMessage =
        'Sua solicitação de waiver para ' +
        waiverRec.getString('airline_name') +
        locInfo +
        ' foi atualizada para "' +
        newStatus +
        '" pelo aprovador via e-mail.'

      // Sino
      try {
        var notifCol = $app.findCollectionByNameOrId('notifications')
        var notif = new Record(notifCol)
        notif.set('user_id', requesterId)
        notif.set('title', notifTitle)
        notif.set('message', notifMessage)
        notif.set(
          'type',
          newStatus === 'Aprovada' ? 'success' : newStatus === 'Recusada' ? 'error' : 'info',
        )
        notif.set('read', false)
        notif.set('link', '/waivers')
        $app.save(notif)
      } catch (_) {}

      // E-mail de confirmação ao solicitante
      if (requesterEmail && requesterEmail.indexOf('@') > 0) {
        try {
          var senderAddress = 'noreply@rexturadvance.com.br'
          var senderName = 'HUB AI'
          try {
            var appSettings = $app.settings()
            if (appSettings && appSettings.meta && appSettings.meta.senderAddress) {
              senderAddress = appSettings.meta.senderAddress
              senderName = appSettings.meta.senderName || senderName
            }
          } catch (_) {}

          var statusColor =
            newStatus === 'Aprovada' ? '#16a34a' : newStatus === 'Recusada' ? '#dc2626' : '#d97706'

          var baseUrlApp =
            $os.getenv('APP_URL') ||
            $os.getenv('FRONTEND_URL') ||
            'https://sistema-de-registros-de-atendimento-b6923.shrd03.internal.goskip.dev'
          baseUrlApp = baseUrlApp.replace(/\/+$/, '')

          var confHtml =
            '<!DOCTYPE html><html><head><meta charset="utf-8"></head>' +
            '<body style="margin:0;padding:24px;background-color:#f8fafc;font-family:-apple-system,BlinkMacSystemFont,\'Segoe UI\',Roboto,sans-serif;color:#1e293b;">' +
            '<div style="max-width:580px;margin:0 auto;background:#ffffff;border-radius:12px;border:1px solid #e2e8f0;overflow:hidden;">' +
            '  <div style="background:' +
            statusColor +
            ';padding:20px 24px;color:#ffffff;">' +
            '    <h2 style="margin:0;font-size:18px;font-weight:700;">' +
            notifTitle +
            '</h2>' +
            '    <p style="margin:4px 0 0;font-size:12px;opacity:0.9;">Decisão registrada pelo Aprovador</p>' +
            '  </div>' +
            '  <div style="padding:24px;">' +
            '    <p style="font-size:14px;margin-top:0;color:#334155;">Olá, <strong>' +
            requesterName +
            '</strong>!</p>' +
            '    <p style="font-size:14px;color:#475569;line-height:1.5;">' +
            notifMessage +
            '</p>' +
            '    <div style="background:#f8fafc;border:1px solid #e2e8f0;border-radius:8px;padding:14px;margin:16px 0;font-size:13px;">' +
            '      <div><strong>Companhia:</strong> ' +
            waiverRec.getString('airline_name') +
            '</div>' +
            '      <div><strong>Localizador:</strong> ' +
            (waiverRec.getString('gds_locator') || 'Não informado') +
            '</div>' +
            '      <div><strong>Status Atual:</strong> <span style="font-weight:700;color:' +
            statusColor +
            ';">' +
            newStatus +
            '</span></div>' +
            (budgetResult.message
              ? '<div style="margin-top:8px;font-size:12px;color:#047857;">' +
                budgetResult.message +
                '</div>'
              : '') +
            '    </div>' +
            '    <div style="text-align:center;margin-top:24px;">' +
            '      <a href="' +
            baseUrlApp +
            '/waivers" style="background:#4338ca;color:#ffffff;text-decoration:none;padding:10px 20px;border-radius:6px;font-size:13px;font-weight:600;display:inline-block;">Ver Detalhes no HUB AI</a>' +
            '    </div>' +
            '    <div style="border-top:1px solid #e2e8f0;padding-top:16px;margin-top:24px;text-align:center;font-size:11px;color:#94a3b8;">' +
            '      HUB AI — Gestão de Atendimento &amp; Operação' +
            '    </div>' +
            '  </div>' +
            '</div></body></html>'

          var confMail = new MailerMessage({
            from: { address: senderAddress, name: senderName },
            to: [{ address: requesterEmail, name: requesterName }],
            subject: notifTitle,
            html: confHtml,
          })
          $app.newMailClient().send(confMail)
        } catch (mErr) {
          $app.logger().error('Erro ao enviar e-mail de confirmação ao consultor: ' + String(mErr))
        }
      }
    } catch (reqErr) {
      $app.logger().error('Erro ao notificar solicitante: ' + String(reqErr))
    }
  }

  var detailsHtml =
    '<div><strong>Companhia Aérea:</strong> ' +
    waiverRec.getString('airline_name') +
    '</div>' +
    '<div><strong>Localizador:</strong> ' +
    (waiverRec.getString('gds_locator') || 'Não informado') +
    '</div>' +
    '<div><strong>Decisão Aplicada:</strong> ' +
    newStatus +
    '</div>' +
    (budgetResult.message
      ? '<div style="margin-top:6px;color:#047857;font-size:12px;">' +
        budgetResult.message +
        '</div>'
      : '')

  return renderPage(
    'Decisão Confirmada',
    'Decisão Registrada com Sucesso!',
    'Sua decisão de <strong>' +
      newStatus.toUpperCase() +
      '</strong> foi processada com sucesso no HUB AI. O solicitante foi notificado.',
    newStatus,
    badgeStyle,
    detailsHtml,
  )
})
