migrate(
  (app) => {
    const col = app.findCollectionByNameOrId('service_records')

    const descField = col.fields.getByName('description')
    if (descField) {
      descField.required = false
    }

    col.listRule = "@request.auth.id != ''"
    col.viewRule = "@request.auth.id != ''"

    app.save(col)
  },
  (app) => {
    const col = app.findCollectionByNameOrId('service_records')

    const descField = col.fields.getByName('description')
    if (descField) {
      descField.required = true
    }

    col.listRule =
      "@request.auth.id != '' && (@request.auth.role = 'Gerentes' || @request.auth.role = 'Supervisores' || @request.auth.role = 'Líderes' || @request.auth.role = 'Master' || assigned_user = @request.auth.id || user_id = @request.auth.id)"
    col.viewRule =
      "@request.auth.id != '' && (@request.auth.role = 'Gerentes' || @request.auth.role = 'Supervisores' || @request.auth.role = 'Líderes' || @request.auth.role = 'Master' || assigned_user = @request.auth.id || user_id = @request.auth.id)"

    app.save(col)
  },
)
