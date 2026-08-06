routerAdd(
  'PATCH',
  '/backend/v1/users/{userId}/service-groups',
  (e) => {
    var authId = e.auth ? e.auth.id : ''
    if (!authId) return e.unauthorizedError('auth required')

    var authRole = e.auth.getString('role')
    if (authRole !== 'Master') {
      return e.forbiddenError('only Master users can manage service groups')
    }

    var targetUserId = e.request.pathValue('userId')
    var body = e.requestInfo().body || {}
    var groups = body.service_groups || []

    var validGroups = ['Concierge', 'Exclusivo', 'LOT', 'BR1', 'BR2', 'SAO', 'SPI', 'SUL']

    for (var i = 0; i < groups.length; i++) {
      if (validGroups.indexOf(groups[i]) === -1) {
        return e.badRequestError('invalid service group: ' + groups[i])
      }
    }

    var targetRecord
    try {
      targetRecord = $app.findRecordById('users', targetUserId)
    } catch (err) {
      return e.notFoundError('user not found')
    }

    targetRecord.set('service_groups', groups)
    $app.save(targetRecord)

    return e.json(200, {
      id: targetRecord.id,
      service_groups: groups,
    })
  },
  $apis.requireAuth(),
)
