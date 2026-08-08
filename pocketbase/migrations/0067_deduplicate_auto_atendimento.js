migrate(
  (app) => {
    var records = app.findRecordsByFilter(
      'account_executives',
      "name = 'Auto-Atendimento'",
      'created',
      100,
      0,
    )

    if (records.length <= 1) return

    var keepId = records[0].id

    for (var i = 1; i < records.length; i++) {
      var dupId = records[i].id

      app
        .db()
        .newQuery(
          'UPDATE clients SET account_executive_rel = {:keepId} WHERE account_executive_rel = {:dupId}',
        )
        .bind({ keepId: keepId, dupId: dupId })
        .execute()

      app
        .db()
        .newQuery(
          'UPDATE service_records SET account_executive = {:keepId} WHERE account_executive = {:dupId}',
        )
        .bind({ keepId: keepId, dupId: dupId })
        .execute()

      app.delete(records[i])
    }
  },
  (app) => {},
)
