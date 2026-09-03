// Hook e Cron job para Relatório Executivo Mensal Automático (Frente B4)
// Executa no primeiro dia útil de cada mês às 8h da manhã (GMT-3 = 11h UTC: '0 11 * * 1-5')
// Coleta o mês anterior completo e compara com o mês imediatamente anterior para cálculo de variações.
// Também provê endpoints para disparo manual e pré-visualização por usuários de liderança.
// Em PocketBase JSVM, todas as declarações auxiliares devem ficar dentro dos callbacks.

// 1. Cron Job: primeiro dia útil de cada mês às 8h da manhã (GMT-3 = 11h UTC, seg-sex)
cronAdd('executive_monthly_report_cron', '0 11 * * 1-5', function () {
  try {
    var now = new Date()
    var gmt3Ms = now.getTime() - 3 * 3600 * 1000
    var gmt3Date = new Date(gmt3Ms)
    var dayOfMonth = gmt3Date.getUTCDate()
    var dayOfWeek = gmt3Date.getUTCDay() // 1 = Seg, ..., 5 = Sex

    // Verifica se hoje é o PRIMEIRO dia útil do mês:
    var isFirstBusinessDay = false
    if (dayOfMonth === 1 && dayOfWeek >= 1 && dayOfWeek <= 5) {
      isFirstBusinessDay = true
    } else if (dayOfMonth === 2 && dayOfWeek === 1) {
      isFirstBusinessDay = true
    } else if (dayOfMonth === 3 && dayOfWeek === 1) {
      isFirstBusinessDay = true
    }

    if (!isFirstBusinessDay) {
      return
    }

    // Mês alvo = mês anterior completo
    var prevMonthDate = new Date(
      Date.UTC(gmt3Date.getUTCFullYear(), gmt3Date.getUTCMonth() - 1, 1, 12, 0, 0),
    )
    var targetYear = prevMonthDate.getUTCFullYear()
    var targetMonth = prevMonthDate.getUTCMonth() + 1 // 1-based

    $app
      .logger()
      .info(
        'Iniciando cron do Relatório Executivo Mensal para competência: ' +
          targetMonth +
          '/' +
          targetYear,
      )

    function normalizeReason(raw) {
      if (!raw) return ''
      var trimmed = String(raw).trim()
      if (!trimmed) return ''
      var canonical = [
        'Bagagem',
        'Assento',
        'Cálculo de Reemissão',
        'Reembolso',
        'Cotação',
        'Reserva',
        'Cancelamento',
        'Regras Tarifárias',
        'Erro RF',
        'Remarcação',
        'Check-in',
        'Alteração de Voo',
        'Reclamação',
        'Dúvida Geral',
        'Outros',
      ]
      for (var ci = 0; ci < canonical.length; ci++) {
        if (canonical[ci].toLowerCase() === trimmed.toLowerCase()) return canonical[ci]
      }
      var lower = trimmed
        .toLowerCase()
        .replace(/[áàãâä]/g, 'a')
        .replace(/[éèêë]/g, 'e')
        .replace(/[íìîï]/g, 'i')
        .replace(/[óòõôö]/g, 'o')
        .replace(/[úùûü]/g, 'u')
        .replace(/[ç]/g, 'c')
      if (lower.indexOf('bagagem') !== -1) return 'Bagagem'
      if (lower.indexOf('assento') !== -1) return 'Assento'
      if (lower.indexOf('reemissao') !== -1 || lower.indexOf('re-emissao') !== -1)
        return 'Cálculo de Reemissão'
      if (lower.indexOf('reembolso') !== -1) return 'Reembolso'
      if (
        lower.indexOf('cotacao') !== -1 ||
        lower.indexOf('orcamento') !== -1 ||
        lower.indexOf('venda') !== -1
      )
        return 'Cotação'
      if (lower.indexOf('reserva') !== -1) return 'Reserva'
      if (lower.indexOf('cancelamento') !== -1) return 'Cancelamento'
      if (lower.indexOf('tarifari') !== -1 || lower.indexOf('regra') !== -1)
        return 'Regras Tarifárias'
      if (lower.indexOf('rf') !== -1) return 'Erro RF'
      if (lower.indexOf('remarcac') !== -1) return 'Remarcação'
      if (lower.indexOf('check-in') !== -1 || lower.indexOf('checkin') !== -1) return 'Check-in'
      if (lower.indexOf('alteracao') !== -1) return 'Alteração de Voo'
      if (lower.indexOf('reclamac') !== -1) return 'Reclamação'
      if (
        lower.indexOf('duvida') !== -1 ||
        lower.indexOf('suporte') !== -1 ||
        lower.indexOf('informac') !== -1
      )
        return 'Dúvida Geral'
      return 'Outros'
    }

    var targetMonthPadded = String(targetMonth).padStart(2, '0')
    var prevDate = new Date(Date.UTC(targetYear, targetMonth - 2, 1, 12, 0, 0))
    var prevYear = prevDate.getUTCFullYear()
    var prevMonth = prevDate.getUTCMonth() + 1
    var prevPeriodStr = prevYear + '-' + String(prevMonth).padStart(2, '0')

    var curStartIso = targetYear + '-' + targetMonthPadded + '-01 00:00:00'
    var nextMonthDate = new Date(Date.UTC(targetYear, targetMonth, 1, 12, 0, 0))
    var curEndIso =
      nextMonthDate.getUTCFullYear() +
      '-' +
      String(nextMonthDate.getUTCMonth() + 1).padStart(2, '0') +
      '-01 00:00:00'
    var prevStartIso = prevPeriodStr + '-01 00:00:00'
    var prevEndIso = curStartIso

    var defaultMonthlyTarget = 100
    var defaultMinResolution = 80
    var defaultTfrTarget = 15
    try {
      if ($app.hasTable('global_targets')) {
        var gtList = $app.findRecordsByFilter('global_targets', '', '-created', 1, 0)
        if (gtList && gtList.length > 0) {
          var gt = gtList[0]
          var gtMt = gt.getInt('monthly_attendance_target')
          var gtMr = gt.getInt('min_resolution_rate')
          var gtTfr = gt.getInt('tfr_target')
          if (gtMt > 0) defaultMonthlyTarget = gtMt
          if (gtMr > 0) defaultMinResolution = gtMr
          if (gtTfr > 0) defaultTfrTarget = gtTfr
        }
      }
    } catch (_) {}

    var userTargetsMap = {}
    try {
      if ($app.hasTable('user_targets')) {
        var utList = $app.findRecordsByFilter('user_targets', '', '', 1000, 0)
        for (var uIdx = 0; uIdx < utList.length; uIdx++) {
          var uRec = utList[uIdx]
          var uid = uRec.getString('user')
          if (uid) {
            userTargetsMap[uid] = {
              monthly_attendance_target:
                uRec.getInt('monthly_attendance_target') || defaultMonthlyTarget,
              min_resolution_rate: uRec.getInt('min_resolution_rate') || defaultMinResolution,
              tfr_target: uRec.getInt('tfr_target') || defaultTfrTarget,
            }
          }
        }
      }
    } catch (_) {}

    var allUsers = $app.findRecordsByFilter('users', "approval_status = 'Aprovado'", '', 2000, 0)
    var eligibleConsultants = {}
    var userNameMap = {}
    for (var i = 0; i < allUsers.length; i++) {
      var usr = allUsers[i]
      var role = usr.getString('role') || ''
      userNameMap[usr.id] = usr.getString('name') || usr.getString('email') || 'Colaborador'
      if (role === 'Consultor' || role === 'Consultores') {
        eligibleConsultants[usr.id] = {
          id: usr.id,
          name: userNameMap[usr.id],
          role: role,
          target:
            (userTargetsMap[usr.id] && userTargetsMap[usr.id].monthly_attendance_target) ||
            defaultMonthlyTarget,
          minResolution:
            (userTargetsMap[usr.id] && userTargetsMap[usr.id].min_resolution_rate) ||
            defaultMinResolution,
        }
      }
    }

    var curRecords = []
    try {
      curRecords = $app.findRecordsByFilter(
        'service_records',
        "created >= '" + curStartIso + "' && created < '" + curEndIso + "'",
        'created',
        20000,
        0,
      )
    } catch (_) {}

    var prevRecords = []
    try {
      prevRecords = $app.findRecordsByFilter(
        'service_records',
        "created >= '" + prevStartIso + "' && created < '" + prevEndIso + "'",
        'created',
        20000,
        0,
      )
    } catch (_) {}

    var curTotal = curRecords.length
    var curDurationSum = 0
    var curTfrSum = 0
    var curTfrCount = 0
    var curTfrWithinTarget = 0
    var curAvoidableCount = 0
    var curReopenCount = 0
    var curReasonsMap = {}
    var consultantCounts = {}

    for (var cId in eligibleConsultants) {
      consultantCounts[cId] = {
        userId: cId,
        name: eligibleConsultants[cId].name,
        total: 0,
        resolved: 0,
        target: eligibleConsultants[cId].target,
        minResolution: eligibleConsultants[cId].minResolution,
      }
    }

    for (var k = 0; k < curRecords.length; k++) {
      var r = curRecords[k]
      var dur = Number(r.get('duration') || 0)
      curDurationSum += dur

      var tfr = Number(r.get('first_response_time') || 0)
      if (tfr > 0) {
        curTfrCount++
        curTfrSum += tfr
        if (tfr <= defaultTfrTarget) curTfrWithinTarget++
      }

      if (r.getBool('avoidable_contact') === true) curAvoidableCount++

      var rCount = Number(r.get('reopen_count') || 0)
      if (rCount > 0 || r.getBool('is_reopened')) curReopenCount++

      var canon = normalizeReason(r.getString('contact_reason'))
      if (canon) curReasonsMap[canon] = (curReasonsMap[canon] || 0) + 1

      var assignedUid = r.getString('assigned_user') || r.getString('user_id')
      if (assignedUid && consultantCounts[assignedUid]) {
        consultantCounts[assignedUid].total++
        if (r.getString('status') === 'Concluído') consultantCounts[assignedUid].resolved++
      }
    }

    var curAvgTma = curTotal > 0 ? Math.round((curDurationSum / curTotal) * 10) / 10 : 0
    var curAvgTfr = curTfrCount > 0 ? Math.round((curTfrSum / curTfrCount) * 10) / 10 : 0
    var curTfrCompliancePct =
      curTfrCount > 0 ? Math.round((curTfrWithinTarget / curTfrCount) * 100) : 100
    var curAvoidablePct = curTotal > 0 ? Math.round((curAvoidableCount / curTotal) * 100) : 0
    var curReopenRate = curTotal > 0 ? Math.round((curReopenCount / curTotal) * 100) : 0

    var prevTotal = prevRecords.length
    var prevDurationSum = 0
    var prevTfrSum = 0
    var prevTfrCount = 0
    var prevAvoidableCount = 0
    var prevReopenCount = 0
    var prevReasonsMap = {}

    for (var p = 0; p < prevRecords.length; p++) {
      var pr = prevRecords[p]
      prevDurationSum += Number(pr.get('duration') || 0)
      var pTfr = Number(pr.get('first_response_time') || 0)
      if (pTfr > 0) {
        prevTfrCount++
        prevTfrSum += pTfr
      }
      if (pr.getBool('avoidable_contact') === true) prevAvoidableCount++
      var prCount = Number(pr.get('reopen_count') || 0)
      if (prCount > 0 || pr.getBool('is_reopened')) prevReopenCount++
      var pCanon = normalizeReason(pr.getString('contact_reason'))
      if (pCanon) prevReasonsMap[pCanon] = (prevReasonsMap[pCanon] || 0) + 1
    }

    var prevAvgTma = prevTotal > 0 ? Math.round((prevDurationSum / prevTotal) * 10) / 10 : 0
    var prevAvgTfr = prevTfrCount > 0 ? Math.round((prevTfrSum / prevTfrCount) * 10) / 10 : 0
    var prevAvoidablePct = prevTotal > 0 ? Math.round((prevAvoidableCount / prevTotal) * 100) : 0
    var prevReopenRate = prevTotal > 0 ? Math.round((prevReopenCount / prevTotal) * 100) : 0

    function calcPctDelta(curVal, prevVal) {
      if (prevVal === 0) return curVal === 0 ? 0 : 100
      return Math.round(((curVal - prevVal) / prevVal) * 1000) / 10
    }

    var totalDeltaPct = calcPctDelta(curTotal, prevTotal)
    var tmaDeltaPct = calcPctDelta(curAvgTma, prevAvgTma)
    var tfrDeltaPct = calcPctDelta(curAvgTfr, prevAvgTfr)
    var avoidableDeltaPp = curAvoidablePct - prevAvoidablePct
    var reopenDeltaPp = curReopenRate - prevReopenRate

    var hitAttendanceCount = 0
    var missAttendanceCount = 0
    var hitResolutionCount = 0
    var missResolutionCount = 0
    var consultantList = []

    for (var consId in consultantCounts) {
      var item = consultantCounts[consId]
      var resRate = item.total > 0 ? Math.round((item.resolved / item.total) * 100) : 0
      item.resolutionRate = resRate
      item.attendancePct = item.target > 0 ? Math.round((item.total / item.target) * 100) : 0

      if (item.total >= item.target) hitAttendanceCount++
      else missAttendanceCount++

      if (item.total > 0 && resRate >= item.minResolution) hitResolutionCount++
      else if (item.total > 0) missResolutionCount++

      consultantList.push(item)
    }

    consultantList.sort(function (a, b) {
      return b.total - a.total
    })
    var top5 = consultantList.slice(0, 5)
    var reversed = consultantList.slice().reverse()
    var bottom5 = reversed.slice(0, 5)

    var reasonGrowthList = []
    var allReasonsSet = {}
    for (var rk in curReasonsMap) allReasonsSet[rk] = true
    for (var rkp in prevReasonsMap) allReasonsSet[rkp] = true

    for (var rName in allReasonsSet) {
      var cC = curReasonsMap[rName] || 0
      var pC = prevReasonsMap[rName] || 0
      reasonGrowthList.push({
        reason: rName,
        currentCount: cC,
        prevCount: pC,
        diff: cC - pC,
        growthPct: calcPctDelta(cC, pC),
      })
    }

    reasonGrowthList.sort(function (a, b) {
      if (b.diff !== a.diff) return b.diff - a.diff
      return b.growthPct - a.growthPct
    })
    var topGrowingReasons = reasonGrowthList.slice(0, 5)

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
    var periodLabel = monthNames[targetMonth - 1] + '/' + targetYear
    var prevPeriodLabel = monthNames[prevMonth - 1] + '/' + prevYear

    function formatTrend(val, isPp, invertGood) {
      var sign = val > 0 ? '+' : ''
      var unit = isPp ? ' p.p.' : '%'
      var arrow = val > 0 ? '▲' : val < 0 ? '▼' : '▬'
      var isGood = invertGood ? val <= 0 : val >= 0
      var color = val === 0 ? '#64748b' : isGood ? '#15803d' : '#b91c1c'
      var bg = val === 0 ? '#f1f5f9' : isGood ? '#dcfce7' : '#fee2e2'
      return (
        '<span style="display:inline-block;padding:2px 6px;border-radius:4px;font-size:11px;font-weight:700;color:' +
        color +
        ';background:' +
        bg +
        ';">' +
        arrow +
        ' ' +
        sign +
        val +
        unit +
        '</span>'
      )
    }

    var top5Rows = ''
    for (var t5i = 0; t5i < top5.length; t5i++) {
      var t5c = top5[t5i]
      top5Rows +=
        '<tr style="border-bottom:1px solid #f1f5f9;font-size:12px;">' +
        '<td style="padding:8px 10px;font-weight:600;color:#1e293b;">#' +
        (t5i + 1) +
        ' ' +
        t5c.name +
        '</td>' +
        '<td style="padding:8px 10px;text-align:center;font-weight:700;color:#0f172a;">' +
        t5c.total +
        '</td>' +
        '<td style="padding:8px 10px;text-align:center;color:#475569;">' +
        t5c.attendancePct +
        '% (' +
        t5c.target +
        ')</td>' +
        '<td style="padding:8px 10px;text-align:center;color:' +
        (t5c.resolutionRate >= t5c.minResolution ? '#15803d' : '#b91c1c') +
        ';font-weight:600;">' +
        t5c.resolutionRate +
        '%</td>' +
        '</tr>'
    }
    if (!top5Rows)
      top5Rows =
        '<tr><td colspan="4" style="padding:12px;text-align:center;color:#94a3b8;font-size:12px;">Sem atendimentos no período.</td></tr>'

    var bottom5Rows = ''
    for (var b5i = 0; b5i < bottom5.length; b5i++) {
      var b5c = bottom5[b5i]
      bottom5Rows +=
        '<tr style="border-bottom:1px solid #f1f5f9;font-size:12px;">' +
        '<td style="padding:8px 10px;font-weight:600;color:#1e293b;">' +
        b5c.name +
        '</td>' +
        '<td style="padding:8px 10px;text-align:center;font-weight:700;color:#0f172a;">' +
        b5c.total +
        '</td>' +
        '<td style="padding:8px 10px;text-align:center;color:#475569;">' +
        b5c.attendancePct +
        '% (' +
        b5c.target +
        ')</td>' +
        '<td style="padding:8px 10px;text-align:center;color:' +
        (b5c.resolutionRate >= b5c.minResolution ? '#15803d' : '#b91c1c') +
        ';font-weight:600;">' +
        b5c.resolutionRate +
        '%</td>' +
        '</tr>'
    }
    if (!bottom5Rows)
      bottom5Rows =
        '<tr><td colspan="4" style="padding:12px;text-align:center;color:#94a3b8;font-size:12px;">Sem atendimentos no período.</td></tr>'

    var reasonRows = ''
    for (var rgi = 0; rgi < topGrowingReasons.length; rgi++) {
      var gr = topGrowingReasons[rgi]
      var rSign = gr.diff > 0 ? '+' : ''
      var diffBadgeColor = gr.diff > 0 ? '#b91c1c' : gr.diff < 0 ? '#15803d' : '#64748b'
      var diffBadgeBg = gr.diff > 0 ? '#fee2e2' : gr.diff < 0 ? '#dcfce7' : '#f1f5f9'
      reasonRows +=
        '<tr style="border-bottom:1px solid #f1f5f9;font-size:12px;">' +
        '<td style="padding:8px 10px;font-weight:600;color:#1e293b;">' +
        gr.reason +
        '</td>' +
        '<td style="padding:8px 10px;text-align:center;font-weight:700;color:#0f172a;">' +
        gr.currentCount +
        '</td>' +
        '<td style="padding:8px 10px;text-align:center;color:#64748b;">' +
        gr.prevCount +
        '</td>' +
        '<td style="padding:8px 10px;text-align:center;">' +
        '<span style="padding:2px 6px;border-radius:4px;font-size:11px;font-weight:700;color:' +
        diffBadgeColor +
        ';background:' +
        diffBadgeBg +
        ';">' +
        rSign +
        gr.diff +
        ' (' +
        rSign +
        gr.growthPct +
        '%)' +
        '</span></td></tr>'
    }
    if (!reasonRows)
      reasonRows =
        '<tr><td colspan="4" style="padding:12px;text-align:center;color:#94a3b8;font-size:12px;">Sem motivos no período.</td></tr>'

    var appBaseUrl =
      $os.getenv('APP_URL') ||
      'https://sistema-de-registros-de-atendimento-b6923.shrd00.internal.goskip.dev'
    var panelLink = appBaseUrl + '/metas-desempenho'

    var htmlContent =
      '<!DOCTYPE html><html><head><meta charset="utf-8"></head>' +
      '<body style="margin:0;padding:24px;background-color:#f1f5f9;font-family:-apple-system,BlinkMacSystemFont,\'Segoe UI\',Roboto,Helvetica,Arial,sans-serif;color:#1e293b;">' +
      '<div style="max-width:760px;margin:0 auto;background:#ffffff;border-radius:10px;border:1px solid #e2e8f0;overflow:hidden;box-shadow:0 4px 6px -1px rgba(0,0,0,0.05);">' +
      '<div style="background:linear-gradient(135deg, #1e1b4b 0%, #312e81 50%, #4338ca 100%);padding:28px 32px;color:#ffffff;">' +
      '<p style="margin:0;text-transform:uppercase;letter-spacing:1px;font-size:11px;font-weight:700;opacity:0.85;">Relatório Executivo Consolidado</p>' +
      '<h1 style="margin:6px 0 0;font-size:24px;font-weight:800;color:#ffffff;letter-spacing:-0.5px;">Balanço Mensal de Atendimentos</h1>' +
      '<p style="margin:6px 0 0;font-size:13px;opacity:0.9;">Competência: <strong>' +
      periodLabel +
      '</strong> (vs. ' +
      prevPeriodLabel +
      ')</p>' +
      '</div>' +
      '<div style="padding:28px 32px;">' +
      '<p style="margin:0 0 20px;font-size:14px;color:#475569;line-height:1.5;">' +
      'Prezada Liderança,<br>Apresentamos o relatório executivo automático com os principais indicadores consolidados referentes a <strong>' +
      periodLabel +
      '</strong>.</p>' +
      '<div style="display:grid;grid-template-columns:1fr 1fr;gap:12px;margin-bottom:24px;">' +
      '<div style="border:1px solid #e2e8f0;border-radius:8px;padding:14px;background:#f8fafc;">' +
      '<div style="font-size:11px;font-weight:700;color:#64748b;text-transform:uppercase;">Volume Total</div>' +
      '<div style="display:flex;align-items:baseline;justify-content:space-between;margin-top:6px;">' +
      '<span style="font-size:26px;font-weight:800;color:#0f172a;">' +
      curTotal +
      '</span>' +
      formatTrend(totalDeltaPct, false, false) +
      '</div>' +
      '<div style="font-size:11px;color:#64748b;margin-top:4px;">Mês anterior: ' +
      prevTotal +
      '</div></div>' +
      '<div style="border:1px solid #e2e8f0;border-radius:8px;padding:14px;background:#f8fafc;">' +
      '<div style="font-size:11px;font-weight:700;color:#64748b;text-transform:uppercase;">TMA Médio</div>' +
      '<div style="display:flex;align-items:baseline;justify-content:space-between;margin-top:6px;">' +
      '<span style="font-size:26px;font-weight:800;color:#0f172a;">' +
      curAvgTma +
      ' <span style="font-size:14px;font-weight:500;">min</span></span>' +
      formatTrend(tmaDeltaPct, false, true) +
      '</div>' +
      '<div style="font-size:11px;color:#64748b;margin-top:4px;">Mês anterior: ' +
      prevAvgTma +
      ' min</div></div>' +
      '<div style="border:1px solid #e2e8f0;border-radius:8px;padding:14px;background:#f8fafc;">' +
      '<div style="font-size:11px;font-weight:700;color:#64748b;text-transform:uppercase;">TFR Médio Real</div>' +
      '<div style="display:flex;align-items:baseline;justify-content:space-between;margin-top:6px;">' +
      '<span style="font-size:26px;font-weight:800;color:#0f172a;">' +
      (curTfrCount > 0
        ? curAvgTfr + ' <span style="font-size:14px;font-weight:500;">min</span>'
        : 'N/D') +
      '</span>' +
      (curTfrCount > 0 ? formatTrend(tfrDeltaPct, false, true) : '') +
      '</div>' +
      '<div style="font-size:11px;color:#64748b;margin-top:4px;">' +
      curTfrCompliancePct +
      '% dentro da meta (≤ ' +
      defaultTfrTarget +
      ' min)</div></div>' +
      '<div style="border:1px solid #e2e8f0;border-radius:8px;padding:14px;background:#f8fafc;">' +
      '<div style="font-size:11px;font-weight:700;color:#64748b;text-transform:uppercase;">Evitáveis & Reaberturas</div>' +
      '<div style="display:flex;align-items:baseline;justify-content:space-between;margin-top:6px;">' +
      '<span style="font-size:20px;font-weight:800;color:#0f172a;">' +
      curAvoidablePct +
      '% <span style="font-size:11px;font-weight:500;color:#64748b;">evitáveis</span></span>' +
      formatTrend(avoidableDeltaPp, true, true) +
      '</div>' +
      '<div style="font-size:11px;color:#64748b;margin-top:4px;">Taxa de reabertura: <strong>' +
      curReopenRate +
      '%</strong> (' +
      curReopenCount +
      ' chamados) ' +
      formatTrend(reopenDeltaPp, true, true) +
      '</div></div>' +
      '</div>' +
      '<div style="margin-bottom:24px;border:1px solid #e2e8f0;border-radius:8px;padding:16px;background:#ffffff;">' +
      '<h3 style="margin:0 0 10px;font-size:14px;font-weight:700;color:#0f172a;text-transform:uppercase;">🎯 Metas da Equipe (Consultores Elegíveis: ' +
      consultantList.length +
      ')</h3>' +
      '<div style="display:grid;grid-template-columns:1fr 1fr;gap:12px;">' +
      '<div style="padding:10px 14px;background:#f8fafc;border-radius:6px;border-left:4px solid #3b82f6;">' +
      '<div style="font-size:11px;font-weight:700;color:#475569;text-transform:uppercase;">Meta de Atendimentos</div>' +
      '<div style="margin-top:4px;font-size:13px;color:#1e293b;"><strong>' +
      hitAttendanceCount +
      '</strong> bateram a meta (' +
      (consultantList.length > 0
        ? Math.round((hitAttendanceCount / consultantList.length) * 100)
        : 0) +
      '%) • <span style="color:#b91c1c;font-weight:600;">' +
      missAttendanceCount +
      ' abaixo</span></div></div>' +
      '<div style="padding:10px 14px;background:#f8fafc;border-radius:6px;border-left:4px solid #10b981;">' +
      '<div style="font-size:11px;font-weight:700;color:#475569;text-transform:uppercase;">Mínimo de Resolução (≥ ' +
      defaultMinResolution +
      '%)</div>' +
      '<div style="margin-top:4px;font-size:13px;color:#1e293b;"><strong>' +
      hitResolutionCount +
      '</strong> atingiram o mínimo • <span style="color:#b91c1c;font-weight:600;">' +
      missResolutionCount +
      ' abaixo</span></div></div>' +
      '</div></div>' +
      '<div style="display:grid;grid-template-columns:1fr 1fr;gap:16px;margin-bottom:24px;">' +
      '<div style="border:1px solid #e2e8f0;border-radius:8px;overflow:hidden;">' +
      '<div style="background:#f1f5f9;padding:10px 12px;font-size:12px;font-weight:700;color:#0f172a;border-bottom:1px solid #e2e8f0;">🏆 Top 5 Colaboradores (Volume)</div>' +
      '<table style="width:100%;border-collapse:collapse;"><thead><tr style="background:#f8fafc;font-size:10px;text-transform:uppercase;color:#64748b;text-align:center;"><th style="padding:6px 10px;text-align:left;">Consultor</th><th style="padding:6px 10px;">Vol</th><th style="padding:6px 10px;">% Meta</th><th style="padding:6px 10px;">Resolução</th></tr></thead><tbody>' +
      top5Rows +
      '</tbody></table></div>' +
      '<div style="border:1px solid #e2e8f0;border-radius:8px;overflow:hidden;">' +
      '<div style="background:#f1f5f9;padding:10px 12px;font-size:12px;font-weight:700;color:#0f172a;border-bottom:1px solid #e2e8f0;">⚠️ Bottom 5 Colaboradores (Volume)</div>' +
      '<table style="width:100%;border-collapse:collapse;"><thead><tr style="background:#f8fafc;font-size:10px;text-transform:uppercase;color:#64748b;text-align:center;"><th style="padding:6px 10px;text-align:left;">Consultor</th><th style="padding:6px 10px;">Vol</th><th style="padding:6px 10px;">% Meta</th><th style="padding:6px 10px;">Resolução</th></tr></thead><tbody>' +
      bottom5Rows +
      '</tbody></table></div>' +
      '</div>' +
      '<div style="margin-bottom:28px;border:1px solid #e2e8f0;border-radius:8px;overflow:hidden;">' +
      '<div style="background:#f1f5f9;padding:10px 12px;font-size:12px;font-weight:700;color:#0f172a;border-bottom:1px solid #e2e8f0;">📈 Motivos de Contato em Alta (vs. ' +
      prevPeriodLabel +
      ')</div>' +
      '<table style="width:100%;border-collapse:collapse;"><thead><tr style="background:#f8fafc;font-size:10px;text-transform:uppercase;color:#64748b;text-align:center;"><th style="padding:8px 10px;text-align:left;">Motivo Canônico</th><th style="padding:8px 10px;">Mês Atual</th><th style="padding:8px 10px;">Mês Anterior</th><th style="padding:8px 10px;">Variação</th></tr></thead><tbody>' +
      reasonRows +
      '</tbody></table></div>' +
      '<div style="text-align:center;margin:32px 0 16px;">' +
      '<a href="' +
      panelLink +
      '" style="display:inline-block;padding:12px 28px;background:#4338ca;color:#ffffff;text-decoration:none;font-size:14px;font-weight:700;border-radius:6px;">Acessar Painel de Metas & Desempenho</a></div>' +
      '<div style="border-top:1px solid #e2e8f0;padding-top:18px;text-align:center;font-size:11px;color:#94a3b8;">Sistema de Registros de Atendimento — Exportação automática mensal (Frente B4).</div>' +
      '</div></div></body></html>'

    var leadershipUsers = $app.findRecordsByFilter(
      'users',
      "(role = 'Master' || role = 'Gerente' || role = 'Supervisor' || role = 'Líder' || role = 'Gestor Comercial' || role = 'Gerentes' || role = 'Supervisores' || role = 'Líderes' || master_access = true) && approval_status = 'Aprovado'",
      '',
      1000,
      0,
    )

    var recipients = []
    var emailSet = {}
    for (var li = 0; li < leadershipUsers.length; li++) {
      var lu = leadershipUsers[li]
      var lEmail = (lu.getString('email') || '').trim()
      var notif = lu.get('email_notifications')
      if (notif === false) continue
      if (lEmail && lEmail.indexOf('@') > 0 && !emailSet[lEmail.toLowerCase()]) {
        emailSet[lEmail.toLowerCase()] = true
        recipients.push({ userId: lu.id, email: lEmail, name: lu.getString('name') || 'Líder' })
      }
    }

    var senderAddress = 'noreply@rexturadvance.com.br'
    var senderName = 'Sistema de Registros de Atendimento'
    try {
      if ($app.settings() && $app.settings().meta && $app.settings().meta.senderAddress) {
        senderAddress = $app.settings().meta.senderAddress
        senderName = $app.settings().meta.senderName || senderName
      }
    } catch (_) {}

    var emailLogsCol = null
    try {
      if ($app.hasTable('email_logs')) {
        emailLogsCol = $app.findCollectionByNameOrId('email_logs')
      }
    } catch (_) {}

    var subject = '📊 Relatório Executivo Mensal de Atendimentos — ' + periodLabel

    for (var ri = 0; ri < recipients.length; ri++) {
      var rTarget = recipients[ri]
      var sendOk = false
      try {
        var msg = new MailerMessage({
          from: { address: senderAddress, name: senderName },
          to: [{ address: rTarget.email, name: rTarget.name }],
          subject: subject,
          html: htmlContent,
        })
        $app.newMailClient().send(msg)
        sendOk = true
      } catch (mErr) {
        try {
          $app
            .mails()
            .send(
              { address: senderAddress, name: senderName },
              [{ address: rTarget.email }],
              subject,
              htmlContent,
            )
          sendOk = true
        } catch (fErr) {
          $app.logger().error('Erro envio relatorio mensal para ' + rTarget.email + ': ' + fErr)
        }
      }

      if (emailLogsCol && sendOk) {
        try {
          var logRec = new Record(emailLogsCol)
          logRec.set('sender_email', senderAddress)
          logRec.set('sender_name', senderName)
          logRec.set('recipient_email', rTarget.email)
          logRec.set('subject', subject)
          logRec.set(
            'body_snippet',
            (
              'Relatório Executivo Mensal (' +
              periodLabel +
              '): ' +
              curTotal +
              ' atendimentos, TMA ' +
              curAvgTma +
              ' min, TFR ' +
              curAvgTfr +
              ' min'
            ).substring(0, 500),
          )
          logRec.set('is_reply', false)
          logRec.set('category', 'Relatório Executivo Mensal')
          logRec.set('sentiment', 'Neutro')
          logRec.set('main_topic', 'Relatório Executivo Mensal ' + periodLabel)
          logRec.set('confidence_score', 100)
          if (rTarget.userId) logRec.set('processed_by', rTarget.userId)
          logRec.set('received_at', new Date().toISOString())
          $app.save(logRec)
        } catch (_) {}
      }
    }

    $app
      .logger()
      .info(
        'Cron Relatório Executivo Mensal finalizado. Enviado para ' +
          recipients.length +
          ' destinatários.',
      )
  } catch (err) {
    $app.logger().error('Erro fatal no executive_monthly_report_cron: ' + err)
  }
})

// 2. Endpoint REST para disparo manual por liderança
routerAdd(
  'POST',
  '/backend/v1/reports/executive-monthly-send',
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
        error: 'Apenas cargos de liderança podem solicitar o envio do relatório executivo.',
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

    function normalizeReason(raw) {
      if (!raw) return ''
      var trimmed = String(raw).trim()
      if (!trimmed) return ''
      var canonical = [
        'Bagagem',
        'Assento',
        'Cálculo de Reemissão',
        'Reembolso',
        'Cotação',
        'Reserva',
        'Cancelamento',
        'Regras Tarifárias',
        'Erro RF',
        'Remarcação',
        'Check-in',
        'Alteração de Voo',
        'Reclamação',
        'Dúvida Geral',
        'Outros',
      ]
      for (var ci = 0; ci < canonical.length; ci++) {
        if (canonical[ci].toLowerCase() === trimmed.toLowerCase()) return canonical[ci]
      }
      var lower = trimmed
        .toLowerCase()
        .replace(/[áàãâä]/g, 'a')
        .replace(/[éèêë]/g, 'e')
        .replace(/[íìîï]/g, 'i')
        .replace(/[óòõôö]/g, 'o')
        .replace(/[úùûü]/g, 'u')
        .replace(/[ç]/g, 'c')
      if (lower.indexOf('bagagem') !== -1) return 'Bagagem'
      if (lower.indexOf('assento') !== -1) return 'Assento'
      if (lower.indexOf('reemissao') !== -1 || lower.indexOf('re-emissao') !== -1)
        return 'Cálculo de Reemissão'
      if (lower.indexOf('reembolso') !== -1) return 'Reembolso'
      if (
        lower.indexOf('cotacao') !== -1 ||
        lower.indexOf('orcamento') !== -1 ||
        lower.indexOf('venda') !== -1
      )
        return 'Cotação'
      if (lower.indexOf('reserva') !== -1) return 'Reserva'
      if (lower.indexOf('cancelamento') !== -1) return 'Cancelamento'
      if (lower.indexOf('tarifari') !== -1 || lower.indexOf('regra') !== -1)
        return 'Regras Tarifárias'
      if (lower.indexOf('rf') !== -1) return 'Erro RF'
      if (lower.indexOf('remarcac') !== -1) return 'Remarcação'
      if (lower.indexOf('check-in') !== -1 || lower.indexOf('checkin') !== -1) return 'Check-in'
      if (lower.indexOf('alteracao') !== -1) return 'Alteração de Voo'
      if (lower.indexOf('reclamac') !== -1) return 'Reclamação'
      if (
        lower.indexOf('duvida') !== -1 ||
        lower.indexOf('suporte') !== -1 ||
        lower.indexOf('informac') !== -1
      )
        return 'Dúvida Geral'
      return 'Outros'
    }

    var targetMonthPadded = String(targetMonth).padStart(2, '0')
    var prevDate = new Date(Date.UTC(targetYear, targetMonth - 2, 1, 12, 0, 0))
    var prevYear = prevDate.getUTCFullYear()
    var prevMonth = prevDate.getUTCMonth() + 1
    var prevPeriodStr = prevYear + '-' + String(prevMonth).padStart(2, '0')

    var curStartIso = targetYear + '-' + targetMonthPadded + '-01 00:00:00'
    var nextMonthDate = new Date(Date.UTC(targetYear, targetMonth, 1, 12, 0, 0))
    var curEndIso =
      nextMonthDate.getUTCFullYear() +
      '-' +
      String(nextMonthDate.getUTCMonth() + 1).padStart(2, '0') +
      '-01 00:00:00'
    var prevStartIso = prevPeriodStr + '-01 00:00:00'
    var prevEndIso = curStartIso

    var defaultMonthlyTarget = 100
    var defaultMinResolution = 80
    var defaultTfrTarget = 15
    try {
      if ($app.hasTable('global_targets')) {
        var gtList = $app.findRecordsByFilter('global_targets', '', '-created', 1, 0)
        if (gtList && gtList.length > 0) {
          var gt = gtList[0]
          var gtMt = gt.getInt('monthly_attendance_target')
          var gtMr = gt.getInt('min_resolution_rate')
          var gtTfr = gt.getInt('tfr_target')
          if (gtMt > 0) defaultMonthlyTarget = gtMt
          if (gtMr > 0) defaultMinResolution = gtMr
          if (gtTfr > 0) defaultTfrTarget = gtTfr
        }
      }
    } catch (_) {}

    var userTargetsMap = {}
    try {
      if ($app.hasTable('user_targets')) {
        var utList = $app.findRecordsByFilter('user_targets', '', '', 1000, 0)
        for (var uIdx = 0; uIdx < utList.length; uIdx++) {
          var uRec = utList[uIdx]
          var uid = uRec.getString('user')
          if (uid) {
            userTargetsMap[uid] = {
              monthly_attendance_target:
                uRec.getInt('monthly_attendance_target') || defaultMonthlyTarget,
              min_resolution_rate: uRec.getInt('min_resolution_rate') || defaultMinResolution,
              tfr_target: uRec.getInt('tfr_target') || defaultTfrTarget,
            }
          }
        }
      }
    } catch (_) {}

    var allUsers = $app.findRecordsByFilter('users', "approval_status = 'Aprovado'", '', 2000, 0)
    var eligibleConsultants = {}
    var userNameMap = {}
    for (var i = 0; i < allUsers.length; i++) {
      var usr = allUsers[i]
      var uRole = usr.getString('role') || ''
      userNameMap[usr.id] = usr.getString('name') || usr.getString('email') || 'Colaborador'
      if (uRole === 'Consultor' || uRole === 'Consultores') {
        eligibleConsultants[usr.id] = {
          id: usr.id,
          name: userNameMap[usr.id],
          role: uRole,
          target:
            (userTargetsMap[usr.id] && userTargetsMap[usr.id].monthly_attendance_target) ||
            defaultMonthlyTarget,
          minResolution:
            (userTargetsMap[usr.id] && userTargetsMap[usr.id].min_resolution_rate) ||
            defaultMinResolution,
        }
      }
    }

    var curRecords = []
    try {
      curRecords = $app.findRecordsByFilter(
        'service_records',
        "created >= '" + curStartIso + "' && created < '" + curEndIso + "'",
        'created',
        20000,
        0,
      )
    } catch (_) {}

    var prevRecords = []
    try {
      prevRecords = $app.findRecordsByFilter(
        'service_records',
        "created >= '" + prevStartIso + "' && created < '" + prevEndIso + "'",
        'created',
        20000,
        0,
      )
    } catch (_) {}

    var curTotal = curRecords.length
    var curDurationSum = 0
    var curTfrSum = 0
    var curTfrCount = 0
    var curTfrWithinTarget = 0
    var curAvoidableCount = 0
    var curReopenCount = 0
    var curReasonsMap = {}
    var consultantCounts = {}

    for (var cId in eligibleConsultants) {
      consultantCounts[cId] = {
        userId: cId,
        name: eligibleConsultants[cId].name,
        total: 0,
        resolved: 0,
        target: eligibleConsultants[cId].target,
        minResolution: eligibleConsultants[cId].minResolution,
      }
    }

    for (var k = 0; k < curRecords.length; k++) {
      var r = curRecords[k]
      var dur = Number(r.get('duration') || 0)
      curDurationSum += dur

      var tfr = Number(r.get('first_response_time') || 0)
      if (tfr > 0) {
        curTfrCount++
        curTfrSum += tfr
        if (tfr <= defaultTfrTarget) curTfrWithinTarget++
      }

      if (r.getBool('avoidable_contact') === true) curAvoidableCount++

      var rCount = Number(r.get('reopen_count') || 0)
      if (rCount > 0 || r.getBool('is_reopened')) curReopenCount++

      var canon = normalizeReason(r.getString('contact_reason'))
      if (canon) curReasonsMap[canon] = (curReasonsMap[canon] || 0) + 1

      var assignedUid = r.getString('assigned_user') || r.getString('user_id')
      if (assignedUid && consultantCounts[assignedUid]) {
        consultantCounts[assignedUid].total++
        if (r.getString('status') === 'Concluído') consultantCounts[assignedUid].resolved++
      }
    }

    var curAvgTma = curTotal > 0 ? Math.round((curDurationSum / curTotal) * 10) / 10 : 0
    var curAvgTfr = curTfrCount > 0 ? Math.round((curTfrSum / curTfrCount) * 10) / 10 : 0
    var curTfrCompliancePct =
      curTfrCount > 0 ? Math.round((curTfrWithinTarget / curTfrCount) * 100) : 100
    var curAvoidablePct = curTotal > 0 ? Math.round((curAvoidableCount / curTotal) * 100) : 0
    var curReopenRate = curTotal > 0 ? Math.round((curReopenCount / curTotal) * 100) : 0

    var prevTotal = prevRecords.length
    var prevDurationSum = 0
    var prevTfrSum = 0
    var prevTfrCount = 0
    var prevAvoidableCount = 0
    var prevReopenCount = 0
    var prevReasonsMap = {}

    for (var p = 0; p < prevRecords.length; p++) {
      var pr = prevRecords[p]
      prevDurationSum += Number(pr.get('duration') || 0)
      var pTfr = Number(pr.get('first_response_time') || 0)
      if (pTfr > 0) {
        prevTfrCount++
        prevTfrSum += pTfr
      }
      if (pr.getBool('avoidable_contact') === true) prevAvoidableCount++
      var prCount = Number(pr.get('reopen_count') || 0)
      if (prCount > 0 || pr.getBool('is_reopened')) prevReopenCount++
      var pCanon = normalizeReason(pr.getString('contact_reason'))
      if (pCanon) prevReasonsMap[pCanon] = (prevReasonsMap[pCanon] || 0) + 1
    }

    var prevAvgTma = prevTotal > 0 ? Math.round((prevDurationSum / prevTotal) * 10) / 10 : 0
    var prevAvgTfr = prevTfrCount > 0 ? Math.round((prevTfrSum / prevTfrCount) * 10) / 10 : 0
    var prevAvoidablePct = prevTotal > 0 ? Math.round((prevAvoidableCount / prevTotal) * 100) : 0
    var prevReopenRate = prevTotal > 0 ? Math.round((prevReopenCount / prevTotal) * 100) : 0

    function calcPctDelta(curVal, prevVal) {
      if (prevVal === 0) return curVal === 0 ? 0 : 100
      return Math.round(((curVal - prevVal) / prevVal) * 1000) / 10
    }

    var totalDeltaPct = calcPctDelta(curTotal, prevTotal)
    var tmaDeltaPct = calcPctDelta(curAvgTma, prevAvgTma)
    var tfrDeltaPct = calcPctDelta(curAvgTfr, prevAvgTfr)
    var avoidableDeltaPp = curAvoidablePct - prevAvoidablePct
    var reopenDeltaPp = curReopenRate - prevReopenRate

    var hitAttendanceCount = 0
    var missAttendanceCount = 0
    var hitResolutionCount = 0
    var missResolutionCount = 0
    var consultantList = []

    for (var consId in consultantCounts) {
      var cItem = consultantCounts[consId]
      var resRate = cItem.total > 0 ? Math.round((cItem.resolved / cItem.total) * 100) : 0
      cItem.resolutionRate = resRate
      cItem.attendancePct = cItem.target > 0 ? Math.round((cItem.total / cItem.target) * 100) : 0

      if (cItem.total >= cItem.target) hitAttendanceCount++
      else missAttendanceCount++

      if (cItem.total > 0 && resRate >= cItem.minResolution) hitResolutionCount++
      else if (cItem.total > 0) missResolutionCount++

      consultantList.push(cItem)
    }

    consultantList.sort(function (a, b) {
      return b.total - a.total
    })
    var top5 = consultantList.slice(0, 5)
    var reversed = consultantList.slice().reverse()
    var bottom5 = reversed.slice(0, 5)

    var reasonGrowthList = []
    var allReasonsSet = {}
    for (var rk in curReasonsMap) allReasonsSet[rk] = true
    for (var rkp in prevReasonsMap) allReasonsSet[rkp] = true

    for (var rName in allReasonsSet) {
      var cC = curReasonsMap[rName] || 0
      var pC = prevReasonsMap[rName] || 0
      reasonGrowthList.push({
        reason: rName,
        currentCount: cC,
        prevCount: pC,
        diff: cC - pC,
        growthPct: calcPctDelta(cC, pC),
      })
    }

    reasonGrowthList.sort(function (a, b) {
      if (b.diff !== a.diff) return b.diff - a.diff
      return b.growthPct - a.growthPct
    })
    var topGrowingReasons = reasonGrowthList.slice(0, 5)

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
    var periodLabel = monthNames[targetMonth - 1] + '/' + targetYear
    var prevPeriodLabel = monthNames[prevMonth - 1] + '/' + prevYear

    function formatTrend(val, isPp, invertGood) {
      var sign = val > 0 ? '+' : ''
      var unit = isPp ? ' p.p.' : '%'
      var arrow = val > 0 ? '▲' : val < 0 ? '▼' : '▬'
      var isGood = invertGood ? val <= 0 : val >= 0
      var color = val === 0 ? '#64748b' : isGood ? '#15803d' : '#b91c1c'
      var bg = val === 0 ? '#f1f5f9' : isGood ? '#dcfce7' : '#fee2e2'
      return (
        '<span style="display:inline-block;padding:2px 6px;border-radius:4px;font-size:11px;font-weight:700;color:' +
        color +
        ';background:' +
        bg +
        ';">' +
        arrow +
        ' ' +
        sign +
        val +
        unit +
        '</span>'
      )
    }

    var top5Rows = ''
    for (var t5i = 0; t5i < top5.length; t5i++) {
      var t5c = top5[t5i]
      top5Rows +=
        '<tr style="border-bottom:1px solid #f1f5f9;font-size:12px;">' +
        '<td style="padding:8px 10px;font-weight:600;color:#1e293b;">#' +
        (t5i + 1) +
        ' ' +
        t5c.name +
        '</td>' +
        '<td style="padding:8px 10px;text-align:center;font-weight:700;color:#0f172a;">' +
        t5c.total +
        '</td>' +
        '<td style="padding:8px 10px;text-align:center;color:#475569;">' +
        t5c.attendancePct +
        '% (' +
        t5c.target +
        ')</td>' +
        '<td style="padding:8px 10px;text-align:center;color:' +
        (t5c.resolutionRate >= t5c.minResolution ? '#15803d' : '#b91c1c') +
        ';font-weight:600;">' +
        t5c.resolutionRate +
        '%</td>' +
        '</tr>'
    }
    if (!top5Rows)
      top5Rows =
        '<tr><td colspan="4" style="padding:12px;text-align:center;color:#94a3b8;font-size:12px;">Sem atendimentos no período.</td></tr>'

    var bottom5Rows = ''
    for (var b5i = 0; b5i < bottom5.length; b5i++) {
      var b5c = bottom5[b5i]
      bottom5Rows +=
        '<tr style="border-bottom:1px solid #f1f5f9;font-size:12px;">' +
        '<td style="padding:8px 10px;font-weight:600;color:#1e293b;">' +
        b5c.name +
        '</td>' +
        '<td style="padding:8px 10px;text-align:center;font-weight:700;color:#0f172a;">' +
        b5c.total +
        '</td>' +
        '<td style="padding:8px 10px;text-align:center;color:#475569;">' +
        b5c.attendancePct +
        '% (' +
        b5c.target +
        ')</td>' +
        '<td style="padding:8px 10px;text-align:center;color:' +
        (b5c.resolutionRate >= b5c.minResolution ? '#15803d' : '#b91c1c') +
        ';font-weight:600;">' +
        b5c.resolutionRate +
        '%</td>' +
        '</tr>'
    }
    if (!bottom5Rows)
      bottom5Rows =
        '<tr><td colspan="4" style="padding:12px;text-align:center;color:#94a3b8;font-size:12px;">Sem atendimentos no período.</td></tr>'

    var reasonRows = ''
    for (var rgi = 0; rgi < topGrowingReasons.length; rgi++) {
      var gr = topGrowingReasons[rgi]
      var rSign = gr.diff > 0 ? '+' : ''
      var diffBadgeColor = gr.diff > 0 ? '#b91c1c' : gr.diff < 0 ? '#15803d' : '#64748b'
      var diffBadgeBg = gr.diff > 0 ? '#fee2e2' : gr.diff < 0 ? '#dcfce7' : '#f1f5f9'
      reasonRows +=
        '<tr style="border-bottom:1px solid #f1f5f9;font-size:12px;">' +
        '<td style="padding:8px 10px;font-weight:600;color:#1e293b;">' +
        gr.reason +
        '</td>' +
        '<td style="padding:8px 10px;text-align:center;font-weight:700;color:#0f172a;">' +
        gr.currentCount +
        '</td>' +
        '<td style="padding:8px 10px;text-align:center;color:#64748b;">' +
        gr.prevCount +
        '</td>' +
        '<td style="padding:8px 10px;text-align:center;">' +
        '<span style="padding:2px 6px;border-radius:4px;font-size:11px;font-weight:700;color:' +
        diffBadgeColor +
        ';background:' +
        diffBadgeBg +
        ';">' +
        rSign +
        gr.diff +
        ' (' +
        rSign +
        gr.growthPct +
        '%)' +
        '</span></td></tr>'
    }
    if (!reasonRows)
      reasonRows =
        '<tr><td colspan="4" style="padding:12px;text-align:center;color:#94a3b8;font-size:12px;">Sem motivos no período.</td></tr>'

    var appBaseUrl =
      $os.getenv('APP_URL') ||
      'https://sistema-de-registros-de-atendimento-b6923.shrd00.internal.goskip.dev'
    var panelLink = appBaseUrl + '/metas-desempenho'

    var htmlContent =
      '<!DOCTYPE html><html><head><meta charset="utf-8"></head>' +
      '<body style="margin:0;padding:24px;background-color:#f1f5f9;font-family:-apple-system,BlinkMacSystemFont,\'Segoe UI\',Roboto,Helvetica,Arial,sans-serif;color:#1e293b;">' +
      '<div style="max-width:760px;margin:0 auto;background:#ffffff;border-radius:10px;border:1px solid #e2e8f0;overflow:hidden;box-shadow:0 4px 6px -1px rgba(0,0,0,0.05);">' +
      '<div style="background:linear-gradient(135deg, #1e1b4b 0%, #312e81 50%, #4338ca 100%);padding:28px 32px;color:#ffffff;">' +
      '<p style="margin:0;text-transform:uppercase;letter-spacing:1px;font-size:11px;font-weight:700;opacity:0.85;">Relatório Executivo Consolidado</p>' +
      '<h1 style="margin:6px 0 0;font-size:24px;font-weight:800;color:#ffffff;letter-spacing:-0.5px;">Balanço Mensal de Atendimentos</h1>' +
      '<p style="margin:6px 0 0;font-size:13px;opacity:0.9;">Competência: <strong>' +
      periodLabel +
      '</strong> (vs. ' +
      prevPeriodLabel +
      ')</p>' +
      '</div>' +
      '<div style="padding:28px 32px;">' +
      '<p style="margin:0 0 20px;font-size:14px;color:#475569;line-height:1.5;">' +
      'Prezada Liderança,<br>Apresentamos o relatório executivo automático com os principais indicadores consolidados referentes a <strong>' +
      periodLabel +
      '</strong>.</p>' +
      '<div style="display:grid;grid-template-columns:1fr 1fr;gap:12px;margin-bottom:24px;">' +
      '<div style="border:1px solid #e2e8f0;border-radius:8px;padding:14px;background:#f8fafc;">' +
      '<div style="font-size:11px;font-weight:700;color:#64748b;text-transform:uppercase;">Volume Total</div>' +
      '<div style="display:flex;align-items:baseline;justify-content:space-between;margin-top:6px;">' +
      '<span style="font-size:26px;font-weight:800;color:#0f172a;">' +
      curTotal +
      '</span>' +
      formatTrend(totalDeltaPct, false, false) +
      '</div>' +
      '<div style="font-size:11px;color:#64748b;margin-top:4px;">Mês anterior: ' +
      prevTotal +
      '</div></div>' +
      '<div style="border:1px solid #e2e8f0;border-radius:8px;padding:14px;background:#f8fafc;">' +
      '<div style="font-size:11px;font-weight:700;color:#64748b;text-transform:uppercase;">TMA Médio</div>' +
      '<div style="display:flex;align-items:baseline;justify-content:space-between;margin-top:6px;">' +
      '<span style="font-size:26px;font-weight:800;color:#0f172a;">' +
      curAvgTma +
      ' <span style="font-size:14px;font-weight:500;">min</span></span>' +
      formatTrend(tmaDeltaPct, false, true) +
      '</div>' +
      '<div style="font-size:11px;color:#64748b;margin-top:4px;">Mês anterior: ' +
      prevAvgTma +
      ' min</div></div>' +
      '<div style="border:1px solid #e2e8f0;border-radius:8px;padding:14px;background:#f8fafc;">' +
      '<div style="font-size:11px;font-weight:700;color:#64748b;text-transform:uppercase;">TFR Médio Real</div>' +
      '<div style="display:flex;align-items:baseline;justify-content:space-between;margin-top:6px;">' +
      '<span style="font-size:26px;font-weight:800;color:#0f172a;">' +
      (curTfrCount > 0
        ? curAvgTfr + ' <span style="font-size:14px;font-weight:500;">min</span>'
        : 'N/D') +
      '</span>' +
      (curTfrCount > 0 ? formatTrend(tfrDeltaPct, false, true) : '') +
      '</div>' +
      '<div style="font-size:11px;color:#64748b;margin-top:4px;">' +
      curTfrCompliancePct +
      '% dentro da meta (≤ ' +
      defaultTfrTarget +
      ' min)</div></div>' +
      '<div style="border:1px solid #e2e8f0;border-radius:8px;padding:14px;background:#f8fafc;">' +
      '<div style="font-size:11px;font-weight:700;color:#64748b;text-transform:uppercase;">Evitáveis & Reaberturas</div>' +
      '<div style="display:flex;align-items:baseline;justify-content:space-between;margin-top:6px;">' +
      '<span style="font-size:20px;font-weight:800;color:#0f172a;">' +
      curAvoidablePct +
      '% <span style="font-size:11px;font-weight:500;color:#64748b;">evitáveis</span></span>' +
      formatTrend(avoidableDeltaPp, true, true) +
      '</div>' +
      '<div style="font-size:11px;color:#64748b;margin-top:4px;">Taxa de reabertura: <strong>' +
      curReopenRate +
      '%</strong> (' +
      curReopenCount +
      ' chamados) ' +
      formatTrend(reopenDeltaPp, true, true) +
      '</div></div>' +
      '</div>' +
      '<div style="margin-bottom:24px;border:1px solid #e2e8f0;border-radius:8px;padding:16px;background:#ffffff;">' +
      '<h3 style="margin:0 0 10px;font-size:14px;font-weight:700;color:#0f172a;text-transform:uppercase;">🎯 Metas da Equipe (Consultores Elegíveis: ' +
      consultantList.length +
      ')</h3>' +
      '<div style="display:grid;grid-template-columns:1fr 1fr;gap:12px;">' +
      '<div style="padding:10px 14px;background:#f8fafc;border-radius:6px;border-left:4px solid #3b82f6;">' +
      '<div style="font-size:11px;font-weight:700;color:#475569;text-transform:uppercase;">Meta de Atendimentos</div>' +
      '<div style="margin-top:4px;font-size:13px;color:#1e293b;"><strong>' +
      hitAttendanceCount +
      '</strong> bateram a meta (' +
      (consultantList.length > 0
        ? Math.round((hitAttendanceCount / consultantList.length) * 100)
        : 0) +
      '%) • <span style="color:#b91c1c;font-weight:600;">' +
      missAttendanceCount +
      ' abaixo</span></div></div>' +
      '<div style="padding:10px 14px;background:#f8fafc;border-radius:6px;border-left:4px solid #10b981;">' +
      '<div style="font-size:11px;font-weight:700;color:#475569;text-transform:uppercase;">Mínimo de Resolução (≥ ' +
      defaultMinResolution +
      '%)</div>' +
      '<div style="margin-top:4px;font-size:13px;color:#1e293b;"><strong>' +
      hitResolutionCount +
      '</strong> atingiram o mínimo • <span style="color:#b91c1c;font-weight:600;">' +
      missResolutionCount +
      ' abaixo</span></div></div>' +
      '</div></div>' +
      '<div style="display:grid;grid-template-columns:1fr 1fr;gap:16px;margin-bottom:24px;">' +
      '<div style="border:1px solid #e2e8f0;border-radius:8px;overflow:hidden;">' +
      '<div style="background:#f1f5f9;padding:10px 12px;font-size:12px;font-weight:700;color:#0f172a;border-bottom:1px solid #e2e8f0;">🏆 Top 5 Colaboradores (Volume)</div>' +
      '<table style="width:100%;border-collapse:collapse;"><thead><tr style="background:#f8fafc;font-size:10px;text-transform:uppercase;color:#64748b;text-align:center;"><th style="padding:6px 10px;text-align:left;">Consultor</th><th style="padding:6px 10px;">Vol</th><th style="padding:6px 10px;">% Meta</th><th style="padding:6px 10px;">Resolução</th></tr></thead><tbody>' +
      top5Rows +
      '</tbody></table></div>' +
      '<div style="border:1px solid #e2e8f0;border-radius:8px;overflow:hidden;">' +
      '<div style="background:#f1f5f9;padding:10px 12px;font-size:12px;font-weight:700;color:#0f172a;border-bottom:1px solid #e2e8f0;">⚠️ Bottom 5 Colaboradores (Volume)</div>' +
      '<table style="width:100%;border-collapse:collapse;"><thead><tr style="background:#f8fafc;font-size:10px;text-transform:uppercase;color:#64748b;text-align:center;"><th style="padding:6px 10px;text-align:left;">Consultor</th><th style="padding:6px 10px;">Vol</th><th style="padding:6px 10px;">% Meta</th><th style="padding:6px 10px;">Resolução</th></tr></thead><tbody>' +
      bottom5Rows +
      '</tbody></table></div>' +
      '</div>' +
      '<div style="margin-bottom:28px;border:1px solid #e2e8f0;border-radius:8px;overflow:hidden;">' +
      '<div style="background:#f1f5f9;padding:10px 12px;font-size:12px;font-weight:700;color:#0f172a;border-bottom:1px solid #e2e8f0;">📈 Motivos de Contato em Alta (vs. ' +
      prevPeriodLabel +
      ')</div>' +
      '<table style="width:100%;border-collapse:collapse;"><thead><tr style="background:#f8fafc;font-size:10px;text-transform:uppercase;color:#64748b;text-align:center;"><th style="padding:8px 10px;text-align:left;">Motivo Canônico</th><th style="padding:8px 10px;">Mês Atual</th><th style="padding:8px 10px;">Mês Anterior</th><th style="padding:8px 10px;">Variação</th></tr></thead><tbody>' +
      reasonRows +
      '</tbody></table></div>' +
      '<div style="text-align:center;margin:32px 0 16px;">' +
      '<a href="' +
      panelLink +
      '" style="display:inline-block;padding:12px 28px;background:#4338ca;color:#ffffff;text-decoration:none;font-size:14px;font-weight:700;border-radius:6px;">Acessar Painel de Metas & Desempenho</a></div>' +
      '<div style="border-top:1px solid #e2e8f0;padding-top:18px;text-align:center;font-size:11px;color:#94a3b8;">Sistema de Registros de Atendimento — Exportação automática mensal (Frente B4).</div>' +
      '</div></div></body></html>'

    var leadershipUsers = $app.findRecordsByFilter(
      'users',
      "(role = 'Master' || role = 'Gerente' || role = 'Supervisor' || role = 'Líder' || role = 'Gestor Comercial' || role = 'Gerentes' || role = 'Supervisores' || role = 'Líderes' || master_access = true) && approval_status = 'Aprovado'",
      '',
      1000,
      0,
    )

    var recipients = []
    var emailSet = {}
    for (var li = 0; li < leadershipUsers.length; li++) {
      var lu = leadershipUsers[li]
      var lEmail = (lu.getString('email') || '').trim()
      var notif = lu.get('email_notifications')
      if (notif === false) continue
      if (lEmail && lEmail.indexOf('@') > 0 && !emailSet[lEmail.toLowerCase()]) {
        emailSet[lEmail.toLowerCase()] = true
        recipients.push({ userId: lu.id, email: lEmail, name: lu.getString('name') || 'Líder' })
      }
    }

    var triggerEmail = (authRecord.getString('email') || '').trim()
    if (triggerEmail && !emailSet[triggerEmail.toLowerCase()]) {
      recipients.push({
        userId: authRecord.id,
        email: triggerEmail,
        name: authRecord.getString('name') || 'Gestor',
      })
    }

    var senderAddress = 'noreply@rexturadvance.com.br'
    var senderName = 'Sistema de Registros de Atendimento'
    try {
      if ($app.settings() && $app.settings().meta && $app.settings().meta.senderAddress) {
        senderAddress = $app.settings().meta.senderAddress
        senderName = $app.settings().meta.senderName || senderName
      }
    } catch (_) {}

    var emailLogsCol = null
    try {
      if ($app.hasTable('email_logs')) {
        emailLogsCol = $app.findCollectionByNameOrId('email_logs')
      }
    } catch (_) {}

    var subject = '📊 Relatório Executivo Mensal de Atendimentos — ' + periodLabel
    var sentCount = 0
    var errors = []

    for (var ri = 0; ri < recipients.length; ri++) {
      var rTarget = recipients[ri]
      var sendOk = false
      try {
        var msg = new MailerMessage({
          from: { address: senderAddress, name: senderName },
          to: [{ address: rTarget.email, name: rTarget.name }],
          subject: subject,
          html: htmlContent,
        })
        $app.newMailClient().send(msg)
        sendOk = true
        sentCount++
      } catch (mErr) {
        try {
          $app
            .mails()
            .send(
              { address: senderAddress, name: senderName },
              [{ address: rTarget.email }],
              subject,
              htmlContent,
            )
          sendOk = true
          sentCount++
        } catch (fErr) {
          errors.push({ email: rTarget.email, error: String(mErr || fErr) })
          $app
            .logger()
            .error('Erro envio relatorio mensal manual para ' + rTarget.email + ': ' + fErr)
        }
      }

      if (emailLogsCol && sendOk) {
        try {
          var logRec = new Record(emailLogsCol)
          logRec.set('sender_email', senderAddress)
          logRec.set('sender_name', senderName)
          logRec.set('recipient_email', rTarget.email)
          logRec.set('subject', subject)
          logRec.set(
            'body_snippet',
            (
              'Relatório Executivo Mensal (' +
              periodLabel +
              '): ' +
              curTotal +
              ' atendimentos, TMA ' +
              curAvgTma +
              ' min, TFR ' +
              curAvgTfr +
              ' min'
            ).substring(0, 500),
          )
          logRec.set('is_reply', false)
          logRec.set('category', 'Relatório Executivo Mensal')
          logRec.set('sentiment', 'Neutro')
          logRec.set('main_topic', 'Relatório Executivo Mensal ' + periodLabel)
          logRec.set('confidence_score', 100)
          if (rTarget.userId) logRec.set('processed_by', rTarget.userId)
          logRec.set('received_at', new Date().toISOString())
          $app.save(logRec)
        } catch (_) {}
      }
    }

    return c.json(200, {
      success: true,
      periodLabel: periodLabel,
      sentCount: sentCount,
      totalRecipients: recipients.length,
      errors: errors,
      metrics: {
        total: curTotal,
        totalDeltaPct: totalDeltaPct,
        avgTma: curAvgTma,
        tmaDeltaPct: tmaDeltaPct,
        avgTfr: curAvgTfr,
        tfrDeltaPct: tfrDeltaPct,
        tfrCompliancePct: curTfrCompliancePct,
        avoidableCount: curAvoidableCount,
        avoidablePct: curAvoidablePct,
        avoidableDeltaPp: avoidableDeltaPp,
        reopenCount: curReopenCount,
        reopenRate: curReopenRate,
        reopenDeltaPp: reopenDeltaPp,
      },
      targets: {
        totalConsultants: consultantList.length,
        hitAttendanceCount: hitAttendanceCount,
        missAttendanceCount: missAttendanceCount,
        hitResolutionCount: hitResolutionCount,
        missResolutionCount: missResolutionCount,
      },
      top5: top5,
      bottom5: bottom5,
      topGrowingReasons: topGrowingReasons,
    })
  },
  $apis.requireAuth(),
)

// 3. Endpoint GET para pré-visualização dos dados do relatório executivo
routerAdd(
  'GET',
  '/backend/v1/reports/executive-monthly-data',
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
      return c.json(403, { error: 'Acesso negado' })
    }

    var now = new Date()
    var gmt3Ms = now.getTime() - 3 * 3600 * 1000
    var gmt3Date = new Date(gmt3Ms)

    var query = info.query || {}
    var targetYear = parseInt(query.year, 10)
    var targetMonth = parseInt(query.month, 10)

    if (!targetYear || !targetMonth) {
      var prevMonthDate = new Date(
        Date.UTC(gmt3Date.getUTCFullYear(), gmt3Date.getUTCMonth() - 1, 1, 12, 0, 0),
      )
      targetYear = prevMonthDate.getUTCFullYear()
      targetMonth = prevMonthDate.getUTCMonth() + 1
    }

    function normalizeReason(raw) {
      if (!raw) return ''
      var trimmed = String(raw).trim()
      if (!trimmed) return ''
      var canonical = [
        'Bagagem',
        'Assento',
        'Cálculo de Reemissão',
        'Reembolso',
        'Cotação',
        'Reserva',
        'Cancelamento',
        'Regras Tarifárias',
        'Erro RF',
        'Remarcação',
        'Check-in',
        'Alteração de Voo',
        'Reclamação',
        'Dúvida Geral',
        'Outros',
      ]
      for (var ci = 0; ci < canonical.length; ci++) {
        if (canonical[ci].toLowerCase() === trimmed.toLowerCase()) return canonical[ci]
      }
      var lower = trimmed
        .toLowerCase()
        .replace(/[áàãâä]/g, 'a')
        .replace(/[éèêë]/g, 'e')
        .replace(/[íìîï]/g, 'i')
        .replace(/[óòõôö]/g, 'o')
        .replace(/[úùûü]/g, 'u')
        .replace(/[ç]/g, 'c')
      if (lower.indexOf('bagagem') !== -1) return 'Bagagem'
      if (lower.indexOf('assento') !== -1) return 'Assento'
      if (lower.indexOf('reemissao') !== -1 || lower.indexOf('re-emissao') !== -1)
        return 'Cálculo de Reemissão'
      if (lower.indexOf('reembolso') !== -1) return 'Reembolso'
      if (
        lower.indexOf('cotacao') !== -1 ||
        lower.indexOf('orcamento') !== -1 ||
        lower.indexOf('venda') !== -1
      )
        return 'Cotação'
      if (lower.indexOf('reserva') !== -1) return 'Reserva'
      if (lower.indexOf('cancelamento') !== -1) return 'Cancelamento'
      if (lower.indexOf('tarifari') !== -1 || lower.indexOf('regra') !== -1)
        return 'Regras Tarifárias'
      if (lower.indexOf('rf') !== -1) return 'Erro RF'
      if (lower.indexOf('remarcac') !== -1) return 'Remarcação'
      if (lower.indexOf('check-in') !== -1 || lower.indexOf('checkin') !== -1) return 'Check-in'
      if (lower.indexOf('alteracao') !== -1) return 'Alteração de Voo'
      if (lower.indexOf('reclamac') !== -1) return 'Reclamação'
      if (
        lower.indexOf('duvida') !== -1 ||
        lower.indexOf('suporte') !== -1 ||
        lower.indexOf('informac') !== -1
      )
        return 'Dúvida Geral'
      return 'Outros'
    }

    var targetMonthPadded = String(targetMonth).padStart(2, '0')
    var prevDate = new Date(Date.UTC(targetYear, targetMonth - 2, 1, 12, 0, 0))
    var prevYear = prevDate.getUTCFullYear()
    var prevMonth = prevDate.getUTCMonth() + 1
    var prevPeriodStr = prevYear + '-' + String(prevMonth).padStart(2, '0')

    var curStartIso = targetYear + '-' + targetMonthPadded + '-01 00:00:00'
    var nextMonthDate = new Date(Date.UTC(targetYear, targetMonth, 1, 12, 0, 0))
    var curEndIso =
      nextMonthDate.getUTCFullYear() +
      '-' +
      String(nextMonthDate.getUTCMonth() + 1).padStart(2, '0') +
      '-01 00:00:00'
    var prevStartIso = prevPeriodStr + '-01 00:00:00'
    var prevEndIso = curStartIso

    var defaultMonthlyTarget = 100
    var defaultMinResolution = 80
    var defaultTfrTarget = 15
    try {
      if ($app.hasTable('global_targets')) {
        var gtList = $app.findRecordsByFilter('global_targets', '', '-created', 1, 0)
        if (gtList && gtList.length > 0) {
          var gt = gtList[0]
          var gtMt = gt.getInt('monthly_attendance_target')
          var gtMr = gt.getInt('min_resolution_rate')
          var gtTfr = gt.getInt('tfr_target')
          if (gtMt > 0) defaultMonthlyTarget = gtMt
          if (gtMr > 0) defaultMinResolution = gtMr
          if (gtTfr > 0) defaultTfrTarget = gtTfr
        }
      }
    } catch (_) {}

    var userTargetsMap = {}
    try {
      if ($app.hasTable('user_targets')) {
        var utList = $app.findRecordsByFilter('user_targets', '', '', 1000, 0)
        for (var uIdx = 0; uIdx < utList.length; uIdx++) {
          var uRec = utList[uIdx]
          var uid = uRec.getString('user')
          if (uid) {
            userTargetsMap[uid] = {
              monthly_attendance_target:
                uRec.getInt('monthly_attendance_target') || defaultMonthlyTarget,
              min_resolution_rate: uRec.getInt('min_resolution_rate') || defaultMinResolution,
              tfr_target: uRec.getInt('tfr_target') || defaultTfrTarget,
            }
          }
        }
      }
    } catch (_) {}

    var allUsers = $app.findRecordsByFilter('users', "approval_status = 'Aprovado'", '', 2000, 0)
    var eligibleConsultants = {}
    var userNameMap = {}
    for (var i = 0; i < allUsers.length; i++) {
      var usr = allUsers[i]
      var uRole = usr.getString('role') || ''
      userNameMap[usr.id] = usr.getString('name') || usr.getString('email') || 'Colaborador'
      if (uRole === 'Consultor' || uRole === 'Consultores') {
        eligibleConsultants[usr.id] = {
          id: usr.id,
          name: userNameMap[usr.id],
          role: uRole,
          target:
            (userTargetsMap[usr.id] && userTargetsMap[usr.id].monthly_attendance_target) ||
            defaultMonthlyTarget,
          minResolution:
            (userTargetsMap[usr.id] && userTargetsMap[usr.id].min_resolution_rate) ||
            defaultMinResolution,
        }
      }
    }

    var curRecords = []
    try {
      curRecords = $app.findRecordsByFilter(
        'service_records',
        "created >= '" + curStartIso + "' && created < '" + curEndIso + "'",
        'created',
        20000,
        0,
      )
    } catch (_) {}

    var prevRecords = []
    try {
      prevRecords = $app.findRecordsByFilter(
        'service_records',
        "created >= '" + prevStartIso + "' && created < '" + prevEndIso + "'",
        'created',
        20000,
        0,
      )
    } catch (_) {}

    var curTotal = curRecords.length
    var curDurationSum = 0
    var curTfrSum = 0
    var curTfrCount = 0
    var curTfrWithinTarget = 0
    var curAvoidableCount = 0
    var curReopenCount = 0
    var curReasonsMap = {}
    var consultantCounts = {}

    for (var cId in eligibleConsultants) {
      consultantCounts[cId] = {
        userId: cId,
        name: eligibleConsultants[cId].name,
        total: 0,
        resolved: 0,
        target: eligibleConsultants[cId].target,
        minResolution: eligibleConsultants[cId].minResolution,
      }
    }

    for (var k = 0; k < curRecords.length; k++) {
      var r = curRecords[k]
      var dur = Number(r.get('duration') || 0)
      curDurationSum += dur

      var tfr = Number(r.get('first_response_time') || 0)
      if (tfr > 0) {
        curTfrCount++
        curTfrSum += tfr
        if (tfr <= defaultTfrTarget) curTfrWithinTarget++
      }

      if (r.getBool('avoidable_contact') === true) curAvoidableCount++

      var rCount = Number(r.get('reopen_count') || 0)
      if (rCount > 0 || r.getBool('is_reopened')) curReopenCount++

      var canon = normalizeReason(r.getString('contact_reason'))
      if (canon) curReasonsMap[canon] = (curReasonsMap[canon] || 0) + 1

      var assignedUid = r.getString('assigned_user') || r.getString('user_id')
      if (assignedUid && consultantCounts[assignedUid]) {
        consultantCounts[assignedUid].total++
        if (r.getString('status') === 'Concluído') consultantCounts[assignedUid].resolved++
      }
    }

    var curAvgTma = curTotal > 0 ? Math.round((curDurationSum / curTotal) * 10) / 10 : 0
    var curAvgTfr = curTfrCount > 0 ? Math.round((curTfrSum / curTfrCount) * 10) / 10 : 0
    var curTfrCompliancePct =
      curTfrCount > 0 ? Math.round((curTfrWithinTarget / curTfrCount) * 100) : 100
    var curAvoidablePct = curTotal > 0 ? Math.round((curAvoidableCount / curTotal) * 100) : 0
    var curReopenRate = curTotal > 0 ? Math.round((curReopenCount / curTotal) * 100) : 0

    var prevTotal = prevRecords.length
    var prevDurationSum = 0
    var prevTfrSum = 0
    var prevTfrCount = 0
    var prevAvoidableCount = 0
    var prevReopenCount = 0
    var prevReasonsMap = {}

    for (var p = 0; p < prevRecords.length; p++) {
      var pr = prevRecords[p]
      prevDurationSum += Number(pr.get('duration') || 0)
      var pTfr = Number(pr.get('first_response_time') || 0)
      if (pTfr > 0) {
        prevTfrCount++
        prevTfrSum += pTfr
      }
      if (pr.getBool('avoidable_contact') === true) prevAvoidableCount++
      var prCount = Number(pr.get('reopen_count') || 0)
      if (prCount > 0 || pr.getBool('is_reopened')) prevReopenCount++
      var pCanon = normalizeReason(pr.getString('contact_reason'))
      if (pCanon) prevReasonsMap[pCanon] = (prevReasonsMap[pCanon] || 0) + 1
    }

    var prevAvgTma = prevTotal > 0 ? Math.round((prevDurationSum / prevTotal) * 10) / 10 : 0
    var prevAvgTfr = prevTfrCount > 0 ? Math.round((prevTfrSum / prevTfrCount) * 10) / 10 : 0
    var prevAvoidablePct = prevTotal > 0 ? Math.round((prevAvoidableCount / prevTotal) * 100) : 0
    var prevReopenRate = prevTotal > 0 ? Math.round((prevReopenCount / prevTotal) * 100) : 0

    function calcPctDelta(curVal, prevVal) {
      if (prevVal === 0) return curVal === 0 ? 0 : 100
      return Math.round(((curVal - prevVal) / prevVal) * 1000) / 10
    }

    var totalDeltaPct = calcPctDelta(curTotal, prevTotal)
    var tmaDeltaPct = calcPctDelta(curAvgTma, prevAvgTma)
    var tfrDeltaPct = calcPctDelta(curAvgTfr, prevAvgTfr)
    var avoidableDeltaPp = curAvoidablePct - prevAvoidablePct
    var reopenDeltaPp = curReopenRate - prevReopenRate

    var hitAttendanceCount = 0
    var missAttendanceCount = 0
    var hitResolutionCount = 0
    var missResolutionCount = 0
    var consultantList = []

    for (var consId in consultantCounts) {
      var cItem = consultantCounts[consId]
      var resRate = cItem.total > 0 ? Math.round((cItem.resolved / cItem.total) * 100) : 0
      cItem.resolutionRate = resRate
      cItem.attendancePct = cItem.target > 0 ? Math.round((cItem.total / cItem.target) * 100) : 0

      if (cItem.total >= cItem.target) hitAttendanceCount++
      else missAttendanceCount++

      if (cItem.total > 0 && resRate >= cItem.minResolution) hitResolutionCount++
      else if (cItem.total > 0) missResolutionCount++

      consultantList.push(cItem)
    }

    consultantList.sort(function (a, b) {
      return b.total - a.total
    })
    var top5 = consultantList.slice(0, 5)
    var reversed = consultantList.slice().reverse()
    var bottom5 = reversed.slice(0, 5)

    var reasonGrowthList = []
    var allReasonsSet = {}
    for (var rk in curReasonsMap) allReasonsSet[rk] = true
    for (var rkp in prevReasonsMap) allReasonsSet[rkp] = true

    for (var rName in allReasonsSet) {
      var cC = curReasonsMap[rName] || 0
      var pC = prevReasonsMap[rName] || 0
      reasonGrowthList.push({
        reason: rName,
        currentCount: cC,
        prevCount: pC,
        diff: cC - pC,
        growthPct: calcPctDelta(cC, pC),
      })
    }

    reasonGrowthList.sort(function (a, b) {
      if (b.diff !== a.diff) return b.diff - a.diff
      return b.growthPct - a.growthPct
    })
    var topGrowingReasons = reasonGrowthList.slice(0, 5)

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
    var periodLabel = monthNames[targetMonth - 1] + '/' + targetYear
    var prevPeriodLabel = monthNames[prevMonth - 1] + '/' + prevYear

    return c.json(200, {
      success: true,
      report: {
        targetYear: targetYear,
        targetMonth: targetMonth,
        periodLabel: periodLabel,
        prevPeriodLabel: prevPeriodLabel,
        defaultTfrTarget: defaultTfrTarget,
        defaultMonthlyTarget: defaultMonthlyTarget,
        defaultMinResolution: defaultMinResolution,
        metrics: {
          total: curTotal,
          prevTotal: prevTotal,
          totalDeltaPct: totalDeltaPct,
          avgTma: curAvgTma,
          prevAvgTma: prevAvgTma,
          tmaDeltaPct: tmaDeltaPct,
          avgTfr: curAvgTfr,
          prevAvgTfr: prevAvgTfr,
          tfrDeltaPct: tfrDeltaPct,
          tfrCompliancePct: curTfrCompliancePct,
          avoidableCount: curAvoidableCount,
          avoidablePct: curAvoidablePct,
          prevAvoidablePct: prevAvoidablePct,
          avoidableDeltaPp: avoidableDeltaPp,
          reopenCount: curReopenCount,
          reopenRate: curReopenRate,
          prevReopenRate: prevReopenRate,
          reopenDeltaPp: reopenDeltaPp,
        },
        targets: {
          totalConsultants: consultantList.length,
          hitAttendanceCount: hitAttendanceCount,
          missAttendanceCount: missAttendanceCount,
          hitResolutionCount: hitResolutionCount,
          missResolutionCount: missResolutionCount,
        },
        top5: top5,
        bottom5: bottom5,
        topGrowingReasons: topGrowingReasons,
      },
    })
  },
  $apis.requireAuth(),
)
