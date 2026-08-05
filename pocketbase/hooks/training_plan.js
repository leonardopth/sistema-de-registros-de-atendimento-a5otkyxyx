routerAdd(
  'POST',
  '/backend/v1/training-plan',
  (e) => {
    const body = e.requestInfo().body || {}
    const company = (body.company || '').trim()
    if (!company) return e.badRequestError('company is required')

    var topReasons = body.topReasons || []
    var avoidableRate = body.avoidableRate || 0
    var totalRecords = body.totalRecords || 0

    var reasonsText = topReasons
      .map(function (r) {
        return r.reason + ' (' + r.count + ' atendimento(s))'
      })
      .join(', ')

    try {
      var reply = $ai.chat({
        model: 'fast',
        messages: [
          {
            role: 'system',
            content:
              'You are a travel agency training consultant. Generate a practical training plan in Portuguese (Brazil) for the agency based on their service data. The plan should be concise, actionable, and focused on reducing avoidable contacts. Format as bullet points with clear sections: 1) Topicos de Treinamento, 2) Acoes Imediatas, 3) Metricas de Acompanhamento. Max 200 words.',
          },
          {
            role: 'user',
            content:
              'Agencia: ' +
              company +
              '\nTotal de atendimentos: ' +
              totalRecords +
              '\nTaxa de evitaveis: ' +
              avoidableRate +
              '%\nPrincipais motivos: ' +
              reasonsText,
          },
        ],
      })
      return e.json(200, { plan: reply.choices[0].message.content })
    } catch (err) {
      return e.json(503, { error: 'AI temporarily unavailable' })
    }
  },
  $apis.requireAuth(),
)
