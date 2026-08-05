migrate(
  (app) => {
    var masterEmail = 'leonardo.thereziano@rexturadvance.com.br'

    var collections = [
      'service_record_history',
      'scheduled_reports',
      'notifications',
      'feedback',
      'trainings',
      'service_records',
      'agents',
      'clients',
      'account_executives',
    ]

    for (var i = 0; i < collections.length; i++) {
      try {
        app
          .db()
          .newQuery('DELETE FROM ' + collections[i])
          .execute()
      } catch (_) {}
    }

    var allUsers = app.findRecordsByFilter('users', "id != ''", '', 500, 0)
    for (var j = 0; j < allUsers.length; j++) {
      if (allUsers[j].getString('email') !== masterEmail) {
        try {
          app.delete(allUsers[j])
        } catch (_) {}
      }
    }

    try {
      var master = app.findAuthRecordByEmail('_pb_users_auth_', masterEmail)
      master.set('role', 'Master')
      master.set('approval_status', 'Aprovado')
      app.save(master)
    } catch (_) {}
  },
  (app) => {},
)
