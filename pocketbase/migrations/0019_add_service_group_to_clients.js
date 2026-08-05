migrate(
  (app) => {
    const col = app.findCollectionByNameOrId('clients')
    if (!col.fields.getByName('service_group')) {
      col.fields.add(
        new SelectField({
          name: 'service_group',
          required: true,
          values: ['Concierge', 'Exclusivo', 'LOT', 'BR1', 'BR2', 'SAO', 'SPI', 'SUL'],
          maxSelect: 1,
        }),
      )
    }
    app.save(col)
  },
  (app) => {
    const col = app.findCollectionByNameOrId('clients')
    try {
      col.fields.removeByName('service_group')
    } catch (_) {}
    app.save(col)
  },
)
