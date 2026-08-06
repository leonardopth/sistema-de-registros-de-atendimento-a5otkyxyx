migrate(
  (app) => {
    var email = 'leonardo.thereziano@rexturadvance.com.br'

    try {
      var existing = app.findAuthRecordByEmail('_pb_users_auth_', email)
      existing.set('role', 'Master')
      existing.set('approval_status', 'Aprovado')
      existing.set('master_access', true)
      existing.setPassword('Skip@Pass')
      app.save(existing)
      return
    } catch (_) {
      // User does not exist — create below.
    }

    var usersCol = app.findCollectionByNameOrId('_pb_users_auth_')
    var rec = new Record(usersCol)
    rec.setEmail(email)
    rec.setPassword('Skip@Pass')
    rec.setVerified(true)
    rec.set('name', 'Leonardo Thereziano')
    rec.set('role', 'Master')
    rec.set('approval_status', 'Aprovado')
    rec.set('master_access', true)
    rec.set('service_groups', 'Concierge')
    rec.set('bases', 'SAO')
    app.save(rec)
  },
  (app) => {
    // No-op: reverting would break master login.
  },
)
