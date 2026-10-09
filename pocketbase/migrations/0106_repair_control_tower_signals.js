migrate(
  (app) => {
    // Migração de reparo e saneamento de dados da coleção control_tower_emails
    if (!app.hasTable('control_tower_emails')) return

    function cleanString(str) {
      if (!str) return ''
      var s = String(str)
        .replace(/[\u0000-\u001F\u007F-\u009F]/g, '')
        .trim()
      // Corrigir mojibake comum de UTF-8 em Latin1 no PocketBase/Goja:
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
        .replace(/Ã/g, 'Í')
        .replace(/Ã“/g, 'Ó')
        .replace(/Ãš/g, 'Ú')
        .replace(/Ã‡/g, 'Ç')
        .replace(/Ãƒ/g, 'Ã')
      return s
    }

    function decodeUtf8Bytes(bytes) {
      var str = ''
      var i = 0
      while (i < bytes.length) {
        var c = bytes[i++]
        if (c === 0) continue
        if (c < 128) {
          str += String.fromCharCode(c)
        } else if (c > 191 && c < 224) {
          var c2 = bytes[i++]
          str += String.fromCharCode(((c & 31) << 6) | (c2 & 63))
        } else if (c > 223 && c < 240) {
          var c2 = bytes[i++]
          var c3 = bytes[i++]
          str += String.fromCharCode(((c & 15) << 12) | ((c2 & 63) << 6) | (c3 & 63))
        } else {
          str += String.fromCharCode(c)
        }
      }
      return str
    }

    function tryParseSignals(raw) {
      if (raw === null || raw === undefined) return []

      if (Array.isArray(raw)) {
        if (raw.length === 0) return []
        if (typeof raw[0] === 'number') {
          var nonZero = []
          for (var n = 0; n < raw.length; n++) {
            if (raw[n] !== 0) nonZero.push(raw[n])
          }
          try {
            var decoded = decodeUtf8Bytes(nonZero)
            if (decoded) return tryParseSignals(decoded)
          } catch (_) {}
        }

        var resultArr = []
        for (var i = 0; i < raw.length; i++) {
          var item = raw[i]
          if (typeof item === 'string') {
            var c = cleanString(item)
            if (c) {
              if (c.indexOf('[') === 0 && c.lastIndexOf(']') === c.length - 1) {
                try {
                  var inner = JSON.parse(c)
                  var sub = tryParseSignals(inner)
                  for (var s = 0; s < sub.length; s++) {
                    if (resultArr.indexOf(sub[s]) === -1) resultArr.push(sub[s])
                  }
                  continue
                } catch (_) {}
              }
              if (resultArr.indexOf(c) === -1) resultArr.push(c)
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
              var cLbl = cleanString(lbl)
              if (cLbl && resultArr.indexOf(cLbl) === -1) resultArr.push(cLbl)
            }
          }
        }
        return resultArr
      }

      if (typeof raw === 'string') {
        var cleaned = cleanString(raw)
        if (!cleaned) return []

        if (cleaned.indexOf('[') === 0 || cleaned.indexOf('{') === 0) {
          try {
            var parsed = JSON.parse(cleaned)
            return tryParseSignals(parsed)
          } catch (_) {
            if (cleaned.indexOf('[') === 0 && cleaned.lastIndexOf(']') === cleaned.length - 1) {
              var innerStr = cleaned.slice(1, -1)
              var parts = innerStr.split(',')
              var fallbackArr = []
              for (var p = 0; p < parts.length; p++) {
                var pClean = cleanString(parts[p].replace(/^["']|["']$/g, ''))
                if (pClean && fallbackArr.indexOf(pClean) === -1) {
                  fallbackArr.push(pClean)
                }
              }
              if (fallbackArr.length > 0) return fallbackArr
            }
          }
        }
        return [cleaned]
      }

      return []
    }

    try {
      // Reparos específicos nos dados de demonstração da migração 0101
      var r1 = null
      try {
        r1 = app.findFirstRecordByData('control_tower_emails', 'id', 'dvvwx5mcqeq4io2')
      } catch (_) {}
      if (r1) {
        r1.set('detected_dates', ['10/10'])
        r1.set('detected_signals', ['Embarque <24h', 'Cancelamento/Remarcação', 'Cliente VIP'])
        app.save(r1)
      }

      var r2 = null
      try {
        r2 = app.findFirstRecordByData('control_tower_emails', 'id', 'w26y4rfik1ancrm')
      } catch (_) {}
      if (r2) {
        r2.set('detected_dates', ['11/10'])
        r2.set('detected_signals', ['Embarque <48h', 'Cancelamento/Remarcação'])
        app.save(r2)
      }

      // Varredura geral de todos os registros para saneamento defensivo
      const records = app.findRecordsByFilter('control_tower_emails', '', '-created', 500, 0)
      for (let i = 0; i < records.length; i++) {
        const r = records[i]
        const rawSignals = r.get('detected_signals')
        const parsedSignals = tryParseSignals(rawSignals)

        const rawDates = r.get('detected_dates')
        let parsedDates = []
        if (Array.isArray(rawDates)) {
          // Se foi corrompido como array de bytes
          if (rawDates.length > 0 && typeof rawDates[0] === 'number') {
            try {
              var dDec = decodeUtf8Bytes(rawDates)
              var dParsed = JSON.parse(dDec)
              if (Array.isArray(dParsed)) parsedDates = dParsed.map(cleanString).filter(Boolean)
            } catch (_) {}
          } else {
            for (let d = 0; d < rawDates.length; d++) {
              const cd = cleanString(rawDates[d])
              // Ignorar números isolados de bytes que foram inseridos como string
              if (cd && !/^\d{1,3}$/.test(cd) && parsedDates.indexOf(cd) === -1) {
                parsedDates.push(cd)
              }
            }
          }
        }

        r.set('detected_signals', parsedSignals)
        if (Array.isArray(rawDates) && parsedDates.length > 0) {
          r.set('detected_dates', parsedDates)
        }

        app.save(r)
      }
    } catch (err) {
      console.log('Erro ao reparar dados da Torre de Controle:', err)
    }
  },
  (app) => {
    // Rollback não aplicável
  },
)
