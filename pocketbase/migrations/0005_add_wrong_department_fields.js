migrate(
  (app) => {
    const col = app.findCollectionByNameOrId('service_records')

    if (!col.fields.getByName('wrong_department')) {
      col.fields.add(
        new BoolField({
          name: 'wrong_department',
          required: false,
        }),
      )
    }

    if (!col.fields.getByName('wrong_department_explanation')) {
      col.fields.add(
        new TextField({
          name: 'wrong_department_explanation',
          required: false,
        }),
      )
    }

    app.save(col)
  },
  (app) => {
    const col = app.findCollectionByNameOrId('service_records')

    var wdField = col.fields.getByName('wrong_department')
    if (wdField) {
      col.fields.remove(wdField)
    }

    var wdeField = col.fields.getByName('wrong_department_explanation')
    if (wdeField) {
      col.fields.remove(wdeField)
    }

    app.save(col)
  },
)
