onRecordViewRequest((e) => {
  e.next()

  if (e.hasSuperuserAuth()) {
    return
  }

  const authUser = e.auth
  if (!authUser) {
    return
  }

  const role = authUser.getString('role')
  if (role === 'Master') {
    return
  }

  const currentUserId = authUser.id
  if (e.record) {
    const rec = e.record
    if (rec.id !== currentUserId && rec.getString('role') !== 'Master') {
      rec.setEmail('')
    }
  }
}, 'users')
