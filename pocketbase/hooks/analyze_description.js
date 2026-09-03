routerAdd(
  'POST',
  '/backend/v1/analyze-description',
  (e) => {
    var body = e.requestInfo().body || {}
    var description = (body.description || '').trim()
    if (!description) return e.badRequestError('description is required')

    var contactReasons = [
      'Bagagem',
      'Assento',
      'Cálculo de Reemissão',
      'Reembolso',
      'Cotação',
      'Reserva',
      'Cancelamento',
      'Regras Tarifárias',
      'Erro RF',
      'Remarcação',
      'Check-in',
      'Alteração de Voo',
      'Reclamação',
      'Dúvida Geral',
      'Outros',
    ]
    var avoidableReasons = ['Dispon\u00edvel no RF', 'Fora do Escopo', 'Erro RF', 'Outros']
    var channels = ['Telefone', 'e-mail', 'whatsapp', 'comercial', 'outros']
    var travelTypes = ['Nacional', 'Internacional']
    var priorities = ['Baixa', 'M\u00e9dia', 'Alta']

    try {
      var reply = $ai.chat({
        model: 'fast',
        messages: [
          {
            role: 'system',
            content:
              'You are a travel agency customer service analyzer. Analyze the service description and extract/suggest the following fields:\n' +
              '1) contact_reason — one of: ' +
              contactReasons.join(', ') +
              '\n' +
              '2) avoidable_contact — boolean (true if the contact was avoidable, e.g. information available in the reservation system, out of scope, or system error)\n' +
              '3) avoidable_contact_reason — one of: ' +
              avoidableReasons.join(', ') +
              ' (only if avoidable_contact is true)\n' +
              '4) channel — one of: ' +
              channels.join(', ') +
              ' (the communication channel used by the customer)\n' +
              '5) travel_type — one of: ' +
              travelTypes.join(', ') +
              ' (domestic or international travel)\n' +
              '6) agency_name — the travel agency or COMPANY/ORGANIZATION name mentioned in the description. Look for organization names such as "agência CVC", "empresa Decolar", "Flytour", "BTM". This is the AGENCY/COMPANY name, NOT a person name. Extract just the name without the word "agência" or "empresa". (empty string if not mentioned)\n' +
              '7) agent_name — the name of the PERSON who contacted or is referenced. Look for person names such as "João", "Maria Silva", "o senhor Carlos", "falamos com Ana". This is a PERSON name, NOT the company/agency name. (empty string if not mentioned)\n' +
              '8) client_email — any email address mentioned (empty string if not mentioned)\n' +
              '9) client_phone — any phone number mentioned (empty string if not mentioned)\n' +
              '10) priority — one of: ' +
              priorities.join(', ') +
              ' (assess urgency based on the description)\n' +
              '11) description — a clean, organized version of the description (improve readability, fix typos, but preserve all information and language)\n' +
              'Respond ONLY with JSON, no markdown, no explanation:\n' +
              '{"contact_reason":"","avoidable_contact":false,"avoidable_contact_reason":"","channel":"","travel_type":"","agency_name":"","agent_name":"","client_email":"","client_phone":"","priority":"","description":""}',
          },
          { role: 'user', content: description },
        ],
      })

      var text = reply.choices[0].message.content
      var parsed
      try {
        var jsonMatch = text.match(/\{[\s\S]*\}/)
        parsed = JSON.parse(jsonMatch ? jsonMatch[0] : text)
      } catch (err) {
        return e.json(200, {
          contact_reason: 'outros',
          avoidable_contact: false,
          avoidable_contact_reason: '',
          channel: '',
          travel_type: '',
          agency_name: '',
          agent_name: '',
          client_email: '',
          client_phone: '',
          priority: '',
          description: '',
        })
      }

      // Mapeamento de normalização tolerante
      var reasonNormMap = {
        bagagem: 'Bagagem',
        assento: 'Assento',
        'calculo de reemissao': 'Cálculo de Reemissão',
        'calculo reemissao': 'Cálculo de Reemissão',
        reemissao: 'Cálculo de Reemissão',
        reembolso: 'Reembolso',
        cotacao: 'Cotação',
        cotação: 'Cotação',
        orcamento: 'Cotação',
        reserva: 'Reserva',
        cancelamento: 'Cancelamento',
        'regras tarifarias': 'Regras Tarifárias',
        'regras tarifárias': 'Regras Tarifárias',
        'erro rf': 'Erro RF',
        remarcacao: 'Remarcação',
        remarcação: 'Remarcação',
        'check-in': 'Check-in',
        checkin: 'Check-in',
        'alteracao de voo': 'Alteração de Voo',
        'alteração de voo': 'Alteração de Voo',
        reclamacao: 'Reclamação',
        reclamação: 'Reclamação',
        'duvida geral': 'Dúvida Geral',
        duvida: 'Dúvida Geral',
        dúvida: 'Dúvida Geral',
        outros: 'Outros',
      }
      var cleanReason = (parsed.contact_reason || '').toLowerCase().trim()
      if (reasonNormMap[cleanReason]) {
        parsed.contact_reason = reasonNormMap[cleanReason]
      } else if (!contactReasons.includes(parsed.contact_reason)) {
        parsed.contact_reason = 'Outros'
      }
      if (typeof parsed.avoidable_contact !== 'boolean') parsed.avoidable_contact = false
      if (parsed.avoidable_contact) {
        if (!avoidableReasons.includes(parsed.avoidable_contact_reason)) {
          parsed.avoidable_contact_reason = 'Outros'
        }
      } else {
        parsed.avoidable_contact_reason = ''
      }
      if (!channels.includes(parsed.channel)) parsed.channel = ''
      if (!travelTypes.includes(parsed.travel_type)) parsed.travel_type = ''
      if (!priorities.includes(parsed.priority)) parsed.priority = ''
      if (typeof parsed.agency_name !== 'string') parsed.agency_name = ''
      if (typeof parsed.agent_name !== 'string') parsed.agent_name = ''
      if (typeof parsed.client_email !== 'string') parsed.client_email = ''
      if (typeof parsed.client_phone !== 'string') parsed.client_phone = ''
      if (typeof parsed.description !== 'string') parsed.description = ''

      return e.json(200, parsed)
    } catch (err) {
      return e.json(503, { error: 'AI temporarily unavailable' })
    }
  },
  $apis.requireAuth(),
)
