// Cron job diário às 7h30 da manhã
// Realiza varreduras automáticas de:
// 1. Limite de acúmulo de Banco de Horas (parâmetro editável em absence_alert_configs, padrão 10h).
//    - Requisito: Gestores não possuem banco de horas nem marcam ponto (excluídos desta apuração).
//    - Alerta gestores e colaborador quando o saldo atinge ou ultrapassa o teto.
// 2. Férias:
//    - Períodos aquisitivos completos sem férias agendadas (aquisitivo padrão 12 meses após admissão/criação do usuário).
//    - Férias com prazo concessivo próximo do limite (vencendo em X dias configurados) ou já vencidas.
// 3. Regras Trabalhistas CLT (Proxy a partir dos service_records):
//    - Interjornada: intervalo mínimo entre atendimentos de dias consecutivos menor que 11h.
//    - DSR: Colaborador com atendimentos em 7 dias consecutivos sem folga.
//    - Exclui cargos de gestão dessas validações de ponto.
// 4. Conflito de Cobertura de Equipe:
//    - Alerta gestores quando ausências agendadas no mesmo dia/período excedem o limite percentual configurado por Núcleo.

cronAdd('absence_and_labor_alerts_daily', '30 7 * * *', function () {
  try {
    // 1. Carregar configurações
    var configs = $app.findRecordsByFilter('absence_alert_configs', '', '-created', 1, 0)
    var hourLimit = 10
    var negHourLimit = 10
    var warningDays = 60
    var minInterjornada = 11
    var maxConsecutiveDays = 7
    var maxAbsencePct = 30

    if (configs.length > 0) {
      var cfg = configs[0]
      var hl = cfg.get('hour_bank_limit_hours')
      var nhl = cfg.get('hour_bank_negative_limit_hours')
      var wd = cfg.get('vacation_warning_days_before_expiry')
      var mij = cfg.get('min_interjornada_hours')
      var mcd = cfg.get('max_consecutive_work_days')
      var tap = cfg.get('max_team_absence_pct')

      if (hl && hl > 0) hourLimit = hl
      if (nhl && nhl > 0) negHourLimit = nhl
      if (wd && wd > 0) warningDays = wd
      if (mij && mij > 0) minInterjornada = mij
      if (mcd && mcd > 0) maxConsecutiveDays = mcd
      if (tap && tap > 0) maxAbsencePct = tap
    }

    // 2. Buscar usuários
    var allUsers = $app.findRecordsByFilter('users', "approval_status = 'Aprovado'", 'name', 0, 0)
    var usersById = {}
    var nonManagers = []
    var managerUsers = []

    var managerRoles = [
      'Gerente',
      'Supervisor',
      'Líder',
      'Gestor Comercial',
      'Master',
      'Gerentes',
      'Supervisores',
      'Líderes',
    ]

    function isManager(role) {
      if (!role) return false
      for (var m = 0; m < managerRoles.length; m++) {
        if (managerRoles[m] === role) return true
      }
      return false
    }

    for (var u = 0; u < allUsers.length; u++) {
      var usr = allUsers[u]
      usersById[usr.id] = usr
      var r = usr.getString('role') || ''
      if (isManager(r)) {
        managerUsers.push(usr)
      } else {
        nonManagers.push(usr)
      }
    }

    // Helper para achar gestores responsáveis por um consultor (por Núcleo ou geral)
    function getManagersForUser(userRecord) {
      var matched = []
      var uGroups = userRecord.get('service_groups') || []

      for (var mg = 0; mg < managerUsers.length; mg++) {
        var mgr = managerUsers[mg]
        var mgrGroups = mgr.get('service_groups') || []
        var mgrRole = mgr.getString('role') || ''

        // Master ou Gerente sem restrição vê todos
        if (mgrRole === 'Master' || (mgrRole === 'Gerente' && mgrGroups.length === 0)) {
          matched.push(mgr)
          continue
        }

        // Supervisor/Líder do mesmo Núcleo
        var hasMatch = false
        for (var gA = 0; gA < uGroups.length; gA++) {
          for (var gB = 0; gB < mgrGroups.length; gB++) {
            if (uGroups[gA] === mgrGroups[gB]) {
              hasMatch = true
              break
            }
          }
          if (hasMatch) break
        }
        if (hasMatch) {
          matched.push(mgr)
        }
      }
      return matched
    }

    var notifCol = $app.findCollectionByNameOrId('notifications')
    var todayIso = new Date().toISOString().substring(0, 10)

    function sendNotificationAndEmail(targetUser, title, message, link) {
      if (!targetUser) return
      // 1. Salvar no sino (dedup pelo link e dia)
      try {
        var existing = $app.findRecordsByFilter(
          'notifications',
          "user_id = '" + targetUser.id + "' && link = '" + link + "'",
          '-created',
          1,
          0,
        )
        if (existing.length === 0) {
          var notif = new Record(notifCol)
          notif.set('user_id', targetUser.id)
          notif.set('title', title)
          notif.set('message', message)
          notif.set('type', 'alert')
          notif.set('read', false)
          notif.set('link', link)
          $app.save(notif)
        }
      } catch (e) {
        $app.logger().error('Erro ao criar notificação de ausência/banco:', 'error', String(e))
      }

      // 2. Enviar e-mail se habilitado
      var email = targetUser.getString('email')
      var notifEnabled = targetUser.get('email_notifications')
      if (notifEnabled !== false && email && email.indexOf('@') > 0) {
        try {
          var senderAddress = 'noreply@rexturadvance.com.br'
          var senderName = 'Sistema de Registros de Atendimento'
          try {
            if ($app.settings() && $app.settings().meta && $app.settings().meta.senderAddress) {
              senderAddress = $app.settings().meta.senderAddress
              senderName = $app.settings().meta.senderName || senderName
            }
          } catch (_) {}

          var html =
            '<!DOCTYPE html><html><head><meta charset="utf-8"></head>' +
            '<body style="font-family: -apple-system, BlinkMacSystemFont, Segoe UI, Roboto, sans-serif; background: #f8fafc; padding: 20px; color: #334155;">' +
            '<div style="max-width: 560px; margin: 0 auto; background: #ffffff; border: 1px solid #e2e8f0; border-radius: 8px; overflow: hidden;">' +
            '<div style="background-color: #4f46e5; padding: 16px 20px; color: #ffffff;">' +
            '<h2 style="margin: 0; font-size: 16px;">' +
            title +
            '</h2>' +
            '</div>' +
            '<div style="padding: 20px;">' +
            '<p style="font-size: 14px; margin-top: 0;">Olá ' +
            targetUser.getString('name') +
            ',</p>' +
            '<p style="font-size: 14px; line-height: 1.5;">' +
            message +
            '</p>' +
            '<div style="margin-top: 24px; text-align: center;">' +
            '<a href="/banco-horas-ferias" style="background: #4f46e5; color: #ffffff; text-decoration: none; padding: 10px 18px; border-radius: 6px; font-weight: 600; font-size: 13px; display: inline-block;">Acessar Banco de Horas &amp; Férias</a>' +
            '</div>' +
            '</div></div></body></html>'

          var mail = new MailerMessage({
            from: { address: senderAddress, name: senderName },
            to: [{ address: email, name: targetUser.getString('name') }],
            subject: '[RH / Banco de Horas & Férias] ' + title,
            html: html,
          })
          $app.newMailClient().send(mail)
        } catch (mErr) {
          $app.logger().error('Erro ao enviar e-mail de alerta:', 'error', String(mErr))
        }
      }
    }

    // ==========================================
    // PARTE 1: BANCO DE HORAS (Limite de Acúmulo)
    // ==========================================
    // Gestores NÃO têm banco de horas (requisito do usuário)
    var entries = $app.findRecordsByFilter('hour_bank_entries', '', '-created', 0, 0)
    var balanceByUser = {}
    for (var en = 0; en < entries.length; en++) {
      var entry = entries[en]
      var uId = entry.getString('user_id')
      if (!uId) continue
      if (!balanceByUser[uId]) balanceByUser[uId] = 0
      var h = entry.get('hours') || 0
      var t = entry.getString('type')
      if (t === 'credito') {
        balanceByUser[uId] += h
      } else {
        balanceByUser[uId] -= h
      }
    }

    for (var c0 = 0; c0 < nonManagers.length; c0++) {
      var nonMgr = nonManagers[c0]
      var bal = balanceByUser[nonMgr.id] || 0
      var cName = nonMgr.getString('name') || 'Colaborador'

      // Acúmulo positivo excede o limite configurável
      if (bal >= hourLimit) {
        var hTitle = '⚠️ Limite de Banco de Horas Atingido (' + bal + 'h)'
        var hMsg =
          cName +
          ' possui ' +
          bal +
          'h acumuladas no banco de horas, atingindo o limite configurado de ' +
          hourLimit +
          'h. Recomenda-se agendar folga ou compensação.'
        var hLink = '/banco-horas-ferias?user=' + nonMgr.id + '&date=' + todayIso + '&tab=banco'

        sendNotificationAndEmail(nonMgr, hTitle, hMsg, hLink)

        var mgrs = getManagersForUser(nonMgr)
        for (var m1 = 0; m1 < mgrs.length; m1++) {
          sendNotificationAndEmail(mgrs[m1], hTitle, hMsg, hLink)
        }
      } else if (bal <= -negHourLimit) {
        // Alerta de saldo negativo excessivo
        var nhTitle = '⚠️ Saldo Negativo no Banco de Horas (' + bal + 'h)'
        var nhMsg =
          cName +
          ' possui ' +
          bal +
          'h negativas no banco de horas (limite negativo: ' +
          negHourLimit +
          'h). Recomenda-se alinhamento de compensação.'
        var nhLink = '/banco-horas-ferias?user=' + nonMgr.id + '&date=' + todayIso + '&tab=banco'

        sendNotificationAndEmail(nonMgr, nhTitle, nhMsg, nhLink)
        var mgrsNeg = getManagersForUser(nonMgr)
        for (var m2 = 0; m2 < mgrsNeg.length; m2++) {
          sendNotificationAndEmail(mgrsNeg[m2], nhTitle, nhMsg, nhLink)
        }
      }
    }

    // ==========================================
    // PARTE 2: FÉRIAS (Período Aquisitivo & Vencimento)
    // ==========================================
    var absences = $app.findRecordsByFilter(
      'absences',
      "reason = 'Férias' && status != 'cancelada'",
      '-start_date',
      0,
      0,
    )
    var vacationsByUser = {}
    for (var aIdx = 0; aIdx < absences.length; aIdx++) {
      var ab = absences[aIdx]
      var aUid = ab.getString('user_id')
      if (!vacationsByUser[aUid]) vacationsByUser[aUid] = []
      vacationsByUser[aUid].push(ab)
    }

    var nowMs = new Date().getTime()
    for (var uVac = 0; uVac < allUsers.length; uVac++) {
      var targetU = allUsers[uVac]
      var uName = targetU.getString('name') || 'Colaborador'
      var userCreated = targetU.getString('created')
      if (!userCreated) continue

      var hireDate = new Date(userCreated.replace(' ', 'T') + 'Z')
      var daysSinceHire = Math.floor((nowMs - hireDate.getTime()) / (1000 * 3600 * 24))

      // 1 ano = 365 dias (aquisitivo completo). Período concessivo = até 730 dias (2 anos)
      // Se já passou de 365 dias e não tem férias nos últimos 12 meses ou agendadas:
      var userVacations = vacationsByUser[targetU.id] || []
      var hasUpcomingVacation = false
      var lastVacationDate = 0

      for (var uv = 0; uv < userVacations.length; uv++) {
        var vStart = new Date(userVacations[uv].getString('start_date')).getTime()
        if (vStart > nowMs) hasUpcomingVacation = true
        if (vStart > lastVacationDate) lastVacationDate = vStart
      }

      // Alerta 1: Período aquisitivo completo sem férias agendadas
      if (daysSinceHire >= 365 && !hasUpcomingVacation) {
        var daysLeftToDouble = 730 - daysSinceHire

        if (daysLeftToDouble <= 0) {
          // Férias vencidas! Risco trabalhista de pagamento em dobro (CLT art. 137)
          var vExpTitle = '🚨 FÉRIAS VENCIDAS: ' + uName
          var vExpMsg =
            uName +
            ' ultrapassou o período concessivo legal sem gozo de férias. Risco trabalhista de dobra legal. Regularização imediata mandatória.'
          var vExpLink =
            '/banco-horas-ferias?user=' + targetU.id + '&date=' + todayIso + '&tab=ferias'

          sendNotificationAndEmail(targetU, vExpTitle, vExpMsg, vExpLink)
          var mExp = getManagersForUser(targetU)
          for (var me = 0; me < mExp.length; me++) {
            sendNotificationAndEmail(mExp[me], vExpTitle, vExpMsg, vExpLink)
          }
        } else if (daysLeftToDouble <= warningDays) {
          // Férias vencendo em breve (janela de alerta)
          var vWarnTitle = '⚠️ Férias Vencendo em ' + daysLeftToDouble + ' dias: ' + uName
          var vWarnMsg =
            uName +
            ' possui período concessivo de férias vencendo em ' +
            daysLeftToDouble +
            ' dias sem agendamento confirmado.'
          var vWarnLink =
            '/banco-horas-ferias?user=' + targetU.id + '&date=' + todayIso + '&tab=ferias'

          sendNotificationAndEmail(targetU, vWarnTitle, vWarnMsg, vWarnLink)
          var mWarn = getManagersForUser(targetU)
          for (var mw = 0; mw < mWarn.length; mw++) {
            sendNotificationAndEmail(mWarn[mw], vWarnTitle, vWarnMsg, vWarnLink)
          }
        } else if (daysSinceHire >= 365 && userVacations.length === 0) {
          // Completou 1 ano e ainda não programou
          var vCompTitle = '📅 Período Aquisitivo de Férias Completo: ' + uName
          var vCompMsg =
            uName +
            ' completou 12 meses de ciclo aquisitivo. É o momento ideal para planejar e agendar as férias da equipe.'
          var vCompLink =
            '/banco-horas-ferias?user=' + targetU.id + '&date=' + todayIso + '&tab=ferias'

          sendNotificationAndEmail(targetU, vCompTitle, vCompMsg, vCompLink)
        }
      }
    }

    // ==========================================
    // PARTE 3: VALIDAÇÕES TRABALHISTAS CLT (Interjornada 11h e 7 Dias DSR)
    // ==========================================
    // Avalia registros dos últimos 14 dias para consultores
    var twoWeeksAgo = new Date(nowMs - 14 * 24 * 3600 * 1000).toISOString()
    var recentRecords = $app.findRecordsByFilter(
      'service_records',
      "created >= '" + twoWeeksAgo.replace('T', ' ').substring(0, 19) + "'",
      'created',
      0,
      0,
    )

    var recordsByUser = {}
    for (var rIdx = 0; rIdx < recentRecords.length; rIdx++) {
      var rec = recentRecords[rIdx]
      var uKey = rec.getString('assigned_user') || rec.getString('user_id')
      if (!uKey) continue
      if (!recordsByUser[uKey]) recordsByUser[uKey] = []
      recordsByUser[uKey].push(rec)
    }

    for (var cClt = 0; cClt < nonManagers.length; cClt++) {
      var cUser = nonManagers[cClt]
      var uRecs = recordsByUser[cUser.id] || []
      if (uRecs.length === 0) continue

      var cFullName = cUser.getString('name') || 'Consultor'

      // 3.1 Agrupar dias com atendimento
      var daysMap = {}
      var daysSorted = []
      for (var ur = 0; ur < uRecs.length; ur++) {
        var rDateStr = uRecs[ur].getString('created').substring(0, 10)
        var rTime = new Date(uRecs[ur].getString('created').replace(' ', 'T') + 'Z').getTime()
        if (!daysMap[rDateStr]) {
          daysMap[rDateStr] = { min: rTime, max: rTime, count: 0 }
          daysSorted.push(rDateStr)
        }
        daysMap[rDateStr].count++
        if (rTime < daysMap[rDateStr].min) daysMap[rDateStr].min = rTime
        if (rTime > daysMap[rDateStr].max) daysMap[rDateStr].max = rTime
      }
      daysSorted.sort()

      // 3.2 Verificar 7 dias consecutivos sem folga (DSR)
      if (daysSorted.length >= maxConsecutiveDays) {
        var consecutiveCount = 1
        var violated7Days = false

        for (var d = 1; d < daysSorted.length; d++) {
          var prevD = new Date(daysSorted[d - 1]).getTime()
          var currD = new Date(daysSorted[d]).getTime()
          var diffDays = Math.round((currD - prevD) / (24 * 3600 * 1000))

          if (diffDays === 1) {
            consecutiveCount++
            if (consecutiveCount >= maxConsecutiveDays) {
              violated7Days = true
            }
          } else {
            consecutiveCount = 1
          }
        }

        if (violated7Days) {
          var dsrTitle = '⚠️ Alerta Trabalhista: 7 Dias sem Descanso (DSR)'
          var dsrMsg =
            cFullName +
            ' possui atendimentos registrados em ' +
            maxConsecutiveDays +
            ' ou mais dias consecutivos sem folga semanal. Verifique a escala de descanso da equipe.'
          var dsrLink =
            '/banco-horas-ferias?user=' + cUser.id + '&date=' + todayIso + '&tab=validacoes'

          sendNotificationAndEmail(cUser, dsrTitle, dsrMsg, dsrLink)
          var mDsr = getManagersForUser(cUser)
          for (var md = 0; md < mDsr.length; md++) {
            sendNotificationAndEmail(mDsr[md], dsrTitle, dsrMsg, dsrLink)
          }
        }
      }

      // 3.3 Interjornada < 11h entre dias consecutivos
      for (var ij = 1; ij < daysSorted.length; ij++) {
        var dayA = daysMap[daysSorted[ij - 1]]
        var dayB = daysMap[daysSorted[ij]]
        var diffDayCount = Math.round(
          (new Date(daysSorted[ij]).getTime() - new Date(daysSorted[ij - 1]).getTime()) /
            (24 * 3600 * 1000),
        )

        // Dias consecutivos
        if (diffDayCount === 1) {
          var restHours = (dayB.min - dayA.max) / (1000 * 3600)
          if (restHours > 0 && restHours < minInterjornada) {
            var ijTitle =
              '⚠️ Alerta de Interjornada: Intervalo de ' + restHours.toFixed(1) + 'h (< 11h CLT)'
            var ijMsg =
              cFullName +
              ' teve intervalo entre jornadas de apenas ' +
              restHours.toFixed(1) +
              'h entre ' +
              daysSorted[ij - 1] +
              ' e ' +
              daysSorted[ij] +
              ', abaixo do piso legal de ' +
              minInterjornada +
              'h.'
            var ijLink =
              '/banco-horas-ferias?user=' + cUser.id + '&date=' + todayIso + '&tab=validacoes'

            sendNotificationAndEmail(cUser, ijTitle, ijMsg, ijLink)
            var mIj = getManagersForUser(cUser)
            for (var mi = 0; mi < mIj.length; mi++) {
              sendNotificationAndEmail(mIj[mi], ijTitle, ijMsg, ijLink)
            }
            break // Dispara 1 alerta de interjornada por varredura
          }
        }
      }
    }

    $app.logger().info('Cron de ausências e regras trabalhistas executado com sucesso')
  } catch (err) {
    $app
      .logger()
      .error('Erro na execução do cron de banco de horas e ausências:', 'error', String(err))
  }
})
