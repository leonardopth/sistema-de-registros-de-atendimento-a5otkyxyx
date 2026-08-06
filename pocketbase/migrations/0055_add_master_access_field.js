migrate(
  (app) => {
    var usersCol = app.findCollectionByNameOrId('_pb_users_auth_')
    if (!usersCol.fields.getByName('master_access')) {
      usersCol.fields.add(new BoolField({ name: 'master_access' }))
    }
    usersCol.updateRule =
      "id = @request.auth.id || @request.auth.role = 'Master' || @request.auth.master_access = true"
    usersCol.deleteRule =
      "id = @request.auth.id || @request.auth.role = 'Master' || @request.auth.master_access = true"
    app.save(usersCol)

    var srCol = app.findCollectionByNameOrId('service_records')
    srCol.deleteRule =
      "@request.auth.id != '' && (@request.auth.role = 'Gerentes' || @request.auth.role = 'Supervisores' || @request.auth.role = 'Líderes' || @request.auth.role = 'Master' || @request.auth.master_access = true || assigned_user = @request.auth.id || user_id = @request.auth.id)"
    app.save(srCol)

    var aeCol = app.findCollectionByNameOrId('account_executives')
    var aeRule =
      "@request.auth.id != '' && (@request.auth.role = 'Gerentes' || @request.auth.role = 'Supervisores' || @request.auth.role = 'Líderes' || @request.auth.role = 'Master' || @request.auth.master_access = true)"
    aeCol.createRule = aeRule
    aeCol.updateRule = aeRule
    aeCol.deleteRule = aeRule
    app.save(aeCol)

    var trCol = app.findCollectionByNameOrId('trainings')
    var trRule =
      '@request.auth.id != "" && (@request.auth.role = "Gerentes" || @request.auth.role = "Supervisores" || @request.auth.role = "Líderes" || @request.auth.role = "Master" || @request.auth.master_access = true)'
    trCol.updateRule = trRule
    trCol.deleteRule = trRule
    app.save(trCol)

    var fbCol = app.findCollectionByNameOrId('feedback')
    fbCol.deleteRule =
      '@request.auth.id != "" && (@request.auth.role = "Master" || @request.auth.master_access = true)'
    app.save(fbCol)

    var agCol = app.findCollectionByNameOrId('agents')
    var agRule =
      "@request.auth.id != '' && (@request.auth.role != 'Consultores' || @request.auth.master_access = true)"
    agCol.createRule = agRule
    agCol.updateRule = agRule
    agCol.deleteRule = agRule
    app.save(agCol)
  },
  (app) => {
    var usersCol = app.findCollectionByNameOrId('_pb_users_auth_')
    usersCol.updateRule = "id = @request.auth.id || @request.auth.role = 'Master'"
    usersCol.deleteRule = "id = @request.auth.id || @request.auth.role = 'Master'"
    app.save(usersCol)

    var srCol = app.findCollectionByNameOrId('service_records')
    srCol.deleteRule =
      "@request.auth.id != '' && (@request.auth.role = 'Gerentes' || @request.auth.role = 'Supervisores' || @request.auth.role = 'Líderes' || @request.auth.role = 'Master' || assigned_user = @request.auth.id || user_id = @request.auth.id)"
    app.save(srCol)

    var aeCol = app.findCollectionByNameOrId('account_executives')
    var aeRule =
      "@request.auth.id != '' && (@request.auth.role = 'Gerentes' || @request.auth.role = 'Supervisores' || @request.auth.role = 'Líderes' || @request.auth.role = 'Master')"
    aeCol.createRule = aeRule
    aeCol.updateRule = aeRule
    aeCol.deleteRule = aeRule
    app.save(aeCol)

    var trCol = app.findCollectionByNameOrId('trainings')
    var trRule =
      '@request.auth.id != "" && (@request.auth.role = "Gerentes" || @request.auth.role = "Supervisores" || @request.auth.role = "Líderes" || @request.auth.role = "Master")'
    trCol.updateRule = trRule
    trCol.deleteRule = trRule
    app.save(trCol)

    var fbCol = app.findCollectionByNameOrId('feedback')
    fbCol.deleteRule = '@request.auth.id != "" && @request.auth.role = "Master"'
    app.save(fbCol)

    var agCol = app.findCollectionByNameOrId('agents')
    var agRule = "@request.auth.id != '' && @request.auth.role != 'Consultores'"
    agCol.createRule = agRule
    agCol.updateRule = agRule
    agCol.deleteRule = agRule
    app.save(agCol)
  },
)
