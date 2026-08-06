onRecordCreateRequest((e) => {
  var userId = e.auth && e.auth.id ? e.auth.id : ''

  e.next()

  try {
    var auditCol = $app.findCollectionByNameOrId('audit_log')
    var entry = new Record(auditCol)
    if (userId) entry.set('user', userId)
    entry.set('action', 'compartilhou atendimento')
    entry.set('entity', 'service_record_shares')
    entry.set('entity_id', e.record.id || '')
    entry.set(
      'details',
      JSON.stringify({
        service_record: e.record.getString('service_record'),
        shared_user: e.record.getString('user'),
        permission: e.record.getString('permission'),
        timestamp: new Date().toISOString(),
      }),
    )
    $app.save(entry)
  } catch (err) {
    $app.logger().error('audit_share_granted failed', 'error', String(err))
  }
}, 'service_record_shares')
