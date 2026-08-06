// DIAGNOSTIC: Temporarily disabled for email visibility investigation.
// Intended privacy policy (restore after diagnosis):
// - Master users see ALL users' emails
// - Superusers see ALL users' emails
// - Other authenticated users only see their OWN email and Master users' emails
// - All other emails are hidden (set to empty string in response)
onRecordViewRequest((e) => {
  e.next()
}, 'users')
