migrate(
  (app) => {
    const usersCol = app.findCollectionByNameOrId('_pb_users_auth_')
    const absencesCol = app.findCollectionByNameOrId('absences')
    const configCol = app.findCollectionByNameOrId('absence_alert_configs')

    // 1. Atualizar campo 'status' da coleção absences para conter os novos status
    // 'Pendente' | 'Aprovada' | 'Rejeitada' | 'Cancelada' | 'agendada' | 'ativa' | 'encerrada' | 'cancelada'
    const statusField = absencesCol.fields.getByName('status')
    if (statusField) {
      statusField.values = [
        'Pendente',
        'Aprovada',
        'Rejeitada',
        'Cancelada',
        'agendada',
        'ativa',
        'encerrada',
        'cancelada',
      ]
      statusField.maxSelect = 1
    }

    // 2. Adicionar campos de auditoria de aprovação/rejeição na coleção absences
    if (!absencesCol.fields.getByName('approved_by')) {
      absencesCol.fields.add(
        new RelationField({
          name: 'approved_by',
          collectionId: usersCol.id,
          required: false,
          maxSelect: 1,
        }),
      )
    }

    if (!absencesCol.fields.getByName('approved_at')) {
      absencesCol.fields.add(
        new DateField({
          name: 'approved_at',
          required: false,
        }),
      )
    }

    if (!absencesCol.fields.getByName('rejection_reason')) {
      absencesCol.fields.add(
        new TextField({
          name: 'rejection_reason',
          required: false,
        }),
      )
    }

    if (!absencesCol.fields.getByName('approval_notes')) {
      absencesCol.fields.add(
        new TextField({
          name: 'approval_notes',
          required: false,
        }),
      )
    }

    // 3. Atualizar regras de acesso da coleção absences
    // Escrita/alteração de status ou deleção:
    // - Criação: usuário autenticado pode criar (como Pendente para si ou gestor para outros)
    // - Edição (update): apenas gestores (Gerente, Supervisor, Líder, Master) ou quem criou se status for Pendente ou cancelando
    // - Deleção: gestores ou o próprio dono se Pendente
    absencesCol.updateRule =
      "@request.auth.id != '' && (" +
      'user_id = @request.auth.id || ' +
      "@request.auth.role = 'Gerente' || @request.auth.role = 'Supervisor' || " +
      "@request.auth.role = 'Líder' || @request.auth.role = 'Master' || " +
      '@request.auth.master_access = true' +
      ')'

    absencesCol.deleteRule =
      "@request.auth.id != '' && (" +
      'user_id = @request.auth.id || ' +
      "@request.auth.role = 'Gerente' || @request.auth.role = 'Supervisor' || " +
      "@request.auth.role = 'Líder' || @request.auth.role = 'Master' || " +
      '@request.auth.master_access = true' +
      ')'

    app.save(absencesCol)

    // 4. Adicionar campo require_absence_approval na coleção absence_alert_configs
    if (!configCol.fields.getByName('require_absence_approval')) {
      configCol.fields.add(
        new BoolField({
          name: 'require_absence_approval',
          required: false,
        }),
      )
      app.save(configCol)
    }

    // 5. Migração retroativa dos dados existentes: ausências já criadas na v0.0.243 tornam-se 'Aprovada'
    // Conforme requisito 7: "Migração de dados existentes: ausências já criadas na v0.0.243 devem virar 'Aprovada' (retrocompatibilidade)."
    try {
      app
        .db()
        .newQuery(
          "UPDATE absences SET status = 'Aprovada' WHERE status IN ('agendada', 'ativa', 'encerrada') OR status IS NULL OR status = ''",
        )
        .execute()
      app
        .db()
        .newQuery("UPDATE absences SET status = 'Cancelada' WHERE status = 'cancelada'")
        .execute()
    } catch (e) {
      console.log('Aviso ao migrar status de ausências existentes:', e)
    }

    // 6. Atualizar singleton absence_alert_configs para ter require_absence_approval = true por padrão
    try {
      app
        .db()
        .newQuery(
          'UPDATE absence_alert_configs SET require_absence_approval = 1 WHERE require_absence_approval IS NULL',
        )
        .execute()
    } catch (_) {}
  },
  (app) => {
    const absencesCol = app.findCollectionByNameOrId('absences')
    const configCol = app.findCollectionByNameOrId('absence_alert_configs')

    try {
      if (absencesCol.fields.getByName('approved_by')) {
        absencesCol.fields.removeByName('approved_by')
      }
      if (absencesCol.fields.getByName('approved_at')) {
        absencesCol.fields.removeByName('approved_at')
      }
      if (absencesCol.fields.getByName('rejection_reason')) {
        absencesCol.fields.removeByName('rejection_reason')
      }
      if (absencesCol.fields.getByName('approval_notes')) {
        absencesCol.fields.removeByName('approval_notes')
      }
      app.save(absencesCol)
    } catch (_) {}

    try {
      if (configCol.fields.getByName('require_absence_approval')) {
        configCol.fields.removeByName('require_absence_approval')
      }
      app.save(configCol)
    } catch (_) {}
  },
)
