// Motor de Priorização e Gestão da Torre de Controle (Skip Cloud / PocketBase pb_hooks)
// CRÍTICO: Todas as funções auxiliares devem ficar DENTRO de cada callback/rota para evitar o erro de scoping do PocketBase JSVM pool.

// CRON JOB: a cada 15 minutos, recalcula itens abertos e ingere novos logs
cronAdd('control_tower_recalculate', '*/15 * * * *', () => {
  $app.logger().info('[Torre de Controle] Iniciando cron de recálculo e ingestão...')

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
      score_threshold_p1: 60,
      score_threshold_p2: 30,
      business_hours_start: '08:00',
      business_hours_end: '18:00',
      business_days: [1, 2, 3, 4, 5],
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
          score_threshold_p1: r[0].getFloat('score_threshold_p1') || def.score_threshold_p1,
          score_threshold_p2: r[0].getFloat('score_threshold_p2') || def.score_threshold_p2,
          business_hours_start: r[0].getString('business_hours_start') || def.business_hours_start,
          business_hours_end: r[0].getString('business_hours_end') || def.business_hours_end,
          business_days: r[0].get('business_days') || def.business_days,
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

  function scoreCalc(signals, bizHours, cfg) {
    var score = 0
    if (signals.indexOf('Embarque <24h') !== -1) score += cfg.weight_departure_24h || 50
    else if (signals.indexOf('Embarque <48h') !== -1) score += cfg.weight_departure_48h || 30
    if (signals.indexOf('Cancelamento/Remarcação') !== -1) score += cfg.weight_cancellation || 35
    if (signals.indexOf('Cliente VIP') !== -1) score += cfg.weight_priority_client || 25
    if (signals.indexOf('Reclamação Formal') !== -1) score += cfg.weight_formal_complaint || 40
    if (signals.indexOf('Prazo Prometido') !== -1) score += cfg.weight_promised_deadline || 20
    if (signals.indexOf('Reincidente') !== -1) score += cfg.weight_repeat_contact || 15
    if (bizHours > 0)
      score += Math.min(100, Math.floor(bizHours * (cfg.weight_per_hour_inbox || 5)))

    var prio = 'P3'
    if (score >= (cfg.score_threshold_p1 || 60)) prio = 'P1'
    else if (score >= (cfg.score_threshold_p2 || 30)) prio = 'P2'
    return { score: score, priority: prio }
  }

  try {
    var cfg = getCfg()
    var records = $app.findRecordsByFilter(
      'control_tower_emails',
      "status = 'Novo' || status = 'Em tratamento'",
      '',
      300,
      0,
    )
    var nowIso = new Date().toISOString()
    for (var i = 0; i < records.length; i++) {
      var r = records[i]
      var recAt = r.getString('received_at') || r.getString('created')
      var waiting = calcBizHours(recAt, nowIso, cfg)
      var sigs = []
      try {
        var rawSigs = r.get('detected_signals')
        if (Array.isArray(rawSigs)) sigs = rawSigs
      } catch (_) {}
      var res = scoreCalc(sigs, waiting, cfg)
      r.set('business_hours_waiting', waiting)
      r.set('score', res.score)
      r.set('priority', res.priority)
      try {
        $app.save(r)
      } catch (_) {}
    }
    $app
      .logger()
      .info(
        '[Torre de Controle] Recálculo automático concluído: ' + records.length + ' processados.',
      )
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
        score_threshold_p1: 60,
        score_threshold_p2: 30,
        business_hours_start: '08:00',
        business_hours_end: '18:00',
        business_days: [1, 2, 3, 4, 5],
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
            score_threshold_p1: r[0].getFloat('score_threshold_p1') || def.score_threshold_p1,
            score_threshold_p2: r[0].getFloat('score_threshold_p2') || def.score_threshold_p2,
            business_hours_start:
              r[0].getString('business_hours_start') || def.business_hours_start,
            business_hours_end: r[0].getString('business_hours_end') || def.business_hours_end,
            business_days: r[0].get('business_days') || def.business_days,
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

    function scoreCalc(signals, bizHours, cfg) {
      var score = 0
      if (signals.indexOf('Embarque <24h') !== -1) score += cfg.weight_departure_24h || 50
      else if (signals.indexOf('Embarque <48h') !== -1) score += cfg.weight_departure_48h || 30
      if (signals.indexOf('Cancelamento/Remarcação') !== -1) score += cfg.weight_cancellation || 35
      if (signals.indexOf('Cliente VIP') !== -1) score += cfg.weight_priority_client || 25
      if (signals.indexOf('Reclamação Formal') !== -1) score += cfg.weight_formal_complaint || 40
      if (signals.indexOf('Prazo Prometido') !== -1) score += cfg.weight_promised_deadline || 20
      if (signals.indexOf('Reincidente') !== -1) score += cfg.weight_repeat_contact || 15
      if (bizHours > 0)
        score += Math.min(100, Math.floor(bizHours * (cfg.weight_per_hour_inbox || 5)))

      var prio = 'P3'
      if (score >= (cfg.score_threshold_p1 || 60)) prio = 'P1'
      else if (score >= (cfg.score_threshold_p2 || 30)) prio = 'P2'
      return { score: score, priority: prio }
    }

    var cfg = getCfg()
    var updated = 0
    try {
      var records = $app.findRecordsByFilter(
        'control_tower_emails',
        "status = 'Novo' || status = 'Em tratamento'",
        '',
        300,
        0,
      )
      var nowIso = new Date().toISOString()
      for (var i = 0; i < records.length; i++) {
        var r = records[i]
        var recAt = r.getString('received_at') || r.getString('created')
        var waiting = calcBizHours(recAt, nowIso, cfg)
        var sigs = []
        try {
          var rawSigs = r.get('detected_signals')
          if (Array.isArray(rawSigs)) sigs = rawSigs
        } catch (_) {}
        var res = scoreCalc(sigs, waiting, cfg)
        r.set('business_hours_waiting', waiting)
        r.set('score', res.score)
        r.set('priority', res.priority)
        $app.save(r)
        updated++
      }
    } catch (err) {
      return e.badRequestError('Erro no recálculo: ' + err)
    }

    return e.json(200, {
      success: true,
      updated_count: updated,
      message: 'Scores e horas úteis recalculados com sucesso.',
    })
  },
  $apis.requireAuth(),
)

// 2. Endpoint para ingerir e-mails existentes da coleção de logs
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
        score_threshold_p1: 60,
        score_threshold_p2: 30,
        business_hours_start: '08:00',
        business_hours_end: '18:00',
        business_days: [1, 2, 3, 4, 5],
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
            score_threshold_p1: r[0].getFloat('score_threshold_p1') || def.score_threshold_p1,
            score_threshold_p2: r[0].getFloat('score_threshold_p2') || def.score_threshold_p2,
            business_hours_start:
              r[0].getString('business_hours_start') || def.business_hours_start,
            business_hours_end: r[0].getString('business_hours_end') || def.business_hours_end,
            business_days: r[0].get('business_days') || def.business_days,
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

    function scoreCalc(signals, bizHours, cfg) {
      var score = 0
      if (signals.indexOf('Embarque <24h') !== -1) score += cfg.weight_departure_24h || 50
      else if (signals.indexOf('Embarque <48h') !== -1) score += cfg.weight_departure_48h || 30
      if (signals.indexOf('Cancelamento/Remarcação') !== -1) score += cfg.weight_cancellation || 35
      if (signals.indexOf('Cliente VIP') !== -1) score += cfg.weight_priority_client || 25
      if (signals.indexOf('Reclamação Formal') !== -1) score += cfg.weight_formal_complaint || 40
      if (signals.indexOf('Prazo Prometido') !== -1) score += cfg.weight_promised_deadline || 20
      if (signals.indexOf('Reincidente') !== -1) score += cfg.weight_repeat_contact || 15
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
    var nowIso = new Date().toISOString()

    for (var i = 0; i < logs.length; i++) {
      var log = logs[i]
      var logId = log.id
      var sEmail = log.getString('sender_email')
      var subj = log.getString('subject')
      var bodySnip = log.getString('body_snippet')
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
      var scRes = scoreCalc(sigRes.signals, bizHours, cfg)

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

      try {
        var rec = new Record(emailsCol)
        rec.set('subject', subj)
        rec.set('sender_email', sEmail)
        rec.set('sender_name', log.getString('sender_name'))
        rec.set('recipient_email', log.getString('recipient_email'))
        rec.set('body_snippet', bodySnip)
        rec.set('received_at', rAt)
        if (sGroup) rec.set('service_group', sGroup)
        rec.set('team', team)
        if (clientId) rec.set('client', clientId)
        if (sigRes.reservationNumber) rec.set('reservation_number', sigRes.reservationNumber)
        rec.set('detected_dates', sigRes.detectedDates)
        rec.set('detected_signals', sigRes.signals)
        rec.set('score', scRes.score)
        rec.set('priority', scRes.priority)
        rec.set('status', isNoise ? 'Resolvido' : 'Novo')
        rec.set('is_noise', isNoise)
        rec.set('external_message_id', extId)
        rec.set('email_analysis_log', logId)
        rec.set('business_hours_waiting', bizHours)

        $app.save(rec)
        processed++
      } catch (saveErr) {
        $app.logger().error('Erro ao salvar item na Torre: ' + saveErr)
      }
    }

    return e.json(200, {
      success: true,
      processed: processed,
      skipped: skipped,
      message: 'Ingestão e processamento da caixa de entrada concluídos.',
    })
  },
  $apis.requireAuth(),
)

// 3. Endpoint para assumir ou atribuir ownership
routerAdd(
  'POST',
  '/backend/v1/control-tower/assign',
  (e) => {
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

      if (targetUserId && record.getString('status') === 'Novo') {
        record.set('status', 'Em tratamento')
      }

      $app.save(record)

      return e.json(200, {
        success: true,
        record_id: record.id,
        assigned_to: targetUserId,
        status: record.getString('status'),
      })
    } catch (err) {
      return e.badRequestError('Erro ao atribuir e-mail: ' + err)
    }
  },
  $apis.requireAuth(),
)
