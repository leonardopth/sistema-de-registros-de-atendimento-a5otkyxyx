onRecordDeleteRequest((e) => {
  var userId = e.auth && e.auth.id ? e.auth.id : ''
  var recordId = e.record.id
  var clientName = e.record.getString('name')

  e.next()

  try {
    var auditCol = $app.findCollectionByNameOrId('audit_log')
    var entry = new Record(auditCol)
    if (userId) entry.set('user', userId)
    entry.set('action', 'excluiu cliente')
    entry.set('entity', 'clients')
    entry.set('entity_id', recordId || '')
    entry.set(
      'details',
      JSON.stringify({
        client_name: clientName,
        timestamp: new Date().toISOString(),
      }),
    )
    $app.save(entry)
  } catch (err) {
    $app.logger().error('audit_client_delete failed', 'error', String(err))
  }
}, 'clients')
