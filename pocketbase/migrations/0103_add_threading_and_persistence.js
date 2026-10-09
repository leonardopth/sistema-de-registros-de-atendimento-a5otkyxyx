migrate(
  (app) => {
    // 1. Atualizar coleção control_tower_configs adicionando peso configurável para cliente insistente / múltiplas mensagens
    const configsCol = app.findCollectionByNameOrId('control_tower_configs')
    if (!configsCol.fields.getByName('weight_persistent_client')) {
      configsCol.fields.add(new NumberField({ name: 'weight_persistent_client' }))
    }
    app.save(configsCol)

    // Atualizar registro existente de configuração com valor padrão (ex: 20 pontos)
    try {
      const cfgList = app.findRecordsByFilter('control_tower_configs', '', '-created', 1, 0)
      if (cfgList && cfgList.length > 0) {
        const cRec = cfgList[0]
        if (!cRec.get('weight_persistent_client')) {
          cRec.set('weight_persistent_client', 20)
          app.save(cRec)
        }
      }
    } catch (_) {}

    // 2. Atualizar coleção control_tower_emails com os campos de Threading
    const emailsCol = app.findCollectionByNameOrId('control_tower_emails')

    if (!emailsCol.fields.getByName('thread_id')) {
      emailsCol.fields.add(new TextField({ name: 'thread_id' }))
    }

    if (!emailsCol.fields.getByName('thread_root')) {
      emailsCol.fields.add(
        new RelationField({
          name: 'thread_root',
          collectionId: emailsCol.id,
          maxSelect: 1,
        }),
      )
    }

    if (!emailsCol.fields.getByName('message_count')) {
      emailsCol.fields.add(new NumberField({ name: 'message_count' }))
    }

    if (!emailsCol.fields.getByName('is_thread_child')) {
      emailsCol.fields.add(new BoolField({ name: 'is_thread_child' }))
    }

    if (!emailsCol.fields.getByName('last_message_at')) {
      emailsCol.fields.add(new DateField({ name: 'last_message_at' }))
    }

    app.save(emailsCol)

    // Índices de thread_id e thread_root
    try {
      emailsCol.addIndex('idx_cte_thread_id', false, 'thread_id', '')
      emailsCol.addIndex('idx_cte_thread_root', false, 'thread_root', '')
      app.save(emailsCol)
    } catch (_) {}

    // 3. Normalização e Agrupamento dos e-mails existentes + Seed de demonstração de threads
    try {
      const now = new Date()
      const existing = app.findRecordsByFilter('control_tower_emails', '', '-created', 50, 0)

      for (let i = 0; i < existing.length; i++) {
        const r = existing[i]
        const recAt = r.getString('received_at') || r.getString('created') || now.toISOString()
        const curThreadId = r.getString('thread_id')
        if (!curThreadId) {
          const tId = 'th_' + r.id
          r.set('thread_id', tId)
          r.set('message_count', 1)
          r.set('is_thread_child', false)
          r.set('last_message_at', recAt)
          app.save(r)
        }
      }

      // Criar 1–2 threads ricas de exemplo com 2–3 mensagens cada:
      // Thread 1: E-mail demo 1 (Fernanda Oliveira - P1 Crítico com Voo cancelado - SAO Internacional, já escalado)
      // Adicionar 2 mensagens filhas do mesmo cliente reforçando e cobrando urgência
      if (existing.length > 0) {
        const root1 = existing[0] // dvvwx5mcqeq4io2
        const root1ThreadId = root1.getString('thread_id') || 'th_' + root1.id
        root1.set('thread_id', root1ThreadId)
        root1.set('message_count', 3)
        root1.set('is_thread_child', false)

        // Adicionar sinal de cliente insistente aos sinais do root
        let sigs = []
        try {
          const raw = root1.get('detected_signals')
          if (Array.isArray(raw)) sigs = raw
        } catch (_) {}
        if (sigs.indexOf('Cliente insistente (3 msgs)') === -1) {
          sigs.push('Cliente insistente (3 msgs)')
        }
        root1.set('detected_signals', sigs)
        root1.set('score', 135) // 115 original + 20 persistência
        root1.set('priority', 'P1')
        root1.set('status', 'Escalado')

        const timeMsg2 = new Date(now.getTime() - 40 * 60000).toISOString()
        const timeMsg3 = new Date(now.getTime() - 15 * 60000).toISOString()
        root1.set('last_message_at', timeMsg3)
        app.save(root1)

        // Mensagem 2 da Thread 1
        const child1_1 = new Record(emailsCol)
        child1_1.set(
          'subject',
          'Re: URGENTE: Voo cancelado - Embarque hoje às 20h - Localizador KLM921',
        )
        child1_1.set('sender_email', root1.getString('sender_email'))
        child1_1.set('sender_name', root1.getString('sender_name'))
        child1_1.set('recipient_email', root1.getString('recipient_email'))
        child1_1.set(
          'body_snippet',
          'Ainda sem retorno de vocês! Os passageiros já estão a caminho de Guarulhos e precisam da confirmação da nova rota antes do check-in encerrar. Favor priorizar com máxima urgência.',
        )
        child1_1.set('received_at', timeMsg2)
        child1_1.set('service_group', root1.getString('service_group'))
        child1_1.set('team', root1.getString('team'))
        child1_1.set('inbox_address', root1.getString('inbox_address'))
        child1_1.set('client', root1.getString('client'))
        child1_1.set('reservation_number', root1.getString('reservation_number'))
        child1_1.set('detected_signals', [
          'Embarque <24h',
          'Cancelamento/Remarcação',
          'Cliente insistente (3 msgs)',
        ])
        child1_1.set('score', 125)
        child1_1.set('priority', 'P1')
        child1_1.set('status', 'Escalado')
        child1_1.set('is_noise', false)
        child1_1.set('thread_id', root1ThreadId)
        child1_1.set('thread_root', root1.id)
        child1_1.set('is_thread_child', true)
        child1_1.set('message_count', 1)
        child1_1.set('external_message_id', 'demo_thread1_msg02')
        app.save(child1_1)

        // Mensagem 3 da Thread 1
        const child1_2 = new Record(emailsCol)
        child1_2.set(
          'subject',
          'Re: Re: URGENTE: Voo cancelado - Embarque hoje às 20h - Localizador KLM921',
        )
        child1_2.set('sender_email', root1.getString('sender_email'))
        child1_2.set('sender_name', root1.getString('sender_name'))
        child1_2.set('recipient_email', root1.getString('recipient_email'))
        child1_2.set(
          'body_snippet',
          'Prezados supervisores, terceirizo a cobrança pois estamos há mais de 1h aguardando e ninguém nos atende no telefone nem responde ao e-mail. Caso percamos o voo, os custos serão transferidos.',
        )
        child1_2.set('received_at', timeMsg3)
        child1_2.set('service_group', root1.getString('service_group'))
        child1_2.set('team', root1.getString('team'))
        child1_2.set('inbox_address', root1.getString('inbox_address'))
        child1_2.set('client', root1.getString('client'))
        child1_2.set('reservation_number', root1.getString('reservation_number'))
        child1_2.set('detected_signals', [
          'Embarque <24h',
          'Reclamação Formal',
          'Cliente insistente (3 msgs)',
        ])
        child1_2.set('score', 135)
        child1_2.set('priority', 'P1')
        child1_2.set('status', 'Escalado')
        child1_2.set('is_noise', false)
        child1_2.set('thread_id', root1ThreadId)
        child1_2.set('thread_root', root1.id)
        child1_2.set('is_thread_child', true)
        child1_2.set('message_count', 1)
        child1_2.set('external_message_id', 'demo_thread1_msg03')
        app.save(child1_2)
      }

      // Thread 2: E-mail demo 3 (Natalia Santos - Remarcação de bilhete - SPI Nacional)
      if (existing.length > 2) {
        const root2 = existing[2] // w26y4rfik1ancrm
        const root2ThreadId = root2.getString('thread_id') || 'th_' + root2.id
        root2.set('thread_id', root2ThreadId)
        root2.set('message_count', 2)
        root2.set('is_thread_child', false)

        let sigs2 = []
        try {
          const raw2 = root2.get('detected_signals')
          if (Array.isArray(raw2)) sigs2 = raw2
        } catch (_) {}
        if (sigs2.indexOf('Cliente insistente (2 msgs)') === -1) {
          sigs2.push('Cliente insistente (2 msgs)')
        }
        root2.set('detected_signals', sigs2)
        root2.set('score', 85) // 65 + 20
        root2.set('priority', 'P1') // subiu de P2 para P1 devido à reincidência / insistência!
        const timeMsg2_2 = new Date(now.getTime() - 90 * 60000).toISOString()
        root2.set('last_message_at', timeMsg2_2)
        app.save(root2)

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
        child2_1.set('detected_signals', ['Embarque <48h', 'Cancelamento/Remarcação'])
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
    } catch (_) {}
  },
  (app) => {
    try {
      const emailsCol = app.findCollectionByNameOrId('control_tower_emails')
      const f1 = emailsCol.fields.getByName('thread_id')
      if (f1) emailsCol.fields.remove(f1)
      const f2 = emailsCol.fields.getByName('thread_root')
      if (f2) emailsCol.fields.remove(f2)
      const f3 = emailsCol.fields.getByName('message_count')
      if (f3) emailsCol.fields.remove(f3)
      const f4 = emailsCol.fields.getByName('is_thread_child')
      if (f4) emailsCol.fields.remove(f4)
      const f5 = emailsCol.fields.getByName('last_message_at')
      if (f5) emailsCol.fields.remove(f5)
      app.save(emailsCol)
    } catch (_) {}

    try {
      const configsCol = app.findCollectionByNameOrId('control_tower_configs')
      const fc = configsCol.fields.getByName('weight_persistent_client')
      if (fc) {
        configsCol.fields.remove(fc)
        app.save(configsCol)
      }
    } catch (_) {}
  },
)
