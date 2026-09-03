migrate(
  (app) => {
    // 1. Atualizar a coleção service_records com os novos valores canônicos para contact_reason
    const srCol = app.findCollectionByNameOrId('service_records')
    const canonicalReasons = [
      'Bagagem',
      'Assento',
      'Cálculo de Reemissão',
      'Reembolso',
      'Cotação',
      'Reserva',
      'Cancelamento',
      'Regras Tarifárias',
      'Erro RF',
      'Remarcação',
      'Check-in',
      'Alteração de Voo',
      'Reclamação',
      'Dúvida Geral',
      'Outros',
    ]

    const reasonField = srCol.fields.getByName('contact_reason')
    if (reasonField) {
      reasonField.values = canonicalReasons
      app.save(srCol)
    }

    // 2. Normalizar os registros existentes em service_records via SQL direto
    // para ser 100% atômico, confiável e persistido no SQLite do PocketBase
    const updates = [
      // Cálculo de Reemissão
      "UPDATE service_records SET contact_reason = 'Cálculo de Reemissão' WHERE LOWER(contact_reason) LIKE '%calculo%reemissao%' OR LOWER(contact_reason) LIKE '%calculo%re-emissao%' OR LOWER(contact_reason) = 'reemissao' OR contact_reason = 'cálculo reemissão'",

      // Reembolso
      "UPDATE service_records SET contact_reason = 'Reembolso' WHERE LOWER(contact_reason) = 'reembolso'",

      // Cotação
      "UPDATE service_records SET contact_reason = 'Cotação' WHERE LOWER(contact_reason) = 'cotacao' OR contact_reason = 'cotação' OR LOWER(contact_reason) = 'orcamento' OR contact_reason = 'orçamento' OR LOWER(contact_reason) = 'venda'",

      // Reserva
      "UPDATE service_records SET contact_reason = 'Reserva' WHERE LOWER(contact_reason) = 'reserva'",

      // Cancelamento
      "UPDATE service_records SET contact_reason = 'Cancelamento' WHERE LOWER(contact_reason) = 'cancelamento'",

      // Regras Tarifárias
      "UPDATE service_records SET contact_reason = 'Regras Tarifárias' WHERE LOWER(contact_reason) LIKE '%regra%tarifari%' OR contact_reason = 'regras tarifárias'",

      // Erro RF
      "UPDATE service_records SET contact_reason = 'Erro RF' WHERE LOWER(contact_reason) = 'erro rf' OR contact_reason = 'rf' OR contact_reason = 'erro RF'",

      // Remarcação
      "UPDATE service_records SET contact_reason = 'Remarcação' WHERE LOWER(contact_reason) = 'remarcacao' OR contact_reason = 'remarcação' OR LOWER(contact_reason) = 'remarcacoes' OR contact_reason = 'remarcações'",

      // Check-in
      "UPDATE service_records SET contact_reason = 'Check-in' WHERE LOWER(contact_reason) = 'check-in' OR LOWER(contact_reason) = 'checkin'",

      // Alteração de Voo
      "UPDATE service_records SET contact_reason = 'Alteração de Voo' WHERE LOWER(contact_reason) LIKE '%alteracao%' OR contact_reason = 'alteração de voo'",

      // Reclamação
      "UPDATE service_records SET contact_reason = 'Reclamação' WHERE LOWER(contact_reason) = 'reclamacao' OR contact_reason = 'reclamação'",

      // Dúvida Geral
      "UPDATE service_records SET contact_reason = 'Dúvida Geral' WHERE LOWER(contact_reason) LIKE '%duvida%' OR LOWER(contact_reason) LIKE '%suporte%' OR LOWER(contact_reason) LIKE '%informacao%'",

      // Outros
      "UPDATE service_records SET contact_reason = 'Outros' WHERE LOWER(contact_reason) = 'outros' OR LOWER(contact_reason) = 'outro'",

      // Bagagem e Assento caso estejam em lowercase
      "UPDATE service_records SET contact_reason = 'Bagagem' WHERE LOWER(contact_reason) = 'bagagem'",
      "UPDATE service_records SET contact_reason = 'Assento' WHERE LOWER(contact_reason) = 'assento'",
    ]

    for (let i = 0; i < updates.length; i++) {
      try {
        app.db().newQuery(updates[i]).execute()
      } catch (e) {
        console.log('Erro ao executar sql:', updates[i], e)
      }
    }
  },
  (app) => {
    // Reverter para valores anteriores se necessário
    try {
      const srCol = app.findCollectionByNameOrId('service_records')
      const reasonField = srCol.fields.getByName('contact_reason')
      if (reasonField) {
        reasonField.values = [
          'Bagagem',
          'Assento',
          'cálculo reemissão',
          'reembolso',
          'cotação',
          'reserva',
          'cancelamento',
          'regras tarifárias',
          'erro RF',
          'outros',
        ]
        app.save(srCol)
      }
    } catch (_) {}
  },
)
