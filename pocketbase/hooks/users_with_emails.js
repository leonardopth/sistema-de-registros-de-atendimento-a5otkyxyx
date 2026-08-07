routerAdd(
  'GET',
  '/backend/v1/users-with-emails',
  (e) => {
    try {
      var users = $app.findRecordsByFilter('users', "id != ''", 'name', 0, 0)
      var result = []
      for (var i = 0; i < users.length; i++) {
        var u = users[i]
        result.push({
          id: u.id,
          name: u.getString('name'),
          email: u.getString('email'),
          role: u.getString('role'),
          master_access: u.getBool('master_access'),
          approval_status: u.getString('approval_status'),
          approved_by: u.getString('approved_by'),
          approved_by_id: u.getString('approved_by_id'),
          approved_at: u.getString('approved_at'),
          telegram_id: u.getString('telegram_id'),
          telegram_alerts: u.getBool('telegram_alerts'),
          service_groups: u.get('service_groups') || [],
          bases: u.get('bases') || [],
          created: u.getString('created'),
          updated: u.getString('updated'),
        })
      }
      return e.json(200, result)
    } catch (err) {
      return e.json(500, { error: 'Failed to fetch users' })
    }
  },
  $apis.requireAuth(),
)
