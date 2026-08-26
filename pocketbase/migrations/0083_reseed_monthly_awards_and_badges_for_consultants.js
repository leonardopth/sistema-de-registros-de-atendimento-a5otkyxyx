migrate(
  (app) => {
    // 0083_reseed_monthly_awards_and_badges_for_consultants.js
    // Garante que monthly_awards e badges tenham registros válidos com usuários elegíveis (Consultores e Executivos de Contas)
    if (app.hasTable('users') && app.hasTable('monthly_awards')) {
      try {
        const eligibleUsers = app.findRecordsByFilter(
          'users',
          "role = 'Consultor' || role = 'Executivo de Contas'",
          'name',
          100,
          0,
        )

        if (eligibleUsers.length > 0) {
          const awardsCol = app.findCollectionByNameOrId('monthly_awards')
          const currentMonth = new Date().toISOString().substring(0, 7)
          const nowIso = new Date().toISOString()

          // 1. Limpar prêmios antigos que possam estar vinculados a usuários com role de liderança/master/gerente
          const allAwards = app.findRecordsByFilter('monthly_awards', "id != ''", '', 100, 0)
          for (let i = 0; i < allAwards.length; i++) {
            const aw = allAwards[i]
            const uid = aw.getString('user_id')
            try {
              const u = app.findFirstRecordByData('users', 'id', uid)
              const role = u.getString('role')
              if (role !== 'Consultor' && role !== 'Executivo de Contas') {
                app.delete(aw)
              }
            } catch (_) {
              // Se usuário não existir, deleta prêmio inválido
              app.delete(aw)
            }
          }

          // 2. Criar ou atualizar Colaborador do Mês com Consultor/Executivo elegível
          const existingEmployee = app.findRecordsByFilter(
            'monthly_awards',
            `award_type = 'employee_of_month' && month_year = '${currentMonth}'`,
            '',
            1,
            0,
          )

          const topUser = eligibleUsers[0]
          if (existingEmployee.length === 0 && topUser) {
            const award1 = new Record(awardsCol)
            award1.set('user_id', topUser.id)
            award1.set('award_type', 'employee_of_month')
            award1.set('month_year', currentMonth)
            award1.set('metric_value', 115)
            award1.set('details', {
              userName: topUser.getString('name'),
              completed: 48,
              target: 40,
              progressPct: 115.0,
            })
            award1.set('awarded_at', nowIso)
            app.save(award1)
          }

          // 3. Criar ou atualizar Evolução Notável com Consultor/Executivo elegível
          const existingEvolution = app.findRecordsByFilter(
            'monthly_awards',
            `award_type = 'notable_evolution' && month_year = '${currentMonth}'`,
            '',
            1,
            0,
          )

          const secondUser = eligibleUsers.length > 1 ? eligibleUsers[1] : eligibleUsers[0]
          if (existingEvolution.length === 0 && secondUser) {
            const award2 = new Record(awardsCol)
            award2.set('user_id', secondUser.id)
            award2.set('award_type', 'notable_evolution')
            award2.set('month_year', currentMonth)
            award2.set('metric_value', 22)
            award2.set('details', {
              userName: secondUser.getString('name'),
              currentCompleted: 42,
              prevCompleted: 20,
              growth: 22,
            })
            award2.set('awarded_at', nowIso)
            app.save(award2)
          }

          // 4. Garantir que existam badges registradas para os consultores elegíveis
          if (app.hasTable('badges') && app.hasTable('gamification')) {
            const badgesCol = app.findCollectionByNameOrId('badges')
            const gamCol = app.findCollectionByNameOrId('gamification')

            for (let uIdx = 0; uIdx < eligibleUsers.length; uIdx++) {
              const u = eligibleUsers[uIdx]
              const uid = u.id

              // Garantir badges iniciais para consultores
              const sampleBadges =
                uIdx === 0
                  ? ['novato', 'velocista', 'olho_clinico', 'cliente_feliz']
                  : ['novato', 'olho_clinico']

              for (let b = 0; b < sampleBadges.length; b++) {
                const bKey = sampleBadges[b]
                try {
                  const existingB = app.findRecordsByFilter(
                    'badges',
                    `user_id = '${uid}' && badge_key = '${bKey}'`,
                    '',
                    1,
                    0,
                  )
                  if (existingB.length === 0) {
                    const bRec = new Record(badgesCol)
                    bRec.set('user_id', uid)
                    bRec.set('badge_key', bKey)
                    bRec.set('unlocked_at', nowIso)
                    app.save(bRec)
                  }
                } catch (_) {}
              }

              // Atualizar ou criar gamification
              try {
                let gRec = null
                try {
                  gRec = app.findFirstRecordByData('gamification', 'user_id', uid)
                } catch (_) {
                  gRec = new Record(gamCol)
                  gRec.set('user_id', uid)
                }
                const existingBadges = gRec.get('badges') || []
                const mergedBadges = Array.from(new Set([...existingBadges, ...sampleBadges]))
                gRec.set('badges', mergedBadges)
                if (gRec.getInt('xp') <= 50) {
                  gRec.set('xp', 120 + uIdx * 80)
                  gRec.set('level', uIdx === 0 ? 'Júnior' : 'Aprendiz')
                  gRec.set('streak_days', 4)
                  gRec.set('daily_record', 6)
                }
                app.save(gRec)
              } catch (_) {}
            }
          }
        }
      } catch (err) {
        console.log('Error in 0083 migration:', err)
      }
    }
  },
  (app) => {},
)
