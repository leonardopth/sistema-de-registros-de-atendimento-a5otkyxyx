onRecordAfterCreateSuccess((e) => {
  var category = e.record.getString('category')
  var message = e.record.getString('message')
  var messagePreview = message.length > 80 ? message.substring(0, 80) + '...' : message

  var notifCol = $app.findCollectionByNameOrId('notifications')

  try {
    var managers = $app.findRecordsByFilter(
      'users',
      "role = 'Gerentes' || role = 'Supervisores' || role = 'Líderes' || role = 'Master'",
      '',
      0,
      0,
    )
    for (var i = 0; i < managers.length; i++) {
      var notif = new Record(notifCol)
      notif.set('user_id', managers[i].id)
      notif.set('title', 'Novo feedback: ' + category)
      notif.set('message', messagePreview)
      notif.set('type', 'info')
      notif.set('read', false)
      notif.set('link', '/dashboard-geral')
      $app.save(notif)
    }
  } catch (err) {
    $app.logger().error('Failed to create feedback notification', 'error', String(err))
  }

  return e.next()
}, 'feedback')
