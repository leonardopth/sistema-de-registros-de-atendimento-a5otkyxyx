routerAdd(
  'POST',
  '/backend/v1/users/{userId}/reset-password',
  (e) => {
    var authId = e.auth ? e.auth.id : ''
    if (!authId) return e.unauthorizedError('auth required')

    var authRole = e.auth.getString('role')
    var isMaster = authRole === 'Master' || e.auth.getBool('master_access')
    if (!isMaster) {
      return e.forbiddenError('only master users can reset user passwords')
    }

    var targetUserId = e.request.pathValue('userId')
    var body = e.requestInfo().body || {}
    var newPassword = (body.password || '').trim()

    if (!newPassword || newPassword.length < 6) {
      throw new BadRequestError('Dados inválidos', {
        password: 'A nova senha deve ter no mínimo 6 caracteres.',
      })
    }

    var targetRecord
    try {
      targetRecord = $app.findRecordById('users', targetUserId)
    } catch (err) {
      return e.notFoundError('user not found')
    }

    targetRecord.setPassword(newPassword)
    $app.save(targetRecord)

    // Notificar usuário se possível
    try {
      var notifCol = $app.findCollectionByNameOrId('notifications')
      var notif = new Record(notifCol)
      notif.set('user_id', targetUserId)
      notif.set('title', 'Sua senha foi redefinida')
      notif.set('message', 'Um administrador Master alterou a sua senha de acesso ao sistema.')
      notif.set('type', 'warning')
      notif.set('read', false)
      notif.set('resolved', false)
      notif.set('link', '/')
      $app.save(notif)
    } catch (_) {}

    return e.json(200, { success: true, id: targetRecord.id })
  },
  $apis.requireAuth(),
)
