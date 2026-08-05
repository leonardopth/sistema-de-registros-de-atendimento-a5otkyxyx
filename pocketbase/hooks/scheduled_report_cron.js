cronAdd('0 8 * * *', function () {
  try {
    var schedules = $app.findRecordsByFilter('scheduled_reports', 'active = true', '', 0, 0)
    var now = new Date()

    for (var i = 0; i < schedules.length; i++) {
      var schedule = schedules[i]
      var frequency = schedule.getString('frequency')
      var lastSent = schedule.getString('last_sent')

      var shouldSend = false
      if (!lastSent) {
        shouldSend = true
      } else {
        var lastDate = new Date(lastSent)
        var diffDays = Math.floor((now.getTime() - lastDate.getTime()) / 86400000)
        if (frequency === 'daily' && diffDays >= 1) shouldSend = true
        if (frequency === 'weekly' && diffDays >= 7) shouldSend = true
        if (frequency === 'monthly' && diffDays >= 30) shouldSend = true
      }

      if (!shouldSend) continue

      var userId = schedule.getString('user_id')
      var emailAddr = schedule.getString('email')

      var userRec = $app.findRecordById('users', userId)
      var role = userRec.getString('role')

      var records
      if (
        role === 'Master' ||
        role === 'Gerentes' ||
        role === 'Supervisores' ||
        role === 'Líderes'
      ) {
        records = $app.findRecordsByFilter('service_records', '', '-created', 500, 0)
      } else {
        records = $app.findRecordsByFilter(
          'service_records',
          "assigned_user = '" + userId + "' || user_id = '" + userId + "'",
          '-created',
          500,
          0,
        )
      }

      var csv = 'Cliente,Empresa,Motivo,Canal,Prioridade,Status,Data,Duracao(min),Descricao\n'
      for (var j = 0; j < records.length; j++) {
        var r = records[j]
        var row = [
          r.getString('client_name') || '',
          r.getString('client_company') || '',
          r.getString('contact_reason') || '',
          r.getString('channel') || '',
          r.getString('priority') || '',
          r.getString('status') || '',
          r.getString('created') || '',
          String(r.get('duration') || 0),
          (r.getString('description') || '').replace(/"/g, '""'),
        ]
        csv +=
          row
            .map(function (c) {
              return '"' + c + '"'
            })
            .join(',') + '\n'
      }

      var htmlBody =
        '<html><body><h2 style="color:#1e293b;font-family:Arial;">Relatorio de Atendimentos</h2><p style="color:#475569;font-family:Arial;">Total: ' +
        records.length +
        ' atendimento(s)</p><pre style="font-size:11px;background:#f8fafc;padding:12px;border-radius:8px;overflow-x:auto;">' +
        csv.replace(/</g, '&lt;').replace(/>/g, '&gt;') +
        '</pre></body></html>'

      try {
        $app
          .mails()
          .send(
            { address: 'noreply@rexturadvance.com.br', name: 'Sistema de Registros' },
            [{ address: emailAddr }],
            'Relatorio de Atendimentos - ' + frequency,
            htmlBody,
          )
      } catch (mailErr) {
        $app
          .logger()
          .error(
            'Failed to send scheduled report email',
            'error',
            String(mailErr),
            'email',
            emailAddr,
          )
      }

      schedule.set('last_sent', now.toISOString())
      $app.save(schedule)
    }
  } catch (err) {
    $app.logger().error('Scheduled report cron failed', 'error', String(err))
  }
})
