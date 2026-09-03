migrate(
  (app) => {
    // Registros com duration > 480 foram salvos em segundos.
    // Converte para minutos dividindo por 60 e arredondando para 1 casa decimal.
    try {
      const records = app.findRecordsByFilter('service_records', 'duration > 480', 'created', 0, 0)

      for (let i = 0; i < records.length; i++) {
        const rec = records[i]
        const dur = rec.getFloat('duration')
        if (dur > 480) {
          const minutes = Math.round((dur / 60) * 10) / 10
          rec.set('duration', minutes)
          app.save(rec)
        }
      }
    } catch (err) {
      console.log('Erro na normalização de duration de service_records:', err)
    }
  },
  () => {
    // Idempotente / irreversível
  },
)
