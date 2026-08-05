migrate(
  (app) => {
    var col = app.findCollectionByNameOrId('_pb_users_auth_')

    if (!col.fields.getByName('approved_by')) {
      col.fields.add(new TextField({ name: 'approved_by' }))
    }
    if (!col.fields.getByName('approved_by_id')) {
      col.fields.add(new TextField({ name: 'approved_by_id' }))
    }
    if (!col.fields.getByName('approved_at')) {
      col.fields.add(new DateField({ name: 'approved_at' }))
    }

    app.save(col)
  },
  (app) => {
    var col = app.findCollectionByNameOrId('_pb_users_auth_')

    try {
      col.fields.removeByName('approved_by')
    } catch (_) {}
    try {
      col.fields.removeByName('approved_by_id')
    } catch (_) {}
    try {
      col.fields.removeByName('approved_at')
    } catch (_) {}

    app.save(col)
  },
)
