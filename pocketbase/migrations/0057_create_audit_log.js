migrate(
  (app) => {
    var auditLog = new Collection({
      name: 'audit_log',
      type: 'base',
      listRule:
        "@request.auth.id != '' && (@request.auth.role = 'Master' || @request.auth.master_access = true)",
      viewRule:
        "@request.auth.id != '' && (@request.auth.role = 'Master' || @request.auth.master_access = true)",
      createRule: "@request.auth.id != ''",
      updateRule: null,
      deleteRule: null,
      fields: [
        {
          name: 'user',
          type: 'relation',
          required: false,
          collectionId: '_pb_users_auth_',
          maxSelect: 1,
        },
        { name: 'action', type: 'text', required: true },
        { name: 'entity', type: 'text', required: true },
        { name: 'entity_id', type: 'text', required: false },
        { name: 'details', type: 'json', required: false },
        { name: 'created', type: 'autodate', onCreate: true, onUpdate: false },
        { name: 'updated', type: 'autodate', onCreate: true, onUpdate: true },
      ],
      indexes: [
        'CREATE INDEX idx_audit_user ON audit_log (user)',
        'CREATE INDEX idx_audit_action ON audit_log (action)',
        'CREATE INDEX idx_audit_entity ON audit_log (entity)',
        'CREATE INDEX idx_audit_created ON audit_log (created DESC)',
      ],
    })
    app.save(auditLog)
  },
  (app) => {
    try {
      app.delete(app.findCollectionByNameOrId('audit_log'))
    } catch (_) {}
  },
)
