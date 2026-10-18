migrate(
  (app) => {
    const isLeaderOrMaster =
      "@request.auth.id != '' && (@request.auth.role = 'Líder' || @request.auth.role = 'Supervisor' || @request.auth.role = 'Gerente' || @request.auth.role = 'Master' || @request.auth.master_access = true)"

    // 1. Coleção waiver_configs (Parâmetros: unidades e aprovadores por companhia)
    const configsCollection = new Collection({
      name: 'waiver_configs',
      type: 'base',
      listRule: "@request.auth.id != ''",
      viewRule: "@request.auth.id != ''",
      createRule: isLeaderOrMaster,
      updateRule: isLeaderOrMaster,
      deleteRule: isLeaderOrMaster,
      fields: [
        { name: 'units', type: 'json' }, // lista de strings de unidades disponíveis
        { name: 'approvers_latam', type: 'json' }, // lista de nomes de aprovadores para LATAM
        { name: 'approvers_afkl', type: 'json' }, // lista de nomes de aprovadores para AF/KL
        { name: 'approvers_assistencia', type: 'json' }, // lista de nomes de aprovadores para Assistência
        { name: 'approvers_default', type: 'json' }, // fallback
        { name: 'airlines_config', type: 'json' }, // definições dinâmicas de companhias/campos se customizadas
        { name: 'updated_by', type: 'relation', collectionId: '_pb_users_auth_', maxSelect: 1 },
        { name: 'created', type: 'autodate', onCreate: true, onUpdate: false },
        { name: 'updated', type: 'autodate', onCreate: true, onUpdate: true },
      ],
    })
    app.save(configsCollection)

    // Seed inicial de waiver_configs
    const configRecord = new Record(configsCollection)
    configRecord.set('units', ['Concierge', 'Exclusivo', 'LOT', 'BR1', 'BR2', 'SAO', 'SPI', 'SUL'])
    configRecord.set('approvers_latam', [
      'Katia Vieira',
      'Ruana Recio',
      'Gerência Operacional',
      'Supervisão LATAM',
      'Coordenação de Atendimento',
    ])
    configRecord.set('approvers_afkl', [
      'Anderson Salva',
      'Paulo Lobao',
      'Sheila Fontana',
      'Felipe Dias',
      'Eduardo Scalzo',
      'Gerência Operacional',
      'Supervisão AF/KL',
    ])
    configRecord.set('approvers_assistencia', [
      'Coordenação Aeroportos',
      'Supervisão de Operações',
      'Gerência Operacional',
      'Plantão CCO',
    ])
    configRecord.set('approvers_default', [
      'Gerência Operacional',
      'Supervisão de Operações',
      'Liderança de Atendimento',
    ])
    app.save(configRecord)

    // 2. Coleção waiver_requests (Solicitações de Waivers & Favors)
    const requestsCollection = new Collection({
      name: 'waiver_requests',
      type: 'base',
      listRule: "@request.auth.id != ''",
      viewRule: "@request.auth.id != ''",
      createRule: "@request.auth.id != ''",
      updateRule: "@request.auth.id != ''",
      deleteRule:
        "@request.auth.id != '' && (@request.auth.role = 'Master' || @request.auth.master_access = true)",
      fields: [
        { name: 'airline_key', type: 'text', required: true }, // 'latam' | 'afkl' | 'assistencia' | etc.
        { name: 'airline_name', type: 'text', required: true }, // 'LATAM - Isenções'
        { name: 'request_type', type: 'text' }, // Tipo específico da solicitação (ex: 'MULTA', 'FARE MATCH', 'EMBARQUE')
        { name: 'unit', type: 'text', required: true }, // Unidade/núcleo (ex: Concierge, SAO, etc.)
        { name: 'gds_locator', type: 'text' }, // Localizador GDS principal
        { name: 'airline_locator', type: 'text' }, // Localizador Cia
        { name: 'pax_count', type: 'number' }, // Qtd Pax
        { name: 'pax_name', type: 'text' }, // Nome do Pax principal
        { name: 'amount', type: 'number' }, // Valor em USD/EUR/BRL
        { name: 'currency', type: 'text' }, // 'USD' | 'EUR' | 'BRL'
        { name: 'priority', type: 'text' }, // 'BAIXA' | 'MÉDIA' | 'ALTA'
        { name: 'approver_name', type: 'text', required: true }, // Nome do aprovador selecionado
        {
          name: 'status',
          type: 'select',
          values: ['Pendente', 'Em análise', 'Aprovada', 'Negociada', 'Recusada'],
          maxSelect: 1,
        },
        { name: 'form_data', type: 'json' }, // Objeto completo com todos os campos dinâmicos preenchidos
        {
          name: 'requester',
          type: 'relation',
          collectionId: '_pb_users_auth_',
          required: true,
          maxSelect: 1,
        },
        { name: 'reviewed_by', type: 'relation', collectionId: '_pb_users_auth_', maxSelect: 1 },
        { name: 'reviewed_at', type: 'date' },
        { name: 'review_notes', type: 'text' }, // Resposta/observação da análise
        { name: 'negotiated_amount', type: 'number' }, // Se status = Negociada, valor aprovado
        { name: 'created', type: 'autodate', onCreate: true, onUpdate: false },
        { name: 'updated', type: 'autodate', onCreate: true, onUpdate: true },
      ],
      indexes: [
        'CREATE INDEX idx_wr_status ON waiver_requests (status)',
        'CREATE INDEX idx_wr_airline ON waiver_requests (airline_key)',
        'CREATE INDEX idx_wr_unit ON waiver_requests (unit)',
        'CREATE INDEX idx_wr_requester ON waiver_requests (requester)',
        'CREATE INDEX idx_wr_gds ON waiver_requests (gds_locator)',
        'CREATE INDEX idx_wr_created ON waiver_requests (created DESC)',
      ],
    })
    app.save(requestsCollection)

    // 3. Coleção waiver_history (Auditoria e Linha do Tempo)
    const historyCollection = new Collection({
      name: 'waiver_history',
      type: 'base',
      listRule: "@request.auth.id != ''",
      viewRule: "@request.auth.id != ''",
      createRule: "@request.auth.id != ''",
      updateRule: null,
      deleteRule: null,
      fields: [
        {
          name: 'waiver_request',
          type: 'relation',
          collectionId: requestsCollection.id,
          required: true,
          cascadeDelete: true,
          maxSelect: 1,
        },
        { name: 'action', type: 'text', required: true }, // 'Criação', 'Início de Análise', 'Aprovação', 'Negociação', 'Recusa', 'Atualização'
        { name: 'previous_status', type: 'text' },
        { name: 'new_status', type: 'text' },
        {
          name: 'user',
          type: 'relation',
          collectionId: '_pb_users_auth_',
          required: true,
          maxSelect: 1,
        },
        { name: 'notes', type: 'text' },
        { name: 'details', type: 'json' },
        { name: 'created', type: 'autodate', onCreate: true, onUpdate: false },
        { name: 'updated', type: 'autodate', onCreate: true, onUpdate: true },
      ],
      indexes: [
        'CREATE INDEX idx_wh_request ON waiver_history (waiver_request)',
        'CREATE INDEX idx_wh_created ON waiver_history (created DESC)',
      ],
    })
    app.save(historyCollection)
  },
  (app) => {
    try {
      const historyCol = app.findCollectionByNameOrId('waiver_history')
      app.delete(historyCol)
    } catch (_) {}

    try {
      const requestsCol = app.findCollectionByNameOrId('waiver_requests')
      app.delete(requestsCol)
    } catch (_) {}

    try {
      const configsCol = app.findCollectionByNameOrId('waiver_configs')
      app.delete(configsCol)
    } catch (_) {}
  },
)
