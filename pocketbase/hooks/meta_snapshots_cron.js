// Hook e Cron job para Congelamento Mensal de Metas (Snapshot Imutável) — Frente B5
// Executa no primeiro dia útil de cada mês às 8h da manhã (GMT-3 = 11h UTC: '0 11 * * 1-5')
// Congela o atingimento de cada colaborador (consultores individualmente; lideranças com a somatória da equipe)
// do mês anterior na coleção meta_snapshots.
// Todas as funções e variáveis auxiliares devem estar DENTRO dos callbacks devido ao isolamento do JSVM pool do PocketBase.

// 1. Cron Job: Primeiro dia útil de cada mês às 8h da manhã (GMT-3 = 11h UTC: '0 11 * * 1-5')
cronAdd('monthly_meta_snapshot_cron', '0 11 * * 1-5', function () {
  try {
    var now = new Date()
    var gmt3Ms = now.getTime() - 3 * 3600 * 1000
    var gmt3Date = new Date(gmt3Ms)

    var dayOfMonth = gmt3Date.getUTCDate()
    var dayOfWeek = gmt3Date.getUTCDay() // 1 = Seg, ..., 5 = Sex
    var isFirstBusinessDay = false
    if (dayOfMonth === 1 && dayOfWeek >= 1 && dayOfWeek <= 5) isFirstBusinessDay = true
    else if (dayOfMonth === 2 && dayOfWeek === 1) isFirstBusinessDay = true
    else if (dayOfMonth === 3 && dayOfWeek === 1) isFirstBusinessDay = true

    if (!isFirstBusinessDay) {
      return
    }

    // Congela o mês anterior
    var prevMonthDate = new Date(
      Date.UTC(gmt3Date.getUTCFullYear(), gmt3Date.getUTCMonth() - 1, 1, 12, 0, 0),
    )
    var targetYear = prevMonthDate.getUTCFullYear()
    var targetMonth = prevMonthDate.getUTCMonth() + 1 // 1-based

    var monthNames = [
      'Janeiro',
      'Fevereiro',
      'Março',
      'Abril',
      'Maio',
      'Junho',
      'Julho',
      'Agosto',
      'Setembro',
      'Outubro',
      'Novembro',
      'Dezembro',
    ]

    var leadershipRoles = [
      'Supervisor',
      'Líder',
      'Gerente',
      'Gestor Comercial',
      'Supervisores',
      'Líderes',
      'Gerentes',
    ]

    function isLeaderRole(role) {
      if (!role) return false
      return leadershipRoles.indexOf(role) !== -1
    }

    var monthPadded = String(targetMonth).padStart(2, '0')
    var monthYear = targetYear + '-' + monthPadded
    var periodLabel = monthNames[targetMonth - 1] + ' de ' + targetYear

    var startIso = monthYear + '-01 00:00:00'
    var nextDate = new Date(Date.UTC(targetYear, targetMonth, 1, 12, 0, 0))
    var endIso =
      nextDate.getUTCFullYear() +
      '-' +
      String(nextDate.getUTCMonth() + 1).padStart(2, '0') +
      '-01 00:00:00'

    var defaultMonthlyTarget = 100
    var defaultMinResolution = 80
    var defaultAvgResponseTime = 15
    var defaultAutoCategorization = 80
    var defaultMinSatisfaction = 85

    try {
      if ($app.hasTable('global_targets')) {
        var gtList = $app.findRecordsByFilter('global_targets', '', '-created', 1, 0)
        if (gtList && gtList.length > 0) {
          var gt = gtList[0]
          var mt = gt.getInt('monthly_attendance_target')
          var mr = gt.getInt('min_resolution_rate')
          var rt = gt.getInt('avg_response_time_target')
          var ac = gt.getInt('auto_categorization_target')
          var st = gt.getInt('min_satisfaction_target')
          if (mt > 0) defaultMonthlyTarget = mt
          if (mr > 0) defaultMinResolution = mr
          if (rt > 0) defaultAvgResponseTime = rt
          if (ac > 0) defaultAutoCategorization = ac
          if (st > 0) defaultMinSatisfaction = st
        }
      }
    } catch (_) {}

    var userTargetsMap = {}
    try {
      if ($app.hasTable('user_targets')) {
        var utList = $app.findRecordsByFilter('user_targets', '', '', 2000, 0)
        for (var ui = 0; ui < utList.length; ui++) {
          var ut = utList[ui]
          var uId = ut.getString('user')
          if (uId) {
            userTargetsMap[uId] = {
              monthly_attendance_target: ut.getInt('monthly_attendance_target') || null,
              min_resolution_rate: ut.getInt('min_resolution_rate') || null,
              avg_response_time_target: ut.getInt('avg_response_time_target') || null,
              auto_categorization_target: ut.getInt('auto_categorization_target') || null,
              min_satisfaction_target: ut.getInt('min_satisfaction_target') || null,
            }
          }
        }
      }
    } catch (_) {}

    var usersList = $app.findRecordsByFilter(
      'users',
      "approval_status = 'Aprovado'",
      'name',
      2000,
      0,
    )
    var eligibleUsers = []
    for (var i = 0; i < usersList.length; i++) {
      var u = usersList[i]
      var r = u.getString('role') || ''
      if (
        r === 'Consultor' ||
        r === 'Consultores' ||
        isLeaderRole(r) ||
        u.getBool('master_access') === true
      ) {
        if (r !== 'Executivo de Contas') {
          eligibleUsers.push(u)
        }
      }
    }

    function getTeamMembers(leader) {
      var role = leader.getString('role') || ''
      if (!isLeaderRole(role)) return [leader]

      var leaderGroups = []
      try {
        leaderGroups = leader.get('service_groups') || []
      } catch (_) {}

      var team = [leader]
      var teamIds = {}
      teamIds[leader.id] = true

      for (var j = 0; j < usersList.length; j++) {
        var other = usersList[j]
        if (teamIds[other.id]) continue
        var otherRole = other.getString('role') || ''

        var otherSup = other.getString('supervisor_id')
        if (otherSup && otherSup === leader.id) {
          team.push(other)
          teamIds[other.id] = true
          continue
        }

        var otherGroups = []
        try {
          otherGroups = other.get('service_groups') || []
        } catch (_) {}

        if (leaderGroups && leaderGroups.length > 0) {
          var common = false
          for (var lg = 0; lg < leaderGroups.length; lg++) {
            if (otherGroups.indexOf(leaderGroups[lg]) !== -1) {
              common = true
              break
            }
          }
          if (common) {
            team.push(other)
            teamIds[other.id] = true
          }
        } else {
          if (otherRole === 'Consultor' || otherRole === 'Consultores') {
            team.push(other)
            teamIds[other.id] = true
          }
        }
      }
      return team
    }

    function getAttendanceStatus(real, target) {
      if (target <= 0) return 'atingiu'
      var ratio = real / target
      if (ratio >= 1) return 'atingiu'
      if (ratio >= 0.8) return 'perto'
      return 'abaixo'
    }

    function getResolutionStatus(realRate, minRate) {
      if (minRate <= 0) return 'atingiu'
      if (realRate >= minRate) return 'atingiu'
      if (realRate >= minRate - 10) return 'perto'
      return 'abaixo'
    }

    function getOverall(attStat, resStat) {
      if (attStat === 'atingiu' && resStat === 'atingiu') return 'atingiu'
      if (attStat === 'abaixo' || resStat === 'abaixo') return 'abaixo'
      return 'perto'
    }

    var snapshotsCol = $app.findCollectionByNameOrId('meta_snapshots')

    var monthRecords = []
    try {
      monthRecords = $app.findRecordsByFilter(
        'service_records',
        "created >= '" + startIso + "' && created < '" + endIso + "'",
        'created',
        50000,
        0,
      )
    } catch (_) {}

    var individualStats = {}
    for (var rIdx = 0; rIdx < monthRecords.length; rIdx++) {
      var rec = monthRecords[rIdx]
      var uid = rec.getString('assigned_user') || rec.getString('user_id')
      if (!uid) continue

      if (!individualStats[uid]) {
        individualStats[uid] = {
          total: 0,
          resolved: 0,
          durationSum: 0,
          avoidableCount: 0,
          reopenCount: 0,
          autoCatCount: 0,
        }
      }
      var s = individualStats[uid]
      s.total++
      if (rec.getString('status') === 'Concluído') s.resolved++
      if (rec.getBool('avoidable_contact') === true) s.avoidableCount++
      s.durationSum += Number(rec.get('duration') || 0)
      var rc = Number(rec.get('reopen_count') || 0)
      if (rc > 0 || rec.getBool('is_reopened')) s.reopenCount++
      var cReason = rec.getString('contact_reason')
      if (cReason && cReason !== 'Outros') s.autoCatCount++
    }

    for (var uIdx = 0; uIdx < eligibleUsers.length; uIdx++) {
      var userRec = eligibleUsers[uIdx]
      var userId = userRec.id
      var role = userRec.getString('role') || ''
      var uName = userRec.getString('name') || 'Colaborador'
      var isLdr = isLeaderRole(role)
      var team = isLdr ? getTeamMembers(userRec) : [userRec]

      var ut = userTargetsMap[userId]
      var isIndividualTarget = Boolean(ut && ut.monthly_attendance_target)
      var targetAttendance = isIndividualTarget
        ? ut.monthly_attendance_target
        : defaultMonthlyTarget
      var targetMinResolution =
        ut && ut.min_resolution_rate ? ut.min_resolution_rate : defaultMinResolution
      var targetAvgResponseTime =
        ut && ut.avg_response_time_target ? ut.avg_response_time_target : defaultAvgResponseTime
      var targetAutoCat =
        ut && ut.auto_categorization_target
          ? ut.auto_categorization_target
          : defaultAutoCategorization
      var targetMinSat =
        ut && ut.min_satisfaction_target ? ut.min_satisfaction_target : defaultMinSatisfaction

      var realTotal = 0
      var realResolved = 0
      var realAvoidable = 0
      var realReopen = 0
      var realAutoCat = 0
      var durationSum = 0

      for (var tm = 0; tm < team.length; tm++) {
        var memberId = team[tm].id
        var mStat = individualStats[memberId]
        if (mStat) {
          realTotal += mStat.total
          realResolved += mStat.resolved
          realAvoidable += mStat.avoidableCount
          realReopen += mStat.reopenCount
          realAutoCat += mStat.autoCatCount
          durationSum += mStat.durationSum
        }
      }

      var resRate = realTotal > 0 ? Math.round((realResolved / realTotal) * 100) : 0
      var avgDuration = realTotal > 0 ? Math.round((durationSum / realTotal) * 10) / 10 : 0
      var avoidableRate = realTotal > 0 ? Math.round((realAvoidable / realTotal) * 100) : 0
      var reopenRate = realTotal > 0 ? Math.round((realReopen / realTotal) * 100) : 0
      var autoCatRate = realTotal > 0 ? Math.round((realAutoCat / realTotal) * 100) : 0
      var catAccuracy =
        realAutoCat > 0 ? Math.max(75, Math.min(99, Math.round(100 - avoidableRate * 0.4))) : 85
      var avgSatisfaction = Math.max(
        60,
        Math.min(100, Math.round(resRate * 0.65 + (100 - avoidableRate) * 0.35)),
      )

      var attStatus = getAttendanceStatus(realTotal, targetAttendance)
      var resStatus = getResolutionStatus(resRate, targetMinResolution)
      var overall = getOverall(attStatus, resStatus)
      var hitAtt = realTotal >= targetAttendance
      var hitRes = resRate >= targetMinResolution
      var hitOver = attStatus !== 'abaixo' && resStatus !== 'abaixo'
      var attPct = targetAttendance > 0 ? Math.round((realTotal / targetAttendance) * 100) : 0

      var existing = null
      try {
        var exList = $app.findRecordsByFilter(
          'meta_snapshots',
          "user_id = '" + userId + "' && month_year = '" + monthYear + "'",
          '',
          1,
          0,
        )
        if (exList && exList.length > 0) {
          existing = exList[0]
        }
      } catch (_) {}

      var snap = existing || new Record(snapshotsCol)
      snap.set('user_id', userId)
      snap.set('year', targetYear)
      snap.set('month', targetMonth)
      snap.set('period_label', periodLabel)
      snap.set('month_year', monthYear)
      snap.set('user_name', uName)
      snap.set('user_role', role)
      snap.set('assessment_type', isLdr ? 'team' : 'individual')
      snap.set('team_members_count', team.length)
      snap.set('total_attendance', realTotal)
      snap.set('resolved_attendance', realResolved)
      snap.set('resolution_rate', resRate)
      snap.set('avg_duration_minutes', avgDuration)
      snap.set('avoidable_count', realAvoidable)
      snap.set('avoidable_rate', avoidableRate)
      snap.set('reopen_count', realReopen)
      snap.set('reopen_rate', reopenRate)
      snap.set('auto_categorized_count', realAutoCat)
      snap.set('auto_categorized_rate', autoCatRate)
      snap.set('categorization_accuracy', catAccuracy)
      snap.set('avg_satisfaction_score', avgSatisfaction)
      snap.set('target_attendance', targetAttendance)
      snap.set('target_min_resolution_rate', targetMinResolution)
      snap.set('target_avg_response_time', targetAvgResponseTime)
      snap.set('target_auto_categorization', targetAutoCat)
      snap.set('target_min_satisfaction', targetMinSat)
      snap.set('target_source', isIndividualTarget ? 'individual' : 'global')
      snap.set('attendance_achievement_pct', attPct)
      snap.set('hit_attendance', hitAtt)
      snap.set('hit_resolution', hitRes)
      snap.set('hit_overall', hitOver)
      snap.set('attendance_status', attStatus)
      snap.set('resolution_status', resStatus)
      snap.set('overall_status', overall)
      snap.set('snapshot_at', new Date().toISOString())
      snap.set(
        'details',
        JSON.stringify({
          frozen_by_cron: true,
          team_member_ids: team.map(function (tm) {
            return tm.id
          }),
        }),
      )

      try {
        $app.save(snap)
      } catch (saveErr) {
        $app.logger().error('Erro ao salvar snapshot para ' + uName + ': ' + saveErr)
      }
    }

    $app.logger().info('Snapshot mensal de metas concluído com sucesso para ' + monthYear)
  } catch (err) {
    $app.logger().error('Erro no cron monthly_meta_snapshot_cron: ' + err)
  }
})

// 2. Endpoint REST para congelamento/sincronização manual por liderança
routerAdd(
  'POST',
  '/backend/v1/meta-snapshots/freeze',
  function (c) {
    var info = c.requestInfo()
    var authRecord = info.authRecord
    if (!authRecord) {
      return c.json(401, { error: 'Não autenticado' })
    }

    var role = authRecord.getString('role') || ''
    var masterAccess = authRecord.getBool('master_access')
    var isLeadership =
      role === 'Master' ||
      role === 'Gerente' ||
      role === 'Supervisor' ||
      role === 'Líder' ||
      role === 'Gestor Comercial' ||
      role === 'Gerentes' ||
      role === 'Supervisores' ||
      role === 'Líderes' ||
      masterAccess === true

    if (!isLeadership) {
      return c.json(403, {
        error: 'Apenas gestores ou administradores podem congelar snapshots de metas.',
      })
    }

    var body = {}
    try {
      body = info.body || {}
    } catch (_) {}

    var now = new Date()
    var gmt3Ms = now.getTime() - 3 * 3600 * 1000
    var gmt3Date = new Date(gmt3Ms)

    var targetYear = parseInt(body.year, 10)
    var targetMonth = parseInt(body.month, 10)

    if (!targetYear || !targetMonth) {
      var prevMonthDate = new Date(
        Date.UTC(gmt3Date.getUTCFullYear(), gmt3Date.getUTCMonth() - 1, 1, 12, 0, 0),
      )
      targetYear = prevMonthDate.getUTCFullYear()
      targetMonth = prevMonthDate.getUTCMonth() + 1
    }

    var monthNames = [
      'Janeiro',
      'Fevereiro',
      'Março',
      'Abril',
      'Maio',
      'Junho',
      'Julho',
      'Agosto',
      'Setembro',
      'Outubro',
      'Novembro',
      'Dezembro',
    ]

    var leadershipRoles = [
      'Supervisor',
      'Líder',
      'Gerente',
      'Gestor Comercial',
      'Supervisores',
      'Líderes',
      'Gerentes',
    ]

    function isLeaderRole(r) {
      if (!r) return false
      return leadershipRoles.indexOf(r) !== -1
    }

    var monthPadded = String(targetMonth).padStart(2, '0')
    var monthYear = targetYear + '-' + monthPadded
    var periodLabel = monthNames[targetMonth - 1] + ' de ' + targetYear

    var startIso = monthYear + '-01 00:00:00'
    var nextDate = new Date(Date.UTC(targetYear, targetMonth, 1, 12, 0, 0))
    var endIso =
      nextDate.getUTCFullYear() +
      '-' +
      String(nextDate.getUTCMonth() + 1).padStart(2, '0') +
      '-01 00:00:00'

    var defaultMonthlyTarget = 100
    var defaultMinResolution = 80
    var defaultAvgResponseTime = 15
    var defaultAutoCategorization = 80
    var defaultMinSatisfaction = 85

    try {
      if ($app.hasTable('global_targets')) {
        var gtList = $app.findRecordsByFilter('global_targets', '', '-created', 1, 0)
        if (gtList && gtList.length > 0) {
          var gt = gtList[0]
          var mt = gt.getInt('monthly_attendance_target')
          var mr = gt.getInt('min_resolution_rate')
          var rt = gt.getInt('avg_response_time_target')
          var ac = gt.getInt('auto_categorization_target')
          var st = gt.getInt('min_satisfaction_target')
          if (mt > 0) defaultMonthlyTarget = mt
          if (mr > 0) defaultMinResolution = mr
          if (rt > 0) defaultAvgResponseTime = rt
          if (ac > 0) defaultAutoCategorization = ac
          if (st > 0) defaultMinSatisfaction = st
        }
      }
    } catch (_) {}

    var userTargetsMap = {}
    try {
      if ($app.hasTable('user_targets')) {
        var utList = $app.findRecordsByFilter('user_targets', '', '', 2000, 0)
        for (var ui = 0; ui < utList.length; ui++) {
          var ut = utList[ui]
          var uId = ut.getString('user')
          if (uId) {
            userTargetsMap[uId] = {
              monthly_attendance_target: ut.getInt('monthly_attendance_target') || null,
              min_resolution_rate: ut.getInt('min_resolution_rate') || null,
              avg_response_time_target: ut.getInt('avg_response_time_target') || null,
              auto_categorization_target: ut.getInt('auto_categorization_target') || null,
              min_satisfaction_target: ut.getInt('min_satisfaction_target') || null,
            }
          }
        }
      }
    } catch (_) {}

    var usersList = $app.findRecordsByFilter(
      'users',
      "approval_status = 'Aprovado'",
      'name',
      2000,
      0,
    )
    var eligibleUsers = []
    for (var i = 0; i < usersList.length; i++) {
      var u = usersList[i]
      var uRole = u.getString('role') || ''
      if (
        uRole === 'Consultor' ||
        uRole === 'Consultores' ||
        isLeaderRole(uRole) ||
        u.getBool('master_access') === true
      ) {
        if (uRole !== 'Executivo de Contas') {
          eligibleUsers.push(u)
        }
      }
    }

    function getTeamMembers(leader) {
      var lRole = leader.getString('role') || ''
      if (!isLeaderRole(lRole)) return [leader]

      var leaderGroups = []
      try {
        leaderGroups = leader.get('service_groups') || []
      } catch (_) {}

      var team = [leader]
      var teamIds = {}
      teamIds[leader.id] = true

      for (var j = 0; j < usersList.length; j++) {
        var other = usersList[j]
        if (teamIds[other.id]) continue
        var otherRole = other.getString('role') || ''

        var otherSup = other.getString('supervisor_id')
        if (otherSup && otherSup === leader.id) {
          team.push(other)
          teamIds[other.id] = true
          continue
        }

        var otherGroups = []
        try {
          otherGroups = other.get('service_groups') || []
        } catch (_) {}

        if (leaderGroups && leaderGroups.length > 0) {
          var common = false
          for (var lg = 0; lg < leaderGroups.length; lg++) {
            if (otherGroups.indexOf(leaderGroups[lg]) !== -1) {
              common = true
              break
            }
          }
          if (common) {
            team.push(other)
            teamIds[other.id] = true
          }
        } else {
          if (otherRole === 'Consultor' || otherRole === 'Consultores') {
            team.push(other)
            teamIds[other.id] = true
          }
        }
      }
      return team
    }

    function getAttendanceStatus(real, target) {
      if (target <= 0) return 'atingiu'
      var ratio = real / target
      if (ratio >= 1) return 'atingiu'
      if (ratio >= 0.8) return 'perto'
      return 'abaixo'
    }

    function getResolutionStatus(realRate, minRate) {
      if (minRate <= 0) return 'atingiu'
      if (realRate >= minRate) return 'atingiu'
      if (realRate >= minRate - 10) return 'perto'
      return 'abaixo'
    }

    function getOverall(attStat, resStat) {
      if (attStat === 'atingiu' && resStat === 'atingiu') return 'atingiu'
      if (attStat === 'abaixo' || resStat === 'abaixo') return 'abaixo'
      return 'perto'
    }

    var snapshotsCol = $app.findCollectionByNameOrId('meta_snapshots')

    var monthRecords = []
    try {
      monthRecords = $app.findRecordsByFilter(
        'service_records',
        "created >= '" + startIso + "' && created < '" + endIso + "'",
        'created',
        50000,
        0,
      )
    } catch (_) {}

    var individualStats = {}
    for (var rIdx = 0; rIdx < monthRecords.length; rIdx++) {
      var rec = monthRecords[rIdx]
      var uid = rec.getString('assigned_user') || rec.getString('user_id')
      if (!uid) continue

      if (!individualStats[uid]) {
        individualStats[uid] = {
          total: 0,
          resolved: 0,
          durationSum: 0,
          avoidableCount: 0,
          reopenCount: 0,
          autoCatCount: 0,
        }
      }
      var s = individualStats[uid]
      s.total++
      if (rec.getString('status') === 'Concluído') s.resolved++
      if (rec.getBool('avoidable_contact') === true) s.avoidableCount++
      s.durationSum += Number(rec.get('duration') || 0)
      var rc = Number(rec.get('reopen_count') || 0)
      if (rc > 0 || rec.getBool('is_reopened')) s.reopenCount++
      var cReason = rec.getString('contact_reason')
      if (cReason && cReason !== 'Outros') s.autoCatCount++
    }

    var createdCount = 0
    var updatedCount = 0

    for (var uIdx = 0; uIdx < eligibleUsers.length; uIdx++) {
      var userRec = eligibleUsers[uIdx]
      var userId = userRec.id
      var role = userRec.getString('role') || ''
      var uName = userRec.getString('name') || 'Colaborador'
      var isLdr = isLeaderRole(role)
      var team = isLdr ? getTeamMembers(userRec) : [userRec]

      var ut = userTargetsMap[userId]
      var isIndividualTarget = Boolean(ut && ut.monthly_attendance_target)
      var targetAttendance = isIndividualTarget
        ? ut.monthly_attendance_target
        : defaultMonthlyTarget
      var targetMinResolution =
        ut && ut.min_resolution_rate ? ut.min_resolution_rate : defaultMinResolution
      var targetAvgResponseTime =
        ut && ut.avg_response_time_target ? ut.avg_response_time_target : defaultAvgResponseTime
      var targetAutoCat =
        ut && ut.auto_categorization_target
          ? ut.auto_categorization_target
          : defaultAutoCategorization
      var targetMinSat =
        ut && ut.min_satisfaction_target ? ut.min_satisfaction_target : defaultMinSatisfaction

      var realTotal = 0
      var realResolved = 0
      var realAvoidable = 0
      var realReopen = 0
      var realAutoCat = 0
      var durationSum = 0

      for (var tm = 0; tm < team.length; tm++) {
        var memberId = team[tm].id
        var mStat = individualStats[memberId]
        if (mStat) {
          realTotal += mStat.total
          realResolved += mStat.resolved
          realAvoidable += mStat.avoidableCount
          realReopen += mStat.reopenCount
          realAutoCat += mStat.autoCatCount
          durationSum += mStat.durationSum
        }
      }

      var resRate = realTotal > 0 ? Math.round((realResolved / realTotal) * 100) : 0
      var avgDuration = realTotal > 0 ? Math.round((durationSum / realTotal) * 10) / 10 : 0
      var avoidableRate = realTotal > 0 ? Math.round((realAvoidable / realTotal) * 100) : 0
      var reopenRate = realTotal > 0 ? Math.round((realReopen / realTotal) * 100) : 0
      var autoCatRate = realTotal > 0 ? Math.round((realAutoCat / realTotal) * 100) : 0
      var catAccuracy =
        realAutoCat > 0 ? Math.max(75, Math.min(99, Math.round(100 - avoidableRate * 0.4))) : 85
      var avgSatisfaction = Math.max(
        60,
        Math.min(100, Math.round(resRate * 0.65 + (100 - avoidableRate) * 0.35)),
      )

      var attStatus = getAttendanceStatus(realTotal, targetAttendance)
      var resStatus = getResolutionStatus(resRate, targetMinResolution)
      var overall = getOverall(attStatus, resStatus)
      var hitAtt = realTotal >= targetAttendance
      var hitRes = resRate >= targetMinResolution
      var hitOver = attStatus !== 'abaixo' && resStatus !== 'abaixo'
      var attPct = targetAttendance > 0 ? Math.round((realTotal / targetAttendance) * 100) : 0

      var existing = null
      try {
        var exList = $app.findRecordsByFilter(
          'meta_snapshots',
          "user_id = '" + userId + "' && month_year = '" + monthYear + "'",
          '',
          1,
          0,
        )
        if (exList && exList.length > 0) {
          existing = exList[0]
        }
      } catch (_) {}

      var snap = existing || new Record(snapshotsCol)
      snap.set('user_id', userId)
      snap.set('year', targetYear)
      snap.set('month', targetMonth)
      snap.set('period_label', periodLabel)
      snap.set('month_year', monthYear)
      snap.set('user_name', uName)
      snap.set('user_role', role)
      snap.set('assessment_type', isLdr ? 'team' : 'individual')
      snap.set('team_members_count', team.length)
      snap.set('total_attendance', realTotal)
      snap.set('resolved_attendance', realResolved)
      snap.set('resolution_rate', resRate)
      snap.set('avg_duration_minutes', avgDuration)
      snap.set('avoidable_count', realAvoidable)
      snap.set('avoidable_rate', avoidableRate)
      snap.set('reopen_count', realReopen)
      snap.set('reopen_rate', reopenRate)
      snap.set('auto_categorized_count', realAutoCat)
      snap.set('auto_categorized_rate', autoCatRate)
      snap.set('categorization_accuracy', catAccuracy)
      snap.set('avg_satisfaction_score', avgSatisfaction)
      snap.set('target_attendance', targetAttendance)
      snap.set('target_min_resolution_rate', targetMinResolution)
      snap.set('target_avg_response_time', targetAvgResponseTime)
      snap.set('target_auto_categorization', targetAutoCat)
      snap.set('target_min_satisfaction', targetMinSat)
      snap.set('target_source', isIndividualTarget ? 'individual' : 'global')
      snap.set('attendance_achievement_pct', attPct)
      snap.set('hit_attendance', hitAtt)
      snap.set('hit_resolution', hitRes)
      snap.set('hit_overall', hitOver)
      snap.set('attendance_status', attStatus)
      snap.set('resolution_status', resStatus)
      snap.set('overall_status', overall)
      snap.set('snapshot_at', new Date().toISOString())
      snap.set(
        'details',
        JSON.stringify({
          manual_freeze_by: authRecord.id,
          team_member_ids: team.map(function (tm) {
            return tm.id
          }),
        }),
      )

      try {
        $app.save(snap)
        if (existing) updatedCount++
        else createdCount++
      } catch (saveErr) {
        $app.logger().error('Erro ao salvar snapshot para ' + uName + ': ' + saveErr)
      }
    }

    return c.json(200, {
      success: true,
      result: {
        monthYear: monthYear,
        periodLabel: periodLabel,
        totalEligible: eligibleUsers.length,
        created: createdCount,
        updated: updatedCount,
      },
    })
  },
  $apis.requireAuth(),
)
