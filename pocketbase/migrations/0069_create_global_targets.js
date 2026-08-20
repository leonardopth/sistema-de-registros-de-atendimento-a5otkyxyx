migrate(
  (app) => {
    var usersCol = app.findCollectionByNameOrId('_pb_users_auth_')

    let targetsCol
    try {
      targetsCol = app.findCollectionByNameOrId('global_targets')
    } catch (_) {
      const col = new Collection({
        name: 'global_targets',
        type: 'base',
        listRule: "@request.auth.id != ''",
        viewRule: "@request.auth.id != ''",
        createRule:
          "@request.auth.id != '' && (@request.auth.role = 'Gerentes' || @request.auth.role = 'Supervisores' || @request.auth.role = 'Líderes' || @request.auth.role = 'Master' || @request.auth.master_access = true)",
        updateRule:
          "@request.auth.id != '' && (@request.auth.role = 'Gerentes' || @request.auth.role = 'Supervisores' || @request.auth.role = 'Líderes' || @request.auth.role = 'Master' || @request.auth.master_access = true)",
        deleteRule: null,
        fields: [
          {
            name: 'monthly_attendance_target',
            type: 'number',
            required: true,
            min: 0,
            onlyInt: true,
          },
          {
            name: 'min_resolution_rate',
            type: 'number',
            required: true,
            min: 0,
            max: 100,
          },
          {
            name: 'updated_by',
            type: 'relation',
            required: false,
            collectionId: usersCol.id,
            maxSelect: 1,
          },
          { name: 'created', type: 'autodate', onCreate: true, onUpdate: false },
          { name: 'updated', type: 'autodate', onCreate: true, onUpdate: true },
        ],
        indexes: [],
      })
      app.save(col)
      targetsCol = app.findCollectionByNameOrId('global_targets')
    }

    // Seed a single default global target record if none exists
    try {
      app.findRecordsByFilter('global_targets', "id != ''", 'created', 1, 0)
      var existing = app.findRecordsByFilter('global_targets', "id != ''", 'created', 1, 0)
      if (!existing || existing.length === 0) {
        var rec = new Record(targetsCol)
        rec.set('monthly_attendance_target', 100)
        rec.set('min_resolution_rate', 80)
        app.save(rec)
      }
    } catch (_) {
      // Fallback: create record even if filter query fails
      try {
        var rec2 = new Record(targetsCol)
        rec2.set('monthly_attendance_target', 100)
        rec2.set('min_resolution_rate', 80)
        app.save(rec2)
      } catch (e) {}
    }
  },
  (app) => {
    try {
      const col = app.findCollectionByNameOrId('global_targets')
      app.delete(col)
    } catch (_) {}
  },
)
