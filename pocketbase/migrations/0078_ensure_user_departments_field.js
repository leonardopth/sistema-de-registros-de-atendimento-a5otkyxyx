migrate(
  (app) => {
    const usersCol = app.findCollectionByNameOrId('users')

    // Garantir que o campo 'departments' existe e é do tipo JSON
    if (!usersCol.fields.getByName('departments')) {
      usersCol.fields.add(
        new JSONField({
          name: 'departments',
          required: false,
        }),
      )
      app.save(usersCol)
    }

    // Se houver registros com campo departamento nulo ou vazio e precisarmos de valor padrão ou manter compatibilidade
  },
  (app) => {
    const usersCol = app.findCollectionByNameOrId('users')
    if (usersCol.fields.getByName('departments')) {
      usersCol.fields.removeByName('departments')
      app.save(usersCol)
    }
  },
)
