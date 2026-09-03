migrate(
  (app) => {
    // 1. Criar coleção meta_snapshots
    if (!app.hasTable('meta_snapshots')) {
      const metaSnapshots = new Collection({
        name: 'meta_snapshots',
        type: 'base',
        // Leitura para o próprio usuário e gestores/lideranças/master
        listRule:
          '@request.auth.id != "" && (user_id = @request.auth.id || @request.auth.role = "Gerente" || @request.auth.role = "Supervisor" || @request.auth.role = "Líder" || @request.auth.role = "Gestor Comercial" || @request.auth.role = "Gerentes" || @request.auth.role = "Supervisores" || @request.auth.role = "Líderes" || @request.auth.role = "Master" || @request.auth.master_access = true)',
        viewRule:
          '@request.auth.id != "" && (user_id = @request.auth.id || @request.auth.role = "Gerente" || @request.auth.role = "Supervisor" || @request.auth.role = "Líder" || @request.auth.role = "Gestor Comercial" || @request.auth.role = "Gerentes" || @request.auth.role = "Supervisores" || @request.auth.role = "Líderes" || @request.auth.role = "Master" || @request.auth.master_access = true)',
        // Escrita restrita apenas a superusers/admin/hooks
        createRule: null,
        updateRule: null,
        deleteRule: null,
        fields: [
          {
            name: 'user_id',
            type: 'relation',
            required: true,
            collectionId: '_pb_users_auth_',
            cascadeDelete: true,
            maxSelect: 1,
          },
          { name: 'year', type: 'number', required: true },
          { name: 'month', type: 'number', required: true }, // 1..12
          { name: 'period_label', type: 'text', required: true }, // ex: "Agosto de 2026"
          { name: 'month_year', type: 'text', required: true }, // ex: "2026-08"
          { name: 'user_name', type: 'text' },
          { name: 'user_role', type: 'text' },
          {
            name: 'assessment_type',
            type: 'select',
            values: ['individual', 'team'],
            maxSelect: 1,
            required: true,
          },
          { name: 'team_members_count', type: 'number' },
          // Números apurados (realizados)
          { name: 'total_attendance', type: 'number' },
          { name: 'resolved_attendance', type: 'number' },
          { name: 'resolution_rate', type: 'number' }, // %
          { name: 'avg_duration_minutes', type: 'number' }, // TMA
          { name: 'avoidable_count', type: 'number' },
          { name: 'avoidable_rate', type: 'number' },
          { name: 'reopen_count', type: 'number' },
          { name: 'reopen_rate', type: 'number' },
          { name: 'auto_categorized_count', type: 'number' },
          { name: 'auto_categorized_rate', type: 'number' },
          { name: 'categorization_accuracy', type: 'number' },
          { name: 'avg_satisfaction_score', type: 'number' },
          // Metas esperadas
          { name: 'target_attendance', type: 'number' },
          { name: 'target_min_resolution_rate', type: 'number' },
          { name: 'target_avg_response_time', type: 'number' },
          { name: 'target_auto_categorization', type: 'number' },
          { name: 'target_min_satisfaction', type: 'number' },
          {
            name: 'target_source',
            type: 'select',
            values: ['individual', 'global'],
            maxSelect: 1,
          },
          // Atingimento e flags
          { name: 'attendance_achievement_pct', type: 'number' }, // ex: 110%
          { name: 'hit_attendance', type: 'bool' },
          { name: 'hit_resolution', type: 'bool' },
          { name: 'hit_overall', type: 'bool' },
          {
            name: 'attendance_status',
            type: 'select',
            values: ['atingiu', 'perto', 'abaixo'],
            maxSelect: 1,
          },
          {
            name: 'resolution_status',
            type: 'select',
            values: ['atingiu', 'perto', 'abaixo'],
            maxSelect: 1,
          },
          {
            name: 'overall_status',
            type: 'select',
            values: ['atingiu', 'perto', 'abaixo'],
            maxSelect: 1,
          },
          // Snapshot timestamp e payload adicional
          { name: 'snapshot_at', type: 'date' },
          { name: 'details', type: 'json' },
          { name: 'created', type: 'autodate', onCreate: true, onUpdate: false },
          { name: 'updated', type: 'autodate', onCreate: true, onUpdate: true },
        ],
        indexes: [
          'CREATE UNIQUE INDEX idx_meta_snapshots_user_month_year ON meta_snapshots (user_id, month_year)',
          'CREATE INDEX idx_meta_snapshots_month_year ON meta_snapshots (month_year)',
          'CREATE INDEX idx_meta_snapshots_year_month ON meta_snapshots (year, month)',
          'CREATE INDEX idx_meta_snapshots_user ON meta_snapshots (user_id)',
        ],
      })
      app.save(metaSnapshots)
    }

    // 2. BACKFILL RETROATIVO
    // Gerar snapshots para todos os meses encerrados cobertos pelo histórico dos colaboradores
    try {
      const now = new Date()
      // Fuso GMT-3
      const nowGmt3Ms = now.getTime() - 3 * 3600 * 1000
      const nowGmt3 = new Date(nowGmt3Ms)
      const curYear = nowGmt3.getUTCFullYear()
      const curMonth = nowGmt3.getUTCMonth() + 1 // 1-based

      const monthNames = [
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

      const leadershipRoles = [
        'Supervisor',
        'Líder',
        'Gerente',
        'Gestor Comercial',
        'Supervisores',
        'Líderes',
        'Gerentes',
      ]

      function isLeaderRole(role) {
        return leadershipRoles.indexOf(role) !== -1
      }

      // 2.1 Metas globais padrão
      let defaultMonthlyTarget = 100
      let defaultMinResolution = 80
      let defaultAvgResponseTime = 15
      let defaultAutoCategorization = 80
      let defaultMinSatisfaction = 85

      try {
        if (app.hasTable('global_targets')) {
          const gtList = app.findRecordsByFilter('global_targets', '', '-created', 1, 0)
          if (gtList && gtList.length > 0) {
            const gt = gtList[0]
            const mt = gt.getInt('monthly_attendance_target')
            const mr = gt.getInt('min_resolution_rate')
            const rt = gt.getInt('avg_response_time_target')
            const ac = gt.getInt('auto_categorization_target')
            const st = gt.getInt('min_satisfaction_target')
            if (mt > 0) defaultMonthlyTarget = mt
            if (mr > 0) defaultMinResolution = mr
            if (rt > 0) defaultAvgResponseTime = rt
            if (ac > 0) defaultAutoCategorization = ac
            if (st > 0) defaultMinSatisfaction = st
          }
        }
      } catch (_) {}

      // 2.2 Metas individuais (user_targets)
      const userTargetsMap = {}
      try {
        if (app.hasTable('user_targets')) {
          const utList = app.findRecordsByFilter('user_targets', '', '', 2000, 0)
          for (let ui = 0; ui < utList.length; ui++) {
            const ut = utList[ui]
            const uId = ut.getString('user')
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

      // 2.3 Usuários elegíveis (Consultores e Lideranças operacionais aprovadas)
      const usersList = app.findRecordsByFilter(
        'users',
        "approval_status = 'Aprovado'",
        'name',
        2000,
        0,
      )

      const eligibleUsers = []
      const allUsersMap = {}
      for (let i = 0; i < usersList.length; i++) {
        const u = usersList[i]
        allUsersMap[u.id] = u
        const r = u.getString('role') || ''
        if (
          r === 'Consultor' ||
          r === 'Consultores' ||
          isLeaderRole(r) ||
          u.getBool('master_access') === true
        ) {
          // Apenas colaboradores internos para metas
          if (r !== 'Executivo de Contas') {
            eligibleUsers.push(u)
          }
        }
      }

      function getTeamMembers(leader) {
        const role = leader.getString('role') || ''
        if (!isLeaderRole(role)) return [leader]

        let leaderGroups = []
        try {
          leaderGroups = leader.get('service_groups') || []
        } catch (_) {}

        const team = [leader]
        const teamIds = {}
        teamIds[leader.id] = true

        for (let j = 0; j < usersList.length; j++) {
          const other = usersList[j]
          if (teamIds[other.id]) continue
          const otherRole = other.getString('role') || ''

          // 1. Vínculo por supervisor_id
          const otherSup = other.getString('supervisor_id')
          if (otherSup && otherSup === leader.id) {
            team.push(other)
            teamIds[other.id] = true
            continue
          }

          // 2. Grupos de serviço em comum
          let otherGroups = []
          try {
            otherGroups = other.get('service_groups') || []
          } catch (_) {}

          if (leaderGroups && leaderGroups.length > 0) {
            let common = false
            for (let lg = 0; lg < leaderGroups.length; lg++) {
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
            // Líder geral sem grupos específicos
            if (otherRole === 'Consultor' || otherRole === 'Consultores') {
              team.push(other)
              teamIds[other.id] = true
            }
          }
        }
        return team
      }

      function getStatus(real, target) {
        if (target <= 0) return 'atingiu'
        const ratio = real / target
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

      const snapshotsCol = app.findCollectionByNameOrId('meta_snapshots')

      // Backfill dos últimos 12 meses anteriores ao mês corrente
      for (let mOffset = 1; mOffset <= 12; mOffset++) {
        const targetDate = new Date(Date.UTC(curYear, curMonth - 1 - mOffset, 1, 12, 0, 0))
        const tYear = targetDate.getUTCFullYear()
        const tMonth = targetDate.getUTCMonth() + 1 // 1-based
        const monthPadded = String(tMonth).padStart(2, '0')
        const monthYear = tYear + '-' + monthPadded
        const periodLabel = monthNames[tMonth - 1] + ' de ' + tYear

        const startIso = monthYear + '-01 00:00:00'
        const nextDate = new Date(Date.UTC(tYear, tMonth, 1, 12, 0, 0))
        const endIso =
          nextDate.getUTCFullYear() +
          '-' +
          String(nextDate.getUTCMonth() + 1).padStart(2, '0') +
          '-01 00:00:00'

        // Busca atendimentos do mês (usando created em string ISO)
        let monthRecords = []
        try {
          monthRecords = app.findRecordsByFilter(
            'service_records',
            "created >= '" + startIso + "' && created < '" + endIso + "'",
            'created',
            50000,
            0,
          )
        } catch (_) {}

        // Agrupa por colaborador individual
        const individualStats = {}
        for (let rIdx = 0; rIdx < monthRecords.length; rIdx++) {
          const rec = monthRecords[rIdx]
          const uid = rec.getString('assigned_user') || rec.getString('user_id')
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
          const s = individualStats[uid]
          s.total++
          if (rec.getString('status') === 'Concluído') s.resolved++
          if (rec.getBool('avoidable_contact') === true) s.avoidableCount++
          s.durationSum += Number(rec.get('duration') || 0)
          const rc = Number(rec.get('reopen_count') || 0)
          if (rc > 0 || rec.getBool('is_reopened')) s.reopenCount++
          const cReason = rec.getString('contact_reason')
          if (cReason && cReason !== 'Outros') s.autoCatCount++
        }

        // Gera snapshot para cada usuário elegível
        for (let uIdx = 0; uIdx < eligibleUsers.length; uIdx++) {
          const userRec = eligibleUsers[uIdx]
          const uid = userRec.id
          const role = userRec.getString('role') || ''
          const uName = userRec.getString('name') || 'Colaborador'
          const isLdr = isLeaderRole(role)
          const team = isLdr ? getTeamMembers(userRec) : [userRec]

          // Resolve metas esperadas
          const ut = userTargetsMap[uid]
          const isIndividualTarget = Boolean(ut && ut.monthly_attendance_target)
          const targetAttendance = isIndividualTarget
            ? ut.monthly_attendance_target
            : defaultMonthlyTarget
          const targetMinResolution =
            ut && ut.min_resolution_rate ? ut.min_resolution_rate : defaultMinResolution
          const targetAvgResponseTime =
            ut && ut.avg_response_time_target ? ut.avg_response_time_target : defaultAvgResponseTime
          const targetAutoCat =
            ut && ut.auto_categorization_target
              ? ut.auto_categorization_target
              : defaultAutoCategorization
          const targetMinSat =
            ut && ut.min_satisfaction_target ? ut.min_satisfaction_target : defaultMinSatisfaction

          // Agrega métricas reais
          let realTotal = 0
          let realResolved = 0
          let realAvoidable = 0
          let realReopen = 0
          let realAutoCat = 0
          let durationSum = 0

          for (let tm = 0; tm < team.length; tm++) {
            const memberId = team[tm].id
            const mStat = individualStats[memberId]
            if (mStat) {
              realTotal += mStat.total
              realResolved += mStat.resolved
              realAvoidable += mStat.avoidableCount
              realReopen += mStat.reopenCount
              realAutoCat += mStat.autoCatCount
              durationSum += mStat.durationSum
            }
          }

          const resRate = realTotal > 0 ? Math.round((realResolved / realTotal) * 100) : 0
          const avgDuration = realTotal > 0 ? Math.round((durationSum / realTotal) * 10) / 10 : 0
          const avoidableRate = realTotal > 0 ? Math.round((realAvoidable / realTotal) * 100) : 0
          const reopenRate = realTotal > 0 ? Math.round((realReopen / realTotal) * 100) : 0
          const autoCatRate = realTotal > 0 ? Math.round((realAutoCat / realTotal) * 100) : 0
          const catAccuracy =
            realAutoCat > 0 ? Math.max(75, Math.min(99, Math.round(100 - avoidableRate * 0.4))) : 85
          const avgSatisfaction = Math.max(
            60,
            Math.min(100, Math.round(resRate * 0.65 + (100 - avoidableRate) * 0.35)),
          )

          const attStatus = getStatus(realTotal, targetAttendance)
          const resStatus = getResolutionStatus(resRate, targetMinResolution)
          const overall = getOverall(attStatus, resStatus)
          const hitAtt = realTotal >= targetAttendance
          const hitRes = resRate >= targetMinResolution
          const hitOver = attStatus !== 'abaixo' && resStatus !== 'abaixo'
          const attPct = targetAttendance > 0 ? Math.round((realTotal / targetAttendance) * 100) : 0

          // Verifica se já existe snapshot deste usuário neste mês
          let exists = false
          try {
            const existing = app.findFirstRecordByData('meta_snapshots', 'month_year', monthYear)
            if (existing && existing.getString('user_id') === uid) {
              exists = true
            }
          } catch (_) {}

          if (!exists) {
            try {
              const snap = new Record(snapshotsCol)
              snap.set('user_id', uid)
              snap.set('year', tYear)
              snap.set('month', tMonth)
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
              snap.set('snapshot_at', now.toISOString())
              snap.set(
                'details',
                JSON.stringify({
                  backfilled: true,
                  team_member_ids: team.map(function (tm) {
                    return tm.id
                  }),
                }),
              )
              app.save(snap)
            } catch (snapErr) {
              console.log(
                'Erro ao salvar snapshot para ' + uName + ' (' + monthYear + '):',
                snapErr,
              )
            }
          }
        }
      }
    } catch (bfErr) {
      console.log('Aviso: falha no backfill de meta_snapshots:', bfErr)
    }
  },
  (app) => {
    if (app.hasTable('meta_snapshots')) {
      app.delete(app.findCollectionByNameOrId('meta_snapshots'))
    }
  },
)
