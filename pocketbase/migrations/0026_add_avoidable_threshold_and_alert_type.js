migrate(
  (app) => {
    var clientsCol = app.findCollectionByNameOrId('clients')
    if (!clientsCol.fields.getByName('avoidable_contact_threshold')) {
      clientsCol.fields.add(
        new NumberField({
          name: 'avoidable_contact_threshold',
          required: false,
          min: 1,
          onlyInt: true,
        }),
      )
    }
    app.save(clientsCol)

    var notifCol = app.findCollectionByNameOrId('notifications')
    var typeField = notifCol.fields.getByName('type')
    if (typeField) {
      notifCol.fields.remove(typeField)
    }
    notifCol.fields.add(
      new SelectField({
        name: 'type',
        required: true,
        values: ['info', 'success', 'warning', 'error', 'approval', 'report', 'alert'],
        maxSelect: 1,
      }),
    )
    app.save(notifCol)

    var existingClients = app.findRecordsByFilter('clients', '', '', 0, 0)
    for (var i = 0; i < existingClients.length; i++) {
      var c = existingClients[i]
      if (!c.get('avoidable_contact_threshold')) {
        c.set('avoidable_contact_threshold', 5)
        try {
          app.save(c)
        } catch (_) {}
      }
    }
  },
  (app) => {
    var clientsCol = app.findCollectionByNameOrId('clients')
    try {
      clientsCol.fields.removeByName('avoidable_contact_threshold')
    } catch (_) {}
    app.save(clientsCol)

    var notifCol = app.findCollectionByNameOrId('notifications')
    var typeField = notifCol.fields.getByName('type')
    if (typeField) {
      notifCol.fields.remove(typeField)
    }
    notifCol.fields.add(
      new SelectField({
        name: 'type',
        required: true,
        values: ['info', 'success', 'warning', 'error', 'approval', 'report'],
        maxSelect: 1,
      }),
    )
    app.save(notifCol)
  },
)
