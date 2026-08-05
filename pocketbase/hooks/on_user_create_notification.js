onRecordAfterCreateSuccess((e) => {
  var approvalStatus = e.record.getString('approval_status')
  if (approvalStatus !== 'Pendente') return e.next()

  var userName = e.record.getString('name')
  var userEmail = e.record.getString('email')
  var userRole = e.record.getString('role')

  var notifCol = $app.findCollectionByNameOrId('notifications')

  try {
    var masters = $app.findRecordsByFilter('users', "role = 'Master'", '', 0, 0)
    for (var i = 0; i < masters.length; i++) {
      var notif = new Record(notifCol)
      notif.set('user_id', masters[i].id)
      notif.set('title', 'Novo cadastro aguardando aprovação')
      notif.set('message', userName + ' (' + userEmail + ') — ' + userRole)
      notif.set('type', 'approval')
      notif.set('read', false)
      notif.set('link', '/gestao-usuarios')
      $app.save(notif)
    }
  } catch (err) {
    $app.logger().error('Failed to create user approval notification', 'error', String(err))
  }

  return e.next()
}, 'users')
