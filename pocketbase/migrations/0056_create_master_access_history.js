migrate(
  (app) => {
    var usersId = '_pb_users_auth_'

    var history = new Collection({
      name: 'master_access_history',
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
          required: true,
          collectionId: usersId,
          maxSelect: 1,
          cascadeDelete: false,
        },
        {
          name: 'actioned_by',
          type: 'relation',
          required: true,
          collectionId: usersId,
          maxSelect: 1,
        },
        {
          name: 'action',
          type: 'select',
          required: true,
          values: ['Concedido', 'Revogado'],
          maxSelect: 1,
        },
        { name: 'created', type: 'autodate', onCreate: true, onUpdate: false },
        { name: 'updated', type: 'autodate', onCreate: true, onUpdate: true },
      ],
      indexes: [
        'CREATE INDEX idx_mah_user ON master_access_history (user)',
        'CREATE INDEX idx_mah_actioned_by ON master_access_history (actioned_by)',
        'CREATE INDEX idx_mah_created ON master_access_history (created DESC)',
      ],
    })
    app.save(history)
  },
  (app) => {
    try {
      app.delete(app.findCollectionByNameOrId('master_access_history'))
    } catch (_) {}
  },
)
