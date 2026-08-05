migrate(
  (app) => {
    const col = app.findCollectionByNameOrId('users')
    if (!col.fields.getByName('service_groups')) {
      col.fields.add(
        new SelectField({
          name: 'service_groups',
          required: false,
          values: ['Concierge', 'Exclusivo', 'LOT', 'BR1', 'BR2', 'SAO', 'SPI', 'SUL'],
          maxSelect: 8,
        }),
      )
    }
    app.save(col)
  },
  (app) => {
    const col = app.findCollectionByNameOrId('users')
    try {
      col.fields.removeByName('service_groups')
    } catch (_) {}
    app.save(col)
  },
)
