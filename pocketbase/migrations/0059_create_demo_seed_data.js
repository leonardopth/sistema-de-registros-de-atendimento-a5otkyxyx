migrate(
  (app) => {
    // === Idempotency guard: skip if service_records already has data ===
    try {
      var existing = app.findRecordsByFilter('service_records', "id != ''", '-created', 1, 0)
      if (existing.length > 0) return
    } catch (_) {}

    var usersCol = app.findCollectionByNameOrId('_pb_users_auth_')
    var aeCol = app.findCollectionByNameOrId('account_executives')
    var clientsCol = app.findCollectionByNameOrId('clients')
    var agentsCol = app.findCollectionByNameOrId('agents')
    var srCol = app.findCollectionByNameOrId('service_records')
    var trainingsCol = app.findCollectionByNameOrId('trainings')
    var feedbackCol = app.findCollectionByNameOrId('feedback')
    var notifCol = app.findCollectionByNameOrId('notifications')
    var sharesCol = app.findCollectionByNameOrId('service_record_shares')
    var historyCol = app.findCollectionByNameOrId('service_record_history')
    var auditCol = app.findCollectionByNameOrId('audit_log')

    // === Helper: find or create a user ===
    function findOrCreateUser(name, email, role, sg, bases, approvalStatus) {
      try {
        return app.findAuthRecordByEmail('_pb_users_auth_', email)
      } catch (_) {
        var rec = new Record(usersCol)
        rec.setEmail(email)
        rec.setPassword('Skip@Pass')
        rec.setVerified(true)
        rec.set('name', name)
        rec.set('role', role)
        rec.set('approval_status', approvalStatus || 'Aprovado')
        if (sg) rec.set('service_groups', sg)
        if (bases) rec.set('bases', bases)
        rec.set('avatar', null)
        app.save(rec)
        return rec
      }
    }

    function findOrCreateAE(name, email, phone, bases) {
      try {
        return app.findFirstRecordByData('account_executives', 'name', name)
      } catch (_) {
        var rec = new Record(aeCol)
        rec.set('name', name)
        rec.set('email', email)
        rec.set('phone', phone)
        if (bases) rec.set('bases', bases)
        app.save(rec)
        return rec
      }
    }

    function findOrCreateClient(data) {
      try {
        return app.findFirstRecordByData('clients', 'name', data.name)
      } catch (_) {
        var rec = new Record(clientsCol)
        rec.set('name', data.name)
        rec.set('email', data.email)
        rec.set('phone', data.phone)
        rec.set('company', data.company)
        rec.set('city', data.city)
        rec.set('state', data.state)
        rec.set('notes', data.notes)
        rec.set('service_group', data.service_group)
        rec.set('account_executive', data.aeName)
        rec.set('account_executive_rel', data.aeId)
        rec.set('avoidable_contact_threshold', data.threshold)
        if (data.blocked) {
          rec.set('blocked', true)
          rec.set('block_reason', data.blockReason)
          rec.set('blocked_by', data.blockedById)
          rec.set('blocked_at', data.blockedAt)
        }
        app.save(rec)
        return rec
      }
    }

    function findOrCreateAgent(name, email, phone, clientId) {
      try {
        return app.findFirstRecordByData('agents', 'email', email)
      } catch (_) {
        var rec = new Record(agentsCol)
        rec.set('name', name)
        rec.set('email', email)
        rec.set('phone', phone)
        rec.set('client_id', clientId)
        app.save(rec)
        return rec
      }
    }

    // ========================
    // 1. SEED USERS
    // ========================
    var adminUser = findOrCreateUser(
      'Leonardo Administrator',
      'leonardopth@gmail.com',
      'Master',
      'Concierge',
      'NO/NE',
      'Aprovado',
    )
    adminUser.set('master_access', true)
    app.save(adminUser)

    var userData = [
      {
        name: 'Marcelo Ribeiro',
        email: 'marcelo.ribeiro@rextur.com.br',
        role: 'Gerentes',
        sg: 'Concierge',
        bases: 'SAO',
      },
      {
        name: 'Ana Paula Costa',
        email: 'ana.costa@rextur.com.br',
        role: 'Gerentes',
        sg: 'Exclusivo',
        bases: 'RJ/ES/MG',
      },
      {
        name: 'Juliana Freitas',
        email: 'juliana.freitas@rextur.com.br',
        role: 'Supervisores',
        sg: 'BR1',
        bases: 'CO',
      },
      {
        name: 'Ricardo Nunes',
        email: 'ricardo.nunes@rextur.com.br',
        role: 'Supervisores',
        sg: 'BR2',
        bases: 'SUL',
      },
      {
        name: 'Gustavo Pinto',
        email: 'gustavo.pinto@rextur.com.br',
        role: 'Líderes',
        sg: 'LOT',
        bases: 'LOT',
      },
      {
        name: 'Camila Ferreira',
        email: 'camila.ferreira@rextur.com.br',
        role: 'Líderes',
        sg: 'SAO',
        bases: 'SAO',
      },
      {
        name: 'Lucas Oliveira',
        email: 'lucas.oliveira@rextur.com.br',
        role: 'Consultores',
        sg: 'SPI',
        bases: 'SPI',
      },
      {
        name: 'Bruno Carvalho',
        email: 'bruno.carvalho@rextur.com.br',
        role: 'Consultores',
        sg: 'SUL',
        bases: 'SUL',
      },
      {
        name: 'Daniela Martins',
        email: 'daniela.martins@rextur.com.br',
        role: 'Consultores',
        sg: 'BR1',
        bases: 'NO/NE',
      },
      {
        name: 'Patrícia Santos',
        email: 'patricia.santos@rextur.com.br',
        role: 'Consultores',
        sg: 'Exclusivo',
        bases: 'RJ/ES/MG',
      },
      {
        name: 'Ana Carolina Pereira',
        email: 'ana.pereira@rextur.com.br',
        role: 'Executivo de contas',
        sg: 'Concierge',
        bases: 'SAO',
      },
      {
        name: 'Roberto Mendes',
        email: 'roberto.mendes@rextur.com.br',
        role: 'Executivo de contas',
        sg: 'Exclusivo',
        bases: 'RJ/ES/MG',
      },
      {
        name: 'Carlos Eduardo Souza',
        email: 'carlos.souza@rextur.com.br',
        role: 'Gestor Comercial',
        sg: 'LOT',
        bases: 'INSIDE SALES',
      },
    ]

    var userMap = {}
    userMap[adminUser.id] = adminUser
    for (var i = 0; i < userData.length; i++) {
      var u = userData[i]
      var rec = findOrCreateUser(u.name, u.email, u.role, u.sg, u.bases, 'Aprovado')
      userMap[rec.id] = rec
    }

    var allUsers = Object.values(userMap)
    var consultantUsers = allUsers.filter(function (u) {
      return u.get('role') === 'Consultores'
    })
    var managerUsers = allUsers.filter(function (u) {
      return (
        u.get('role') === 'Gerentes' ||
        u.get('role') === 'Master' ||
        u.get('master_access') === true
      )
    })

    // ========================
    // 2. SEED ACCOUNT EXECUTIVES
    // ========================
    var aeData = [
      {
        name: 'Ana Carolina Pereira',
        email: 'ana.pereira@rextur.com.br',
        phone: '(11) 98877-6655',
        bases: 'SAO',
      },
      {
        name: 'Roberto Mendes',
        email: 'roberto.mendes@rextur.com.br',
        phone: '(21) 99654-3322',
        bases: 'RJ/ES/MG',
      },
      {
        name: 'Fernanda Lima',
        email: 'fernanda.lima@rextur.com.br',
        phone: '(31) 98765-4321',
        bases: 'CO',
      },
      {
        name: 'Paulo Henrique Alves',
        email: 'paulo.alves@rextur.com.br',
        phone: '(41) 99876-1122',
        bases: 'SUL',
      },
      {
        name: 'Mariana Castro',
        email: 'mariana.castro@rextur.com.br',
        phone: '(71) 98234-5566',
        bases: 'NO/NE',
      },
      {
        name: 'Eduardo Barbosa',
        email: 'eduardo.barbosa@rextur.com.br',
        phone: '(51) 98456-7788',
        bases: 'INSIDE SALES',
      },
    ]

    var aeMap = {}
    for (var ai = 0; ai < aeData.length; ai++) {
      var ae = aeData[ai]
      var aeRec = findOrCreateAE(ae.name, ae.email, ae.phone, ae.bases)
      aeMap[ae.name] = aeRec
    }

    // ========================
    // 3. SEED CLIENTS
    // ========================
    var now = new Date()
    var blockedAtIso = new Date(now.getTime() - 3 * 86400000).toISOString()

    var clientData = [
      {
        name: 'Rextur Advance Viagens',
        email: 'contato@rextur.com.br',
        phone: '(11) 3456-7890',
        company: 'Rextur Advance',
        city: 'São Paulo',
        state: 'SP',
        notes: 'Agência de viagens corporativas de grande porte. Atendimento prioritário.',
        service_group: 'Concierge',
        aeName: 'Ana Carolina Pereira',
        threshold: 5,
        blocked: false,
      },
      {
        name: 'CVC Corp Viagens',
        email: 'corporate@cvc.com.br',
        phone: '(21) 3234-5600',
        company: 'CVC Corp',
        city: 'Rio de Janeiro',
        state: 'RJ',
        notes: 'Cliente corporativo com alto volume de reservas mensais.',
        service_group: 'Exclusivo',
        aeName: 'Roberto Mendes',
        threshold: 7,
        blocked: false,
      },
      {
        name: 'Decolar Viagens Brasil',
        email: 'empresas@decolar.com.br',
        phone: '(31) 3567-8900',
        company: 'Decolar Brasil',
        city: 'Belo Horizonte',
        state: 'MG',
        notes: 'Operação de viagens nacionais e internacionais para empresas.',
        service_group: 'BR1',
        aeName: 'Fernanda Lima',
        threshold: 4,
        blocked: false,
      },
      {
        name: 'Flytour Travel Solutions',
        email: 'contato@flytour.com.br',
        phone: '(41) 3333-4444',
        company: 'Flytour',
        city: 'Curitiba',
        state: 'PR',
        notes: 'Gestão de viagens corporativas com plataforma de auto-reserva.',
        service_group: 'BR2',
        aeName: 'Paulo Henrique Alves',
        threshold: 6,
        blocked: false,
      },
      {
        name: 'Terra Brasilis Turismo',
        email: 'reservas@terrabrasilis.com.br',
        phone: '(71) 3222-1100',
        company: 'Terra Brasilis',
        city: 'Salvador',
        state: 'BA',
        notes: 'Operadora de turismo receptivo e emissivo no Nordeste.',
        service_group: 'SUL',
        aeName: 'Mariana Castro',
        threshold: 3,
        blocked: false,
      },
      {
        name: 'Volta ao Mundo Travel',
        email: 'contato@voltaaomundo.com.br',
        phone: '(51) 3444-5566',
        company: 'Volta ao Mundo',
        city: 'Porto Alegre',
        state: 'RS',
        notes: 'Agência especializada em viagens internacionais de luxo.',
        service_group: 'SPI',
        aeName: 'Eduardo Barbosa',
        threshold: 8,
        blocked: false,
      },
      {
        name: 'Aéreo Logística Transportes',
        email: 'operacoes@aereologistica.com.br',
        phone: '(11) 3999-8800',
        company: 'Aéreo Logística',
        city: 'São Paulo',
        state: 'SP',
        notes:
          'Transporte de cargas e logística aérea. Cliente com atrasos recorrentes de pagamento.',
        service_group: 'LOT',
        aeName: 'Ana Carolina Pereira',
        threshold: 10,
        blocked: true,
        blockReason: 'Inadimplência contratual superior a 60 dias',
        blockedById: adminUser.id,
        blockedAt: blockedAtIso,
      },
      {
        name: 'Norte Turismo Agency',
        email: 'contato@nordetourismo.com.br',
        phone: '(85) 3111-2200',
        company: 'Norte Turismo',
        city: 'Fortaleza',
        state: 'CE',
        notes: 'Agência regional com forte atuação no mercado corporativo local.',
        service_group: 'SAO',
        aeName: 'Mariana Castro',
        threshold: 5,
        blocked: false,
      },
      {
        name: 'Expresso Andes Viagens',
        email: 'contato@expressoandes.com.br',
        phone: '(62) 3222-9988',
        company: 'Expresso Andes',
        city: 'Goiânia',
        state: 'GO',
        notes:
          'Viagens corporativas no Centro-Oeste. Solicitação de bloqueio por uso indevido de canal.',
        service_group: 'CO',
        aeName: 'Fernanda Lima',
        threshold: 3,
        blocked: true,
        blockReason: 'Múltiplos contatos evitáveis e uso indevido do canal de comercial',
        blockedById: managerUsers[0].id,
        blockedAt: blockedAtIso,
      },
      {
        name: 'Premium Travel Corporate',
        email: 'business@premiumtravel.com.br',
        phone: '(11) 3777-4400',
        company: 'Premium Travel',
        city: 'Campinas',
        state: 'SP',
        notes: 'Cliente premium com SLA exclusivo e atendimento dedicado 24h.',
        service_group: 'Concierge',
        aeName: 'Roberto Mendes',
        threshold: 2,
        blocked: false,
      },
    ]

    var clientMap = {}
    for (var ci = 0; ci < clientData.length; ci++) {
      var cd = clientData[ci]
      cd.aeId = aeMap[cd.aeName] ? aeMap[cd.aeName].id : ''
      var clRec = findOrCreateClient(cd)
      clientMap[cd.name] = clRec
    }

    // ========================
    // 4. SEED AGENTS
    // ========================
    var agentData = [
      {
        name: 'Patrícia Almeida',
        email: 'patricia.almeida@rextur.com.br',
        phone: '(11) 97777-1111',
        clientName: 'Rextur Advance Viagens',
      },
      {
        name: 'Rodrigo Ferreira',
        email: 'rodrigo.ferreira@rextur.com.br',
        phone: '(11) 97777-2222',
        clientName: 'Rextur Advance Viagens',
      },
      {
        name: 'Camila Rocha',
        email: 'camila.rocha@rextur.com.br',
        phone: '(21) 97777-3333',
        clientName: 'CVC Corp Viagens',
      },
      {
        name: 'Bruno Carvalho',
        email: 'bruno.carvalho@rextur.com.br',
        phone: '(21) 97777-4444',
        clientName: 'CVC Corp Viagens',
      },
      {
        name: 'Daniela Martins',
        email: 'daniela.martins@rextur.com.br',
        phone: '(31) 97777-5555',
        clientName: 'Decolar Viagens Brasil',
      },
      {
        name: 'Eduardo Gomes',
        email: 'eduardo.gomes@rextur.com.br',
        phone: '(31) 97777-6666',
        clientName: 'Flytour Travel Solutions',
      },
      {
        name: 'Sandra Ribeiro',
        email: 'sandra.ribeiro@rextur.com.br',
        phone: '(41) 98888-7777',
        clientName: 'Terra Brasilis Turismo',
      },
      {
        name: 'Felipe Andrade',
        email: 'felipe.andrade@rextur.com.br',
        phone: '(51) 98888-8888',
        clientName: 'Volta ao Mundo Travel',
      },
    ]

    var agentMap = {}
    for (var ag = 0; ag < agentData.length; ag++) {
      var ad = agentData[ag]
      var clientRec = clientMap[ad.clientName]
      if (!clientRec) continue
      var agRec = findOrCreateAgent(ad.name, ad.email, ad.phone, clientRec.id)
      agentMap[ad.email] = agRec
    }
    var agentList = Object.values(agentMap)

    // ========================
    // 5. SEED SERVICE RECORDS
    // ========================
    var statuses = ['Aberto', 'Em Andamento', 'Concluído', 'Cancelado']
    var priorities = ['Baixa', 'Média', 'Alta']
    var reasons = [
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
    var channels = ['Telefone', 'e-mail', 'whatsapp', 'comercial', 'outros']
    var avoidReasons = ['Disponível no RF', 'Fora do Escopo', 'Erro RF', 'Outros']
    var avoidExplanations = [
      'Informação já disponível no sistema RF para consulta direta pelo cliente',
      'Solicitação fora do escopo de serviços contratados pelo cliente',
      'Erro no sistema RF que gerou contato desnecessário do cliente',
      'Outro motivo de contato evitável identificado durante o atendimento',
    ]

    var descriptions = [
      'Cliente questiona limite de bagagem despachada em voo internacional para Lisboa na TAP',
      'Solicitação de marcação de assento preferencial para passageiro com mobilidade reduzida',
      'Cálculo de reemissão de passagem devido a mudança de data de retorno de Madri',
      'Solicitação de reembolso de passagem cancelada por motivo de saúde do passageiro',
      'Cotação de passagens aéreas para grupo de 15 passageiros para Paris em classe executiva',
      'Reserva de hotel e traslado para viagem corporativa a Buenos Aires',
      'Cancelamento de reserva devido a imprevisto pessoal do passageiro',
      'Dúvida sobre regras tarifárias de bilhete emitido em classe econômica promocional',
      'Erro no sistema RF ao tentar emitir bilhete para passageiro - código de erro 4521',
      'Solicitação de voucher de serviços terrestres em Barcelona para grupo corporativo',
      'Cliente relata extravio de bagagem no voo SP-Lisboa da TAP, necessita abertura de reclamação',
      'Marcação de assento para acompanhante de menor desacompanhado em voo doméstico',
      'Reemissão de trecho não utilizado por alteração de itinerário corporativo aprovada pelo RH',
      'Reembolso de taxa de embarque não utilizada em voo cancelado pela companhia aérea',
      'Cotação de classe executiva para diretoria em viagem a Nova York com 7 dias de antecedência',
      'Reserva de pacote turístico para grupo a Orlando com 20 passageiros incluindo passes Disney',
      'Cancelamento de passagem por falecimento do passageiro - necessária documentação comprobatória',
      'Consulta sobre penalidade por remarcação em tarifa promocional comprada em canal comercial',
      'Falha no envio do bilhete eletrônico via sistema RF - cliente não recebeu confirmação',
      'Solicitação de bagagem extra para transporte de equipamentos esportivos em voo internacional',
    ]

    var clientList = Object.values(clientMap)
    var srIds = []

    for (var si = 0; si < descriptions.length; si++) {
      var clientIdx = si % clientList.length
      var agentIdx = si % agentList.length
      var execIdx = si % allUsers.length
      var assignedIdx = si % consultantUsers.length
      var statusVal = statuses[si % 4]
      var priorityVal = priorities[si % 3]
      var reasonVal = reasons[si % reasons.length]
      var channelVal = channels[si % channels.length]
      var isAvoidable = si % 4 === 3
      var hasTasks = si % 3 === 0
      var isConcluido = statusVal === 'Concluído'
      var isCancelado = statusVal === 'Cancelado'
      var isEmAndamento = statusVal === 'Em Andamento'
      var duration = 5 + ((si * 7) % 115)
      var startTime = new Date(
        now.getTime() - (descriptions.length - si) * 14.4 * 3600000,
      ).toISOString()
      var endTime =
        isConcluido || isCancelado
          ? new Date(new Date(startTime).getTime() + duration * 60000).toISOString()
          : ''

      var tasksVal = null
      if (hasTasks) {
        tasksVal = JSON.stringify([
          {
            id: 'task-' + si + '-1',
            title: 'Verificar disponibilidade no sistema',
            done: isConcluido,
            due_date: startTime,
            responsible: agentList[agentIdx].get('name'),
          },
          {
            id: 'task-' + si + '-2',
            title: 'Confirmar dados do passageiro',
            done: isConcluido || isEmAndamento,
            due_date: startTime,
            responsible: agentList[agentIdx].get('name'),
          },
        ])
      }

      var clRec = clientList[clientIdx]
      var agRec = agentList[agentIdx]
      var aeRec = aeMap[clRec.get('account_executive')]

      var srRec = new Record(srCol)
      srRec.set('client_name', clRec.get('name'))
      srRec.set('client_email', clRec.get('email'))
      srRec.set('client_phone', clRec.get('phone'))
      srRec.set('client_company', clRec.get('company'))
      srRec.set('description', descriptions[si])
      srRec.set('priority', priorityVal)
      srRec.set('status', statusVal)
      srRec.set('start_time', startTime)
      srRec.set('duration', duration)
      srRec.set('end_time', endTime || null)
      srRec.set('assigned_agent', agRec.get('name'))
      srRec.set('tasks', tasksVal ? JSON.parse(tasksVal) : null)
      srRec.set('user_id', consultantUsers[assignedIdx].id)
      srRec.set('assigned_user', consultantUsers[assignedIdx].id)
      srRec.set('contact_reason', reasonVal)
      srRec.set('channel', channelVal)
      srRec.set('avoidable_contact', isAvoidable)
      srRec.set('avoidable_contact_explanation', isAvoidable ? avoidExplanations[si % 4] : '')
      srRec.set('avoidable_contact_reason', isAvoidable ? avoidReasons[si % 4] : '')
      srRec.set('account_executive', aeRec ? aeRec.id : '')
      srRec.set('client', clRec.id)
      srRec.set('agent', agRec.id)
      srRec.set('timer_start', isEmAndamento ? startTime : '')
      srRec.set('timer_running', isEmAndamento)
      srRec.set(
        'reopen_justification',
        isConcluido && (si === 6 || si === 14)
          ? 'Reabertura solicitada pelo cliente para complementar atendimento.'
          : '',
      )
      app.save(srRec)
      srIds.push(srRec.id)
    }

    // ========================
    // 6. SEED TRAININGS
    // ========================
    var trainingData = [
      {
        name: 'Treinamento RF - Sistema de Reservas',
        description:
          'Capacitação completa no uso do sistema RF para consultores recém-contratados.',
        clientName: 'Rextur Advance Viagens',
        planContent:
          'Sessão 1: Navegação básica e consulta de tarifas\nSessão 2: Emissão de bilhetes nacionais\nSessão 3: Emissão internacional e regras tarifárias\nSessão 4: Reembolsos e cancelamentos\nSessão 5: Avaliação prática final',
        trainingDate: new Date(now.getTime() + 7 * 86400000).toISOString(),
        createdBy: adminUser.id,
      },
      {
        name: 'Excelência em Atendimento Corporativo',
        description:
          'Workshop sobre padrões de atendimento e gestão de expectativas de clientes corporativos.',
        clientName: 'CVC Corp Viagens',
        planContent:
          'Módulo 1: Comunicação eficaz e escuta ativa\nMódulo 2: Gestão de crises e reclamações\nMódulo 3: SLA e indicadores de qualidade\nMódulo 4: Role-play e casos reais',
        trainingDate: new Date(now.getTime() + 14 * 86400000).toISOString(),
        createdBy: managerUsers[0].id,
      },
      {
        name: 'Treinamento Tarifário Avançado',
        description:
          'Aprofundamento em regras tarifárias, cálculo de reemissões e aplicação de penalidades.',
        clientName: 'Decolar Viagens Brasil',
        planContent:
          'Aula 1: Estrutura de tarifas e classes de reserva\nAula 2: Regras de penalidade e remarcação\nAula 3: Cálculo de reemissão na prática\nAula 4: Casos complexos e resolução de problemas',
        trainingDate: new Date(now.getTime() + 21 * 86400000).toISOString(),
        createdBy: managerUsers[0].id,
      },
      {
        name: 'Onboarding Novos Consultores',
        description:
          'Programa de integração para novos consultores cobrindo processos, ferramentas e cultura.',
        clientName: 'Flytour Travel Solutions',
        planContent:
          'Semana 1: Apresentação da empresa e processos internos\nSemana 2: Ferramentas (RF, CRM, portal do cliente)\nSemana 3: Atendimento prático com shadowing\nSemana 4: Avaliação e certificação inicial',
        trainingDate: new Date(now.getTime() - 3 * 86400000).toISOString(),
        createdBy: adminUser.id,
      },
      {
        name: 'Workshop Contatos Evitáveis',
        description:
          'Sessão de conscientização sobre redução de contatos evitáveis e melhoria da autonomia do cliente.',
        clientName: 'Premium Travel Corporate',
        planContent:
          'Parte 1: O que são contatos evitáveis e impacto operacional\nParte 2: Análise de casos reais do último trimestre\nParte 3: Ferramentas de autoatendimento disponíveis no RF\nParte 4: Plano de ação individual',
        trainingDate: new Date(now.getTime() - 10 * 86400000).toISOString(),
        createdBy: managerUsers[0].id,
      },
    ]

    for (var ti = 0; ti < trainingData.length; ti++) {
      var td = trainingData[ti]
      var tClient = clientMap[td.clientName]
      if (!tClient) continue
      try {
        app.findFirstRecordByData('trainings', 'name', td.name)
      } catch (_) {
        var tRec = new Record(trainingsCol)
        tRec.set('name', td.name)
        tRec.set('description', td.description)
        tRec.set('client', tClient.id)
        tRec.set('plan_content', td.planContent)
        tRec.set('training_date', td.trainingDate)
        tRec.set('created_by', td.createdBy)
        app.save(tRec)
      }
    }

    // ========================
    // 7. SEED FEEDBACK
    // ========================
    var feedbackData = [
      {
        message:
          'O novo formulário de atendimento está muito mais rápido para preencher. Parabéns pela melhoria!',
        category: 'Elogio',
        userId: consultantUsers[0].id,
      },
      {
        message:
          'O sistema de timer às vezes não para quando concluo o atendimento, preciso clicar duas vezes.',
        category: 'Bug',
        userId: consultantUsers[1].id,
      },
      {
        message:
          'Sugiro adicionar um campo de prioridade automática baseado no SLA do cliente corporativo.',
        category: 'Sugestão',
        userId: managerUsers[0].id,
      },
      {
        message:
          'A exportação de relatórios em PDF está demorando muito para arquivos com mais de 50 registros.',
        category: 'Reclamação',
        userId: allUsers[3].id,
      },
      {
        message:
          'Seria útil ter um atalho de teclado para salvar rapidamente um novo atendimento sem usar o mouse.',
        category: 'Sugestão',
        userId: consultantUsers[2].id,
      },
    ]

    for (var fi = 0; fi < feedbackData.length; fi++) {
      var fd = feedbackData[fi]
      var fRec = new Record(feedbackCol)
      fRec.set('message', fd.message)
      fRec.set('category', fd.category)
      fRec.set('user_id', fd.userId)
      app.save(fRec)
    }

    // ========================
    // 8. SEED NOTIFICATIONS
    // ========================
    var notifData = [
      {
        title: 'Novo atendimento atribuído',
        message: 'Você recebeu um novo atendimento de prioridade Alta do cliente Rextur Advance.',
        type: 'info',
        userId: consultantUsers[0].id,
        read: false,
        resolved: false,
      },
      {
        title: 'Atendimento concluído',
        message: 'O atendimento sobre reserva de hotel em Buenos Aires foi concluído com sucesso.',
        type: 'success',
        userId: consultantUsers[1].id,
        read: true,
        resolved: true,
      },
      {
        title: 'Contato evitável detectado',
        message: 'O cliente CVC Corp ultrapassou o limite de contatos evitáveis neste mês.',
        type: 'warning',
        userId: managerUsers[0].id,
        read: false,
        resolved: false,
      },
      {
        title: 'Erro ao exportar relatório',
        message: 'Houve um erro ao gerar o relatório PDF. Tente novamente em alguns minutos.',
        type: 'error',
        userId: allUsers[3].id,
        read: true,
        resolved: true,
      },
      {
        title: 'Novo usuário aguardando aprovação',
        message: 'Carlos Eduardo Souza solicitou acesso ao sistema. Aprove ou rejeite.',
        type: 'approval',
        userId: adminUser.id,
        read: false,
        resolved: false,
      },
      {
        title: 'Relatório semanal disponível',
        message: 'Seu relatório semanal de atendimentos está pronto para download.',
        type: 'report',
        userId: allUsers[5].id,
        read: true,
        resolved: false,
      },
      {
        title: 'Tarefa vencida',
        message: 'A tarefa "Confirmar dados do passageiro" no atendimento #SR-003 está vencida.',
        type: 'alert',
        userId: consultantUsers[2].id,
        read: false,
        resolved: false,
      },
      {
        title: 'Cliente bloqueado',
        message: 'O cliente Aéreo Logística Transportes foi bloqueado por inadimplência.',
        type: 'alert',
        userId: managerUsers[0].id,
        read: true,
        resolved: true,
      },
    ]

    for (var ni = 0; ni < notifData.length; ni++) {
      var nd = notifData[ni]
      var nRec = new Record(notifCol)
      nRec.set('user_id', nd.userId)
      nRec.set('title', nd.title)
      nRec.set('message', nd.message)
      nRec.set('read', nd.read)
      nRec.set('type', nd.type)
      nRec.set('resolved', nd.resolved)
      nRec.set('link', '')
      app.save(nRec)
    }

    // ========================
    // 9. SEED SERVICE RECORD SHARES
    // ========================
    var shareData = [
      { srIdx: 0, userId: consultantUsers[1].id, sharedBy: adminUser.id, permission: 'Visualizar' },
      { srIdx: 1, userId: managerUsers[0].id, sharedBy: adminUser.id, permission: 'Editar' },
      {
        srIdx: 4,
        userId: consultantUsers[2].id,
        sharedBy: managerUsers[0].id,
        permission: 'Visualizar',
      },
      { srIdx: 6, userId: allUsers[3].id, sharedBy: consultantUsers[0].id, permission: 'Editar' },
      { srIdx: 9, userId: consultantUsers[3].id, sharedBy: adminUser.id, permission: 'Visualizar' },
      { srIdx: 12, userId: allUsers[5].id, sharedBy: managerUsers[0].id, permission: 'Editar' },
    ]

    for (var shi = 0; shi < shareData.length; shi++) {
      var sh = shareData[shi]
      if (!srIds[sh.srIdx]) continue
      try {
        app.findFirstRecordByFilter(
          'service_record_shares',
          'service_record = {:sr} && user = {:u}',
          srIds[sh.srIdx],
          sh.userId,
        )
      } catch (_) {
        var shRec = new Record(sharesCol)
        shRec.set('service_record', srIds[sh.srIdx])
        shRec.set('user', sh.userId)
        shRec.set('shared_by', sh.sharedBy)
        shRec.set('permission', sh.permission)
        app.save(shRec)
      }
    }

    // ========================
    // 10. SEED SERVICE RECORD HISTORY
    // ========================
    var historyData = [
      {
        srIdx: 0,
        field: 'status',
        oldVal: 'Aberto',
        newVal: 'Em Andamento',
        justification: 'Atendimento iniciado pelo consultor responsável.',
      },
      {
        srIdx: 0,
        field: 'priority',
        oldVal: 'Baixa',
        newVal: 'Alta',
        justification: 'Cliente corporativo com SLA prioritário requereu elevação de prioridade.',
      },
      {
        srIdx: 4,
        field: 'status',
        oldVal: 'Em Andamento',
        newVal: 'Concluído',
        justification: 'Cotação finalizada e enviada ao cliente.',
      },
      {
        srIdx: 6,
        field: 'status',
        oldVal: 'Concluído',
        newVal: 'Aberto',
        justification: 'Reabertura solicitada pelo cliente para complementar atendimento.',
      },
      {
        srIdx: 12,
        field: 'assigned_user',
        oldVal: consultantUsers[0].get('name'),
        newVal: consultantUsers[2].get('name'),
        justification: 'Realocação de atendimentos para balanceamento de carga.',
      },
      {
        srIdx: 1,
        field: 'priority',
        oldVal: 'Média',
        newVal: 'Alta',
        justification: 'Diretoria solicitou urgência na marcação de assento.',
      },
      {
        srIdx: 9,
        field: 'status',
        oldVal: 'Aberto',
        newVal: 'Cancelado',
        justification: 'Cliente cancelou viagem por motivo pessoal.',
      },
    ]

    for (var hi = 0; hi < historyData.length; hi++) {
      var hd = historyData[hi]
      if (!srIds[hd.srIdx]) continue
      var hRec = new Record(historyCol)
      hRec.set('service_record', srIds[hd.srIdx])
      hRec.set('user', adminUser.id)
      hRec.set('field', hd.field)
      hRec.set('old_value', hd.oldVal)
      hRec.set('new_value', hd.newVal)
      hRec.set('justification', hd.justification)
      app.save(hRec)
    }

    // ========================
    // 11. SEED AUDIT LOG
    // ========================
    var auditData = [
      {
        user: adminUser.id,
        action: 'create',
        entity: 'service_records',
        entityId: srIds[0] || '',
        details: { description: 'Criação de atendimento para Rextur Advance Viagens' },
      },
      {
        user: managerUsers[0].id,
        action: 'update',
        entity: 'service_records',
        entityId: srIds[4] || '',
        details: { field: 'status', old: 'Em Andamento', new: 'Concluído' },
      },
      {
        user: adminUser.id,
        action: 'block',
        entity: 'clients',
        entityId: clientMap['Aéreo Logística Transportes']
          ? clientMap['Aéreo Logística Transportes'].id
          : '',
        details: { reason: 'Inadimplência contratual superior a 60 dias' },
      },
      {
        user: managerUsers[0].id,
        action: 'block',
        entity: 'clients',
        entityId: clientMap['Expresso Andes Viagens'] ? clientMap['Expresso Andes Viagens'].id : '',
        details: { reason: 'Múltiplos contatos evitáveis e uso indevido do canal de comercial' },
      },
      {
        user: adminUser.id,
        action: 'grant_master_access',
        entity: 'users',
        entityId: '',
        details: {
          note: 'Master access concedido ao usuário administrador durante configuração inicial',
        },
      },
      {
        user: adminUser.id,
        action: 'share_grant',
        entity: 'service_record_shares',
        entityId: '',
        details: {
          permission: 'Visualizar',
          note: 'Compartilhamento de atendimento entre consultores',
        },
      },
      {
        user: managerUsers[0].id,
        action: 'share_revoke',
        entity: 'service_record_shares',
        entityId: '',
        details: { note: 'Revogação de compartilhamento após conclusão de atendimento' },
      },
      {
        user: adminUser.id,
        action: 'delete',
        entity: 'clients',
        entityId: '',
        details: { note: 'Exclusão de cliente inativo (não aplicado nesta seed)' },
      },
    ]

    for (var aui = 0; aui < auditData.length; aui++) {
      var aud = auditData[aui]
      var aRec = new Record(auditCol)
      aRec.set('user', aud.user)
      aRec.set('action', aud.action)
      aRec.set('entity', aud.entity)
      aRec.set('entity_id', aud.entityId)
      aRec.set('details', aud.details)
      app.save(aRec)
    }
  },
  (app) => {
    // Down migration: no-op to preserve existing data
  },
)
