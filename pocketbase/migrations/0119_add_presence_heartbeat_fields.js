migrate(
  (app) => {
    // 1. Atualizar a coleção users:
    // - Garantir que current_status inclua 'Ausente'
    // - Adicionar last_heartbeat_at (DateField)
    // - Adicionar presence_source (SelectField: auto | manual)
    const usersCol = app.findCollectionByNameOrId('_pb_users_auth_')

    const statusField = usersCol.fields.getByName('current_status')
    if (statusField) {
      statusField.values = [
        'Disponível',
        'Em atendimento',
        'Pausa',
        'Almoço',
        'Treinamento',
        'Reunião',
        'Ausente',
        'Offline',
      ]
    } else {
      usersCol.fields.add(
        new SelectField({
          name: 'current_status',
          required: false,
          values: [
            'Disponível',
            'Em atendimento',
            'Pausa',
            'Almoço',
            'Treinamento',
            'Reunião',
            'Ausente',
            'Offline',
          ],
          maxSelect: 1,
        }),
      )
    }

    if (!usersCol.fields.getByName('last_heartbeat_at')) {
      usersCol.fields.add(
        new DateField({
          name: 'last_heartbeat_at',
          required: false,
        }),
      )
    }

    if (!usersCol.fields.getByName('presence_source')) {
      usersCol.fields.add(
        new SelectField({
          name: 'presence_source',
          required: false,
          values: ['auto', 'manual'],
          maxSelect: 1,
        }),
      )
    }

    app.save(usersCol)

    // 2. Atualizar collaborator_status_logs para permitir 'Ausente'
    if (app.hasTable('collaborator_status_logs')) {
      const logsCol = app.findCollectionByNameOrId('collaborator_status_logs')
      const prevField = logsCol.fields.getByName('previous_status')
      if (prevField) {
        prevField.values = [
          'Disponível',
          'Em atendimento',
          'Pausa',
          'Almoço',
          'Treinamento',
          'Reunião',
          'Ausente',
          'Offline',
        ]
      }
      const newField = logsCol.fields.getByName('new_status')
      if (newField) {
        newField.values = [
          'Disponível',
          'Em atendimento',
          'Pausa',
          'Almoço',
          'Treinamento',
          'Reunião',
          'Ausente',
          'Offline',
        ]
      }
      app.save(logsCol)
    }
  },
  (app) => {
    const usersCol = app.findCollectionByNameOrId('_pb_users_auth_')
    if (usersCol.fields.getByName('last_heartbeat_at')) {
      usersCol.fields.removeByName('last_heartbeat_at')
    }
    if (usersCol.fields.getByName('presence_source')) {
      usersCol.fields.removeByName('presence_source')
    }
    app.save(usersCol)
  },
)
