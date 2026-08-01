migrate(
  (app) => {
    const clients = new Collection({
      name: 'clients',
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
        { name: 'company', type: 'text' },
        { name: 'notes', type: 'text' },
        { name: 'created', type: 'autodate', onCreate: true, onUpdate: false },
        { name: 'updated', type: 'autodate', onCreate: true, onUpdate: true },
      ],
      indexes: ['CREATE INDEX idx_clients_name ON clients (name)'],
    })
    app.save(clients)

    const serviceRecords = new Collection({
      name: 'service_records',
      type: 'base',
      listRule: "@request.auth.id != ''",
      viewRule: "@request.auth.id != ''",
      createRule: "@request.auth.id != ''",
      updateRule: "@request.auth.id != ''",
      deleteRule: "@request.auth.id != ''",
      fields: [
        { name: 'client_name', type: 'text', required: true },
        { name: 'client_email', type: 'text' },
        { name: 'client_phone', type: 'text' },
        { name: 'client_company', type: 'text' },
        {
          name: 'contact_reason',
          type: 'select',
          required: true,
          values: ['Dúvida', 'Reclamação', 'Suporte Técnico', 'Orçamento', 'Cancelamento', 'Outro'],
          maxSelect: 1,
        },
        { name: 'description', type: 'text', required: true },
        {
          name: 'priority',
          type: 'select',
          required: true,
          values: ['Baixa', 'Média', 'Alta'],
          maxSelect: 1,
        },
        {
          name: 'status',
          type: 'select',
          required: true,
          values: ['Aberto', 'Em Andamento', 'Concluído', 'Cancelado'],
          maxSelect: 1,
        },
        { name: 'start_time', type: 'date', required: true },
        { name: 'duration', type: 'number' },
        { name: 'end_time', type: 'date' },
        { name: 'assigned_agent', type: 'text' },
        { name: 'tasks', type: 'json' },
        {
          name: 'user_id',
          type: 'relation',
          required: true,
          collectionId: '_pb_users_auth_',
          cascadeDelete: false,
          maxSelect: 1,
        },
        { name: 'created', type: 'autodate', onCreate: true, onUpdate: false },
        { name: 'updated', type: 'autodate', onCreate: true, onUpdate: true },
      ],
      indexes: [
        'CREATE INDEX idx_sr_status ON service_records (status)',
        'CREATE INDEX idx_sr_reason ON service_records (contact_reason)',
        'CREATE INDEX idx_sr_priority ON service_records (priority)',
        'CREATE INDEX idx_sr_user ON service_records (user_id)',
        'CREATE INDEX idx_sr_created ON service_records (created DESC)',
      ],
    })
    app.save(serviceRecords)
  },
  (app) => {
    try {
      const sr = app.findCollectionByNameOrId('service_records')
      app.delete(sr)
    } catch (_) {}
    try {
      const cl = app.findCollectionByNameOrId('clients')
      app.delete(cl)
    } catch (_) {}
  },
)
