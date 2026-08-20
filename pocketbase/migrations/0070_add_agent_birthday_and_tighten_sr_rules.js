migrate(
  (app) => {
    // 1. Atualiza agents para incluir campo birthday (date, opcional)
    const agentsCol = app.findCollectionByNameOrId('agents')
    if (!agentsCol.fields.getByName('birthday')) {
      agentsCol.fields.add(
        new DateField({
          name: 'birthday',
          required: false,
        }),
      )
      app.save(agentsCol)
    }

    // 2. Atualiza service_records para garantir regras de acesso seguras (RBAC)
    // Cada usuário visualiza apenas:
    // (a) Seus próprios atendimentos (user_id = @request.auth.id || assigned_user = @request.auth.id)
    // (b) Atendimentos compartilhados com ele (via service_record_shares)
    // (c) EXCEÇÃO: usuários 'Master' ou com master_access = true ou lideranças (Gerentes, Supervisores, Líderes)
    const srCol = app.findCollectionByNameOrId('service_records')
    const srRule =
      "@request.auth.id != '' && (" +
      "@request.auth.role = 'Master' || " +
      '@request.auth.master_access = true || ' +
      "@request.auth.role = 'Gerentes' || " +
      "@request.auth.role = 'Supervisores' || " +
      "@request.auth.role = 'Líderes' || " +
      'user_id = @request.auth.id || ' +
      'assigned_user = @request.auth.id || ' +
      '@request.auth.id ?= @collection.service_record_shares.user' +
      ')'

    srCol.listRule = srRule
    srCol.viewRule = srRule
    app.save(srCol)

    // 3. Atualiza service_record_shares para permitir que usuários Master visualizem e gerenciem shares
    const sharesCol = app.findCollectionByNameOrId('service_record_shares')
    sharesCol.listRule =
      "@request.auth.id != '' && (user = @request.auth.id || shared_by = @request.auth.id || @request.auth.role = 'Master' || @request.auth.master_access = true || @request.auth.role = 'Gerentes' || @request.auth.role = 'Supervisores' || @request.auth.role = 'Líderes')"
    sharesCol.viewRule =
      "@request.auth.id != '' && (user = @request.auth.id || shared_by = @request.auth.id || @request.auth.role = 'Master' || @request.auth.master_access = true || @request.auth.role = 'Gerentes' || @request.auth.role = 'Supervisores' || @request.auth.role = 'Líderes')"
    app.save(sharesCol)
  },
  (app) => {
    try {
      const agentsCol = app.findCollectionByNameOrId('agents')
      const bField = agentsCol.fields.getByName('birthday')
      if (bField) {
        agentsCol.fields.removeByName('birthday')
        app.save(agentsCol)
      }
    } catch (_) {}
  },
)
