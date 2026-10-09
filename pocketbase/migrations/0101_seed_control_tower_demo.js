migrate(
  (app) => {
    // Se já houver registros em control_tower_emails, não cria dados de demonstração
    if (app.countRecords('control_tower_emails') > 0) return

    const emailsCol = app.findCollectionByNameOrId('control_tower_emails')
    const usersCol = app.findCollectionByNameOrId('users')
    const clientsCol = app.findCollectionByNameOrId('clients')

    // Buscar cliente prioritário (VIP) se existir
    let vipClient = null
    let regularClient = null
    try {
      const clients = app.findRecordsByFilter('clients', '', '', 10, 0)
      if (clients && clients.length > 0) {
        regularClient = clients[0]
        // Marcar primeiro cliente como VIP se nenhum estiver
        regularClient.set('priority_client', true)
        app.save(regularClient)
        vipClient = regularClient
        if (clients.length > 1) {
          regularClient = clients[1]
        }
      }
    } catch (_) {}

    // Buscar usuário consultor/supervisor para atribuir um dos e-mails
    let assigneeUser = null
    try {
      const uList = app.findRecordsByFilter(
        'users',
        "role = 'Consultor' || role = 'Supervisor'",
        '',
        1,
        0,
      )
      if (uList && uList.length > 0) {
        assigneeUser = uList[0]
      }
    } catch (_) {}

    const now = new Date()
    const oneHourAgo = new Date(now.getTime() - 1 * 3600000).toISOString()
    const threeHoursAgo = new Date(now.getTime() - 3 * 3600000).toISOString()
    const sixHoursAgo = new Date(now.getTime() - 6 * 3600000).toISOString()
    const yesterday = new Date(now.getTime() - 26 * 3600000).toISOString()

    // 1. E-mail P1 Crítico: Embarque < 24h + Cancelamento + VIP
    const email1 = new Record(emailsCol)
    email1.set('subject', 'URGENTE: Voo cancelado - Embarque hoje às 20h - Localizador KLM921')
    email1.set('sender_email', 'fernanda@abcturismo.com.br')
    email1.set('sender_name', 'Fernanda Oliveira')
    email1.set('recipient_email', 'atendimento@rexturadvance.com.br')
    email1.set(
      'body_snippet',
      'Prezados, o voo dos passageiros foi cancelado pela cia aérea. Embarque previsto para hoje 10/10 com partida às 20h. PNR KLM921. Precisamos urgente de remarcação e reemissão para não perderem conexão em Paris. Cliente VIP da nossa agência.',
    )
    email1.set('received_at', oneHourAgo)
    email1.set('service_group', 'BR2')
    email1.set('team', 'Internacional')
    if (vipClient) email1.set('client', vipClient.id)
    email1.set('reservation_number', 'KLM921')
    email1.set('detected_dates', ['10/10'])
    email1.set('detected_signals', ['Embarque <24h', 'Cancelamento/Remarcação', 'Cliente VIP'])
    email1.set('score', 115)
    email1.set('priority', 'P1')
    email1.set('status', 'Novo')
    email1.set('is_noise', false)
    email1.set('external_message_id', 'demo_msg_001')
    email1.set('business_hours_waiting', 1.0)
    app.save(email1)

    // 2. E-mail P1: Reclamação Formal / Procon + Prazo Prometido
    const email2 = new Record(emailsCol)
    email2.set(
      'subject',
      'Notificação e Reclamação Formal - Prazo estourado - Agência Costa Turismo',
    )
    email2.set('sender_email', 'contato@costaturismo.com.br')
    email2.set('sender_name', 'Danieli Meireles')
    email2.set('recipient_email', 'atendimento@rexturadvance.com.br')
    email2.set(
      'body_snippet',
      'Já abrimos chamado há 3 dias e até agora não tivemos retorno da reemissão. Passageiro acionou o Procon e advogado da empresa enviou notificação formal. Exigimos resposta imediata até às 14h com a regularização dos bilhetes.',
    )
    email2.set('received_at', threeHoursAgo)
    email2.set('service_group', 'SUL')
    email2.set('team', 'Nacional')
    if (regularClient) email2.set('client', regularClient.id)
    email2.set('detected_signals', ['Reclamação Formal', 'Prazo Prometido', 'Reincidente'])
    email2.set('score', 90)
    email2.set('priority', 'P1')
    email2.set('status', 'Em tratamento')
    if (assigneeUser) {
      email2.set('assigned_to', assigneeUser.id)
      email2.set('assigned_at', threeHoursAgo)
    }
    email2.set('is_noise', false)
    email2.set('external_message_id', 'demo_msg_002')
    email2.set('business_hours_waiting', 3.0)
    app.save(email2)

    // 3. E-mail P2: Embarque < 48h + Remarcação
    const email3 = new Record(emailsCol)
    email3.set('subject', 'Solicitação de remarcação de bilhete - Voo amanhã - Reserva XPTO88')
    email3.set('sender_email', 'reservas@rodojet.com.br')
    email3.set('sender_name', 'Natalia Santos')
    email3.set('recipient_email', 'atendimento@rexturadvance.com.br')
    email3.set(
      'body_snippet',
      'Olá time, solicitamos a remarcação de voo para amanhã 11/10 da passageira Maria Silva. LOC XPTO88. Por favor verificar diferença tarifária e regras da cia aérea.',
    )
    email3.set('received_at', sixHoursAgo)
    email3.set('service_group', 'SPI')
    email3.set('team', 'Nacional')
    email3.set('reservation_number', 'XPTO88')
    email3.set('detected_dates', ['11/10'])
    email3.set('detected_signals', ['Embarque <48h', 'Cancelamento/Remarcação'])
    email3.set('score', 65)
    email3.set('priority', 'P2')
    email3.set('status', 'Novo')
    email3.set('is_noise', false)
    email3.set('external_message_id', 'demo_msg_003')
    email3.set('business_hours_waiting', 6.0)
    app.save(email3)

    // 4. E-mail P3: Dúvida geral de bagagem e franquia
    const email4 = new Record(emailsCol)
    email4.set('subject', 'Dúvida sobre franquia de bagagem adicional LATAM')
    email4.set('sender_email', 'agente@mundoturismo.com.br')
    email4.set('sender_name', 'Eraldo Oliveira')
    email4.set('recipient_email', 'atendimento@rexturadvance.com.br')
    email4.set(
      'body_snippet',
      'Boa tarde! Gostaria de consultar se o bilhete emitido possui 1 ou 2 malas inclusas no trecho doméstico para Salvador.',
    )
    email4.set('received_at', yesterday)
    email4.set('service_group', 'BR1')
    email4.set('team', 'Nacional')
    email4.set('detected_signals', [])
    email4.set('score', 20)
    email4.set('priority', 'P3')
    email4.set('status', 'Novo')
    email4.set('is_noise', false)
    email4.set('external_message_id', 'demo_msg_004')
    email4.set('business_hours_waiting', 9.0)
    app.save(email4)
  },
  (app) => {
    // rollback
  },
)
