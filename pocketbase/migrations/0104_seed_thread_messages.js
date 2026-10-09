migrate(
  (app) => {
    // Garantir que as threads de demonstração existam com mensagens filhas
    const emailsCol = app.findCollectionByNameOrId('control_tower_emails')
    const now = new Date()

    // 1. Thread 1: Procurar pelo e-mail demo 1 com PNR KLM921 ou ID dvvwx5mcqeq4io2
    let root1 = null
    try {
      root1 = app.findFirstRecordByData('control_tower_emails', 'id', 'dvvwx5mcqeq4io2')
    } catch (_) {
      try {
        const list = app.findRecordsByFilter(
          'control_tower_emails',
          "reservation_number = 'KLM921'",
          '-created',
          1,
          0,
        )
        if (list && list.length > 0) root1 = list[0]
      } catch (_) {}
    }

    if (root1) {
      const root1ThreadId = root1.getString('thread_id') || 'th_' + root1.id
      root1.set('thread_id', root1ThreadId)
      root1.set('message_count', 3)
      root1.set('is_thread_child', false)
      root1.set('score', 135)
      root1.set('priority', 'P1')
      root1.set('status', 'Escalado')

      let sigs = []
      try {
        const raw = root1.get('detected_signals')
        if (Array.isArray(raw)) sigs = raw
        else if (typeof raw === 'string') sigs = JSON.parse(raw)
      } catch (_) {}
      if (sigs.indexOf('Cliente insistente (3 msgs)') === -1) {
        sigs.push('Cliente insistente (3 msgs)')
      }
      root1.set('detected_signals', JSON.stringify(sigs))

      const timeMsg2 = new Date(now.getTime() - 40 * 60000).toISOString()
      const timeMsg3 = new Date(now.getTime() - 15 * 60000).toISOString()
      root1.set('last_message_at', timeMsg3)
      app.save(root1)

      // Criar child1 se não existir
      let hasChild1 = false
      try {
        const c1 = app.findRecordsByFilter(
          'control_tower_emails',
          "external_message_id = 'demo_thread1_msg02'",
          '',
          1,
          0,
        )
        if (c1 && c1.length > 0) hasChild1 = true
      } catch (_) {}

      if (!hasChild1) {
        const child1 = new Record(emailsCol)
        child1.set(
          'subject',
          'Re: URGENTE: Voo cancelado - Embarque hoje às 20h - Localizador KLM921',
        )
        child1.set('sender_email', root1.getString('sender_email'))
        child1.set('sender_name', root1.getString('sender_name'))
        child1.set('recipient_email', root1.getString('recipient_email'))
        child1.set(
          'body_snippet',
          'Ainda sem retorno de vocês! Os passageiros já estão a caminho de Guarulhos e precisam da confirmação da nova rota antes do check-in encerrar. Favor priorizar com máxima urgência.',
        )
        child1.set('received_at', timeMsg2)
        child1.set('service_group', root1.getString('service_group'))
        child1.set('team', root1.getString('team'))
        child1.set('inbox_address', root1.getString('inbox_address'))
        child1.set('client', root1.getString('client'))
        child1.set('reservation_number', root1.getString('reservation_number'))
        child1.set(
          'detected_signals',
          JSON.stringify([
            'Embarque <24h',
            'Cancelamento/Remarcação',
            'Cliente insistente (3 msgs)',
          ]),
        )
        child1.set('score', 125)
        child1.set('priority', 'P1')
        child1.set('status', 'Escalado')
        child1.set('is_noise', false)
        child1.set('thread_id', root1ThreadId)
        child1.set('thread_root', root1.id)
        child1.set('is_thread_child', true)
        child1.set('message_count', 1)
        child1.set('external_message_id', 'demo_thread1_msg02')
        app.save(child1)
      }

      // Criar child2 se não existir
      let hasChild2 = false
      try {
        const c2 = app.findRecordsByFilter(
          'control_tower_emails',
          "external_message_id = 'demo_thread1_msg03'",
          '',
          1,
          0,
        )
        if (c2 && c2.length > 0) hasChild2 = true
      } catch (_) {}

      if (!hasChild2) {
        const child2 = new Record(emailsCol)
        child2.set(
          'subject',
          'Re: Re: URGENTE: Voo cancelado - Embarque hoje às 20h - Localizador KLM921',
        )
        child2.set('sender_email', root1.getString('sender_email'))
        child2.set('sender_name', root1.getString('sender_name'))
        child2.set('recipient_email', root1.getString('recipient_email'))
        child2.set(
          'body_snippet',
          'Prezados supervisores, terceirizo a cobrança pois estamos há mais de 1h aguardando e ninguém nos atende no telefone nem responde ao e-mail. Caso percamos o voo, os custos serão transferidos.',
        )
        child2.set('received_at', timeMsg3)
        child2.set('service_group', root1.getString('service_group'))
        child2.set('team', root1.getString('team'))
        child2.set('inbox_address', root1.getString('inbox_address'))
        child2.set('client', root1.getString('client'))
        child2.set('reservation_number', root1.getString('reservation_number'))
        child2.set(
          'detected_signals',
          JSON.stringify(['Embarque <24h', 'Reclamação Formal', 'Cliente insistente (3 msgs)']),
        )
        child2.set('score', 135)
        child2.set('priority', 'P1')
        child2.set('status', 'Escalado')
        child2.set('is_noise', false)
        child2.set('thread_id', root1ThreadId)
        child2.set('thread_root', root1.id)
        child2.set('is_thread_child', true)
        child2.set('message_count', 1)
        child2.set('external_message_id', 'demo_thread1_msg03')
        app.save(child2)
      }
    }

    // 2. Thread 2: E-mail demo 3 (Natalia Santos - Remarcação SPI)
    let root2 = null
    try {
      root2 = app.findFirstRecordByData('control_tower_emails', 'id', 'w26y4rfik1ancrm')
    } catch (_) {
      try {
        const list2 = app.findRecordsByFilter(
          'control_tower_emails',
          "reservation_number = 'XPTO88'",
          '-created',
          1,
          0,
        )
        if (list2 && list2.length > 0) root2 = list2[0]
      } catch (_) {}
    }

    if (root2) {
      const root2ThreadId = root2.getString('thread_id') || 'th_' + root2.id
      root2.set('thread_id', root2ThreadId)
      root2.set('message_count', 2)
      root2.set('is_thread_child', false)
      root2.set('score', 85)
      root2.set('priority', 'P1')
      root2.set('status', 'Novo')

      let sigs2 = []
      try {
        const raw2 = root2.get('detected_signals')
        if (Array.isArray(raw2)) sigs2 = raw2
        else if (typeof raw2 === 'string') sigs2 = JSON.parse(raw2)
      } catch (_) {}
      if (sigs2.indexOf('Cliente insistente (2 msgs)') === -1) {
        sigs2.push('Cliente insistente (2 msgs)')
      }
      root2.set('detected_signals', JSON.stringify(sigs2))

      const timeMsg2_2 = new Date(now.getTime() - 90 * 60000).toISOString()
      root2.set('last_message_at', timeMsg2_2)
      app.save(root2)

      let hasChild2_1 = false
      try {
        const c2_1 = app.findRecordsByFilter(
          'control_tower_emails',
          "external_message_id = 'demo_thread2_msg02'",
          '',
          1,
          0,
        )
        if (c2_1 && c2_1.length > 0) hasChild2_1 = true
      } catch (_) {}

      if (!hasChild2_1) {
        const child2_1 = new Record(emailsCol)
        child2_1.set(
          'subject',
          'Fwd: Solicitação de remarcação de bilhete - Voo amanhã - Reserva XPTO88',
        )
        child2_1.set('sender_email', root2.getString('sender_email'))
        child2_1.set('sender_name', root2.getString('sender_name'))
        child2_1.set('recipient_email', root2.getString('recipient_email'))
        child2_1.set(
          'body_snippet',
          'Complementando: o passageiro prefere o voo das 14h20 pela Gol em vez do voo matutino. Conseguem cotar essa alternativa também por favor? Obrigada.',
        )
        child2_1.set('received_at', timeMsg2_2)
        child2_1.set('service_group', root2.getString('service_group'))
        child2_1.set('team', root2.getString('team'))
        child2_1.set('inbox_address', root2.getString('inbox_address'))
        child2_1.set('client', root2.getString('client'))
        child2_1.set('reservation_number', 'XPTO88')
        child2_1.set(
          'detected_signals',
          JSON.stringify(['Embarque <48h', 'Cancelamento/Remarcação']),
        )
        child2_1.set('score', 65)
        child2_1.set('priority', 'P2')
        child2_1.set('status', 'Novo')
        child2_1.set('is_noise', false)
        child2_1.set('thread_id', root2ThreadId)
        child2_1.set('thread_root', root2.id)
        child2_1.set('is_thread_child', true)
        child2_1.set('message_count', 1)
        child2_1.set('external_message_id', 'demo_thread2_msg02')
        app.save(child2_1)
      }
    }
  },
  (app) => {
    // rollback demo messages
    try {
      const msgs = app.findRecordsByFilter(
        'control_tower_emails',
        "external_message_id ~ 'demo_thread'",
        '',
        10,
        0,
      )
      for (let i = 0; i < msgs.length; i++) {
        app.delete(msgs[i])
      }
    } catch (_) {}
  },
)
