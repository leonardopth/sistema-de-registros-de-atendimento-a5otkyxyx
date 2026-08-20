migrate(
  (app) => {
    // 1. Criar ou atualizar a coleção email_analysis_logs conforme especificado no item 6
    if (!app.hasTable('email_analysis_logs')) {
      const clientsId = app.findCollectionByNameOrId('clients').id
      const serviceRecordsId = app.findCollectionByNameOrId('service_records').id

      const collection = new Collection({
        name: 'email_analysis_logs',
        type: 'base',
        listRule: "@request.auth.id != ''",
        viewRule: "@request.auth.id != ''",
        createRule: "@request.auth.id != ''",
        updateRule: "@request.auth.id != ''",
        deleteRule:
          "@request.auth.id != '' && (@request.auth.role = 'Master' || @request.auth.master_access = true)",
        fields: [
          { name: 'sender_email', type: 'text', required: true },
          { name: 'sender_name', type: 'text' },
          { name: 'recipient_email', type: 'text' },
          { name: 'subject', type: 'text' },
          { name: 'body_snippet', type: 'text' },
          { name: 'is_reply', type: 'bool' },
          { name: 'category', type: 'text' },
          { name: 'sentiment', type: 'text' },
          { name: 'main_topic', type: 'text' },
          { name: 'confidence_score', type: 'number' },
          { name: 'outlook_message_id', type: 'text' },
          {
            name: 'client',
            type: 'relation',
            collectionId: clientsId,
            cascadeDelete: false,
            maxSelect: 1,
          },
          {
            name: 'service_record',
            type: 'relation',
            collectionId: serviceRecordsId,
            cascadeDelete: false,
            maxSelect: 1,
          },
          {
            name: 'processed_by',
            type: 'relation',
            collectionId: '_pb_users_auth_',
            cascadeDelete: false,
            maxSelect: 1,
          },
          { name: 'received_at', type: 'date' },
          { name: 'created', type: 'autodate', onCreate: true, onUpdate: false },
          { name: 'updated', type: 'autodate', onCreate: true, onUpdate: true },
        ],
        indexes: [
          'CREATE INDEX idx_eal_sender ON email_analysis_logs (sender_email)',
          'CREATE INDEX idx_eal_category ON email_analysis_logs (category)',
          'CREATE INDEX idx_eal_client ON email_analysis_logs (client)',
          'CREATE INDEX idx_eal_sr ON email_analysis_logs (service_record)',
          'CREATE INDEX idx_eal_created ON email_analysis_logs (created DESC)',
          'CREATE INDEX idx_eal_msgid ON email_analysis_logs (outlook_message_id)',
        ],
      })
      app.save(collection)
    }

    // 2. Garantir regras de acesso estritas na coleção service_records
    // Regra:
    // - Usuário Master ou master_access = true vê tudo
    // - Usuário comum vê APENAS: (a) onde user_id ou assigned_user é igual a @request.auth.id; (b) onde foi compartilhado com ele via service_record_shares
    const srCol = app.findCollectionByNameOrId('service_records')
    const srSecurityRule =
      "@request.auth.id != '' && (" +
      "@request.auth.role = 'Master' || " +
      '@request.auth.master_access = true || ' +
      'user_id = @request.auth.id || ' +
      'assigned_user = @request.auth.id || ' +
      '@request.auth.id ?= @collection.service_record_shares.user' +
      ')'

    srCol.listRule = srSecurityRule
    srCol.viewRule = srSecurityRule
    app.save(srCol)

    // 3. Garantir regras de acesso em service_record_shares
    const sharesCol = app.findCollectionByNameOrId('service_record_shares')
    const sharesSecurityRule =
      "@request.auth.id != '' && (" +
      "@request.auth.role = 'Master' || " +
      '@request.auth.master_access = true || ' +
      'user = @request.auth.id || ' +
      'shared_by = @request.auth.id' +
      ')'
    sharesCol.listRule = sharesSecurityRule
    sharesCol.viewRule = sharesSecurityRule
    app.save(sharesCol)
  },
  (app) => {
    try {
      if (app.hasTable('email_analysis_logs')) {
        const col = app.findCollectionByNameOrId('email_analysis_logs')
        app.delete(col)
      }
    } catch (_) {}
  },
)
