migrate(
  (app) => {
    var srId = app.findCollectionByNameOrId('service_records').id

    var shares = new Collection({
      name: 'service_record_shares',
      type: 'base',
      listRule:
        '@request.auth.id != "" && (user = @request.auth.id || shared_by = @request.auth.id)',
      viewRule:
        '@request.auth.id != "" && (user = @request.auth.id || shared_by = @request.auth.id)',
      createRule: '@request.auth.id != ""',
      updateRule: '@request.auth.id != ""',
      deleteRule: '@request.auth.id != ""',
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
          required: true,
          collectionId: '_pb_users_auth_',
          maxSelect: 1,
        },
        {
          name: 'shared_by',
          type: 'relation',
          required: true,
          collectionId: '_pb_users_auth_',
          maxSelect: 1,
        },
        {
          name: 'permission',
          type: 'select',
          required: true,
          values: ['Visualizar', 'Editar'],
          maxSelect: 1,
        },
        { name: 'created', type: 'autodate', onCreate: true, onUpdate: false },
        { name: 'updated', type: 'autodate', onCreate: true, onUpdate: true },
      ],
      indexes: [
        'CREATE INDEX idx_srs_service_record ON service_record_shares (service_record)',
        'CREATE INDEX idx_srs_user ON service_record_shares (user)',
        'CREATE UNIQUE INDEX idx_srs_record_user ON service_record_shares (service_record, user)',
      ],
    })
    app.save(shares)
  },
  (app) => {
    try {
      app.delete(app.findCollectionByNameOrId('service_record_shares'))
    } catch (_) {}
  },
)
