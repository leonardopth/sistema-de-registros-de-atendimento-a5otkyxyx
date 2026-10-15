migrate(
  (app) => {
    // 1. Atualizar coleção service_records:
    //    - origin (select: 'Manual', 'E-mail (Torre)')
    //    - control_tower_email (relation -> control_tower_emails)
    //    - thread_id (text)
    //    - control_tower_inbox (text)
    const srCol = app.findCollectionByNameOrId('service_records')
    const cteCol = app.findCollectionByNameOrId('control_tower_emails')

    if (!srCol.fields.getByName('origin')) {
      srCol.fields.add(
        new SelectField({
          name: 'origin',
          values: ['Manual', 'E-mail (Torre)'],
          maxSelect: 1,
        }),
      )
    }

    if (!srCol.fields.getByName('control_tower_email')) {
      srCol.fields.add(
        new RelationField({
          name: 'control_tower_email',
          collectionId: cteCol.id,
          maxSelect: 1,
        }),
      )
    }

    if (!srCol.fields.getByName('thread_id')) {
      srCol.fields.add(
        new TextField({
          name: 'thread_id',
        }),
      )
    }

    if (!srCol.fields.getByName('control_tower_inbox')) {
      srCol.fields.add(
        new TextField({
          name: 'control_tower_inbox',
        }),
      )
    }

    app.save(srCol)

    // Adicionar índices úteis em service_records
    try {
      srCol.addIndex('idx_sr_origin', false, 'origin', '')
      srCol.addIndex('idx_sr_cte', false, 'control_tower_email', '')
      srCol.addIndex('idx_sr_thread_id', false, 'thread_id', '')
      app.save(srCol)
    } catch (_) {}

    // 2. Atualizar coleção control_tower_emails:
    //    - service_record (relation -> service_records)
    if (!cteCol.fields.getByName('service_record')) {
      cteCol.fields.add(
        new RelationField({
          name: 'service_record',
          collectionId: srCol.id,
          maxSelect: 1,
        }),
      )
      app.save(cteCol)
    }

    try {
      cteCol.addIndex('idx_cte_sr', false, 'service_record', '')
      app.save(cteCol)
    } catch (_) {}

    // 3. Retro-preencher registros antigos/existentes de service_records como 'Manual'
    // Idempotente via SQL: apenas onde origin for NULL ou vazio
    try {
      app
        .db()
        .newQuery(
          "UPDATE service_records SET origin = 'Manual' WHERE origin IS NULL OR origin = ''",
        )
        .execute()
    } catch (e) {
      console.log('Backfill service_records origin Manual:', e)
    }
  },
  (app) => {
    try {
      const srCol = app.findCollectionByNameOrId('service_records')
      const f1 = srCol.fields.getByName('origin')
      if (f1) srCol.fields.remove(f1)
      const f2 = srCol.fields.getByName('control_tower_email')
      if (f2) srCol.fields.remove(f2)
      const f3 = srCol.fields.getByName('thread_id')
      if (f3) srCol.fields.remove(f3)
      const f4 = srCol.fields.getByName('control_tower_inbox')
      if (f4) srCol.fields.remove(f4)
      app.save(srCol)
    } catch (_) {}

    try {
      const cteCol = app.findCollectionByNameOrId('control_tower_emails')
      const fSr = cteCol.fields.getByName('service_record')
      if (fSr) {
        cteCol.fields.remove(fSr)
        app.save(cteCol)
      }
    } catch (_) {}
  },
)
