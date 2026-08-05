migrate(
  (app) => {
    var srCol = app.findCollectionByNameOrId('service_records')
    if (!srCol.fields.getByName('reopen_justification')) {
      srCol.fields.add(new TextField({ name: 'reopen_justification', required: false }))
    }
    app.save(srCol)

    var srId = app.findCollectionByNameOrId('service_records').id

    var history = new Collection({
      name: 'service_record_history',
      type: 'base',
      listRule: '@request.auth.id != ""',
      viewRule: '@request.auth.id != ""',
      createRule: '@request.auth.id != ""',
      updateRule: null,
      deleteRule: null,
      fields: [
        {
          name: 'service_record',
          type: 'relation',
          required: true,
          collectionId: srId,
          maxSelect: 1,
          cascadeDelete: true,
        },
        {
          name: 'user',
          type: 'relation',
          required: false,
          collectionId: '_pb_users_auth_',
          maxSelect: 1,
        },
        { name: 'field', type: 'text', required: true },
        { name: 'old_value', type: 'text', required: false },
        { name: 'new_value', type: 'text', required: false },
        { name: 'justification', type: 'text', required: false },
        { name: 'created', type: 'autodate', onCreate: true, onUpdate: false },
        { name: 'updated', type: 'autodate', onCreate: true, onUpdate: true },
      ],
      indexes: [
        'CREATE INDEX idx_srh_service_record ON service_record_history (service_record)',
        'CREATE INDEX idx_srh_created ON service_record_history (created DESC)',
      ],
    })
    app.save(history)
  },
  (app) => {
    try {
      app.delete(app.findCollectionByNameOrId('service_record_history'))
    } catch (_) {}

    var srCol = app.findCollectionByNameOrId('service_records')
    try {
      srCol.fields.removeByName('reopen_justification')
    } catch (_) {}
    app.save(srCol)
  },
)
