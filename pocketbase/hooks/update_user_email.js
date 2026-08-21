routerAdd(
  'PATCH',
  '/backend/v1/users/{userId}/email',
  (e) => {
    var authId = e.auth ? e.auth.id : ''
    if (!authId) return e.unauthorizedError('auth required')

    var authRole = e.auth.getString('role')
    if (authRole !== 'Master' && authRole !== 'Gerente') {
      return e.forbiddenError('access denied')
    }

    var targetUserId = e.request.pathValue('userId')
    var body = e.requestInfo().body || {}
    var newEmail = (body.email || '').trim()

    var emailRegex = /^[^\s@]+@[^\s@]+\.[^\s@]+$/
    if (!newEmail || !emailRegex.test(newEmail)) {
      throw new BadRequestError('Dados inválidos', {
        email: 'Formato de e-mail inválido.',
      })
    }

    var targetRecord
    try {
      targetRecord = $app.findRecordById('users', targetUserId)
    } catch (err) {
      return e.notFoundError('user not found')
    }

    if (authRole === 'Gerente') {
      var managerGroups = e.auth.get('service_groups') || []
      if (managerGroups.length === 0) {
        return e.forbiddenError('access denied')
      }
      var userGroups = targetRecord.get('service_groups') || []
      var hasOverlap = false
      for (var i = 0; i < managerGroups.length; i++) {
        for (var j = 0; j < userGroups.length; j++) {
          if (managerGroups[i] === userGroups[j]) {
            hasOverlap = true
            break
          }
        }
        if (hasOverlap) break
      }
      if (!hasOverlap) {
        return e.forbiddenError('access denied')
      }
    }

    var emailTaken = false
    try {
      var existing = $app.findAuthRecordByEmail('users', newEmail)
      if (existing.id !== targetUserId) {
        emailTaken = true
      }
    } catch (err) {}

    if (emailTaken) {
      throw new BadRequestError('E-mail já em uso', {
        email: 'Este e-mail já está em uso por outro usuário.',
      })
    }

    targetRecord.setEmail(newEmail)
    $app.save(targetRecord)

    return e.json(200, { id: targetRecord.id, email: newEmail })
  },
  $apis.requireAuth(),
)
