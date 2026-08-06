onRecordViewRequest((e) => {
  var authId = e.auth ? e.auth.id : ''
  if (!authId) {
    e.next()
    return
  }

  if (e.hasSuperuserAuth && e.hasSuperuserAuth()) {
    e.next()
    return
  }

  var authRole = ''
  try {
    authRole = e.auth.getString('role')
  } catch (_) {}

  if (authRole === 'Master') {
    e.next()
    return
  }

  var record = e.record
  if (!record) {
    e.next()
    return
  }

  var isOwn = record.id === authId
  var recordRole = ''
  try {
    recordRole = record.getString('role')
  } catch (_) {}
  var isMasterRecord = recordRole === 'Master'
  if (!isOwn && !isMasterRecord) {
    try {
      record.set('email', '')
    } catch (_) {}
  }
  e.next()
}, 'users')
