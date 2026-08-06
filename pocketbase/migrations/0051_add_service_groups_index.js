migrate(
  (app) => {
    var col = app.findCollectionByNameOrId('users')
    col.addIndex('idx_users_service_groups', false, 'service_groups', '')
    app.save(col)
  },
  (app) => {
    var col = app.findCollectionByNameOrId('users')
    col.removeIndex('idx_users_service_groups')
    app.save(col)
  },
)
