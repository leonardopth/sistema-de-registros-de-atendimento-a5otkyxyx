onRecordUpdateRequest((e) => {
  var userId = e.auth && e.auth.id ? e.auth.id : ''
  var targetUserId = e.record.id

  var oldMasterAccess = e.record.original().getBool('master_access')
  var newMasterAccess = e.record.getBool('master_access')
  var oldApproval = e.record.original().getString('approval_status')
  var newApproval = e.record.getString('approval_status')

  e.next()

  try {
    var auditCol = $app.findCollectionByNameOrId('audit_log')

    if (newMasterAccess !== oldMasterAccess) {
      var masterEntry = new Record(auditCol)
      if (userId) masterEntry.set('user', userId)
      masterEntry.set('action', newMasterAccess ? 'concedeu master' : 'revogou master')
      masterEntry.set('entity', 'master_access')
      masterEntry.set('entity_id', targetUserId || '')
      masterEntry.set(
        'details',
        JSON.stringify({
          target_user: e.record.getString('name'),
          old_value: oldMasterAccess,
          new_value: newMasterAccess,
          timestamp: new Date().toISOString(),
        }),
      )
      $app.save(masterEntry)
    }

    if (
      newApproval !== oldApproval &&
      (newApproval === 'Aprovado' || newApproval === 'Rejeitado')
    ) {
      var approvalEntry = new Record(auditCol)
      if (userId) approvalEntry.set('user', userId)
      approvalEntry.set(
        'action',
        newApproval === 'Aprovado' ? 'aprovou usuário' : 'rejeitou usuário',
      )
      approvalEntry.set('entity', 'users')
      approvalEntry.set('entity_id', targetUserId || '')
      approvalEntry.set(
        'details',
        JSON.stringify({
          target_user: e.record.getString('name'),
          old_status: oldApproval,
          new_status: newApproval,
          timestamp: new Date().toISOString(),
        }),
      )
      $app.save(approvalEntry)
    }
  } catch (err) {
    $app.logger().error('audit_user_changes failed', 'error', String(err))
  }
}, 'users')
