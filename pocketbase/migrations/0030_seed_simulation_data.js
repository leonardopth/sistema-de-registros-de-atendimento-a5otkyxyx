migrate(
  (app) => {
    try {
      var existingSR = app.findRecordsByFilter('service_records', "id != ''", '', 1, 0)
      if (existingSR.length > 0) return
    } catch (_) {}

    var aeCol = app.findCollectionByNameOrId('account_executives')
    var clientsCol = app.findCollectionByNameOrId('clients')
    var agentsCol = app.findCollectionByNameOrId('agents')
    var usersCol = app.findCollectionByNameOrId('_pb_users_auth_')
    var srCol = app.findCollectionByNameOrId('service_records')

    var aeData = [
      {
        name: 'Ana Carolina Pereira',
        email: 'ana.pereira@rextur.com.br',
        phone: '(11) 98877-6655',
      },
      { name: 'Roberto Mendes', email: 'roberto.mendes@rextur.com.br', phone: '(21) 99654-3322' },
      { name: 'Fernanda Lima', email: 'fernanda.lima@rextur.com.br', phone: '(31) 98765-4321' },
      {
        name: 'Carlos Eduardo Santos',
        email: 'carlos.santos@rextur.com.br',
        phone: '(41) 98822-1100',
      },
      { name: 'Juliana Costa', email: 'juliana.costa@rextur.com.br', phone: '(51) 98456-7890' },
    ]
    var aeIds = []
    for (var i = 0; i < aeData.length; i++) {
      var aeRec
      try {
        aeRec = app.findFirstRecordByData('account_executives', 'email', aeData[i].email)
      } catch (_) {
        aeRec = new Record(aeCol)
        aeRec.set('name', aeData[i].name)
        aeRec.set('email', aeData[i].email)
        aeRec.set('phone', aeData[i].phone)
        app.save(aeRec)
      }
      aeIds.push(aeRec.id)
    }

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
        aeIdx: 0,
        threshold: 5,
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
        aeIdx: 1,
        threshold: 7,
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
        aeIdx: 2,
        threshold: 4,
      },
    ]
    var clientIds = []
    for (var ci = 0; ci < clientData.length; ci++) {
      var cd = clientData[ci]
      var clRec
      try {
        clRec = app.findFirstRecordByData('clients', 'email', cd.email)
      } catch (_) {
        clRec = new Record(clientsCol)
        clRec.set('name', cd.name)
        clRec.set('email', cd.email)
        clRec.set('phone', cd.phone)
        clRec.set('company', cd.company)
        clRec.set('city', cd.city)
        clRec.set('state', cd.state)
        clRec.set('notes', cd.notes)
        clRec.set('service_group', cd.service_group)
        clRec.set('account_executive', aeData[cd.aeIdx].name)
        clRec.set('account_executive_rel', aeIds[cd.aeIdx])
        clRec.set('avoidable_contact_threshold', cd.threshold)
        app.save(clRec)
      }
      clientIds.push(clRec.id)
    }

    var agentData = [
      {
        name: 'Patrícia Almeida',
        email: 'patricia.almeida@rextur.com.br',
        phone: '(11) 97777-1111',
        clientIdx: 0,
      },
      {
        name: 'Rodrigo Ferreira',
        email: 'rodrigo.ferreira@rextur.com.br',
        phone: '(11) 97777-2222',
        clientIdx: 0,
      },
      {
        name: 'Camila Rocha',
        email: 'camila.rocha@rextur.com.br',
        phone: '(21) 97777-3333',
        clientIdx: 1,
      },
      {
        name: 'Bruno Carvalho',
        email: 'bruno.carvalho@rextur.com.br',
        phone: '(21) 97777-4444',
        clientIdx: 1,
      },
      {
        name: 'Daniela Martins',
        email: 'daniela.martins@rextur.com.br',
        phone: '(31) 97777-5555',
        clientIdx: 2,
      },
      {
        name: 'Eduardo Gomes',
        email: 'eduardo.gomes@rextur.com.br',
        phone: '(31) 97777-6666',
        clientIdx: 2,
      },
    ]
    var agentIds = []
    for (var ai = 0; ai < agentData.length; ai++) {
      var ad = agentData[ai]
      var agRec
      try {
        agRec = app.findFirstRecordByData('agents', 'email', ad.email)
      } catch (_) {
        agRec = new Record(agentsCol)
        agRec.set('name', ad.name)
        agRec.set('email', ad.email)
        agRec.set('phone', ad.phone)
        agRec.set('client_id', clientIds[ad.clientIdx])
        app.save(agRec)
      }
      agentIds.push(agRec.id)
    }

    var userData = [
      { name: 'Marcelo Ribeiro', email: 'marcelo.ribeiro@rextur.com.br', role: 'Gerentes' },
      { name: 'Patrícia Mendonça', email: 'patricia.mendonca@rextur.com.br', role: 'Gerentes' },
      { name: 'Rafael Antunes', email: 'rafael.antunes@rextur.com.br', role: 'Gerentes' },
      { name: 'Juliana Freitas', email: 'juliana.freitas@rextur.com.br', role: 'Supervisores' },
      { name: 'Fernando Castro', email: 'fernando.castro@rextur.com.br', role: 'Supervisores' },
      { name: 'Aline Barros', email: 'aline.barros@rextur.com.br', role: 'Supervisores' },
      { name: 'Gustavo Pinto', email: 'gustavo.pinto@rextur.com.br', role: 'Líderes' },
      { name: 'Mariana Sales', email: 'mariana.sales@rextur.com.br', role: 'Líderes' },
      { name: 'Felipe Aragão', email: 'felipe.aragao@rextur.com.br', role: 'Líderes' },
      { name: 'Camila Duarte', email: 'camila.duarte@rextur.com.br', role: 'Consultores' },
      { name: 'Lucas Andrade', email: 'lucas.andrade@rextur.com.br', role: 'Consultores' },
      { name: 'Beatriz Nogueira', email: 'beatriz.nogueira@rextur.com.br', role: 'Consultores' },
      {
        name: 'Ana Carolina Pereira',
        email: 'ana.carolina@rextur.com.br',
        role: 'Executivo de contas',
      },
      {
        name: 'Roberto Mendes',
        email: 'roberto.m.exec@rextur.com.br',
        role: 'Executivo de contas',
      },
      {
        name: 'Fernanda Lima',
        email: 'fernanda.l.exec@rextur.com.br',
        role: 'Executivo de contas',
      },
    ]
    var userIds = []
    for (var ui = 0; ui < userData.length; ui++) {
      var ud = userData[ui]
      var uRec
      try {
        uRec = app.findAuthRecordByEmail('_pb_users_auth_', ud.email)
      } catch (_) {
        uRec = new Record(usersCol)
        uRec.setEmail(ud.email)
        uRec.setPassword('Skip@Pass')
        uRec.setVerified(true)
        uRec.set('name', ud.name)
        uRec.set('role', ud.role)
        uRec.set('approval_status', 'Aprovado')
        app.save(uRec)
      }
      userIds.push(uRec.id)
    }

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
      'Cliente questiona limite de bagagem despachada em voo internacional para Lisboa',
      'Solicitação de marcação de assento preferencial para passageiro com mobilidade reduzida',
      'Cálculo de reemissão de passagem devido a mudança de data de retorno de Madri',
      'Solicitação de reembolso de passagem cancelada por motivo de saúde',
      'Cotação de passagens aéreas para grupo de 15 passageiros para Paris',
      'Reserva de hotel e traslado para viagem corporativa a Buenos Aires',
      'Cancelamento de reserva devido a imprevisto pessoal do passageiro',
      'Dúvida sobre regras tarifárias de bilhete emitido em classe econômica',
      'Erro no sistema RF ao tentar emitir bilhete para passageiro',
      'Solicitação de voucher de serviços terrestres em Barcelona',
      'Cliente relata extravio de bagagem no voo SP-Lisboa da TAP',
      'Marcação de assento para acompanhante de menor desacompanhado',
      'Reemissão de trecho não utilizado por alteração de itinerário corporativo',
      'Reembolso de taxa de embarque não utilizada em voo cancelado',
      'Cotação de classe executiva para diretoria em viagem a Nova York',
      'Reserva de pacote turístico para grupo a Orlando',
      'Cancelamento de passagem por falecimento do passageiro',
      'Consulta sobre penalidade por remarcação em tarifa promocional',
      'Falha no envio do bilhete eletrônico via sistema RF',
      'Atualização de dados de passageiro frequente em sistema',
      'Solicitação de bagagem extra para equipamentos esportivos',
      'Troca de assento por preferência de corredor em voo longo',
      'Cálculo de diferença tarifária para upgrade de classe',
      'Pedido de reembolso parcial por trecho não voado',
      'Cotação de passagens para feira internacional em Frankfurt',
      'Reserva de locação de veículo em Santiago para executivo',
      'Cancelamento de reserva por conflito de agenda corporativa',
      'Esclarecimento sobre regras de remarcação em tarifa flexível',
      'Erro de mapping no RF ao processar reserva com múltiplos trechos',
      'Solicitação de nota fiscal de serviços turísticos prestados',
      'Consulta sobre política de bagagem para animais de estimação',
      'Reserva de assento na saída de emergência para passageiro',
      'Reemissão de bilhete por mudança de companhia aérea',
      'Reembolso de despesas com refeição por atraso de voo',
      'Cotação de passagens para evento corporativo em Miami',
      'Reserva de transfer executivo em Londres',
      'Cancelamento de hotel por antecipação do retorno',
      'Análise de regras tarifárias para bilhete multi-trecho internacional',
      'Erro ao tentar adicionar serviço de bagagem no RF',
      'Orientação sobre documentação necessária para viagem ao Dubai',
      'Cliente solicita informação sobre franquia de bagagem em tarifa promo',
      'Alteração de assento para acomodar família em voo',
      'Reemissão por alteração de rota devido a greve de companhia',
      'Reembolso de seguro viagem não utilizado',
      'Cotação de fretamento para grupo corporativo a Cancún',
      'Reserva de city tour guiado em Roma',
      'Cancelamento de extras por erro de reserva',
      'Verificação de regras de no-show aplicáveis ao bilhete',
      'Erro de comunicação entre RF e GDS ao emitir bilhete',
      'Reclamação de serviço de traslado com atraso na chegada',
    ]

    var now = new Date()

    for (var si = 0; si < 50; si++) {
      var clientIdx = si % 3
      var userIdx = si % 15
      var agentIdx = si % 6
      var execIdx = si % 5
      var statusIdx = si % 4
      var priorityIdx = si % 3
      var reasonIdx = si % 10
      var channelIdx = si % 5
      var isAvoidable = si % 4 === 3
      var hasTasks = si % 3 === 0
      var statusVal = statuses[statusIdx]
      var isConcluido = statusVal === 'Concluído'
      var isCancelado = statusVal === 'Cancelado'
      var isEmAndamento = statusVal === 'Em Andamento'
      var duration = 5 + ((si * 7) % 115)
      var startTime = new Date(now.getTime() - (50 - si) * 14.4 * 3600000).toISOString()

      var srRec = new Record(srCol)
      srRec.set('client_name', clientData[clientIdx].name)
      srRec.set('client_email', clientData[clientIdx].email)
      srRec.set('client_phone', clientData[clientIdx].phone)
      srRec.set('client_company', clientData[clientIdx].company)
      srRec.set('contact_reason', reasons[reasonIdx])
      srRec.set('description', descriptions[si])
      srRec.set('priority', priorities[priorityIdx])
      srRec.set('status', statusVal)
      srRec.set('start_time', startTime)
      srRec.set('duration', duration)
      srRec.set('assigned_agent', agentData[agentIdx].name)
      srRec.set('user_id', userIds[userIdx])
      srRec.set('assigned_user', userIds[userIdx])
      srRec.set('channel', channels[channelIdx])
      srRec.set('client', clientIds[clientIdx])
      srRec.set('agent', agentIds[agentIdx])
      srRec.set('account_executive', aeIds[execIdx])
      srRec.set('avoidable_contact', false)

      if (isConcluido || isCancelado) {
        var endTime = new Date(new Date(startTime).getTime() + duration * 60000).toISOString()
        srRec.set('end_time', endTime)
      }

      if (isAvoidable) {
        srRec.set('avoidable_contact', true)
        srRec.set('avoidable_contact_reason', avoidReasons[si % 4])
        srRec.set('avoidable_contact_explanation', avoidExplanations[si % 4])
      }

      if (hasTasks) {
        srRec.set('tasks', [
          {
            id: 'task-' + si + '-1',
            title: 'Verificar disponibilidade no sistema',
            done: isConcluido,
            due_date: startTime,
            responsible: userData[userIdx].name,
          },
          {
            id: 'task-' + si + '-2',
            title: 'Confirmar dados do passageiro',
            done: isConcluido || isEmAndamento,
            due_date: startTime,
            responsible: agentData[agentIdx].name,
          },
        ])
      }

      if (isEmAndamento) {
        srRec.set('timer_start', startTime)
        srRec.set('timer_running', true)
      }

      if (isConcluido && (si === 6 || si === 18)) {
        srRec.set(
          'reopen_justification',
          'Reabertura solicitada pelo cliente para complementar atendimento.',
        )
      }

      app.save(srRec)
    }
  },
  (app) => {},
)
