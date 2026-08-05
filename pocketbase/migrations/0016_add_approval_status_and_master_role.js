migrate(
  (app) => {
    var usersCol = app.findCollectionByNameOrId('_pb_users_auth_')

    if (usersCol.fields.getByName('role')) {
      usersCol.fields.removeByName('role')
    }
    usersCol.fields.add(
      new SelectField({
        name: 'role',
        required: true,
        values: [
          'Gerentes',
          'Supervisores',
          'Líderes',
          'Consultores',
          'Executivo de contas',
          'Master',
        ],
        maxSelect: 1,
      }),
    )

    if (!usersCol.fields.getByName('approval_status')) {
      usersCol.fields.add(
        new SelectField({
          name: 'approval_status',
          required: false,
          values: ['Pendente', 'Aprovado', 'Rejeitado'],
          maxSelect: 1,
        }),
      )
    }

    usersCol.updateRule = "id = @request.auth.id || @request.auth.role = 'Master'"
    usersCol.deleteRule = "id = @request.auth.id || @request.auth.role = 'Master'"

    usersCol.addIndex('idx_users_approval_status', false, 'approval_status', '')

    app.save(usersCol)

    var allUsers = app.findRecordsByFilter('users', "id != ''", '', 0, 0)
    for (var i = 0; i < allUsers.length; i++) {
      var u = allUsers[i]
      if (!u.getString('approval_status')) {
        u.set('approval_status', 'Aprovado')
        app.save(u)
      }
    }

    try {
      app.findAuthRecordByEmail('_pb_users_auth_', 'leonardo.thereziano@rexturadvance.com.br')
    } catch (_) {
      var masterRec = new Record(usersCol)
      masterRec.setEmail('leonardo.thereziano@rexturadvance.com.br')
      masterRec.setPassword('Skip@Pass')
      masterRec.setVerified(true)
      masterRec.set('name', 'Leonardo Thereziano')
      masterRec.set('role', 'Master')
      masterRec.set('approval_status', 'Aprovado')
      app.save(masterRec)
    }
  },
  (app) => {
    var usersCol = app.findCollectionByNameOrId('_pb_users_auth_')

    if (usersCol.fields.getByName('role')) {
      usersCol.fields.removeByName('role')
    }
    usersCol.fields.add(
      new SelectField({
        name: 'role',
        required: true,
        values: ['Gerentes', 'Supervisores', 'Líderes', 'Consultores'],
        maxSelect: 1,
      }),
    )

    if (usersCol.fields.getByName('approval_status')) {
      usersCol.fields.removeByName('approval_status')
    }

    usersCol.updateRule = 'id = @request.auth.id'
    usersCol.deleteRule = 'id = @request.auth.id'

    try {
      usersCol.removeIndex('idx_users_approval_status')
    } catch (_) {}

    app.save(usersCol)

    try {
      var master = app.findAuthRecordByEmail(
        '_pb_users_auth_',
        'leonardo.thereziano@rexturadvance.com.br',
      )
      app.delete(master)
    } catch (_) {}
  },
)
