onRecordListRequest((e) => {
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
  const records = e.records || []
  for (let i = 0; i < records.length; i++) {
    const rec = records[i]
    const recId = rec.id
    const recRole = rec.getString('role')
    if (recId !== currentUserId && recRole !== 'Master') {
      rec.setEmail('')
    }
  }
}, 'users')
