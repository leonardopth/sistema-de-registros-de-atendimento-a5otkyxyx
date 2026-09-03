migrate(
  (app) => {
    var srCol = app.findCollectionByNameOrId('service_records')
    if (!srCol.fields.getByName('is_reopened')) {
      srCol.fields.add(new BoolField({ name: 'is_reopened', required: false }))
    }
    if (!srCol.fields.getByName('reopened_at')) {
      srCol.fields.add(new DateField({ name: 'reopened_at', required: false }))
    }
    if (!srCol.fields.getByName('reopen_count')) {
      srCol.fields.add(new NumberField({ name: 'reopen_count', required: false, min: 0 }))
    }
    app.save(srCol)

    // Backfill histórico existente: se houver histórico de status com old_value='Concluído' ou reopen_justification não vazio
    try {
      app
        .db()
        .newQuery(`
        UPDATE service_records
        SET is_reopened = 1, reopen_count = 1
        WHERE (reopen_justification IS NOT NULL AND reopen_justification != '')
           OR id IN (
             SELECT service_record FROM service_record_history
             WHERE old_value = 'Concluído' AND (new_value = 'Aberto' OR new_value = 'Em Andamento')
           )
      `)
        .execute()
    } catch (e) {
      console.log('Backfill reopen error:', e)
    }
  },
  (app) => {
    var srCol = app.findCollectionByNameOrId('service_records')
    try {
      srCol.fields.removeByName('is_reopened')
    } catch (_) {}
    try {
      srCol.fields.removeByName('reopened_at')
    } catch (_) {}
    try {
      srCol.fields.removeByName('reopen_count')
    } catch (_) {}
    app.save(srCol)
  },
)
