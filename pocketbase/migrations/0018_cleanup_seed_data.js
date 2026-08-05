migrate(
  (app) => {
    // 1. Delete all service_records first (child of users, clients, agents, account_executives)
    try {
      var srCol = app.findCollectionByNameOrId('service_records')
      app.truncateCollection(srCol)
    } catch (_) {}

    // 2. Delete all agents (child of clients)
    try {
      var agentsCol = app.findCollectionByNameOrId('agents')
      app.truncateCollection(agentsCol)
    } catch (_) {}

    // 3. Delete all clients (has relation to account_executives)
    try {
      var clientsCol = app.findCollectionByNameOrId('clients')
      app.truncateCollection(clientsCol)
    } catch (_) {}

    // 4. Delete all account_executives
    try {
      var aeCol = app.findCollectionByNameOrId('account_executives')
      app.truncateCollection(aeCol)
    } catch (_) {}

    // 5. Delete the demo user account
    try {
      var demoUser = app.findAuthRecordByEmail('_pb_users_auth_', 'leonardopth@gmail.com')
      app.delete(demoUser)
    } catch (_) {}

    // 6. Ensure the master account is intact
    try {
      var master = app.findAuthRecordByEmail(
        '_pb_users_auth_',
        'leonardo.thereziano@rexturadvance.com.br',
      )
      master.set('role', 'Master')
      master.set('approval_status', 'Aprovado')
      app.save(master)
    } catch (_) {}
  },
  (app) => {
    // No-op: reverting a data cleanup would not restore deleted seed data.
  },
)
