migrate(
  (app) => {
    const col = app.findCollectionByNameOrId('users')
    col.emailVisibility = true
    app.save(col)
  },
  (app) => {
    const col = app.findCollectionByNameOrId('users')
    col.emailVisibility = false
    app.save(col)
  },
)
