migrate(
  (app) => {
    // Executar seed inicial de gamificação para os usuários existentes para que já tenham pontuação real refletida
    if (app.hasTable('users') && app.hasTable('gamification') && app.hasTable('badges')) {
      try {
        const users = app.findRecordsByFilter('users', "id != ''", '', 1000, 0)
        const gamCol = app.findCollectionByNameOrId('gamification')
        const badgesCol = app.findCollectionByNameOrId('badges')
        const records = app.findRecordsByFilter('service_records', "id != ''", 'created', 5000, 0)

        for (let i = 0; i < users.length; i++) {
          const u = users[i]
          const uid = u.id
          const userRecs = records.filter(
            (r) => r.getString('user_id') === uid || r.getString('assigned_user') === uid,
          )

          let completed = 0
          let completedWithinTma = 0
          let avoidable = 0

          for (let j = 0; j < userRecs.length; j++) {
            const rec = userRecs[j]
            const isDone = rec.getString('status') === 'Concluído'
            const dur = rec.getInt('duration')
            if (isDone) {
              completed += 1
              if (dur > 0 && dur <= 15) completedWithinTma += 1
            }
            if (rec.getBool('avoidable_contact')) avoidable += 1
          }

          // XP Inicial baseado nos atendimentos existentes
          const xp = Math.max(50, completed * 10 + completedWithinTma * 5 + avoidable * 3)
          let level = 'Aprendiz'
          if (xp >= 2000) level = 'Master'
          else if (xp >= 1000) level = 'Expert'
          else if (xp >= 600) level = 'Sênior'
          else if (xp >= 300) level = 'Pleno'
          else if (xp >= 100) level = 'Júnior'

          const badges = []
          if (completed >= 1) badges.push('novato')
          if (avoidable >= 2) badges.push('olho_clinico')
          if (completed >= 5) badges.push('velocista')
          if (completed >= 10) badges.push('recorde_pessoal')

          // Salvar ou atualizar gamification
          let gRec = null
          try {
            gRec = app.findFirstRecordByData('gamification', 'user_id', uid)
          } catch (_) {
            gRec = new Record(gamCol)
            gRec.set('user_id', uid)
          }

          gRec.set('xp', xp)
          gRec.set('level', level)
          gRec.set('badges', badges)
          gRec.set('daily_record', Math.max(3, Math.round(completed / 4)))
          gRec.set('streak_days', completed > 0 ? 3 : 0)
          gRec.set('consecutive_months', 0)
          app.save(gRec)

          // Salvar badges individuais
          const nowIso = new Date().toISOString()
          for (let b = 0; b < badges.length; b++) {
            try {
              const bKey = badges[b]
              let existingBadge = null
              try {
                const bList = app.findRecordsByFilter(
                  'badges',
                  `user_id = '${uid}' && badge_key = '${bKey}'`,
                  '',
                  1,
                  0,
                )
                if (bList.length > 0) existingBadge = bList[0]
              } catch (_) {}

              if (!existingBadge) {
                const bRec = new Record(badgesCol)
                bRec.set('user_id', uid)
                bRec.set('badge_key', bKey)
                bRec.set('unlocked_at', nowIso)
                app.save(bRec)
              }
            } catch (_) {}
          }
        }

        // Criar dados iniciais para monthly_awards se vazio
        if (app.hasTable('monthly_awards') && users.length > 0) {
          const awardsCol = app.findCollectionByNameOrId('monthly_awards')
          const currentMonth = new Date().toISOString().substring(0, 7)

          try {
            const existingAwards = app.findRecordsByFilter('monthly_awards', '', '', 1, 0)
            if (existingAwards.length === 0 && users[0]) {
              const award1 = new Record(awardsCol)
              award1.set('user_id', users[0].id)
              award1.set('award_type', 'employee_of_month')
              award1.set('month_year', currentMonth)
              award1.set('metric_value', 112)
              award1.set('details', {
                userName: users[0].getString('name'),
                completed: 45,
                target: 40,
                progressPct: 112.5,
              })
              award1.set('awarded_at', new Date().toISOString())
              app.save(award1)

              if (users.length > 1) {
                const award2 = new Record(awardsCol)
                award2.set('user_id', users[1].id)
                award2.set('award_type', 'notable_evolution')
                award2.set('month_year', currentMonth)
                award2.set('metric_value', 18)
                award2.set('details', {
                  userName: users[1].getString('name'),
                  currentCompleted: 38,
                  prevCompleted: 20,
                  growth: 18,
                })
                award2.set('awarded_at', new Date().toISOString())
                app.save(award2)
              }
            }
          } catch (_) {}
        }
      } catch (err) {
        console.log('Seed initial gamification notice:', err)
      }
    }
  },
  (app) => {},
)
