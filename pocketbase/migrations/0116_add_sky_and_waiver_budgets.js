migrate(
  (app) => {
    const isLeaderOrMaster =
      "@request.auth.id != '' && (@request.auth.role = 'Líder' || @request.auth.role = 'Supervisor' || @request.auth.role = 'Gerente' || @request.auth.role = 'Master' || @request.auth.master_access = true)"

    // 1. Adicionar approvers_sky em waiver_configs se não existir
    const configsCol = app.findCollectionByNameOrId('waiver_configs')
    if (!configsCol.fields.getByName('approvers_sky')) {
      configsCol.fields.add(new JSONField({ name: 'approvers_sky' }))
      app.save(configsCol)
    }

    // Inicializar seed para approvers_sky se estiver vazio
    try {
      const records = app.findRecordsByFilter('waiver_configs', "id != ''", '-created', 1, 0)
      if (records && records.length > 0) {
        const record = records[0]
        if (!record.get('approvers_sky')) {
          record.set('approvers_sky', [
            'Laurence Brotero',
            'Gerência Comercial',
            'Supervisão Operacional',
            'Coordenação de Atendimento',
          ])
          app.save(record)
        }
      }
    } catch (err) {
      console.log('Aviso ao inicializar approvers_sky em waiver_configs:', err)
    }

    // 2. Criar coleção waiver_budgets
    const budgetsCollection = new Collection({
      name: 'waiver_budgets',
      type: 'base',
      listRule: "@request.auth.id != ''",
      viewRule: "@request.auth.id != ''",
      createRule: isLeaderOrMaster,
      updateRule: isLeaderOrMaster,
      deleteRule: isLeaderOrMaster,
      fields: [
        {
          name: 'airline_key',
          type: 'text',
          required: true,
        }, // 'latam' | 'afkl' | 'gol' | 'aa' | 'sky' | 'assistencia'
        {
          name: 'airline_name',
          type: 'text',
        },
        {
          name: 'category',
          type: 'text',
          required: true,
        }, // tipo/categoria da verba (ex: isenção, multa, dif. tarifa)
        {
          name: 'period_label',
          type: 'text',
          required: true,
        }, // Rótulo do período (ex: "2026-03", "1º Semestre 2026", "Março/2026")
        {
          name: 'start_date',
          type: 'date',
        },
        {
          name: 'end_date',
          type: 'date',
        },
        {
          name: 'budget_amount',
          type: 'number',
          required: true,
        }, // Valor orçado
        {
          name: 'used_amount',
          type: 'number',
        }, // Valor já consumido acumulado
        {
          name: 'currency',
          type: 'select',
          values: ['USD', 'BRL', 'EUR'],
          maxSelect: 1,
          required: true,
        },
        {
          name: 'unit',
          type: 'text',
        }, // Unidade/núcleo opcional
        {
          name: 'status',
          type: 'select',
          values: ['Ativo', 'Inativo', 'Encerrado'],
          maxSelect: 1,
          required: true,
        },
        {
          name: 'notes',
          type: 'text',
        },
        {
          name: 'created_by',
          type: 'relation',
          collectionId: '_pb_users_auth_',
          maxSelect: 1,
        },
        {
          name: 'created',
          type: 'autodate',
          onCreate: true,
          onUpdate: false,
        },
        {
          name: 'updated',
          type: 'autodate',
          onCreate: true,
          onUpdate: true,
        },
      ],
      indexes: [
        'CREATE INDEX idx_wb_airline ON waiver_budgets (airline_key)',
        'CREATE INDEX idx_wb_status ON waiver_budgets (status)',
        'CREATE INDEX idx_wb_period ON waiver_budgets (period_label)',
        'CREATE INDEX idx_wb_created ON waiver_budgets (created DESC)',
      ],
    })
    app.save(budgetsCollection)
  },
  (app) => {
    try {
      const budgetsCol = app.findCollectionByNameOrId('waiver_budgets')
      app.delete(budgetsCol)
    } catch (_) {}

    try {
      const configsCol = app.findCollectionByNameOrId('waiver_configs')
      const skyField = configsCol.fields.getByName('approvers_sky')
      if (skyField) configsCol.fields.removeByName('approvers_sky')
      app.save(configsCol)
    } catch (_) {}
  },
)
