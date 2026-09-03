migrate(
  (app) => {
    // 1. Adicionar campos de status de disponibilidade no usuário se não existirem
    const usersCol = app.findCollectionByNameOrId('_pb_users_auth_')
    if (!usersCol.fields.getByName('current_status')) {
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
            'Offline',
          ],
          maxSelect: 1,
        }),
      )
    }
    if (!usersCol.fields.getByName('status_updated_at')) {
      usersCol.fields.add(
        new DateField({
          name: 'status_updated_at',
          required: false,
        }),
      )
    }
    app.save(usersCol)

    // 2. Criar coleção collaborator_status_logs
    if (!app.hasTable('collaborator_status_logs')) {
      const statusLogs = new Collection({
        name: 'collaborator_status_logs',
        type: 'base',
        listRule: "@request.auth.id != ''",
        viewRule: "@request.auth.id != ''",
        createRule: "@request.auth.id != ''",
        updateRule:
          "@request.auth.id != '' && (user = @request.auth.id || @request.auth.role = 'Master' || @request.auth.master_access = true)",
        deleteRule:
          "@request.auth.id != '' && (@request.auth.role = 'Master' || @request.auth.master_access = true)",
        fields: [
          {
            name: 'user',
            type: 'relation',
            required: true,
            collectionId: '_pb_users_auth_',
            cascadeDelete: true,
            maxSelect: 1,
          },
          {
            name: 'previous_status',
            type: 'select',
            required: false,
            values: [
              'Disponível',
              'Em atendimento',
              'Pausa',
              'Almoço',
              'Treinamento',
              'Reunião',
              'Offline',
            ],
            maxSelect: 1,
          },
          {
            name: 'new_status',
            type: 'select',
            required: true,
            values: [
              'Disponível',
              'Em atendimento',
              'Pausa',
              'Almoço',
              'Treinamento',
              'Reunião',
              'Offline',
            ],
            maxSelect: 1,
          },
          {
            name: 'started_at',
            type: 'date',
            required: true,
          },
          {
            name: 'ended_at',
            type: 'date',
            required: false,
          },
          {
            name: 'duration_seconds',
            type: 'number',
            required: false,
          },
          {
            name: 'note',
            type: 'text',
            required: false,
          },
          {
            name: 'created',
            type: 'autodate',
            onCreate: true,
            onUpdate: false,
          },
          {
            name: 'updated',
            type: 'autodate',
            onCreate: true,
            onUpdate: true,
          },
        ],
        indexes: [
          'CREATE INDEX idx_csl_user ON collaborator_status_logs (user)',
          'CREATE INDEX idx_csl_started ON collaborator_status_logs (started_at)',
          'CREATE INDEX idx_csl_user_started ON collaborator_status_logs (user, started_at DESC)',
        ],
      })
      app.save(statusLogs)
    }

    // 3. Adicionar campos de TFR em service_records
    const srCol = app.findCollectionByNameOrId('service_records')
    if (!srCol.fields.getByName('first_response_time')) {
      srCol.fields.add(
        new NumberField({
          name: 'first_response_time',
          required: false,
        }),
      )
    }
    if (!srCol.fields.getByName('first_response_at')) {
      srCol.fields.add(
        new DateField({
          name: 'first_response_at',
          required: false,
        }),
      )
    }
    app.save(srCol)

    // 4. Adicionar metas de TFR em global_targets e user_targets se não existirem
    const gtCol = app.findCollectionByNameOrId('global_targets')
    if (!gtCol.fields.getByName('tfr_target')) {
      gtCol.fields.add(
        new NumberField({
          name: 'tfr_target',
          required: false,
        }),
      )
      app.save(gtCol)
    }

    const utCol = app.findCollectionByNameOrId('user_targets')
    if (!utCol.fields.getByName('tfr_target')) {
      utCol.fields.add(
        new NumberField({
          name: 'tfr_target',
          required: false,
        }),
      )
      app.save(utCol)
    }
  },
  (app) => {
    if (app.hasTable('collaborator_status_logs')) {
      app.delete(app.findCollectionByNameOrId('collaborator_status_logs'))
    }
  },
)
