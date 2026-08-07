migrate(
  (app) => {
    var col = app.findCollectionByNameOrId('account_executives')
    try {
      app.findFirstRecordByData('account_executives', 'name', 'Auto-Atendimento')
    } catch (_) {
      var rec = new Record(col)
      rec.set('name', 'Auto-Atendimento')
      rec.set('email', '')
      rec.set('phone', '')
      app.save(rec)
    }
  },
  (app) => {},
)
