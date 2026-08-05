migrate(
  (app) => {
    var clients = app.findRecordsByFilter('clients', "id != ''", '', 0, 0)
    for (var i = 0; i < clients.length; i++) {
      var c = clients[i]
      var execName = c.getString('account_executive')
      if (!execName || c.getString('account_executive_rel')) continue
      try {
        var exec = app.findFirstRecordByData('account_executives', 'name', execName)
        c.set('account_executive_rel', exec.id)
        app.save(c)
      } catch (_) {}
    }

    var records = app.findRecordsByFilter('service_records', "id != ''", '', 0, 0)
    for (var j = 0; j < records.length; j++) {
      var r = records[j]
      var changed = false

      if (!r.getString('client')) {
        var clientName = r.getString('client_name')
        if (clientName) {
          try {
            var client = app.findFirstRecordByData('clients', 'name', clientName)
            r.set('client', client.id)
            changed = true
          } catch (_) {}
        }
      }

      if (!r.getString('agent')) {
        var agentName = r.getString('assigned_agent')
        if (agentName) {
          try {
            var agent = app.findFirstRecordByData('agents', 'name', agentName)
            r.set('agent', agent.id)
            changed = true
          } catch (_) {}
        }
      }

      if (!r.getString('account_executive')) {
        var execName2 = r.getString('assigned_agent')
        if (execName2) {
          try {
            var exec2 = app.findFirstRecordByData('account_executives', 'name', execName2)
            r.set('account_executive', exec2.id)
            changed = true
          } catch (_) {}
        }
      }

      if (changed) app.save(r)
    }
  },
  (app) => {
    var records = app.findRecordsByFilter('service_records', "id != ''", '', 0, 0)
    for (var i = 0; i < records.length; i++) {
      records[i].set('account_executive', '')
      records[i].set('client', '')
      records[i].set('agent', '')
      app.save(records[i])
    }
    var clients = app.findRecordsByFilter('clients', "id != ''", '', 0, 0)
    for (var j = 0; j < clients.length; j++) {
      clients[j].set('account_executive_rel', '')
      app.save(clients[j])
    }
  },
)
