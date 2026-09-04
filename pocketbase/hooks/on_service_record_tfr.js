// Hook server-side no update de service_records:
// 1. Se first_response_time ainda é 0/vazio e o status passa para "Em Andamento" ou "Concluído",
//    grava o TFR em minutos = (agora - created), mínimo 0.1.
// 2. Alerta de Ação: TFR estourado (> 15 min padrão configurável em global_targets/user_targets)
//    Notifica o consultor responsável e o supervisor (sino da coleção notifications).
//    Dedup por atendimento: grava flag tfr_alert_sent = true para não duplicar.

onRecordUpdateRequest((e) => {
  try {
    var record = e.record
    var currentTfr = record.getFloat('first_response_time')
    var tfrCalculatedNow = false
    var computedTfrMinutes = currentTfr

    // 1. Só calcula TFR se for 0 ou nulo/vazio
    if (!currentTfr || currentTfr <= 0) {
      var newStatus = record.getString('status')
      if (newStatus === 'Em Andamento' || newStatus === 'Concluído') {
        var createdStr = record.getString('created')
        // Se ainda não tiver created (caso raro em update), busca o original
        if (!createdStr && record.original()) {
          createdStr = record.original().getString('created')
        }

        if (createdStr) {
          var createdDate = new Date(createdStr).getTime()
          var now = new Date()
          var diffMs = Math.max(0, now.getTime() - createdDate)
          var tfrMinutes = Math.round((diffMs / 60000) * 10) / 10
          if (tfrMinutes < 0.1) {
            tfrMinutes = 0.1
          }

          record.set('first_response_time', tfrMinutes)
          if (!record.getString('first_response_at')) {
            record.set('first_response_at', now.toISOString())
          }
          computedTfrMinutes = tfrMinutes
          tfrCalculatedNow = true
        }
      }
    }

    // 2. Alerta de TFR estourado
    var alreadySent = record.getBool('tfr_alert_sent')
    if (!alreadySent && computedTfrMinutes && computedTfrMinutes > 0) {
      var assignedUserId = record.getString('assigned_user') || record.getString('user_id')

      // Determinar limite de TFR: individual do consultor (user_targets) ou global (global_targets) ou 15 min padrão
      var tfrLimit = 15
      try {
        if (assignedUserId) {
          var utList = $app.findRecordsByFilter(
            'user_targets',
            "user = '" + assignedUserId + "'",
            '-created',
            1,
            0,
          )
          if (utList.length > 0 && utList[0].getInt('tfr_target') > 0) {
            tfrLimit = utList[0].getInt('tfr_target')
          }
        }
      } catch (_) {}

      if (tfrLimit === 15) {
        try {
          var gtList = $app.findRecordsByFilter('global_targets', '', '-created', 1, 0)
          if (gtList.length > 0 && gtList[0].getInt('tfr_target') > 0) {
            tfrLimit = gtList[0].getInt('tfr_target')
          }
        } catch (_) {}
      }

      // Se o TFR registrado ultrapassar o limite configurável
      if (computedTfrMinutes > tfrLimit) {
        record.set('tfr_alert_sent', true)

        try {
          var notifCol = $app.findCollectionByNameOrId('notifications')
          var clientName =
            record.getString('client_company') || record.getString('client_name') || 'Cliente'
          var notifTitle = '⚠️ TFR Estourado: ' + clientName
          var notifMsg =
            'Tempo de Primeira Resposta foi de ' +
            computedTfrMinutes +
            ' min, ultrapassando a meta de ' +
            tfrLimit +
            ' min.'
          var notifLink = '/atendimentos?id=' + record.id

          var recipientsToNotify = {}
          if (assignedUserId) {
            recipientsToNotify[assignedUserId] = true
          }

          // Localizar supervisores/líderes responsáveis
          // 1. Buscar supervisor_id do consultor ou supervisores do mesmo grupo de atendimento
          var assignedUserRec = null
          if (assignedUserId) {
            try {
              assignedUserRec = $app.findRecordById('users', assignedUserId)
            } catch (_) {}
          }

          var supervisorIds = []
          if (assignedUserRec) {
            var directSup = assignedUserRec.getString('supervisor_id')
            if (directSup) {
              supervisorIds.push(directSup)
            }

            var userGroups = assignedUserRec.get('service_groups') || []
            var leaders = $app.findRecordsByFilter(
              'users',
              "(role = 'Supervisor' || role = 'Líder' || role = 'Supervisores' || role = 'Líderes') && approval_status = 'Aprovado'",
              '',
              0,
              0,
            )

            for (var lIdx = 0; lIdx < leaders.length; lIdx++) {
              var ldr = leaders[lIdx]
              if (ldr.id === assignedUserId) continue
              var ldrGroups = ldr.get('service_groups') || []
              if (!ldrGroups || ldrGroups.length === 0) {
                supervisorIds.push(ldr.id)
                continue
              }
              var commonGroup = false
              for (var g1 = 0; g1 < userGroups.length; g1++) {
                for (var g2 = 0; g2 < ldrGroups.length; g2++) {
                  if (userGroups[g1] === ldrGroups[g2]) {
                    commonGroup = true
                    break
                  }
                }
                if (commonGroup) break
              }
              if (commonGroup) {
                supervisorIds.push(ldr.id)
              }
            }
          }

          for (var sIdx = 0; sIdx < supervisorIds.length; sIdx++) {
            recipientsToNotify[supervisorIds[sIdx]] = true
          }

          // Criar notificação no sino para cada destinatário (dedup por notifLink + user_id)
          for (var rId in recipientsToNotify) {
            if (!recipientsToNotify.hasOwnProperty(rId)) continue
            try {
              var existingNotifs = $app.findRecordsByFilter(
                'notifications',
                "user_id = '" + rId + "' && link = '" + notifLink + "' && title ~ 'TFR'",
                '-created',
                1,
                0,
              )
              if (existingNotifs.length > 0) continue

              var notif = new Record(notifCol)
              notif.set('user_id', rId)
              notif.set('title', notifTitle)
              notif.set('message', notifMsg)
              notif.set('type', 'warning')
              notif.set('read', false)
              notif.set('link', notifLink)
              $app.save(notif)
            } catch (nErr) {
              $app
                .logger()
                .error('Erro ao salvar notificação de TFR estourado:', 'error', String(nErr))
            }
          }
        } catch (alertErr) {
          $app.logger().error('Erro ao gerar alerta de TFR estourado:', 'error', String(alertErr))
        }
      }
    }
  } catch (err) {
    $app.logger().error('Erro no hook on_service_record_tfr:', 'error', String(err))
  }

  return e.next()
}, 'service_records')
