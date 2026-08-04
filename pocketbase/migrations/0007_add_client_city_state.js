migrate(
  (app) => {
    const col = app.findCollectionByNameOrId('clients')
    if (!col.fields.getByName('city')) {
      col.fields.add(new TextField({ name: 'city' }))
    }
    if (!col.fields.getByName('state')) {
      col.fields.add(new TextField({ name: 'state' }))
    }
    app.save(col)
  },
  (app) => {
    const col = app.findCollectionByNameOrId('clients')
    try {
      col.fields.removeByName('city')
    } catch (_) {}
    try {
      col.fields.removeByName('state')
    } catch (_) {}
    app.save(col)
  },
)
