onRecordUpdateRequest((e) => {
  var recordId = e.record.id
  var userId = e.auth && e.auth.id ? e.auth.id : ''

  var oldRecord = null
  try {
    oldRecord = $app.findRecordById('service_records', recordId)
  } catch (err) {
    return e.next()
  }

  e.next()

  var TRACKED_FIELDS = [
    'description',
    'status',
    'priority',
    'contact_reason',
    'channel',
    'client',
    'account_executive',
    'assigned_agent',
    'assigned_user',
    'avoidable_contact',
    'avoidable_contact_reason',
    'avoidable_contact_explanation',
    'tasks',
    'start_time',
    'end_time',
    'duration',
    'reopen_justification',
  ]

  var RELATION_MAP = {
    client: 'clients',
    account_executive: 'account_executives',
    assigned_user: 'users',
  }

  function formatValue(record, field) {
    if (RELATION_MAP[field]) {
      var relId = record.getString(field)
      if (!relId) return ''
      try {
        var relRecord = $app.findRecordById(RELATION_MAP[field], relId)
        return relRecord.getString('name') || relId
      } catch (err) {
        return relId
      }
    }

    if (field === 'avoidable_contact') {
      return record.getBool(field) ? 'Sim' : 'Não'
    }

    if (field === 'tasks') {
      var tasksVal = record.getString(field)
      return tasksVal || ''
    }

    if (field === 'duration') {
      var dur = record.get(field)
      if (dur === null || dur === undefined || dur === '') return ''
      return String(dur)
    }

    var val = record.getString(field)
    return val || ''
  }

  var oldReopenJust = oldRecord.getString('reopen_justification')
  var newReopenJust = e.record.getString('reopen_justification')
  var justification = ''
  if (newReopenJust && newReopenJust !== oldReopenJust) {
    justification = newReopenJust
  }

  var historyCol = null
  try {
    historyCol = $app.findCollectionByNameOrId('service_record_history')
  } catch (err) {
    return
  }

  for (var i = 0; i < TRACKED_FIELDS.length; i++) {
    var field = TRACKED_FIELDS[i]
    var oldVal = formatValue(oldRecord, field)
    var newVal = formatValue(e.record, field)

    if (oldVal !== newVal) {
      try {
        var entry = new Record(historyCol)
        entry.set('service_record', recordId)
        if (userId) {
          entry.set('user', userId)
        }
        entry.set('field', field)
        entry.set('old_value', oldVal)
        entry.set('new_value', newVal)
        entry.set('justification', justification)
        $app.save(entry)
      } catch (err) {
        $app.logger().error('Failed to create history entry', 'field', field, 'error', String(err))
      }
    }
  }
}, 'service_records')
