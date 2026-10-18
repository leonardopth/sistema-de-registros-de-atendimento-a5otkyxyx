migrate(
  (app) => {
    const col = app.findCollectionByNameOrId('waiver_configs')

    if (!col.fields.getByName('approvers_gol')) {
      col.fields.add(new JSONField({ name: 'approvers_gol' }))
    }
    if (!col.fields.getByName('approvers_aa')) {
      col.fields.add(new JSONField({ name: 'approvers_aa' }))
    }
    if (!col.fields.getByName('approvers_latam2')) {
      col.fields.add(new JSONField({ name: 'approvers_latam2' }))
    }

    app.save(col)

    // Atualiza o registro existente com valores padrão caso não estejam preenchidos
    try {
      const records = app.findRecordsByFilter('waiver_configs', "id != ''", '-created', 1, 0)
      if (records && records.length > 0) {
        const record = records[0]
        if (!record.get('approvers_gol')) {
          record.set('approvers_gol', [
            'Gerência Operacional',
            'Supervisão GOL',
            'Coordenação de Atendimento',
            'Plantão CCO',
          ])
        }
        if (!record.get('approvers_aa')) {
          record.set('approvers_aa', [
            'Gerência Operacional',
            'Supervisão American Airlines',
            'Coordenação de Atendimento',
          ])
        }
        if (!record.get('approvers_latam2')) {
          record.set('approvers_latam2', [
            'Katia Vieira',
            'Ruana Recio',
            'Gerência Operacional',
            'Supervisão LATAM',
          ])
        }
        app.save(record)
      }
    } catch (err) {
      console.log('Aviso ao inicializar approvers nos waiver_configs:', err)
    }
  },
  (app) => {
    try {
      const col = app.findCollectionByNameOrId('waiver_configs')
      const golField = col.fields.getByName('approvers_gol')
      if (golField) col.fields.removeByName('approvers_gol')
      const aaField = col.fields.getByName('approvers_aa')
      if (aaField) col.fields.removeByName('approvers_aa')
      const latam2Field = col.fields.getByName('approvers_latam2')
      if (latam2Field) col.fields.removeByName('approvers_latam2')
      app.save(col)
    } catch (_) {}
  },
)
