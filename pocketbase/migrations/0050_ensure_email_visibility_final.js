migrate(
  (app) => {
    var col = app.findCollectionByNameOrId('users')
    col.emailVisibility = true
    app.save(col)
    console.log('0050: emailVisibility=true ensured on users collection')
  },
  (app) => {},
)
