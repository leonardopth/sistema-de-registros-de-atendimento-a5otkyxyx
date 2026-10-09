migrate(
  (app) => {
    // 1. Adicionar campos first_response_at e resolved_at na coleção control_tower_emails
    const emailsCol = app.findCollectionByNameOrId('control_tower_emails')

    if (!emailsCol.fields.getByName('first_response_at')) {
      emailsCol.fields.add(new DateField({ name: 'first_response_at' }))
    }

    if (!emailsCol.fields.getByName('resolved_at')) {
      emailsCol.fields.add(new DateField({ name: 'resolved_at' }))
    }

    app.save(emailsCol)

    // 2. Retro-preenchimento e enriquecimento de dados de demonstração
    // Garantir que temos histórico variado na janela de 7 e 30 dias:
    // - Casos resolvidos dentro do SLA
    // - Casos resolvidos estourados / fora do SLA
    // - Casos em tratamento com first_response_at gravado
    // - Backlog ativo com idades em várias faixas (<2h, 2-4h, 4-8h, 8-24h, >24h)
    try {
      const now = new Date()

      // Função auxiliar para subtrair horas
      const hoursAgo = (h) => new Date(now.getTime() - h * 3600000).toISOString()
      const daysAgo = (d) => new Date(now.getTime() - d * 86400000).toISOString()

      // Atualizar registros existentes que já têm assigned_at
      const existing = app.findRecordsByFilter('control_tower_emails', '', '-created', 50, 0)
      for (let i = 0; i < existing.length; i++) {
        const r = existing[i]
        const st = r.getString('status')
        const assAt = r.getString('assigned_at')
        if (assAt && !r.getString('first_response_at')) {
          r.set('first_response_at', assAt)
        }
        if (st === 'Resolvido' && !r.getString('resolved_at')) {
          r.set('resolved_at', r.getString('updated') || now.toISOString())
        }
        app.save(r)
      }

      // Buscar um cliente e usuário para vincular os novos exemplos
      let clientId = ''
      try {
        const clients = app.findRecordsByFilter('clients', '', '', 1, 0)
        if (clients && clients.length > 0) clientId = clients[0].id
      } catch (_) {}

      let userId = ''
      try {
        const users = app.findRecordsByFilter('users', '', '', 1, 0)
        if (users && users.length > 0) userId = users[0].id
      } catch (_) {}

      // Só cria novos registros se tiver menos de 12 e-mails no total
      const totalCount = app.countRecords('control_tower_emails')
      if (totalCount < 12) {
        const seedItems = [
          // 1. Resolvido DENTRO do SLA (P1: prazo de 2h úteis, resolvido em 1.1h) - janela 2 dias atrás
          {
            subject: 'Solicitação de cancelamento urgente - Bilhete 957-1120',
            sender_email: 'contato@alphaturismo.com.br',
            sender_name: 'Marcos Vinicius',
            recipient_email: 'atendimento@rexturadvance.com.br',
            body_snippet:
              'Cancelamento efetuado dentro das 24h sem multa de acordo com regulação Anac.',
            received_at: hoursAgo(48),
            service_group: 'SAO',
            team: 'Nacional',
            inbox_address: 'atendimento.sao@rexturadvance.com.br',
            client: clientId,
            reservation_number: 'ALP992',
            detected_signals: ['Cancelamento/Remarcação', 'Prazo Prometido'],
            score: 55,
            priority: 'P1',
            status: 'Resolvido',
            assigned_to: userId,
            assigned_at: hoursAgo(47.5),
            first_response_at: hoursAgo(47.5),
            resolved_at: hoursAgo(46.8), // ~1.2h depois
            sla_deadline: hoursAgo(46),
            is_noise: false,
            message_count: 2,
            is_thread_child: false,
            business_hours_waiting: 1.2,
          },
          // 2. Resolvido DENTRO do SLA (P2: prazo de 4h úteis, resolvido em 2.5h) - janela 4 dias atrás
          {
            subject: 'Dúvida franquia internacional de bagagem - Voo Air France',
            sender_email: 'operacoes@viagenssul.com.br',
            sender_name: 'Camila Duarte',
            recipient_email: 'atendimento@rexturadvance.com.br',
            body_snippet: 'Confirmado franquia de 2 peças de 23kg por passageiro.',
            received_at: hoursAgo(96),
            service_group: 'SUL',
            team: 'Internacional',
            inbox_address: 'atendimento.sul@rexturadvance.com.br',
            client: clientId,
            reservation_number: 'AF8821',
            detected_signals: ['Embarque <48h'],
            score: 35,
            priority: 'P2',
            status: 'Resolvido',
            assigned_to: userId,
            assigned_at: hoursAgo(94),
            first_response_at: hoursAgo(94),
            resolved_at: hoursAgo(93.5),
            sla_deadline: hoursAgo(92),
            is_noise: false,
            message_count: 1,
            is_thread_child: false,
            business_hours_waiting: 2.5,
          },
          // 3. Resolvido FORA do SLA (P1: prazo de 2h úteis, resolvido após 5h úteis) - janela 6 dias atrás
          {
            subject: 'Reclamação de demora na reemissão - Localizador G3-8812',
            sender_email: 'atendimento@triangulotur.com.br',
            sender_name: 'Roberto Assis',
            recipient_email: 'atendimento@rexturadvance.com.br',
            body_snippet: 'Bilhete reemitido com atraso após contato com a supervisão.',
            received_at: hoursAgo(144),
            service_group: 'SPI',
            team: 'Nacional',
            inbox_address: 'atendimento.spi@rexturadvance.com.br',
            client: clientId,
            reservation_number: 'G38812',
            detected_signals: ['Reclamação Formal', 'Prazo Prometido'],
            score: 65,
            priority: 'P1',
            status: 'Resolvido',
            assigned_to: userId,
            assigned_at: hoursAgo(140),
            first_response_at: hoursAgo(140),
            resolved_at: hoursAgo(138),
            sla_deadline: hoursAgo(142), // estourou antes da resolução!
            escalated_at: hoursAgo(141.5),
            escalated_reason: 'SLA P1 estourado (prazo de 2h úteis ultrapassado)',
            is_noise: false,
            message_count: 2,
            is_thread_child: false,
            business_hours_waiting: 6.0,
          },
          // 4. Resolvido DENTRO do SLA (P3: prazo de 8h úteis, resolvido em 4h) - janela 15 dias atrás (30d toggle)
          {
            subject: 'Consulta de regras de no-show para trecho doméstico Azul',
            sender_email: 'emissao@novarota.com.br',
            sender_name: 'Juliana Pires',
            recipient_email: 'atendimento@rexturadvance.com.br',
            body_snippet: 'Informadas regras vigentes de no-show da Azul Linhas Aéreas.',
            received_at: daysAgo(15),
            service_group: 'BR1',
            team: 'Nacional',
            inbox_address: 'atendimento.br1@rexturadvance.com.br',
            client: clientId,
            detected_signals: [],
            score: 15,
            priority: 'P3',
            status: 'Resolvido',
            assigned_to: userId,
            assigned_at: daysAgo(14.8),
            first_response_at: daysAgo(14.8),
            resolved_at: daysAgo(14.5),
            sla_deadline: daysAgo(14.2),
            is_noise: false,
            message_count: 1,
            is_thread_child: false,
            business_hours_waiting: 4.0,
          },
          // 5. Resolvido FORA do SLA (P2: prazo de 4h úteis, resolvido após 9h) - janela 20 dias atrás (30d toggle)
          {
            subject: 'Alteração de nome por casamento - Passageira Ana Costa',
            sender_email: 'contato@destinostur.com.br',
            sender_name: 'Felipe Neves',
            recipient_email: 'atendimento@rexturadvance.com.br',
            body_snippet: 'Documentação comprobatória validada com a Gol e nome corrigido.',
            received_at: daysAgo(20),
            service_group: 'SAO',
            team: 'Nacional',
            inbox_address: 'atendimento.sao@rexturadvance.com.br',
            client: clientId,
            detected_signals: ['Cancelamento/Remarcação'],
            score: 40,
            priority: 'P2',
            status: 'Resolvido',
            assigned_to: userId,
            assigned_at: daysAgo(19.5),
            first_response_at: daysAgo(19.5),
            resolved_at: daysAgo(19.0),
            sla_deadline: daysAgo(19.7),
            escalated_at: daysAgo(19.6),
            is_noise: false,
            message_count: 1,
            is_thread_child: false,
            business_hours_waiting: 9.0,
          },
          // 6. Backlog ATIVO na faixa < 2h (ex.: 0.8h na caixa)
          {
            subject: 'Cotação grupo 12 passageiros para Fortaleza - Setembro',
            sender_email: 'grupos@viagenscorporativas.com.br',
            sender_name: 'Aline Borges',
            recipient_email: 'atendimento@rexturadvance.com.br',
            body_snippet:
              'Solicitamos cotação de bloqueio ou grupo para evento corporativo em Fortaleza.',
            received_at: hoursAgo(1),
            service_group: 'SAO',
            team: 'Nacional',
            inbox_address: 'atendimento.sao@rexturadvance.com.br',
            client: clientId,
            detected_signals: ['Prazo Prometido'],
            score: 30,
            priority: 'P2',
            status: 'Novo',
            sla_deadline: hoursAgo(-3), // vence daqui a 3h
            is_noise: false,
            message_count: 1,
            is_thread_child: false,
            business_hours_waiting: 0.8,
          },
          // 7. Backlog ATIVO na faixa 4-8h (ex.: 5.5h na caixa, Em tratamento)
          {
            subject: 'Reembolso bilhete não utilizado - TAP Portugal - PNR TP4419',
            sender_email: 'financeiro@mundoviagens.com.br',
            sender_name: 'Lucas Antunes',
            recipient_email: 'atendimento@rexturadvance.com.br',
            body_snippet: 'Processando solicitação de reembolso junto ao BSP Link da IATA.',
            received_at: hoursAgo(7),
            service_group: 'SAO',
            team: 'Internacional',
            inbox_address: 'atendimento.sao@rexturadvance.com.br',
            client: clientId,
            reservation_number: 'TP4419',
            detected_signals: ['Cancelamento/Remarcação'],
            score: 45,
            priority: 'P2',
            status: 'Em tratamento',
            assigned_to: userId,
            assigned_at: hoursAgo(4),
            first_response_at: hoursAgo(4),
            sla_deadline: hoursAgo(1), // prestes ou levemente ultrapassado
            is_noise: false,
            message_count: 1,
            is_thread_child: false,
            business_hours_waiting: 5.5,
          },
          // 8. Backlog ATIVO na faixa 8-24h (ex.: 14h na caixa, Escalado)
          {
            subject: 'URGENTE: Erro na emissão de bilhete no consolidador - Trecho GRU-MIA',
            sender_email: 'operacoes@tourbrasil.com.br',
            sender_name: 'Marcia Fontes',
            recipient_email: 'atendimento@rexturadvance.com.br',
            body_snippet:
              'Tarifa expirou durante confirmação. Requer intervenção manual da liderança.',
            received_at: hoursAgo(20),
            service_group: 'BR2',
            team: 'Internacional',
            inbox_address: 'atendimento.br2@rexturadvance.com.br',
            client: clientId,
            detected_signals: ['Embarque <24h', 'Reclamação Formal'],
            score: 95,
            priority: 'P1',
            status: 'Escalado',
            assigned_to: userId,
            assigned_at: hoursAgo(12),
            first_response_at: hoursAgo(12),
            sla_deadline: hoursAgo(18),
            escalated_at: hoursAgo(18),
            escalated_reason: 'SLA P1 estourado (prazo de 2h úteis ultrapassado)',
            is_noise: false,
            message_count: 3,
            is_thread_child: false,
            business_hours_waiting: 14.0,
          },
          // 9. Backlog ATIVO na faixa > 24h (ex.: 28h úteis na caixa)
          {
            subject:
              'Solicitação de crédito por bilhete cancelado na pandemia - Aguardando documentação',
            sender_email: 'sac@viajebem.com.br',
            sender_name: 'Luciana Melo',
            recipient_email: 'atendimento@rexturadvance.com.br',
            body_snippet: 'Caso em disputa judicial aguardando parecer do departamento jurídico.',
            received_at: daysAgo(5),
            service_group: 'SUL',
            team: 'Nacional',
            inbox_address: 'atendimento.sul@rexturadvance.com.br',
            client: clientId,
            detected_signals: ['Reclamação Formal', 'Reincidente'],
            score: 70,
            priority: 'P1',
            status: 'Escalado',
            sla_deadline: daysAgo(4.5),
            escalated_at: daysAgo(4.5),
            escalated_reason: 'Prazo estourado sem resolução',
            is_noise: false,
            message_count: 2,
            is_thread_child: false,
            business_hours_waiting: 28.0,
          },
        ]

        for (let s = 0; s < seedItems.length; s++) {
          const item = seedItems[s]
          const rec = new Record(emailsCol)
          for (const key in item) {
            if (Object.prototype.hasOwnProperty.call(item, key)) {
              rec.set(key, item[key])
            }
          }
          app.save(rec)
          if (!rec.getString('thread_id')) {
            rec.set('thread_id', 'th_' + rec.id)
            app.save(rec)
          }
        }
      }
    } catch (_) {}
  },
  (app) => {
    try {
      const emailsCol = app.findCollectionByNameOrId('control_tower_emails')
      const f1 = emailsCol.fields.getByName('first_response_at')
      if (f1) emailsCol.fields.remove(f1)
      const f2 = emailsCol.fields.getByName('resolved_at')
      if (f2) emailsCol.fields.remove(f2)
      app.save(emailsCol)
    } catch (_) {}
  },
)
