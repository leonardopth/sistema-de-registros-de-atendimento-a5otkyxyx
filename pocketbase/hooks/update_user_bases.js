routerAdd(
  'PATCH',
  '/backend/v1/users/{userId}/bases',
  (e) => {
    var authId = e.auth ? e.auth.id : ''
    if (!authId) return e.unauthorizedError('auth required')

    var authRole = e.auth.getString('role')
    if (authRole !== 'Master') {
      return e.forbiddenError('only Master users can manage bases')
    }

    var targetUserId = e.request.pathValue('userId')
    var body = e.requestInfo().body || {}
    var bases = body.bases || []

    var validBases = ['NO/NE', 'CO', 'RJ/ES/MG', 'SAO', 'SPI', 'SUL', 'LOT', 'INSIDE SALES']

    for (var i = 0; i < bases.length; i++) {
      if (validBases.indexOf(bases[i]) === -1) {
        return e.badRequestError('invalid base: ' + bases[i])
      }
    }

    var targetRecord
    try {
      targetRecord = $app.findRecordById('users', targetUserId)
    } catch (err) {
      return e.notFoundError('user not found')
    }

    targetRecord.set('bases', bases)
    $app.save(targetRecord)

    return e.json(200, {
      id: targetRecord.id,
      bases: bases,
    })
  },
  $apis.requireAuth(),
)
