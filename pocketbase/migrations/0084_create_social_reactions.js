migrate(
  (app) => {
    if (!app.hasTable('social_reactions')) {
      const socialReactions = new Collection({
        name: 'social_reactions',
        type: 'base',
        listRule: "@request.auth.id != ''",
        viewRule: "@request.auth.id != ''",
        createRule: "@request.auth.id != '' && user_id = @request.auth.id",
        updateRule: "@request.auth.id != '' && user_id = @request.auth.id",
        deleteRule:
          "@request.auth.id != '' && (user_id = @request.auth.id || @request.auth.role = 'Master' || @request.auth.master_access = true)",
        fields: [
          {
            name: 'user_id',
            type: 'relation',
            required: true,
            collectionId: '_pb_users_auth_',
            cascadeDelete: true,
            maxSelect: 1,
          },
          {
            name: 'item_type',
            type: 'select',
            required: true,
            values: ['employee_of_month', 'notable_evolution', 'badge_unlock', 'level_up'],
            maxSelect: 1,
          },
          {
            name: 'item_id',
            type: 'text',
            required: true,
          },
          {
            name: 'emoji',
            type: 'text',
            required: true,
          },
          {
            name: 'created',
            type: 'autodate',
            onCreate: true,
            onUpdate: false,
          },
          {
            name: 'updated',
            type: 'autodate',
            onCreate: true,
            onUpdate: true,
          },
        ],
        indexes: [
          'CREATE INDEX idx_reactions_item ON social_reactions (item_type, item_id)',
          'CREATE INDEX idx_reactions_user ON social_reactions (user_id)',
          'CREATE UNIQUE INDEX idx_reactions_unique_user_item ON social_reactions (user_id, item_type, item_id)',
        ],
      })
      app.save(socialReactions)
    }
  },
  (app) => {
    if (app.hasTable('social_reactions')) {
      app.delete(app.findCollectionByNameOrId('social_reactions'))
    }
  },
)
