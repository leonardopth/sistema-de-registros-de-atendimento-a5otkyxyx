migrate(
  (app) => {
    const col = app.findCollectionByNameOrId('service_records')

    if (!col.fields.getByName('travel_type')) {
      col.fields.add(
        new SelectField({
          name: 'travel_type',
          required: true,
          values: ['Nacional', 'Internacional'],
          maxSelect: 1,
        }),
      )
    }

    const descField = col.fields.getByName('description')
    if (descField) {
      descField.required = false
    }

    app.save(col)
  },
  (app) => {
    const col = app.findCollectionByNameOrId('service_records')
    const field = col.fields.getByName('travel_type')
    if (field) {
      col.fields.remove(field)
    }
    app.save(col)
  },
)
