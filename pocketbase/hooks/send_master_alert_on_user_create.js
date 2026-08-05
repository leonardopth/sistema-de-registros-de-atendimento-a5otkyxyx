onRecordAfterCreateSuccess((e) => {
  var approvalStatus = e.record.getString('approval_status')
  if (approvalStatus !== 'Pendente') {
    return e.next()
  }

  var userName = e.record.getString('name')
  var userEmail = e.record.getString('email')
  var userRole = e.record.getString('role')

  var masters = []
  try {
    masters = $app.findRecordsByFilter('users', "role = 'Master'", '', 0, 0)
  } catch (err) {
    $app.logger().error('Failed to find master users for approval alert', 'error', String(err))
    return e.next()
  }

  if (masters.length === 0) {
    return e.next()
  }

  var subject = 'Novo cadastro aguardando aprovação'

  var htmlBody =
    '<html><body>' +
    '<h2 style="color:#1e293b;font-family:Arial,sans-serif;">Novo cadastro aguardando aprovação</h2>' +
    '<p style="color:#475569;font-size:14px;font-family:Arial,sans-serif;">Um novo usuário foi registrado e está aguardando aprovação no sistema:</p>' +
    '<table style="border-collapse:collapse;margin:16px 0;font-family:Arial,sans-serif;">' +
    '<tr><td style="padding:8px 16px;font-weight:bold;color:#334155;">Nome:</td><td style="padding:8px 16px;color:#475569;">' +
    userName +
    '</td></tr>' +
    '<tr><td style="padding:8px 16px;font-weight:bold;color:#334155;">E-mail:</td><td style="padding:8px 16px;color:#475569;">' +
    userEmail +
    '</td></tr>' +
    '<tr><td style="padding:8px 16px;font-weight:bold;color:#334155;">Cargo:</td><td style="padding:8px 16px;color:#475569;">' +
    userRole +
    '</td></tr>' +
    '</table>' +
    '<p style="color:#475569;font-size:14px;font-family:Arial,sans-serif;">Acesse o sistema para aprovar ou rejeitar este cadastro.</p>' +
    '</body></html>'

  for (var i = 0; i < masters.length; i++) {
    var masterEmail = masters[i].getString('email')
    if (!masterEmail) continue

    try {
      $app
        .mails()
        .send(
          { address: 'noreply@rexturadvance.com.br', name: 'Sistema de Registros de Atendimento' },
          [{ address: masterEmail }],
          subject,
          htmlBody,
        )
    } catch (err) {
      $app
        .logger()
        .error(
          'Failed to send approval alert email to master',
          'error',
          String(err),
          'masterEmail',
          masterEmail,
        )
    }
  }

  return e.next()
}, 'users')
