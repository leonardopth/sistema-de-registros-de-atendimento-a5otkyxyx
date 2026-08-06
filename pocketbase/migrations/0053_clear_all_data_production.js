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
      app
        .db()
        .newQuery(
          'UPDATE users SET role = {:role}, approval_status = {:status} WHERE email = {:email}',
        )
        .bind({ role: 'Master', status: 'Aprovado', email: masterEmail })
        .execute()
    } catch (_) {}
  },
  (app) => {},
)
