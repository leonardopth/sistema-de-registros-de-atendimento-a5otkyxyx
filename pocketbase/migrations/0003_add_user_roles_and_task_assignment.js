migrate(
  (app) => {
    const usersCol = app.findCollectionByNameOrId('_pb_users_auth_')

    if (!usersCol.fields.getByName('role')) {
      usersCol.fields.add(
        new SelectField({
          name: 'role',
          required: true,
          values: ['Gerentes', 'Supervisores', 'Líderes', 'Consultores'],
          maxSelect: 1,
        }),
      )
    }
    usersCol.listRule = "@request.auth.id != ''"
    usersCol.viewRule = "@request.auth.id != ''"
    usersCol.addIndex('idx_users_role', false, 'role', '')
    app.save(usersCol)

    var allUsers = app.findRecordsByFilter('users', "id != ''", '', 0, 0)
    for (var i = 0; i < allUsers.length; i++) {
      var u = allUsers[i]
      if (!u.getString('role')) {
        if (u.getString('email') === 'leonardopth@gmail.com') {
          u.set('role', 'Gerentes')
        } else {
          u.set('role', 'Consultores')
        }
        app.save(u)
      }
    }

    const srCol = app.findCollectionByNameOrId('service_records')

    if (!srCol.fields.getByName('assigned_user')) {
      srCol.fields.add(
        new RelationField({
          name: 'assigned_user',
          required: true,
          collectionId: '_pb_users_auth_',
          cascadeDelete: false,
          maxSelect: 1,
        }),
      )
    }
    srCol.listRule = 'assigned_user = @request.auth.id || user_id = @request.auth.id'
    srCol.viewRule = 'assigned_user = @request.auth.id || user_id = @request.auth.id'
    srCol.createRule = "@request.auth.id != ''"
    srCol.updateRule = 'assigned_user = @request.auth.id || user_id = @request.auth.id'
    srCol.deleteRule = 'assigned_user = @request.auth.id || user_id = @request.auth.id'
    srCol.addIndex('idx_sr_assigned_user', false, 'assigned_user', '')
    app.save(srCol)

    var allRecords = app.findRecordsByFilter('service_records', "id != ''", '', 0, 0)
    for (var j = 0; j < allRecords.length; j++) {
      var r = allRecords[j]
      if (!r.getString('assigned_user')) {
        var userId = r.getString('user_id')
        if (userId) {
          r.set('assigned_user', userId)
          app.save(r)
        }
      }
    }
  },
  (app) => {
    var usersCol = app.findCollectionByNameOrId('_pb_users_auth_')
    var roleField = usersCol.fields.getByName('role')
    if (roleField) {
      usersCol.fields.remove(roleField)
    }
    usersCol.listRule = 'id = @request.auth.id'
    usersCol.viewRule = 'id = @request.auth.id'
    usersCol.removeIndex('idx_users_role')
    app.save(usersCol)

    var srCol = app.findCollectionByNameOrId('service_records')
    var auField = srCol.fields.getByName('assigned_user')
    if (auField) {
      srCol.fields.remove(auField)
    }
    srCol.listRule = "@request.auth.id != ''"
    srCol.viewRule = "@request.auth.id != ''"
    srCol.createRule = "@request.auth.id != ''"
    srCol.updateRule = "@request.auth.id != ''"
    srCol.deleteRule = "@request.auth.id != ''"
    srCol.removeIndex('idx_sr_assigned_user')
    app.save(srCol)
  },
)
