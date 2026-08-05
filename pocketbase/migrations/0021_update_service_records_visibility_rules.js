migrate(
  (app) => {
    const col = app.findCollectionByNameOrId('service_records')
    const rule =
      "@request.auth.id != '' && (@request.auth.role = 'Gerentes' || @request.auth.role = 'Supervisores' || @request.auth.role = 'Líderes' || assigned_user = @request.auth.id || user_id = @request.auth.id)"
    col.listRule = rule
    col.viewRule = rule
    col.updateRule = rule
    col.deleteRule = rule
    app.save(col)
  },
  (app) => {
    const col = app.findCollectionByNameOrId('service_records')
    const rule =
      "@request.auth.id != '' && (@request.auth.role != 'Consultores' || assigned_user = @request.auth.id || user_id = @request.auth.id)"
    col.listRule = rule
    col.viewRule = rule
    col.updateRule = rule
    col.deleteRule = rule
    app.save(col)
  },
)
