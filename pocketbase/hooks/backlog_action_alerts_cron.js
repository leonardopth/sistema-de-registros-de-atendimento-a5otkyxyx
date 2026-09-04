// Cron de Alertas de Ação: Backlog Envelhecido na Fila
// Executa a cada 15 minutos: */15 * * * *
// Gatilhos:
// 1. Atendimento em aberto cruza 2h na fila (>= 120 min) -> notifica consultor responsável + supervisor/líder (sino).
// 2. Atendimento cruza 24h na fila (>= 1440 min) -> escala também para Gerência e dispara E-MAIL (respeitando email_notifications !== false).
// Dedup por atendimento: flags backlog_alert_2h_sent e backlog_alert_24h_sent no próprio registro de service_records.

cronAdd('backlog_queue_action_alerts', '*/15 * * * *', function () {
  try {
    var nowMs = Date.now()
    var twoHoursAgoMs = nowMs - 2 * 3600 * 1000
    var twentyFourHoursAgoMs = nowMs - 24 * 3600 * 1000

    var twoHoursAgoIso = new Date(twoHoursAgoMs).toISOString().replace('T', ' ').substring(0, 19)

    // Buscar atendimentos em aberto (diferentes de 'Concluído' e 'Cancelado') criados há mais de 2 horas
    // e que ainda não receberam alerta de 2h ou de 24h
    var pendingRecords = $app.findRecordsByFilter(
      'service_records',
      "status != 'Concluído' && status != 'Cancelado' && created <= '" + twoHoursAgoIso + "'",
      '-created',
      500,
      0,
    )

    if (pendingRecords.length === 0) return

    var notifCol = $app.findCollectionByNameOrId('notifications')

    // Carregar usuários para mapeamento de liderança e gerência
    var allUsers = $app.findRecordsByFilter('users', "approval_status = 'Aprovado'", '', 1000, 0)

    var usersMap = {}
    var managers = []
    var supervisorsAndLeaders = []

    for (var u = 0; u < allUsers.length; u++) {
      var usr = allUsers[u]
      usersMap[usr.id] = usr
      var r = usr.getString('role') || ''
      if (
        r === 'Gerente' ||
        r === 'Gerentes' ||
        r === 'Master' ||
        usr.getBool('master_access') === true
      ) {
        managers.push(usr)
      } else if (r === 'Supervisor' || r === 'Supervisores' || r === 'Líder' || r === 'Líderes') {
        supervisorsAndLeaders.push(usr)
      }
    }

    // Helper para achar supervisores do consultor
    function getSupervisorsForUser(userRec) {
      if (!userRec) return supervisorsAndLeaders
      var directSup = userRec.getString('supervisor_id')
      var matched = []
      if (directSup && usersMap[directSup]) {
        matched.push(usersMap[directSup])
      }

      var uGroups = userRec.get('service_groups') || []
      for (var s = 0; s < supervisorsAndLeaders.length; s++) {
        var sup = supervisorsAndLeaders[s]
        if (sup.id === userRec.id) continue
        if (directSup && sup.id === directSup) continue

        var sGroups = sup.get('service_groups') || []
        if (!sGroups || sGroups.length === 0) {
          matched.push(sup)
          continue
        }

        var common = false
        for (var g1 = 0; g1 < uGroups.length; g1++) {
          for (var g2 = 0; g2 < sGroups.length; g2++) {
            if (uGroups[g1] === sGroups[g2]) {
              common = true
              break
            }
          }
          if (common) break
        }
        if (common) {
          matched.push(sup)
        }
      }

      return matched.length > 0 ? matched : supervisorsAndLeaders
    }

    // Processar cada atendimento elegível
    for (var i = 0; i < pendingRecords.length; i++) {
      var rec = pendingRecords[i]
      var createdStr = rec.getString('created')
      if (!createdStr) continue

      var recordTime = new Date(createdStr).getTime()
      var diffMs = Math.max(0, nowMs - recordTime)
      var diffMinutes = Math.floor(diffMs / 60000)

      var alert2hSent = rec.getBool('backlog_alert_2h_sent')
      var alert24hSent = rec.getBool('backlog_alert_24h_sent')

      var assignedUserId = rec.getString('assigned_user') || rec.getString('user_id')
      var assignedUserRec = assignedUserId ? usersMap[assignedUserId] : null
      var clientName = rec.getString('client_company') || rec.getString('client_name') || 'Cliente'
      var recLink = '/atendimentos?id=' + rec.id

      // 1. Alerta de 24 horas (CRÍTICO)
      if (diffMinutes >= 1440 && !alert24hSent) {
        rec.set('backlog_alert_24h_sent', true)
        rec.set('backlog_alert_2h_sent', true) // marca 2h como feito também
        $app.save(rec)

        var hoursWaiting = Math.floor(diffMinutes / 60)
        var critTitle = '🚨 Atendimento Crítico na Fila (> 24h): ' + clientName
        var critMsg =
          'Atendimento está parado na fila há ' +
          hoursWaiting +
          'h sem conclusão. Escalado para a gerência.'

        var critRecipientsMap = {}
        if (assignedUserId) critRecipientsMap[assignedUserId] = true

        var sups = getSupervisorsForUser(assignedUserRec)
        for (var sp = 0; sp < sups.length; sp++) {
          critRecipientsMap[sups[sp].id] = true
        }

        for (var mg = 0; mg < managers.length; mg++) {
          critRecipientsMap[managers[mg].id] = true
        }

        // Enviar notificação no sino
        for (var cId in critRecipientsMap) {
          if (!critRecipientsMap.hasOwnProperty(cId)) continue
          try {
            var notifCrit = new Record(notifCol)
            notifCrit.set('user_id', cId)
            notifCrit.set('title', critTitle)
            notifCrit.set('message', critMsg)
            notifCrit.set('type', 'alert')
            notifCrit.set('read', false)
            notifCrit.set('link', recLink)
            $app.save(notifCrit)
          } catch (ne) {
            $app.logger().error('Erro ao criar notificação de backlog >24h:', 'error', String(ne))
          }
        }

        // Enviar E-MAIL para gerentes e supervisores com email_notifications !== false
        try {
          var senderAddress = 'noreply@rexturadvance.com.br'
          var senderName = 'Sistema de Registros de Atendimento'
          try {
            if ($app.settings() && $app.settings().meta && $app.settings().meta.senderAddress) {
              senderAddress = $app.settings().meta.senderAddress
              senderName = $app.settings().meta.senderName || senderName
            }
          } catch (_) {}

          var emailHtml =
            '<!DOCTYPE html><html><head><meta charset="utf-8"></head>' +
            '<body style="font-family: -apple-system, BlinkMacSystemFont, Segoe UI, Roboto, Helvetica, Arial, sans-serif; background-color: #f8fafc; margin: 0; padding: 24px; color: #334155;">' +
            '<div style="max-width: 600px; margin: 0 auto; background: #ffffff; border-radius: 8px; border: 1px solid #e2e8f0; overflow: hidden;">' +
            '<div style="background-color: #dc2626; padding: 18px 24px; color: #ffffff;">' +
            '<h1 style="margin: 0; font-size: 18px; font-weight: 700;">🚨 Alerta Crítico: Atendimento > 24h na Fila</h1>' +
            '</div>' +
            '<div style="padding: 24px;">' +
            '<p style="margin: 0 0 14px; font-size: 14px;">Identificamos um atendimento que ultrapassou <strong>' +
            hoursWaiting +
            ' horas</strong> parado na fila de atendimento sem resolução.</p>' +
            '<div style="background-color: #fef2f2; border: 1px solid #fecaca; border-radius: 6px; padding: 14px; margin-bottom: 20px;">' +
            '<p style="margin: 0 0 6px; font-size: 13px;"><strong>Cliente:</strong> ' +
            clientName +
            '</p>' +
            '<p style="margin: 0 0 6px; font-size: 13px;"><strong>Consultor:</strong> ' +
            (assignedUserRec ? assignedUserRec.getString('name') : 'Não atribuído') +
            '</p>' +
            '<p style="margin: 0 0 6px; font-size: 13px;"><strong>Motivo:</strong> ' +
            (rec.getString('contact_reason') || 'Atendimento') +
            '</p>' +
            '<p style="margin: 0; font-size: 13px;"><strong>Tempo parado:</strong> <span style="color: #dc2626; font-weight: bold;">' +
            hoursWaiting +
            ' horas</span></p>' +
            '</div>' +
            '<div style="text-align: center; margin: 24px 0 12px;">' +
            '<a href="/atendimentos?id=' +
            rec.id +
            '" style="background-color: #dc2626; color: #ffffff; text-decoration: none; padding: 10px 20px; border-radius: 6px; font-weight: 600; font-size: 13px; display: inline-block;">Ver Atendimento na Fila</a>' +
            '</div>' +
            '</div></div></body></html>'

          for (var emId in critRecipientsMap) {
            if (!critRecipientsMap.hasOwnProperty(emId)) continue
            var uRec = usersMap[emId]
            if (!uRec) continue
            var uEmail = uRec.getString('email')
            var uNotifEnabled = uRec.get('email_notifications')
            if (uNotifEnabled === false) continue
            if (!uEmail || uEmail.indexOf('@') < 0) continue

            try {
              var mail = new MailerMessage({
                from: { address: senderAddress, name: senderName },
                to: [{ address: uEmail, name: uRec.getString('name') }],
                subject: '[Alerta Crítico > 24h] Atendimento parado na fila: ' + clientName,
                html: emailHtml,
              })
              $app.newMailClient().send(mail)
            } catch (mailErr) {
              $app
                .logger()
                .error(
                  'Erro ao enviar e-mail de backlog >24h:',
                  'recipient',
                  uEmail,
                  'error',
                  String(mailErr),
                )
            }
          }
        } catch (emailBlockErr) {
          $app
            .logger()
            .error('Erro no bloco de e-mail de backlog >24h:', 'error', String(emailBlockErr))
        }

        continue
      }

      // 2. Alerta de 2 horas (ATENÇÃO MODERADA)
      if (diffMinutes >= 120 && !alert2hSent) {
        rec.set('backlog_alert_2h_sent', true)
        $app.save(rec)

        var warnTitle = '⏱️ Atendimento > 2h na Fila: ' + clientName
        var warnMsg =
          'Atendimento aguardando na fila há mais de 2 horas (' +
          Math.floor(diffMinutes / 60) +
          'h). Requer atenção prioritária.'

        var warnRecipientsMap = {}
        if (assignedUserId) warnRecipientsMap[assignedUserId] = true

        var warnSups = getSupervisorsForUser(assignedUserRec)
        for (var ws = 0; ws < warnSups.length; ws++) {
          warnRecipientsMap[warnSups[ws].id] = true
        }

        for (var wId in warnRecipientsMap) {
          if (!warnRecipientsMap.hasOwnProperty(wId)) continue
          try {
            var notifWarn = new Record(notifCol)
            notifWarn.set('user_id', wId)
            notifWarn.set('title', warnTitle)
            notifWarn.set('message', warnMsg)
            notifWarn.set('type', 'warning')
            notifWarn.set('read', false)
            notifWarn.set('link', recLink)
            $app.save(notifWarn)
          } catch (nwErr) {
            $app.logger().error('Erro ao criar notificação de backlog >2h:', 'error', String(nwErr))
          }
        }
      }
    }
  } catch (globalErr) {
    $app.logger().error('Erro no cron backlog_queue_action_alerts:', 'error', String(globalErr))
  }
})
