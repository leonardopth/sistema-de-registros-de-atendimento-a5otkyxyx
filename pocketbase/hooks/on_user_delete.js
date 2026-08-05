onRecordDeleteRequest((e) => {
  var userId = e.record.id
  var masterId = e.auth ? e.auth.id : ''

  if (!masterId) {
    e.next()
    return
  }

  var filter = ''
  var records = []
  var i = 0

  try {
    filter = 'user_id = "' + userId + '"'
    records = $app.findRecordsByFilter('service_records', filter, '', 0, 0)
    for (i = 0; i < records.length; i++) {
      records[i].set('user_id', masterId)
      $app.saveNoValidate(records[i])
    }
  } catch (err) {
    $app
      .logger()
      .error('on_user_delete: reassign service_records user_id failed', 'error', String(err))
  }

  try {
    filter = 'assigned_user = "' + userId + '"'
    records = $app.findRecordsByFilter('service_records', filter, '', 0, 0)
    for (i = 0; i < records.length; i++) {
      records[i].set('assigned_user', masterId)
      $app.saveNoValidate(records[i])
    }
  } catch (err) {
    $app
      .logger()
      .error('on_user_delete: reassign service_records assigned_user failed', 'error', String(err))
  }

  try {
    filter = 'user_id = "' + userId + '"'
    records = $app.findRecordsByFilter('feedback', filter, '', 0, 0)
    for (i = 0; i < records.length; i++) {
      records[i].set('user_id', masterId)
      $app.saveNoValidate(records[i])
    }
  } catch (err) {
    $app.logger().error('on_user_delete: reassign feedback failed', 'error', String(err))
  }

  try {
    filter = 'created_by = "' + userId + '"'
    records = $app.findRecordsByFilter('trainings', filter, '', 0, 0)
    for (i = 0; i < records.length; i++) {
      records[i].set('created_by', masterId)
      $app.saveNoValidate(records[i])
    }
  } catch (err) {
    $app.logger().error('on_user_delete: reassign trainings failed', 'error', String(err))
  }

  try {
    filter = 'user = "' + userId + '"'
    records = $app.findRecordsByFilter('service_record_history', filter, '', 0, 0)
    for (i = 0; i < records.length; i++) {
      records[i].set('user', masterId)
      $app.saveNoValidate(records[i])
    }
  } catch (err) {
    $app
      .logger()
      .error('on_user_delete: reassign service_record_history failed', 'error', String(err))
  }

  try {
    filter = 'user_id = "' + userId + '"'
    records = $app.findRecordsByFilter('notifications', filter, '', 0, 0)
    for (i = 0; i < records.length; i++) {
      $app.delete(records[i])
    }
  } catch (err) {
    $app.logger().error('on_user_delete: delete notifications failed', 'error', String(err))
  }

  try {
    filter = 'user_id = "' + userId + '"'
    records = $app.findRecordsByFilter('scheduled_reports', filter, '', 0, 0)
    for (i = 0; i < records.length; i++) {
      $app.delete(records[i])
    }
  } catch (err) {
    $app.logger().error('on_user_delete: delete scheduled_reports failed', 'error', String(err))
  }

  e.next()
}, 'users')
