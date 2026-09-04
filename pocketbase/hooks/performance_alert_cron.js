// Cron job diário às 8h da manhã
// Dispara alertas no sino (coleção notifications) e e-mails para:
// 1. Alertas críticos de desempenho (menos de 50% da meta de atendimentos ou resolução > 20 p.p. abaixo do mínimo)
// 2. Alertas de Ação Automáticos: Projeção de fim de mês cai abaixo de 70% da meta de atendimentos
//    - Para cada consultor elegível com projeção < 70%, notifica o próprio consultor e seu líder/supervisor
//    - Respeita apuração: consultores têm meta individual; lideranças não recebem alerta de meta individual (elas não atendem)
//    - Envia notificação no sino + e-mail crítico respeitando email_notifications !== false
//    - Dedup diário por link/data para não reenviar repetidamente no mesmo dia

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

    var usersById = {}
    for (var u0 = 0; u0 < users.length; u0++) {
      usersById[users[u0].id] = users[u0]
    }

    // 4. Calcular período do mês corrente (GMT-3)
    var now = new Date()
    var gmt3Ms = now.getTime() - 3 * 3600 * 1000
    var gmt3Date = new Date(gmt3Ms)
    var currentYear = gmt3Date.getUTCFullYear()
    var currentMonth = gmt3Date.getUTCMonth() + 1 // 1..12
    var currentDay = gmt3Date.getUTCDate()
    var daysInMonth = new Date(Date.UTC(currentYear, currentMonth, 0)).getUTCDate()
    var todayIso = gmt3Date.toISOString().substring(0, 10)

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

    var leadershipRoles = [
      'Supervisor',
      'Líder',
      'Gerente',
      'Gestor Comercial',
      'Supervisores',
      'Líderes',
      'Gerentes',
    ]
    function isLeaderRole(role) {
      if (!role) return false
      for (var lIdx = 0; lIdx < leadershipRoles.length; lIdx++) {
        if (leadershipRoles[lIdx] === role) return true
      }
      return false
    }

    function getTeamUserIds(leader) {
      var leaderId = leader.id
      var leaderRole = leader.getString('role') || ''
      var isLdr = isLeaderRole(leaderRole)
      if (!isLdr) return [leaderId]

      var lGroups = leader.get('service_groups') || []
      var memberIds = {}
      memberIds[leaderId] = true

      for (var j = 0; j < users.length; j++) {
        var otherUser = users[j]
        var otherId = otherUser.id
        var otherRole = otherUser.getString('role') || ''

        var supId = otherUser.getString('supervisor_id')
        if (supId && supId === leaderId) {
          memberIds[otherId] = true
          continue
        }

        if (lGroups && lGroups.length > 0) {
          var oGroups = otherUser.get('service_groups') || []
          var hasCommonGroup = false
          for (var g1 = 0; g1 < lGroups.length; g1++) {
            for (var g2 = 0; g2 < oGroups.length; g2++) {
              if (lGroups[g1] === oGroups[g2]) {
                hasCommonGroup = true
                break
              }
            }
            if (hasCommonGroup) break
          }
          if (hasCommonGroup) {
            memberIds[otherId] = true
          }
        } else {
          if (otherRole === 'Consultor' || otherRole === 'Consultores') {
            memberIds[otherId] = true
          }
        }
      }

      var resultList = []
      for (var k in memberIds) {
        if (memberIds.hasOwnProperty(k)) {
          resultList.push(k)
        }
      }
      return resultList
    }

    // Helper para achar líderes/supervisores de um consultor
    function getSupervisorsForConsultant(consultantUser) {
      var matched = []
      if (!consultantUser) return matched
      var directSup = consultantUser.getString('supervisor_id')
      if (directSup && usersById[directSup]) {
        matched.push(usersById[directSup])
      }

      var cGroups = consultantUser.get('service_groups') || []
      for (var u = 0; u < users.length; u++) {
        var cand = users[u]
        if (cand.id === consultantUser.id) continue
        var candRole = cand.getString('role') || ''
        if (
          candRole === 'Supervisor' ||
          candRole === 'Supervisores' ||
          candRole === 'Líder' ||
          candRole === 'Líderes'
        ) {
          if (directSup && cand.id === directSup) continue
          var candGroups = cand.get('service_groups') || []
          if (!candGroups || candGroups.length === 0) {
            matched.push(cand)
            continue
          }
          var hasCommon = false
          for (var gA = 0; gA < cGroups.length; gA++) {
            for (var gB = 0; gB < candGroups.length; gB++) {
              if (cGroups[gA] === candGroups[gB]) {
                hasCommon = true
                break
              }
            }
            if (hasCommon) break
          }
          if (hasCommon) {
            matched.push(cand)
          }
        }
      }
      return matched
    }

    var notifCol = $app.findCollectionByNameOrId('notifications')

    // 5. Alertas de Ação: Projeção de Meta < 70%
    // Apenas para consultores elegíveis (não líderes)
    // Fórmula: dailyPace = total / currentDay, projectedTotal = dailyPace * daysInMonth
    // projectedPct = Math.round((projectedTotal / effAttendance) * 100)
    // Gatilho: projectedPct < 70
    var projectionAlerts = []
    for (var uIdx = 0; uIdx < users.length; uIdx++) {
      var usr = users[uIdx]
      var userId = usr.id
      var userName = usr.getString('name') || 'Consultor'
      var userRole = usr.getString('role') || ''
      var isLdr = isLeaderRole(userRole)

      // Somente consultores individuais têm apuração de meta individual
      if (isLdr) continue
      if (userRole !== 'Consultor' && userRole !== 'Consultores') continue

      var effAttendance = targetsByUser[userId]
        ? targetsByUser[userId].attendanceTarget
        : globalMonthlyTarget
      if (!effAttendance || effAttendance <= 0) effAttendance = 100

      var userStat = statsByUser[userId] || { total: 0, resolved: 0 }
      var currentTotal = userStat.total
      var dailyPace = currentDay > 0 ? currentTotal / currentDay : 0
      var projectedTotal = Math.round(dailyPace * daysInMonth)
      var projectedPct = Math.round((projectedTotal / effAttendance) * 100)

      if (projectedPct < 70) {
        projectionAlerts.push({
          user: usr,
          userId: userId,
          userName: userName,
          effAttendance: effAttendance,
          currentTotal: currentTotal,
          projectedTotal: projectedTotal,
          projectedPct: projectedPct,
        })
      }
    }

    // Processar entrega de cada alerta de projeção < 70%
    var senderAddress = 'noreply@rexturadvance.com.br'
    var senderName = 'Sistema de Registros de Atendimento'
    try {
      if ($app.settings() && $app.settings().meta && $app.settings().meta.senderAddress) {
        senderAddress = $app.settings().meta.senderAddress
        senderName = $app.settings().meta.senderName || senderName
      }
    } catch (e) {}

    for (var paIdx = 0; paIdx < projectionAlerts.length; paIdx++) {
      var pa = projectionAlerts[paIdx]
      var pLink = '/metas-desempenho?userId=' + pa.userId + '&date=' + todayIso
      var pTitle = '📉 Meta em Risco: Projeção de ' + pa.projectedPct + '%'
      var pMessage =
        pa.userName +
        ' está com projeção de ' +
        pa.projectedPct +
        '% da meta (' +
        pa.projectedTotal +
        ' de ' +
        pa.effAttendance +
        ' atendimentos estimados até o fim do mês).'

      var targetRecipients = [pa.user]
      var sups = getSupervisorsForConsultant(pa.user)
      for (var spIdx = 0; spIdx < sups.length; spIdx++) {
        targetRecipients.push(sups[spIdx])
      }

      for (var trIdx = 0; trIdx < targetRecipients.length; trIdx++) {
        var recUser = targetRecipients[trIdx]
        if (!recUser) continue

        // 1. Sino (dedup por link de hoje)
        try {
          var existingPNotifs = $app.findRecordsByFilter(
            'notifications',
            "user_id = '" + recUser.id + "' && link = '" + pLink + "'",
            '-created',
            1,
            0,
          )
          if (existingPNotifs.length === 0) {
            var pNotif = new Record(notifCol)
            pNotif.set('user_id', recUser.id)
            pNotif.set('title', pTitle)
            pNotif.set('message', pMessage)
            pNotif.set('type', 'alert')
            pNotif.set('read', false)
            pNotif.set('link', pLink)
            $app.save(pNotif)
          }
        } catch (pnErr) {
          $app
            .logger()
            .error('Erro ao salvar notificação de meta em risco:', 'error', String(pnErr))
        }

        // 2. E-mail (respeita email_notifications !== false)
        var recEmail = recUser.getString('email')
        var recNotifEnabled = recUser.get('email_notifications')
        if (recNotifEnabled !== false && recEmail && recEmail.indexOf('@') > 0) {
          try {
            var pHtml =
              '<!DOCTYPE html><html><head><meta charset="utf-8"></head>' +
              '<body style="font-family: -apple-system, BlinkMacSystemFont, Segoe UI, Roboto, Helvetica, Arial, sans-serif; background-color: #f8fafc; margin: 0; padding: 24px; color: #334155;">' +
              '<div style="max-width: 600px; margin: 0 auto; background: #ffffff; border-radius: 8px; border: 1px solid #e2e8f0; overflow: hidden;">' +
              '<div style="background-color: #e11d48; padding: 18px 24px; color: #ffffff;">' +
              '<h1 style="margin: 0; font-size: 18px; font-weight: 700;">📉 Alerta de Ação: Meta em Risco (&lt; 70%)</h1>' +
              '</div>' +
              '<div style="padding: 24px;">' +
              '<p style="margin: 0 0 14px; font-size: 14px;">Olá ' +
              recUser.getString('name') +
              ',</p>' +
              '<p style="margin: 0 0 18px; font-size: 14px; line-height: 1.5;">O ritmo atual de atendimentos aponta que a meta mensal está abaixo do patamar de segurança de 70%:</p>' +
              '<div style="background-color: #fff1f2; border: 1px solid #fecdd3; border-radius: 6px; padding: 14px; margin-bottom: 20px;">' +
              '<p style="margin: 0 0 6px; font-size: 13px;"><strong>Consultor:</strong> ' +
              pa.userName +
              '</p>' +
              '<p style="margin: 0 0 6px; font-size: 13px;"><strong>Volume Atual:</strong> ' +
              pa.currentTotal +
              ' atendimentos (dia ' +
              currentDay +
              ' de ' +
              daysInMonth +
              ')</p>' +
              '<p style="margin: 0 0 6px; font-size: 13px;"><strong>Projeção de Fim de Mês:</strong> <span style="color: #e11d48; font-weight: bold;">~' +
              pa.projectedTotal +
              ' atendimentos (' +
              pa.projectedPct +
              '% da meta)</span></p>' +
              '<p style="margin: 0; font-size: 13px;"><strong>Meta Mensal Esperada:</strong> ' +
              pa.effAttendance +
              ' atendimentos</p>' +
              '</div>' +
              '<div style="text-align: center; margin: 24px 0 12px;">' +
              '<a href="/metas-desempenho" style="background-color: #e11d48; color: #ffffff; text-decoration: none; padding: 10px 20px; border-radius: 6px; font-weight: 600; font-size: 13px; display: inline-block;">Abrir Metas de Desempenho</a>' +
              '</div>' +
              '</div></div></body></html>'

            var pMail = new MailerMessage({
              from: { address: senderAddress, name: senderName },
              to: [{ address: recEmail, name: recUser.getString('name') }],
              subject:
                '[Meta em Risco] Projeção de fim de mês em ' +
                pa.projectedPct +
                '% (' +
                pa.userName +
                ')',
              html: pHtml,
            })
            $app.newMailClient().send(pMail)
          } catch (pmErr) {
            $app.logger().error('Erro ao enviar e-mail de meta em risco:', 'error', String(pmErr))
          }
        }
      }
    }

    // 6. Detectar alertas críticos gerais de desempenho para gestores
    var alerts = []
    for (var uIdx2 = 0; uIdx2 < users.length; uIdx2++) {
      var usr2 = users[uIdx2]
      var userId2 = usr2.id
      var userName2 = usr2.getString('name') || 'Colaborador'
      var userRole2 = usr2.getString('role') || ''
      var isLdr2 = isLeaderRole(userRole2)

      var effAttendance2 = targetsByUser[userId2]
        ? targetsByUser[userId2].attendanceTarget
        : globalMonthlyTarget
      var effResolution2 = targetsByUser[userId2]
        ? targetsByUser[userId2].minResolution
        : globalMinResolution

      var teamIds = getTeamUserIds(usr2)
      var realTotal = 0
      var realResolved = 0

      for (var tIdx = 0; tIdx < teamIds.length; tIdx++) {
        var mId = teamIds[tIdx]
        var mStats = statsByUser[mId]
        if (mStats) {
          realTotal += mStats.total
          realResolved += mStats.resolved
        }
      }

      var realRate = realTotal > 0 ? Math.round((realResolved / realTotal) * 100) : 0
      var teamSuffix = isLdr2 ? ' (Equipe)' : ''

      if (effAttendance2 > 0) {
        var ratio = realTotal / effAttendance2
        if (ratio < 0.5) {
          alerts.push({
            userName: userName2 + (isLdr2 ? ' (Meta da Equipe)' : ''),
            userRole: userRole2,
            metric: 'Atendimentos' + teamSuffix,
            realValue: String(realTotal) + ' atendimentos',
            expectedValue: String(effAttendance2) + ' atendimentos',
            detail: Math.round(ratio * 100) + '% da meta da equipe esperada',
          })
        }
      }

      if (effResolution2 > 0 && realTotal > 0) {
        var diff = effResolution2 - realRate
        if (diff > 20) {
          alerts.push({
            userName: userName2 + (isLdr2 ? ' (Meta da Equipe)' : ''),
            userRole: userRole2,
            metric: 'Taxa de Resolução' + teamSuffix,
            realValue: String(realRate) + '%',
            expectedValue: 'Mínimo ' + String(effResolution2) + '%',
            detail: String(diff) + ' p.p. abaixo do mínimo da equipe',
          })
        }
      }
    }

    if (alerts.length === 0) {
      $app.logger().info('Cron Alertas Críticos: Nenhum colaborador em estado crítico hoje.')
      return
    }

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

    var metasUrl = '/metas-desempenho'

    var htmlContent =
      '<!DOCTYPE html><html><head><meta charset="utf-8"></head>' +
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

    for (var r = 0; r < recipients.length; r++) {
      try {
        var msg = new MailerMessage({
          from: { address: senderAddress, name: senderName },
          to: [{ address: recipients[r].address, name: recipients[r].name }],
          subject: '[Alerta de Desempenho] Colaboradores abaixo da meta esperada',
          html: htmlContent,
        })
        $app.newMailClient().send(msg)
      } catch (sendErr) {
        $app
          .logger()
          .error(
            'Erro ao enviar e-mail de alerta de desempenho',
            'recipient',
            recipients[r].address,
            'error',
            String(sendErr),
          )
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
