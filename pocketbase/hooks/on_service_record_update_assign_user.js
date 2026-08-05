onRecordUpdateRequest((e) => {
  if (e.auth && e.auth.id) {
    e.record.set('assigned_user', e.auth.id)
  }
  return e.next()
}, 'service_records')
