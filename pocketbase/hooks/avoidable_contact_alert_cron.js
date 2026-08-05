cronAdd('0 7 * * *', function () {
  try {
    var clients = $app.findRecordsByFilter('clients', '', '', 0, 0)
    var now = new Date()
    var thirtyDaysAgo = new Date(now.getTime() - 30 * 86400000)
    var dateStr = thirtyDaysAgo.toISOString().replace('T', ' ').substring(0, 19)

    var masters = $app.findRecordsByFilter('users', "role = 'Master'", '', 0, 0)
    var notifCol = $app.findCollectionByNameOrId('notifications')

    for (var i = 0; i < clients.length; i++) {
      try {
        var client = clients[i]
        var threshold = client.get('avoidable_contact_threshold')
        if (!threshold || threshold < 1) threshold = 5

        var clientId = client.id
        var clientName = client.getString('name')

        var avoidableRecords = $app.findRecordsByFilter(
          'service_records',
          "avoidable_contact = true && client = '" + clientId + "' && created >= '" + dateStr + "'",
          '-created',
          0,
          0,
        )

        var count = avoidableRecords.length
        if (count < threshold) continue

        var existingAlerts = $app.findRecordsByFilter(
          'notifications',
          "type = 'alert' && link ~ '" + clientId + "'",
          '-created',
          1,
          0,
        )

        if (existingAlerts.length > 0) {
          var existingLink = existingAlerts[0].getString('link') || ''
          var match = existingLink.match(/count=(\d+)/)
          if (match) {
            var existingCount = parseInt(match[1], 10)
            if (existingCount >= count) continue
          }
        }

        var message =
          'Cliente ' +
          clientName +
          ' ultrapassou o limite de contatos evitaveis: ' +
          count +
          ' contato(s) nos ultimos 30 dias (limite: ' +
          threshold +
          ').'
        var link = '/clientes?clientId=' + clientId + '&count=' + count

        var execRelId = client.getString('account_executive_rel')
        if (execRelId) {
          try {
            var exec = $app.findRecordById('account_executives', execRelId)
            var execEmail = exec.getString('email')
            if (execEmail) {
              try {
                var execUser = $app.findAuthRecordByEmail('users', execEmail)
                var execNotif = new Record(notifCol)
                execNotif.set('user_id', execUser.id)
                execNotif.set('title', 'Alerta de contatos evitaveis')
                execNotif.set('message', message)
                execNotif.set('type', 'alert')
                execNotif.set('read', false)
                execNotif.set('link', link)
                $app.save(execNotif)
              } catch (e) {}
            }
          } catch (e) {}
        }

        for (var j = 0; j < masters.length; j++) {
          var masterNotif = new Record(notifCol)
          masterNotif.set('user_id', masters[j].id)
          masterNotif.set('title', 'Alerta de contatos evitaveis')
          masterNotif.set('message', message)
          masterNotif.set('type', 'alert')
          masterNotif.set('read', false)
          masterNotif.set('link', link)
          $app.save(masterNotif)
        }
      } catch (clientErr) {
        $app
          .logger()
          .error(
            'Failed to process client alert',
            'error',
            String(clientErr),
            'clientId',
            clients[i].id,
          )
      }
    }
  } catch (err) {
    $app.logger().error('Avoidable contact alert cron failed', 'error', String(err))
  }
})
