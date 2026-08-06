onRecordDeleteRequest((e) => {
  var userId = e.auth && e.auth.id ? e.auth.id : ''
  var shareId = e.record.id
  var serviceRecord = e.record.getString('service_record')
  var sharedUser = e.record.getString('user')

  e.next()

  try {
    var auditCol = $app.findCollectionByNameOrId('audit_log')
    var entry = new Record(auditCol)
    if (userId) entry.set('user', userId)
    entry.set('action', 'revogou compartilhamento')
    entry.set('entity', 'service_record_shares')
    entry.set('entity_id', shareId || '')
    entry.set(
      'details',
      JSON.stringify({
        service_record: serviceRecord,
        shared_user: sharedUser,
        timestamp: new Date().toISOString(),
      }),
    )
    $app.save(entry)
  } catch (err) {
    $app.logger().error('audit_share_revoked failed', 'error', String(err))
  }
}, 'service_record_shares')
