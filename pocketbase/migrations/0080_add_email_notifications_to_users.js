migrate(
  (app) => {
    const usersCol = app.findCollectionByNameOrId('_pb_users_auth_')
    if (!usersCol.fields.getByName('email_notifications')) {
      usersCol.fields.add(new BoolField({ name: 'email_notifications', required: false }))
      app.save(usersCol)
    }
  },
  (app) => {
    const usersCol = app.findCollectionByNameOrId('_pb_users_auth_')
    if (usersCol.fields.getByName('email_notifications')) {
      usersCol.fields.removeByName('email_notifications')
      app.save(usersCol)
    }
  },
)
