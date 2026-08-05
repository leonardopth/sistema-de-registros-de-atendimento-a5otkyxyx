routerAdd(
  'POST',
  '/backend/v1/consultant-ai',
  (e) => {
    const body = e.requestInfo().body || {}
    const question = (body.question || '').trim()
    if (!question) return e.badRequestError('question is required')

    const userId = e.auth && e.auth.id
    if (!userId) return e.unauthorizedError('auth required')

    var context = ''
    try {
      var records = $app.findRecordsByFilter(
        'service_records',
        'assigned_user = {:userId} || user_id = {:userId}',
        '-created',
        15,
        0,
        { userId: userId },
      )
      context = records
        .map(function (r) {
          var company = r.getString('client_company') || 'N/A'
          var reason = r.getString('contact_reason') || 'N/A'
          var desc = r.getString('description') || ''
          return '- ' + company + ' | ' + reason + ' | ' + desc
        })
        .join('\n')
    } catch (err) {
      context = 'No recent records found.'
    }

    try {
      var reply = $ai.chat({
        model: 'fast',
        messages: [
          {
            role: 'system',
            content:
              'You are a helpful assistant for travel agency consultants. Answer questions based on the recent service records provided below. Be concise, practical, and answer in Portuguese (Brazil). If the question is about a specific agency, check the records. Recent records:\n' +
              context,
          },
          { role: 'user', content: question },
        ],
      })
      return e.json(200, { answer: reply.choices[0].message.content })
    } catch (err) {
      return e.json(503, { error: 'AI temporarily unavailable' })
    }
  },
  $apis.requireAuth(),
)
