migrate(
  (app) => {
    var srCol = app.findCollectionByNameOrId('service_records')
    srCol.listRule =
      "@request.auth.id != '' && (@request.auth.role != 'Consultores' || assigned_user = @request.auth.id || user_id = @request.auth.id)"
    srCol.viewRule =
      "@request.auth.id != '' && (@request.auth.role != 'Consultores' || assigned_user = @request.auth.id || user_id = @request.auth.id)"
    srCol.createRule = "@request.auth.id != ''"
    srCol.updateRule =
      "@request.auth.id != '' && (@request.auth.role != 'Consultores' || assigned_user = @request.auth.id || user_id = @request.auth.id)"
    srCol.deleteRule =
      "@request.auth.id != '' && (@request.auth.role != 'Consultores' || assigned_user = @request.auth.id || user_id = @request.auth.id)"
    app.save(srCol)

    var agentsCol = app.findCollectionByNameOrId('agents')
    agentsCol.listRule = "@request.auth.id != ''"
    agentsCol.viewRule = "@request.auth.id != ''"
    agentsCol.createRule = "@request.auth.id != '' && @request.auth.role != 'Consultores'"
    agentsCol.updateRule = "@request.auth.id != '' && @request.auth.role != 'Consultores'"
    agentsCol.deleteRule = "@request.auth.id != '' && @request.auth.role != 'Consultores'"
    app.save(agentsCol)

    var usersCol = app.findCollectionByNameOrId('_pb_users_auth_')
    try {
      app.findAuthRecordByEmail('_pb_users_auth_', 'consultor.teste@example.com')
    } catch (_) {
      var rec = new Record(usersCol)
      rec.setEmail('consultor.teste@example.com')
      rec.setPassword('Skip@Pass')
      rec.setVerified(true)
      rec.set('name', 'Consultor Teste')
      rec.set('role', 'Consultores')
      app.save(rec)
    }
  },
  (app) => {
    var srCol = app.findCollectionByNameOrId('service_records')
    srCol.listRule = 'assigned_user = @request.auth.id || user_id = @request.auth.id'
    srCol.viewRule = 'assigned_user = @request.auth.id || user_id = @request.auth.id'
    srCol.createRule = "@request.auth.id != ''"
    srCol.updateRule = 'assigned_user = @request.auth.id || user_id = @request.auth.id'
    srCol.deleteRule = 'assigned_user = @request.auth.id || user_id = @request.auth.id'
    app.save(srCol)

    var agentsCol = app.findCollectionByNameOrId('agents')
    agentsCol.createRule = "@request.auth.id != ''"
    agentsCol.updateRule = "@request.auth.id != ''"
    agentsCol.deleteRule = "@request.auth.id != ''"
    app.save(agentsCol)

    try {
      var rec = app.findAuthRecordByEmail('_pb_users_auth_', 'consultor.teste@example.com')
      app.delete(rec)
    } catch (_) {}
  },
)
