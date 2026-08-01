migrate(
  (app) => {
    const srCol = app.findCollectionByNameOrId('service_records')

    var reasonField = srCol.fields.getByName('contact_reason')
    if (reasonField) {
      reasonField.values = [
        'Bagagem',
        'Assento',
        'cálculo reemissão',
        'reembolso',
        'cotação',
        'reserva',
        'cancelamento',
        'regras tarifárias',
        'erro RF',
        'outros',
      ]
    }

    if (!srCol.fields.getByName('channel')) {
      srCol.fields.add(
        new SelectField({
          name: 'channel',
          required: false,
          values: ['Telefone', 'e-mail', 'whatsapp', 'comercial', 'outros'],
          maxSelect: 1,
        }),
      )
    }

    app.save(srCol)

    var allRecords = app.findRecordsByFilter('service_records', "id != ''", '', 0, 0)
    var reasonMap = {
      Dúvida: 'outros',
      Reclamação: 'outros',
      'Suporte Técnico': 'outros',
      Orçamento: 'outros',
      Cancelamento: 'cancelamento',
      Outro: 'outros',
    }
    for (var i = 0; i < allRecords.length; i++) {
      var r = allRecords[i]
      var oldReason = r.getString('contact_reason')
      if (reasonMap[oldReason]) {
        r.set('contact_reason', reasonMap[oldReason])
        app.save(r)
      }
    }
  },
  (app) => {
    var srCol = app.findCollectionByNameOrId('service_records')

    var reasonField2 = srCol.fields.getByName('contact_reason')
    if (reasonField2) {
      reasonField2.values = [
        'Dúvida',
        'Reclamação',
        'Suporte Técnico',
        'Orçamento',
        'Cancelamento',
        'Outro',
      ]
    }

    app.save(srCol)
  },
)
