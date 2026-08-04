migrate(
  (app) => {
    const clientsCol = app.findCollectionByNameOrId('clients')

    let agentsCol
    try {
      agentsCol = app.findCollectionByNameOrId('agents')
    } catch (_) {
      const agents = new Collection({
        name: 'agents',
        type: 'base',
        listRule: "@request.auth.id != ''",
        viewRule: "@request.auth.id != ''",
        createRule: "@request.auth.id != ''",
        updateRule: "@request.auth.id != ''",
        deleteRule: "@request.auth.id != ''",
        fields: [
          { name: 'name', type: 'text', required: true },
          { name: 'email', type: 'text' },
          { name: 'phone', type: 'text' },
          {
            name: 'client_id',
            type: 'relation',
            required: true,
            collectionId: clientsCol.id,
            cascadeDelete: true,
            maxSelect: 1,
          },
          { name: 'created', type: 'autodate', onCreate: true, onUpdate: false },
          { name: 'updated', type: 'autodate', onCreate: true, onUpdate: true },
        ],
        indexes: ['CREATE INDEX idx_agents_client ON agents (client_id)'],
      })
      app.save(agents)
      agentsCol = app.findCollectionByNameOrId('agents')
    }

    const existingClients = app.findRecordsByFilter('clients', "id != ''", '', 0, 0)
    for (const c of existingClients) {
      try {
        app.findFirstRecordByData('agents', 'client_id', c.id)
      } catch (_) {
        const rec = new Record(agentsCol)
        rec.set('name', c.getString('name'))
        rec.set('email', c.getString('email'))
        rec.set('phone', c.getString('phone'))
        rec.set('client_id', c.id)
        app.save(rec)
      }
    }
  },
  (app) => {
    try {
      const col = app.findCollectionByNameOrId('agents')
      app.delete(col)
    } catch (_) {}
  },
)
