migrate(
  (app) => {
    const srCol = app.findCollectionByNameOrId('service_records')

    if (!srCol.fields.getByName('backlog_alert_2h_sent')) {
      srCol.fields.add(new BoolField({ name: 'backlog_alert_2h_sent', required: false }))
    }

    if (!srCol.fields.getByName('backlog_alert_24h_sent')) {
      srCol.fields.add(new BoolField({ name: 'backlog_alert_24h_sent', required: false }))
    }

    if (!srCol.fields.getByName('tfr_alert_sent')) {
      srCol.fields.add(new BoolField({ name: 'tfr_alert_sent', required: false }))
    }

    app.save(srCol)
  },
  (app) => {
    const srCol = app.findCollectionByNameOrId('service_records')

    try {
      srCol.fields.removeByName('backlog_alert_2h_sent')
    } catch (_) {}

    try {
      srCol.fields.removeByName('backlog_alert_24h_sent')
    } catch (_) {}

    try {
      srCol.fields.removeByName('tfr_alert_sent')
    } catch (_) {}

    app.save(srCol)
  },
)
