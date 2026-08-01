migrate(
  (app) => {
    const usersCol = app.findCollectionByNameOrId('_pb_users_auth_')
    let adminUser
    try {
      adminUser = app.findAuthRecordByEmail('_pb_users_auth_', 'leonardopth@gmail.com')
    } catch (_) {
      adminUser = new Record(usersCol)
      adminUser.setEmail('leonardopth@gmail.com')
      adminUser.setPassword('Skip@Pass')
      adminUser.setVerified(true)
      adminUser.set('name', 'Leonardo Silva')
      app.save(adminUser)
    }

    const clientsCol = app.findCollectionByNameOrId('clients')
    const serviceCol = app.findCollectionByNameOrId('service_records')

    const clientsData = [
      {
        name: 'Tech Solutions Ltda',
        email: 'contato@techsolutions.com.br',
        phone: '(11) 98765-4321',
        company: 'Tech Solutions',
        notes: 'Cliente corporativo de grande porte. Atendimento preferencial.',
      },
      {
        name: 'Comercial ABC',
        email: 'financeiro@comercialabc.com',
        phone: '(21) 91234-5678',
        company: 'Comercial ABC',
        notes: 'Cliente recorrente de serviços de suporte.',
      },
      {
        name: 'Maria Souza Consultoria',
        email: 'maria.souza@gmail.com',
        phone: '(31) 99887-6543',
        company: 'Maria Souza Consultoria',
        notes: 'Consultora independente.',
      },
    ]

    for (const c of clientsData) {
      try {
        app.findFirstRecordByData('clients', 'name', c.name)
      } catch (_) {
        const rec = new Record(clientsCol)
        rec.set('name', c.name)
        rec.set('email', c.email)
        rec.set('phone', c.phone)
        rec.set('company', c.company)
        rec.set('notes', c.notes)
        app.save(rec)
      }
    }

    const now = new Date()
    const todayISO = now.toISOString()
    const yesterdayISO = new Date(now.getTime() - 86400000).toISOString()

    const servicesData = [
      {
        client_name: 'Tech Solutions Ltda',
        client_email: 'contato@techsolutions.com.br',
        client_phone: '(11) 98765-4321',
        client_company: 'Tech Solutions',
        contact_reason: 'Suporte Técnico',
        description:
          'Instabilidade na integração de API e atualização de certificados SSL de servidores.',
        priority: 'Alta',
        status: 'Em Andamento',
        start_time: todayISO,
        duration: 45,
        assigned_agent: 'Leonardo Silva',
        tasks: [
          {
            title: 'Verificar logs de erro do servidor',
            done: true,
            due_date: todayISO,
            responsible: 'Leonardo',
          },
          {
            title: 'Renovar certificado SSL de produção',
            done: false,
            due_date: todayISO,
            responsible: 'Leonardo',
          },
        ],
        user_id: adminUser.id,
      },
      {
        client_name: 'Comercial ABC',
        client_email: 'financeiro@comercialabc.com',
        client_phone: '(21) 91234-5678',
        client_company: 'Comercial ABC',
        contact_reason: 'Dúvida',
        description:
          'Dúvidas sobre o faturamento da mensalidade e emissão da segunda via do boleto.',
        priority: 'Baixa',
        status: 'Concluído',
        start_time: todayISO,
        duration: 20,
        end_time: todayISO,
        assigned_agent: 'Leonardo Silva',
        tasks: [
          {
            title: 'Enviar demonstrativo de fatura em PDF',
            done: true,
            due_date: todayISO,
            responsible: 'Leonardo',
          },
        ],
        user_id: adminUser.id,
      },
      {
        client_name: 'Maria Souza Consultoria',
        client_email: 'maria.souza@gmail.com',
        client_phone: '(31) 99887-6543',
        client_company: 'Maria Souza Consultoria',
        contact_reason: 'Orçamento',
        description:
          'Solicitação de proposta comercial para inclusão de 5 novos usuários no sistema.',
        priority: 'Média',
        status: 'Aberto',
        start_time: todayISO,
        duration: 15,
        assigned_agent: 'Leonardo Silva',
        tasks: [
          {
            title: 'Elaborar proposta comercial sob medida',
            done: false,
            due_date: todayISO,
            responsible: 'Leonardo',
          },
        ],
        user_id: adminUser.id,
      },
      {
        client_name: 'Tech Solutions Ltda',
        client_email: 'contato@techsolutions.com.br',
        client_phone: '(11) 98765-4321',
        client_company: 'Tech Solutions',
        contact_reason: 'Reclamação',
        description: 'Lentidão recorrente no carregamento do painel durante horários de pico.',
        priority: 'Alta',
        status: 'Concluído',
        start_time: yesterdayISO,
        duration: 60,
        end_time: yesterdayISO,
        assigned_agent: 'Leonardo Silva',
        tasks: [
          {
            title: 'Otimizar consultas no banco de dados',
            done: true,
            due_date: yesterdayISO,
            responsible: 'Leonardo',
          },
        ],
        user_id: adminUser.id,
      },
      {
        client_name: 'Carlos Eduardo Santos',
        client_email: 'carlos.eduardo@express.com.br',
        client_phone: '(41) 98822-1100',
        client_company: 'Logística Express',
        contact_reason: 'Outro',
        description: 'Agendamento de treinamento para novos colaboradores da equipe de operações.',
        priority: 'Média',
        status: 'Aberto',
        start_time: todayISO,
        duration: 30,
        assigned_agent: 'Leonardo Silva',
        tasks: [],
        user_id: adminUser.id,
      },
    ]

    for (const s of servicesData) {
      try {
        app.findFirstRecordByData('service_records', 'description', s.description)
      } catch (_) {
        const rec = new Record(serviceCol)
        rec.set('client_name', s.client_name)
        rec.set('client_email', s.client_email)
        rec.set('client_phone', s.client_phone)
        rec.set('client_company', s.client_company)
        rec.set('contact_reason', s.contact_reason)
        rec.set('description', s.description)
        rec.set('priority', s.priority)
        rec.set('status', s.status)
        rec.set('start_time', s.start_time)
        if (s.duration) rec.set('duration', s.duration)
        if (s.end_time) rec.set('end_time', s.end_time)
        rec.set('assigned_agent', s.assigned_agent)
        if (s.tasks) rec.set('tasks', s.tasks)
        rec.set('user_id', s.user_id)
        app.save(rec)
      }
    }
  },
  (app) => {},
)
