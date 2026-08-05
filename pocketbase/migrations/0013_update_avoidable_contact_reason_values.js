migrate(
  (app) => {
    const col = app.findCollectionByNameOrId('service_records')
    col.fields.removeByName('avoidable_contact_reason')
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
    col.fields.removeByName('avoidable_contact_reason')
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
