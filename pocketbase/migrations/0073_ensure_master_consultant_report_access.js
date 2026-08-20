migrate(
  (app) => {
    // Garante que a collection service_records tenha regras RBAC apropriadas onde:
    // - Usuários Master ou com master_access = true têm acesso total irrestrito (list e view)
    // - Líderes/Gestores (Gerentes, Supervisores, Líderes) têm acesso a list e view
    // - Usuários consultores/comuns acessam seus próprios registros (user_id ou assigned_user) ou registros compartilhados com eles
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

    // Garante que a collection users permita list/view para usuários autenticados
    // e update/delete apenas para o próprio usuário ou Master
    const usersCol = app.findCollectionByNameOrId('_pb_users_auth_')
    usersCol.listRule = "@request.auth.id != ''"
    usersCol.viewRule = "@request.auth.id != ''"
    usersCol.updateRule =
      "id = @request.auth.id || @request.auth.role = 'Master' || @request.auth.master_access = true"
    usersCol.deleteRule =
      "id = @request.auth.id || @request.auth.role = 'Master' || @request.auth.master_access = true"
    app.save(usersCol)
  },
  (app) => {
    // Reversão mantém regras anteriores sem quebrar o sistema
  },
)
