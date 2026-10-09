migrate(
  (app) => {
    // Migração 0107: Correção definitiva e saneamento dos dados de demonstração
    if (!app.hasTable('control_tower_emails')) return

    function cleanString(str) {
      if (!str) return ''
      var s = String(str)
        .replace(/[\u0000-\u001F\u007F-\u009F]/g, '')
        .trim()
      s = s
        .replace(/Ã§/g, 'ç')
        .replace(/Ã£/g, 'ã')
        .replace(/Ã¡/g, 'á')
        .replace(/Ã©/g, 'é')
        .replace(/Ã­/g, 'í')
        .replace(/Ã³/g, 'ó')
        .replace(/Ãº/g, 'ú')
        .replace(/Ãª/g, 'ê')
        .replace(/Ã´/g, 'ô')
        .replace(/Ã€/g, 'À')
        .replace(/Ã‰/g, 'É')
        .replace(/Ã‡/g, 'Ç')
        .replace(/Ãƒ/g, 'Ã')
      return s
    }

    try {
      // 1. Corrigir explicitamente os registros demo raiz
      var r1 = null
      try {
        r1 = app.findFirstRecordByData('control_tower_emails', 'id', 'dvvwx5mcqeq4io2')
      } catch (_) {}
      if (r1) {
        r1.set('detected_dates', ['10/10'])
        r1.set('detected_signals', [
          'Embarque <24h',
          'Cancelamento/Remarcação',
          'Cliente VIP',
          'Cliente insistente (3 msgs)',
        ])
        app.save(r1)
      }

      var r2 = null
      try {
        r2 = app.findFirstRecordByData('control_tower_emails', 'id', 'w26y4rfik1ancrm')
      } catch (_) {}
      if (r2) {
        r2.set('detected_dates', ['11/10'])
        r2.set('detected_signals', [
          'Embarque <48h',
          'Cancelamento/Remarcação',
          'Cliente insistente (2 msgs)',
        ])
        app.save(r2)
      }

      // 2. Sanear todos os registros caso contenham mojibake ou datas com bytes numéricos
      const records = app.findRecordsByFilter('control_tower_emails', '', '-created', 500, 0)
      for (let i = 0; i < records.length; i++) {
        const r = records[i]
        const rawSignals = r.get('detected_signals')
        if (Array.isArray(rawSignals)) {
          var cleanSigs = []
          for (let s = 0; s < rawSignals.length; s++) {
            var cs = cleanString(rawSignals[s])
            if (cs && cleanSigs.indexOf(cs) === -1) {
              cleanSigs.push(cs)
            }
          }
          r.set('detected_signals', cleanSigs)
        }

        const rawDates = r.get('detected_dates')
        if (Array.isArray(rawDates)) {
          var cleanDates = []
          for (let d = 0; d < rawDates.length; d++) {
            var cd = cleanString(rawDates[d])
            // Descarta se for apenas código numérico de byte ex: "91", "34"
            if (cd && !/^\d{1,3}$/.test(cd) && cleanDates.indexOf(cd) === -1) {
              cleanDates.push(cd)
            }
          }
          r.set('detected_dates', cleanDates)
        }

        app.save(r)
      }
    } catch (err) {
      console.log('Erro na migração 0107:', err)
    }
  },
  (app) => {
    // rollback
  },
)
