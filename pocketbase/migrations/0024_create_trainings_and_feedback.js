migrate(
  (app) => {
    var clientsCol = app.findCollectionByNameOrId('clients')

    var trainings = new Collection({
      name: 'trainings',
      type: 'base',
      listRule: '@request.auth.id != ""',
      viewRule: '@request.auth.id != ""',
      createRule: '@request.auth.id != ""',
      updateRule:
        '@request.auth.id != "" && (@request.auth.role = "Gerentes" || @request.auth.role = "Supervisores" || @request.auth.role = "L\u00edderes" || @request.auth.role = "Master")',
      deleteRule:
        '@request.auth.id != "" && (@request.auth.role = "Gerentes" || @request.auth.role = "Supervisores" || @request.auth.role = "L\u00edderes" || @request.auth.role = "Master")',
      fields: [
        { name: 'name', type: 'text', required: true },
        { name: 'description', type: 'text' },
        {
          name: 'client',
          type: 'relation',
          required: true,
          collectionId: clientsCol.id,
          maxSelect: 1,
        },
        { name: 'plan_content', type: 'text' },
        { name: 'training_date', type: 'date', required: true },
        { name: 'created_by', type: 'relation', collectionId: '_pb_users_auth_', maxSelect: 1 },
        { name: 'created', type: 'autodate', onCreate: true, onUpdate: false },
        { name: 'updated', type: 'autodate', onCreate: true, onUpdate: true },
      ],
      indexes: [
        'CREATE INDEX idx_trainings_client ON trainings (client)',
        'CREATE INDEX idx_trainings_date ON trainings (training_date)',
      ],
    })
    app.save(trainings)

    var feedback = new Collection({
      name: 'feedback',
      type: 'base',
      listRule: '@request.auth.id != ""',
      viewRule: '@request.auth.id != ""',
      createRule: '@request.auth.id != ""',
      updateRule: '@request.auth.id != "" && user_id = @request.auth.id',
      deleteRule: '@request.auth.id != "" && @request.auth.role = "Master"',
      fields: [
        { name: 'message', type: 'text', required: true, min: 3, max: 1000 },
        {
          name: 'category',
          type: 'select',
          required: true,
          values: ['Sugest\u00e3o', 'Bug', 'Elogio', 'Reclama\u00e7\u00e3o'],
          maxSelect: 1,
        },
        {
          name: 'user_id',
          type: 'relation',
          required: true,
          collectionId: '_pb_users_auth_',
          maxSelect: 1,
        },
        { name: 'created', type: 'autodate', onCreate: true, onUpdate: false },
        { name: 'updated', type: 'autodate', onCreate: true, onUpdate: true },
      ],
      indexes: [
        'CREATE INDEX idx_feedback_user ON feedback (user_id)',
        'CREATE INDEX idx_feedback_category ON feedback (category)',
      ],
    })
    app.save(feedback)
  },
  (app) => {
    try {
      app.delete(app.findCollectionByNameOrId('trainings'))
    } catch (_) {}
    try {
      app.delete(app.findCollectionByNameOrId('feedback'))
    } catch (_) {}
  },
)
