onRecordAfterCreateSuccess((e) => {
  var record = e.record
  var userId = record.getString('user')
  var sharedById = record.getString('shared_by')
  var permission = record.getString('permission')
  var serviceRecordId = record.getString('service_record')

  try {
    var notifCol = $app.findCollectionByNameOrId('notifications')
    var notif = new Record(notifCol)
    notif.set('user_id', userId)
    notif.set('title', 'Atendimento compartilhado com você')
    notif.set('message', 'Um atendimento foi compartilhado com você com permissão de ' + permission)
    notif.set('type', 'info')
    notif.set('read', false)
    notif.set('link', '/atendimentos')
    $app.save(notif)
  } catch (err) {
    $app.logger().error('Failed to create share notification', 'error', String(err))
  }

  try {
    var histCol = $app.findCollectionByNameOrId('service_record_history')
    var hist = new Record(histCol)
    hist.set('service_record', serviceRecordId)
    hist.set('user', sharedById)
    hist.set('field', 'share')
    hist.set('new_value', 'Compartilhado com permissão: ' + permission)
    $app.saveNoValidate(hist)
  } catch (err) {
    $app.logger().error('Failed to create share history', 'error', String(err))
  }

  return e.next()
}, 'service_record_shares')

onRecordAfterUpdateSuccess((e) => {
  var record = e.record
  var permission = record.getString('permission')
  var oldPermission = record.original().getString('permission')
  if (permission === oldPermission) return e.next()

  var userId = record.getString('user')
  var sharedById = record.getString('shared_by')
  var serviceRecordId = record.getString('service_record')

  try {
    var notifCol = $app.findCollectionByNameOrId('notifications')
    var notif = new Record(notifCol)
    notif.set('user_id', userId)
    notif.set('title', 'Permissão de compartilhamento alterada')
    notif.set('message', 'Sua permissão no atendimento foi alterada para: ' + permission)
    notif.set('type', 'info')
    notif.set('read', false)
    notif.set('link', '/atendimentos')
    $app.save(notif)
  } catch (err) {
    $app.logger().error('Failed to create permission change notification', 'error', String(err))
  }

  try {
    var histCol = $app.findCollectionByNameOrId('service_record_history')
    var hist = new Record(histCol)
    hist.set('service_record', serviceRecordId)
    hist.set('user', sharedById)
    hist.set('field', 'share')
    hist.set('old_value', 'Permissão anterior: ' + oldPermission)
    hist.set('new_value', 'Permissão alterada para: ' + permission)
    $app.saveNoValidate(hist)
  } catch (err) {
    $app.logger().error('Failed to create permission change history', 'error', String(err))
  }

  return e.next()
}, 'service_record_shares')

onRecordAfterDeleteSuccess((e) => {
  var record = e.record
  var userId = record.getString('user')
  var sharedById = record.getString('shared_by')
  var serviceRecordId = record.getString('service_record')

  try {
    var notifCol = $app.findCollectionByNameOrId('notifications')
    var notif = new Record(notifCol)
    notif.set('user_id', userId)
    notif.set('title', 'Compartilhamento revogado')
    notif.set('message', 'Seu acesso a um atendimento foi revogado')
    notif.set('type', 'warning')
    notif.set('read', false)
    notif.set('link', '/atendimentos')
    $app.save(notif)
  } catch (err) {
    $app.logger().error('Failed to create revoke notification', 'error', String(err))
  }

  try {
    var histCol = $app.findCollectionByNameOrId('service_record_history')
    var hist = new Record(histCol)
    hist.set('service_record', serviceRecordId)
    hist.set('user', sharedById)
    hist.set('field', 'share')
    hist.set('old_value', 'Compartilhamento revogado')
    $app.saveNoValidate(hist)
  } catch (err) {
    $app.logger().error('Failed to create revoke history', 'error', String(err))
  }

  return e.next()
}, 'service_record_shares')
