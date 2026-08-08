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
      'c\u00e1lculo reemiss\u00e3o',
      'reembolso',
      'cota\u00e7\u00e3o',
      'reserva',
      'cancelamento',
      'regras tarif\u00e1rias',
      'erro RF',
      'outros',
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
              '6) agency_name — the travel agency or company name mentioned (empty string if not mentioned)\n' +
              '7) agent_name — the name of the person/agent who contacted (empty string if not mentioned)\n' +
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

      if (!contactReasons.includes(parsed.contact_reason)) parsed.contact_reason = 'outros'
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
