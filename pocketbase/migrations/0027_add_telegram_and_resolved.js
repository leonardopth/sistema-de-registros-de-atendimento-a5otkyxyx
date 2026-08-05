migrate(
  (app) => {
    var usersCol = app.findCollectionByNameOrId('users')
    if (!usersCol.fields.getByName('telegram_id')) {
      usersCol.fields.add(new TextField({ name: 'telegram_id', required: false }))
    }
    if (!usersCol.fields.getByName('telegram_alerts')) {
      usersCol.fields.add(new BoolField({ name: 'telegram_alerts', required: false }))
    }
    app.save(usersCol)

    var notifCol = app.findCollectionByNameOrId('notifications')
    if (!notifCol.fields.getByName('resolved')) {
      notifCol.fields.add(new BoolField({ name: 'resolved', required: false }))
    }
    app.save(notifCol)
  },
  (app) => {
    var usersCol = app.findCollectionByNameOrId('users')
    try {
      usersCol.fields.removeByName('telegram_id')
    } catch (_) {}
    try {
      usersCol.fields.removeByName('telegram_alerts')
    } catch (_) {}
    app.save(usersCol)

    var notifCol = app.findCollectionByNameOrId('notifications')
    try {
      notifCol.fields.removeByName('resolved')
    } catch (_) {}
    app.save(notifCol)
  },
)
