migrate(
  (app) => {
    const col = app.findCollectionByNameOrId('service_records')

    if (!col.fields.getByName('avoidable_contact')) {
      col.fields.add(new BoolField({ name: 'avoidable_contact', required: false }))
    }
    if (!col.fields.getByName('avoidable_contact_explanation')) {
      col.fields.add(new TextField({ name: 'avoidable_contact_explanation', required: false }))
    }
    app.save(col)

    app
      .db()
      .newQuery(
        'UPDATE service_records SET avoidable_contact = wrong_department, avoidable_contact_explanation = COALESCE(wrong_department_explanation, "")',
      )
      .execute()

    const col2 = app.findCollectionByNameOrId('service_records')
    try {
      col2.fields.removeByName('wrong_department')
    } catch (_) {}
    try {
      col2.fields.removeByName('wrong_department_explanation')
    } catch (_) {}
    app.save(col2)
  },
  (app) => {
    const col = app.findCollectionByNameOrId('service_records')

    if (!col.fields.getByName('wrong_department')) {
      col.fields.add(new BoolField({ name: 'wrong_department', required: false }))
    }
    if (!col.fields.getByName('wrong_department_explanation')) {
      col.fields.add(new TextField({ name: 'wrong_department_explanation', required: false }))
    }
    app.save(col)

    app
      .db()
      .newQuery(
        'UPDATE service_records SET wrong_department = avoidable_contact, wrong_department_explanation = COALESCE(avoidable_contact_explanation, "")',
      )
      .execute()

    const col2 = app.findCollectionByNameOrId('service_records')
    try {
      col2.fields.removeByName('avoidable_contact')
    } catch (_) {}
    try {
      col2.fields.removeByName('avoidable_contact_explanation')
    } catch (_) {}
    app.save(col2)
  },
)
