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
        app.truncateCollection(app.findCollectionByNameOrId(collections[i]))
      } catch (_) {}
    }

    var allUsers = app.findRecordsByFilter('users', "id != ''", '', 0, 0)
    for (var j = 0; j < allUsers.length; j++) {
      if (allUsers[j].getString('email') !== masterEmail) {
        app.delete(allUsers[j])
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
