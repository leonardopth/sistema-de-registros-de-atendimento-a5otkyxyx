migrate(
  (app) => {
    // Fix the master user record in case the old on_user_create hook
    // overwrote role/approval_status when the seed migration ran.
    try {
      var master = app.findAuthRecordByEmail(
        '_pb_users_auth_',
        'leonardo.thereziano@rexturadvance.com.br',
      )
      master.set('role', 'Master')
      master.set('approval_status', 'Aprovado')
      app.save(master)
    } catch (_) {
      // Master user does not exist yet — create it.
      var usersCol = app.findCollectionByNameOrId('_pb_users_auth_')
      var rec = new Record(usersCol)
      rec.setEmail('leonardo.thereziano@rexturadvance.com.br')
      rec.setPassword('Skip@Pass')
      rec.setVerified(true)
      rec.set('name', 'Leonardo Thereziano')
      rec.set('role', 'Master')
      rec.set('approval_status', 'Aprovado')
      app.save(rec)
    }
  },
  (app) => {
    // No-op: reverting would break master login.
  },
)
