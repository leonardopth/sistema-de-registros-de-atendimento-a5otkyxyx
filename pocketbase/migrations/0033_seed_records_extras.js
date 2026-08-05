migrate(
  (app) => {
    try {
      var existing = app.findRecordsByFilter('service_records', "id != ''", '-created', 1, 0)
      if (existing.length > 0) return
    } catch (_) {}

    var clientNames = ['Rextur Advance Viagens', 'CVC Corp Viagens', 'Decolar Viagens Brasil']
    var clientIds = [],
      clientThresholds = [],
      clientEmails = [],
      clientPhones = [],
      clientCompanies = []
    for (var ci = 0; ci < clientNames.length; ci++) {
      try {
        var c = app.findFirstRecordByData('clients', 'name', clientNames[ci])
        clientIds.push(c.id)
        clientThresholds.push(c.get('avoidable_contact_threshold') || 5)
        clientEmails.push(c.getString('email'))
        clientPhones.push(c.getString('phone'))
        clientCompanies.push(c.getString('company'))
      } catch (_) {
        return
      }
    }

    var aeNames = ['Ana Carolina Pereira', 'Roberto Mendes', 'Fernanda Lima']
    var aeIds = [],
      aeEmails = []
    for (var ai = 0; ai < aeNames.length; ai++) {
      try {
        var ae = app.findFirstRecordByData('account_executives', 'name', aeNames[ai])
        aeIds.push(ae.id)
        aeEmails.push(ae.getString('email'))
      } catch (_) {
        return
      }
    }

    var agentNames = [
      'Patrícia Almeida',
      'Rodrigo Ferreira',
      'Camila Rocha',
      'Bruno Carvalho',
      'Daniela Martins',
      'Eduardo Gomes',
    ]
    var agentIds = []
    for (var agi = 0; agi < agentNames.length; agi++) {
      try {
        var ag = app.findFirstRecordByData('agents', 'name', agentNames[agi])
        agentIds.push(ag.id)
      } catch (_) {
        return
      }
    }

    var allUsers = []
    try {
      allUsers = app.findRecordsByFilter(
        'users',
        "email != 'leonardo.thereziano@rexturadvance.com.br'",
        'name',
        0,
        0,
      )
    } catch (_) {}
    if (allUsers.length === 0) return

    var userIds = []
    var userByEmail = {}
    for (var u = 0; u < allUsers.length; u++) {
      userIds.push(allUsers[u].id)
      userByEmail[allUsers[u].getString('email')] = allUsers[u].id
    }

    var masterUserId = ''
    try {
      masterUserId = app.findAuthRecordByEmail(
        '_pb_users_auth_',
        'leonardo.thereziano@rexturadvance.com.br',
      ).id
    } catch (_) {}

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
      'Cliente solicita alteração de nome em bilhete emitido',
      'Dúvida sobre política de franquia de bagagem em voo doméstico',
      'Cálculo de multa por no-show em voo internacional',
      'Solicitação de reembolso parcial de trecho não voado',
      'Cotação de passagens para feira internacional em Frankfurt',
      'Reserva de carro alugado para viagem corporativa no Rio de Janeiro',
      'Cancelamento de hotel por antecipação do retorno do passageiro',
      'Dúvida sobre diferença tarifária entre classes de serviço',
      'Erro de emissão duplicada no sistema RF requerendo cancelamento',
      'Solicitação de assistência especial para passageiro idoso',
      'Cliente questiona cobrança de taxa de serviço adicional',
      'Marcação de assento para passageiro com restrição alimentar',
      'Reemissão por upgrade de classe solicitado pelo passageiro',
      'Reembolso de despesas com hospedagem por voo cancelado',
      'Cotação de pacote completo para viagem de incentivo a Cancún',
      'Reserva de traslado aeroporto-hotel para grupo de executivos',
      'Cancelamento de trecho por mudança de reunião corporativa',
      'Consulta sobre regras de baggage para equipamento de mergulho',
      'Falha na geração de boarding pass no sistema RF',
      'Solicitação de dieta especial em voo intercontinental',
      'Cliente reporta erro na data de retorno emitida no bilhete',
      'Dúvida sobre limite de peso em bagagem de mão para voo regional',
      'Cálculo de tarifa para menor acompanhado em rota internacional',
      'Solicitação de reembolso de tarifa concierge não utilizada',
      'Cotação de voo fretado para evento corporativo em Salvador',
      'Reserva de suite executiva para hospedagem prolongada em Londres',
      'Cancelamento por mudança de destino solicitada pelo cliente',
      'Consulta sobre acumulação de milhas em tarifa promocional',
      'Erro no cadastro de dados do passageiro no sistema RF',
      'Solicitação de upgrade por status de fidelidade do programa',
    ]

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

    var now = new Date()
    var totalSR = descriptions.length
    var srIds = []

    app.runInTransaction(function (txApp) {
      var srCol = txApp.findCollectionByNameOrId('service_records')

      for (var si = 0; si < totalSR; si++) {
        var clientIdx = si % 3
        var agentIdx = clientIdx * 2 + (si % 2)
        var userIdx = si % userIds.length
        var statusVal = statuses[si % 4]
        var isConcluido = statusVal === 'Concluído'
        var isCancelado = statusVal === 'Cancelado'
        var isEmAndamento = statusVal === 'Em Andamento'
        var isAvoidable = si % 4 === 3
        var duration = 5 + ((si * 7) % 115)
        var startTime = new Date(now.getTime() - (totalSR - si) * 14.4 * 3600000).toISOString()
        var endTime =
          isConcluido || isCancelado
            ? new Date(new Date(startTime).getTime() + duration * 60000).toISOString()
            : null

        var srRec = new Record(srCol)
        srRec.set('client_name', clientNames[clientIdx])
        srRec.set('client_email', clientEmails[clientIdx])
        srRec.set('client_phone', clientPhones[clientIdx])
        srRec.set('client_company', clientCompanies[clientIdx])
        srRec.set('contact_reason', reasons[si % 10])
        srRec.set('description', descriptions[si])
        srRec.set('priority', priorities[si % 3])
        srRec.set('status', statusVal)
        srRec.set('start_time', startTime)
        srRec.set('duration', duration)
        if (endTime) srRec.set('end_time', endTime)
        srRec.set('assigned_agent', agentNames[agentIdx])
        srRec.set('user_id', userIds[userIdx])
        srRec.set('assigned_user', userIds[userIdx])
        srRec.set('channel', channels[si % 5])
        srRec.set('client', clientIds[clientIdx])
        srRec.set('agent', agentIds[agentIdx])
        srRec.set('account_executive', aeIds[clientIdx])
        srRec.set('avoidable_contact', isAvoidable)
        if (isAvoidable) {
          srRec.set('avoidable_contact_reason', avoidReasons[si % 4])
          srRec.set('avoidable_contact_explanation', avoidExplanations[si % 4])
        }
        if (si % 3 !== 2) {
          srRec.set('tasks', [
            {
              id: 'task-' + si + '-1',
              title: 'Verificar disponibilidade no sistema',
              done: isConcluido || isEmAndamento,
              due_date: startTime,
              responsible: agentNames[agentIdx],
            },
            {
              id: 'task-' + si + '-2',
              title: 'Confirmar dados do passageiro',
              done: isConcluido,
              due_date: startTime,
              responsible: agentNames[agentIdx],
            },
          ])
        }
        if (isEmAndamento) {
          srRec.set('timer_start', startTime)
          srRec.set('timer_running', true)
        }
        if (isConcluido && (si === 6 || si === 14 || si === 22)) {
          srRec.set(
            'reopen_justification',
            'Reabertura solicitada pelo cliente para complementar atendimento.',
          )
        }
        txApp.save(srRec)
        srIds.push(srRec.id)
      }

      var histCol = txApp.findCollectionByNameOrId('service_record_history')
      var historyEntries = [
        {
          srIdx: 0,
          field: 'status',
          old: 'Aberto',
          newVal: 'Em Andamento',
          just: 'Início do atendimento pelo consultor',
        },
        {
          srIdx: 0,
          field: 'priority',
          old: 'Baixa',
          newVal: 'Média',
          just: 'Reclassificação devido à urgência do cliente',
        },
        {
          srIdx: 1,
          field: 'status',
          old: 'Aberto',
          newVal: 'Em Andamento',
          just: 'Consultor assumiu o atendimento',
        },
        {
          srIdx: 4,
          field: 'status',
          old: 'Em Andamento',
          newVal: 'Concluído',
          just: 'Atendimento finalizado com sucesso',
        },
        {
          srIdx: 5,
          field: 'status',
          old: 'Aberto',
          newVal: 'Em Andamento',
          just: 'Início do processamento da reserva',
        },
        {
          srIdx: 8,
          field: 'status',
          old: 'Em Andamento',
          newVal: 'Cancelado',
          just: 'Cliente desistiu do atendimento',
        },
        {
          srIdx: 9,
          field: 'status',
          old: 'Aberto',
          newVal: 'Em Andamento',
          just: 'Início da análise do caso',
        },
        {
          srIdx: 12,
          field: 'priority',
          old: 'Média',
          newVal: 'Alta',
          just: 'Aumento da prioridade por solicitação do cliente',
        },
        {
          srIdx: 12,
          field: 'status',
          old: 'Em Andamento',
          newVal: 'Concluído',
          just: 'Reemissão processada com sucesso',
        },
        {
          srIdx: 16,
          field: 'status',
          old: 'Em Andamento',
          newVal: 'Concluído',
          just: 'Cancelamento processado e confirmado',
        },
        {
          srIdx: 20,
          field: 'status',
          old: 'Aberto',
          newVal: 'Em Andamento',
          just: 'Consultor iniciou verificação',
        },
        {
          srIdx: 24,
          field: 'status',
          old: 'Em Andamento',
          newVal: 'Concluído',
          just: 'Cotação enviada e aprovada pelo cliente',
        },
        {
          srIdx: 28,
          field: 'priority',
          old: 'Baixa',
          newVal: 'Alta',
          just: 'Erro crítico identificado no sistema RF',
        },
        {
          srIdx: 28,
          field: 'status',
          old: 'Em Andamento',
          newVal: 'Concluído',
          just: 'Erro corrigido e bilhete reemitido',
        },
        {
          srIdx: 32,
          field: 'status',
          old: 'Aberto',
          newVal: 'Em Andamento',
          just: 'Início do processo de reembolso',
        },
        {
          srIdx: 36,
          field: 'status',
          old: 'Em Andamento',
          newVal: 'Concluído',
          just: 'Reserva confirmada e voucher enviado',
        },
        {
          srIdx: 40,
          field: 'status',
          old: 'Em Andamento',
          newVal: 'Cancelado',
          just: 'Cliente cancelou por mudança de planos',
        },
        {
          srIdx: 44,
          field: 'status',
          old: 'Aberto',
          newVal: 'Em Andamento',
          just: 'Início da análise da solicitação',
        },
      ]
      for (var hi = 0; hi < historyEntries.length; hi++) {
        var he = historyEntries[hi]
        if (he.srIdx >= srIds.length || !srIds[he.srIdx]) continue
        var histRec = new Record(histCol)
        histRec.set('service_record', srIds[he.srIdx])
        histRec.set('user', userIds[he.srIdx % userIds.length])
        histRec.set('field', he.field)
        histRec.set('old_value', he.old)
        histRec.set('new_value', he.newVal)
        histRec.set('justification', he.just)
        txApp.save(histRec)
      }

      var notifCol = txApp.findCollectionByNameOrId('notifications')

      for (var nci = 0; nci < clientIds.length; nci++) {
        var threshold = clientThresholds[nci]
        try {
          var avoidableCount = txApp.findRecordsByFilter(
            'service_records',
            'avoidable_contact = true && client = {:clientId}',
            '-created',
            0,
            0,
            { clientId: clientIds[nci] },
          ).length

          if (avoidableCount >= threshold) {
            var alertMsg =
              'Cliente ' +
              clientNames[nci] +
              ' ultrapassou o limite de contatos evitáveis: ' +
              avoidableCount +
              ' contato(s) nos últimos 30 dias (limite: ' +
              threshold +
              ').'
            var alertLink = '/clientes?clientId=' + clientIds[nci] + '&count=' + avoidableCount

            if (masterUserId) {
              var masterNotif = new Record(notifCol)
              masterNotif.set('user_id', masterUserId)
              masterNotif.set('title', 'Alerta de contatos evitáveis')
              masterNotif.set('message', alertMsg)
              masterNotif.set('type', 'alert')
              masterNotif.set('read', false)
              masterNotif.set('link', alertLink)
              txApp.save(masterNotif)
            }

            var aeUid = userByEmail[aeEmails[nci]]
            if (aeUid) {
              var aeNotif = new Record(notifCol)
              aeNotif.set('user_id', aeUid)
              aeNotif.set('title', 'Alerta de contatos evitáveis')
              aeNotif.set('message', alertMsg)
              aeNotif.set('type', 'alert')
              aeNotif.set('read', false)
              aeNotif.set('link', alertLink)
              txApp.save(aeNotif)
            }
          }
        } catch (_) {}
      }

      var infoNotifs = [
        {
          userIdx: 0,
          title: 'Novo atendimento atribuído',
          msg: 'Você tem um novo atendimento prioritário aguardando ação.',
          type: 'info',
        },
        {
          userIdx: 3,
          title: 'Atualização de status',
          msg: 'Atendimento foi atualizado para Em Andamento.',
          type: 'info',
        },
        {
          userIdx: 6,
          title: 'Tarefa concluída',
          msg: 'Uma tarefa foi marcada como concluída no sistema.',
          type: 'success',
        },
        {
          userIdx: 9,
          title: 'Atendimento concluído',
          msg: 'O atendimento foi finalizado com sucesso.',
          type: 'success',
        },
        {
          userIdx: 12,
          title: 'Novo cliente cadastrado',
          msg: 'Um novo cliente foi adicionado ao seu portfólio.',
          type: 'info',
        },
      ]
      for (var ini = 0; ini < infoNotifs.length; ini++) {
        var inf = infoNotifs[ini]
        if (inf.userIdx >= userIds.length) continue
        var nRec = new Record(notifCol)
        nRec.set('user_id', userIds[inf.userIdx])
        nRec.set('title', inf.title)
        nRec.set('message', inf.msg)
        nRec.set('type', inf.type)
        nRec.set('read', false)
        txApp.save(nRec)
      }

      if (masterUserId) {
        var apprNotif = new Record(notifCol)
        apprNotif.set('user_id', masterUserId)
        apprNotif.set('title', 'Ambiente de testes redefinido')
        apprNotif.set(
          'message',
          '15 usuários simulados, 3 empresas e 50 atendimentos foram criados para o ambiente de testes.',
        )
        apprNotif.set('type', 'info')
        apprNotif.set('read', false)
        txApp.save(apprNotif)
      }
    })
  },
  (app) => {},
)
