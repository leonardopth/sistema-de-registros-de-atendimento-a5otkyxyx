migrate(
  (app) => {
    const col = app.findCollectionByNameOrId('service_records')
    var oldField = col.fields.getByName('avoidable_contact_reason')
    if (oldField) {
      col.fields.remove(oldField)
    }
    col.fields.add(
      new SelectField({
        name: 'avoidable_contact_reason',
        required: false,
        values: ['Disponível no RF', 'Fora do Escopo', 'Erro RF', 'Outros'],
        maxSelect: 1,
      }),
    )
    app.save(col)
  },
  (app) => {
    const col = app.findCollectionByNameOrId('service_records')
    var newField = col.fields.getByName('avoidable_contact_reason')
    if (newField) {
      col.fields.remove(newField)
    }
    col.fields.add(
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
    app.save(col)
  },
)
