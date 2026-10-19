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
      weight_frustrated_client: 20,
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
          weight_frustrated_client:
            r[0].getFloat('weight_frustrated_client') || def.weight_frustrated_client,
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

  function analyzeSentiment(subj, snippet) {
    var text = ((subj || '') + ' ' + (snippet || '')).toLowerCase()
    if (!text.trim()) {
      return { score: 0, label: 'Neutro', intensity: 'Leve', reasons: [] }
    }

    var criticalTerms = [
      'procon',
      'processo judicial',
      'advogado',
      'ação judicial',
      'juizado especial',
      'danos morais',
      'reclame aqui',
      'ministério público',
      'polícia',
      'estelionato',
      'golpe',
      'fraude',
      'vou processar',
    ]

    var strongTerms = [
      'absurdo',
      'inadmissível',
      'inadmissivel',
      'vergonha',
      'falta de respeito',
      'desrespeito',
      'palhaçada',
      'palhacada',
      'humilhação',
      'humilhacao',
      'ridículo',
      'ridiculo',
      'descaso total',
      'prejuízo enorme',
      'prejuizo enorme',
      'incompetência',
      'incompetencia',
      'nunca mais',
      'terceira vez',
      'quarta vez',
      'ninguém resolve',
      'ninguem resolve',
      'quero cancelar',
      'quero meu dinheiro de volta',
      'estorno imediato',
      'não aguento mais',
      'nao aguento mais',
    ]

    var moderateTerms = [
      'insatisfação',
      'insatisfacao',
      'insatisfeito',
      'insatisfeita',
      'indignado',
      'indignada',
      'revoltado',
      'revoltada',
      'decepcionado',
      'decepcionada',
      'estou esperando há dias',
      'segunda vez',
      'novamente com problema',
      'não tive retorno',
      'nao tive retorno',
      'sem resposta',
      'demora excessiva',
      'urgência descumprida',
      'urgencia descumprida',
      'atraso inaceitável',
      'atraso inaceitavel',
    ]

    var positiveTerms = [
      'muito obrigado',
      'excelente atendimento',
      'parabéns',
      'parabens',
      'perfeito',
      'ótimo',
      'otimo',
      'maravilhoso',
      'sensacional',
      'rápido e eficiente',
      'rapido e eficiente',
      'super recomendo',
      'tudo certo',
      'resolvido com sucesso',
      'agradeço a atenção',
      'agradeco a atencao',
    ]

    var score = 0
    var reasons = []

    for (var c = 0; c < criticalTerms.length; c++) {
      if (text.indexOf(criticalTerms[c]) !== -1) {
        score -= 50
        reasons.push(criticalTerms[c])
      }
    }
    for (var s = 0; s < strongTerms.length; s++) {
      if (text.indexOf(strongTerms[s]) !== -1) {
        score -= 30
        reasons.push(strongTerms[s])
      }
    }
    for (var m = 0; m < moderateTerms.length; m++) {
      if (text.indexOf(moderateTerms[m]) !== -1) {
        score -= 15
        reasons.push(moderateTerms[m])
      }
    }

    var rawText = (subj || '') + ' ' + (snippet || '')
    var exclMatch = rawText.match(/!{2,}/g)
    if (exclMatch) {
      score -= 10
      reasons.push('pontos de exclamação múltiplos')
    }

    var capsMatch = rawText.match(/\b[A-ZÁÉÍÓÚÂÊÔÃÕÇ]{4,}\b/g)
    if (capsMatch && capsMatch.length >= 2) {
      score -= 10
      reasons.push('palavras em maiúsculas excessivas')
    }

    for (var p = 0; p < positiveTerms.length; p++) {
      if (text.indexOf(positiveTerms[p]) !== -1) {
        score += 25
        reasons.push(positiveTerms[p])
      }
    }

    if (score < -100) score = -100
    if (score > 100) score = 100

    var label = 'Neutro'
    var intensity = 'Leve'

    if (score <= -60) {
      label = 'Crítico'
      intensity = 'Forte'
    } else if (score <= -25) {
      label = 'Frustrado'
      intensity = score <= -40 ? 'Forte' : 'Moderado'
    } else if (score < -5) {
      label = 'Frustrado'
      intensity = 'Leve'
    } else if (score >= 20) {
      label = 'Positivo'
      intensity = score >= 50 ? 'Forte' : 'Moderado'
    }

    return {
      score: score,
      label: label,
      intensity: intensity,
      reasons: reasons.slice(0, 5),
    }
  }

  function scoreCalc(signals, bizHours, cfg, messageCount, sentimentLabel, sentimentIntensity) {
    var score = 0
    if (signals.indexOf('Embarque <24h') !== -1) score += cfg.weight_departure_24h || 50
    else if (signals.indexOf('Embarque <48h') !== -1) score += cfg.weight_departure_48h || 30
    if (signals.indexOf('Cancelamento/Remarcação') !== -1) score += cfg.weight_cancellation || 35
    if (signals.indexOf('Cliente VIP') !== -1) score += cfg.weight_priority_client || 25
    if (signals.indexOf('Reclamação Formal') !== -1) score += cfg.weight_formal_complaint || 40
    if (signals.indexOf('Prazo Prometido') !== -1) score += cfg.weight_promised_deadline || 20
    if (signals.indexOf('Reincidente') !== -1) score += cfg.weight_repeat_contact || 15

    // Análise de Sentimento: cliente frustrado / crítico sobe na fila com graduação
    var hasFrustratedSignal = false
    for (var si = 0; si < signals.length; si++) {
      if (signals[si].indexOf('Cliente Frustrado') !== -1) {
        hasFrustratedSignal = true
        break
      }
    }

    var baseFrustWeight = cfg.weight_frustrated_client || 20
    if (sentimentLabel === 'Crítico') {
      score += Math.round(baseFrustWeight * 1.5)
    } else if (sentimentLabel === 'Frustrado') {
      if (sentimentIntensity === 'Forte') {
        score += Math.round(baseFrustWeight * 1.25)
      } else if (sentimentIntensity === 'Moderado') {
        score += baseFrustWeight
      } else {
        score += Math.round(baseFrustWeight * 0.75)
      }
    } else if (hasFrustratedSignal) {
      score += baseFrustWeight
    }

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
    // Caso especial: array de números (bytes UTF-8 numéricos de JSON)
    if (Array.isArray(val)) {
      if (val.length === 0) return []
      if (typeof val[0] === 'number') {
        var nonZero = []
        for (var n = 0; n < val.length; n++) {
          if (val[n] !== 0) nonZero.push(val[n])
        }
        try {
          var str = ''
          for (var b = 0; b < nonZero.length; b++) {
            str += String.fromCharCode(nonZero[b])
          }
          if (str) return parseStringList(str)
        } catch (_) {}
      }
      var cleanArr = []
      for (var a = 0; a < val.length; a++) {
        var item = val[a]
        if (typeof item === 'string') {
          var trimmedItem = item.replace(/[\u0000-\u001F\u007F-\u009F]/g, '').trim()
          if (trimmedItem) {
            if (
              trimmedItem.indexOf('[') === 0 &&
              trimmedItem.lastIndexOf(']') === trimmedItem.length - 1
            ) {
              try {
                var inner = JSON.parse(trimmedItem)
                var sub = parseStringList(inner)
                for (var s = 0; s < sub.length; s++) {
                  if (cleanArr.indexOf(sub[s]) === -1) cleanArr.push(sub[s])
                }
                continue
              } catch (_) {}
            }
            if (cleanArr.indexOf(trimmedItem) === -1) cleanArr.push(trimmedItem)
          }
        } else if (item && typeof item === 'object') {
          var lbl =
            item.label ||
            item.name ||
            item.type ||
            item.signal ||
            item.title ||
            item.detail ||
            item.text
          if (lbl && typeof lbl === 'string') {
            var cLbl = lbl.replace(/[\u0000-\u001F\u007F-\u009F]/g, '').trim()
            if (cLbl && cleanArr.indexOf(cLbl) === -1) cleanArr.push(cLbl)
          }
        }
      }
      return cleanArr
    }
    if (typeof val === 'string') {
      var cleanedStr = val.replace(/[\u0000-\u001F\u007F-\u009F]/g, '').trim()
      if (!cleanedStr) return []
      try {
        var parsed = JSON.parse(cleanedStr)
        if (Array.isArray(parsed)) return parseStringList(parsed)
      } catch (_) {}
      return [cleanedStr]
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

      // Sentimento atual ou análise sob demanda se não preenchido
      var sLabel = r.getString('sentiment_label')
      var sIntensity = r.getString('sentiment_intensity')
      if (!sLabel) {
        var sRes = analyzeSentiment(r.getString('subject'), r.getString('body_snippet'))
        sLabel = sRes.label
        sIntensity = sRes.intensity
        r.set('sentiment_score', sRes.score)
        r.set('sentiment_label', sLabel)
        r.set('sentiment_intensity', sIntensity)
        r.set('sentiment_reasons', sRes.reasons)
        if (
          (sLabel === 'Frustrado' || sLabel === 'Crítico') &&
          sigs.indexOf('Cliente Frustrado') === -1
        ) {
          sigs.push('Cliente Frustrado')
          r.set('detected_signals', sigs)
        }
      }

      var res = scoreCalc(sigs, waiting, cfg, msgCount, sLabel, sIntensity)
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

// Disparo automático na alteração de status via PocketBase REST API
onRecordUpdate((e) => {
  try {
    var rec = e.record
    var newStatus = rec.getString('status')
    var oldStatus = rec.original().getString('status')

    var nowIso = new Date().toISOString()
    // 1. Se assumiu ou transicionou para "Em tratamento" pela primeira vez
    if (newStatus === 'Em tratamento' && !rec.getString('first_response_at')) {
      rec.set('first_response_at', nowIso)
    }

    // 2. Se mudou para "Resolvido"
    if (newStatus === 'Resolvido' && oldStatus !== 'Resolvido') {
      rec.set('resolved_at', nowIso)
    }
  } catch (_) {}
  e.next()
}, 'control_tower_emails')

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
            weight_frustrated_client:
              r[0].getFloat('weight_frustrated_client') || def.weight_frustrated_client || 20,
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
      if (Array.isArray(val)) {
        if (val.length === 0) return []
        if (typeof val[0] === 'number') {
          var nonZero = []
          for (var n = 0; n < val.length; n++) {
            if (val[n] !== 0) nonZero.push(val[n])
          }
          try {
            var str = ''
            for (var b = 0; b < nonZero.length; b++) {
              str += String.fromCharCode(nonZero[b])
            }
            if (str) return parseStringList(str)
          } catch (_) {}
        }
        var cleanArr = []
        for (var a = 0; a < val.length; a++) {
          var item = val[a]
          if (typeof item === 'string') {
            var trimmedItem = item.replace(/[\u0000-\u001F\u007F-\u009F]/g, '').trim()
            if (trimmedItem) {
              if (
                trimmedItem.indexOf('[') === 0 &&
                trimmedItem.lastIndexOf(']') === trimmedItem.length - 1
              ) {
                try {
                  var inner = JSON.parse(trimmedItem)
                  var sub = parseStringList(inner)
                  for (var s = 0; s < sub.length; s++) {
                    if (cleanArr.indexOf(sub[s]) === -1) cleanArr.push(sub[s])
                  }
                  continue
                } catch (_) {}
              }
              if (cleanArr.indexOf(trimmedItem) === -1) cleanArr.push(trimmedItem)
            }
          } else if (item && typeof item === 'object') {
            var lbl =
              item.label ||
              item.name ||
              item.type ||
              item.signal ||
              item.title ||
              item.detail ||
              item.text
            if (lbl && typeof lbl === 'string') {
              var cLbl = lbl.replace(/[\u0000-\u001F\u007F-\u009F]/g, '').trim()
              if (cLbl && cleanArr.indexOf(cLbl) === -1) cleanArr.push(cLbl)
            }
          }
        }
        return cleanArr
      }
      if (typeof val === 'string') {
        var cleanedStr = val.replace(/[\u0000-\u001F\u007F-\u009F]/g, '').trim()
        if (!cleanedStr) return []
        try {
          var parsed = JSON.parse(cleanedStr)
          if (Array.isArray(parsed)) return parseStringList(parsed)
        } catch (_) {}
        return [cleanedStr]
      }
      return []
    }

    function analyzeSentiment(subj, snippet) {
      var text = ((subj || '') + ' ' + (snippet || '')).toLowerCase()
      if (!text.trim()) {
        return { score: 0, label: 'Neutro', intensity: 'Leve', reasons: [] }
      }

      var criticalTerms = [
        'procon',
        'processo judicial',
        'advogado',
        'ação judicial',
        'juizado especial',
        'danos morais',
        'reclame aqui',
        'ministério público',
        'polícia',
        'estelionato',
        'golpe',
        'fraude',
        'vou processar',
      ]

      var strongTerms = [
        'absurdo',
        'inadmissível',
        'inadmissivel',
        'vergonha',
        'falta de respeito',
        'desrespeito',
        'palhaçada',
        'palhacada',
        'humilhação',
        'humilhacao',
        'ridículo',
        'ridiculo',
        'descaso total',
        'prejuízo enorme',
        'prejuizo enorme',
        'incompetência',
        'incompetencia',
        'nunca mais',
        'terceira vez',
        'quarta vez',
        'ninguém resolve',
        'ninguem resolve',
        'quero cancelar',
        'quero meu dinheiro de volta',
        'estorno imediato',
        'não aguento mais',
        'nao aguento mais',
      ]

      var moderateTerms = [
        'insatisfação',
        'insatisfacao',
        'insatisfeito',
        'insatisfeita',
        'indignado',
        'indignada',
        'revoltado',
        'revoltada',
        'decepcionado',
        'decepcionada',
        'estou esperando há dias',
        'segunda vez',
        'novamente com problema',
        'não tive retorno',
        'nao tive retorno',
        'sem resposta',
        'demora excessiva',
        'urgência descumprida',
        'urgencia descumprida',
        'atraso inaceitável',
        'atraso inaceitavel',
      ]

      var positiveTerms = [
        'muito obrigado',
        'excelente atendimento',
        'parabéns',
        'parabens',
        'perfeito',
        'ótimo',
        'otimo',
        'maravilhoso',
        'sensacional',
        'rápido e eficiente',
        'rapido e eficiente',
        'super recomendo',
        'tudo certo',
        'resolvido com sucesso',
        'agradeço a atenção',
        'agradeco a atencao',
      ]

      var score = 0
      var reasons = []

      for (var c = 0; c < criticalTerms.length; c++) {
        if (text.indexOf(criticalTerms[c]) !== -1) {
          score -= 50
          reasons.push(criticalTerms[c])
        }
      }
      for (var s = 0; s < strongTerms.length; s++) {
        if (text.indexOf(strongTerms[s]) !== -1) {
          score -= 30
          reasons.push(strongTerms[s])
        }
      }
      for (var m = 0; m < moderateTerms.length; m++) {
        if (text.indexOf(moderateTerms[m]) !== -1) {
          score -= 15
          reasons.push(moderateTerms[m])
        }
      }

      var rawText = (subj || '') + ' ' + (snippet || '')
      var exclMatch = rawText.match(/!{2,}/g)
      if (exclMatch) {
        score -= 10
        reasons.push('pontos de exclamação múltiplos')
      }

      var capsMatch = rawText.match(/\b[A-ZÁÉÍÓÚÂÊÔÃÕÇ]{4,}\b/g)
      if (capsMatch && capsMatch.length >= 2) {
        score -= 10
        reasons.push('palavras em maiúsculas excessivas')
      }

      for (var p = 0; p < positiveTerms.length; p++) {
        if (text.indexOf(positiveTerms[p]) !== -1) {
          score += 25
          reasons.push(positiveTerms[p])
        }
      }

      if (score < -100) score = -100
      if (score > 100) score = 100

      var label = 'Neutro'
      var intensity = 'Leve'

      if (score <= -60) {
        label = 'Crítico'
        intensity = 'Forte'
      } else if (score <= -25) {
        label = 'Frustrado'
        intensity = score <= -40 ? 'Forte' : 'Moderado'
      } else if (score < -5) {
        label = 'Frustrado'
        intensity = 'Leve'
      } else if (score >= 20) {
        label = 'Positivo'
        intensity = score >= 50 ? 'Forte' : 'Moderado'
      }

      return {
        score: score,
        label: label,
        intensity: intensity,
        reasons: reasons.slice(0, 5),
      }
    }

    function scoreCalc(signals, bizHours, cfg, messageCount, sentimentLabel, sentimentIntensity) {
      var score = 0
      if (signals.indexOf('Embarque <24h') !== -1) score += cfg.weight_departure_24h || 50
      else if (signals.indexOf('Embarque <48h') !== -1) score += cfg.weight_departure_48h || 30
      if (signals.indexOf('Cancelamento/Remarcação') !== -1) score += cfg.weight_cancellation || 35
      if (signals.indexOf('Cliente VIP') !== -1) score += cfg.weight_priority_client || 25
      if (signals.indexOf('Reclamação Formal') !== -1) score += cfg.weight_formal_complaint || 40
      if (signals.indexOf('Prazo Prometido') !== -1) score += cfg.weight_promised_deadline || 20
      if (signals.indexOf('Reincidente') !== -1) score += cfg.weight_repeat_contact || 15

      // Bônus de sentimento negativo / cliente frustrado
      var hasFrustratedSignal = false
      for (var si = 0; si < signals.length; si++) {
        if (signals[si].indexOf('Cliente Frustrado') !== -1) {
          hasFrustratedSignal = true
          break
        }
      }

      var baseFrustWeight = cfg.weight_frustrated_client || 20
      if (sentimentLabel === 'Crítico') {
        score += Math.round(baseFrustWeight * 1.5)
      } else if (sentimentLabel === 'Frustrado') {
        if (sentimentIntensity === 'Forte') {
          score += Math.round(baseFrustWeight * 1.25)
        } else if (sentimentIntensity === 'Moderado') {
          score += baseFrustWeight
        } else {
          score += Math.round(baseFrustWeight * 0.75)
        }
      } else if (hasFrustratedSignal) {
        score += baseFrustWeight
      }

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

        var sLabel = r.getString('sentiment_label')
        var sIntensity = r.getString('sentiment_intensity')
        if (!sLabel) {
          var sRes = analyzeSentiment(r.getString('subject'), r.getString('body_snippet'))
          sLabel = sRes.label
          sIntensity = sRes.intensity
          r.set('sentiment_score', sRes.score)
          r.set('sentiment_label', sLabel)
          r.set('sentiment_intensity', sIntensity)
          r.set('sentiment_reasons', sRes.reasons)
          if (
            (sLabel === 'Frustrado' || sLabel === 'Crítico') &&
            sigs.indexOf('Cliente Frustrado') === -1
          ) {
            sigs.push('Cliente Frustrado')
            r.set('detected_signals', sigs)
          }
        }

        var res = scoreCalc(sigs, waiting, cfg, msgCount, sLabel, sIntensity)
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

        var sigs = parseStringList(m.get('detected_signals'))

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
          sentiment_score: m.getFloat('sentiment_score'),
          sentiment_label: m.getString('sentiment_label'),
          sentiment_intensity: m.getString('sentiment_intensity'),
          sentiment_reasons: m.get('sentiment_reasons'),
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
            weight_frustrated_client:
              r[0].getFloat('weight_frustrated_client') || def.weight_frustrated_client || 20,
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

    function analyzeSentiment(subj, snippet) {
      var text = ((subj || '') + ' ' + (snippet || '')).toLowerCase()
      if (!text.trim()) {
        return { score: 0, label: 'Neutro', intensity: 'Leve', reasons: [] }
      }

      var criticalTerms = [
        'procon',
        'processo judicial',
        'advogado',
        'ação judicial',
        'juizado especial',
        'danos morais',
        'reclame aqui',
        'ministério público',
        'polícia',
        'estelionato',
        'golpe',
        'fraude',
        'vou processar',
      ]

      var strongTerms = [
        'absurdo',
        'inadmissível',
        'inadmissivel',
        'vergonha',
        'falta de respeito',
        'desrespeito',
        'palhaçada',
        'palhacada',
        'humilhação',
        'humilhacao',
        'ridículo',
        'ridiculo',
        'descaso total',
        'prejuízo enorme',
        'prejuizo enorme',
        'incompetência',
        'incompetencia',
        'nunca mais',
        'terceira vez',
        'quarta vez',
        'ninguém resolve',
        'ninguem resolve',
        'quero cancelar',
        'quero meu dinheiro de volta',
        'estorno imediato',
        'não aguento mais',
        'nao aguento mais',
      ]

      var moderateTerms = [
        'insatisfação',
        'insatisfacao',
        'insatisfeito',
        'insatisfeita',
        'indignado',
        'indignada',
        'revoltado',
        'revoltada',
        'decepcionado',
        'decepcionada',
        'estou esperando há dias',
        'segunda vez',
        'novamente com problema',
        'não tive retorno',
        'nao tive retorno',
        'sem resposta',
        'demora excessiva',
        'urgência descumprida',
        'urgencia descumprida',
        'atraso inaceitável',
        'atraso inaceitavel',
      ]

      var positiveTerms = [
        'muito obrigado',
        'excelente atendimento',
        'parabéns',
        'parabens',
        'perfeito',
        'ótimo',
        'otimo',
        'maravilhoso',
        'sensacional',
        'rápido e eficiente',
        'rapido e eficiente',
        'super recomendo',
        'tudo certo',
        'resolvido com sucesso',
        'agradeço a atenção',
        'agradeco a atencao',
      ]

      var score = 0
      var reasons = []

      for (var c = 0; c < criticalTerms.length; c++) {
        if (text.indexOf(criticalTerms[c]) !== -1) {
          score -= 50
          reasons.push(criticalTerms[c])
        }
      }
      for (var s = 0; s < strongTerms.length; s++) {
        if (text.indexOf(strongTerms[s]) !== -1) {
          score -= 30
          reasons.push(strongTerms[s])
        }
      }
      for (var m = 0; m < moderateTerms.length; m++) {
        if (text.indexOf(moderateTerms[m]) !== -1) {
          score -= 15
          reasons.push(moderateTerms[m])
        }
      }

      var rawText = (subj || '') + ' ' + (snippet || '')
      var exclMatch = rawText.match(/!{2,}/g)
      if (exclMatch) {
        score -= 10
        reasons.push('pontos de exclamação múltiplos')
      }

      var capsMatch = rawText.match(/\b[A-ZÁÉÍÓÚÂÊÔÃÕÇ]{4,}\b/g)
      if (capsMatch && capsMatch.length >= 2) {
        score -= 10
        reasons.push('palavras em maiúsculas excessivas')
      }

      for (var p = 0; p < positiveTerms.length; p++) {
        if (text.indexOf(positiveTerms[p]) !== -1) {
          score += 25
          reasons.push(positiveTerms[p])
        }
      }

      if (score < -100) score = -100
      if (score > 100) score = 100

      var label = 'Neutro'
      var intensity = 'Leve'

      if (score <= -60) {
        label = 'Crítico'
        intensity = 'Forte'
      } else if (score <= -25) {
        label = 'Frustrado'
        intensity = score <= -40 ? 'Forte' : 'Moderado'
      } else if (score < -5) {
        label = 'Frustrado'
        intensity = 'Leve'
      } else if (score >= 20) {
        label = 'Positivo'
        intensity = score >= 50 ? 'Forte' : 'Moderado'
      }

      return {
        score: score,
        label: label,
        intensity: intensity,
        reasons: reasons.slice(0, 5),
      }
    }

    function scoreCalc(signals, bizHours, cfg, messageCount, sentimentLabel, sentimentIntensity) {
      var score = 0
      if (signals.indexOf('Embarque <24h') !== -1) score += cfg.weight_departure_24h || 50
      else if (signals.indexOf('Embarque <48h') !== -1) score += cfg.weight_departure_48h || 30
      if (signals.indexOf('Cancelamento/Remarcação') !== -1) score += cfg.weight_cancellation || 35
      if (signals.indexOf('Cliente VIP') !== -1) score += cfg.weight_priority_client || 25
      if (signals.indexOf('Reclamação Formal') !== -1) score += cfg.weight_formal_complaint || 40
      if (signals.indexOf('Prazo Prometido') !== -1) score += cfg.weight_promised_deadline || 20
      if (signals.indexOf('Reincidente') !== -1) score += cfg.weight_repeat_contact || 15

      // Bônus de sentimento negativo / cliente frustrado
      var hasFrustratedSignal = false
      for (var si = 0; si < signals.length; si++) {
        if (signals[si].indexOf('Cliente Frustrado') !== -1) {
          hasFrustratedSignal = true
          break
        }
      }

      var baseFrustWeight = cfg.weight_frustrated_client || 20
      if (sentimentLabel === 'Crítico') {
        score += Math.round(baseFrustWeight * 1.5)
      } else if (sentimentLabel === 'Frustrado') {
        if (sentimentIntensity === 'Forte') {
          score += Math.round(baseFrustWeight * 1.25)
        } else if (sentimentIntensity === 'Moderado') {
          score += baseFrustWeight
        } else {
          score += Math.round(baseFrustWeight * 0.75)
        }
      } else if (hasFrustratedSignal) {
        score += baseFrustWeight
      }

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

      // Análise de sentimento determinística por léxico em português
      var sentAnalysis = analyzeSentiment(subj, bodySnip)
      if (sentAnalysis.label === 'Frustrado' || sentAnalysis.label === 'Crítico') {
        if (sigRes.signals.indexOf('Cliente Frustrado') === -1) {
          sigRes.signals.push('Cliente Frustrado')
        }
      }

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
        var rootSigs = parseStringList(foundThreadRoot.get('detected_signals'))

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

        // A thread herda o PIOR sentimento (mais crítico / negativo)
        var rootSentimentScore = foundThreadRoot.getFloat('sentiment_score') || 0
        var rootSentimentLabel = foundThreadRoot.getString('sentiment_label') || 'Neutro'
        var rootSentimentIntensity = foundThreadRoot.getString('sentiment_intensity') || 'Leve'
        var rootSentimentReasons = parseStringList(foundThreadRoot.get('sentiment_reasons'))

        var worstSentimentScore = Math.min(rootSentimentScore, sentAnalysis.score)
        var worstSentimentLabel = rootSentimentLabel
        var worstSentimentIntensity = rootSentimentIntensity

        // Ordem de gravidade: Crítico > Frustrado > Neutro > Positivo
        function getSeverity(lbl) {
          if (lbl === 'Crítico') return 4
          if (lbl === 'Frustrado') return 3
          if (lbl === 'Neutro') return 2
          return 1
        }

        if (getSeverity(sentAnalysis.label) > getSeverity(rootSentimentLabel)) {
          worstSentimentLabel = sentAnalysis.label
          worstSentimentIntensity = sentAnalysis.intensity
        } else if (getSeverity(sentAnalysis.label) === getSeverity(rootSentimentLabel)) {
          // Se mesma categoria, desempata pela intensidade ou menor score numérico
          if (sentAnalysis.score < rootSentimentScore) {
            worstSentimentIntensity = sentAnalysis.intensity
          }
        }

        // Mesclar razões de sentimento detectadas
        for (var rIdx = 0; rIdx < sentAnalysis.reasons.length; rIdx++) {
          if (rootSentimentReasons.indexOf(sentAnalysis.reasons[rIdx]) === -1) {
            rootSentimentReasons.push(sentAnalysis.reasons[rIdx])
          }
        }

        if (worstSentimentLabel === 'Frustrado' || worstSentimentLabel === 'Crítico') {
          if (filteredSigs.indexOf('Cliente Frustrado') === -1) {
            filteredSigs.push('Cliente Frustrado')
          }
        }

        // Recalcular score e prioridade da thread com o bônus de persistência e sentimento
        var rootRecAt =
          foundThreadRoot.getString('received_at') || foundThreadRoot.getString('created')
        var rootBizWaiting = calcBizHours(rootRecAt, nowIso, cfg)
        var newRootScRes = scoreCalc(
          filteredSigs,
          rootBizWaiting,
          cfg,
          newCount,
          worstSentimentLabel,
          worstSentimentIntensity,
        )

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
        foundThreadRoot.set('sentiment_score', worstSentimentScore)
        foundThreadRoot.set('sentiment_label', worstSentimentLabel)
        foundThreadRoot.set('sentiment_intensity', worstSentimentIntensity)
        foundThreadRoot.set('sentiment_reasons', rootSentimentReasons)

        // Se nova mensagem trouxer reserva/PNR que a thread ainda não tinha
        if (!foundThreadRoot.getString('reservation_number') && sigRes.reservationNumber) {
          foundThreadRoot.set('reservation_number', sigRes.reservationNumber)
        }

        $app.save(foundThreadRoot)

        // -------------------------------------------------------------
        // Se houver atendimento vinculado à thread, atualizar de forma incremental
        // indicando novas mensagens ou gerando novo resumo complementar se o consultor não editou manualmente
        // -------------------------------------------------------------
        var linkedSrId = foundThreadRoot.getString('service_record')
        if (linkedSrId) {
          try {
            var linkedSr = $app.findRecordById('service_records', linkedSrId)
            if (linkedSr && linkedSr.getString('status') !== 'Concluído') {
              var isManualEdited = linkedSr.getBool('ai_summary_edited_by_user')
              var prevDesc = linkedSr.getString('description') || ''
              var newNotice =
                '\n\n📩 [HUB AI: Nova mensagem recebida na conversa em ' +
                rAt +
                ']\n' +
                'De: ' +
                (log.getString('sender_name') || sEmail) +
                '\n' +
                'Assunto: ' +
                subj +
                '\n' +
                'Mensagem: ' +
                (bodySnip || '(sem texto)')

              // Se o consultor não editou manualmente a descrição, podemos anexar o aviso e atualizar o contador
              if (!isManualEdited) {
                linkedSr.set('description', prevDesc + newNotice)
              }
              linkedSr.set('ai_summary_messages_count', newCount)
              $app.save(linkedSr)
            }
          } catch (srUpErr) {
            $app.logger().warn('Erro ao atualizar service_record com nova mensagem: ' + srUpErr)
          }
        }

        // Criar registro filho da mensagem dentro da thread
        var childScRes = scoreCalc(
          sigRes.signals,
          bizHours,
          cfg,
          1,
          sentAnalysis.label,
          sentAnalysis.intensity,
        )
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
        childRec.set('sentiment_score', sentAnalysis.score)
        childRec.set('sentiment_label', sentAnalysis.label)
        childRec.set('sentiment_intensity', sentAnalysis.intensity)
        childRec.set('sentiment_reasons', sentAnalysis.reasons)
        $app.save(childRec)

        mergedToThread++
        processed++
      } else {
        // Não é continuação de thread existente — criar novo Root de conversa
        var scRes = scoreCalc(
          sigRes.signals,
          bizHours,
          cfg,
          1,
          sentAnalysis.label,
          sentAnalysis.intensity,
        )
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
        newRec.set('sentiment_score', sentAnalysis.score)
        newRec.set('sentiment_label', sentAnalysis.label)
        newRec.set('sentiment_intensity', sentAnalysis.intensity)
        newRec.set('sentiment_reasons', sentAnalysis.reasons)

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

// 4.1 Hook para sincronizar status de service_records e control_tower_emails bidirecionalmente
onRecordAfterUpdateSuccess((e) => {
  e.next()
  var rec = e.record
  var newStatus = rec.getString('status')
  var oldStatus = ''
  try {
    oldStatus = rec.original().getString('status')
  } catch (_) {}

  // Quando um atendimento vinculado é Concluído, resolver os e-mails da Torre correspondentes
  if (newStatus === 'Concluído' && oldStatus !== 'Concluído') {
    try {
      var cteId = rec.getString('control_tower_email')
      var thId = rec.getString('thread_id')
      var nowIso = new Date().toISOString()

      if (thId) {
        var threadEmails = $app.findRecordsByFilter(
          'control_tower_emails',
          "thread_id = '" + thId + "' && status != 'Resolvido'",
          '',
          100,
          0,
        )
        for (var i = 0; i < threadEmails.length; i++) {
          var te = threadEmails[i]
          te.set('status', 'Resolvido')
          if (!te.getString('resolved_at')) te.set('resolved_at', nowIso)
          $app.save(te)
        }
      } else if (cteId) {
        try {
          var emRec = $app.findRecordById('control_tower_emails', cteId)
          if (emRec.getString('status') !== 'Resolvido') {
            emRec.set('status', 'Resolvido')
            if (!emRec.getString('resolved_at')) emRec.set('resolved_at', nowIso)
            $app.save(emRec)
          }
        } catch (_) {}
      }
    } catch (syncErr) {
      $app
        .logger()
        .error(
          'Erro ao sincronizar resolução de service_record -> control_tower_emails: ' +
            String(syncErr),
        )
    }
  }
}, 'service_records')

// Quando um e-mail da torre é atualizado para 'Resolvido', se tiver atendimento vinculado em andamento/aberto, concluí-lo
onRecordAfterUpdateSuccess((e) => {
  e.next()
  var rec = e.record
  var newStatus = rec.getString('status')
  var oldStatus = ''
  try {
    oldStatus = rec.original().getString('status')
  } catch (_) {}

  if (newStatus === 'Resolvido' && oldStatus !== 'Resolvido') {
    try {
      var srId = rec.getString('service_record')
      var thId = rec.getString('thread_id')
      var nowIso = new Date().toISOString()

      var targetSr = null
      if (srId) {
        try {
          targetSr = $app.findRecordById('service_records', srId)
        } catch (_) {}
      }
      if (!targetSr && thId) {
        try {
          var srs = $app.findRecordsByFilter(
            'service_records',
            "thread_id = '" + thId + "'",
            '-created',
            1,
            0,
          )
          if (srs && srs.length > 0) targetSr = srs[0]
        } catch (_) {}
      }

      if (targetSr && targetSr.getString('status') !== 'Concluído') {
        targetSr.set('status', 'Concluído')
        if (!targetSr.getString('end_time')) {
          targetSr.set('end_time', nowIso)
        }
        $app.save(targetSr)
      }
    } catch (syncSrErr) {
      $app
        .logger()
        .error(
          'Erro ao sincronizar resolução de control_tower_emails -> service_records: ' +
            String(syncSrErr),
        )
    }
  }
}, 'control_tower_emails')

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
      var nowIso = new Date().toISOString()
      record.set('assigned_to', targetUserId || null)
      record.set('assigned_at', targetUserId ? nowIso : null)

      // Gravar primeira resposta (first_response_at) se ainda não tiver e estiver sendo assumido
      if (targetUserId && !record.getString('first_response_at')) {
        record.set('first_response_at', nowIso)
      }

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
        var newDeadline = addBizHours(nowIso, targetHours, cfg)
        record.set('sla_deadline', newDeadline)
      }

      $app.save(record)

      // Se este record tiver thread_id, atualizar também as mensagens filhas da mesma thread
      var threadId = record.getString('thread_id') || 'th_' + record.id
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
            ch.set('assigned_at', targetUserId ? nowIso : null)
            if (targetUserId && !ch.getString('first_response_at')) {
              ch.set('first_response_at', nowIso)
            }
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

      // -------------------------------------------------------------
      // VÍNCULO AUTOMÁTICO COM REGISTRO DE ATENDIMENTO (PORTA DE ENTRADA)
      // Se houver targetUserId e não houver atendimento vinculado à conversa,
      // cria automaticamente um novo atendimento com origem "E-mail (Torre)".
      // Se já houver vínculo (por service_record no e-mail ou por thread_id), reutiliza (idempotente).
      // -------------------------------------------------------------
      var linkedServiceRecordId = record.getString('service_record')
      var srRecord = null
      var srCol = $app.findCollectionByNameOrId('service_records')

      if (targetUserId) {
        // 1. Tentar encontrar atendimento existente vinculado
        if (linkedServiceRecordId) {
          try {
            srRecord = $app.findRecordById('service_records', linkedServiceRecordId)
          } catch (_) {
            linkedServiceRecordId = ''
          }
        }

        if (!srRecord && threadId) {
          try {
            var existingSrs = $app.findRecordsByFilter(
              'service_records',
              "thread_id = '" + threadId + "'",
              '-created',
              1,
              0,
            )
            if (existingSrs && existingSrs.length > 0) {
              srRecord = existingSrs[0]
              linkedServiceRecordId = srRecord.id
            }
          } catch (_) {}
        }

        if (!srRecord) {
          try {
            var existingByEmail = $app.findRecordsByFilter(
              'service_records',
              "control_tower_email = '" + record.id + "'",
              '-created',
              1,
              0,
            )
            if (existingByEmail && existingByEmail.length > 0) {
              srRecord = existingByEmail[0]
              linkedServiceRecordId = srRecord.id
            }
          } catch (_) {}
        }

        // 2. Se não existir, criar um novo atendimento pré-preenchido
        if (!srRecord) {
          try {
            srRecord = new Record(srCol)

            // Buscar dados do usuário atribuído para preencher assigned_agent e user_id
            var assignedUserName = ''
            try {
              var uRec = $app.findRecordById('users', targetUserId)
              assignedUserName = uRec.getString('name') || uRec.getString('email') || ''
            } catch (_) {}

            // Buscar dados da empresa/cliente se vinculado
            var clientId = record.getString('client')
            var clientName = record.getString('sender_name') || ''
            var clientCompany = ''
            var clientEmail = record.getString('sender_email') || ''
            if (clientId) {
              try {
                var clRec = $app.findRecordById('clients', clientId)
                if (!clientName) clientName = clRec.getString('name')
                clientCompany = clRec.getString('company') || ''
                if (!clientEmail) clientEmail = clRec.getString('email')
              } catch (_) {}
            }
            if (!clientName) {
              clientName = clientEmail ? clientEmail.split('@')[0] : 'Contato via Torre'
            }

            // Mapear equipe para travel_type (Nacional / Internacional)
            var teamVal = record.getString('team') || 'Nacional'
            var travelTypeVal = teamVal === 'Internacional' ? 'Internacional' : 'Nacional'

            // Mapear prioridade
            var pVal = record.getString('priority')
            var srPriority = pVal === 'P1' ? 'Alta' : pVal === 'P2' ? 'Média' : 'Baixa'

            // Coletar todas as mensagens da thread para o resumo completo da conversa
            var threadMessages = []
            if (threadId) {
              try {
                threadMessages = $app.findRecordsByFilter(
                  'control_tower_emails',
                  "thread_id = '" + threadId + "' || id = '" + record.id + "'",
                  'received_at, created',
                  50,
                  0,
                )
              } catch (_) {}
            }
            if (!threadMessages || threadMessages.length === 0) {
              threadMessages = [record]
            }

            // Preparar o histórico consolidado de e-mails para geração do resumo por IA
            var threadTranscript = ''
            var allReservationNumbers = []
            var allDates = []
            var worstSentiment = record.getString('sentiment_label') || 'Neutro'
            var worstIntensity = record.getString('sentiment_intensity') || 'Leve'

            for (var tmIdx = 0; tmIdx < threadMessages.length; tmIdx++) {
              var tm = threadMessages[tmIdx]
              var tmSender = tm.getString('sender_name')
                ? tm.getString('sender_name') + ' <' + tm.getString('sender_email') + '>'
                : tm.getString('sender_email')
              var tmDate = tm.getString('received_at') || tm.getString('created') || ''
              var tmRes = tm.getString('reservation_number')
              if (tmRes && allReservationNumbers.indexOf(tmRes) === -1) {
                allReservationNumbers.push(tmRes)
              }
              var tmDates = parseStringList(tm.get('detected_dates'))
              for (var dIdx = 0; dIdx < tmDates.length; dIdx++) {
                if (allDates.indexOf(tmDates[dIdx]) === -1) allDates.push(tmDates[dIdx])
              }

              threadTranscript +=
                '---\n' +
                'Mensagem #' +
                (tmIdx + 1) +
                ' | De: ' +
                tmSender +
                ' | Em: ' +
                tmDate +
                '\n' +
                'Assunto: ' +
                tm.getString('subject') +
                '\n' +
                'Conteúdo:\n' +
                (tm.getString('body_snippet') || '(sem conteúdo)') +
                '\n'
            }

            // Geração nativa de Resumo da Conversa com IA (Skip AI)
            var generatedSummary = ''
            var suggestedReason = 'Outros'
            try {
              var summaryPrompt =
                'Você é o motor de IA HUB AI da RexturAdvance / agência de viagens corporativa.\n' +
                'Sua tarefa é redigir um RESUMO EXECUTIVO DO ATENDIMENTO a partir da conversa de e-mails abaixo da Torre de Controle.\n' +
                'O resumo deve ser em Português do Brasil, profissional, estruturado em tópicos objetivos:\n' +
                '- Motivo do Contato: (resumo direto do que o cliente/agência precisa)\n' +
                '- Pontos Principais: (itens acordados, dúvidas ou solicitações cruciais)\n' +
                '- Urgência / Sentimento: (destaque se o cliente está Crítico/Frustrado/Urgente, prazos prometidos ou riscos de embarque)\n' +
                '- Dados Detectados: (número de reserva/PNR e datas de viagem se identificados)\n\n' +
                'Classifique também o contact_reason em um dos valores: Bagagem, Assento, Cálculo de Reemissão, Reembolso, Cotação, Reserva, Cancelamento, Regras Tarifárias, Erro RF, Remarcação, Check-in, Alteração de Voo, Reclamação, Dúvida Geral, Outros.\n\n' +
                'Responda em formato JSON com as chaves "summary" (texto com os tópicos) e "contact_reason":\n' +
                '{"summary":"...","contact_reason":"..."}'

              var aiSummaryRes = $ai.chat({
                model: 'fast',
                messages: [
                  { role: 'system', content: summaryPrompt },
                  { role: 'user', content: threadTranscript },
                ],
              })

              var aiSummaryText = aiSummaryRes.choices[0].message.content
              var summaryJsonMatch = aiSummaryText.match(/\{[\s\S]*\}/)
              if (summaryJsonMatch) {
                var parsedSumm = JSON.parse(summaryJsonMatch[0])
                if (parsedSumm.summary) generatedSummary = String(parsedSumm.summary).trim()
                if (parsedSumm.contact_reason)
                  suggestedReason = String(parsedSumm.contact_reason).trim()
              } else if (aiSummaryText.trim()) {
                generatedSummary = aiSummaryText.trim()
              }
            } catch (aiErr) {
              $app.logger().warn('IA Fallback ao gerar resumo de e-mail na Torre: ' + aiErr)
            }

            // Se a IA não responder, gera um resumo heurístico estruturado padrão
            if (!generatedSummary) {
              var resStr =
                allReservationNumbers.length > 0
                  ? allReservationNumbers.join(', ')
                  : 'Não detectado'
              var datesStr = allDates.length > 0 ? allDates.join(', ') : 'Não detectadas'
              generatedSummary =
                '• Motivo do Contato: ' +
                (record.getString('subject') || 'Atendimento via e-mail Torre') +
                '\n' +
                '• Pontos Principais: Mensagem inicial de ' +
                clientName +
                ' via caixa ' +
                (record.getString('service_group') || '') +
                ' (' +
                teamVal +
                ').\n' +
                '• Urgência / Sentimento: ' +
                worstSentiment +
                ' (' +
                worstIntensity +
                ') | Prioridade ' +
                pVal +
                '\n' +
                '• Dados Detectados: Reserva/PNR: ' +
                resStr +
                ' | Datas: ' +
                datesStr
            }

            // Descrição inicial do atendimento contém o resumo estruturado e a transcrição
            var fullInitialDescription =
              '📋 [Resumo gerado por HUB AI]\n' +
              generatedSummary +
              '\n\n' +
              '━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━\n' +
              'Histórico da Conversa (' +
              threadMessages.length +
              ' msg(s)):\n' +
              threadTranscript

            srRecord.set('user_id', targetUserId)
            srRecord.set('assigned_user', targetUserId)
            srRecord.set('assigned_agent', assignedUserName)
            srRecord.set('origin', 'E-mail (Torre)')
            srRecord.set('channel', 'e-mail')
            srRecord.set('status', 'Em Andamento')
            srRecord.set('priority', srPriority)
            srRecord.set('travel_type', travelTypeVal)
            srRecord.set('contact_reason', suggestedReason || 'Outros')
            srRecord.set('client', clientId || null)
            srRecord.set('client_name', clientName)
            srRecord.set('client_company', clientCompany)
            srRecord.set('client_email', clientEmail)
            srRecord.set('description', fullInitialDescription)
            srRecord.set('ai_summary', generatedSummary)
            srRecord.set('ai_summary_generated_at', nowIso)
            srRecord.set('ai_summary_messages_count', threadMessages.length)
            srRecord.set('ai_summary_edited_by_user', false)
            srRecord.set('control_tower_email', record.id)
            srRecord.set('thread_id', threadId)
            srRecord.set('control_tower_inbox', record.getString('inbox_address') || '')
            srRecord.set('start_time', nowIso)

            $app.save(srRecord)
            linkedServiceRecordId = srRecord.id
          } catch (createErr) {
            $app
              .logger()
              .error(
                'Falha ao criar service_record vinculado ao e-mail ' +
                  record.id +
                  ': ' +
                  String(createErr),
              )
          }
        } else {
          // Atualizar o atendente se já existia
          try {
            if (srRecord.getString('assigned_user') !== targetUserId) {
              srRecord.set('assigned_user', targetUserId)
              var uRec2 = $app.findRecordById('users', targetUserId)
              var uName2 = uRec2.getString('name') || uRec2.getString('email') || ''
              if (uName2) srRecord.set('assigned_agent', uName2)
              $app.save(srRecord)
            }
          } catch (_) {}
        }

        // 3. Salvar vínculo no registro de e-mail e nos irmãos da thread
        if (linkedServiceRecordId) {
          try {
            record.set('service_record', linkedServiceRecordId)
            $app.save(record)

            if (threadId) {
              var allThreadEmails = $app.findRecordsByFilter(
                'control_tower_emails',
                "thread_id = '" + threadId + "'",
                '',
                100,
                0,
              )
              for (var t = 0; t < allThreadEmails.length; t++) {
                var te = allThreadEmails[t]
                if (te.getString('service_record') !== linkedServiceRecordId) {
                  te.set('service_record', linkedServiceRecordId)
                  $app.save(te)
                }
              }
            }
          } catch (_) {}
        }
      }

      return e.json(200, {
        success: true,
        record_id: record.id,
        assigned_to: targetUserId,
        status: record.getString('status'),
        sla_deadline: record.getString('sla_deadline'),
        service_record_id: linkedServiceRecordId || null,
      })
    } catch (err) {
      return e.badRequestError('Erro ao atribuir e-mail: ' + err)
    }
  },
  $apis.requireAuth(),
)

// 5. Endpoint para gerar minuta de resposta ao cliente com Skip AI (HUB AI)
routerAdd(
  'POST',
  '/backend/v1/control-tower/generate-reply-draft',
  (e) => {
    try {
      var body = e.requestInfo().body || {}
      var emailId = (body.email_id || '').trim()
      var threadId = (body.thread_id || '').trim()

      if (!emailId && !threadId) {
        return e.badRequestError('email_id ou thread_id é obrigatório.')
      }

      var rootRecord = null
      if (emailId) {
        try {
          rootRecord = $app.findRecordById('control_tower_emails', emailId)
        } catch (_) {}
      }

      var effectiveThreadId =
        threadId ||
        (rootRecord ? rootRecord.getString('thread_id') : '') ||
        (rootRecord ? rootRecord.id : '')

      var messages = []
      if (effectiveThreadId) {
        try {
          messages = $app.findRecordsByFilter(
            'control_tower_emails',
            "thread_id = '" + effectiveThreadId + "' || id = '" + effectiveThreadId + "'",
            'received_at, created',
            50,
            0,
          )
        } catch (_) {}
      }

      if ((!messages || messages.length === 0) && rootRecord) {
        messages = [rootRecord]
      }

      if (!messages || messages.length === 0) {
        return e.badRequestError('Nenhuma mensagem encontrada para a conversa informada.')
      }

      var currentRecord = rootRecord || messages[messages.length - 1]
      var clientName = currentRecord.getString('sender_name') || ''
      var clientEmail = currentRecord.getString('sender_email') || ''
      var inboxAddress = currentRecord.getString('inbox_address') || ''
      var serviceGroup = currentRecord.getString('service_group') || ''
      var team = currentRecord.getString('team') || 'Nacional'
      var reservationNumber = currentRecord.getString('reservation_number') || ''

      var consultantName = e.auth
        ? e.auth.getString('name') || e.auth.getString('email')
        : 'Consultor'

      // Se tiver vínculo com cliente
      var clientCompany = ''
      var clientId = currentRecord.getString('client')
      if (clientId) {
        try {
          var clRec = $app.findRecordById('clients', clientId)
          if (!clientName) clientName = clRec.getString('name')
          clientCompany = clRec.getString('company') || ''
          if (!clientEmail) clientEmail = clRec.getString('email')
        } catch (_) {}
      }

      // Analisar toda a thread
      var threadTranscript = ''
      var allReservations = []
      var allDates = []
      var worstSentiment = currentRecord.getString('sentiment_label') || 'Neutro'
      var worstIntensity = currentRecord.getString('sentiment_intensity') || 'Leve'
      var lastClientSenderName = clientName
      var lastClientSenderEmail = clientEmail

      function parseList(val) {
        if (!val) return []
        if (Array.isArray(val)) return val
        if (typeof val === 'string') {
          try {
            var p = JSON.parse(val)
            if (Array.isArray(p)) return p
          } catch (_) {}
          return [val]
        }
        return []
      }

      for (var i = 0; i < messages.length; i++) {
        var m = messages[i]
        var sName = m.getString('sender_name')
        var sEmail = m.getString('sender_email')
        var sLabel = m.getString('sentiment_label')
        var sInt = m.getString('sentiment_intensity')

        if (sLabel === 'Crítico') {
          worstSentiment = 'Crítico'
          worstIntensity = 'Forte'
        } else if (sLabel === 'Frustrado' && worstSentiment !== 'Crítico') {
          worstSentiment = 'Frustrado'
          worstIntensity = sInt || 'Moderado'
        }

        var rNum = m.getString('reservation_number')
        if (rNum && allReservations.indexOf(rNum) === -1) {
          allReservations.push(rNum)
        }

        var dts = parseList(m.get('detected_dates'))
        for (var d = 0; d < dts.length; d++) {
          if (allDates.indexOf(dts[d]) === -1) allDates.push(dts[d])
        }

        // Atualiza último remetente do lado do cliente (ignora remetente igual à caixa do núcleo)
        if (sEmail && sEmail.toLowerCase() !== inboxAddress.toLowerCase()) {
          lastClientSenderEmail = sEmail
          if (sName) lastClientSenderName = sName
        }

        threadTranscript +=
          '---\n' +
          'Mensagem #' +
          (i + 1) +
          ' | De: ' +
          (sName ? sName + ' <' + sEmail + '>' : sEmail) +
          ' | Em: ' +
          (m.getString('received_at') || m.getString('created')) +
          '\n' +
          'Assunto: ' +
          m.getString('subject') +
          '\n' +
          'Conteúdo:\n' +
          (m.getString('body_snippet') || '(sem conteúdo)') +
          '\n'
      }

      if (!reservationNumber && allReservations.length > 0) {
        reservationNumber = allReservations[0]
      }

      var customerSalutation = lastClientSenderName
        ? lastClientSenderName.split(' ')[0]
        : clientCompany || 'Cliente'

      var systemPrompt =
        'Você é o assistente executivo e motor de IA HUB AI da RexturAdvance (consolidadora e agência corporativa de viagens).\n' +
        'Sua missão é redigir uma MINUTA DE RESPOSTA AO CLIENTE pronta, profissional, clara, cordial e assertiva em Português do Brasil.\n' +
        'A resposta será enviada pelo consultor através do Microsoft Outlook pela caixa compartilhada de atendimento do núcleo.\n\n' +
        'DIRETRIZES FUNDAMENTAIS:\n' +
        '1. Tom de voz:\n' +
        '   - Se o cliente apresentar sentimento "Frustrado" ou "Crítico": adote um tom altamente empático, compreensivo, prestativo e calmo. Demonstre prioridade total na solução e peça desculpas pelo transtorno caso aplicável.\n' +
        '   - Se o cliente estiver Neutro ou Positivo: adote um tom profissional, cordial, ágil e prestativo.\n' +
        '2. Dados específicos:\n' +
        '   - Mencione os dados detectados se pertinentes (ex.: número de reserva/localizador: ' +
        (reservationNumber || allReservations.join(', ') || 'conforme informado') +
        ', datas de viagem: ' +
        (allDates.join(', ') || 'identificadas') +
        ').\n' +
        '3. Estrutura da resposta:\n' +
        '   - Saudação inicial calorosa e personalizada (ex.: "Olá, ' +
        customerSalutation +
        '," ou "Prezado(a) ' +
        customerSalutation +
        ',")\n' +
        '   - Agradecimento pelo contato e posicionamento claro sobre a solicitação\n' +
        '   - Esclarecimento, solução ou próximos passos de forma transparente e estruturada\n' +
        '   - Colocar-se à disposição para qualquer suporte adicional\n' +
        '   - Despedida cordial\n' +
        '   - Assinatura padrão do consultor: Atenciosamente,\n' +
        consultantName +
        '\nEquipe de Atendimento - Núcleo ' +
        (serviceGroup || 'HUB AI') +
        '\nRexturAdvance\n\n' +
        '4. Formato de saída:\n' +
        '   - Retorne APENAS o texto da mensagem pronta para o consultor revisar e enviar no Outlook.\n' +
        '   - NÃO coloque prefácios como "Aqui está a minuta:", NÃO use markdown de código (sem ```), apenas parágrafos de texto legíveis.'

      var userPrompt =
        'Dados do Atendimento:\n' +
        '- Cliente: ' +
        (lastClientSenderName || clientEmail) +
        (clientCompany ? ' (' + clientCompany + ')' : '') +
        '\n' +
        '- Núcleo / Caixa: ' +
        serviceGroup +
        ' (' +
        (inboxAddress || 'caixa compartilhada') +
        ')\n' +
        '- Equipe: ' +
        team +
        '\n' +
        '- Sentimento Geral: ' +
        worstSentiment +
        ' (' +
        worstIntensity +
        ')\n' +
        '- Reserva/PNR: ' +
        (reservationNumber || 'Não informada') +
        '\n' +
        '- Datas detectadas: ' +
        (allDates.length > 0 ? allDates.join(', ') : 'Não detectadas') +
        '\n\n' +
        'Histórico Completo da Conversa (' +
        messages.length +
        ' mensagem(ns)):\n' +
        threadTranscript +
        '\n\nRedija a minuta de resposta ao cliente agora:'

      var draftText = ''
      try {
        var aiRes = $ai.chat({
          model: 'fast',
          messages: [
            { role: 'system', content: systemPrompt },
            { role: 'user', content: userPrompt },
          ],
        })
        if (aiRes && aiRes.choices && aiRes.choices[0] && aiRes.choices[0].message) {
          draftText = aiRes.choices[0].message.content.trim()
        }
      } catch (aiErr) {
        $app.logger().warn('Erro ao chamar Skip AI para minuta de resposta: ' + String(aiErr))
      }

      // Fallback heurístico caso a chamada IA falhe
      if (!draftText) {
        var isUnhappy = worstSentiment === 'Frustrado' || worstSentiment === 'Crítico'
        draftText =
          'Olá, ' +
          customerSalutation +
          '!\n\n' +
          (isUnhappy
            ? 'Agradecemos o seu contato e lamentamos muito pelo transtorno e pela espera. Estamos priorizando a sua solicitação com toda a atenção necessária.\n\n'
            : 'Agradecemos o seu contato com a nossa equipe de atendimento.\n\n') +
          (reservationNumber
            ? 'Em relação à reserva ' + reservationNumber + ':\n'
            : 'Em relação à sua solicitação:\n') +
          'Já estamos analisando todas as informações da sua mensagem para oferecer o melhor retorno e resolver a sua demanda o mais rápido possível.\n\n' +
          'Caso tenha qualquer informação adicional ou urgência imediata, pode nos responder por este mesmo canal.\n\n' +
          'Atenciosamente,\n' +
          consultantName +
          '\n' +
          'Equipe de Atendimento - Núcleo ' +
          (serviceGroup || 'HUB AI') +
          '\n' +
          'RexturAdvance'
      }

      return e.json(200, {
        success: true,
        draft: draftText,
        recipient_email: lastClientSenderEmail,
        recipient_name: lastClientSenderName,
        subject: currentRecord.getString('subject') || '',
        sentiment_label: worstSentiment,
        sentiment_intensity: worstIntensity,
        reservation_number: reservationNumber,
        detected_dates: allDates,
        messages_count: messages.length,
      })
    } catch (err) {
      $app.logger().error('generate-reply-draft falhou: ' + String(err))
      return e.badRequestError('Erro ao gerar minuta de resposta: ' + String(err))
    }
  },
  $apis.requireAuth(),
)
