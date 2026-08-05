migrate(
  (app) => {
    const col = app.findCollectionByNameOrId('account_executives')

    var seedData = [
      {
        name: 'Ana Carolina Pereira',
        email: 'ana.pereira@rexturadvance.com.br',
        phone: '(11) 98877-6655',
      },
      {
        name: 'Roberto Mendes',
        email: 'roberto.mendes@rexturadvance.com.br',
        phone: '(21) 99654-3322',
      },
      {
        name: 'Fernanda Lima',
        email: 'fernanda.lima@rexturadvance.com.br',
        phone: '(31) 98765-4321',
      },
      {
        name: 'Carlos Eduardo Santos',
        email: 'carlos.santos@rexturadvance.com.br',
        phone: '(41) 98822-1100',
      },
    ]

    for (var i = 0; i < seedData.length; i++) {
      var data = seedData[i]
      try {
        app.findFirstRecordByData('account_executives', 'email', data.email)
      } catch (_) {
        var rec = new Record(col)
        rec.set('name', data.name)
        rec.set('email', data.email)
        rec.set('phone', data.phone)
        app.save(rec)
      }
    }
  },
  (app) => {},
)
