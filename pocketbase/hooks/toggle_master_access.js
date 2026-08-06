routerAdd(
  'PATCH',
  '/backend/v1/users/{id}/master-access',
  (e) => {
    var userId = e.request.pathValue('id')
    var body = e.requestInfo().body || {}
    var masterAccess = !!body.master_access
    var actionedBy = e.auth ? e.auth.id : ''

    if (!actionedBy) return e.unauthorizedError('auth required')

    if (e.auth.getString('role') !== 'Master' && !e.auth.getBool('master_access')) {
      return e.forbiddenError('only master users can toggle master access')
    }

    var userRecord
    try {
      userRecord = $app.findRecordById('users', userId)
    } catch (_) {
      return e.notFoundError('user not found')
    }

    var oldAccess = userRecord.getBool('master_access')

    if (oldAccess === masterAccess) {
      return e.json(200, { id: userId, master_access: masterAccess, unchanged: true })
    }

    userRecord.set('master_access', masterAccess)
    $app.save(userRecord)

    var notifCol = $app.findCollectionByNameOrId('notifications')
    var notif = new Record(notifCol)
    notif.set('user_id', userId)
    notif.set('title', masterAccess ? 'Acesso master concedido' : 'Acesso master revogado')
    notif.set(
      'message',
      masterAccess
        ? 'Seu acesso master foi concedido. Voce agora tem privilegios administrativos no sistema.'
        : 'Seu acesso master foi revogado. Entre em contato com o administrador se tiver duvidas.',
    )
    notif.set('type', 'info')
    notif.set('read', false)
    notif.set('resolved', false)
    notif.set('link', '/')
    $app.save(notif)

    var historyCol = $app.findCollectionByNameOrId('master_access_history')
    var history = new Record(historyCol)
    history.set('user', userId)
    history.set('actioned_by', actionedBy)
    history.set('action', masterAccess ? 'Concedido' : 'Revogado')
    $app.save(history)

    return e.json(200, { id: userId, master_access: masterAccess, unchanged: false })
  },
  $apis.requireAuth(),
)
