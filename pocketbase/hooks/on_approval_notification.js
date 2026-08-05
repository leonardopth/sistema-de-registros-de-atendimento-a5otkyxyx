onRecordAfterUpdateSuccess((e) => {
  var oldStatus = e.record.original().getString('approval_status')
  var newStatus = e.record.getString('approval_status')

  if (oldStatus === newStatus) return e.next()

  var userId = e.record.id
  var notifCol = $app.findCollectionByNameOrId('notifications')

  if (newStatus === 'Aprovado') {
    var notif = new Record(notifCol)
    notif.set('user_id', userId)
    notif.set('title', 'Conta aprovada')
    notif.set('message', 'Sua conta foi aprovada! Você já pode acessar o sistema.')
    notif.set('type', 'success')
    notif.set('read', false)
    notif.set('link', '/')
    $app.save(notif)
  } else if (newStatus === 'Rejeitado') {
    var notif2 = new Record(notifCol)
    notif2.set('user_id', userId)
    notif2.set('title', 'Conta rejeitada')
    notif2.set(
      'message',
      'Sua solicitação de acesso foi rejeitada. Entre em contato com o administrador.',
    )
    notif2.set('type', 'error')
    notif2.set('read', false)
    notif2.set('link', '/login')
    $app.save(notif2)
  }

  return e.next()
}, 'users')
