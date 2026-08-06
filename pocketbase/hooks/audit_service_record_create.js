onRecordCreateRequest((e) => {
  var userId = e.auth && e.auth.id ? e.auth.id : ''

  e.next()

  try {
    var auditCol = $app.findCollectionByNameOrId('audit_log')
    var entry = new Record(auditCol)
    if (userId) entry.set('user', userId)
    entry.set('action', 'criou atendimento')
    entry.set('entity', 'service_records')
    entry.set('entity_id', e.record.id || '')
    entry.set(
      'details',
      JSON.stringify({
        client_name: e.record.getString('client_name'),
        contact_reason: e.record.getString('contact_reason'),
        priority: e.record.getString('priority'),
        status: e.record.getString('status'),
        channel: e.record.getString('channel'),
        timestamp: new Date().toISOString(),
      }),
    )
    $app.save(entry)
  } catch (err) {
    $app.logger().error('audit_service_record_create failed', 'error', String(err))
  }
}, 'service_records')
