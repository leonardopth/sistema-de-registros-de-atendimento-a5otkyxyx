onRecordUpdateRequest((e) => {
  var oldName = e.record.original().getString('name')
  var newName = e.record.getString('name')
  var oldCompany = e.record.original().getString('company')
  var newCompany = e.record.getString('company')
  var clientId = e.record.id

  e.next()

  if (oldName === newName && oldCompany === newCompany) return

  try {
    var filter = 'client = "' + clientId + '"'
    var records = $app.findRecordsByFilter('service_records', filter, '-created', 0, 0)
    for (var i = 0; i < records.length; i++) {
      var changed = false
      if (oldName !== newName) {
        records[i].set('client_name', newName)
        changed = true
      }
      if (oldCompany !== newCompany) {
        records[i].set('client_company', newCompany)
        changed = true
      }
      if (changed) {
        $app.saveNoValidate(records[i])
      }
    }
  } catch (err) {
    $app.logger().error('client name propagation failed', 'error', String(err))
  }
}, 'clients')
