// Hook para fechamento mensal:
// 1. "Colaborador do Mês" automático (maior % de progresso da meta)
// 2. "Evolução Notável" (maior crescimento vs. mês anterior)
// 3. Rota POST /backend/v1/gamification/close-month e Cron de início de mês

routerAdd('POST', '/backend/v1/gamification/close-month', (c) => {
  var info = c.requestInfo()
  var authRecord = info.authRecord
  if (!authRecord) {
    return c.json(401, { error: 'Não autenticado' })
  }

  var data = {}
  try {
    data = info.body || {}
  } catch (_) {}

  var monthYearStr = data.month_year || ''
  var now = new Date()
  if (!monthYearStr) {
    var prevMonthDate = new Date(now.getFullYear(), now.getMonth() - 1, 1)
    var y = prevMonthDate.getFullYear()
    var m = String(prevMonthDate.getMonth() + 1).padStart(2, '0')
    monthYearStr = y + '-' + m
  }

  var parts = monthYearStr.split('-')
  var refYear = parseInt(parts[0], 10)
  var refMonth = parseInt(parts[1], 10)

  var prevRefDate = new Date(refYear, refMonth - 2, 1)
  var prevMonthYearStr =
    prevRefDate.getFullYear() + '-' + String(prevRefDate.getMonth() + 1).padStart(2, '0')

  var users = $app.findRecordsByFilter('users', "id != ''", '', 1000, 0)
  if (!users || users.length === 0) {
    return c.json(200, { success: false, message: 'Nenhum usuário encontrado' })
  }

  var defaultMonthlyTarget = 100
  try {
    if ($app.hasTable('global_targets')) {
      var gtList = $app.findRecordsByFilter('global_targets', '', '-created', 1, 0)
      if (gtList && gtList.length > 0) {
        var gtVal = gtList[0].getInt('monthly_attendance_target')
        if (gtVal > 0) defaultMonthlyTarget = gtVal
      }
    }
  } catch (_) {}

  var userTargetsMap = {}
  try {
    if ($app.hasTable('user_targets')) {
      var utList = $app.findRecordsByFilter('user_targets', '', '', 1000, 0)
      for (var uti = 0; uti < utList.length; uti++) {
        var uid = utList[uti].getString('user')
        var mt = utList[uti].getInt('monthly_attendance_target')
        if (mt > 0) userTargetsMap[uid] = mt
      }
    }
  } catch (_) {}

  var allRecords = $app.findRecordsByFilter('service_records', "id != ''", 'created', 10000, 0)
  var statsMap = {}

  for (var u = 0; u < users.length; u++) {
    statsMap[users[u].id] = {
      userId: users[u].id,
      name: users[u].getString('name'),
      currentMonthCount: 0,
      currentMonthCompleted: 0,
      prevMonthCount: 0,
      prevMonthCompleted: 0,
      target: userTargetsMap[users[u].id] || defaultMonthlyTarget,
    }
  }

  for (var r = 0; r < allRecords.length; r++) {
    var rec = allRecords[r]
    var created = rec.getString('created')
    if (!created) continue
    var recMonth = created.substring(0, 7)
    var recUserId = rec.getString('assigned_user') || rec.getString('user_id')
    var isDone = rec.getString('status') === 'Concluído'

    if (recUserId && statsMap[recUserId]) {
      if (recMonth === monthYearStr) {
        statsMap[recUserId].currentMonthCount += 1
        if (isDone) statsMap[recUserId].currentMonthCompleted += 1
      } else if (recMonth === prevMonthYearStr) {
        statsMap[recUserId].prevMonthCount += 1
        if (isDone) statsMap[recUserId].prevMonthCompleted += 1
      }
    }
  }

  var candidates = Object.values(statsMap)
  var topProgressUser = null
  var maxProgressPct = -1

  for (var c1 = 0; c1 < candidates.length; c1++) {
    var cand1 = candidates[c1]
    if (cand1.currentMonthCompleted > 0) {
      var progressPct = (cand1.currentMonthCompleted / cand1.target) * 100
      if (progressPct > maxProgressPct) {
        maxProgressPct = progressPct
        topProgressUser = cand1
      }
    }
  }

  var topEvolutionUser = null
  var maxEvolutionGrowth = -999999

  for (var c2 = 0; c2 < candidates.length; c2++) {
    var cand2 = candidates[c2]
    var growth = cand2.currentMonthCompleted - cand2.prevMonthCompleted
    if (growth > 0 && cand2.currentMonthCompleted > 0) {
      if (growth > maxEvolutionGrowth) {
        maxEvolutionGrowth = growth
        topEvolutionUser = cand2
      }
    }
  }

  var awardsCol = $app.findCollectionByNameOrId('monthly_awards')
  var nowIso = new Date().toISOString()
  var createdAwards = []

  if (topProgressUser) {
    try {
      var existing1 = null
      try {
        var list1 = $app.findRecordsByFilter(
          'monthly_awards',
          "award_type = 'employee_of_month' && month_year = '" + monthYearStr + "'",
          '',
          1,
          0,
        )
        if (list1.length > 0) existing1 = list1[0]
      } catch (_) {}

      var rec1 = existing1 || new Record(awardsCol)
      rec1.set('user_id', topProgressUser.userId)
      rec1.set('award_type', 'employee_of_month')
      rec1.set('month_year', monthYearStr)
      rec1.set('metric_value', Math.round(maxProgressPct))
      rec1.set('details', {
        userName: topProgressUser.name,
        completed: topProgressUser.currentMonthCompleted,
        target: topProgressUser.target,
        progressPct: Math.round(maxProgressPct * 10) / 10,
      })
      rec1.set('awarded_at', nowIso)
      $app.save(rec1)
      createdAwards.push({
        type: 'employee_of_month',
        user: topProgressUser.name,
        progress: maxProgressPct,
      })

      var notifCol = $app.findCollectionByNameOrId('notifications')
      var notif1 = new Record(notifCol)
      notif1.set('user_id', topProgressUser.userId)
      notif1.set('title', '🌟 Você é o Colaborador do Mês (' + monthYearStr + ')!')
      notif1.set(
        'message',
        'Parabéns! Você alcançou ' + Math.round(maxProgressPct) + '% da meta no período!',
      )
      notif1.set('type', 'success')
      notif1.set('read', false)
      notif1.set('link', '/ranking')
      $app.save(notif1)
    } catch (e1) {
      $app.logger().error('Erro ao salvar Colaborador do Mês: ' + e1)
    }
  }

  if (topEvolutionUser) {
    try {
      var existing2 = null
      try {
        var list2 = $app.findRecordsByFilter(
          'monthly_awards',
          "award_type = 'notable_evolution' && month_year = '" + monthYearStr + "'",
          '',
          1,
          0,
        )
        if (list2.length > 0) existing2 = list2[0]
      } catch (_) {}

      var rec2 = existing2 || new Record(awardsCol)
      rec2.set('user_id', topEvolutionUser.userId)
      rec2.set('award_type', 'notable_evolution')
      rec2.set('month_year', monthYearStr)
      rec2.set('metric_value', maxEvolutionGrowth)
      rec2.set('details', {
        userName: topEvolutionUser.name,
        currentCompleted: topEvolutionUser.currentMonthCompleted,
        prevCompleted: topEvolutionUser.prevMonthCompleted,
        growth: maxEvolutionGrowth,
      })
      rec2.set('awarded_at', nowIso)
      $app.save(rec2)
      createdAwards.push({
        type: 'notable_evolution',
        user: topEvolutionUser.name,
        growth: maxEvolutionGrowth,
      })

      var notifCol2 = $app.findCollectionByNameOrId('notifications')
      var notif2 = new Record(notifCol2)
      notif2.set('user_id', topEvolutionUser.userId)
      notif2.set('title', '🚀 Reconhecimento: Evolução Notável (' + monthYearStr + ')!')
      notif2.set(
        'message',
        'Você teve o maior crescimento da equipe com +' + maxEvolutionGrowth + ' atendimentos!',
      )
      notif2.set('type', 'success')
      notif2.set('read', false)
      notif2.set('link', '/ranking')
      $app.save(notif2)
    } catch (e2) {
      $app.logger().error('Erro ao salvar Evolução Notável: ' + e2)
    }
  }

  return c.json(200, {
    success: true,
    monthYear: monthYearStr,
    awards: createdAwards,
  })
})

cronAdd('monthly_gamification_awards_close', '0 3 1 * *', function () {
  $app.logger().info('Executando fechamento mensal de gamificação automático...')
  var now = new Date()
  var prevMonthDate = new Date(now.getFullYear(), now.getMonth() - 1, 1)
  var y = prevMonthDate.getFullYear()
  var m = String(prevMonthDate.getMonth() + 1).padStart(2, '0')
  var monthYearStr = y + '-' + m

  var parts = monthYearStr.split('-')
  var refYear = parseInt(parts[0], 10)
  var refMonth = parseInt(parts[1], 10)
  var prevRefDate = new Date(refYear, refMonth - 2, 1)
  var prevMonthYearStr =
    prevRefDate.getFullYear() + '-' + String(prevRefDate.getMonth() + 1).padStart(2, '0')

  var users = $app.findRecordsByFilter('users', "id != ''", '', 1000, 0)
  if (!users || users.length === 0) return

  var defaultMonthlyTarget = 100
  try {
    if ($app.hasTable('global_targets')) {
      var gtList = $app.findRecordsByFilter('global_targets', '', '-created', 1, 0)
      if (gtList && gtList.length > 0) {
        var gtVal = gtList[0].getInt('monthly_attendance_target')
        if (gtVal > 0) defaultMonthlyTarget = gtVal
      }
    }
  } catch (_) {}

  var userTargetsMap = {}
  try {
    if ($app.hasTable('user_targets')) {
      var utList = $app.findRecordsByFilter('user_targets', '', '', 1000, 0)
      for (var uti = 0; uti < utList.length; uti++) {
        var uid = utList[uti].getString('user')
        var mt = utList[uti].getInt('monthly_attendance_target')
        if (mt > 0) userTargetsMap[uid] = mt
      }
    }
  } catch (_) {}

  var allRecords = $app.findRecordsByFilter('service_records', "id != ''", 'created', 10000, 0)
  var statsMap = {}

  for (var u = 0; u < users.length; u++) {
    statsMap[users[u].id] = {
      userId: users[u].id,
      name: users[u].getString('name'),
      currentMonthCount: 0,
      currentMonthCompleted: 0,
      prevMonthCount: 0,
      prevMonthCompleted: 0,
      target: userTargetsMap[users[u].id] || defaultMonthlyTarget,
    }
  }

  for (var r = 0; r < allRecords.length; r++) {
    var rec = allRecords[r]
    var created = rec.getString('created')
    if (!created) continue
    var recMonth = created.substring(0, 7)
    var recUserId = rec.getString('assigned_user') || rec.getString('user_id')
    var isDone = rec.getString('status') === 'Concluído'

    if (recUserId && statsMap[recUserId]) {
      if (recMonth === monthYearStr) {
        statsMap[recUserId].currentMonthCount += 1
        if (isDone) statsMap[recUserId].currentMonthCompleted += 1
      } else if (recMonth === prevMonthYearStr) {
        statsMap[recUserId].prevMonthCount += 1
        if (isDone) statsMap[recUserId].prevMonthCompleted += 1
      }
    }
  }

  var candidates = Object.values(statsMap)
  var topProgressUser = null
  var maxProgressPct = -1

  for (var c1 = 0; c1 < candidates.length; c1++) {
    var cand1 = candidates[c1]
    if (cand1.currentMonthCompleted > 0) {
      var progressPct = (cand1.currentMonthCompleted / cand1.target) * 100
      if (progressPct > maxProgressPct) {
        maxProgressPct = progressPct
        topProgressUser = cand1
      }
    }
  }

  var topEvolutionUser = null
  var maxEvolutionGrowth = -999999

  for (var c2 = 0; c2 < candidates.length; c2++) {
    var cand2 = candidates[c2]
    var growth = cand2.currentMonthCompleted - cand2.prevMonthCompleted
    if (growth > 0 && cand2.currentMonthCompleted > 0) {
      if (growth > maxEvolutionGrowth) {
        maxEvolutionGrowth = growth
        topEvolutionUser = cand2
      }
    }
  }

  var awardsCol = $app.findCollectionByNameOrId('monthly_awards')
  var nowIso = new Date().toISOString()

  if (topProgressUser) {
    try {
      var existing1 = null
      try {
        var list1 = $app.findRecordsByFilter(
          'monthly_awards',
          "award_type = 'employee_of_month' && month_year = '" + monthYearStr + "'",
          '',
          1,
          0,
        )
        if (list1.length > 0) existing1 = list1[0]
      } catch (_) {}

      var rec1 = existing1 || new Record(awardsCol)
      rec1.set('user_id', topProgressUser.userId)
      rec1.set('award_type', 'employee_of_month')
      rec1.set('month_year', monthYearStr)
      rec1.set('metric_value', Math.round(maxProgressPct))
      rec1.set('details', {
        userName: topProgressUser.name,
        completed: topProgressUser.currentMonthCompleted,
        target: topProgressUser.target,
        progressPct: Math.round(maxProgressPct * 10) / 10,
      })
      rec1.set('awarded_at', nowIso)
      $app.save(rec1)
    } catch (_) {}
  }

  if (topEvolutionUser) {
    try {
      var existing2 = null
      try {
        var list2 = $app.findRecordsByFilter(
          'monthly_awards',
          "award_type = 'notable_evolution' && month_year = '" + monthYearStr + "'",
          '',
          1,
          0,
        )
        if (list2.length > 0) existing2 = list2[0]
      } catch (_) {}

      var rec2 = existing2 || new Record(awardsCol)
      rec2.set('user_id', topEvolutionUser.userId)
      rec2.set('award_type', 'notable_evolution')
      rec2.set('month_year', monthYearStr)
      rec2.set('metric_value', maxEvolutionGrowth)
      rec2.set('details', {
        userName: topEvolutionUser.name,
        currentCompleted: topEvolutionUser.currentMonthCompleted,
        prevCompleted: topEvolutionUser.prevMonthCompleted,
        growth: maxEvolutionGrowth,
      })
      rec2.set('awarded_at', nowIso)
      $app.save(rec2)
    } catch (_) {}
  }
})
