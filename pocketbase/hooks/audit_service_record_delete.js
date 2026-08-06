onRecordDeleteRequest((e) => {
  var userId = e.auth && e.auth.id ? e.auth.id : ''
  var recordId = e.record.id
  var clientName = e.record.getString('client_name')
  var contactReason = e.record.getString('contact_reason')

  e.next()

  try {
    var auditCol = $app.findCollectionByNameOrId('audit_log')
    var entry = new Record(auditCol)
    if (userId) entry.set('user', userId)
    entry.set('action', 'excluiu atendimento')
    entry.set('entity', 'service_records')
    entry.set('entity_id', recordId || '')
    entry.set(
      'details',
      JSON.stringify({
        client_name: clientName,
        contact_reason: contactReason,
        timestamp: new Date().toISOString(),
      }),
    )
    $app.save(entry)
  } catch (err) {
    $app.logger().error('audit_service_record_delete failed', 'error', String(err))
  }
}, 'service_records')
