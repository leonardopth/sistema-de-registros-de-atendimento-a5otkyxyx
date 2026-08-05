onRecordUpdateRequest((e) => {
  var newStatus = e.record.getString('approval_status')
  var oldStatus = e.record.original().getString('approval_status')

  if (newStatus !== oldStatus && (newStatus === 'Aprovado' || newStatus === 'Rejeitado')) {
    var authName = e.auth ? e.auth.getString('name') : 'Sistema'
    var authId = e.auth ? e.auth.id : ''
    e.record.set('approved_by', authName)
    e.record.set('approved_by_id', authId)
    e.record.set('approved_at', new Date().toISOString())
  }

  e.next()
}, 'users')
