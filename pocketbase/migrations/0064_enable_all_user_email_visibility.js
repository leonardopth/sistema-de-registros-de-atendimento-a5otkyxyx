migrate(
  (app) => {
    try {
      const records = app.findRecordsByFilter('users', '', '', 0, 0)
      for (var i = 0; i < records.length; i++) {
        var record = records[i]
        record.set('emailVisibility', true)
        app.save(record)
      }
    } catch (err) {
      console.log('Error updating users emailVisibility:', err)
    }
  },
  (app) => {},
)
