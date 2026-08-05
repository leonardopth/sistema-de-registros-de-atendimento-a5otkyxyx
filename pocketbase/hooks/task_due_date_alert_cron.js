cronAdd('0 6 * * *', function () {
  try {
    var records = $app.findRecordsByFilter('service_records', '', '-created', 0, 0)
    var now = new Date()
    var twentyFourHoursFromNow = new Date(now.getTime() + 24 * 60 * 60 * 1000)
    var notifCol = $app.findCollectionByNameOrId('notifications')

    for (var i = 0; i < records.length; i++) {
      var record = records[i]
      var tasksRaw = record.getString('tasks')
      if (!tasksRaw) continue

      var tasks
      try {
        tasks = JSON.parse(tasksRaw)
      } catch (e) {
        continue
      }

      if (!Array.isArray(tasks)) continue

      var recordId = record.id
      var clientName =
        record.getString('client_name') || record.getString('client_company') || 'Cliente'
      var assignedUser = record.getString('assigned_user') || record.getString('user_id') || ''

      for (var j = 0; j < tasks.length; j++) {
        var task = tasks[j]
        if (!task || task.done) continue
        if (!task.due_date) continue

        var dueDate = new Date(task.due_date)
        if (isNaN(dueDate.getTime())) continue

        var isNear = dueDate <= twentyFourHoursFromNow && dueDate >= now
        var isPast = dueDate < now

        if (!isNear && !isPast) continue

        var taskKey = 'ta=' + recordId + '_' + j
        var responsibleUserId = task.responsible || assignedUser
        if (!responsibleUserId) continue

        var existingAlerts
        try {
          existingAlerts = $app.findRecordsByFilter(
            'notifications',
            "type = 'alert' && resolved != true && link ~ '" + taskKey + "'",
            '-created',
            1,
            0,
          )
        } catch (e) {
          continue
        }
        if (existingAlerts.length > 0) continue

        var statusText = isPast ? 'atrasada' : 'pr\u00f3xima do vencimento'
        var title = 'Tarefa ' + statusText

        var datePart = task.due_date.substring(0, 10)
        var dateParts = datePart.split('-')
        var formattedDate =
          dateParts.length === 3
            ? dateParts[2] + '/' + dateParts[1] + '/' + dateParts[0]
            : task.due_date

        var message =
          'Cliente: ' +
          clientName +
          '\nTarefa: ' +
          (task.title || 'Sem descri\u00e7\u00e3o') +
          '\nPrazo: ' +
          formattedDate

        var link = '/atendimentos?recordId=' + recordId + '&' + taskKey

        try {
          var notif = new Record(notifCol)
          notif.set('user_id', responsibleUserId)
          notif.set('title', title)
          notif.set('message', message)
          notif.set('type', 'alert')
          notif.set('read', false)
          notif.set('link', link)
          $app.save(notif)
        } catch (e) {
          $app
            .logger()
            .error('Failed to create task due date alert', 'error', String(e), 'recordId', recordId)
        }
      }
    }
  } catch (err) {
    $app.logger().error('Task due date alert cron failed', 'error', String(err))
  }
})
