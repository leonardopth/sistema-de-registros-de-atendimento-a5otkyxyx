migrate(
  (app) => {
    // FRENTE D1: Consolidar email_logs -> email_analysis_logs e call_records -> call_analysis_logs

    // 1. Mapear e migrar registros existentes de email_logs para email_analysis_logs (se houver)
    if (app.hasTable('email_logs') && app.hasTable('email_analysis_logs')) {
      const ealCol = app.findCollectionByNameOrId('email_analysis_logs')
      try {
        const oldLogs = app.findRecordsByFilter('email_logs', '', 'created', 10000, 0)
        for (let i = 0; i < oldLogs.length; i++) {
          const old = oldLogs[i]
          // Verifica se já não existe registro equivalente (por sender_email, subject e created)
          let exists = false
          try {
            const check = app.findRecordsByFilter(
              'email_analysis_logs',
              "sender_email = '" +
                old.getString('sender_email') +
                "' && subject = '" +
                old.getString('subject').replace(/'/g, "\\'") +
                "'",
              '',
              1,
              0,
            )
            if (check && check.length > 0) exists = true
          } catch (_) {}

          if (!exists) {
            const rec = new Record(ealCol)
            rec.set('sender_email', old.getString('sender_email'))
            rec.set('sender_name', old.getString('sender_name'))
            rec.set('recipient_email', old.getString('recipient_email'))
            rec.set('subject', old.getString('subject'))
            rec.set('body_snippet', old.getString('body_snippet'))
            rec.set('is_reply', old.getBool('is_reply'))
            rec.set('category', old.getString('category'))
            rec.set('sentiment', old.getString('sentiment'))
            rec.set('main_topic', old.getString('main_topic'))
            rec.set('confidence_score', old.getInt('confidence_score'))
            if (old.getString('client')) rec.set('client', old.getString('client'))
            if (old.getString('service_record'))
              rec.set('service_record', old.getString('service_record'))
            if (old.getString('processed_by'))
              rec.set('processed_by', old.getString('processed_by'))
            if (old.getString('received_at')) rec.set('received_at', old.getString('received_at'))
            app.save(rec)
          }
        }
      } catch (err) {
        console.log('Aviso ao migrar email_logs para email_analysis_logs: ' + err)
      }

      // Remover a coleção legada email_logs se estiver vazia ou após migração
      try {
        const colEmailLogs = app.findCollectionByNameOrId('email_logs')
        app.delete(colEmailLogs)
      } catch (delErr) {
        console.log('Aviso ao remover colecao legada email_logs: ' + delErr)
      }
    }

    // 2. Mapear e migrar registros existentes de call_records para call_analysis_logs (se houver)
    if (app.hasTable('call_records') && app.hasTable('call_analysis_logs')) {
      const calCol = app.findCollectionByNameOrId('call_analysis_logs')
      try {
        const oldCalls = app.findRecordsByFilter('call_records', '', 'created', 10000, 0)
        for (let j = 0; j < oldCalls.length; j++) {
          const oldC = oldCalls[j]
          const sid = oldC.getString('call_sid')
          let exists = false
          if (sid) {
            try {
              const check = app.findRecordsByFilter(
                'call_analysis_logs',
                "call_sid = '" + sid + "'",
                '',
                1,
                0,
              )
              if (check && check.length > 0) exists = true
            } catch (_) {}
          }

          if (!exists) {
            const cRec = new Record(calCol)
            cRec.set('call_sid', sid || 'CA' + $security.randomString(32))
            cRec.set('provider', 'twilio')
            cRec.set('from_number', oldC.getString('from_number'))
            cRec.set('to_number', oldC.getString('to_number'))
            cRec.set('recording_url', oldC.getString('recording_url'))
            cRec.set('duration', oldC.getInt('duration'))
            cRec.set('transcription', oldC.getString('transcription'))
            cRec.set('summary', oldC.getString('summary'))
            cRec.set('category', oldC.getString('category'))
            cRec.set('sentiment', oldC.getString('sentiment'))
            cRec.set('keywords', oldC.get('keywords'))
            cRec.set('quality_score', oldC.getInt('quality_score'))
            if (oldC.getString('service_record'))
              cRec.set('service_record', oldC.getString('service_record'))
            if (oldC.getString('client')) cRec.set('client', oldC.getString('client'))
            // Mapeia agent_user -> processed_by
            if (oldC.getString('agent_user')) cRec.set('processed_by', oldC.getString('agent_user'))
            app.save(cRec)
          }
        }
      } catch (err2) {
        console.log('Aviso ao migrar call_records para call_analysis_logs: ' + err2)
      }

      // Remover a coleção legada call_records se estiver vazia ou após migração
      try {
        const colCallRecords = app.findCollectionByNameOrId('call_records')
        app.delete(colCallRecords)
      } catch (delErr2) {
        console.log('Aviso ao remover colecao legada call_records: ' + delErr2)
      }
    }
  },
  (app) => {
    // Reversão não recria automaticamente coleções legadas deletadas para evitar duplicidade
  },
)
