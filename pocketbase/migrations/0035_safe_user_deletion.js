migrate(
  (app) => {
    var notifCol = app.findCollectionByNameOrId('notifications')
    var notifField = notifCol.fields.getByName('user_id')
    if (notifField) {
      notifField.required = false
    }
    app.save(notifCol)

    var srCol = app.findCollectionByNameOrId('scheduled_reports')
    var srField = srCol.fields.getByName('user_id')
    if (srField) {
      srField.required = false
    }
    app.save(srCol)

    var feedbackCol = app.findCollectionByNameOrId('feedback')
    var feedbackField = feedbackCol.fields.getByName('user_id')
    if (feedbackField) {
      feedbackField.required = false
    }
    app.save(feedbackCol)
  },
  (app) => {
    var notifCol = app.findCollectionByNameOrId('notifications')
    var notifField = notifCol.fields.getByName('user_id')
    if (notifField) {
      notifField.required = true
    }
    app.save(notifCol)

    var srCol = app.findCollectionByNameOrId('scheduled_reports')
    var srField = srCol.fields.getByName('user_id')
    if (srField) {
      srField.required = true
    }
    app.save(srCol)

    var feedbackCol = app.findCollectionByNameOrId('feedback')
    var feedbackField = feedbackCol.fields.getByName('user_id')
    if (feedbackField) {
      feedbackField.required = true
    }
    app.save(feedbackCol)
  },
)
