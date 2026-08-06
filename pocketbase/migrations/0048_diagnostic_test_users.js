migrate(
  (app) => {
    var col = app.findCollectionByNameOrId('users')
    col.emailVisibility = true
    app.save(col)

    var testUsers = [
      { name: 'Teste Diagnostico 1', email: 'teste1@rexturadvance.com.br', role: 'Consultores' },
      { name: 'Teste Diagnostico 2', email: 'teste2@rexturadvance.com.br', role: 'Supervisores' },
      { name: 'Teste Diagnostico 3', email: 'teste3@rexturadvance.com.br', role: 'Gerentes' },
    ]

    var created = 0
    var skipped = 0

    for (var i = 0; i < testUsers.length; i++) {
      var t = testUsers[i]
      try {
        app.findAuthRecordByEmail('_pb_users_auth_', t.email)
        skipped++
      } catch (_) {
        var record = new Record(col)
        record.setEmail(t.email)
        record.setPassword('Skip@Pass')
        record.setVerified(true)
        record.set('name', t.name)
        record.set('role', t.role)
        record.set('approval_status', 'Aprovado')
        app.save(record)
        created++
      }
    }

    console.log('0048_diagnostic: created=' + created + ' skipped=' + skipped)
  },
  (app) => {
    var emails = [
      'teste1@rexturadvance.com.br',
      'teste2@rexturadvance.com.br',
      'teste3@rexturadvance.com.br',
    ]
    for (var i = 0; i < emails.length; i++) {
      try {
        var record = app.findAuthRecordByEmail('_pb_users_auth_', emails[i])
        app.delete(record)
      } catch (_) {}
    }
  },
)
