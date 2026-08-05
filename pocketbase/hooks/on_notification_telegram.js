onRecordAfterCreateSuccess((e) => {
  var notifType = e.record.getString('type')
  if (notifType !== 'warning' && notifType !== 'error' && notifType !== 'alert') {
    return e.next()
  }

  var token = $secrets.get('TELEGRAM_BOT_TOKEN')
  if (!token) {
    return e.next()
  }

  var userId = e.record.getString('user_id')
  var title = e.record.getString('title')
  var message = e.record.getString('message')

  try {
    var user = $app.findRecordById('users', userId)
    var telegramId = user.getString('telegram_id')
    var telegramAlerts = user.get('telegram_alerts')
    if (!telegramId || !telegramAlerts) {
      return e.next()
    }

    var text = '\u{1F6A8} <b>' + title + '</b>\n\n' + message
    $http.send({
      url: 'https://api.telegram.org/bot' + token + '/sendMessage',
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({ chat_id: telegramId, text: text, parse_mode: 'HTML' }),
      timeout: 10,
    })
  } catch (err) {
    $app.logger().error('Telegram alert failed', 'error', String(err), 'userId', userId)
  }

  return e.next()
}, 'notifications')
