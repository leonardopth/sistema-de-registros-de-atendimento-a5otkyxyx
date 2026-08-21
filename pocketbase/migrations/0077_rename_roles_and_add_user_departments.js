migrate(
  (app) => {
    // 1. Atualizar registros existentes da coleção users para os cargos no singular
    app.db().newQuery("UPDATE users SET role = 'Gerente' WHERE role = 'Gerentes'").execute()
    app.db().newQuery("UPDATE users SET role = 'Supervisor' WHERE role = 'Supervisores'").execute()
    app.db().newQuery("UPDATE users SET role = 'Líder' WHERE role = 'Líderes'").execute()
    app.db().newQuery("UPDATE users SET role = 'Consultor' WHERE role = 'Consultores'").execute()
    app
      .db()
      .newQuery("UPDATE users SET role = 'Executivo de Contas' WHERE role = 'Executivo de contas'")
      .execute()

    // 2. Atualizar campo role e adicionar campo departments na coleção users
    const usersCol = app.findCollectionByNameOrId('users')

    // Atualiza o campo role com os novos valores no singular
    const roleField = usersCol.fields.getByName('role')
    if (roleField) {
      usersCol.fields.removeByName('role')
    }
    usersCol.fields.add(
      new SelectField({
        name: 'role',
        required: true,
        values: [
          'Gerente',
          'Supervisor',
          'Líder',
          'Consultor',
          'Executivo de Contas',
          'Master',
          'Gestor Comercial',
        ],
        maxSelect: 1,
      }),
    )

    // Adiciona o campo departments (JSON)
    if (!usersCol.fields.getByName('departments')) {
      usersCol.fields.add(
        new JSONField({
          name: 'departments',
          required: false,
        }),
      )
    }

    app.save(usersCol)

    // 3. Atualizar regras de acesso (RLS) em todas as coleções que referenciam cargos

    // clients: deleteRule
    try {
      const col = app.findCollectionByNameOrId('clients')
      col.deleteRule =
        "@request.auth.id != '' && (@request.auth.role = 'Gerente' || @request.auth.role = 'Master' || @request.auth.master_access = true)"
      app.save(col)
    } catch (e) {
      console.log('Error updating clients rules:', e.message)
    }

    // service_records: deleteRule
    try {
      const col = app.findCollectionByNameOrId('service_records')
      col.deleteRule =
        "@request.auth.id != '' && (@request.auth.role = 'Gerente' || @request.auth.role = 'Supervisor' || @request.auth.role = 'Líder' || @request.auth.role = 'Master' || @request.auth.master_access = true || assigned_user = @request.auth.id || user_id = @request.auth.id)"
      app.save(col)
    } catch (e) {
      console.log('Error updating service_records rules:', e.message)
    }

    // agents: createRule, updateRule, deleteRule
    try {
      const col = app.findCollectionByNameOrId('agents')
      col.createRule =
        "@request.auth.id != '' && (@request.auth.role != 'Consultor' || @request.auth.master_access = true)"
      col.updateRule =
        "@request.auth.id != '' && (@request.auth.role != 'Consultor' || @request.auth.master_access = true)"
      col.deleteRule =
        "@request.auth.id != '' && (@request.auth.role != 'Consultor' || @request.auth.master_access = true)"
      app.save(col)
    } catch (e) {
      console.log('Error updating agents rules:', e.message)
    }

    // account_executives: createRule, updateRule, deleteRule
    try {
      const col = app.findCollectionByNameOrId('account_executives')
      col.createRule =
        "@request.auth.id != '' && (@request.auth.role = 'Gerente' || @request.auth.role = 'Supervisor' || @request.auth.role = 'Líder' || @request.auth.role = 'Master' || @request.auth.master_access = true)"
      col.updateRule =
        "@request.auth.id != '' && (@request.auth.role = 'Gerente' || @request.auth.role = 'Supervisor' || @request.auth.role = 'Líder' || @request.auth.role = 'Master' || @request.auth.master_access = true)"
      col.deleteRule =
        "@request.auth.id != '' && (@request.auth.role = 'Gerente' || @request.auth.role = 'Supervisor' || @request.auth.role = 'Líder' || @request.auth.role = 'Master' || @request.auth.master_access = true)"
      app.save(col)
    } catch (e) {
      console.log('Error updating account_executives rules:', e.message)
    }

    // trainings: updateRule, deleteRule
    try {
      const col = app.findCollectionByNameOrId('trainings')
      col.updateRule =
        '@request.auth.id != "" && (@request.auth.role = "Gerente" || @request.auth.role = "Supervisor" || @request.auth.role = "Líder" || @request.auth.role = "Master" || @request.auth.master_access = true)'
      col.deleteRule =
        '@request.auth.id != "" && (@request.auth.role = "Gerente" || @request.auth.role = "Supervisor" || @request.auth.role = "Líder" || @request.auth.role = "Master" || @request.auth.master_access = true)'
      app.save(col)
    } catch (e) {
      console.log('Error updating trainings rules:', e.message)
    }

    // agent_targets: createRule, updateRule, deleteRule
    try {
      const col = app.findCollectionByNameOrId('agent_targets')
      col.createRule =
        "@request.auth.id != '' && (@request.auth.role = 'Gerente' || @request.auth.role = 'Supervisor' || @request.auth.role = 'Líder' || @request.auth.role = 'Master' || @request.auth.master_access = true)"
      col.updateRule =
        "@request.auth.id != '' && (@request.auth.role = 'Gerente' || @request.auth.role = 'Supervisor' || @request.auth.role = 'Líder' || @request.auth.role = 'Master' || @request.auth.master_access = true)"
      col.deleteRule =
        "@request.auth.id != '' && (@request.auth.role = 'Gerente' || @request.auth.role = 'Supervisor' || @request.auth.role = 'Líder' || @request.auth.role = 'Master' || @request.auth.master_access = true)"
      app.save(col)
    } catch (e) {
      console.log('Error updating agent_targets rules:', e.message)
    }

    // global_targets: createRule, updateRule
    try {
      const col = app.findCollectionByNameOrId('global_targets')
      col.createRule =
        "@request.auth.id != '' && (@request.auth.role = 'Gerente' || @request.auth.role = 'Supervisor' || @request.auth.role = 'Líder' || @request.auth.role = 'Master' || @request.auth.master_access = true)"
      col.updateRule =
        "@request.auth.id != '' && (@request.auth.role = 'Gerente' || @request.auth.role = 'Supervisor' || @request.auth.role = 'Líder' || @request.auth.role = 'Master' || @request.auth.master_access = true)"
      app.save(col)
    } catch (e) {
      console.log('Error updating global_targets rules:', e.message)
    }

    // user_targets: createRule, updateRule, deleteRule
    try {
      const col = app.findCollectionByNameOrId('user_targets')
      col.createRule =
        '@request.auth.id != "" && (@request.auth.role = "Gerente" || @request.auth.role = "Supervisor" || @request.auth.role = "Líder" || @request.auth.role = "Master" || @request.auth.master_access = true)'
      col.updateRule =
        '@request.auth.id != "" && (@request.auth.role = "Gerente" || @request.auth.role = "Supervisor" || @request.auth.role = "Líder" || @request.auth.role = "Master" || @request.auth.master_access = true)'
      col.deleteRule =
        '@request.auth.id != "" && (@request.auth.role = "Gerente" || @request.auth.role = "Supervisor" || @request.auth.role = "Líder" || @request.auth.role = "Master" || @request.auth.master_access = true)'
      app.save(col)
    } catch (e) {
      console.log('Error updating user_targets rules:', e.message)
    }
  },
  (app) => {
    // Reverter cargos para plural
    app.db().newQuery("UPDATE users SET role = 'Gerentes' WHERE role = 'Gerente'").execute()
    app.db().newQuery("UPDATE users SET role = 'Supervisores' WHERE role = 'Supervisor'").execute()
    app.db().newQuery("UPDATE users SET role = 'Líderes' WHERE role = 'Líder'").execute()
    app.db().newQuery("UPDATE users SET role = 'Consultores' WHERE role = 'Consultor'").execute()
    app
      .db()
      .newQuery("UPDATE users SET role = 'Executivo de contas' WHERE role = 'Executivo de Contas'")
      .execute()

    const usersCol = app.findCollectionByNameOrId('users')
    if (usersCol.fields.getByName('departments')) {
      usersCol.fields.removeByName('departments')
    }
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
    app.save(usersCol)
  },
)
