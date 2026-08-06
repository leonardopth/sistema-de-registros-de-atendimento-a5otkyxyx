migrate(
  (app) => {
    const col = app.findCollectionByNameOrId('service_records')
    col.updateRule = "@request.auth.id != ''"
    app.save(col)
  },
  (app) => {
    const col = app.findCollectionByNameOrId('service_records')
    col.updateRule =
      "@request.auth.id != '' && (@request.auth.role = 'Gerentes' || @request.auth.role = 'Supervisores' || @request.auth.role = 'Líderes' || @request.auth.role = 'Master' || assigned_user = @request.auth.id || user_id = @request.auth.id)"
    app.save(col)
  },
)
