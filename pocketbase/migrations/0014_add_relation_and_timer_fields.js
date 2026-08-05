migrate(
  (app) => {
    var aeCol = app.findCollectionByNameOrId('account_executives')
    var clientsCol = app.findCollectionByNameOrId('clients')
    var agentsCol = app.findCollectionByNameOrId('agents')

    if (!clientsCol.fields.getByName('account_executive_rel')) {
      clientsCol.fields.add(
        new RelationField({
          name: 'account_executive_rel',
          required: false,
          collectionId: aeCol.id,
          maxSelect: 1,
        }),
      )
    }
    clientsCol.addIndex('idx_clients_exec_rel', false, 'account_executive_rel', '')
    app.save(clientsCol)

    var srCol = app.findCollectionByNameOrId('service_records')

    if (!srCol.fields.getByName('account_executive')) {
      srCol.fields.add(
        new RelationField({
          name: 'account_executive',
          required: false,
          collectionId: aeCol.id,
          maxSelect: 1,
        }),
      )
    }
    if (!srCol.fields.getByName('client')) {
      srCol.fields.add(
        new RelationField({
          name: 'client',
          required: false,
          collectionId: clientsCol.id,
          maxSelect: 1,
        }),
      )
    }
    if (!srCol.fields.getByName('agent')) {
      srCol.fields.add(
        new RelationField({
          name: 'agent',
          required: false,
          collectionId: agentsCol.id,
          maxSelect: 1,
        }),
      )
    }
    if (!srCol.fields.getByName('timer_start')) {
      srCol.fields.add(new DateField({ name: 'timer_start', required: false }))
    }
    if (!srCol.fields.getByName('timer_running')) {
      srCol.fields.add(new BoolField({ name: 'timer_running', required: false }))
    }

    srCol.addIndex('idx_sr_exec', false, 'account_executive', '')
    srCol.addIndex('idx_sr_client', false, 'client', '')
    srCol.addIndex('idx_sr_agent', false, 'agent', '')
    app.save(srCol)
  },
  (app) => {
    var clientsCol = app.findCollectionByNameOrId('clients')
    try {
      clientsCol.removeIndex('idx_clients_exec_rel')
    } catch (_) {}
    var f1 = clientsCol.fields.getByName('account_executive_rel')
    if (f1) clientsCol.fields.remove(f1)
    app.save(clientsCol)

    var srCol = app.findCollectionByNameOrId('service_records')
    try {
      srCol.removeIndex('idx_sr_exec')
    } catch (_) {}
    try {
      srCol.removeIndex('idx_sr_client')
    } catch (_) {}
    try {
      srCol.removeIndex('idx_sr_agent')
    } catch (_) {}
    var names = ['account_executive', 'client', 'agent', 'timer_start', 'timer_running']
    for (var i = 0; i < names.length; i++) {
      var f = srCol.fields.getByName(names[i])
      if (f) srCol.fields.remove(f)
    }
    app.save(srCol)
  },
)
