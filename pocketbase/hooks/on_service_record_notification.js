onRecordAfterCreateSuccess((e) => {
  var record = e.record
  var assignedUserId = record.getString('assigned_user')
  var creatorId = record.getString('user_id')
  var priority = record.getString('priority')
  var clientName = record.getString('client_name')

  var notifCol = $app.findCollectionByNameOrId('notifications')

  if (assignedUserId && assignedUserId !== creatorId) {
    var notif = new Record(notifCol)
    notif.set('user_id', assignedUserId)
    notif.set('title', 'Novo atendimento atribuído')
    notif.set('message', 'Você tem um novo atendimento de ' + clientName)
    notif.set('type', 'info')
    notif.set('read', false)
    notif.set('link', '/atendimentos')
    $app.save(notif)
  }

  if (priority === 'Alta') {
    try {
      var managers = $app.findRecordsByFilter(
        'users',
        "role = 'Gerentes' || role = 'Supervisores' || role = 'Líderes' || role = 'Master'",
        '',
        0,
        0,
      )
      for (var i = 0; i < managers.length; i++) {
        var mgrNotif = new Record(notifCol)
        mgrNotif.set('user_id', managers[i].id)
        mgrNotif.set('title', 'Atendimento de alta prioridade')
        mgrNotif.set('message', 'Novo atendimento de alta prioridade: ' + clientName)
        mgrNotif.set('type', 'warning')
        mgrNotif.set('read', false)
        mgrNotif.set('link', '/atendimentos')
        $app.save(mgrNotif)
      }
    } catch (err) {
      $app.logger().error('Failed to notify managers of high priority record', 'error', String(err))
    }
  }

  return e.next()
}, 'service_records')
