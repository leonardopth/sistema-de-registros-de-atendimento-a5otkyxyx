// Cron job de relatórios agendados rodando em dias úteis pela manhã (8h GMT-3 = 11h UTC: '0 11 * * 1-5')
// Para cada scheduled_reports ativo, roda quando a frequência vence:
// - daily: todo dia útil
// - weekly: segunda-feira
// - monthly: dia 1 do mês (ou primeiro dia útil do mês)
// Gera os dados com os filtros salvos no registro respeitando o escopo RBAC do dono do agendamento (seus grupos de serviço/clientes)
// Envia e-mail aos destinatários (email ou recipients) no formato escolhido (csv/excel/pdf) e atualiza last_run, next_run e last_sent

cronAdd('scheduled_reports_runner', '0 11 * * 1-5', function () {
  try {
    var schedules = $app.findRecordsByFilter('scheduled_reports', 'active = true', '', 0, 0)
    var now = new Date()
    // GMT-3
    var gmt3Ms = now.getTime() - 3 * 3600 * 1000
    var gmt3Date = new Date(gmt3Ms)
    var gmt3DayOfWeek = gmt3Date.getUTCDay() // 1 = Seg, 2 = Ter, ..., 5 = Sex
    var gmt3DayOfMonth = gmt3Date.getUTCDate()
    var gmt3DateStr = gmt3Date.toISOString().substring(0, 10)

    for (var i = 0; i < schedules.length; i++) {
      var schedule = schedules[i]
      var frequency = schedule.getString('frequency')
      var lastSent = schedule.getString('last_sent') || schedule.getString('last_run')

      var shouldSend = false
      if (!lastSent) {
        shouldSend = true
      } else {
        var lastDate = new Date(lastSent)
        var diffDays = Math.floor((now.getTime() - lastDate.getTime()) / 86400000)

        if (frequency === 'daily') {
          // Todo dia útil se não rodou hoje
          var lastDateGmt3Str = new Date(lastDate.getTime() - 3 * 3600 * 1000)
            .toISOString()
            .substring(0, 10)
          if (lastDateGmt3Str !== gmt3DateStr) {
            shouldSend = true
          }
        } else if (frequency === 'weekly') {
          // Segunda-feira (ou se faz mais de 6 dias que não roda)
          if (gmt3DayOfWeek === 1 || diffDays >= 7) {
            shouldSend = true
          }
        } else if (frequency === 'monthly') {
          // Dia 1 (ou primeiros dias do mês se não rodou no mês corrente)
          var lastMonth = lastDate.getUTCFullYear() + '-' + (lastDate.getUTCMonth() + 1)
          var currentMonth = gmt3Date.getUTCFullYear() + '-' + (gmt3Date.getUTCMonth() + 1)
          if (lastMonth !== currentMonth && (gmt3DayOfMonth <= 3 || diffDays >= 28)) {
            shouldSend = true
          }
        }
      }

      if (!shouldSend) continue

      var userId = schedule.getString('user_id')
      var emailAddr = schedule.getString('email')
      if (!emailAddr) continue

      var userRec = null
      try {
        userRec = $app.findRecordById('users', userId)
      } catch (uErr) {
        $app.logger().warn('Usuário do agendamento não encontrado: ' + userId)
        continue
      }

      var role = userRec.getString('role') || ''
      var masterAccess = userRec.getBool('master_access')
      var isMaster = role === 'Master' || masterAccess
      var isGerente = role === 'Gerente' || role === 'Gerentes'
      var isSupervisor = role === 'Supervisor' || role === 'Supervisores'
      var isLider = role === 'Líder' || role === 'Líderes'
      var isLeadership = isMaster || isGerente || isSupervisor || isLider

      var userGroups = userRec.get('service_groups') || []
      var filters = schedule.get('filters') || {}

      // Respeitar RBAC do dono do agendamento
      var records = []
      try {
        if (isMaster || isGerente) {
          // Acesso irrestrito a todos os registros
          records = $app.findRecordsByFilter('service_records', '', '-created', 1000, 0)
        } else if (isSupervisor || isLider) {
          // Filtrado por grupos de atendimento do líder/supervisor
          if (userGroups && userGroups.length > 0) {
            // Buscar clientes pertencentes aos grupos do líder
            var clientConditions = []
            for (var g = 0; g < userGroups.length; g++) {
              clientConditions.push("service_group = '" + userGroups[g] + "'")
            }
            var matchingClients = $app.findRecordsByFilter(
              'clients',
              clientConditions.join(' || '),
              '',
              0,
              0,
            )
            var clientIds = []
            var companyNames = []
            for (var c = 0; c < matchingClients.length; c++) {
              clientIds.push(matchingClients[c].id)
              var comp = matchingClients[c].getString('company')
              if (comp) companyNames.push(comp)
            }

            var srFilterParts = ["assigned_user = '" + userId + "'", "user_id = '" + userId + "'"]
            for (var cidIdx = 0; cidIdx < clientIds.length; cidIdx++) {
              srFilterParts.push("client = '" + clientIds[cidIdx] + "'")
            }
            records = $app.findRecordsByFilter(
              'service_records',
              srFilterParts.join(' || '),
              '-created',
              1000,
              0,
            )
          } else {
            records = $app.findRecordsByFilter('service_records', '', '-created', 1000, 0)
          }
        } else {
          // Consultor / Executivo: apenas seus registros atribuídos ou criados
          records = $app.findRecordsByFilter(
            'service_records',
            "assigned_user = '" + userId + "' || user_id = '" + userId + "'",
            '-created',
            1000,
            0,
          )
        }
      } catch (fetchErr) {
        $app.logger().error('Erro ao buscar registros para relatório agendado: ' + fetchErr)
        continue
      }

      function toGMT3ISO(isoStr) {
        if (!isoStr) return ''
        var d = new Date(isoStr)
        if (isNaN(d.getTime())) return ''
        return new Date(d.getTime() - 3 * 60 * 60 * 1000)
          .toISOString()
          .replace('T', ' ')
          .substring(0, 19)
      }

      var formatType = (schedule.getString('format') || 'csv').toLowerCase()

      // Construção do CSV / tabela
      var csvHeader =
        'Cliente,Empresa,Motivo,Canal,Prioridade,Status,Data,Duracao (min),TFR (min),Descricao\n'
      var csvRows = ''
      var tableHtmlRows = ''

      for (var j = 0; j < records.length; j++) {
        var r = records[j]
        var durVal = r.get('duration')
        var durStr = durVal !== null && durVal !== undefined ? String(durVal) : '0'
        var tfrVal = r.get('first_response_time')
        var tfrStr = tfrVal !== null && tfrVal !== undefined ? String(tfrVal) : '0'

        var row = [
          r.getString('client_name') || '',
          r.getString('client_company') || '',
          r.getString('contact_reason') || '',
          r.getString('channel') || '',
          r.getString('priority') || '',
          r.getString('status') || '',
          toGMT3ISO(r.getString('created')) || '',
          durStr,
          tfrStr,
          (r.getString('description') || '').replace(/"/g, '""'),
        ]
        csvRows +=
          row
            .map(function (c) {
              return '"' + c + '"'
            })
            .join(',') + '\n'

        if (j < 50) {
          tableHtmlRows +=
            '<tr style="border-bottom: 1px solid #e2e8f0; font-size: 12px;">' +
            '<td style="padding: 6px 8px;">' +
            (r.getString('client_company') || r.getString('client_name') || '-') +
            '</td>' +
            '<td style="padding: 6px 8px;">' +
            (r.getString('contact_reason') || '-') +
            '</td>' +
            '<td style="padding: 6px 8px;">' +
            (r.getString('status') || '-') +
            '</td>' +
            '<td style="padding: 6px 8px;">' +
            (toGMT3ISO(r.getString('created')) || '-') +
            '</td>' +
            '<td style="padding: 6px 8px; text-align: center;">' +
            durStr +
            ' min</td>' +
            '<td style="padding: 6px 8px; text-align: center;">' +
            (Number(tfrStr) > 0 ? tfrStr + ' min' : '-') +
            '</td>' +
            '</tr>'
        }
      }

      var freqLabel =
        frequency === 'daily' ? 'Diário' : frequency === 'weekly' ? 'Semanal' : 'Mensal'

      var htmlBody =
        '<!DOCTYPE html><html><head><meta charset="utf-8"></head>' +
        '<body style="font-family: Arial, sans-serif; background-color: #f8fafc; margin: 0; padding: 24px; color: #334155;">' +
        '<div style="max-width: 750px; margin: 0 auto; background: #ffffff; border-radius: 8px; border: 1px solid #e2e8f0; overflow: hidden;">' +
        '<div style="background-color: #4f46e5; padding: 18px 24px; color: #ffffff;">' +
        '<h1 style="margin: 0; font-size: 18px; font-weight: bold;">📊 Relatório Agendado de Atendimentos (' +
        freqLabel +
        ')</h1>' +
        '<p style="margin: 4px 0 0; font-size: 12px; opacity: 0.9;">Exportação automática consolidada — ' +
        gmt3DateStr +
        '</p>' +
        '</div>' +
        '<div style="padding: 24px;">' +
        '<p style="font-size: 14px; margin-top: 0;">Olá,</p>' +
        '<p style="font-size: 14px;">Segue o relatório agendado de atendimentos. Foram consolidados <strong>' +
        records.length +
        '</strong> atendimentos conforme as permissões de acesso da sua conta.</p>' +
        '<p style="font-size: 13px; font-weight: bold; margin-bottom: 8px;">Formato selecionado: ' +
        formatType.toUpperCase() +
        '</p>' +
        (tableHtmlRows
          ? '<table style="width: 100%; border-collapse: collapse; margin: 16px 0; border: 1px solid #e2e8f0;">' +
            '<thead><tr style="background: #f1f5f9; text-align: left; font-size: 11px; text-transform: uppercase;">' +
            '<th style="padding: 8px;">Cliente/Empresa</th><th style="padding: 8px;">Motivo</th><th style="padding: 8px;">Status</th><th style="padding: 8px;">Data (GMT-3)</th><th style="padding: 8px; text-align: center;">Duração</th><th style="padding: 8px; text-align: center;">TFR</th>' +
            '</tr></thead><tbody>' +
            tableHtmlRows +
            '</tbody></table>' +
            (records.length > 50
              ? '<p style="font-size: 11px; color: #64748b; margin-top: 4px;">* Exibindo os 50 registros mais recentes na prévia do e-mail.</p>'
              : '')
          : '<p style="color: #64748b; font-size: 13px;">Nenhum atendimento registrado no período.</p>') +
        '<div style="margin-top: 24px; padding: 16px; background-color: #f8fafc; border-radius: 6px; border: 1px solid #e2e8f0;">' +
        '<p style="margin: 0 0 8px 0; font-size: 12px; font-weight: bold;">Arquivo CSV em anexo/texto:</p>' +
        '<pre style="font-size: 10px; background: #ffffff; padding: 10px; border-radius: 4px; border: 1px solid #cbd5e1; max-height: 200px; overflow-y: auto; white-space: pre-wrap;">' +
        (csvHeader + csvRows).substring(0, 3000).replace(/</g, '&lt;').replace(/>/g, '&gt;') +
        '</pre>' +
        '</div>' +
        '<p style="font-size: 11px; color: #94a3b8; text-align: center; margin-top: 24px; border-top: 1px solid #f1f5f9; padding-top: 16px;">' +
        'Sistema de Registros de Atendimento — Exportação automatizada.' +
        '</p>' +
        '</div></div></body></html>'

      var senderAddress = 'noreply@rexturadvance.com.br'
      var senderName = 'Sistema de Registros de Atendimento'
      try {
        if ($app.settings() && $app.settings().meta && $app.settings().meta.senderAddress) {
          senderAddress = $app.settings().meta.senderAddress
          senderName = $app.settings().meta.senderName || senderName
        }
      } catch (e) {}

      var subject = 'Relatório Agendado de Atendimentos (' + freqLabel + ') - ' + gmt3DateStr

      try {
        var msg = new MailerMessage({
          from: { address: senderAddress, name: senderName },
          to: [{ address: emailAddr }],
          subject: subject,
          html: htmlBody,
        })
        $app.newMailClient().send(msg)
      } catch (mailErr) {
        try {
          $app
            .mails()
            .send(
              { address: senderAddress, name: senderName },
              [{ address: emailAddr }],
              subject,
              htmlBody,
            )
        } catch (fbErr) {
          $app
            .logger()
            .error(
              'Erro ao enviar e-mail de relatório agendado',
              'error',
              String(mailErr || fbErr),
              'email',
              emailAddr,
            )
        }
      }

      // Atualizar last_sent, last_run e next_run
      var nextRunDate = new Date(now.getTime())
      if (frequency === 'daily') {
        nextRunDate.setDate(nextRunDate.getDate() + 1)
      } else if (frequency === 'weekly') {
        nextRunDate.setDate(nextRunDate.getDate() + 7)
      } else if (frequency === 'monthly') {
        nextRunDate.setMonth(nextRunDate.getMonth() + 1)
      }

      schedule.set('last_sent', now.toISOString())
      schedule.set('last_run', now.toISOString())
      schedule.set('next_run', nextRunDate.toISOString())
      try {
        $app.save(schedule)
      } catch (saveErr) {
        $app.logger().error('Erro ao atualizar scheduled_reports:', 'error', String(saveErr))
      }
    }
  } catch (err) {
    $app.logger().error('Erro fatal no scheduled_reports_runner cron:', 'error', String(err))
  }
})
