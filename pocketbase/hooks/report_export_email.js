routerAdd(
  'POST',
  '/backend/v1/reports/export-email',
  function (e) {
    var userId = e.auth ? e.auth.id : ''
    if (!userId) return e.unauthorizedError('auth required')

    var body = e.requestInfo().body || {}
    var emailAddr = body.email || ''
    if (!emailAddr) return e.badRequestError('email is required')

    var role = e.auth.getString('role')
    var records

    try {
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
    } catch (err) {
      return e.json(500, { error: 'failed to fetch records' })
    }

    function toGMT3ISO(isoStr) {
      if (!isoStr) return ''
      var d = new Date(isoStr)
      if (isNaN(d.getTime())) return ''
      return new Date(d.getTime() - 3 * 60 * 60 * 1000).toISOString()
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
        toGMT3ISO(r.getString('created')) || '',
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
          'Relatorio de Atendimentos',
          htmlBody,
        )
    } catch (err) {
      return e.json(500, { error: 'failed to send email' })
    }

    return e.json(200, { success: true, count: records.length })
  },
  $apis.requireAuth(),
)
