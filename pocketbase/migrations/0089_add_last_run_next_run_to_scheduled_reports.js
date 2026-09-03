migrate(
  (app) => {
    const col = app.findCollectionByNameOrId('scheduled_reports')
    if (!col.fields.getByName('last_run')) {
      col.fields.add(new DateField({ name: 'last_run', required: false }))
    }
    if (!col.fields.getByName('next_run')) {
      col.fields.add(new DateField({ name: 'next_run', required: false }))
    }
    app.save(col)
  },
  (app) => {
    try {
      const col = app.findCollectionByNameOrId('scheduled_reports')
      if (col.fields.getByName('last_run')) col.fields.removeByName('last_run')
      if (col.fields.getByName('next_run')) col.fields.removeByName('next_run')
      app.save(col)
    } catch (_) {}
  },
)
