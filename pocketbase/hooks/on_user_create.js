onRecordCreate((e) => {
  e.record.set('approval_status', 'Pendente')
  if (e.record.getString('role') === 'Master') {
    e.record.set('role', 'Consultores')
  }
  e.next()
}, 'users')
