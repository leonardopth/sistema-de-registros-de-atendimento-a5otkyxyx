// Cron job diário às 8h da manhã (0 8 * * * ou 0 11 * * * UTC para 8h GMT-3, executado via cronAdd)
// Dispara e-mail para gestores/supervisores/masters com email_notifications ativo
// quando houver alertas críticos de desempenho (menos de 50% da meta de atendimentos ou resolução > 20 p.p. abaixo do mínimo).

cronAdd('performance_critical_alerts_daily', '0 8 * * *', function () {
  try {
    // 1. Buscar metas globais
    var globalTargets = $app.findRecordsByFilter('global_targets', '', '-created', 1, 0)
    var globalMonthlyTarget = 100
    var globalMinResolution = 80
    if (globalTargets.length > 0) {
      var gt = globalTargets[0]
      var gMt = gt.get('monthly_attendance_target')
      var gMr = gt.get('min_resolution_rate')
      if (gMt && gMt > 0) globalMonthlyTarget = gMt
      if (gMr && gMr > 0) globalMinResolution = gMr
    }

    // 2. Buscar metas individuais
    var userTargets = $app.findRecordsByFilter('user_targets', '', '', 0, 0)
    var targetsByUser = {}
    for (var i = 0; i < userTargets.length; i++) {
      var ut = userTargets[i]
      var uId = ut.getString('user')
      if (uId) {
        targetsByUser[uId] = {
          attendanceTarget: ut.get('monthly_attendance_target') || globalMonthlyTarget,
          minResolution: ut.get('min_resolution_rate') || globalMinResolution,
        }
      }
    }

    // 3. Buscar colaboradores internos
    var users = $app.findRecordsByFilter(
      'users',
      "role = 'Consultor' || role = 'Líder' || role = 'Supervisor' || role = 'Gerente' || role = 'Consultores' || role = 'Líderes' || role = 'Supervisores' || role = 'Gerentes'",
      '',
      0,
      0,
    )

    // 4. Calcular período do mês corrente (GMT-3)
    var now = new Date()
    // GMT-3 offset
    var gmt3Ms = now.getTime() - 3 * 3600 * 1000
    var gmt3Date = new Date(gmt3Ms)
    var startOfMonth = new Date(
      Date.UTC(gmt3Date.getUTCFullYear(), gmt3Date.getUTCMonth(), 1, 3, 0, 0),
    )
    var startOfMonthIso = startOfMonth.toISOString().replace('T', ' ').substring(0, 19)

    var monthRecords = $app.findRecordsByFilter(
      'service_records',
      "created >= '" + startOfMonthIso + "'",
      '-created',
      0,
      0,
    )

    // Agrupar estatísticas por colaborador
    var statsByUser = {}
    for (var rIdx = 0; rIdx < monthRecords.length; rIdx++) {
      var rec = monthRecords[rIdx]
      var assigned = rec.getString('assigned_user') || rec.getString('user_id')
      if (!assigned) continue

      if (!statsByUser[assigned]) {
        statsByUser[assigned] = { total: 0, resolved: 0 }
      }
      statsByUser[assigned].total += 1
      if (rec.getString('status') === 'Concluído') {
        statsByUser[assigned].resolved += 1
      }
    }

    // 5. Detectar alertas críticos
    var alerts = []
    for (var uIdx = 0; uIdx < users.length; uIdx++) {
      var usr = users[uIdx]
      var userId = usr.id
      var userName = usr.getString('name') || 'Colaborador'
      var userRole = usr.getString('role') || ''

      var effAttendance = targetsByUser[userId]
        ? targetsByUser[userId].attendanceTarget
        : globalMonthlyTarget
      var effResolution = targetsByUser[userId]
        ? targetsByUser[userId].minResolution
        : globalMinResolution

      var userStats = statsByUser[userId] || { total: 0, resolved: 0 }
      var realTotal = userStats.total
      var realRate = realTotal > 0 ? Math.round((userStats.resolved / realTotal) * 100) : 0

      // Alerta 1: Menos de 50% da meta de atendimentos
      if (effAttendance > 0) {
        var ratio = realTotal / effAttendance
        if (ratio < 0.5) {
          alerts.push({
            userName: userName,
            userRole: userRole,
            metric: 'Atendimentos',
            realValue: String(realTotal) + ' atendimentos',
            expectedValue: String(effAttendance) + ' atendimentos',
            detail: Math.round(ratio * 100) + '% da meta esperada',
          })
        }
      }

      // Alerta 2: Resolução mais de 20 p.p. abaixo do mínimo (apenas se tiver atendimentos)
      if (effResolution > 0 && realTotal > 0) {
        var diff = effResolution - realRate
        if (diff > 20) {
          alerts.push({
            userName: userName,
            userRole: userRole,
            metric: 'Taxa de Resolução',
            realValue: String(realRate) + '%',
            expectedValue: 'Mínimo ' + String(effResolution) + '%',
            detail: String(diff) + ' p.p. abaixo do mínimo',
          })
        }
      }
    }

    // Se não houver alertas críticos, não envia e-mail
    if (alerts.length === 0) {
      $app.logger().info('Cron Alertas Críticos: Nenhum colaborador em estado crítico hoje.')
      return
    }

    // 6. Buscar gestores/supervisores/masters que devem receber os e-mails
    // Regra: papel "Gerente", "Supervisor" ou "Master", com email_notifications !== false (por padrão true/opt-in)
    var managers = $app.findRecordsByFilter(
      'users',
      "(role = 'Gerente' || role = 'Supervisor' || role = 'Master' || role = 'Gerentes' || role = 'Supervisores') && approval_status = 'Aprovado'",
      '',
      0,
      0,
    )

    var recipients = []
    for (var mIdx = 0; mIdx < managers.length; mIdx++) {
      var mgr = managers[mIdx]
      var mgrEmail = mgr.getString('email')
      var emailNotifEnabled = mgr.get('email_notifications')
      // Se email_notifications for explicitamente false, não recebe
      if (emailNotifEnabled === false) continue
      if (mgrEmail && mgrEmail.indexOf('@') > 0) {
        recipients.push({ address: mgrEmail, name: mgr.getString('name') })
      }
    }

    if (recipients.length === 0) {
      $app
        .logger()
        .info(
          'Cron Alertas Críticos: Nenhum gestor configurado para receber notificações por e-mail.',
        )
      return
    }

    // 7. Montar template HTML do e-mail
    var rowsHtml = ''
    for (var aIdx = 0; aIdx < alerts.length; aIdx++) {
      var a = alerts[aIdx]
      rowsHtml +=
        '<tr style="border-bottom: 1px solid #e2e8f0;">' +
        '<td style="padding: 10px 12px; font-weight: bold; color: #1e293b;">' +
        a.userName +
        (a.userRole
          ? ' <span style="font-size:11px;font-weight:normal;color:#64748b;">(' +
            a.userRole +
            ')</span>'
          : '') +
        '</td>' +
        '<td style="padding: 10px 12px; color: #b91c1c; font-weight: bold;">' +
        a.metric +
        '</td>' +
        '<td style="padding: 10px 12px; color: #b91c1c;">' +
        a.realValue +
        '</td>' +
        '<td style="padding: 10px 12px; color: #334155;">' +
        a.expectedValue +
        '</td>' +
        '<td style="padding: 10px 12px; color: #64748b; font-size: 12px;">' +
        a.detail +
        '</td>' +
        '</tr>'
    }

    var appBaseUrl =
      $os.getenv('APP_URL') ||
      'https://sistema-de-registros-de-atendimento-b6923.shrd00.internal.goskip.dev'
    var metasUrl = '/metas-desempenho'

    var htmlContent =
      '<!DOCTYPE html>' +
      '<html><head><meta charset="utf-8"></head>' +
      '<body style="font-family: -apple-system, BlinkMacSystemFont, Segoe UI, Roboto, Helvetica, Arial, sans-serif; background-color: #f8fafc; margin: 0; padding: 24px; color: #334155;">' +
      '<div style="max-width: 650px; margin: 0 auto; background: #ffffff; border-radius: 8px; border: 1px solid #e2e8f0; overflow: hidden; box-shadow: 0 1px 3px rgba(0,0,0,0.05);">' +
      '<div style="background-color: #dc2626; padding: 20px 24px; color: #ffffff;">' +
      '<h1 style="margin: 0; font-size: 18px; font-weight: 700;">⚠️ Alerta Crítico de Desempenho</h1>' +
      '<p style="margin: 6px 0 0; font-size: 13px; opacity: 0.95;">Colaboradores com resultados significativamente abaixo das metas no mês corrente</p>' +
      '</div>' +
      '<div style="padding: 24px;">' +
      '<p style="margin: 0 0 16px; font-size: 14px; line-height: 1.5;">Olá Gestor,</p>' +
      '<p style="margin: 0 0 20px; font-size: 14px; line-height: 1.5;">Identificamos colaboradores que atingiram critérios críticos de desempenho no mês atual (menos de 50% do volume de atendimentos ou resolução mais de 20 p.p. abaixo do mínimo):</p>' +
      '<table style="width: 100%; border-collapse: collapse; font-size: 13px; margin-bottom: 24px;">' +
      '<thead><tr style="background-color: #f1f5f9; text-align: left; border-bottom: 2px solid #cbd5e1;">' +
      '<th style="padding: 10px 12px; color: #475569; font-size: 11px; text-transform: uppercase;">Colaborador</th>' +
      '<th style="padding: 10px 12px; color: #475569; font-size: 11px; text-transform: uppercase;">Métrica</th>' +
      '<th style="padding: 10px 12px; color: #475569; font-size: 11px; text-transform: uppercase;">Real</th>' +
      '<th style="padding: 10px 12px; color: #475569; font-size: 11px; text-transform: uppercase;">Meta</th>' +
      '<th style="padding: 10px 12px; color: #475569; font-size: 11px; text-transform: uppercase;">Desvio</th>' +
      '</tr></thead>' +
      '<tbody>' +
      rowsHtml +
      '</tbody></table>' +
      '<div style="text-align: center; margin: 28px 0 12px;">' +
      '<a href="' +
      metasUrl +
      '" style="background-color: #4f46e5; color: #ffffff; text-decoration: none; padding: 12px 24px; border-radius: 6px; font-weight: 600; font-size: 14px; display: inline-block;">Ver Metas de Desempenho</a>' +
      '</div>' +
      '<p style="font-size: 11px; color: #94a3b8; text-align: center; margin-top: 24px; border-top: 1px solid #f1f5f9; padding-top: 16px;">' +
      'Você pode gerenciar suas preferências de recebimento de e-mails na tela de Metas de Desempenho.' +
      '</p>' +
      '</div></div></body></html>'

    // 8. Disparo do e-mail
    var senderAddress = 'noreply@rexturadvance.com.br'
    var senderName = 'Sistema de Registros de Atendimento'
    try {
      if ($app.settings() && $app.settings().meta && $app.settings().meta.senderAddress) {
        senderAddress = $app.settings().meta.senderAddress
        senderName = $app.settings().meta.senderName || senderName
      }
    } catch (e) {}

    for (var r = 0; r < recipients.length; r++) {
      try {
        var msg = new MailerMessage({
          from: {
            address: senderAddress,
            name: senderName,
          },
          to: [{ address: recipients[r].address, name: recipients[r].name }],
          subject: '[Alerta de Desempenho] Colaboradores abaixo da meta esperada',
          html: htmlContent,
        })
        $app.newMailClient().send(msg)
      } catch (sendErr) {
        // Fallback para $app.mails().send se disponível
        try {
          $app
            .mails()
            .send(
              { address: senderAddress, name: senderName },
              [{ address: recipients[r].address }],
              '[Alerta de Desempenho] Colaboradores abaixo da meta esperada',
              htmlContent,
            )
        } catch (fbErr) {
          $app
            .logger()
            .error(
              'Erro ao enviar e-mail de alerta de desempenho',
              'recipient',
              recipients[r].address,
              'error',
              String(sendErr || fbErr),
            )
        }
      }
    }

    $app
      .logger()
      .info(
        'Cron Alertas Críticos: ' +
          alerts.length +
          ' alerta(s) enviado(s) para ' +
          recipients.length +
          ' gestor(es).',
      )
  } catch (err) {
    $app
      .logger()
      .error('Erro fatal no cron de alertas críticos de desempenho', 'error', String(err))
  }
})
