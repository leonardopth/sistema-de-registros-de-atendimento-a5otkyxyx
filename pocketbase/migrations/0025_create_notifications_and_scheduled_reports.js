migrate(
  (app) => {
    const notifications = new Collection({
      name: 'notifications',
      type: 'base',
      listRule: "@request.auth.id != '' && user_id = @request.auth.id",
      viewRule: "@request.auth.id != '' && user_id = @request.auth.id",
      createRule: "@request.auth.id != ''",
      updateRule: "@request.auth.id != '' && user_id = @request.auth.id",
      deleteRule: "@request.auth.id != '' && user_id = @request.auth.id",
      fields: [
        {
          name: 'user_id',
          type: 'relation',
          required: true,
          collectionId: '_pb_users_auth_',
          maxSelect: 1,
        },
        { name: 'title', type: 'text', required: true },
        { name: 'message', type: 'text', required: true },
        {
          name: 'type',
          type: 'select',
          required: true,
          values: ['info', 'success', 'warning', 'error', 'approval', 'report'],
          maxSelect: 1,
        },
        { name: 'read', type: 'bool' },
        { name: 'link', type: 'text' },
        { name: 'created', type: 'autodate', onCreate: true, onUpdate: false },
        { name: 'updated', type: 'autodate', onCreate: true, onUpdate: true },
      ],
      indexes: [
        'CREATE INDEX idx_notifications_user ON notifications (user_id)',
        'CREATE INDEX idx_notifications_read ON notifications (read)',
        'CREATE INDEX idx_notifications_created ON notifications (created DESC)',
      ],
    })
    app.save(notifications)

    const scheduledReports = new Collection({
      name: 'scheduled_reports',
      type: 'base',
      listRule: "@request.auth.id != '' && user_id = @request.auth.id",
      viewRule: "@request.auth.id != '' && user_id = @request.auth.id",
      createRule: "@request.auth.id != ''",
      updateRule: "@request.auth.id != '' && user_id = @request.auth.id",
      deleteRule: "@request.auth.id != '' && user_id = @request.auth.id",
      fields: [
        {
          name: 'user_id',
          type: 'relation',
          required: true,
          collectionId: '_pb_users_auth_',
          maxSelect: 1,
        },
        {
          name: 'frequency',
          type: 'select',
          required: true,
          values: ['daily', 'weekly', 'monthly'],
          maxSelect: 1,
        },
        { name: 'email', type: 'text', required: true },
        {
          name: 'format',
          type: 'select',
          required: true,
          values: ['csv', 'excel', 'pdf'],
          maxSelect: 1,
        },
        { name: 'active', type: 'bool' },
        { name: 'last_sent', type: 'date' },
        { name: 'filters', type: 'json' },
        { name: 'created', type: 'autodate', onCreate: true, onUpdate: false },
        { name: 'updated', type: 'autodate', onCreate: true, onUpdate: true },
      ],
      indexes: [
        'CREATE INDEX idx_scheduled_reports_user ON scheduled_reports (user_id)',
        'CREATE INDEX idx_scheduled_reports_active ON scheduled_reports (active)',
      ],
    })
    app.save(scheduledReports)
  },
  (app) => {
    try {
      app.delete(app.findCollectionByNameOrId('notifications'))
    } catch (_) {}
    try {
      app.delete(app.findCollectionByNameOrId('scheduled_reports'))
    } catch (_) {}
  },
)
