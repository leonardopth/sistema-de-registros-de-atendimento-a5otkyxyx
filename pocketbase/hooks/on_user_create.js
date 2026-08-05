onRecordCreate((e) => {
  // Only default approval_status to 'Pendente' when no value was explicitly
  // provided by the creation source (e.g. migration/seed sets 'Aprovado').
  if (!e.record.getString('approval_status')) {
    e.record.set('approval_status', 'Pendente')
  }

  // Only strip the 'Master' role when the record is NOT pre-approved.
  // Migrations/seeds create Master accounts with approval_status 'Aprovado';
  // form-based signups go through the normal pending-approval flow.
  if (
    e.record.getString('role') === 'Master' &&
    e.record.getString('approval_status') !== 'Aprovado'
  ) {
    e.record.set('role', 'Consultores')
  }

  e.next()
}, 'users')
