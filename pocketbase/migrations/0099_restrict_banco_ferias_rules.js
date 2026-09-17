migrate(
  (app) => {
    // 1. Atualizar absence_alert_configs:
    // Acesso somente para Master/Admin (role = 'Master' ou master_access = true), Líder (role = 'Líder') e Gestor Comercial (role = 'Gestor Comercial')
    const configCol = app.findCollectionByNameOrId('absence_alert_configs')
    const leaderOrAdminRule =
      "@request.auth.id != '' && (" +
      "@request.auth.role = 'Master' || " +
      '@request.auth.master_access = true || ' +
      "@request.auth.role = 'Líder' || " +
      "@request.auth.role = 'Gestor Comercial'" +
      ')'

    configCol.listRule = leaderOrAdminRule
    configCol.viewRule = leaderOrAdminRule
    configCol.createRule = leaderOrAdminRule
    configCol.updateRule = leaderOrAdminRule
    configCol.deleteRule = null
    app.save(configCol)

    // 2. Atualizar hour_bank_entries:
    // Leitura e escrita: Master/admin irrestrito;
    // Demais usuários autenticados:
    // - Consultor pode ver os seus próprios registros (user_id = @request.auth.id)
    // - Gestores/Líderes/Supervisores podem criar/atualizar/deletar e listar registros
    // Reforçado também pelo hook server-side restrict_banco_ferias_access.js
    const hourBankCol = app.findCollectionByNameOrId('hour_bank_entries')
    const canManageHourBank =
      "@request.auth.role = 'Gerente' || @request.auth.role = 'Supervisor' || @request.auth.role = 'Líder' || @request.auth.role = 'Master' || @request.auth.master_access = true || @request.auth.role = 'Gestor Comercial'"

    hourBankCol.listRule =
      "@request.auth.id != '' && (user_id = @request.auth.id || " + canManageHourBank + ')'
    hourBankCol.viewRule =
      "@request.auth.id != '' && (user_id = @request.auth.id || " + canManageHourBank + ')'
    hourBankCol.createRule = "@request.auth.id != '' && (" + canManageHourBank + ')'
    hourBankCol.updateRule = "@request.auth.id != '' && (" + canManageHourBank + ')'
    hourBankCol.deleteRule = "@request.auth.id != '' && (" + canManageHourBank + ')'
    app.save(hourBankCol)

    // 3. Atualizar absences:
    // Leitura: Master irrestrito; Consultor apenas suas próprias ausências; Gestores/Líderes do seu escopo (reforçado no hook)
    const absencesCol = app.findCollectionByNameOrId('absences')
    const canManageAbsences =
      "@request.auth.role = 'Gerente' || @request.auth.role = 'Supervisor' || @request.auth.role = 'Líder' || @request.auth.role = 'Master' || @request.auth.master_access = true || @request.auth.role = 'Gestor Comercial'"

    absencesCol.listRule =
      "@request.auth.id != '' && (user_id = @request.auth.id || " + canManageAbsences + ')'
    absencesCol.viewRule =
      "@request.auth.id != '' && (user_id = @request.auth.id || " + canManageAbsences + ')'
    absencesCol.createRule =
      "@request.auth.id != '' && (user_id = @request.auth.id || " + canManageAbsences + ')'
    absencesCol.updateRule =
      "@request.auth.id != '' && (user_id = @request.auth.id || " + canManageAbsences + ')'
    absencesCol.deleteRule =
      "@request.auth.id != '' && (user_id = @request.auth.id || " + canManageAbsences + ')'
    app.save(absencesCol)
  },
  (app) => {
    // Reverter regras para as anteriores caso necessário
    try {
      const configCol = app.findCollectionByNameOrId('absence_alert_configs')
      configCol.listRule = "@request.auth.id != ''"
      configCol.viewRule = "@request.auth.id != ''"
      configCol.createRule =
        "@request.auth.id != '' && (@request.auth.role = 'Gerente' || @request.auth.role = 'Supervisor' || @request.auth.role = 'Líder' || @request.auth.role = 'Master' || @request.auth.master_access = true)"
      configCol.updateRule =
        "@request.auth.id != '' && (@request.auth.role = 'Gerente' || @request.auth.role = 'Supervisor' || @request.auth.role = 'Líder' || @request.auth.role = 'Master' || @request.auth.master_access = true)"
      app.save(configCol)
    } catch (_) {}

    try {
      const hourBankCol = app.findCollectionByNameOrId('hour_bank_entries')
      hourBankCol.listRule = "@request.auth.id != ''"
      hourBankCol.viewRule = "@request.auth.id != ''"
      app.save(hourBankCol)
    } catch (_) {}

    try {
      const absencesCol = app.findCollectionByNameOrId('absences')
      absencesCol.listRule = "@request.auth.id != ''"
      absencesCol.viewRule = "@request.auth.id != ''"
      app.save(absencesCol)
    } catch (_) {}
  },
)
