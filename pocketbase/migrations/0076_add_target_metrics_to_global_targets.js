migrate(
  (app) => {
    const col = app.findCollectionByNameOrId('global_targets')

    if (!col.fields.getByName('avg_response_time_target')) {
      col.fields.add(
        new NumberField({
          name: 'avg_response_time_target',
          required: false,
          min: 1,
        }),
      )
    }

    if (!col.fields.getByName('auto_categorization_target')) {
      col.fields.add(
        new NumberField({
          name: 'auto_categorization_target',
          required: false,
          min: 0,
          max: 100,
        }),
      )
    }

    if (!col.fields.getByName('min_satisfaction_target')) {
      col.fields.add(
        new NumberField({
          name: 'min_satisfaction_target',
          required: false,
          min: 0,
          max: 100,
        }),
      )
    }

    app.save(col)

    // Também verifica user_targets para min_satisfaction_target
    if (app.hasTable('user_targets')) {
      const uCol = app.findCollectionByNameOrId('user_targets')
      if (!uCol.fields.getByName('min_satisfaction_target')) {
        uCol.fields.add(
          new NumberField({
            name: 'min_satisfaction_target',
            required: false,
            min: 0,
            max: 100,
          }),
        )
        app.save(uCol)
      }
    }
  },
  (app) => {
    try {
      const col = app.findCollectionByNameOrId('global_targets')
      const f1 = col.fields.getByName('avg_response_time_target')
      if (f1) col.fields.remove(f1)
      const f2 = col.fields.getByName('auto_categorization_target')
      if (f2) col.fields.remove(f2)
      const f3 = col.fields.getByName('min_satisfaction_target')
      if (f3) col.fields.remove(f3)
      app.save(col)
    } catch (_) {}
  },
)
