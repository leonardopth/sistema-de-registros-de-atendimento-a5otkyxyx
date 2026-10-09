migrate(
  (app) => {
    // 1. Adicionar flag priority_client na coleção clients
    const clientsCol = app.findCollectionByNameOrId('clients')
    if (!clientsCol.fields.getByName('priority_client')) {
      clientsCol.fields.add(new BoolField({ name: 'priority_client' }))
      app.save(clientsCol)
    }

    // 2. Criar coleção control_tower_configs
    // Escrita restrita a Líderes e Master/Admin
    const isLeaderOrMaster =
      "@request.auth.id != '' && (@request.auth.role = 'Líder' || @request.auth.role = 'Gerente' || @request.auth.role = 'Master' || @request.auth.master_access = true)"

    const configsCollection = new Collection({
      name: 'control_tower_configs',
      type: 'base',
      listRule: "@request.auth.id != ''",
      viewRule: "@request.auth.id != ''",
      createRule: isLeaderOrMaster,
      updateRule: isLeaderOrMaster,
      deleteRule: isLeaderOrMaster,
      fields: [
        { name: 'weight_departure_24h', type: 'number' },
        { name: 'weight_departure_48h', type: 'number' },
        { name: 'weight_cancellation', type: 'number' },
        { name: 'weight_priority_client', type: 'number' },
        { name: 'weight_per_hour_inbox', type: 'number' },
        { name: 'weight_promised_deadline', type: 'number' },
        { name: 'weight_formal_complaint', type: 'number' },
        { name: 'weight_repeat_contact', type: 'number' },
        { name: 'score_threshold_p1', type: 'number' },
        { name: 'score_threshold_p2', type: 'number' },
        { name: 'business_hours_start', type: 'text' }, // ex: "08:00"
        { name: 'business_hours_end', type: 'text' }, // ex: "18:00"
        { name: 'business_days', type: 'json' }, // ex: [1,2,3,4,5] (seg-sex)
        { name: 'target_sla_p1_hours', type: 'number' }, // ex: 2
        { name: 'target_sla_p2_hours', type: 'number' }, // ex: 4
        { name: 'target_sla_p3_hours', type: 'number' }, // ex: 8
        { name: 'updated_by', type: 'relation', collectionId: '_pb_users_auth_', maxSelect: 1 },
        { name: 'created', type: 'autodate', onCreate: true, onUpdate: false },
        { name: 'updated', type: 'autodate', onCreate: true, onUpdate: true },
      ],
    })
    app.save(configsCollection)

    // Seed padrão da configuração da Torre de Controle
    const configRecord = new Record(configsCollection)
    configRecord.set('weight_departure_24h', 50)
    configRecord.set('weight_departure_48h', 30)
    configRecord.set('weight_cancellation', 35)
    configRecord.set('weight_priority_client', 25)
    configRecord.set('weight_per_hour_inbox', 5)
    configRecord.set('weight_promised_deadline', 20)
    configRecord.set('weight_formal_complaint', 40)
    configRecord.set('weight_repeat_contact', 15)
    configRecord.set('score_threshold_p1', 60)
    configRecord.set('score_threshold_p2', 30)
    configRecord.set('business_hours_start', '08:00')
    configRecord.set('business_hours_end', '18:00')
    configRecord.set('business_days', [1, 2, 3, 4, 5])
    configRecord.set('target_sla_p1_hours', 2)
    configRecord.set('target_sla_p2_hours', 4)
    configRecord.set('target_sla_p3_hours', 8)
    app.save(configRecord)

    // 3. Criar coleção control_tower_emails
    const usersCol = app.findCollectionByNameOrId('users')
    const clientsColRef = app.findCollectionByNameOrId('clients')
    const emailLogsColRef = app.findCollectionByNameOrId('email_analysis_logs')

    const emailsCollection = new Collection({
      name: 'control_tower_emails',
      type: 'base',
      listRule: "@request.auth.id != ''",
      viewRule: "@request.auth.id != ''",
      createRule: "@request.auth.id != ''",
      updateRule: "@request.auth.id != ''",
      deleteRule:
        "@request.auth.id != '' && (@request.auth.role = 'Master' || @request.auth.master_access = true)",
      fields: [
        { name: 'subject', type: 'text' },
        { name: 'sender_email', type: 'text', required: true },
        { name: 'sender_name', type: 'text' },
        { name: 'recipient_email', type: 'text' },
        { name: 'body_snippet', type: 'text' },
        { name: 'received_at', type: 'date' },
        {
          name: 'service_group',
          type: 'select',
          values: ['Concierge', 'Exclusivo', 'LOT', 'BR1', 'BR2', 'SAO', 'SPI', 'SUL'],
          maxSelect: 1,
        },
        {
          name: 'team',
          type: 'select',
          values: ['Nacional', 'Internacional'],
          maxSelect: 1,
        },
        {
          name: 'client',
          type: 'relation',
          collectionId: clientsColRef.id,
          maxSelect: 1,
        },
        { name: 'reservation_number', type: 'text' },
        { name: 'detected_dates', type: 'json' }, // array de strings
        { name: 'detected_signals', type: 'json' }, // array de strings: "Embarque <24h", "Cancelamento", etc.
        { name: 'score', type: 'number' },
        {
          name: 'priority',
          type: 'select',
          values: ['P1', 'P2', 'P3'],
          maxSelect: 1,
        },
        {
          name: 'status',
          type: 'select',
          values: ['Novo', 'Em tratamento', 'Aguardando cliente', 'Resolvido', 'Escalado'],
          maxSelect: 1,
        },
        {
          name: 'assigned_to',
          type: 'relation',
          collectionId: usersCol.id,
          maxSelect: 1,
        },
        { name: 'assigned_at', type: 'date' },
        { name: 'is_noise', type: 'bool' },
        { name: 'external_message_id', type: 'text' },
        {
          name: 'email_analysis_log',
          type: 'relation',
          collectionId: emailLogsColRef.id,
          maxSelect: 1,
        },
        { name: 'business_hours_waiting', type: 'number' },
        { name: 'sla_deadline', type: 'date' },
        { name: 'created', type: 'autodate', onCreate: true, onUpdate: false },
        { name: 'updated', type: 'autodate', onCreate: true, onUpdate: true },
      ],
      indexes: [
        'CREATE INDEX idx_cte_status_score ON control_tower_emails (status, score DESC)',
        'CREATE INDEX idx_cte_priority ON control_tower_emails (priority)',
        'CREATE INDEX idx_cte_assigned ON control_tower_emails (assigned_to)',
        'CREATE INDEX idx_cte_external_msg ON control_tower_emails (external_message_id)',
        'CREATE INDEX idx_cte_received ON control_tower_emails (received_at DESC)',
      ],
    })
    app.save(emailsCollection)
  },
  (app) => {
    try {
      const emailsCol = app.findCollectionByNameOrId('control_tower_emails')
      app.delete(emailsCol)
    } catch (_) {}

    try {
      const configsCol = app.findCollectionByNameOrId('control_tower_configs')
      app.delete(configsCol)
    } catch (_) {}

    try {
      const clientsCol = app.findCollectionByNameOrId('clients')
      const field = clientsCol.fields.getByName('priority_client')
      if (field) {
        clientsCol.fields.remove(field)
        app.save(clientsCol)
      }
    } catch (_) {}
  },
)
