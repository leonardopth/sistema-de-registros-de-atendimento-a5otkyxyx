migrate(
  (app) => {
    var col = app.findCollectionByNameOrId('clients')

    if (!col.fields.getByName('blocked')) {
      col.fields.add(new BoolField({ name: 'blocked' }))
    }
    if (!col.fields.getByName('block_reason')) {
      col.fields.add(new TextField({ name: 'block_reason' }))
    }
    if (!col.fields.getByName('blocked_by')) {
      col.fields.add(
        new RelationField({
          name: 'blocked_by',
          collectionId: '_pb_users_auth_',
          maxSelect: 1,
        }),
      )
    }
    if (!col.fields.getByName('blocked_at')) {
      col.fields.add(new DateField({ name: 'blocked_at' }))
    }

    col.deleteRule =
      "@request.auth.id != '' && (@request.auth.role = 'Gerentes' || @request.auth.role = 'Master' || @request.auth.master_access = true)"

    app.save(col)
  },
  (app) => {
    var col = app.findCollectionByNameOrId('clients')
    try {
      col.fields.removeByName('blocked')
    } catch (_) {}
    try {
      col.fields.removeByName('block_reason')
    } catch (_) {}
    try {
      col.fields.removeByName('blocked_by')
    } catch (_) {}
    try {
      col.fields.removeByName('blocked_at')
    } catch (_) {}
    col.deleteRule = "@request.auth.id != ''"
    app.save(col)
  },
)
