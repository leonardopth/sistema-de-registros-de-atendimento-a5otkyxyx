migrate(
  (app) => {
    try {
      var existingSR = app.findRecordsByFilter('service_records', "id != ''", '-created', 1, 0)
      if (existingSR.length > 0) return
    } catch (_) {}

    var masterUserId = ''
    try {
      var master = app.findAuthRecordByEmail(
        '_pb_users_auth_',
        'leonardo.thereziano@rexturadvance.com.br',
      )
      masterUserId = master.id
    } catch (_) {}

    var aeCol = app.findCollectionByNameOrId('account_executives')
    var clientsCol = app.findCollectionByNameOrId('clients')
    var agentsCol = app.findCollectionByNameOrId('agents')
    var usersCol = app.findCollectionByNameOrId('_pb_users_auth_')

    var aeData = [
      {
        name: 'Ana Carolina Pereira',
        email: 'ana.pereira@rextur.com.br',
        phone: '(11) 98877-6655',
      },
      { name: 'Roberto Mendes', email: 'roberto.mendes@rextur.com.br', phone: '(21) 99654-3322' },
      { name: 'Fernanda Lima', email: 'fernanda.lima@rextur.com.br', phone: '(31) 98765-4321' },
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
      { name: 'Marcelo Ribeiro', email: 'marcelo.ribeiro@rextur.com.br', role: 'Gerente' },
      { name: 'Juliana Freitas', email: 'juliana.freitas@rextur.com.br', role: 'Supervisor' },
      { name: 'Gustavo Pinto', email: 'gustavo.pinto@rextur.com.br', role: 'Líder' },
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

    var allUserIds = userIds.slice()
    if (masterUserId) allUserIds.push(masterUserId)

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
      'Solicitação de bagagem extra para equipamentos esportivos',
    ]

    var now = new Date()
    var totalSR = descriptions.length

    var insertSQL =
      'INSERT INTO service_records ' +
      '(id, created, updated, client_name, client_email, client_phone, client_company, ' +
      'contact_reason, description, priority, status, start_time, duration, end_time, ' +
      'assigned_agent, user_id, assigned_user, channel, client, agent, account_executive, ' +
      'avoidable_contact, avoidable_contact_reason, avoidable_contact_explanation, ' +
      'tasks, timer_start, timer_running, reopen_justification) ' +
      'VALUES ({:id}, {:created}, {:updated}, {:client_name}, {:client_email}, {:client_phone}, {:client_company}, ' +
      '{:contact_reason}, {:description}, {:priority}, {:status}, {:start_time}, {:duration}, {:end_time}, ' +
      '{:assigned_agent}, {:user_id}, {:assigned_user}, {:channel}, {:client}, {:agent}, {:account_executive}, ' +
      '{:avoidable_contact}, {:avoidable_contact_reason}, {:avoidable_contact_explanation}, ' +
      '{:tasks}, {:timer_start}, {:timer_running}, {:reopen_justification})'

    for (var si = 0; si < totalSR; si++) {
      var clientIdx = si % 3
      var agentIdx = si % 6
      var execIdx = si % 3
      var userIdx = si % allUserIds.length
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
      var startTime = new Date(now.getTime() - (totalSR - si) * 14.4 * 3600000).toISOString()
      var endTime =
        isConcluido || isCancelado
          ? new Date(new Date(startTime).getTime() + duration * 60000).toISOString()
          : null
      var srId = $security.randomString(15)
      var createdTs = new Date(now.getTime() - (totalSR - si) * 3600000).toISOString()

      var tasksVal = null
      if (hasTasks) {
        tasksVal = JSON.stringify([
          {
            id: 'task-' + si + '-1',
            title: 'Verificar disponibilidade no sistema',
            done: isConcluido,
            due_date: startTime,
            responsible: agentData[agentIdx].name,
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

      var reopenVal =
        isConcluido && (si === 6 || si === 14)
          ? 'Reabertura solicitada pelo cliente para complementar atendimento.'
          : null

      try {
        app
          .db()
          .newQuery(insertSQL)
          .bind({
            id: srId,
            created: createdTs,
            updated: createdTs,
            client_name: clientData[clientIdx].name,
            client_email: clientData[clientIdx].email,
            client_phone: clientData[clientIdx].phone,
            client_company: clientData[clientIdx].company,
            contact_reason: reasons[reasonIdx],
            description: descriptions[si],
            priority: priorities[priorityIdx],
            status: statusVal,
            start_time: startTime,
            duration: duration,
            end_time: endTime,
            assigned_agent: agentData[agentIdx].name,
            user_id: allUserIds[userIdx],
            assigned_user: allUserIds[userIdx],
            channel: channels[channelIdx],
            client: clientIds[clientIdx],
            agent: agentIds[agentIdx],
            account_executive: aeIds[execIdx],
            avoidable_contact: isAvoidable ? 1 : 0,
            avoidable_contact_reason: isAvoidable ? avoidReasons[si % 4] : null,
            avoidable_contact_explanation: isAvoidable ? avoidExplanations[si % 4] : null,
            tasks: tasksVal,
            timer_start: isEmAndamento ? startTime : null,
            timer_running: isEmAndamento ? 1 : 0,
            reopen_justification: reopenVal,
          })
          .execute()
      } catch (err) {
        console.log('Failed to insert service record ' + si + ': ' + err.message)
      }
    }
  },
  (app) => {},
)
