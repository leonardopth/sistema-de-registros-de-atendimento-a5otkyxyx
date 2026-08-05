migrate(
  (app) => {
    const col = app.findCollectionByNameOrId('account_executives')
    col.createRule =
      "@request.auth.id != '' && (@request.auth.role = 'Gerentes' || @request.auth.role = 'Supervisores' || @request.auth.role = 'Líderes' || @request.auth.role = 'Master')"
    col.updateRule =
      "@request.auth.id != '' && (@request.auth.role = 'Gerentes' || @request.auth.role = 'Supervisores' || @request.auth.role = 'Líderes' || @request.auth.role = 'Master')"
    col.deleteRule =
      "@request.auth.id != '' && (@request.auth.role = 'Gerentes' || @request.auth.role = 'Supervisores' || @request.auth.role = 'Líderes' || @request.auth.role = 'Master')"
    app.save(col)
  },
  (app) => {
    const col = app.findCollectionByNameOrId('account_executives')
    col.createRule =
      "@request.auth.id != '' && (@request.auth.role = 'Gerentes' || @request.auth.role = 'Supervisores' || @request.auth.role = 'Líderes')"
    col.updateRule =
      "@request.auth.id != '' && (@request.auth.role = 'Gerentes' || @request.auth.role = 'Supervisores' || @request.auth.role = 'Líderes')"
    col.deleteRule =
      "@request.auth.id != '' && (@request.auth.role = 'Gerentes' || @request.auth.role = 'Supervisores' || @request.auth.role = 'Líderes')"
    app.save(col)
  },
)
