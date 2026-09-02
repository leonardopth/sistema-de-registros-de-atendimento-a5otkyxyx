// Hook para calcular XP, nível e desbloquear badges automaticamente:
// 1. Consultores: Pontuação orientada ao desempenho operacional de atendimentos (TMA, contatos evitáveis identificados, volume diário, streak, categorização IA, sentimento positivo).
// 2. Executivos de Contas: Pontuação DIFERENTE e orientada ao PROGRESSO DOS CLIENTES (autonomia acima do threshold, melhora mês a mês, clientes ativos com scorecard positivo, zero evitáveis, satisfação e mentoria/treinamento).

onRecordAfterCreateSuccess((e) => {
  function getLevelForXp(xp) {
    if (xp >= 2000) return 'Master'
    if (xp >= 1000) return 'Expert'
    if (xp >= 600) return 'Sênior'
    if (xp >= 300) return 'Pleno'
    if (xp >= 100) return 'Júnior'
    return 'Aprendiz'
  }

  function processExecutive(userRec) {
    var userId = userRec.id
    var userName = userRec.getString('name')
    var userEmail = userRec.getString('email')

    var execRecs = []
    try {
      if ($app.hasTable('account_executives')) {
        execRecs = $app.findRecordsByFilter(
          'account_executives',
          "email = '" + userEmail + "' || name = '" + userName + "'",
          '',
          1,
          0,
        )
      }
    } catch (_) {}

    var execId = execRecs.length > 0 ? execRecs[0].id : ''

    var clientFilter = "account_executive = '" + userName + "'"
    if (execId) {
      clientFilter =
        "account_executive_rel = '" + execId + "' || account_executive = '" + userName + "'"
    }

    var managedClients = []
    try {
      managedClients = $app.findRecordsByFilter('clients', clientFilter, '', 500, 0)
    } catch (_) {}

    if (!managedClients || managedClients.length === 0) {
      try {
        var userBases = userRec.get('bases') || []
        if (Array.isArray(userBases) && userBases.length > 0) {
          managedClients = $app.findRecordsByFilter('clients', "id != ''", '', 500, 0)
        }
      } catch (_) {}
    }

    var now = new Date()
    var currentMonthStr = now.getFullYear() + '-' + String(now.getMonth() + 1).padStart(2, '0')
    var prevMonthDate = new Date(now.getFullYear(), now.getMonth() - 1, 1)
    var prevMonthStr =
      prevMonthDate.getFullYear() + '-' + String(prevMonthDate.getMonth() + 1).padStart(2, '0')

    var highAutonomyClients = 0
    var perfectAutonomyClients = 0
    var evolvingClients = 0
    var trainedClients = 0
    var totalManaged = managedClients ? managedClients.length : 0
    var positiveClientsFeedback = 0
    var sumAutonomy = 0

    var clientIds = []
    var clientCompanies = []
    for (var mi = 0; mi < managedClients.length; mi++) {
      clientIds.push(managedClients[mi].id)
      var comp = managedClients[mi].getString('company')
      if (comp) clientCompanies.push(comp)
    }

    for (var ci = 0; ci < managedClients.length; ci++) {
      var cRec = managedClients[ci]
      var cId = cRec.id
      var cComp = cRec.getString('company')

      var recFilter = "client = '" + cId + "'"
      if (cComp) {
        recFilter = "client = '" + cId + "' || client_company = '" + cComp + "'"
      }

      var cRecords = []
      try {
        cRecords = $app.findRecordsByFilter('service_records', recFilter, 'created', 1000, 0)
      } catch (_) {}

      var totalCalls = cRecords.length
      var avoidableCalls = 0
      var curMonthTotal = 0
      var curMonthAvoidable = 0
      var prevMonthTotal = 0
      var prevMonthAvoidable = 0

      for (var cri = 0; cri < cRecords.length; cri++) {
        var cr = cRecords[cri]
        var isAvoidable = cr.getBool('avoidable_contact')
        if (isAvoidable) avoidableCalls += 1

        var cDate = cr.getString('created') || ''
        if (cDate.startsWith(currentMonthStr)) {
          curMonthTotal += 1
          if (isAvoidable) curMonthAvoidable += 1
        } else if (cDate.startsWith(prevMonthStr)) {
          prevMonthTotal += 1
          if (isAvoidable) prevMonthAvoidable += 1
        }
      }

      var cAutonomyRate =
        totalCalls > 0 ? Math.round(((totalCalls - avoidableCalls) / totalCalls) * 100) : 100
      sumAutonomy += cAutonomyRate

      if (cAutonomyRate >= 80) highAutonomyClients += 1
      if (totalCalls > 0 && avoidableCalls === 0) perfectAutonomyClients += 1

      var curAutonomy =
        curMonthTotal > 0 ? ((curMonthTotal - curMonthAvoidable) / curMonthTotal) * 100 : 100
      var prevAutonomy =
        prevMonthTotal > 0 ? ((prevMonthTotal - prevMonthAvoidable) / prevMonthTotal) * 100 : 100

      if (curAutonomy > prevAutonomy || (curAutonomy >= 80 && prevMonthTotal === 0)) {
        evolvingClients += 1
      }

      try {
        if ($app.hasTable('trainings')) {
          var trList = $app.findRecordsByFilter('trainings', "client = '" + cId + "'", '', 1, 0)
          if (trList && trList.length > 0) {
            trainedClients += 1
          }
        }
      } catch (_) {}
    }

    try {
      if ($app.hasTable('call_analysis_logs')) {
        for (var fci = 0; fci < clientIds.length; fci++) {
          var clId = clientIds[fci]
          var logs = $app.findRecordsByFilter(
            'call_analysis_logs',
            "client = '" + clId + "' && (sentiment ~ 'positivo' || sentiment ~ 'positive')",
            '',
            10,
            0,
          )
          positiveClientsFeedback += logs.length
        }
      }
    } catch (_) {}

    var avgAutonomy = totalManaged > 0 ? Math.round(sumAutonomy / totalManaged) : 100

    var execXP =
      highAutonomyClients * 40 +
      perfectAutonomyClients * 60 +
      evolvingClients * 50 +
      trainedClients * 30 +
      positiveClientsFeedback * 10 +
      Math.round(avgAutonomy * 2)

    var calculatedXP = Math.max(0, execXP)
    var calculatedLevel = getLevelForXp(calculatedXP)

    var unlockedBadgesMap = {}
    if (highAutonomyClients >= 3) unlockedBadgesMap['gestor_autonomia'] = true
    if (evolvingClients >= 1) unlockedBadgesMap['mestre_da_evolucao'] = true
    if (totalManaged > 0 && highAutonomyClients / totalManaged >= 0.7)
      unlockedBadgesMap['scorecard_ouro'] = true
    if (perfectAutonomyClients >= 1) unlockedBadgesMap['cliente_blindado'] = true
    if (trainedClients >= 1) unlockedBadgesMap['mentor_de_agencias'] = true
    if (positiveClientsFeedback >= 5) unlockedBadgesMap['carteira_satisfeita'] = true
    if (highAutonomyClients >= 5) unlockedBadgesMap['expansao_autonoma'] = true
    if (calculatedXP >= 1000) unlockedBadgesMap['executivo_diamante'] = true

    var existingBadgeRecords = []
    try {
      if ($app.hasTable('badges')) {
        existingBadgeRecords = $app.findRecordsByFilter(
          'badges',
          "user_id = '" + userId + "'",
          'created',
          100,
          0,
        )
        for (var b = 0; b < existingBadgeRecords.length; b++) {
          unlockedBadgesMap[existingBadgeRecords[b].getString('badge_key')] = true
        }
      }
    } catch (_) {}

    var badgesCol = $app.findCollectionByNameOrId('badges')
    var nowIso = new Date().toISOString()
    var newlyUnlockedKeys = []
    var currentBadgeKeys = Object.keys(unlockedBadgesMap)

    for (var bi = 0; bi < currentBadgeKeys.length; bi++) {
      var bKey = currentBadgeKeys[bi]
      var found = false
      for (var ej = 0; ej < existingBadgeRecords.length; ej++) {
        if (existingBadgeRecords[ej].getString('badge_key') === bKey) {
          found = true
          break
        }
      }
      if (!found) {
        try {
          var bRec = new Record(badgesCol)
          bRec.set('user_id', userId)
          bRec.set('badge_key', bKey)
          bRec.set('unlocked_at', nowIso)
          $app.save(bRec)
          newlyUnlockedKeys.push(bKey)
        } catch (_) {}
      }
    }

    var gamificationCol = $app.findCollectionByNameOrId('gamification')
    var gamificationRec = null
    try {
      gamificationRec = $app.findFirstRecordByData('gamification', 'user_id', userId)
    } catch (_) {
      gamificationRec = new Record(gamificationCol)
      gamificationRec.set('user_id', userId)
    }

    var previousLevel = gamificationRec.getString('level') || 'Aprendiz'
    gamificationRec.set('xp', calculatedXP)
    gamificationRec.set('level', calculatedLevel)
    gamificationRec.set('badges', currentBadgeKeys)
    gamificationRec.set('daily_record', highAutonomyClients)
    gamificationRec.set('streak_days', evolvingClients)
    gamificationRec.set('consecutive_months', 0)
    if (newlyUnlockedKeys.length > 0) {
      gamificationRec.set('last_badge_unlocked_at', nowIso)
    }
    $app.save(gamificationRec)

    if (previousLevel !== calculatedLevel && previousLevel !== '') {
      try {
        var notifCol = $app.findCollectionByNameOrId('notifications')
        var lvlNotif = new Record(notifCol)
        lvlNotif.set('user_id', userId)
        lvlNotif.set('title', '🎉 Parabéns! Você subiu de nível na Gestão de Contas!')
        lvlNotif.set(
          'message',
          'Você atingiu o nível ' +
            calculatedLevel +
            ' com ' +
            calculatedXP +
            ' XP de Autonomia de Clientes!',
        )
        lvlNotif.set('type', 'success')
        lvlNotif.set('read', false)
        lvlNotif.set('link', '/ranking')
        $app.save(lvlNotif)
      } catch (_) {}
    }
  }

  function processConsultant(userRec) {
    var userId = userRec.id
    var globalTargetTma = 15
    var dailyTargetCount = 10

    try {
      if ($app.hasTable('global_targets')) {
        var gtList = $app.findRecordsByFilter('global_targets', '', '-created', 1, 0)
        if (gtList && gtList.length > 0) {
          var gt = gtList[0]
          var gtTma = gt.getInt('avg_response_time_target')
          if (gtTma > 0) globalTargetTma = gtTma
          var gtMonthly = gt.getInt('monthly_attendance_target')
          if (gtMonthly > 0) {
            dailyTargetCount = Math.max(3, Math.round(gtMonthly / 22))
          }
        }
      }
    } catch (_) {}

    try {
      if ($app.hasTable('user_targets')) {
        var utList = $app.findRecordsByFilter('user_targets', "user = '" + userId + "'", '', 1, 0)
        if (utList && utList.length > 0) {
          var ut = utList[0]
          var utTma = ut.getInt('avg_response_time_target')
          if (utTma > 0) globalTargetTma = utTma
          var utMonthly = ut.getInt('monthly_attendance_target')
          if (utMonthly > 0) {
            dailyTargetCount = Math.max(3, Math.round(utMonthly / 22))
          }
        }
      }
    } catch (_) {}

    var records = []
    try {
      records = $app.findRecordsByFilter(
        'service_records',
        "user_id = '" + userId + "' || assigned_user = '" + userId + "'",
        'created',
        5000,
        0,
      )
    } catch (_) {
      return
    }

    var positiveSentimentsCount = 0
    var aiCategorizedCount = 0
    var sharedCount = 0

    try {
      if ($app.hasTable('service_record_shares')) {
        var shares = $app.findRecordsByFilter(
          'service_record_shares',
          "shared_by = '" + userId + "'",
          '',
          100,
          0,
        )
        sharedCount = shares.length
      }
    } catch (_) {}

    var dayMap = {}
    var totalAvoidable = 0
    var totalReopenedResolved = 0
    var totalCompleted = 0
    var totalCompletedWithinTma = 0

    for (var i = 0; i < records.length; i++) {
      var r = records[i]
      var status = r.getString('status')
      var isCompleted = status === 'Concluído'
      var duration = r.getInt('duration')
      var created = r.getString('created')
      var dayStr = created ? created.substring(0, 10) : '2025-01-01'
      var isAvoidable = r.getBool('avoidable_contact')
      var reopenJust = r.getString('reopen_justification')

      if (!dayMap[dayStr]) {
        dayMap[dayStr] = { total: 0, completed: 0, durations: [] }
      }

      dayMap[dayStr].total += 1
      if (isCompleted) {
        dayMap[dayStr].completed += 1
        totalCompleted += 1
        if (duration > 0) {
          dayMap[dayStr].durations.push(duration)
          if (duration <= globalTargetTma) {
            totalCompletedWithinTma += 1
          }
        }
        if (reopenJust && reopenJust.trim() !== '') {
          totalReopenedResolved += 1
        }
      }

      if (isAvoidable) {
        totalAvoidable += 1
      }
    }

    try {
      if ($app.hasTable('call_analysis_logs')) {
        var cLogs = $app.findRecordsByFilter(
          'call_analysis_logs',
          "processed_by = '" + userId + "'",
          '',
          1000,
          0,
        )
        for (var ci = 0; ci < cLogs.length; ci++) {
          var sent = cLogs[ci].getString('sentiment')
          if (
            sent &&
            (sent.toLowerCase().indexOf('positivo') !== -1 ||
              sent.toLowerCase().indexOf('positive') !== -1)
          ) {
            positiveSentimentsCount += 1
          }
          if (cLogs[ci].getString('category')) {
            aiCategorizedCount += 1
          }
        }
      }
    } catch (_) {}

    try {
      if ($app.hasTable('email_analysis_logs')) {
        var eLogs = $app.findRecordsByFilter(
          'email_analysis_logs',
          "processed_by = '" + userId + "'",
          '',
          1000,
          0,
        )
        for (var ei = 0; ei < eLogs.length; ei++) {
          var eSent = eLogs[ei].getString('sentiment')
          if (
            eSent &&
            (eSent.toLowerCase().indexOf('positivo') !== -1 ||
              eSent.toLowerCase().indexOf('positive') !== -1)
          ) {
            positiveSentimentsCount += 1
          }
          if (eLogs[ei].getString('category')) {
            aiCategorizedCount += 1
          }
        }
      }
    } catch (_) {}

    var sortedDays = Object.keys(dayMap).sort()
    var maxDailyRecord = 0
    var currentDailyStreak = 0
    var maxDailyStreak = 0
    var consecutiveTmaDays = 0
    var maxConsecutiveTmaDays = 0
    var daysMeetingDailyTarget = 0

    for (var d = 0; d < sortedDays.length; d++) {
      var dayData = dayMap[sortedDays[d]]
      if (dayData.completed > maxDailyRecord) {
        maxDailyRecord = dayData.completed
      }

      if (dayData.durations.length > 0) {
        var sumDur = 0
        for (var sd = 0; sd < dayData.durations.length; sd++) {
          sumDur += dayData.durations[sd]
        }
        var dayAvg = sumDur / dayData.durations.length
        if (dayAvg <= globalTargetTma) {
          consecutiveTmaDays += 1
          if (consecutiveTmaDays > maxConsecutiveTmaDays) {
            maxConsecutiveTmaDays = consecutiveTmaDays
          }
        } else {
          consecutiveTmaDays = 0
        }
      } else {
        consecutiveTmaDays = 0
      }

      if (dayData.completed >= dailyTargetCount) {
        daysMeetingDailyTarget += 1
        currentDailyStreak += 1
        if (currentDailyStreak > maxDailyStreak) {
          maxDailyStreak = currentDailyStreak
        }
      } else {
        currentDailyStreak = 0
      }
    }

    var streakMultiplier = 1.0
    if (maxDailyStreak > 1) {
      streakMultiplier = Math.min(2.0, 1.0 + (maxDailyStreak - 1) * 0.1)
    }

    var baseXP =
      totalCompleted * 10 +
      totalCompletedWithinTma * 5 +
      totalAvoidable * 3 +
      aiCategorizedCount * 2 +
      positiveSentimentsCount * 5 +
      totalReopenedResolved * 15 +
      Math.round(daysMeetingDailyTarget * 20 * streakMultiplier)

    var calculatedXP = Math.max(0, baseXP)
    var calculatedLevel = getLevelForXp(calculatedXP)

    var unlockedBadgesMap = {}
    if (totalCompleted >= 1) unlockedBadgesMap['novato'] = true
    if (maxConsecutiveTmaDays >= 5) unlockedBadgesMap['velocista'] = true
    if (totalAvoidable >= 10) unlockedBadgesMap['olho_clinico'] = true
    if (positiveSentimentsCount >= 10) unlockedBadgesMap['cliente_feliz'] = true
    if (maxDailyRecord >= 50) unlockedBadgesMap['maratonista'] = true
    if (maxDailyRecord > dailyTargetCount && maxDailyRecord >= 5)
      unlockedBadgesMap['recorde_pessoal'] = true
    if (sharedCount >= 1) unlockedBadgesMap['trabalho_equipe'] = true
    if (aiCategorizedCount >= 10) unlockedBadgesMap['categorizador_nato'] = true

    var existingBadgeRecords = []
    try {
      if ($app.hasTable('badges')) {
        existingBadgeRecords = $app.findRecordsByFilter(
          'badges',
          "user_id = '" + userId + "'",
          'created',
          100,
          0,
        )
        for (var b = 0; b < existingBadgeRecords.length; b++) {
          unlockedBadgesMap[existingBadgeRecords[b].getString('badge_key')] = true
        }
      }
    } catch (_) {}

    var badgesCol = $app.findCollectionByNameOrId('badges')
    var nowIso = new Date().toISOString()
    var newlyUnlockedKeys = []
    var currentBadgeKeys = Object.keys(unlockedBadgesMap)

    for (var bi = 0; bi < currentBadgeKeys.length; bi++) {
      var bKey = currentBadgeKeys[bi]
      var found = false
      for (var ej = 0; ej < existingBadgeRecords.length; ej++) {
        if (existingBadgeRecords[ej].getString('badge_key') === bKey) {
          found = true
          break
        }
      }
      if (!found) {
        try {
          var bRec = new Record(badgesCol)
          bRec.set('user_id', userId)
          bRec.set('badge_key', bKey)
          bRec.set('unlocked_at', nowIso)
          $app.save(bRec)
          newlyUnlockedKeys.push(bKey)
        } catch (_) {}
      }
    }

    var gamificationCol = $app.findCollectionByNameOrId('gamification')
    var gamificationRec = null
    try {
      gamificationRec = $app.findFirstRecordByData('gamification', 'user_id', userId)
    } catch (_) {
      gamificationRec = new Record(gamificationCol)
      gamificationRec.set('user_id', userId)
    }

    var previousLevel = gamificationRec.getString('level') || 'Aprendiz'
    gamificationRec.set('xp', calculatedXP)
    gamificationRec.set('level', calculatedLevel)
    gamificationRec.set('badges', currentBadgeKeys)
    gamificationRec.set('daily_record', maxDailyRecord)
    gamificationRec.set('streak_days', maxDailyStreak)
    gamificationRec.set('consecutive_months', 0)
    if (newlyUnlockedKeys.length > 0) {
      gamificationRec.set('last_badge_unlocked_at', nowIso)
    }
    $app.save(gamificationRec)

    if (previousLevel !== calculatedLevel && previousLevel !== '') {
      try {
        var notifCol = $app.findCollectionByNameOrId('notifications')
        var lvlNotif = new Record(notifCol)
        lvlNotif.set('user_id', userId)
        lvlNotif.set('title', '🎉 Parabéns! Você subiu de nível!')
        lvlNotif.set(
          'message',
          'Você atingiu o nível ' + calculatedLevel + ' com ' + calculatedXP + ' XP!',
        )
        lvlNotif.set('type', 'success')
        lvlNotif.set('read', false)
        lvlNotif.set('link', '/ranking')
        $app.save(lvlNotif)
      } catch (_) {}
    }
  }

  function processUser(userId) {
    if (!userId || typeof userId !== 'string' || userId.trim() === '') return
    try {
      var userRec = $app.findFirstRecordByData('users', 'id', userId)
      if (!userRec) return
      var role = userRec.getString('role')
      if (role === 'Executivo de Contas') {
        processExecutive(userRec)
      } else {
        processConsultant(userRec)
      }
    } catch (_) {}
  }

  var rec = e.record
  var userId = rec.getString('user_id')
  var assignedUser = rec.getString('assigned_user')

  if (userId) processUser(userId)
  if (assignedUser && assignedUser !== userId) processUser(assignedUser)

  return e.next()
}, 'service_records')

onRecordAfterUpdateSuccess((e) => {
  function getLevelForXp(xp) {
    if (xp >= 2000) return 'Master'
    if (xp >= 1000) return 'Expert'
    if (xp >= 600) return 'Sênior'
    if (xp >= 300) return 'Pleno'
    if (xp >= 100) return 'Júnior'
    return 'Aprendiz'
  }

  function processExecutive(userRec) {
    var userId = userRec.id
    var userName = userRec.getString('name')
    var userEmail = userRec.getString('email')

    var execRecs = []
    try {
      if ($app.hasTable('account_executives')) {
        execRecs = $app.findRecordsByFilter(
          'account_executives',
          "email = '" + userEmail + "' || name = '" + userName + "'",
          '',
          1,
          0,
        )
      }
    } catch (_) {}

    var execId = execRecs.length > 0 ? execRecs[0].id : ''

    var clientFilter = "account_executive = '" + userName + "'"
    if (execId) {
      clientFilter =
        "account_executive_rel = '" + execId + "' || account_executive = '" + userName + "'"
    }

    var managedClients = []
    try {
      managedClients = $app.findRecordsByFilter('clients', clientFilter, '', 500, 0)
    } catch (_) {}

    if (!managedClients || managedClients.length === 0) {
      try {
        var userBases = userRec.get('bases') || []
        if (Array.isArray(userBases) && userBases.length > 0) {
          managedClients = $app.findRecordsByFilter('clients', "id != ''", '', 500, 0)
        }
      } catch (_) {}
    }

    var now = new Date()
    var currentMonthStr = now.getFullYear() + '-' + String(now.getMonth() + 1).padStart(2, '0')
    var prevMonthDate = new Date(now.getFullYear(), now.getMonth() - 1, 1)
    var prevMonthStr =
      prevMonthDate.getFullYear() + '-' + String(prevMonthDate.getMonth() + 1).padStart(2, '0')

    var highAutonomyClients = 0
    var perfectAutonomyClients = 0
    var evolvingClients = 0
    var trainedClients = 0
    var totalManaged = managedClients ? managedClients.length : 0
    var positiveClientsFeedback = 0
    var sumAutonomy = 0

    var clientIds = []
    var clientCompanies = []
    for (var mi = 0; mi < managedClients.length; mi++) {
      clientIds.push(managedClients[mi].id)
      var comp = managedClients[mi].getString('company')
      if (comp) clientCompanies.push(comp)
    }

    for (var ci = 0; ci < managedClients.length; ci++) {
      var cRec = managedClients[ci]
      var cId = cRec.id
      var cComp = cRec.getString('company')

      var recFilter = "client = '" + cId + "'"
      if (cComp) {
        recFilter = "client = '" + cId + "' || client_company = '" + cComp + "'"
      }

      var cRecords = []
      try {
        cRecords = $app.findRecordsByFilter('service_records', recFilter, 'created', 1000, 0)
      } catch (_) {}

      var totalCalls = cRecords.length
      var avoidableCalls = 0
      var curMonthTotal = 0
      var curMonthAvoidable = 0
      var prevMonthTotal = 0
      var prevMonthAvoidable = 0

      for (var cri = 0; cri < cRecords.length; cri++) {
        var cr = cRecords[cri]
        var isAvoidable = cr.getBool('avoidable_contact')
        if (isAvoidable) avoidableCalls += 1

        var cDate = cr.getString('created') || ''
        if (cDate.startsWith(currentMonthStr)) {
          curMonthTotal += 1
          if (isAvoidable) curMonthAvoidable += 1
        } else if (cDate.startsWith(prevMonthStr)) {
          prevMonthTotal += 1
          if (isAvoidable) prevMonthAvoidable += 1
        }
      }

      var cAutonomyRate =
        totalCalls > 0 ? Math.round(((totalCalls - avoidableCalls) / totalCalls) * 100) : 100
      sumAutonomy += cAutonomyRate

      if (cAutonomyRate >= 80) highAutonomyClients += 1
      if (totalCalls > 0 && avoidableCalls === 0) perfectAutonomyClients += 1

      var curAutonomy =
        curMonthTotal > 0 ? ((curMonthTotal - curMonthAvoidable) / curMonthTotal) * 100 : 100
      var prevAutonomy =
        prevMonthTotal > 0 ? ((prevMonthTotal - prevMonthAvoidable) / prevMonthTotal) * 100 : 100

      if (curAutonomy > prevAutonomy || (curAutonomy >= 80 && prevMonthTotal === 0)) {
        evolvingClients += 1
      }

      try {
        if ($app.hasTable('trainings')) {
          var trList = $app.findRecordsByFilter('trainings', "client = '" + cId + "'", '', 1, 0)
          if (trList && trList.length > 0) {
            trainedClients += 1
          }
        }
      } catch (_) {}
    }

    try {
      if ($app.hasTable('call_analysis_logs')) {
        for (var fci = 0; fci < clientIds.length; fci++) {
          var clId = clientIds[fci]
          var logs = $app.findRecordsByFilter(
            'call_analysis_logs',
            "client = '" + clId + "' && (sentiment ~ 'positivo' || sentiment ~ 'positive')",
            '',
            10,
            0,
          )
          positiveClientsFeedback += logs.length
        }
      }
    } catch (_) {}

    var avgAutonomy = totalManaged > 0 ? Math.round(sumAutonomy / totalManaged) : 100

    var execXP =
      highAutonomyClients * 40 +
      perfectAutonomyClients * 60 +
      evolvingClients * 50 +
      trainedClients * 30 +
      positiveClientsFeedback * 10 +
      Math.round(avgAutonomy * 2)

    var calculatedXP = Math.max(0, execXP)
    var calculatedLevel = getLevelForXp(calculatedXP)

    var unlockedBadgesMap = {}
    if (highAutonomyClients >= 3) unlockedBadgesMap['gestor_autonomia'] = true
    if (evolvingClients >= 1) unlockedBadgesMap['mestre_da_evolucao'] = true
    if (totalManaged > 0 && highAutonomyClients / totalManaged >= 0.7)
      unlockedBadgesMap['scorecard_ouro'] = true
    if (perfectAutonomyClients >= 1) unlockedBadgesMap['cliente_blindado'] = true
    if (trainedClients >= 1) unlockedBadgesMap['mentor_de_agencias'] = true
    if (positiveClientsFeedback >= 5) unlockedBadgesMap['carteira_satisfeita'] = true
    if (highAutonomyClients >= 5) unlockedBadgesMap['expansao_autonoma'] = true
    if (calculatedXP >= 1000) unlockedBadgesMap['executivo_diamante'] = true

    var existingBadgeRecords = []
    try {
      if ($app.hasTable('badges')) {
        existingBadgeRecords = $app.findRecordsByFilter(
          'badges',
          "user_id = '" + userId + "'",
          'created',
          100,
          0,
        )
        for (var b = 0; b < existingBadgeRecords.length; b++) {
          unlockedBadgesMap[existingBadgeRecords[b].getString('badge_key')] = true
        }
      }
    } catch (_) {}

    var badgesCol = $app.findCollectionByNameOrId('badges')
    var nowIso = new Date().toISOString()
    var newlyUnlockedKeys = []
    var currentBadgeKeys = Object.keys(unlockedBadgesMap)

    for (var bi = 0; bi < currentBadgeKeys.length; bi++) {
      var bKey = currentBadgeKeys[bi]
      var found = false
      for (var ej = 0; ej < existingBadgeRecords.length; ej++) {
        if (existingBadgeRecords[ej].getString('badge_key') === bKey) {
          found = true
          break
        }
      }
      if (!found) {
        try {
          var bRec = new Record(badgesCol)
          bRec.set('user_id', userId)
          bRec.set('badge_key', bKey)
          bRec.set('unlocked_at', nowIso)
          $app.save(bRec)
          newlyUnlockedKeys.push(bKey)
        } catch (_) {}
      }
    }

    var gamificationCol = $app.findCollectionByNameOrId('gamification')
    var gamificationRec = null
    try {
      gamificationRec = $app.findFirstRecordByData('gamification', 'user_id', userId)
    } catch (_) {
      gamificationRec = new Record(gamificationCol)
      gamificationRec.set('user_id', userId)
    }

    var previousLevel = gamificationRec.getString('level') || 'Aprendiz'
    gamificationRec.set('xp', calculatedXP)
    gamificationRec.set('level', calculatedLevel)
    gamificationRec.set('badges', currentBadgeKeys)
    gamificationRec.set('daily_record', highAutonomyClients)
    gamificationRec.set('streak_days', evolvingClients)
    gamificationRec.set('consecutive_months', 0)
    if (newlyUnlockedKeys.length > 0) {
      gamificationRec.set('last_badge_unlocked_at', nowIso)
    }
    $app.save(gamificationRec)

    if (previousLevel !== calculatedLevel && previousLevel !== '') {
      try {
        var notifCol = $app.findCollectionByNameOrId('notifications')
        var lvlNotif = new Record(notifCol)
        lvlNotif.set('user_id', userId)
        lvlNotif.set('title', '🎉 Parabéns! Você subiu de nível na Gestão de Contas!')
        lvlNotif.set(
          'message',
          'Você atingiu o nível ' +
            calculatedLevel +
            ' com ' +
            calculatedXP +
            ' XP de Autonomia de Clientes!',
        )
        lvlNotif.set('type', 'success')
        lvlNotif.set('read', false)
        lvlNotif.set('link', '/ranking')
        $app.save(lvlNotif)
      } catch (_) {}
    }
  }

  function processConsultant(userRec) {
    var userId = userRec.id
    var globalTargetTma = 15
    var dailyTargetCount = 10

    try {
      if ($app.hasTable('global_targets')) {
        var gtList = $app.findRecordsByFilter('global_targets', '', '-created', 1, 0)
        if (gtList && gtList.length > 0) {
          var gt = gtList[0]
          var gtTma = gt.getInt('avg_response_time_target')
          if (gtTma > 0) globalTargetTma = gtTma
          var gtMonthly = gt.getInt('monthly_attendance_target')
          if (gtMonthly > 0) {
            dailyTargetCount = Math.max(3, Math.round(gtMonthly / 22))
          }
        }
      }
    } catch (_) {}

    try {
      if ($app.hasTable('user_targets')) {
        var utList = $app.findRecordsByFilter('user_targets', "user = '" + userId + "'", '', 1, 0)
        if (utList && utList.length > 0) {
          var ut = utList[0]
          var utTma = ut.getInt('avg_response_time_target')
          if (utTma > 0) globalTargetTma = utTma
          var utMonthly = ut.getInt('monthly_attendance_target')
          if (utMonthly > 0) {
            dailyTargetCount = Math.max(3, Math.round(utMonthly / 22))
          }
        }
      }
    } catch (_) {}

    var records = []
    try {
      records = $app.findRecordsByFilter(
        'service_records',
        "user_id = '" + userId + "' || assigned_user = '" + userId + "'",
        'created',
        5000,
        0,
      )
    } catch (_) {
      return
    }

    var positiveSentimentsCount = 0
    var aiCategorizedCount = 0
    var sharedCount = 0

    try {
      if ($app.hasTable('service_record_shares')) {
        var shares = $app.findRecordsByFilter(
          'service_record_shares',
          "shared_by = '" + userId + "'",
          '',
          100,
          0,
        )
        sharedCount = shares.length
      }
    } catch (_) {}

    var dayMap = {}
    var totalAvoidable = 0
    var totalReopenedResolved = 0
    var totalCompleted = 0
    var totalCompletedWithinTma = 0

    for (var i = 0; i < records.length; i++) {
      var r = records[i]
      var status = r.getString('status')
      var isCompleted = status === 'Concluído'
      var duration = r.getInt('duration')
      var created = r.getString('created')
      var dayStr = created ? created.substring(0, 10) : '2025-01-01'
      var isAvoidable = r.getBool('avoidable_contact')
      var reopenJust = r.getString('reopen_justification')

      if (!dayMap[dayStr]) {
        dayMap[dayStr] = { total: 0, completed: 0, durations: [] }
      }

      dayMap[dayStr].total += 1
      if (isCompleted) {
        dayMap[dayStr].completed += 1
        totalCompleted += 1
        if (duration > 0) {
          dayMap[dayStr].durations.push(duration)
          if (duration <= globalTargetTma) {
            totalCompletedWithinTma += 1
          }
        }
        if (reopenJust && reopenJust.trim() !== '') {
          totalReopenedResolved += 1
        }
      }

      if (isAvoidable) {
        totalAvoidable += 1
      }
    }

    try {
      if ($app.hasTable('call_analysis_logs')) {
        var cLogs = $app.findRecordsByFilter(
          'call_analysis_logs',
          "processed_by = '" + userId + "'",
          '',
          1000,
          0,
        )
        for (var ci = 0; ci < cLogs.length; ci++) {
          var sent = cLogs[ci].getString('sentiment')
          if (
            sent &&
            (sent.toLowerCase().indexOf('positivo') !== -1 ||
              sent.toLowerCase().indexOf('positive') !== -1)
          ) {
            positiveSentimentsCount += 1
          }
          if (cLogs[ci].getString('category')) {
            aiCategorizedCount += 1
          }
        }
      }
    } catch (_) {}

    try {
      if ($app.hasTable('email_analysis_logs')) {
        var eLogs = $app.findRecordsByFilter(
          'email_analysis_logs',
          "processed_by = '" + userId + "'",
          '',
          1000,
          0,
        )
        for (var ei = 0; ei < eLogs.length; ei++) {
          var eSent = eLogs[ei].getString('sentiment')
          if (
            eSent &&
            (eSent.toLowerCase().indexOf('positivo') !== -1 ||
              eSent.toLowerCase().indexOf('positive') !== -1)
          ) {
            positiveSentimentsCount += 1
          }
          if (eLogs[ei].getString('category')) {
            aiCategorizedCount += 1
          }
        }
      }
    } catch (_) {}

    var sortedDays = Object.keys(dayMap).sort()
    var maxDailyRecord = 0
    var currentDailyStreak = 0
    var maxDailyStreak = 0
    var consecutiveTmaDays = 0
    var maxConsecutiveTmaDays = 0
    var daysMeetingDailyTarget = 0

    for (var d = 0; d < sortedDays.length; d++) {
      var dayData = dayMap[sortedDays[d]]
      if (dayData.completed > maxDailyRecord) {
        maxDailyRecord = dayData.completed
      }

      if (dayData.durations.length > 0) {
        var sumDur = 0
        for (var sd = 0; sd < dayData.durations.length; sd++) {
          sumDur += dayData.durations[sd]
        }
        var dayAvg = sumDur / dayData.durations.length
        if (dayAvg <= globalTargetTma) {
          consecutiveTmaDays += 1
          if (consecutiveTmaDays > maxConsecutiveTmaDays) {
            maxConsecutiveTmaDays = consecutiveTmaDays
          }
        } else {
          consecutiveTmaDays = 0
        }
      } else {
        consecutiveTmaDays = 0
      }

      if (dayData.completed >= dailyTargetCount) {
        daysMeetingDailyTarget += 1
        currentDailyStreak += 1
        if (currentDailyStreak > maxDailyStreak) {
          maxDailyStreak = currentDailyStreak
        }
      } else {
        currentDailyStreak = 0
      }
    }

    var streakMultiplier = 1.0
    if (maxDailyStreak > 1) {
      streakMultiplier = Math.min(2.0, 1.0 + (maxDailyStreak - 1) * 0.1)
    }

    var baseXP =
      totalCompleted * 10 +
      totalCompletedWithinTma * 5 +
      totalAvoidable * 3 +
      aiCategorizedCount * 2 +
      positiveSentimentsCount * 5 +
      totalReopenedResolved * 15 +
      Math.round(daysMeetingDailyTarget * 20 * streakMultiplier)

    var calculatedXP = Math.max(0, baseXP)
    var calculatedLevel = getLevelForXp(calculatedXP)

    var unlockedBadgesMap = {}
    if (totalCompleted >= 1) unlockedBadgesMap['novato'] = true
    if (maxConsecutiveTmaDays >= 5) unlockedBadgesMap['velocista'] = true
    if (totalAvoidable >= 10) unlockedBadgesMap['olho_clinico'] = true
    if (positiveSentimentsCount >= 10) unlockedBadgesMap['cliente_feliz'] = true
    if (maxDailyRecord >= 50) unlockedBadgesMap['maratonista'] = true
    if (maxDailyRecord > dailyTargetCount && maxDailyRecord >= 5)
      unlockedBadgesMap['recorde_pessoal'] = true
    if (sharedCount >= 1) unlockedBadgesMap['trabalho_equipe'] = true
    if (aiCategorizedCount >= 10) unlockedBadgesMap['categorizador_nato'] = true

    var existingBadgeRecords = []
    try {
      if ($app.hasTable('badges')) {
        existingBadgeRecords = $app.findRecordsByFilter(
          'badges',
          "user_id = '" + userId + "'",
          'created',
          100,
          0,
        )
        for (var b = 0; b < existingBadgeRecords.length; b++) {
          unlockedBadgesMap[existingBadgeRecords[b].getString('badge_key')] = true
        }
      }
    } catch (_) {}

    var badgesCol = $app.findCollectionByNameOrId('badges')
    var nowIso = new Date().toISOString()
    var newlyUnlockedKeys = []
    var currentBadgeKeys = Object.keys(unlockedBadgesMap)

    for (var bi = 0; bi < currentBadgeKeys.length; bi++) {
      var bKey = currentBadgeKeys[bi]
      var found = false
      for (var ej = 0; ej < existingBadgeRecords.length; ej++) {
        if (existingBadgeRecords[ej].getString('badge_key') === bKey) {
          found = true
          break
        }
      }
      if (!found) {
        try {
          var bRec = new Record(badgesCol)
          bRec.set('user_id', userId)
          bRec.set('badge_key', bKey)
          bRec.set('unlocked_at', nowIso)
          $app.save(bRec)
          newlyUnlockedKeys.push(bKey)
        } catch (_) {}
      }
    }

    var gamificationCol = $app.findCollectionByNameOrId('gamification')
    var gamificationRec = null
    try {
      gamificationRec = $app.findFirstRecordByData('gamification', 'user_id', userId)
    } catch (_) {
      gamificationRec = new Record(gamificationCol)
      gamificationRec.set('user_id', userId)
    }

    var previousLevel = gamificationRec.getString('level') || 'Aprendiz'
    gamificationRec.set('xp', calculatedXP)
    gamificationRec.set('level', calculatedLevel)
    gamificationRec.set('badges', currentBadgeKeys)
    gamificationRec.set('daily_record', maxDailyRecord)
    gamificationRec.set('streak_days', maxDailyStreak)
    gamificationRec.set('consecutive_months', 0)
    if (newlyUnlockedKeys.length > 0) {
      gamificationRec.set('last_badge_unlocked_at', nowIso)
    }
    $app.save(gamificationRec)

    if (previousLevel !== calculatedLevel && previousLevel !== '') {
      try {
        var notifCol = $app.findCollectionByNameOrId('notifications')
        var lvlNotif = new Record(notifCol)
        lvlNotif.set('user_id', userId)
        lvlNotif.set('title', '🎉 Parabéns! Você subiu de nível!')
        lvlNotif.set(
          'message',
          'Você atingiu o nível ' + calculatedLevel + ' com ' + calculatedXP + ' XP!',
        )
        lvlNotif.set('type', 'success')
        lvlNotif.set('read', false)
        lvlNotif.set('link', '/ranking')
        $app.save(lvlNotif)
      } catch (_) {}
    }
  }

  function processUser(userId) {
    if (!userId || typeof userId !== 'string' || userId.trim() === '') return
    try {
      var userRec = $app.findFirstRecordByData('users', 'id', userId)
      if (!userRec) return
      var role = userRec.getString('role')
      if (role === 'Executivo de Contas') {
        processExecutive(userRec)
      } else {
        processConsultant(userRec)
      }
    } catch (_) {}
  }

  var rec = e.record
  var userId = rec.getString('user_id')
  var assignedUser = rec.getString('assigned_user')

  if (userId) processUser(userId)
  if (assignedUser && assignedUser !== userId) processUser(assignedUser)

  return e.next()
}, 'service_records')

// Rota POST para recalcular gamificação
routerAdd('POST', '/backend/v1/gamification/recalculate', (c) => {
  var info = c.requestInfo()
  var authRecord = info.authRecord
  if (!authRecord) {
    return c.json(401, { error: 'Não autenticado' })
  }

  function getLevelForXp(xp) {
    if (xp >= 2000) return 'Master'
    if (xp >= 1000) return 'Expert'
    if (xp >= 600) return 'Sênior'
    if (xp >= 300) return 'Pleno'
    if (xp >= 100) return 'Júnior'
    return 'Aprendiz'
  }

  function calculateForExecutive(userRec) {
    var userId = userRec.id
    var userName = userRec.getString('name')
    var userEmail = userRec.getString('email')

    var execRecs = []
    try {
      if ($app.hasTable('account_executives')) {
        execRecs = $app.findRecordsByFilter(
          'account_executives',
          "email = '" + userEmail + "' || name = '" + userName + "'",
          '',
          1,
          0,
        )
      }
    } catch (_) {}

    var execId = execRecs.length > 0 ? execRecs[0].id : ''

    var clientFilter = "account_executive = '" + userName + "'"
    if (execId) {
      clientFilter =
        "account_executive_rel = '" + execId + "' || account_executive = '" + userName + "'"
    }

    var managedClients = []
    try {
      managedClients = $app.findRecordsByFilter('clients', clientFilter, '', 500, 0)
    } catch (_) {}

    if (!managedClients || managedClients.length === 0) {
      try {
        var userBases = userRec.get('bases') || []
        if (Array.isArray(userBases) && userBases.length > 0) {
          managedClients = $app.findRecordsByFilter('clients', "id != ''", '', 500, 0)
        }
      } catch (_) {}
    }

    var now = new Date()
    var currentMonthStr = now.getFullYear() + '-' + String(now.getMonth() + 1).padStart(2, '0')
    var prevMonthDate = new Date(now.getFullYear(), now.getMonth() - 1, 1)
    var prevMonthStr =
      prevMonthDate.getFullYear() + '-' + String(prevMonthDate.getMonth() + 1).padStart(2, '0')

    var highAutonomyClients = 0
    var perfectAutonomyClients = 0
    var evolvingClients = 0
    var trainedClients = 0
    var totalManaged = managedClients ? managedClients.length : 0
    var positiveClientsFeedback = 0
    var sumAutonomy = 0

    var clientIds = []
    for (var mi = 0; mi < managedClients.length; mi++) {
      clientIds.push(managedClients[mi].id)
    }

    for (var ci = 0; ci < managedClients.length; ci++) {
      var cRec = managedClients[ci]
      var cId = cRec.id
      var cComp = cRec.getString('company')

      var recFilter = "client = '" + cId + "'"
      if (cComp) {
        recFilter = "client = '" + cId + "' || client_company = '" + cComp + "'"
      }

      var cRecords = []
      try {
        cRecords = $app.findRecordsByFilter('service_records', recFilter, 'created', 1000, 0)
      } catch (_) {}

      var totalCalls = cRecords.length
      var avoidableCalls = 0
      var curMonthTotal = 0
      var curMonthAvoidable = 0
      var prevMonthTotal = 0
      var prevMonthAvoidable = 0

      for (var cri = 0; cri < cRecords.length; cri++) {
        var cr = cRecords[cri]
        var isAvoidable = cr.getBool('avoidable_contact')
        if (isAvoidable) avoidableCalls += 1

        var cDate = cr.getString('created') || ''
        if (cDate.startsWith(currentMonthStr)) {
          curMonthTotal += 1
          if (isAvoidable) curMonthAvoidable += 1
        } else if (cDate.startsWith(prevMonthStr)) {
          prevMonthTotal += 1
          if (isAvoidable) prevMonthAvoidable += 1
        }
      }

      var cAutonomyRate =
        totalCalls > 0 ? Math.round(((totalCalls - avoidableCalls) / totalCalls) * 100) : 100
      sumAutonomy += cAutonomyRate

      if (cAutonomyRate >= 80) highAutonomyClients += 1
      if (totalCalls > 0 && avoidableCalls === 0) perfectAutonomyClients += 1

      var curAutonomy =
        curMonthTotal > 0 ? ((curMonthTotal - curMonthAvoidable) / curMonthTotal) * 100 : 100
      var prevAutonomy =
        prevMonthTotal > 0 ? ((prevMonthTotal - prevMonthAvoidable) / prevMonthTotal) * 100 : 100

      if (curAutonomy > prevAutonomy || (curAutonomy >= 80 && prevMonthTotal === 0)) {
        evolvingClients += 1
      }

      try {
        if ($app.hasTable('trainings')) {
          var trList = $app.findRecordsByFilter('trainings', "client = '" + cId + "'", '', 1, 0)
          if (trList && trList.length > 0) {
            trainedClients += 1
          }
        }
      } catch (_) {}
    }

    try {
      if ($app.hasTable('call_analysis_logs')) {
        for (var fci = 0; fci < clientIds.length; fci++) {
          var clId = clientIds[fci]
          var logs = $app.findRecordsByFilter(
            'call_analysis_logs',
            "client = '" + clId + "' && (sentiment ~ 'positivo' || sentiment ~ 'positive')",
            '',
            10,
            0,
          )
          positiveClientsFeedback += logs.length
        }
      }
    } catch (_) {}

    var avgAutonomy = totalManaged > 0 ? Math.round(sumAutonomy / totalManaged) : 100

    var execXP =
      highAutonomyClients * 40 +
      perfectAutonomyClients * 60 +
      evolvingClients * 50 +
      trainedClients * 30 +
      positiveClientsFeedback * 10 +
      Math.round(avgAutonomy * 2)

    var calculatedXP = Math.max(0, execXP)
    var calculatedLevel = getLevelForXp(calculatedXP)

    var unlockedBadgesMap = {}
    if (highAutonomyClients >= 3) unlockedBadgesMap['gestor_autonomia'] = true
    if (evolvingClients >= 1) unlockedBadgesMap['mestre_da_evolucao'] = true
    if (totalManaged > 0 && highAutonomyClients / totalManaged >= 0.7)
      unlockedBadgesMap['scorecard_ouro'] = true
    if (perfectAutonomyClients >= 1) unlockedBadgesMap['cliente_blindado'] = true
    if (trainedClients >= 1) unlockedBadgesMap['mentor_de_agencias'] = true
    if (positiveClientsFeedback >= 5) unlockedBadgesMap['carteira_satisfeita'] = true
    if (highAutonomyClients >= 5) unlockedBadgesMap['expansao_autonoma'] = true
    if (calculatedXP >= 1000) unlockedBadgesMap['executivo_diamante'] = true

    var existingBadgeRecords = []
    try {
      if ($app.hasTable('badges')) {
        existingBadgeRecords = $app.findRecordsByFilter(
          'badges',
          "user_id = '" + userId + "'",
          'created',
          100,
          0,
        )
        for (var b = 0; b < existingBadgeRecords.length; b++) {
          unlockedBadgesMap[existingBadgeRecords[b].getString('badge_key')] = true
        }
      }
    } catch (_) {}

    var badgesCol = $app.findCollectionByNameOrId('badges')
    var nowIso = new Date().toISOString()
    var newlyUnlockedKeys = []
    var currentBadgeKeys = Object.keys(unlockedBadgesMap)

    for (var bi = 0; bi < currentBadgeKeys.length; bi++) {
      var bKey = currentBadgeKeys[bi]
      var found = false
      for (var ej = 0; ej < existingBadgeRecords.length; ej++) {
        if (existingBadgeRecords[ej].getString('badge_key') === bKey) {
          found = true
          break
        }
      }
      if (!found) {
        try {
          var bRec = new Record(badgesCol)
          bRec.set('user_id', userId)
          bRec.set('badge_key', bKey)
          bRec.set('unlocked_at', nowIso)
          $app.save(bRec)
          newlyUnlockedKeys.push(bKey)
        } catch (_) {}
      }
    }

    var gamificationCol = $app.findCollectionByNameOrId('gamification')
    var gamificationRec = null
    try {
      gamificationRec = $app.findFirstRecordByData('gamification', 'user_id', userId)
    } catch (_) {
      gamificationRec = new Record(gamificationCol)
      gamificationRec.set('user_id', userId)
    }

    gamificationRec.set('xp', calculatedXP)
    gamificationRec.set('level', calculatedLevel)
    gamificationRec.set('badges', currentBadgeKeys)
    gamificationRec.set('daily_record', highAutonomyClients)
    gamificationRec.set('streak_days', evolvingClients)
    gamificationRec.set('consecutive_months', 0)
    if (newlyUnlockedKeys.length > 0) {
      gamificationRec.set('last_badge_unlocked_at', nowIso)
    }
    $app.save(gamificationRec)

    return {
      xp: calculatedXP,
      level: calculatedLevel,
      badges: currentBadgeKeys,
      daily_record: highAutonomyClients,
      streak_days: evolvingClients,
    }
  }

  function calculateForConsultant(userRec) {
    var userId = userRec.id
    var globalTargetTma = 15
    var dailyTargetCount = 10

    try {
      if ($app.hasTable('global_targets')) {
        var gtList = $app.findRecordsByFilter('global_targets', '', '-created', 1, 0)
        if (gtList && gtList.length > 0) {
          var gt = gtList[0]
          var gtTma = gt.getInt('avg_response_time_target')
          if (gtTma > 0) globalTargetTma = gtTma
          var gtMonthly = gt.getInt('monthly_attendance_target')
          if (gtMonthly > 0) {
            dailyTargetCount = Math.max(3, Math.round(gtMonthly / 22))
          }
        }
      }
    } catch (_) {}

    try {
      if ($app.hasTable('user_targets')) {
        var utList = $app.findRecordsByFilter('user_targets', "user = '" + userId + "'", '', 1, 0)
        if (utList && utList.length > 0) {
          var ut = utList[0]
          var utTma = ut.getInt('avg_response_time_target')
          if (utTma > 0) globalTargetTma = utTma
          var utMonthly = ut.getInt('monthly_attendance_target')
          if (utMonthly > 0) {
            dailyTargetCount = Math.max(3, Math.round(utMonthly / 22))
          }
        }
      }
    } catch (_) {}

    var records = []
    try {
      records = $app.findRecordsByFilter(
        'service_records',
        "user_id = '" + userId + "' || assigned_user = '" + userId + "'",
        'created',
        5000,
        0,
      )
    } catch (_) {
      return null
    }

    var positiveSentimentsCount = 0
    var aiCategorizedCount = 0
    var sharedCount = 0

    try {
      if ($app.hasTable('service_record_shares')) {
        var shares = $app.findRecordsByFilter(
          'service_record_shares',
          "shared_by = '" + userId + "'",
          '',
          100,
          0,
        )
        sharedCount = shares.length
      }
    } catch (_) {}

    var dayMap = {}
    var totalAvoidable = 0
    var totalReopenedResolved = 0
    var totalCompleted = 0
    var totalCompletedWithinTma = 0

    for (var i = 0; i < records.length; i++) {
      var r = records[i]
      var status = r.getString('status')
      var isCompleted = status === 'Concluído'
      var duration = r.getInt('duration')
      var created = r.getString('created')
      var dayStr = created ? created.substring(0, 10) : '2025-01-01'
      var isAvoidable = r.getBool('avoidable_contact')
      var reopenJust = r.getString('reopen_justification')

      if (!dayMap[dayStr]) {
        dayMap[dayStr] = { total: 0, completed: 0, durations: [] }
      }

      dayMap[dayStr].total += 1
      if (isCompleted) {
        dayMap[dayStr].completed += 1
        totalCompleted += 1
        if (duration > 0) {
          dayMap[dayStr].durations.push(duration)
          if (duration <= globalTargetTma) {
            totalCompletedWithinTma += 1
          }
        }
        if (reopenJust && reopenJust.trim() !== '') {
          totalReopenedResolved += 1
        }
      }

      if (isAvoidable) {
        totalAvoidable += 1
      }
    }

    try {
      if ($app.hasTable('call_analysis_logs')) {
        var cLogs = $app.findRecordsByFilter(
          'call_analysis_logs',
          "processed_by = '" + userId + "'",
          '',
          1000,
          0,
        )
        for (var ci = 0; ci < cLogs.length; ci++) {
          var sent = cLogs[ci].getString('sentiment')
          if (
            sent &&
            (sent.toLowerCase().indexOf('positivo') !== -1 ||
              sent.toLowerCase().indexOf('positive') !== -1)
          ) {
            positiveSentimentsCount += 1
          }
          if (cLogs[ci].getString('category')) {
            aiCategorizedCount += 1
          }
        }
      }
    } catch (_) {}

    try {
      if ($app.hasTable('email_analysis_logs')) {
        var eLogs = $app.findRecordsByFilter(
          'email_analysis_logs',
          "processed_by = '" + userId + "'",
          '',
          1000,
          0,
        )
        for (var ei = 0; ei < eLogs.length; ei++) {
          var eSent = eLogs[ei].getString('sentiment')
          if (
            eSent &&
            (eSent.toLowerCase().indexOf('positivo') !== -1 ||
              eSent.toLowerCase().indexOf('positive') !== -1)
          ) {
            positiveSentimentsCount += 1
          }
          if (eLogs[ei].getString('category')) {
            aiCategorizedCount += 1
          }
        }
      }
    } catch (_) {}

    var sortedDays = Object.keys(dayMap).sort()
    var maxDailyRecord = 0
    var currentDailyStreak = 0
    var maxDailyStreak = 0
    var consecutiveTmaDays = 0
    var maxConsecutiveTmaDays = 0
    var daysMeetingDailyTarget = 0

    for (var d = 0; d < sortedDays.length; d++) {
      var dayData = dayMap[sortedDays[d]]
      if (dayData.completed > maxDailyRecord) {
        maxDailyRecord = dayData.completed
      }

      if (dayData.durations.length > 0) {
        var sumDur = 0
        for (var sd = 0; sd < dayData.durations.length; sd++) {
          sumDur += dayData.durations[sd]
        }
        var dayAvg = sumDur / dayData.durations.length
        if (dayAvg <= globalTargetTma) {
          consecutiveTmaDays += 1
          if (consecutiveTmaDays > maxConsecutiveTmaDays) {
            maxConsecutiveTmaDays = consecutiveTmaDays
          }
        } else {
          consecutiveTmaDays = 0
        }
      } else {
        consecutiveTmaDays = 0
      }

      if (dayData.completed >= dailyTargetCount) {
        daysMeetingDailyTarget += 1
        currentDailyStreak += 1
        if (currentDailyStreak > maxDailyStreak) {
          maxDailyStreak = currentDailyStreak
        }
      } else {
        currentDailyStreak = 0
      }
    }

    var streakMultiplier = 1.0
    if (maxDailyStreak > 1) {
      streakMultiplier = Math.min(2.0, 1.0 + (maxDailyStreak - 1) * 0.1)
    }

    var baseXP =
      totalCompleted * 10 +
      totalCompletedWithinTma * 5 +
      totalAvoidable * 3 +
      aiCategorizedCount * 2 +
      positiveSentimentsCount * 5 +
      totalReopenedResolved * 15 +
      Math.round(daysMeetingDailyTarget * 20 * streakMultiplier)

    var calculatedXP = Math.max(0, baseXP)
    var calculatedLevel = getLevelForXp(calculatedXP)

    var unlockedBadgesMap = {}
    if (totalCompleted >= 1) unlockedBadgesMap['novato'] = true
    if (maxConsecutiveTmaDays >= 5) unlockedBadgesMap['velocista'] = true
    if (totalAvoidable >= 10) unlockedBadgesMap['olho_clinico'] = true
    if (positiveSentimentsCount >= 10) unlockedBadgesMap['cliente_feliz'] = true
    if (maxDailyRecord >= 50) unlockedBadgesMap['maratonista'] = true
    if (maxDailyRecord > dailyTargetCount && maxDailyRecord >= 5)
      unlockedBadgesMap['recorde_pessoal'] = true
    if (sharedCount >= 1) unlockedBadgesMap['trabalho_equipe'] = true
    if (aiCategorizedCount >= 10) unlockedBadgesMap['categorizador_nato'] = true

    var existingBadgeRecords = []
    try {
      if ($app.hasTable('badges')) {
        existingBadgeRecords = $app.findRecordsByFilter(
          'badges',
          "user_id = '" + userId + "'",
          'created',
          100,
          0,
        )
        for (var b = 0; b < existingBadgeRecords.length; b++) {
          unlockedBadgesMap[existingBadgeRecords[b].getString('badge_key')] = true
        }
      }
    } catch (_) {}

    var badgesCol = $app.findCollectionByNameOrId('badges')
    var nowIso = new Date().toISOString()
    var newlyUnlockedKeys = []
    var currentBadgeKeys = Object.keys(unlockedBadgesMap)

    for (var bi = 0; bi < currentBadgeKeys.length; bi++) {
      var bKey = currentBadgeKeys[bi]
      var found = false
      for (var ej = 0; ej < existingBadgeRecords.length; ej++) {
        if (existingBadgeRecords[ej].getString('badge_key') === bKey) {
          found = true
          break
        }
      }
      if (!found) {
        try {
          var bRec = new Record(badgesCol)
          bRec.set('user_id', userId)
          bRec.set('badge_key', bKey)
          bRec.set('unlocked_at', nowIso)
          $app.save(bRec)
          newlyUnlockedKeys.push(bKey)
        } catch (_) {}
      }
    }

    var gamificationCol = $app.findCollectionByNameOrId('gamification')
    var gamificationRec = null
    try {
      gamificationRec = $app.findFirstRecordByData('gamification', 'user_id', userId)
    } catch (_) {
      gamificationRec = new Record(gamificationCol)
      gamificationRec.set('user_id', userId)
    }

    gamificationRec.set('xp', calculatedXP)
    gamificationRec.set('level', calculatedLevel)
    gamificationRec.set('badges', currentBadgeKeys)
    gamificationRec.set('daily_record', maxDailyRecord)
    gamificationRec.set('streak_days', maxDailyStreak)
    gamificationRec.set('consecutive_months', 0)
    if (newlyUnlockedKeys.length > 0) {
      gamificationRec.set('last_badge_unlocked_at', nowIso)
    }
    $app.save(gamificationRec)

    return {
      xp: calculatedXP,
      level: calculatedLevel,
      badges: currentBadgeKeys,
      daily_record: maxDailyRecord,
      streak_days: maxDailyStreak,
    }
  }

  function calculateForUser(userId) {
    if (!userId || typeof userId !== 'string' || userId.trim() === '') return null
    try {
      var userRec = $app.findFirstRecordByData('users', 'id', userId)
      if (!userRec) return null
      var role = userRec.getString('role')
      if (role === 'Executivo de Contas') {
        return calculateForExecutive(userRec)
      } else {
        return calculateForConsultant(userRec)
      }
    } catch (_) {
      return null
    }
  }

  var data = {}
  try {
    data = info.body || {}
  } catch (_) {}

  var targetUserId = data.user_id || authRecord.id
  var recalcAll = data.all === true

  if (recalcAll) {
    var allUsers = $app.findRecordsByFilter('users', "id != ''", '', 1000, 0)
    var results = []
    for (var u = 0; u < allUsers.length; u++) {
      var r = calculateForUser(allUsers[u].id)
      if (r) results.push({ user_id: allUsers[u].id, ...r })
    }
    return c.json(200, { success: true, count: results.length, data: results })
  }

  var singleResult = calculateForUser(targetUserId)
  return c.json(200, { success: true, data: singleResult })
})
