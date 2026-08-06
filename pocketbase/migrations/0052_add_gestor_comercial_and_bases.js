migrate(
  (app) => {
    const usersCol = app.findCollectionByNameOrId('users')

    const roleField = usersCol.fields.getByName('role')
    if (roleField) {
      usersCol.fields.removeByName('role')
    }
    usersCol.fields.add(
      new SelectField({
        name: 'role',
        required: true,
        values: [
          'Gerentes',
          'Supervisores',
          'Líderes',
          'Consultores',
          'Executivo de contas',
          'Master',
          'Gestor Comercial',
        ],
        maxSelect: 1,
      }),
    )

    if (!usersCol.fields.getByName('bases')) {
      usersCol.fields.add(
        new SelectField({
          name: 'bases',
          required: false,
          values: ['NO/NE', 'CO', 'RJ/ES/MG', 'SAO', 'SPI', 'SUL', 'LOT', 'INSIDE SALES'],
          maxSelect: 8,
        }),
      )
    }

    app.save(usersCol)

    const execCol = app.findCollectionByNameOrId('account_executives')
    if (!execCol.fields.getByName('bases')) {
      execCol.fields.add(
        new SelectField({
          name: 'bases',
          required: false,
          values: ['NO/NE', 'CO', 'RJ/ES/MG', 'SAO', 'SPI', 'SUL', 'LOT', 'INSIDE SALES'],
          maxSelect: 8,
        }),
      )
    }
    app.save(execCol)
  },
  (app) => {
    const usersCol = app.findCollectionByNameOrId('users')
    if (usersCol.fields.getByName('bases')) {
      usersCol.fields.removeByName('bases')
    }
    usersCol.fields.removeByName('role')
    usersCol.fields.add(
      new SelectField({
        name: 'role',
        required: true,
        values: [
          'Gerentes',
          'Supervisores',
          'Líderes',
          'Consultores',
          'Executivo de contas',
          'Master',
        ],
        maxSelect: 1,
      }),
    )
    app.save(usersCol)

    const execCol = app.findCollectionByNameOrId('account_executives')
    if (execCol.fields.getByName('bases')) {
      execCol.fields.removeByName('bases')
    }
    app.save(execCol)
  },
)
