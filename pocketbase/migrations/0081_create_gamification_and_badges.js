migrate(
  (app) => {
    // 1. Coleção gamification
    if (!app.hasTable('gamification')) {
      const gamification = new Collection({
        name: 'gamification',
        type: 'base',
        listRule: "@request.auth.id != ''",
        viewRule: "@request.auth.id != ''",
        createRule: "@request.auth.id != ''",
        updateRule: "@request.auth.id != ''",
        deleteRule: "@request.auth.role = 'Master' || @request.auth.master_access = true",
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
            name: 'xp',
            type: 'number',
            min: 0,
          },
          {
            name: 'level',
            type: 'text',
          },
          {
            name: 'badges',
            type: 'json',
          },
          {
            name: 'daily_record',
            type: 'number',
            min: 0,
          },
          {
            name: 'streak_days',
            type: 'number',
            min: 0,
          },
          {
            name: 'consecutive_months',
            type: 'number',
            min: 0,
          },
          {
            name: 'last_badge_unlocked_at',
            type: 'date',
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
          'CREATE UNIQUE INDEX idx_gamification_user ON gamification (user_id)',
          'CREATE INDEX idx_gamification_xp ON gamification (xp DESC)',
        ],
      })
      app.save(gamification)
    }

    // 2. Coleção badges
    if (!app.hasTable('badges')) {
      const badges = new Collection({
        name: 'badges',
        type: 'base',
        listRule: "@request.auth.id != ''",
        viewRule: "@request.auth.id != ''",
        createRule: "@request.auth.id != ''",
        updateRule: "@request.auth.id != ''",
        deleteRule: "@request.auth.role = 'Master' || @request.auth.master_access = true",
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
            name: 'badge_key',
            type: 'text',
            required: true,
          },
          {
            name: 'unlocked_at',
            type: 'date',
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
          'CREATE INDEX idx_badges_user ON badges (user_id)',
          'CREATE INDEX idx_badges_key ON badges (badge_key)',
          'CREATE UNIQUE INDEX idx_badges_user_key ON badges (user_id, badge_key)',
        ],
      })
      app.save(badges)
    }

    // 3. Coleção monthly_awards (Colaborador do Mês e Evolução Notável)
    if (!app.hasTable('monthly_awards')) {
      const monthlyAwards = new Collection({
        name: 'monthly_awards',
        type: 'base',
        listRule: "@request.auth.id != ''",
        viewRule: "@request.auth.id != ''",
        createRule: "@request.auth.id != ''",
        updateRule: "@request.auth.id != ''",
        deleteRule: "@request.auth.role = 'Master' || @request.auth.master_access = true",
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
            name: 'award_type',
            type: 'select',
            required: true,
            values: ['employee_of_month', 'notable_evolution'],
            maxSelect: 1,
          },
          {
            name: 'month_year',
            type: 'text', // e.g. "2025-05"
            required: true,
          },
          {
            name: 'metric_value',
            type: 'number',
          },
          {
            name: 'details',
            type: 'json',
          },
          {
            name: 'awarded_at',
            type: 'date',
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
          'CREATE INDEX idx_awards_month ON monthly_awards (month_year)',
          'CREATE INDEX idx_awards_type ON monthly_awards (award_type)',
          'CREATE UNIQUE INDEX idx_awards_user_type_month ON monthly_awards (user_id, award_type, month_year)',
        ],
      })
      app.save(monthlyAwards)
    }
  },
  (app) => {
    if (app.hasTable('monthly_awards')) {
      app.delete(app.findCollectionByNameOrId('monthly_awards'))
    }
    if (app.hasTable('badges')) {
      app.delete(app.findCollectionByNameOrId('badges'))
    }
    if (app.hasTable('gamification')) {
      app.delete(app.findCollectionByNameOrId('gamification'))
    }
  },
)
