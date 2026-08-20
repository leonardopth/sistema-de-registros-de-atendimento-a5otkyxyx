migrate(
  (app) => {
    const agentsCol = app.findCollectionByNameOrId('agents')
    const usersCol = app.findCollectionByNameOrId('_pb_users_auth_')

    let targetsCol
    try {
      targetsCol = app.findCollectionByNameOrId('agent_targets')
    } catch (_) {
      const targets = new Collection({
        name: 'agent_targets',
        type: 'base',
        listRule: "@request.auth.id != ''",
        viewRule: "@request.auth.id != ''",
        createRule:
          "@request.auth.id != '' && (@request.auth.role = 'Gerentes' || @request.auth.role = 'Supervisores' || @request.auth.role = 'Líderes' || @request.auth.role = 'Master' || @request.auth.master_access = true)",
        updateRule:
          "@request.auth.id != '' && (@request.auth.role = 'Gerentes' || @request.auth.role = 'Supervisores' || @request.auth.role = 'Líderes' || @request.auth.role = 'Master' || @request.auth.master_access = true)",
        deleteRule:
          "@request.auth.id != '' && (@request.auth.role = 'Gerentes' || @request.auth.role = 'Supervisores' || @request.auth.role = 'Líderes' || @request.auth.role = 'Master' || @request.auth.master_access = true)",
        fields: [
          {
            name: 'agent',
            type: 'relation',
            required: true,
            collectionId: agentsCol.id,
            cascadeDelete: true,
            maxSelect: 1,
          },
          {
            name: 'monthly_attendance_target',
            type: 'number',
            required: true,
            min: 0,
            onlyInt: true,
          },
          {
            name: 'min_resolution_rate',
            type: 'number',
            required: true,
            min: 0,
            max: 100,
          },
          {
            name: 'created_by',
            type: 'relation',
            required: false,
            collectionId: usersCol.id,
            maxSelect: 1,
          },
          { name: 'created', type: 'autodate', onCreate: true, onUpdate: false },
          { name: 'updated', type: 'autodate', onCreate: true, onUpdate: true },
        ],
        indexes: ['CREATE UNIQUE INDEX idx_agent_targets_agent ON agent_targets (agent)'],
      })
      app.save(targets)
      targetsCol = app.findCollectionByNameOrId('agent_targets')
    }
  },
  (app) => {
    try {
      const col = app.findCollectionByNameOrId('agent_targets')
      app.delete(col)
    } catch (_) {}
  },
)
