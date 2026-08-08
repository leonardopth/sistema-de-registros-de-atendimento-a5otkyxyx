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

    try {
      var reply = $ai.chat({
        model: 'fast',
        messages: [
          {
            role: 'system',
            content:
              'You are a travel agency customer service analyzer. Analyze the service description and suggest: ' +
              '1) contact_reason from: ' +
              contactReasons.join(', ') +
              '. ' +
              '2) avoidable_contact (boolean). ' +
              '3) avoidable_contact_reason from: ' +
              avoidableReasons.join(', ') +
              ' (only if avoidable). ' +
              '4) channel from: ' +
              channels.join(', ') +
              ' (detect the communication channel used by the customer). ' +
              '5) travel_type from: ' +
              travelTypes.join(', ') +
              ' (detect if it is domestic or international travel). ' +
              'Respond ONLY with JSON: {"contact_reason":"...","avoidable_contact":true,"avoidable_contact_reason":"...","channel":"...","travel_type":"..."}',
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

      return e.json(200, parsed)
    } catch (err) {
      return e.json(503, { error: 'AI temporarily unavailable' })
    }
  },
  $apis.requireAuth(),
)
