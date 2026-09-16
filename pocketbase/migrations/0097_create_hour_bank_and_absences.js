migrate(
  (app) => {
    const usersCol = app.findCollectionByNameOrId('_pb_users_auth_')

    // 1. Adicionar campo external_id na coleção users (para compatibilidade com integração LG Lugar de Gente)
    if (!usersCol.fields.getByName('external_id')) {
      usersCol.fields.add(
        new TextField({
          name: 'external_id',
          required: false,
        }),
      )
      app.save(usersCol)
    }

    // 2. Criar coleção hour_bank_entries
    // Gestores e líderes não participam do banco de horas (requisito do sistema)
    let hourBankCol
    try {
      hourBankCol = app.findCollectionByNameOrId('hour_bank_entries')
    } catch (_) {
      const col = new Collection({
        name: 'hour_bank_entries',
        type: 'base',
        // Leitura: autenticados (colaborador vê os seus, gestores vêem equipe)
        listRule: "@request.auth.id != ''",
        viewRule: "@request.auth.id != ''",
        // Escrita: gestores/líderes/master lançam para a equipe
        createRule:
          "@request.auth.id != '' && (@request.auth.role = 'Gerente' || @request.auth.role = 'Supervisor' || @request.auth.role = 'Líder' || @request.auth.role = 'Master' || @request.auth.master_access = true)",
        updateRule:
          "@request.auth.id != '' && (@request.auth.role = 'Gerente' || @request.auth.role = 'Supervisor' || @request.auth.role = 'Líder' || @request.auth.role = 'Master' || @request.auth.master_access = true)",
        deleteRule:
          "@request.auth.id != '' && (@request.auth.role = 'Gerente' || @request.auth.role = 'Supervisor' || @request.auth.role = 'Líder' || @request.auth.role = 'Master' || @request.auth.master_access = true)",
        fields: [
          {
            name: 'user_id',
            type: 'relation',
            required: true,
            collectionId: usersCol.id,
            cascadeDelete: true,
            maxSelect: 1,
          },
          {
            name: 'date',
            type: 'date',
            required: true,
          },
          {
            name: 'hours',
            type: 'number',
            required: true,
          },
          {
            name: 'type',
            type: 'select',
            required: true,
            values: ['credito', 'debito'],
            maxSelect: 1,
          },
          {
            name: 'description',
            type: 'text',
            required: true,
          },
          {
            name: 'source',
            type: 'select',
            required: false,
            values: ['manual', 'lg_sync', 'sistema'],
            maxSelect: 1,
          },
          {
            name: 'external_id',
            type: 'text',
            required: false,
          },
          {
            name: 'created_by',
            type: 'relation',
            required: false,
            collectionId: usersCol.id,
            maxSelect: 1,
          },
          { name: 'created', type: 'autodate', onCreate: true, onUpdate: false },
          { name: 'updated', type: 'autodate', onCreate: true, onUpdate: true },
        ],
        indexes: [
          'CREATE INDEX idx_hbe_user ON hour_bank_entries (user_id)',
          'CREATE INDEX idx_hbe_date ON hour_bank_entries (date)',
          'CREATE INDEX idx_hbe_created ON hour_bank_entries (created)',
        ],
      })
      app.save(col)
      hourBankCol = app.findCollectionByNameOrId('hour_bank_entries')
    }

    // 3. Criar coleção absences
    // Motivos: Férias, Banco de horas, Dayoff, Atestado (gestores também participam do calendário)
    let absencesCol
    try {
      absencesCol = app.findCollectionByNameOrId('absences')
    } catch (_) {
      const col = new Collection({
        name: 'absences',
        type: 'base',
        listRule: "@request.auth.id != ''",
        viewRule: "@request.auth.id != ''",
        createRule:
          "@request.auth.id != '' && (user_id = @request.auth.id || @request.auth.role = 'Gerente' || @request.auth.role = 'Supervisor' || @request.auth.role = 'Líder' || @request.auth.role = 'Master' || @request.auth.master_access = true)",
        updateRule:
          "@request.auth.id != '' && (user_id = @request.auth.id || @request.auth.role = 'Gerente' || @request.auth.role = 'Supervisor' || @request.auth.role = 'Líder' || @request.auth.role = 'Master' || @request.auth.master_access = true)",
        deleteRule:
          "@request.auth.id != '' && (user_id = @request.auth.id || @request.auth.role = 'Gerente' || @request.auth.role = 'Supervisor' || @request.auth.role = 'Líder' || @request.auth.role = 'Master' || @request.auth.master_access = true)",
        fields: [
          {
            name: 'user_id',
            type: 'relation',
            required: true,
            collectionId: usersCol.id,
            cascadeDelete: true,
            maxSelect: 1,
          },
          {
            name: 'reason',
            type: 'select',
            required: true,
            values: ['Férias', 'Banco de horas', 'Dayoff', 'Atestado'],
            maxSelect: 1,
          },
          {
            name: 'start_date',
            type: 'date',
            required: true,
          },
          {
            name: 'end_date',
            type: 'date',
            required: true,
          },
          {
            name: 'status',
            type: 'select',
            required: false,
            values: ['agendada', 'ativa', 'encerrada', 'cancelada'],
            maxSelect: 1,
          },
          {
            name: 'notes',
            type: 'text',
            required: false,
          },
          {
            name: 'source',
            type: 'select',
            required: false,
            values: ['manual', 'lg_sync'],
            maxSelect: 1,
          },
          {
            name: 'external_id',
            type: 'text',
            required: false,
          },
          {
            name: 'coverage_checked',
            type: 'bool',
            required: false,
          },
          {
            name: 'created_by',
            type: 'relation',
            required: false,
            collectionId: usersCol.id,
            maxSelect: 1,
          },
          { name: 'created', type: 'autodate', onCreate: true, onUpdate: false },
          { name: 'updated', type: 'autodate', onCreate: true, onUpdate: true },
        ],
        indexes: [
          'CREATE INDEX idx_abs_user ON absences (user_id)',
          'CREATE INDEX idx_abs_start ON absences (start_date)',
          'CREATE INDEX idx_abs_end ON absences (end_date)',
          'CREATE INDEX idx_abs_reason ON absences (reason)',
          'CREATE INDEX idx_abs_status ON absences (status)',
        ],
      })
      app.save(col)
      absencesCol = app.findCollectionByNameOrId('absences')
    }

    // 4. Criar coleção absence_alert_configs (singleton de configuração editável)
    // - Limite de acúmulo de banco de horas (default 10h) - editável!
    // - Dias de alerta para férias vencendo (default 60 dias)
    // - Janela ideal de concessão (meses após aquisição, default 6 a 11 meses)
    // - Limite de interjornada CLT (default 11h)
    // - Dias consecutivos sem descanso CLT / DSR (default 7)
    // - Limite máximo de colaboradores ausentes por equipe/núcleo (% de cobertura, default 30%)
    let configCol
    try {
      configCol = app.findCollectionByNameOrId('absence_alert_configs')
    } catch (_) {
      const col = new Collection({
        name: 'absence_alert_configs',
        type: 'base',
        listRule: "@request.auth.id != ''",
        viewRule: "@request.auth.id != ''",
        createRule:
          "@request.auth.id != '' && (@request.auth.role = 'Gerente' || @request.auth.role = 'Supervisor' || @request.auth.role = 'Líder' || @request.auth.role = 'Master' || @request.auth.master_access = true)",
        updateRule:
          "@request.auth.id != '' && (@request.auth.role = 'Gerente' || @request.auth.role = 'Supervisor' || @request.auth.role = 'Líder' || @request.auth.role = 'Master' || @request.auth.master_access = true)",
        deleteRule: null,
        fields: [
          {
            name: 'hour_bank_limit_hours',
            type: 'number',
            required: true,
            min: 1,
          },
          {
            name: 'hour_bank_negative_limit_hours',
            type: 'number',
            required: false,
            min: 0,
          },
          {
            name: 'vacation_warning_days_before_expiry',
            type: 'number',
            required: true,
            min: 1,
          },
          {
            name: 'vacation_ideal_window_start_months',
            type: 'number',
            required: true,
            min: 0,
          },
          {
            name: 'vacation_ideal_window_end_months',
            type: 'number',
            required: true,
            min: 1,
          },
          {
            name: 'min_interjornada_hours',
            type: 'number',
            required: true,
            min: 1,
          },
          {
            name: 'max_consecutive_work_days',
            type: 'number',
            required: true,
            min: 1,
          },
          {
            name: 'max_team_absence_pct',
            type: 'number',
            required: true,
            min: 1,
            max: 100,
          },
          {
            name: 'lg_integration_enabled',
            type: 'bool',
            required: false,
          },
          {
            name: 'lg_api_base_url',
            type: 'text',
            required: false,
          },
          {
            name: 'updated_by',
            type: 'relation',
            required: false,
            collectionId: usersCol.id,
            maxSelect: 1,
          },
          { name: 'created', type: 'autodate', onCreate: true, onUpdate: false },
          { name: 'updated', type: 'autodate', onCreate: true, onUpdate: true },
        ],
        indexes: [],
      })
      app.save(col)
      configCol = app.findCollectionByNameOrId('absence_alert_configs')
    }

    // Seed default config singleton
    try {
      const existing = app.findRecordsByFilter('absence_alert_configs', "id != ''", 'created', 1, 0)
      if (!existing || existing.length === 0) {
        const defaultCfg = new Record(configCol)
        defaultCfg.set('hour_bank_limit_hours', 10)
        defaultCfg.set('hour_bank_negative_limit_hours', 10)
        defaultCfg.set('vacation_warning_days_before_expiry', 60)
        defaultCfg.set('vacation_ideal_window_start_months', 6)
        defaultCfg.set('vacation_ideal_window_end_months', 11)
        defaultCfg.set('min_interjornada_hours', 11)
        defaultCfg.set('max_consecutive_work_days', 7)
        defaultCfg.set('max_team_absence_pct', 30)
        defaultCfg.set('lg_integration_enabled', false)
        defaultCfg.set('lg_api_base_url', 'https://api.lugar-de-gente.com.br/v1')
        app.save(defaultCfg)
      }
    } catch (_) {}

    // Seed demonstrativo leve de ausências para o mês atual para garantir visualização imediata do calendário
    try {
      const existingAbs = app.findRecordsByFilter('absences', "id != ''", 'created', 1, 0)
      if (!existingAbs || existingAbs.length === 0) {
        // Encontra consultores para ter amostra no calendário
        const sampleUsers = app.findRecordsByFilter(
          'users',
          "role = 'Consultor' || role = 'Supervisor'",
          'created',
          4,
          0,
        )

        const now = new Date()
        const yyyy = now.getUTCFullYear()
        const mm = String(now.getUTCMonth() + 1).padStart(2, '0')
        const dd = String(now.getUTCDate()).padStart(2, '0')

        if (sampleUsers.length > 0) {
          // Amostra 1: Férias do usuário 0
          const r1 = new Record(absencesCol)
          r1.set('user_id', sampleUsers[0].id)
          r1.set('reason', 'Férias')
          r1.set('start_date', `${yyyy}-${mm}-05 00:00:00.000Z`)
          r1.set('end_date', `${yyyy}-${mm}-15 23:59:59.000Z`)
          r1.set('status', 'ativa')
          r1.set('notes', 'Férias regulares período 2025/2026')
          r1.set('source', 'manual')
          r1.set('coverage_checked', true)
          app.save(r1)
        }

        if (sampleUsers.length > 1) {
          // Amostra 2: Dayoff do usuário 1
          const r2 = new Record(absencesCol)
          r2.set('user_id', sampleUsers[1].id)
          r2.set('reason', 'Dayoff')
          r2.set('start_date', `${yyyy}-${mm}-${dd} 00:00:00.000Z`)
          r2.set('end_date', `${yyyy}-${mm}-${dd} 23:59:59.000Z`)
          r2.set('status', 'ativa')
          r2.set('notes', 'Dayoff de aniversário')
          r2.set('source', 'manual')
          r2.set('coverage_checked', true)
          app.save(r2)
        }

        if (sampleUsers.length > 2) {
          // Amostra 3: Banco de horas folga
          const r3 = new Record(absencesCol)
          r3.set('user_id', sampleUsers[2].id)
          r3.set('reason', 'Banco de horas')
          const tomorrow = new Date(now.getTime() + 24 * 3600 * 1000)
          const tMm = String(tomorrow.getUTCMonth() + 1).padStart(2, '0')
          const tDd = String(tomorrow.getUTCDate()).padStart(2, '0')
          r3.set('start_date', `${yyyy}-${tMm}-${tDd} 00:00:00.000Z`)
          r3.set('end_date', `${yyyy}-${tMm}-${tDd} 23:59:59.000Z`)
          r3.set('status', 'agendada')
          r3.set('notes', 'Compensação de horas excedentes')
          r3.set('source', 'manual')
          r3.set('coverage_checked', true)
          app.save(r3)
        }
      }
    } catch (_) {}
  },
  (app) => {
    try {
      const hbe = app.findCollectionByNameOrId('hour_bank_entries')
      app.delete(hbe)
    } catch (_) {}
    try {
      const abs = app.findCollectionByNameOrId('absences')
      app.delete(abs)
    } catch (_) {}
    try {
      const cfg = app.findCollectionByNameOrId('absence_alert_configs')
      app.delete(cfg)
    } catch (_) {}
  },
)
