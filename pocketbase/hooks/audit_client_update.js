onRecordUpdateRequest((e) => {
  var userId = e.auth && e.auth.id ? e.auth.id : ''
  var recordId = e.record.id
  var clientName = e.record.getString('name')
  var oldBlocked = e.record.original().getBool('blocked')
  var newBlocked = e.record.getBool('blocked')
  var blockReason = e.record.getString('block_reason')

  e.next()

  if (oldBlocked !== newBlocked) {
    try {
      var auditCol = $app.findCollectionByNameOrId('audit_log')
      var entry = new Record(auditCol)
      if (userId) entry.set('user', userId)
      entry.set('action', newBlocked ? 'bloqueou cliente' : 'desbloqueou cliente')
      entry.set('entity', 'clients')
      entry.set('entity_id', recordId || '')
      entry.set(
        'details',
        JSON.stringify({
          client_name: clientName,
          block_reason: blockReason,
          timestamp: new Date().toISOString(),
        }),
      )
      $app.save(entry)
    } catch (err) {
      $app.logger().error('audit_client_update failed', 'error', String(err))
    }
  }
}, 'clients')
