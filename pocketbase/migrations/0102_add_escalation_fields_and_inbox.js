migrate(
  (app) => {
    // 1. Adicionar campos de escalação na coleção control_tower_emails se ainda não existirem
    const emailsCol = app.findCollectionByNameOrId('control_tower_emails')

    if (!emailsCol.fields.getByName('escalated_at')) {
      emailsCol.fields.add(new DateField({ name: 'escalated_at' }))
    }

    if (!emailsCol.fields.getByName('escalation_alert_sent')) {
      emailsCol.fields.add(new BoolField({ name: 'escalation_alert_sent' }))
    }

    if (!emailsCol.fields.getByName('escalated_reason')) {
      emailsCol.fields.add(new TextField({ name: 'escalated_reason' }))
    }

    if (!emailsCol.fields.getByName('inbox_address')) {
      emailsCol.fields.add(new TextField({ name: 'inbox_address' }))
    }

    app.save(emailsCol)

    // 2. Garantir índice em status e sla_deadline
    try {
      emailsCol.addIndex('idx_cte_status_deadline', false, 'status, sla_deadline', '')
      app.save(emailsCol)
    } catch (_) {}

    // 3. Atualizar/Distribuir os e-mails demo existentes entre caixas de núcleos e equipes
    // Configurando sla_deadline e incluindo pelo menos um item estourado/escalado para testes
    try {
      const now = new Date()
      const records = app.findRecordsByFilter('control_tower_emails', '', '-created', 50, 0)

      // Caixas de e-mail mapeadas por núcleo:
      const inboxMap = {
        SAO: 'atendimento.sao@rexturadvance.com.br',
        SPI: 'atendimento.spi@rexturadvance.com.br',
        SUL: 'atendimento.sul@rexturadvance.com.br',
        BR1: 'atendimento.br1@rexturadvance.com.br',
        BR2: 'atendimento.br2@rexturadvance.com.br',
        LOT: 'atendimento.lot@rexturadvance.com.br',
        Concierge: 'concierge@rexturadvance.com.br',
        Exclusivo: 'exclusivo@rexturadvance.com.br',
      }

      if (records && records.length > 0) {
        for (let i = 0; i < records.length; i++) {
          const r = records[i]
          let grp = r.getString('service_group')
          if (!grp) {
            grp = i % 2 === 0 ? 'SAO' : 'SPI'
            r.set('service_group', grp)
          }
          r.set(
            'inbox_address',
            inboxMap[grp] || `atendimento.${grp.toLowerCase()}@rexturadvance.com.br`,
          )

          // Caso demo 1: Item P1 de alta gravidade já escalado/estourado (SAO - Internacional)
          if (i === 0) {
            r.set('service_group', 'SAO')
            r.set('team', 'Internacional')
            r.set('inbox_address', inboxMap['SAO'])
            // Deadline estourado há 1 hora
            const pastDeadline = new Date(now.getTime() - 3600000).toISOString()
            r.set('sla_deadline', pastDeadline)
            r.set('status', 'Escalado')
            r.set('escalated_at', pastDeadline)
            r.set('escalation_alert_sent', true)
            r.set('escalated_reason', 'SLA estourado (prazo de 2h úteis ultrapassado)')
          } else if (i === 1) {
            // Caso demo 2: SUL - Nacional, quase vencendo (30 min restantes)
            r.set('service_group', 'SUL')
            r.set('team', 'Nacional')
            r.set('inbox_address', inboxMap['SUL'])
            const soonDeadline = new Date(now.getTime() + 1800000).toISOString()
            r.set('sla_deadline', soonDeadline)
            r.set('status', 'Em tratamento')
          } else if (i === 2) {
            // Caso demo 3: SPI - Nacional, com tempo confortável
            r.set('service_group', 'SPI')
            r.set('team', 'Nacional')
            r.set('inbox_address', inboxMap['SPI'])
            const okDeadline = new Date(now.getTime() + 4 * 3600000).toISOString()
            r.set('sla_deadline', okDeadline)
            r.set('status', 'Novo')
          } else if (i === 3) {
            // Caso demo 4: BR1 - Nacional, vencido há 2h e escalado
            r.set('service_group', 'BR1')
            r.set('team', 'Nacional')
            r.set('inbox_address', inboxMap['BR1'])
            const pastDeadline2 = new Date(now.getTime() - 2 * 3600000).toISOString()
            r.set('sla_deadline', pastDeadline2)
            r.set('status', 'Escalado')
            r.set('escalated_at', pastDeadline2)
            r.set('escalation_alert_sent', true)
            r.set('escalated_reason', 'SLA P3 estourado (prazo de 8h úteis ultrapassado)')
          }
          app.save(r)
        }
      }
    } catch (_) {}
  },
  (app) => {
    try {
      const emailsCol = app.findCollectionByNameOrId('control_tower_emails')
      const f1 = emailsCol.fields.getByName('escalated_at')
      if (f1) emailsCol.fields.remove(f1)
      const f2 = emailsCol.fields.getByName('escalation_alert_sent')
      if (f2) emailsCol.fields.remove(f2)
      const f3 = emailsCol.fields.getByName('escalated_reason')
      if (f3) emailsCol.fields.remove(f3)
      const f4 = emailsCol.fields.getByName('inbox_address')
      if (f4) emailsCol.fields.remove(f4)
      app.save(emailsCol)
    } catch (_) {}
  },
)
