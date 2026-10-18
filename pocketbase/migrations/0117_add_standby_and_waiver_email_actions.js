migrate(
  (app) => {
    // 1. Atualizar coleção waiver_requests para incluir 'Standby' no campo status e adicionar approver_id
    const requestsCol = app.findCollectionByNameOrId('waiver_requests')

    const statusField = requestsCol.fields.getByName('status')
    if (statusField) {
      requestsCol.fields.removeByName('status')
    }
    requestsCol.fields.add(
      new SelectField({
        name: 'status',
        values: ['Pendente', 'Em análise', 'Standby', 'Aprovada', 'Negociada', 'Recusada'],
        maxSelect: 1,
      }),
    )

    if (!requestsCol.fields.getByName('approver_id')) {
      requestsCol.fields.add(
        new RelationField({
          name: 'approver_id',
          collectionId: '_pb_users_auth_',
          maxSelect: 1,
          required: false,
        }),
      )
    }

    app.save(requestsCol)

    // 2. Criar coleção waiver_decision_tokens para aprovação/rejeição/standby via e-mail seguro
    let tokensCol
    try {
      tokensCol = app.findCollectionByNameOrId('waiver_decision_tokens')
    } catch (_) {}

    if (!tokensCol) {
      tokensCol = new Collection({
        name: 'waiver_decision_tokens',
        type: 'base',
        listRule: null,
        viewRule: null,
        createRule: null,
        updateRule: null,
        deleteRule: null,
        fields: [
          {
            name: 'waiver_request',
            type: 'relation',
            collectionId: requestsCol.id,
            required: true,
            cascadeDelete: true,
            maxSelect: 1,
          },
          { name: 'token', type: 'text', required: true },
          { name: 'approver_email', type: 'text' },
          {
            name: 'approver_user',
            type: 'relation',
            collectionId: '_pb_users_auth_',
            maxSelect: 1,
          },
          { name: 'used', type: 'bool' },
          { name: 'action', type: 'text' },
          { name: 'expires_at', type: 'date', required: true },
          { name: 'used_at', type: 'date' },
          { name: 'created', type: 'autodate', onCreate: true, onUpdate: false },
          { name: 'updated', type: 'autodate', onCreate: true, onUpdate: true },
        ],
        indexes: [
          'CREATE UNIQUE INDEX idx_wdt_token ON waiver_decision_tokens (token)',
          'CREATE INDEX idx_wdt_request ON waiver_decision_tokens (waiver_request)',
        ],
      })
      app.save(tokensCol)
    }
  },
  (app) => {
    try {
      const tokensCol = app.findCollectionByNameOrId('waiver_decision_tokens')
      app.delete(tokensCol)
    } catch (_) {}

    try {
      const requestsCol = app.findCollectionByNameOrId('waiver_requests')
      const statusField = requestsCol.fields.getByName('status')
      if (statusField) {
        requestsCol.fields.removeByName('status')
        requestsCol.fields.add(
          new SelectField({
            name: 'status',
            values: ['Pendente', 'Em análise', 'Aprovada', 'Negociada', 'Recusada'],
            maxSelect: 1,
          }),
        )
      }
      if (requestsCol.fields.getByName('approver_id')) {
        requestsCol.fields.removeByName('approver_id')
      }
      app.save(requestsCol)
    } catch (_) {}
  },
)
