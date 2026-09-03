migrate(
  (app) => {
    // Backfill de TFR para registros que ainda estão com TFR 0 ou nulo
    // Usa o primeiro registro de interação em service_record_history como proxy
    try {
      const records = app.findRecordsByFilter(
        'service_records',
        'first_response_time = 0 || first_response_time = null',
        'created',
        0,
        0,
      )

      for (let i = 0; i < records.length; i++) {
        const rec = records[i]
        const recId = rec.id
        const createdStr = rec.getString('created')
        if (!createdStr) continue

        const createdDate = new Date(createdStr).getTime()
        if (isNaN(createdDate)) continue

        // Buscar primeiro histórico de interação
        const histories = app.findRecordsByFilter(
          'service_record_history',
          "service_record = '" + recId + "'",
          'created',
          1,
          0,
        )

        if (histories && histories.length > 0) {
          const firstHistoryCreated = histories[0].getString('created')
          if (firstHistoryCreated) {
            const histDate = new Date(firstHistoryCreated).getTime()
            if (!isNaN(histDate) && histDate >= createdDate) {
              const diffMs = histDate - createdDate
              let tfrMinutes = Math.round((diffMs / 60000) * 10) / 10
              if (tfrMinutes < 0.1) tfrMinutes = 0.1
              rec.set('first_response_time', tfrMinutes)
              if (!rec.getString('first_response_at')) {
                rec.set('first_response_at', firstHistoryCreated)
              }
              app.save(rec)
            }
          }
        }
      }
    } catch (err) {
      console.log('Erro no backfill de TFR:', err)
    }
  },
  () => {
    // Idempotente / reversão segura
  },
)
