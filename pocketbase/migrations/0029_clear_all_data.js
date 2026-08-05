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

    try {
      app
        .db()
        .newQuery('DELETE FROM users WHERE email != {:email}')
        .bind({ email: masterEmail })
        .execute()
    } catch (_) {}

    try {
      var master = app.findAuthRecordByEmail('_pb_users_auth_', masterEmail)
      master.set('role', 'Master')
      master.set('approval_status', 'Aprovado')
      app.save(master)
    } catch (_) {}
  },
  (app) => {},
)
