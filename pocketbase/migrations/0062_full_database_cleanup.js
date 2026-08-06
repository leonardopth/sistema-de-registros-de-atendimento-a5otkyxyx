migrate(
  (app) => {
    var adminEmail = 'leonardopth@gmail.com'

    var collections = [
      'service_record_history',
      'service_record_shares',
      'master_access_history',
      'audit_log',
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
        .bind({ email: adminEmail })
        .execute()
    } catch (_) {}

    var usersCol = app.findCollectionByNameOrId('_pb_users_auth_')
    var admin
    try {
      admin = app.findAuthRecordByEmail('_pb_users_auth_', adminEmail)
    } catch (_) {
      admin = new Record(usersCol)
      admin.setEmail(adminEmail)
      admin.setPassword('Skip@Pass')
      admin.setVerified(true)
    }
    admin.set('name', 'Administrador')
    admin.set('role', 'Master')
    admin.set('approval_status', 'Aprovado')
    admin.set('master_access', true)
    app.save(admin)
  },
  (app) => {},
)
