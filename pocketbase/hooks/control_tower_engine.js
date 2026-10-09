// Motor de Priorização, Gestão, Escalação por SLA e THREADING da Torre de Controle (Skip Cloud / PocketBase pb_hooks)
// CRÍTICO: Todas as funções auxiliares devem ficar DENTRO de cada callback/rota para evitar o erro de scoping do PocketBase JSVM pool.

// CRON JOB: a cada 15 minutos, recalcula itens abertos na fila (apenas roots / não child), calcula SLA deadlines e executa motor de escalação
cronAdd('control_tower_recalculate', '*/15 * * * *', () => {
  $app
    .logger()
    .info('[Torre de Controle] Iniciando cron de recálculo e escalação de SLA com Threading...')

  function getCfg() {
    var def = {
      weight_departure_24h: 50,
      weight_departure_48h: 30,
      weight_cancellation: 35,
      weight_priority_client: 25,
      weight_per_hour_inbox: 5,
      weight_promised_deadline: 20,
      weight_formal_complaint: 40,
      weight_repeat_contact: 15,
      weight_persistent_client: 20,
      score_threshold_p1: 60,
      score_threshold_p2: 30,
      business_hours_start: '08:00',
      business_hours_end: '18:00',
      business_days: [1, 2, 3, 4, 5],
      target_sla_p1_hours: 2,
      target_sla_p2_hours: 4,
      target_sla_p3_hours: 8,
    }
    try {
      var r = $app.findRecordsByFilter('control_tower_configs', '', '-created', 1, 0)
      if (r && r.length > 0) {
        return {
          weight_departure_24h: r[0].getFloat('weight_departure_24h') || def.weight_departure_24h,
          weight_departure_48h: r[0].getFloat('weight_departure_48h') || def.weight_departure_48h,
          weight_cancellation: r[0].getFloat('weight_cancellation') || def.weight_cancellation,
          weight_priority_client:
            r[0].getFloat('weight_priority_client') || def.weight_priority_client,
          weight_per_hour_inbox:
            r[0].getFloat('weight_per_hour_inbox') || def.weight_per_hour_inbox,
          weight_promised_deadline:
            r[0].getFloat('weight_promised_deadline') || def.weight_promised_deadline,
          weight_formal_complaint:
            r[0].getFloat('weight_formal_complaint') || def.weight_formal_complaint,
          weight_repeat_contact:
            r[0].getFloat('weight_repeat_contact') || def.weight_repeat_contact,
          weight_persistent_client:
            r[0].getFloat('weight_persistent_client') || def.weight_persistent_client,
          score_threshold_p1: r[0].getFloat('score_threshold_p1') || def.score_threshold_p1,
          score_threshold_p2: r[0].getFloat('score_threshold_p2') || def.score_threshold_p2,
          business_hours_start: r[0].getString('business_hours_start') || def.business_hours_start,
          business_hours_end: r[0].getString('business_hours_end') || def.business_hours_end,
          business_days: r[0].get('business_days') || def.business_days,
          target_sla_p1_hours: r[0].getFloat('target_sla_p1_hours') || def.target_sla_p1_hours,
          target_sla_p2_hours: r[0].getFloat('target_sla_p2_hours') || def.target_sla_p2_hours,
          target_sla_p3_hours: r[0].getFloat('target_sla_p3_hours') || def.target_sla_p3_hours,
        }
      }
    } catch (_) {}
    return def
  }

  function calcBizHours(startDate, endDate, cfg) {
    if (!startDate || !endDate) return 0
    var start = new Date(startDate)
    var end = new Date(endDate)
    if (end <= start) return 0
    var bStartParts = (cfg.business_hours_start || '08:00').split(':')
    var bEndParts = (cfg.business_hours_end || '18:00').split(':')
    var startHour = parseInt(bStartParts[0], 10) || 8
    var startMin = parseInt(bStartParts[1], 10) || 0
    var endHour = parseInt(bEndParts[0], 10) || 18
    var endMin = parseInt(bEndParts[1], 10) || 0
    var bDays = Array.isArray(cfg.business_days) ? cfg.business_days : [1, 2, 3, 4, 5]

    var totalMs = 0
    var cur = new Date(start.getTime())
    var maxD = 60
    var dCount = 0
    while (cur < end && dCount < maxD) {
      if (bDays.indexOf(cur.getDay()) !== -1) {
        var dayStart = new Date(
          cur.getFullYear(),
          cur.getMonth(),
          cur.getDate(),
          startHour,
          startMin,
          0,
        )
        var dayEnd = new Date(cur.getFullYear(), cur.getMonth(), cur.getDate(), endHour, endMin, 0)
        var effStart = cur > dayStart ? cur : dayStart
        var effEnd = end < dayEnd ? end : dayEnd
        if (effStart < effEnd && effEnd > dayStart && effStart < dayEnd) {
          totalMs += effEnd.getTime() - effStart.getTime()
        }
      }
      cur = new Date(cur.getFullYear(), cur.getMonth(), cur.getDate() + 1, 0, 0, 0)
      dCount++
    }
    return Math.round((totalMs / 3600000) * 10) / 10
  }

  function addBizHours(startDate, targetHours, cfg) {
    if (!startDate || targetHours <= 0) return new Date().toISOString()
    var cur = new Date(startDate)
    var bStartParts = (cfg.business_hours_start || '08:00').split(':')
    var bEndParts = (cfg.business_hours_end || '18:00').split(':')
    var startHour = parseInt(bStartParts[0], 10) || 8
    var startMin = parseInt(bStartParts[1], 10) || 0
    var endHour = parseInt(bEndParts[0], 10) || 18
    var endMin = parseInt(bEndParts[1], 10) || 0
    var bDays = Array.isArray(cfg.business_days) ? cfg.business_days : [1, 2, 3, 4, 5]

    var remainingMs = targetHours * 3600000
    var maxDays = 90
    var dayIterations = 0

    while (remainingMs > 0 && dayIterations < maxDays) {
      var dayOfWeek = cur.getDay()
      if (bDays.indexOf(dayOfWeek) !== -1) {
        var dayStart = new Date(
          cur.getFullYear(),
          cur.getMonth(),
          cur.getDate(),
          startHour,
          startMin,
          0,
        )
        var dayEnd = new Date(cur.getFullYear(), cur.getMonth(), cur.getDate(), endHour, endMin, 0)

        if (cur < dayStart) {
          cur = new Date(dayStart.getTime())
        }

        if (cur < dayEnd) {
          var msAvailableToday = dayEnd.getTime() - cur.getTime()
          if (remainingMs <= msAvailableToday) {
            cur = new Date(cur.getTime() + remainingMs)
            remainingMs = 0
            break
          } else {
            remainingMs -= msAvailableToday
            cur = new Date(
              cur.getFullYear(),
              cur.getMonth(),
              cur.getDate() + 1,
              startHour,
              startMin,
              0,
            )
          }
        } else {
          cur = new Date(
            cur.getFullYear(),
            cur.getMonth(),
            cur.getDate() + 1,
            startHour,
            startMin,
            0,
          )
        }
      } else {
        cur = new Date(cur.getFullYear(), cur.getMonth(), cur.getDate() + 1, startHour, startMin, 0)
      }
      dayIterations++
    }

    return cur.toISOString()
  }

  function scoreCalc(signals, bizHours, cfg, messageCount) {
    var score = 0
    if (signals.indexOf('Embarque <24h') !== -1) score += cfg.weight_departure_24h || 50
    else if (signals.indexOf('Embarque <48h') !== -1) score += cfg.weight_departure_48h || 30
    if (signals.indexOf('Cancelamento/Remarcação') !== -1) score += cfg.weight_cancellation || 35
    if (signals.indexOf('Cliente VIP') !== -1) score += cfg.weight_priority_client || 25
    if (signals.indexOf('Reclamação Formal') !== -1) score += cfg.weight_formal_complaint || 40
    if (signals.indexOf('Prazo Prometido') !== -1) score += cfg.weight_promised_deadline || 20
    if (signals.indexOf('Reincidente') !== -1) score += cfg.weight_repeat_contact || 15

    // Persistência na mesma thread (mensagens adicionais somam ao score)
    var mCount = messageCount || 1
    var hasPersistentSignal = false
    for (var s = 0; s < signals.length; s++) {
      if (signals[s].indexOf('Cliente insistente') !== -1) {
        hasPersistentSignal = true
        break
      }
    }
    if (mCount > 1 || hasPersistentSignal) {
      // Bônus configurável de cliente insistente
      score += (cfg.weight_persistent_client || 20) * Math.min(3, mCount - 1)
    }

    if (bizHours > 0)
      score += Math.min(100, Math.floor(bizHours * (cfg.weight_per_hour_inbox || 5)))

    var prio = 'P3'
    if (score >= (cfg.score_threshold_p1 || 60)) prio = 'P1'
    else if (score >= (cfg.score_threshold_p2 || 30)) prio = 'P2'
    return { score: score, priority: prio }
  }

  function parseStringList(val) {
    if (!val) return []
    if (Array.isArray(val)) return val
    if (typeof val === 'string') {
      try {
        var parsed = JSON.parse(val)
        if (Array.isArray(parsed)) return parsed
      } catch (_) {}
      return [val.trim()]
    }
    return []
  }

  function sendEscalationAlerts(emailRec, reasonText, waitHours) {
    try {
      var notifCol = $app.findCollectionByNameOrId('notifications')
      var senderAddress = 'atendimento@rexturadvance.com.br'
      var senderName = 'Torre de Controle - RexturAdvance'
      try {
        var appSettings = $app.settings()
        if (appSettings && appSettings.meta && appSettings.meta.senderAddress) {
          senderAddress = appSettings.meta.senderAddress
          senderName = appSettings.meta.senderName || senderName
        }
      } catch (_) {}

      var emailServiceGroup = emailRec.getString('service_group')
      var emailTeam = emailRec.getString('team')
      var assignedUserId = emailRec.getString('assigned_to')
      var subjectText = emailRec.getString('subject') || '(Sem assunto)'
      var senderEmail = emailRec.getString('sender_email') || ''
      var senderDisplayName = emailRec.getString('sender_name') || senderEmail
      var priority = emailRec.getString('priority') || 'P1'
      var signalsList = parseStringList(emailRec.get('detected_signals'))
      var signalsStr =
        signalsList.length > 0 ? signalsList.join(', ') : 'Nenhum sinal crítico detectado'

      var ownerUser = null
      var ownerName = 'Nenhum (fila aberta — requer atribuição urgente)'
      if (assignedUserId) {
        try {
          ownerUser = $app.findFirstRecordByData('users', 'id', assignedUserId)
          if (ownerUser) ownerName = ownerUser.getString('name')
        } catch (_) {}
      }

      var supervisors = $app.findRecordsByFilter(
        'users',
        "role = 'Supervisor' || role = 'Gerente' || role = 'Líder' || role = 'Gestor Comercial' || role = 'Master' || master_access = true",
        '',
        100,
        0,
      )

      var targetRecipients = {}
      for (var s = 0; s < supervisors.length; s++) {
        var sup = supervisors[s]
        var isMaster = sup.getString('role') === 'Master' || sup.getBool('master_access') === true
        if (isMaster) {
          targetRecipients[sup.id] = sup
          continue
        }
        var supGroups = parseStringList(sup.get('service_groups'))
        var supDepts = parseStringList(sup.get('departments'))

        if (
          supGroups.length === 0 &&
          supDepts.length === 0 &&
          (sup.getString('role') === 'Gerente' || sup.getString('role') === 'Gestor Comercial')
        ) {
          targetRecipients[sup.id] = sup
          continue
        }

        if (supGroups.length > 0 && emailServiceGroup) {
          if (supGroups.indexOf(emailServiceGroup) === -1) continue
        }

        if (supDepts.length > 0 && emailTeam) {
          if (supDepts.indexOf(emailTeam) === -1) continue
        }

        targetRecipients[sup.id] = sup
      }

      if (ownerUser && !targetRecipients[ownerUser.id]) {
        targetRecipients[ownerUser.id] = ownerUser
      }

      var notifTitle = '🚨 [Torre de Controle] SLA Vencido — E-mail Escalado: ' + priority
      var notifMsg =
        'E-mail "' +
        subjectText +
        '" (' +
        senderDisplayName +
        ') estourou o prazo de SLA (' +
        waitHours +
        'h úteis na caixa). ' +
        (assignedUserId ? 'Responsável atual: ' + ownerName : 'ATENÇÃO: Sem responsável atribuído!')

      var linkUrl = '/torre-controle'

      for (var uId in targetRecipients) {
        if (!targetRecipients.hasOwnProperty(uId)) continue
        var recipientUser = targetRecipients[uId]

        try {
          var notif = new Record(notifCol)
          notif.set('user_id', uId)
          notif.set('title', notifTitle)
          notif.set('message', notifMsg)
          notif.set('type', 'alert')
          notif.set('read', false)
          notif.set('link', linkUrl)
          $app.save(notif)
        } catch (_) {}

        var uEmail = recipientUser.getString('email')
        var uNotifEnabled = recipientUser.get('email_notifications')
        if (uNotifEnabled !== false && uEmail && uEmail.indexOf('@') !== -1) {
          try {
            var mail = new MailerMessage({
              from: { address: senderAddress, name: senderName },
              to: [{ address: uEmail, name: recipientUser.getString('name') }],
              subject: notifTitle,
              html:
                '<h3>Alerta de SLA Torre de Controle: ' +
                priority +
                '</h3><p>' +
                notifMsg +
                '</p><p>Motivo: ' +
                reasonText +
                '</p>',
            })
            $app.newMailClient().send(mail)
          } catch (_) {}
        }
      }
    } catch (_) {}
  }

  try {
    var cfg = getCfg()
    // Apenas itens raiz ou sem parent entram no cálculo da fila visível
    var records = $app.findRecordsByFilter(
      'control_tower_emails',
      "(status = 'Novo' || status = 'Em tratamento' || status = 'Escalado') && is_thread_child != true",
      '',
      300,
      0,
    )
    var now = new Date()
    var nowIso = now.toISOString()
    var escalatedCount = 0

    for (var i = 0; i < records.length; i++) {
      var r = records[i]
      var recAt = r.getString('received_at') || r.getString('created')
      var waiting = calcBizHours(recAt, nowIso, cfg)
      var sigs = parseStringList(r.get('detected_signals'))
      var msgCount = r.getInt('message_count') || 1
      var res = scoreCalc(sigs, waiting, cfg, msgCount)
      r.set('business_hours_waiting', waiting)
      r.set('score', res.score)
      r.set('priority', res.priority)

      var currentDeadline = r.getString('sla_deadline')
      var targetHours =
        res.priority === 'P1'
          ? cfg.target_sla_p1_hours
          : res.priority === 'P2'
            ? cfg.target_sla_p2_hours
            : cfg.target_sla_p3_hours

      if (!currentDeadline) {
        currentDeadline = addBizHours(recAt, targetHours, cfg)
        r.set('sla_deadline', currentDeadline)
      }

      var currentStatus = r.getString('status')
      var deadlineDate = new Date(currentDeadline)
      var isDeadlineBreached = deadlineDate.getTime() < now.getTime()
      var alertSent = r.getBool('escalation_alert_sent')

      if (isDeadlineBreached && (currentStatus === 'Novo' || currentStatus === 'Em tratamento')) {
        r.set('status', 'Escalado')
        r.set('escalated_at', nowIso)
        var reasonMsg =
          'SLA ' +
          res.priority +
          ' estourado (limite de ' +
          targetHours +
          'h úteis ultrapassado; decorridos ' +
          waiting +
          'h úteis).'
        r.set('escalated_reason', reasonMsg)

        if (!alertSent) {
          r.set('escalation_alert_sent', true)
          sendEscalationAlerts(r, reasonMsg, waiting)
        }
        escalatedCount++
      }

      try {
        $app.save(r)
      } catch (saveErr) {
        $app.logger().error('Erro ao atualizar e-mail na torre: ' + saveErr)
      }
    }
  } catch (err) {
    $app.logger().error('[Torre de Controle] Erro no cron: ' + err)
  }
})

// ROTAS HTTP API

// 1. Endpoint para forçar recálculo geral
routerAdd(
  'POST',
  '/backend/v1/control-tower/recalculate',
  (e) => {
    function getCfg() {
      var def = {
        weight_departure_24h: 50,
        weight_departure_48h: 30,
        weight_cancellation: 35,
        weight_priority_client: 25,
        weight_per_hour_inbox: 5,
        weight_promised_deadline: 20,
        weight_formal_complaint: 40,
        weight_repeat_contact: 15,
        weight_persistent_client: 20,
        score_threshold_p1: 60,
        score_threshold_p2: 30,
        business_hours_start: '08:00',
        business_hours_end: '18:00',
        business_days: [1, 2, 3, 4, 5],
        target_sla_p1_hours: 2,
        target_sla_p2_hours: 4,
        target_sla_p3_hours: 8,
      }
      try {
        var r = $app.findRecordsByFilter('control_tower_configs', '', '-created', 1, 0)
        if (r && r.length > 0) {
          return {
            weight_departure_24h: r[0].getFloat('weight_departure_24h') || def.weight_departure_24h,
            weight_departure_48h: r[0].getFloat('weight_departure_48h') || def.weight_departure_48h,
            weight_cancellation: r[0].getFloat('weight_cancellation') || def.weight_cancellation,
            weight_priority_client:
              r[0].getFloat('weight_priority_client') || def.weight_priority_client,
            weight_per_hour_inbox:
              r[0].getFloat('weight_per_hour_inbox') || def.weight_per_hour_inbox,
            weight_promised_deadline:
              r[0].getFloat('weight_promised_deadline') || def.weight_promised_deadline,
            weight_formal_complaint:
              r[0].getFloat('weight_formal_complaint') || def.weight_formal_complaint,
            weight_repeat_contact:
              r[0].getFloat('weight_repeat_contact') || def.weight_repeat_contact,
            weight_persistent_client:
              r[0].getFloat('weight_persistent_client') || def.weight_persistent_client,
            score_threshold_p1: r[0].getFloat('score_threshold_p1') || def.score_threshold_p1,
            score_threshold_p2: r[0].getFloat('score_threshold_p2') || def.score_threshold_p2,
            business_hours_start:
              r[0].getString('business_hours_start') || def.business_hours_start,
            business_hours_end: r[0].getString('business_hours_end') || def.business_hours_end,
            business_days: r[0].get('business_days') || def.business_days,
            target_sla_p1_hours: r[0].getFloat('target_sla_p1_hours') || def.target_sla_p1_hours,
            target_sla_p2_hours: r[0].getFloat('target_sla_p2_hours') || def.target_sla_p2_hours,
            target_sla_p3_hours: r[0].getFloat('target_sla_p3_hours') || def.target_sla_p3_hours,
          }
        }
      } catch (_) {}
      return def
    }

    function calcBizHours(startDate, endDate, cfg) {
      if (!startDate || !endDate) return 0
      var start = new Date(startDate)
      var end = new Date(endDate)
      if (end <= start) return 0
      var bStartParts = (cfg.business_hours_start || '08:00').split(':')
      var bEndParts = (cfg.business_hours_end || '18:00').split(':')
      var startHour = parseInt(bStartParts[0], 10) || 8
      var startMin = parseInt(bStartParts[1], 10) || 0
      var endHour = parseInt(bEndParts[0], 10) || 18
      var endMin = parseInt(bEndParts[1], 10) || 0
      var bDays = Array.isArray(cfg.business_days) ? cfg.business_days : [1, 2, 3, 4, 5]

      var totalMs = 0
      var cur = new Date(start.getTime())
      var maxD = 60
      var dCount = 0
      while (cur < end && dCount < maxD) {
        if (bDays.indexOf(cur.getDay()) !== -1) {
          var dayStart = new Date(
            cur.getFullYear(),
            cur.getMonth(),
            cur.getDate(),
            startHour,
            startMin,
            0,
          )
          var dayEnd = new Date(
            cur.getFullYear(),
            cur.getMonth(),
            cur.getDate(),
            endHour,
            endMin,
            0,
          )
          var effStart = cur > dayStart ? cur : dayStart
          var effEnd = end < dayEnd ? end : dayEnd
          if (effStart < effEnd && effEnd > dayStart && effStart < dayEnd) {
            totalMs += effEnd.getTime() - effStart.getTime()
          }
        }
        cur = new Date(cur.getFullYear(), cur.getMonth(), cur.getDate() + 1, 0, 0, 0)
        dCount++
      }
      return Math.round((totalMs / 3600000) * 10) / 10
    }

    function addBizHours(startDate, targetHours, cfg) {
      if (!startDate || targetHours <= 0) return new Date().toISOString()
      var cur = new Date(startDate)
      var bStartParts = (cfg.business_hours_start || '08:00').split(':')
      var bEndParts = (cfg.business_hours_end || '18:00').split(':')
      var startHour = parseInt(bStartParts[0], 10) || 8
      var startMin = parseInt(bStartParts[1], 10) || 0
      var endHour = parseInt(bEndParts[0], 10) || 18
      var endMin = parseInt(bEndParts[1], 10) || 0
      var bDays = Array.isArray(cfg.business_days) ? cfg.business_days : [1, 2, 3, 4, 5]

      var remainingMs = targetHours * 3600000
      var maxDays = 90
      var dayIterations = 0

      while (remainingMs > 0 && dayIterations < maxDays) {
        var dayOfWeek = cur.getDay()
        if (bDays.indexOf(dayOfWeek) !== -1) {
          var dayStart = new Date(
            cur.getFullYear(),
            cur.getMonth(),
            cur.getDate(),
            startHour,
            startMin,
            0,
          )
          var dayEnd = new Date(
            cur.getFullYear(),
            cur.getMonth(),
            cur.getDate(),
            endHour,
            endMin,
            0,
          )

          if (cur < dayStart) cur = new Date(dayStart.getTime())
          if (cur < dayEnd) {
            var msAvailableToday = dayEnd.getTime() - cur.getTime()
            if (remainingMs <= msAvailableToday) {
              cur = new Date(cur.getTime() + remainingMs)
              remainingMs = 0
              break
            } else {
              remainingMs -= msAvailableToday
              cur = new Date(
                cur.getFullYear(),
                cur.getMonth(),
                cur.getDate() + 1,
                startHour,
                startMin,
                0,
              )
            }
          } else {
            cur = new Date(
              cur.getFullYear(),
              cur.getMonth(),
              cur.getDate() + 1,
              startHour,
              startMin,
              0,
            )
          }
        } else {
          cur = new Date(
            cur.getFullYear(),
            cur.getMonth(),
            cur.getDate() + 1,
            startHour,
            startMin,
            0,
          )
        }
        dayIterations++
      }
      return cur.toISOString()
    }

    function parseStringList(val) {
      if (!val) return []
      if (Array.isArray(val)) return val
      if (typeof val === 'string') {
        try {
          var parsed = JSON.parse(val)
          if (Array.isArray(parsed)) return parsed
        } catch (_) {}
        return [val.trim()]
      }
      return []
    }

    function scoreCalc(signals, bizHours, cfg, messageCount) {
      var score = 0
      if (signals.indexOf('Embarque <24h') !== -1) score += cfg.weight_departure_24h || 50
      else if (signals.indexOf('Embarque <48h') !== -1) score += cfg.weight_departure_48h || 30
      if (signals.indexOf('Cancelamento/Remarcação') !== -1) score += cfg.weight_cancellation || 35
      if (signals.indexOf('Cliente VIP') !== -1) score += cfg.weight_priority_client || 25
      if (signals.indexOf('Reclamação Formal') !== -1) score += cfg.weight_formal_complaint || 40
      if (signals.indexOf('Prazo Prometido') !== -1) score += cfg.weight_promised_deadline || 20
      if (signals.indexOf('Reincidente') !== -1) score += cfg.weight_repeat_contact || 15

      var mCount = messageCount || 1
      var hasPersistentSignal = false
      for (var s = 0; s < signals.length; s++) {
        if (signals[s].indexOf('Cliente insistente') !== -1) {
          hasPersistentSignal = true
          break
        }
      }
      if (mCount > 1 || hasPersistentSignal) {
        score += (cfg.weight_persistent_client || 20) * Math.min(3, mCount - 1)
      }

      if (bizHours > 0)
        score += Math.min(100, Math.floor(bizHours * (cfg.weight_per_hour_inbox || 5)))

      var prio = 'P3'
      if (score >= (cfg.score_threshold_p1 || 60)) prio = 'P1'
      else if (score >= (cfg.score_threshold_p2 || 30)) prio = 'P2'
      return { score: score, priority: prio }
    }

    var cfg = getCfg()
    var updated = 0
    var escalatedCount = 0
    try {
      var records = $app.findRecordsByFilter(
        'control_tower_emails',
        "(status = 'Novo' || status = 'Em tratamento' || status = 'Escalado') && is_thread_child != true",
        '',
        300,
        0,
      )
      var now = new Date()
      var nowIso = now.toISOString()
      for (var i = 0; i < records.length; i++) {
        var r = records[i]
        var recAt = r.getString('received_at') || r.getString('created')
        var waiting = calcBizHours(recAt, nowIso, cfg)
        var sigs = parseStringList(r.get('detected_signals'))
        var msgCount = r.getInt('message_count') || 1
        var res = scoreCalc(sigs, waiting, cfg, msgCount)
        r.set('business_hours_waiting', waiting)
        r.set('score', res.score)
        r.set('priority', res.priority)

        var currentDeadline = r.getString('sla_deadline')
        var targetHours =
          res.priority === 'P1'
            ? cfg.target_sla_p1_hours
            : res.priority === 'P2'
              ? cfg.target_sla_p2_hours
              : cfg.target_sla_p3_hours

        if (!currentDeadline) {
          currentDeadline = addBizHours(recAt, targetHours, cfg)
          r.set('sla_deadline', currentDeadline)
        }

        var currentStatus = r.getString('status')
        var deadlineDate = new Date(currentDeadline)
        var isDeadlineBreached = deadlineDate.getTime() < now.getTime()

        if (isDeadlineBreached && (currentStatus === 'Novo' || currentStatus === 'Em tratamento')) {
          r.set('status', 'Escalado')
          r.set('escalated_at', nowIso)
          var reasonMsg =
            'SLA ' +
            res.priority +
            ' estourado (limite de ' +
            targetHours +
            'h úteis ultrapassado; decorridos ' +
            waiting +
            'h úteis).'
          r.set('escalated_reason', reasonMsg)
          escalatedCount++
        }

        $app.save(r)
        updated++
      }
    } catch (err) {
      return e.badRequestError('Erro no recálculo: ' + err)
    }

    return e.json(200, {
      success: true,
      updated_count: updated,
      escalated_count: escalatedCount,
      message: 'Scores, threads e prazos de SLA processados com sucesso.',
    })
  },
  $apis.requireAuth(),
)

// 2. Endpoint para obter todas as mensagens de uma thread
routerAdd(
  'GET',
  '/backend/v1/control-tower/threads/{threadId}',
  (e) => {
    var threadId = (e.request.pathValue('threadId') || '').trim()
    if (!threadId) {
      return e.badRequestError('threadId é obrigatório')
    }

    try {
      var messages = $app.findRecordsByFilter(
        'control_tower_emails',
        "thread_id = '" + threadId + "' || id = '" + threadId + "'",
        'received_at, created',
        100,
        0,
      )

      var result = []
      for (var i = 0; i < messages.length; i++) {
        var m = messages[i]
        var clientId = m.getString('client')
        var assignedId = m.getString('assigned_to')
        var clientObj = null
        var assignedObj = null

        if (clientId) {
          try {
            var cRec = $app.findFirstRecordByData('clients', 'id', clientId)
            if (cRec) {
              clientObj = {
                id: cRec.id,
                name: cRec.getString('name'),
                company: cRec.getString('company'),
                priority_client: cRec.getBool('priority_client'),
              }
            }
          } catch (_) {}
        }

        if (assignedId) {
          try {
            var uRec = $app.findFirstRecordByData('users', 'id', assignedId)
            if (uRec) {
              assignedObj = {
                id: uRec.id,
                name: uRec.getString('name'),
                email: uRec.getString('email'),
              }
            }
          } catch (_) {}
        }

        var sigs = []
        var rawSig = m.get('detected_signals')
        if (Array.isArray(rawSig)) sigs = rawSig
        else if (typeof rawSig === 'string') {
          try {
            sigs = JSON.parse(rawSig)
          } catch (_) {}
        }

        result.push({
          id: m.id,
          subject: m.getString('subject'),
          sender_email: m.getString('sender_email'),
          sender_name: m.getString('sender_name'),
          recipient_email: m.getString('recipient_email'),
          body_snippet: m.getString('body_snippet'),
          received_at: m.getString('received_at'),
          service_group: m.getString('service_group'),
          team: m.getString('team'),
          inbox_address: m.getString('inbox_address'),
          client: clientId,
          reservation_number: m.getString('reservation_number'),
          detected_signals: sigs,
          score: m.getFloat('score'),
          priority: m.getString('priority'),
          status: m.getString('status'),
          assigned_to: assignedId,
          is_noise: m.getBool('is_noise'),
          external_message_id: m.getString('external_message_id'),
          thread_id: m.getString('thread_id'),
          thread_root: m.getString('thread_root'),
          is_thread_child: m.getBool('is_thread_child'),
          message_count: m.getInt('message_count') || 1,
          last_message_at: m.getString('last_message_at'),
          created: m.getString('created'),
          expand: {
            client: clientObj,
            assigned_to: assignedObj,
          },
        })
      }

      return e.json(200, {
        thread_id: threadId,
        count: result.length,
        messages: result,
      })
    } catch (err) {
      return e.badRequestError('Erro ao buscar mensagens da thread: ' + err)
    }
  },
  $apis.requireAuth(),
)

// 3. Endpoint para ingerir e-mails existentes da coleção de logs com suporte completo a THREADING
routerAdd(
  'POST',
  '/backend/v1/control-tower/ingest-from-logs',
  (e) => {
    function getCfg() {
      var def = {
        weight_departure_24h: 50,
        weight_departure_48h: 30,
        weight_cancellation: 35,
        weight_priority_client: 25,
        weight_per_hour_inbox: 5,
        weight_promised_deadline: 20,
        weight_formal_complaint: 40,
        weight_repeat_contact: 15,
        weight_persistent_client: 20,
        score_threshold_p1: 60,
        score_threshold_p2: 30,
        business_hours_start: '08:00',
        business_hours_end: '18:00',
        business_days: [1, 2, 3, 4, 5],
        target_sla_p1_hours: 2,
        target_sla_p2_hours: 4,
        target_sla_p3_hours: 8,
      }
      try {
        var r = $app.findRecordsByFilter('control_tower_configs', '', '-created', 1, 0)
        if (r && r.length > 0) {
          return {
            weight_departure_24h: r[0].getFloat('weight_departure_24h') || def.weight_departure_24h,
            weight_departure_48h: r[0].getFloat('weight_departure_48h') || def.weight_departure_48h,
            weight_cancellation: r[0].getFloat('weight_cancellation') || def.weight_cancellation,
            weight_priority_client:
              r[0].getFloat('weight_priority_client') || def.weight_priority_client,
            weight_per_hour_inbox:
              r[0].getFloat('weight_per_hour_inbox') || def.weight_per_hour_inbox,
            weight_promised_deadline:
              r[0].getFloat('weight_promised_deadline') || def.weight_promised_deadline,
            weight_formal_complaint:
              r[0].getFloat('weight_formal_complaint') || def.weight_formal_complaint,
            weight_repeat_contact:
              r[0].getFloat('weight_repeat_contact') || def.weight_repeat_contact,
            weight_persistent_client:
              r[0].getFloat('weight_persistent_client') || def.weight_persistent_client,
            score_threshold_p1: r[0].getFloat('score_threshold_p1') || def.score_threshold_p1,
            score_threshold_p2: r[0].getFloat('score_threshold_p2') || def.score_threshold_p2,
            business_hours_start:
              r[0].getString('business_hours_start') || def.business_hours_start,
            business_hours_end: r[0].getString('business_hours_end') || def.business_hours_end,
            business_days: r[0].get('business_days') || def.business_days,
            target_sla_p1_hours: r[0].getFloat('target_sla_p1_hours') || def.target_sla_p1_hours,
            target_sla_p2_hours: r[0].getFloat('target_sla_p2_hours') || def.target_sla_p2_hours,
            target_sla_p3_hours: r[0].getFloat('target_sla_p3_hours') || def.target_sla_p3_hours,
          }
        }
      } catch (_) {}
      return def
    }

    function isNoiseEmail(email, subj) {
      var em = (email || '').toLowerCase()
      var su = (subj || '').toLowerCase()
      var prefixes = [
        'no-reply',
        'noreply',
        'nao-responda',
        'donotreply',
        'mailer-daemon',
        'postmaster@',
        'bounce',
      ]
      for (var i = 0; i < prefixes.length; i++) {
        if (em.indexOf(prefixes[i]) !== -1) return true
      }
      if (su.indexOf('undeliverable') !== -1 || su.indexOf('delivery status') !== -1) return true
      return false
    }

    function normalizeSubject(subj) {
      if (!subj) return ''
      var s = subj.trim()
      var regex = /^\s*(re\s*:\s*|fwd\s*:\s*|enc\s*:\s*|res\s*:\s*|rv\s*:\s*)+/i
      while (regex.test(s)) {
        s = s.replace(regex, '').trim()
      }
      return s.toLowerCase().replace(/\s+/g, ' ')
    }

    function calcBizHours(startDate, endDate, cfg) {
      if (!startDate || !endDate) return 0
      var start = new Date(startDate)
      var end = new Date(endDate)
      if (end <= start) return 0
      var bStartParts = (cfg.business_hours_start || '08:00').split(':')
      var bEndParts = (cfg.business_hours_end || '18:00').split(':')
      var startHour = parseInt(bStartParts[0], 10) || 8
      var startMin = parseInt(bStartParts[1], 10) || 0
      var endHour = parseInt(bEndParts[0], 10) || 18
      var endMin = parseInt(bEndParts[1], 10) || 0
      var bDays = Array.isArray(cfg.business_days) ? cfg.business_days : [1, 2, 3, 4, 5]

      var totalMs = 0
      var cur = new Date(start.getTime())
      var maxD = 60
      var dCount = 0
      while (cur < end && dCount < maxD) {
        if (bDays.indexOf(cur.getDay()) !== -1) {
          var dayStart = new Date(
            cur.getFullYear(),
            cur.getMonth(),
            cur.getDate(),
            startHour,
            startMin,
            0,
          )
          var dayEnd = new Date(
            cur.getFullYear(),
            cur.getMonth(),
            cur.getDate(),
            endHour,
            endMin,
            0,
          )
          var effStart = cur > dayStart ? cur : dayStart
          var effEnd = end < dayEnd ? end : dayEnd
          if (effStart < effEnd && effEnd > dayStart && effStart < dayEnd) {
            totalMs += effEnd.getTime() - effStart.getTime()
          }
        }
        cur = new Date(cur.getFullYear(), cur.getMonth(), cur.getDate() + 1, 0, 0, 0)
        dCount++
      }
      return Math.round((totalMs / 3600000) * 10) / 10
    }

    function addBizHours(startDate, targetHours, cfg) {
      if (!startDate || targetHours <= 0) return new Date().toISOString()
      var cur = new Date(startDate)
      var bStartParts = (cfg.business_hours_start || '08:00').split(':')
      var bEndParts = (cfg.business_hours_end || '18:00').split(':')
      var startHour = parseInt(bStartParts[0], 10) || 8
      var startMin = parseInt(bStartParts[1], 10) || 0
      var endHour = parseInt(bEndParts[0], 10) || 18
      var endMin = parseInt(bEndParts[1], 10) || 0
      var bDays = Array.isArray(cfg.business_days) ? cfg.business_days : [1, 2, 3, 4, 5]

      var remainingMs = targetHours * 3600000
      var maxDays = 90
      var dayIterations = 0

      while (remainingMs > 0 && dayIterations < maxDays) {
        var dayOfWeek = cur.getDay()
        if (bDays.indexOf(dayOfWeek) !== -1) {
          var dayStart = new Date(
            cur.getFullYear(),
            cur.getMonth(),
            cur.getDate(),
            startHour,
            startMin,
            0,
          )
          var dayEnd = new Date(
            cur.getFullYear(),
            cur.getMonth(),
            cur.getDate(),
            endHour,
            endMin,
            0,
          )

          if (cur < dayStart) cur = new Date(dayStart.getTime())
          if (cur < dayEnd) {
            var msAvailableToday = dayEnd.getTime() - cur.getTime()
            if (remainingMs <= msAvailableToday) {
              cur = new Date(cur.getTime() + remainingMs)
              remainingMs = 0
              break
            } else {
              remainingMs -= msAvailableToday
              cur = new Date(
                cur.getFullYear(),
                cur.getMonth(),
                cur.getDate() + 1,
                startHour,
                startMin,
                0,
              )
            }
          } else {
            cur = new Date(
              cur.getFullYear(),
              cur.getMonth(),
              cur.getDate() + 1,
              startHour,
              startMin,
              0,
            )
          }
        } else {
          cur = new Date(
            cur.getFullYear(),
            cur.getMonth(),
            cur.getDate() + 1,
            startHour,
            startMin,
            0,
          )
        }
        dayIterations++
      }
      return cur.toISOString()
    }

    function parseSignals(subj, snippet, receivedAtStr, isVip, isRepeat) {
      var fullText = ((subj || '') + ' ' + (snippet || '')).toLowerCase()
      var signals = []
      var detectedDates = []
      var reservationNumber = ''

      var resMatch = fullText.match(
        /\b(?:loc(?:alizador)?|reserva|pnr|localizador:?|reserva:?)\s*[:#]?\s*([a-z0-9]{5,8})\b/i,
      )
      if (resMatch && resMatch[1]) {
        reservationNumber = resMatch[1].toUpperCase()
      } else {
        var codeMatch = fullText.match(/\b([a-z0-9]{6})\b/i)
        if (codeMatch && codeMatch[1] && !codeMatch[1].match(/^[0-9]+$/)) {
          reservationNumber = codeMatch[1].toUpperCase()
        }
      }

      var dateMatches = fullText.match(/\b(\d{1,2}\/\d{1,2}(?:\/\d{2,4})?)\b/g)
      var closestDiff = null
      if (dateMatches && dateMatches.length > 0) {
        var ref = receivedAtStr ? new Date(receivedAtStr) : new Date()
        var curY = ref.getFullYear()
        for (var d = 0; d < dateMatches.length; d++) {
          var dStr = dateMatches[d]
          var p = dStr.split('/')
          var dy = parseInt(p[0], 10)
          var mo = parseInt(p[1], 10) - 1
          var yr = p.length === 3 ? parseInt(p[2], 10) : curY
          if (yr < 100) yr += 2000
          if (dy >= 1 && dy <= 31 && mo >= 0 && mo <= 11) {
            detectedDates.push(dStr)
            var targetD = new Date(yr, mo, dy, 12, 0, 0)
            var diff = (targetD.getTime() - ref.getTime()) / 3600000
            if (diff >= -12 && diff <= 240) {
              if (closestDiff === null || diff < closestDiff) closestDiff = diff
            }
          }
        }
      }

      var hasDepKeywords =
        fullText.indexOf('embarque') !== -1 ||
        fullText.indexOf('partida') !== -1 ||
        fullText.indexOf('voo') !== -1 ||
        fullText.indexOf('check-in') !== -1 ||
        fullText.indexOf('checkin') !== -1
      if (closestDiff !== null) {
        if (closestDiff <= 24) signals.push('Embarque <24h')
        else if (closestDiff <= 48) signals.push('Embarque <48h')
      } else if (hasDepKeywords) {
        if (fullText.indexOf('hoje') !== -1 || fullText.indexOf('urgente') !== -1)
          signals.push('Embarque <24h')
        else signals.push('Embarque <48h')
      }

      if (
        fullText.indexOf('cancel') !== -1 ||
        fullText.indexOf('remarca') !== -1 ||
        fullText.indexOf('reagend') !== -1 ||
        fullText.indexOf('alteração de voo') !== -1
      ) {
        signals.push('Cancelamento/Remarcação')
      }
      if (
        fullText.indexOf('procon') !== -1 ||
        fullText.indexOf('juríd') !== -1 ||
        fullText.indexOf('jurid') !== -1 ||
        fullText.indexOf('reclamação formal') !== -1 ||
        fullText.indexOf('reclame aqui') !== -1 ||
        fullText.indexOf('advogado') !== -1
      ) {
        signals.push('Reclamação Formal')
      }
      if (
        fullText.indexOf('prazo') !== -1 ||
        fullText.indexOf('até às') !== -1 ||
        fullText.indexOf('urgência') !== -1 ||
        fullText.indexOf('retorno') !== -1
      ) {
        signals.push('Prazo Prometido')
      }
      if (isVip) signals.push('Cliente VIP')
      if (isRepeat) signals.push('Reincidente')

      var cleanSignals = []
      for (var s = 0; s < signals.length; s++) {
        if (cleanSignals.indexOf(signals[s]) === -1) cleanSignals.push(signals[s])
      }
      var cleanDates = []
      for (var c = 0; c < detectedDates.length; c++) {
        if (cleanDates.indexOf(detectedDates[c]) === -1) cleanDates.push(detectedDates[c])
      }

      return {
        signals: cleanSignals,
        detectedDates: cleanDates,
        reservationNumber: reservationNumber,
      }
    }

    function scoreCalc(signals, bizHours, cfg, messageCount) {
      var score = 0
      if (signals.indexOf('Embarque <24h') !== -1) score += cfg.weight_departure_24h || 50
      else if (signals.indexOf('Embarque <48h') !== -1) score += cfg.weight_departure_48h || 30
      if (signals.indexOf('Cancelamento/Remarcação') !== -1) score += cfg.weight_cancellation || 35
      if (signals.indexOf('Cliente VIP') !== -1) score += cfg.weight_priority_client || 25
      if (signals.indexOf('Reclamação Formal') !== -1) score += cfg.weight_formal_complaint || 40
      if (signals.indexOf('Prazo Prometido') !== -1) score += cfg.weight_promised_deadline || 20
      if (signals.indexOf('Reincidente') !== -1) score += cfg.weight_repeat_contact || 15

      var mCount = messageCount || 1
      var hasPersistentSignal = false
      for (var s = 0; s < signals.length; s++) {
        if (signals[s].indexOf('Cliente insistente') !== -1) {
          hasPersistentSignal = true
          break
        }
      }
      if (mCount > 1 || hasPersistentSignal) {
        score += (cfg.weight_persistent_client || 20) * Math.min(3, mCount - 1)
      }

      if (bizHours > 0)
        score += Math.min(100, Math.floor(bizHours * (cfg.weight_per_hour_inbox || 5)))

      var prio = 'P3'
      if (score >= (cfg.score_threshold_p1 || 60)) prio = 'P1'
      else if (score >= (cfg.score_threshold_p2 || 30)) prio = 'P2'
      return { score: score, priority: prio }
    }

    var body = e.requestInfo().body || {}
    var limit = parseInt(body.limit, 10) || 50
    var cfg = getCfg()
    var emailsCol = $app.findCollectionByNameOrId('control_tower_emails')
    var logs = []
    try {
      if ($app.hasTable('email_analysis_logs')) {
        logs = $app.findRecordsByFilter('email_analysis_logs', '', '-created', limit, 0)
      }
    } catch (_) {}

    var processed = 0
    var skipped = 0
    var mergedToThread = 0
    var nowIso = new Date().toISOString()

    for (var i = 0; i < logs.length; i++) {
      var log = logs[i]
      var logId = log.id
      var sEmail = (log.getString('sender_email') || '').trim().toLowerCase()
      var subj = log.getString('subject') || ''
      var bodySnip = log.getString('body_snippet') || ''
      var rAt = log.getString('received_at') || log.getString('created') || nowIso
      var extId = log.getString('outlook_message_id') || 'log_' + logId

      try {
        var existing = $app.findRecordsByFilter(
          'control_tower_emails',
          "external_message_id = '" + extId + "' || email_analysis_log = '" + logId + "'",
          '',
          1,
          0,
        )
        if (existing && existing.length > 0) {
          skipped++
          continue
        }
      } catch (_) {}

      var isNoise = isNoiseEmail(sEmail, subj)
      var clientId = log.getString('client')
      var isVip = false
      var sGroup = ''

      if (clientId) {
        try {
          var c = $app.findFirstRecordByData('clients', 'id', clientId)
          if (c) {
            isVip = c.getBool('priority_client')
            sGroup = c.getString('service_group')
          }
        } catch (_) {}
      } else if (sEmail) {
        try {
          var cByEmail = $app.findFirstRecordByData('clients', 'email', sEmail)
          if (cByEmail) {
            clientId = cByEmail.id
            isVip = cByEmail.getBool('priority_client')
            sGroup = cByEmail.getString('service_group')
          }
        } catch (_) {}
      }

      var isRepeat = false
      try {
        if (sEmail) {
          var prev = $app.findRecordsByFilter(
            'email_analysis_logs',
            "sender_email = '" + sEmail + "' && id != '" + logId + "'",
            '-created',
            1,
            0,
          )
          if (prev && prev.length > 0) isRepeat = true
        }
      } catch (_) {}

      var sigRes = parseSignals(subj, bodySnip, rAt, isVip, isRepeat)
      var bizHours = calcBizHours(rAt, nowIso, cfg)

      var team = 'Nacional'
      var fullLower = ((subj || '') + ' ' + (bodySnip || '')).toLowerCase()
      if (
        fullLower.indexOf('internacional') !== -1 ||
        fullLower.indexOf('inter') !== -1 ||
        fullLower.indexOf('passaporte') !== -1 ||
        fullLower.indexOf('dólar') !== -1 ||
        fullLower.indexOf('usd') !== -1
      ) {
        team = 'Internacional'
      }

      var chosenGroup = sGroup || 'SAO'
      var inboxAddress = 'atendimento.' + chosenGroup.toLowerCase() + '@rexturadvance.com.br'

      // ============================================
      // DETECÇÃO DE THREADING DETERMINÍSTICO
      // ============================================
      var normSubj = normalizeSubject(subj)
      var foundThreadRoot = null

      try {
        // Janela de 7 dias para conversas ativas dentro da mesma caixa compartilhada
        var sevenDaysAgo = new Date(new Date(rAt).getTime() - 7 * 86400000).toISOString()
        var candidateRoots = $app.findRecordsByFilter(
          'control_tower_emails',
          "sender_email = '" +
            sEmail +
            "' && inbox_address = '" +
            inboxAddress +
            "' && is_thread_child != true && status != 'Resolvido' && received_at >= '" +
            sevenDaysAgo +
            "'",
          '-received_at',
          10,
          0,
        )

        for (var cIdx = 0; cIdx < candidateRoots.length; cIdx++) {
          var cand = candidateRoots[cIdx]
          var candNorm = normalizeSubject(cand.getString('subject'))
          if (candNorm && normSubj && candNorm === normSubj) {
            foundThreadRoot = cand
            break
          }
        }
      } catch (_) {}

      // Se achou uma thread raiz ativa na mesma caixa compartilhada:
      if (foundThreadRoot) {
        var currentCount = foundThreadRoot.getInt('message_count') || 1
        var newCount = currentCount + 1
        var threadId = foundThreadRoot.getString('thread_id') || 'th_' + foundThreadRoot.id

        // Mesclar sinais da nova mensagem na thread raiz
        var rootSigs = []
        var rawRootSig = foundThreadRoot.get('detected_signals')
        if (Array.isArray(rawRootSig)) rootSigs = rawRootSig
        else if (typeof rawRootSig === 'string') {
          try {
            rootSigs = JSON.parse(rawRootSig)
          } catch (_) {}
        }

        for (var s = 0; s < sigRes.signals.length; s++) {
          if (rootSigs.indexOf(sigRes.signals[s]) === -1) {
            rootSigs.push(sigRes.signals[s])
          }
        }

        // Adicionar / atualizar sinal de cliente insistente
        var persistSignal = 'Cliente insistente (' + newCount + ' msgs)'
        // Remover sinal de insistência anterior se houver
        var filteredSigs = []
        for (var f = 0; f < rootSigs.length; f++) {
          if (rootSigs[f].indexOf('Cliente insistente') === -1) {
            filteredSigs.push(rootSigs[f])
          }
        }
        filteredSigs.push(persistSignal)

        // Recalcular score e prioridade da thread com o bônus de persistência
        var rootRecAt =
          foundThreadRoot.getString('received_at') || foundThreadRoot.getString('created')
        var rootBizWaiting = calcBizHours(rootRecAt, nowIso, cfg)
        var newRootScRes = scoreCalc(filteredSigs, rootBizWaiting, cfg, newCount)

        // A thread herda o MELHOR score e prioridade
        var finalScore = Math.max(foundThreadRoot.getFloat('score') || 0, newRootScRes.score)
        var finalPriority = foundThreadRoot.getString('priority') || 'P3'
        if (newRootScRes.priority === 'P1' || finalPriority === 'P1') {
          finalPriority = 'P1'
        } else if (newRootScRes.priority === 'P2' || finalPriority === 'P2') {
          finalPriority = 'P2'
        }

        // Se thread estava Aguardando cliente, a resposta do cliente reabre para Em tratamento / Novo
        var rootStatus = foundThreadRoot.getString('status')
        if (rootStatus === 'Aguardando cliente') {
          rootStatus = foundThreadRoot.getString('assigned_to') ? 'Em tratamento' : 'Novo'
        }

        foundThreadRoot.set('message_count', newCount)
        foundThreadRoot.set('detected_signals', filteredSigs)
        foundThreadRoot.set('score', finalScore)
        foundThreadRoot.set('priority', finalPriority)
        foundThreadRoot.set('last_message_at', rAt)
        foundThreadRoot.set('status', rootStatus)

        // Se nova mensagem trouxer reserva/PNR que a thread ainda não tinha
        if (!foundThreadRoot.getString('reservation_number') && sigRes.reservationNumber) {
          foundThreadRoot.set('reservation_number', sigRes.reservationNumber)
        }

        $app.save(foundThreadRoot)

        // Criar registro filho da mensagem dentro da thread
        var childScRes = scoreCalc(sigRes.signals, bizHours, cfg, 1)
        var childRec = new Record(emailsCol)
        childRec.set('subject', subj)
        childRec.set('sender_email', sEmail)
        childRec.set('sender_name', log.getString('sender_name'))
        childRec.set('recipient_email', log.getString('recipient_email'))
        childRec.set('body_snippet', bodySnip)
        childRec.set('received_at', rAt)
        childRec.set('service_group', chosenGroup)
        childRec.set('team', team)
        childRec.set('inbox_address', inboxAddress)
        if (clientId) childRec.set('client', clientId)
        if (sigRes.reservationNumber) childRec.set('reservation_number', sigRes.reservationNumber)
        childRec.set('detected_dates', sigRes.detectedDates)
        childRec.set('detected_signals', sigRes.signals)
        childRec.set('score', childScRes.score)
        childRec.set('priority', childScRes.priority)
        childRec.set('status', rootStatus)
        childRec.set('is_noise', isNoise)
        childRec.set('external_message_id', extId)
        childRec.set('email_analysis_log', logId)
        childRec.set('thread_id', threadId)
        childRec.set('thread_root', foundThreadRoot.id)
        childRec.set('is_thread_child', true)
        childRec.set('message_count', 1)
        $app.save(childRec)

        mergedToThread++
        processed++
      } else {
        // Não é continuação de thread existente — criar novo Root de conversa
        var scRes = scoreCalc(sigRes.signals, bizHours, cfg, 1)
        var targetHours =
          scRes.priority === 'P1'
            ? cfg.target_sla_p1_hours
            : scRes.priority === 'P2'
              ? cfg.target_sla_p2_hours
              : cfg.target_sla_p3_hours
        var deadline = addBizHours(rAt, targetHours, cfg)

        var newRec = new Record(emailsCol)
        newRec.set('subject', subj)
        newRec.set('sender_email', sEmail)
        newRec.set('sender_name', log.getString('sender_name'))
        newRec.set('recipient_email', log.getString('recipient_email'))
        newRec.set('body_snippet', bodySnip)
        newRec.set('received_at', rAt)
        newRec.set('service_group', chosenGroup)
        newRec.set('team', team)
        newRec.set('inbox_address', inboxAddress)
        if (clientId) newRec.set('client', clientId)
        if (sigRes.reservationNumber) newRec.set('reservation_number', sigRes.reservationNumber)
        newRec.set('detected_dates', sigRes.detectedDates)
        newRec.set('detected_signals', sigRes.signals)
        newRec.set('score', scRes.score)
        newRec.set('priority', scRes.priority)
        newRec.set('status', isNoise ? 'Resolvido' : 'Novo')
        newRec.set('is_noise', isNoise)
        newRec.set('external_message_id', extId)
        newRec.set('email_analysis_log', logId)
        newRec.set('business_hours_waiting', bizHours)
        newRec.set('sla_deadline', deadline)

        // Thread fields
        newRec.set('message_count', 1)
        newRec.set('is_thread_child', false)
        newRec.set('last_message_at', rAt)

        $app.save(newRec)

        // Definir thread_id após salvar para usar seu próprio ID
        newRec.set('thread_id', 'th_' + newRec.id)
        $app.save(newRec)

        processed++
      }
    }

    return e.json(200, {
      success: true,
      processed: processed,
      merged_to_thread: mergedToThread,
      skipped: skipped,
      message:
        'Ingestão da caixa concluída: ' +
        processed +
        ' mensagens processadas (' +
        mergedToThread +
        ' agrupadas em threads existentes).',
    })
  },
  $apis.requireAuth(),
)

// 4. Endpoint para assumir ou atribuir ownership (aplicado à thread inteira)
routerAdd(
  'POST',
  '/backend/v1/control-tower/assign',
  (e) => {
    function getCfg() {
      var def = {
        business_hours_start: '08:00',
        business_hours_end: '18:00',
        business_days: [1, 2, 3, 4, 5],
        target_sla_p1_hours: 2,
        target_sla_p2_hours: 4,
        target_sla_p3_hours: 8,
      }
      try {
        var r = $app.findRecordsByFilter('control_tower_configs', '', '-created', 1, 0)
        if (r && r.length > 0) {
          return {
            business_hours_start:
              r[0].getString('business_hours_start') || def.business_hours_start,
            business_hours_end: r[0].getString('business_hours_end') || def.business_hours_end,
            business_days: r[0].get('business_days') || def.business_days,
            target_sla_p1_hours: r[0].getFloat('target_sla_p1_hours') || def.target_sla_p1_hours,
            target_sla_p2_hours: r[0].getFloat('target_sla_p2_hours') || def.target_sla_p2_hours,
            target_sla_p3_hours: r[0].getFloat('target_sla_p3_hours') || def.target_sla_p3_hours,
          }
        }
      } catch (_) {}
      return def
    }

    function addBizHours(startDate, targetHours, cfg) {
      if (!startDate || targetHours <= 0) return new Date().toISOString()
      var cur = new Date(startDate)
      var bStartParts = (cfg.business_hours_start || '08:00').split(':')
      var bEndParts = (cfg.business_hours_end || '18:00').split(':')
      var startHour = parseInt(bStartParts[0], 10) || 8
      var startMin = parseInt(bStartParts[1], 10) || 0
      var endHour = parseInt(bEndParts[0], 10) || 18
      var endMin = parseInt(bEndParts[1], 10) || 0
      var bDays = Array.isArray(cfg.business_days) ? cfg.business_days : [1, 2, 3, 4, 5]

      var remainingMs = targetHours * 3600000
      var maxDays = 90
      var dayIterations = 0

      while (remainingMs > 0 && dayIterations < maxDays) {
        var dayOfWeek = cur.getDay()
        if (bDays.indexOf(dayOfWeek) !== -1) {
          var dayStart = new Date(
            cur.getFullYear(),
            cur.getMonth(),
            cur.getDate(),
            startHour,
            startMin,
            0,
          )
          var dayEnd = new Date(
            cur.getFullYear(),
            cur.getMonth(),
            cur.getDate(),
            endHour,
            endMin,
            0,
          )

          if (cur < dayStart) cur = new Date(dayStart.getTime())
          if (cur < dayEnd) {
            var msAvailableToday = dayEnd.getTime() - cur.getTime()
            if (remainingMs <= msAvailableToday) {
              cur = new Date(cur.getTime() + remainingMs)
              remainingMs = 0
              break
            } else {
              remainingMs -= msAvailableToday
              cur = new Date(
                cur.getFullYear(),
                cur.getMonth(),
                cur.getDate() + 1,
                startHour,
                startMin,
                0,
              )
            }
          } else {
            cur = new Date(
              cur.getFullYear(),
              cur.getMonth(),
              cur.getDate() + 1,
              startHour,
              startMin,
              0,
            )
          }
        } else {
          cur = new Date(
            cur.getFullYear(),
            cur.getMonth(),
            cur.getDate() + 1,
            startHour,
            startMin,
            0,
          )
        }
        dayIterations++
      }
      return cur.toISOString()
    }

    var body = e.requestInfo().body || {}
    var emailId = (body.email_id || '').trim()
    var targetUserId = (body.user_id || '').trim()

    if (!emailId) {
      return e.badRequestError('email_id é obrigatório.')
    }

    if (!targetUserId && e.auth) {
      targetUserId = e.auth.id
    }

    try {
      var record = $app.findFirstRecordByData('control_tower_emails', 'id', emailId)
      record.set('assigned_to', targetUserId || null)
      record.set('assigned_at', targetUserId ? new Date().toISOString() : null)

      var curStatus = record.getString('status')
      if (targetUserId && (curStatus === 'Novo' || curStatus === 'Escalado')) {
        record.set('status', 'Em tratamento')
        var cfg = getCfg()
        var prio = record.getString('priority') || 'P2'
        var targetHours =
          prio === 'P1'
            ? cfg.target_sla_p1_hours
            : prio === 'P2'
              ? cfg.target_sla_p2_hours
              : cfg.target_sla_p3_hours
        var newDeadline = addBizHours(new Date().toISOString(), targetHours, cfg)
        record.set('sla_deadline', newDeadline)
      }

      $app.save(record)

      // Se este record tiver thread_id, atualizar também as mensagens filhas da mesma thread
      var threadId = record.getString('thread_id')
      if (threadId) {
        try {
          var children = $app.findRecordsByFilter(
            'control_tower_emails',
            "thread_id = '" + threadId + "' && id != '" + record.id + "'",
            '',
            100,
            0,
          )
          for (var c = 0; c < children.length; c++) {
            var ch = children[c]
            ch.set('assigned_to', targetUserId || null)
            ch.set('assigned_at', targetUserId ? new Date().toISOString() : null)
            if (
              targetUserId &&
              (ch.getString('status') === 'Novo' || ch.getString('status') === 'Escalado')
            ) {
              ch.set('status', 'Em tratamento')
            }
            $app.save(ch)
          }
        } catch (_) {}
      }

      return e.json(200, {
        success: true,
        record_id: record.id,
        assigned_to: targetUserId,
        status: record.getString('status'),
        sla_deadline: record.getString('sla_deadline'),
      })
    } catch (err) {
      return e.badRequestError('Erro ao atribuir e-mail: ' + err)
    }
  },
  $apis.requireAuth(),
)
