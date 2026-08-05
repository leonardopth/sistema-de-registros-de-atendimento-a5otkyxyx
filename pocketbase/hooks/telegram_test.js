routerAdd(
  'POST',
  '/backend/v1/telegram/test',
  (e) => {
    var token = $secrets.get('TELEGRAM_BOT_TOKEN')
    if (!token) {
      return e.json(400, {
        error:
          'TELEGRAM_BOT_TOKEN nao configurado. Adicione o token do seu bot nos secrets do Skip Cloud.',
      })
    }

    var userId = e.auth ? e.auth.id : ''
    if (!userId) {
      return e.unauthorizedError('auth required')
    }

    var user = $app.findRecordById('users', userId)
    var telegramId = user.getString('telegram_id')
    if (!telegramId) {
      return e.badRequestError(
        'Telegram ID nao configurado. Defina seu Telegram ID nas configuracoes.',
      )
    }

    var text =
      '\u2705 Teste de Telegram - Sistema de Registros de Atendimento\n\nSe voce recebeu esta mensagem, a integracao esta funcionando!'

    var res = $http.send({
      url: 'https://api.telegram.org/bot' + token + '/sendMessage',
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({ chat_id: telegramId, text: text, parse_mode: 'HTML' }),
      timeout: 10,
    })

    if (res.statusCode === 200) {
      return e.json(200, { success: true })
    }

    $app.logger().error('Telegram test failed', 'status', res.statusCode, 'body', res.body)
    return e.json(res.statusCode, { error: 'Erro na API do Telegram', details: res.json })
  },
  $apis.requireAuth(),
)
