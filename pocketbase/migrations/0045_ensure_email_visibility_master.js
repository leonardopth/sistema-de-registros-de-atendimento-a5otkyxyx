migrate(
  (app) => {
    var col = app.findCollectionByNameOrId('users')
    col.emailVisibility = true
    app.save(col)
  },
  (app) => {
    var col = app.findCollectionByNameOrId('users')
    col.emailVisibility = false
    app.save(col)
  },
)
