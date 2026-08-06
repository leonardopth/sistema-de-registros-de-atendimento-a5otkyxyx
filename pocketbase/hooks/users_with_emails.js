routerAdd(
  'GET',
  '/backend/v1/users-with-emails',
  (e) => {
    const userId = e.auth ? e.auth.id : ''
    if (!userId) return e.unauthorizedError('auth required')

    const role = e.auth.getString('role')
    if (role !== 'Master' && role !== 'Gerentes') {
      return e.forbiddenError('access denied')
    }

    try {
      const records = $app.findRecordsByFilter('_pb_users_auth_', "id != ''", 'name', 0, 0)

      var managerGroups = []
      if (role === 'Gerentes') {
        managerGroups = e.auth.get('service_groups') || []
        if (managerGroups.length === 0) {
          return e.json(200, [])
        }
      }

      var result = []
      for (var i = 0; i < records.length; i++) {
        var r = records[i]

        if (role === 'Gerentes') {
          var userGroups = r.get('service_groups') || []
          if (!userGroups || userGroups.length === 0) continue

          var hasOverlap = false
          for (var j = 0; j < managerGroups.length; j++) {
            for (var k = 0; k < userGroups.length; k++) {
              if (managerGroups[j] === userGroups[k]) {
                hasOverlap = true
                break
              }
            }
            if (hasOverlap) break
          }
          if (!hasOverlap) continue
        }

        result.push({
          id: r.id,
          name: r.getString('name'),
          email: r.getString('email'),
          role: r.getString('role'),
          approval_status: r.getString('approval_status'),
          approved_by: r.getString('approved_by'),
          approved_by_id: r.getString('approved_by_id'),
          approved_at: r.getString('approved_at'),
          telegram_id: r.getString('telegram_id'),
          telegram_alerts: r.get('telegram_alerts'),
          service_groups: r.get('service_groups'),
          bases: r.get('bases'),
          created: r.getString('created'),
          updated: r.getString('updated'),
        })
      }
      return e.json(200, result)
    } catch (err) {
      return e.json(500, { error: 'failed to fetch users' })
    }
  },
  $apis.requireAuth(),
)
