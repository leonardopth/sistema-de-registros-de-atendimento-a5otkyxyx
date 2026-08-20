migrate(
  (app) => {
    // 1. Cria coleção para logs e sincronização de e-mails do Outlook (Microsoft Graph)
    if (!app.hasTable('email_logs')) {
      const emailLogs = new Collection({
        name: 'email_logs',
        type: 'base',
        listRule: '@request.auth.id != ""',
        viewRule: '@request.auth.id != ""',
        createRule: '@request.auth.id != ""',
        updateRule: '@request.auth.id != ""',
        deleteRule: '@request.auth.id != ""',
        fields: [
          { name: 'sender_email', type: 'text', required: true },
          { name: 'sender_name', type: 'text', required: false },
          { name: 'recipient_email', type: 'text', required: false },
          { name: 'subject', type: 'text', required: false },
          { name: 'body_snippet', type: 'text', required: false },
          { name: 'is_reply', type: 'bool', required: false },
          { name: 'category', type: 'text', required: false }, // Dúvida, Reclamação, Solicitação, Confirmação, etc.
          { name: 'sentiment', type: 'text', required: false }, // Positivo, Neutro, Negativo
          { name: 'main_topic', type: 'text', required: false },
          { name: 'confidence_score', type: 'number', required: false },
          {
            name: 'client',
            type: 'relation',
            required: false,
            collectionId: app.findCollectionByNameOrId('clients').id,
            maxSelect: 1,
          },
          {
            name: 'service_record',
            type: 'relation',
            required: false,
            collectionId: app.findCollectionByNameOrId('service_records').id,
            maxSelect: 1,
          },
          {
            name: 'processed_by',
            type: 'relation',
            required: false,
            collectionId: '_pb_users_auth_',
            maxSelect: 1,
          },
          { name: 'received_at', type: 'date', required: false },
          { name: 'created', type: 'autodate', onCreate: true, onUpdate: false },
          { name: 'updated', type: 'autodate', onCreate: true, onUpdate: true },
        ],
        indexes: [
          'CREATE INDEX idx_el_sender ON email_logs (sender_email)',
          'CREATE INDEX idx_el_category ON email_logs (category)',
          'CREATE INDEX idx_el_client ON email_logs (client)',
          'CREATE INDEX idx_el_sr ON email_logs (service_record)',
          'CREATE INDEX idx_el_created ON email_logs (created DESC)',
        ],
      })
      app.save(emailLogs)
    }

    // 2. Cria coleção para chamadas de telefonia e transcrições (Twilio)
    if (!app.hasTable('call_records')) {
      const callRecords = new Collection({
        name: 'call_records',
        type: 'base',
        listRule: '@request.auth.id != ""',
        viewRule: '@request.auth.id != ""',
        createRule: '@request.auth.id != ""',
        updateRule: '@request.auth.id != ""',
        deleteRule: '@request.auth.id != ""',
        fields: [
          { name: 'call_sid', type: 'text', required: true },
          { name: 'from_number', type: 'text', required: false },
          { name: 'to_number', type: 'text', required: false },
          { name: 'recording_url', type: 'text', required: false },
          { name: 'duration', type: 'number', required: false },
          { name: 'transcription', type: 'text', required: false },
          { name: 'summary', type: 'text', required: false },
          { name: 'category', type: 'text', required: false }, // Suporte, Venda, Reclamação, Informação, etc.
          { name: 'sentiment', type: 'text', required: false }, // Positivo, Neutro, Negativo
          { name: 'keywords', type: 'json', required: false },
          { name: 'quality_score', type: 'number', required: false }, // 0 - 100
          {
            name: 'service_record',
            type: 'relation',
            required: false,
            collectionId: app.findCollectionByNameOrId('service_records').id,
            maxSelect: 1,
          },
          {
            name: 'client',
            type: 'relation',
            required: false,
            collectionId: app.findCollectionByNameOrId('clients').id,
            maxSelect: 1,
          },
          {
            name: 'agent_user',
            type: 'relation',
            required: false,
            collectionId: '_pb_users_auth_',
            maxSelect: 1,
          },
          { name: 'created', type: 'autodate', onCreate: true, onUpdate: false },
          { name: 'updated', type: 'autodate', onCreate: true, onUpdate: true },
        ],
        indexes: [
          'CREATE UNIQUE INDEX idx_cr_sid ON call_records (call_sid)',
          'CREATE INDEX idx_cr_category ON call_records (category)',
          'CREATE INDEX idx_cr_sr ON call_records (service_record)',
          'CREATE INDEX idx_cr_client ON call_records (client)',
          'CREATE INDEX idx_cr_created ON call_records (created DESC)',
        ],
      })
      app.save(callRecords)
    }

    // 3. Cria coleção user_targets para avaliar metas de colaboradores internos (substituindo o foco em agentes)
    if (!app.hasTable('user_targets')) {
      const userTargets = new Collection({
        name: 'user_targets',
        type: 'base',
        listRule: '@request.auth.id != ""',
        viewRule: '@request.auth.id != ""',
        createRule:
          '@request.auth.id != "" && (@request.auth.role = "Gerentes" || @request.auth.role = "Supervisores" || @request.auth.role = "Líderes" || @request.auth.role = "Master" || @request.auth.master_access = true)',
        updateRule:
          '@request.auth.id != "" && (@request.auth.role = "Gerentes" || @request.auth.role = "Supervisores" || @request.auth.role = "Líderes" || @request.auth.role = "Master" || @request.auth.master_access = true)',
        deleteRule:
          '@request.auth.id != "" && (@request.auth.role = "Gerentes" || @request.auth.role = "Supervisores" || @request.auth.role = "Líderes" || @request.auth.role = "Master" || @request.auth.master_access = true)',
        fields: [
          {
            name: 'user',
            type: 'relation',
            required: true,
            collectionId: '_pb_users_auth_',
            maxSelect: 1,
          },
          { name: 'monthly_attendance_target', type: 'number', required: false },
          { name: 'min_resolution_rate', type: 'number', required: false },
          { name: 'avg_response_time_target', type: 'number', required: false }, // em minutos
          { name: 'auto_categorization_target', type: 'number', required: false }, // % meta de categorização
          {
            name: 'created_by',
            type: 'relation',
            required: false,
            collectionId: '_pb_users_auth_',
            maxSelect: 1,
          },
          { name: 'created', type: 'autodate', onCreate: true, onUpdate: false },
          { name: 'updated', type: 'autodate', onCreate: true, onUpdate: true },
        ],
        indexes: ['CREATE UNIQUE INDEX idx_user_targets_user ON user_targets (user)'],
      })
      app.save(userTargets)
    }
  },
  (app) => {
    try {
      app.delete(app.findCollectionByNameOrId('user_targets'))
    } catch (_) {}
    try {
      app.delete(app.findCollectionByNameOrId('call_records'))
    } catch (_) {}
    try {
      app.delete(app.findCollectionByNameOrId('email_logs'))
    } catch (_) {}
  },
)
