migrate(
  (app) => {
    const srCol = app.findCollectionByNameOrId('service_records')
    if (!srCol.fields.getByName('avoidable_contact_reason')) {
      srCol.fields.add(
        new SelectField({
          name: 'avoidable_contact_reason',
          required: false,
          values: [
            'Cálculo Reemissão',
            'Emissão',
            'Reserva simples',
            'Reembolso',
            'Financeiro',
            'Help Desk',
            'Outros',
          ],
          maxSelect: 1,
        }),
      )
    }
    app.save(srCol)

    const clientsCol = app.findCollectionByNameOrId('clients')
    if (!clientsCol.fields.getByName('account_executive')) {
      clientsCol.fields.add(
        new TextField({
          name: 'account_executive',
          required: false,
        }),
      )
    }
    app.save(clientsCol)
  },
  (app) => {
    const srCol = app.findCollectionByNameOrId('service_records')
    var f1 = srCol.fields.getByName('avoidable_contact_reason')
    if (f1) srCol.fields.remove(f1)
    app.save(srCol)

    var clientsCol = app.findCollectionByNameOrId('clients')
    var f2 = clientsCol.fields.getByName('account_executive')
    if (f2) clientsCol.fields.remove(f2)
    app.save(clientsCol)
  },
)
