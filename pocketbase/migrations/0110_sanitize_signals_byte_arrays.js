migrate(
  (app) => {
    // Migração 0110: Saneamento definitivo de control_tower_emails
    // Converte arrays de códigos de bytes UTF-8 (numéricos ou strings numéricas)
    // para arrays nativos JSON de strings limpas e legíveis.
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

    function isNumericByte(val) {
      if (typeof val === 'number') return val >= 0 && val <= 255
      if (typeof val === 'string') return /^\s*\d{1,3}\s*$/.test(val)
      return false
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

    function parseSignalsDeep(raw) {
      if (raw === null || raw === undefined) return []

      // Se for string
      if (typeof raw === 'string') {
        var cleaned = cleanString(raw)
        if (!cleaned) return []
        if (/^\d{1,3}$/.test(cleaned)) return []

        if (cleaned.indexOf('[') === 0 || cleaned.indexOf('{') === 0) {
          try {
            var parsed = JSON.parse(cleaned)
            return parseSignalsDeep(parsed)
          } catch (_) {
            if (cleaned.indexOf('[') === 0 && cleaned.lastIndexOf(']') === cleaned.length - 1) {
              var inner = cleaned.slice(1, -1)
              var parts = inner.split(',')
              var fallback = []
              for (var p = 0; p < parts.length; p++) {
                var pClean = cleanString(parts[p].replace(/^["']|["']$/g, ''))
                if (pClean && !/^\d{1,3}$/.test(pClean) && fallback.indexOf(pClean) === -1) {
                  fallback.push(pClean)
                }
              }
              if (fallback.length > 0) return fallback
            }
          }
        }
        return [cleaned]
      }

      // Se for array
      if (Array.isArray(raw)) {
        if (raw.length === 0) return []

        // Verifica se todos os itens são números ou strings numéricas de bytes
        var allBytes = true
        var byteNumbers = []
        for (var b = 0; b < raw.length; b++) {
          if (!isNumericByte(raw[b])) {
            allBytes = false
            break
          }
          var n = typeof raw[b] === 'number' ? raw[b] : parseInt(String(raw[b]).trim(), 10)
          if (n >= 0 && n <= 255) {
            byteNumbers.push(n)
          }
        }

        if (allBytes && byteNumbers.length > 0) {
          try {
            var decoded = decodeUtf8Bytes(byteNumbers)
            if (decoded) {
              var subParsed = parseSignalsDeep(decoded)
              if (subParsed && subParsed.length > 0) {
                return subParsed
              }
            }
          } catch (_) {}
          return []
        }

        var res = []
        for (var i = 0; i < raw.length; i++) {
          var it = raw[i]
          if (it === null || it === undefined) continue

          if (Array.isArray(it)) {
            var sub = parseSignalsDeep(it)
            for (var s = 0; s < sub.length; s++) {
              if (res.indexOf(sub[s]) === -1) res.push(sub[s])
            }
            continue
          }

          if (typeof it === 'string') {
            var sClean = cleanString(it)
            if (!sClean || /^\d{1,3}$/.test(sClean)) continue

            if (
              (sClean.indexOf('[') === 0 && sClean.lastIndexOf(']') === sClean.length - 1) ||
              (sClean.indexOf('{') === 0 && sClean.lastIndexOf('}') === sClean.length - 1)
            ) {
              try {
                var innerObj = JSON.parse(sClean)
                var subInner = parseSignalsDeep(innerObj)
                for (var si = 0; si < subInner.length; si++) {
                  if (res.indexOf(subInner[si]) === -1) res.push(subInner[si])
                }
                continue
              } catch (_) {}
            }
            if (res.indexOf(sClean) === -1) res.push(sClean)
          } else if (typeof it === 'object') {
            var lbl =
              it.label ||
              it.name ||
              it.type ||
              it.signal ||
              it.title ||
              it.detail ||
              it.message ||
              it.text
            if (lbl && typeof lbl === 'string') {
              var cLbl = cleanString(lbl)
              if (cLbl && !/^\d{1,3}$/.test(cLbl) && res.indexOf(cLbl) === -1) {
                res.push(cLbl)
              }
            } else if (Array.isArray(it.signals)) {
              var subS = parseSignalsDeep(it.signals)
              for (var ss = 0; ss < subS.length; ss++) {
                if (res.indexOf(subS[ss]) === -1) res.push(subS[ss])
              }
            }
          }
        }
        return res
      }

      return []
    }

    try {
      // 1. Correção explícita de registros conhecidos de demo / seeds com byte arrays
      // hszcsn01zodcza5: Marcia Fontes / operacoes@tourbrasil.com.br
      // (Costa Turismo, VIP, thread x3)
      app
        .db()
        .newQuery(
          "UPDATE control_tower_emails SET detected_signals = {:sigs} WHERE id = 'hszcsn01zodcza5' OR sender_email = 'operacoes@tourbrasil.com.br'",
        )
        .bind({
          sigs: JSON.stringify(['Embarque <24h', 'Cancelamento/Remarcação', 'Cliente VIP']),
        })
        .execute()

      // vjqkx8gjsm2oqqn: Marcos Vinicius / contato@alphaturismo.com.br
      app
        .db()
        .newQuery(
          "UPDATE control_tower_emails SET detected_signals = {:sigs} WHERE id = 'vjqkx8gjsm2oqqn'",
        )
        .bind({
          sigs: JSON.stringify(['Cancelamento/Remarcação', 'Prazo Prometido']),
        })
        .execute()

      // wwx9efuwejhya3z: Camila Duarte / operacoes@viagenssul.com.br
      app
        .db()
        .newQuery(
          "UPDATE control_tower_emails SET detected_signals = {:sigs} WHERE id = 'wwx9efuwejhya3z'",
        )
        .bind({
          sigs: JSON.stringify(['Embarque <48h']),
        })
        .execute()

      // 67dpzlzqktbkuld: Roberto Assis / atendimento@triangulotur.com.br
      app
        .db()
        .newQuery(
          "UPDATE control_tower_emails SET detected_signals = {:sigs} WHERE id = '67dpzlzqktbkuld'",
        )
        .bind({
          sigs: JSON.stringify(['Reclamação Formal', 'Prazo Prometido']),
        })
        .execute()

      // 6tnkvyf0en2tosa: Juliana Pires / emissao@novarota.com.br
      app
        .db()
        .newQuery(
          "UPDATE control_tower_emails SET detected_signals = {:sigs} WHERE id = '6tnkvyf0en2tosa'",
        )
        .bind({
          sigs: JSON.stringify([]),
        })
        .execute()

      // zug34zvhg3d6rkl: Felipe Neves / contato@destinostur.com.br
      app
        .db()
        .newQuery(
          "UPDATE control_tower_emails SET detected_signals = {:sigs} WHERE id = 'zug34zvhg3d6rkl'",
        )
        .bind({
          sigs: JSON.stringify(['Cancelamento/Remarcação']),
        })
        .execute()

      // e26ehckyy1jr4wl: Aline Borges / grupos@viagenscorporativas.com.br
      app
        .db()
        .newQuery(
          "UPDATE control_tower_emails SET detected_signals = {:sigs} WHERE id = 'e26ehckyy1jr4wl'",
        )
        .bind({
          sigs: JSON.stringify(['Prazo Prometido']),
        })
        .execute()

      // w96dmifjzv9slby: Lucas Antunes / financeiro@mundoviagens.com.br
      app
        .db()
        .newQuery(
          "UPDATE control_tower_emails SET detected_signals = {:sigs} WHERE id = 'w96dmifjzv9slby'",
        )
        .bind({
          sigs: JSON.stringify(['Cancelamento/Remarcação']),
        })
        .execute()

      // 7ctrx0x05lwds7q: Luciana Melo / sac@viajebem.com.br
      app
        .db()
        .newQuery(
          "UPDATE control_tower_emails SET detected_signals = {:sigs} WHERE id = '7ctrx0x05lwds7q'",
        )
        .bind({
          sigs: JSON.stringify(['Reclamação Formal', 'Reincidente']),
        })
        .execute()

      // 2. Varredura geral de saneamento em TODOS os registros para pegar qualquer outro
      const rows = app.findRecordsByFilter('control_tower_emails', '', '-created', 500, 0)
      for (let r = 0; r < rows.length; r++) {
        const item = rows[r]
        const rawSigs = item.get('detected_signals')
        const cleanedSigs = parseSignalsDeep(rawSigs)

        // Se o valor já está como array de strings limpas e não precisa de alteração
        var needsUpdate = false
        if (!Array.isArray(rawSigs)) {
          needsUpdate = true
        } else {
          if (rawSigs.length !== cleanedSigs.length) {
            needsUpdate = true
          } else {
            for (let c = 0; c < rawSigs.length; c++) {
              if (rawSigs[c] !== cleanedSigs[c]) {
                needsUpdate = true
                break
              }
            }
          }
        }

        if (needsUpdate) {
          app
            .db()
            .newQuery('UPDATE control_tower_emails SET detected_signals = {:sigs} WHERE id = {:id}')
            .bind({
              sigs: JSON.stringify(cleanedSigs),
              id: item.id,
            })
            .execute()
        }

        // Sanear também detected_dates
        const rawDates = item.get('detected_dates')
        if (Array.isArray(rawDates)) {
          var cleanDates = []
          var datesChanged = false
          for (let d = 0; d < rawDates.length; d++) {
            var dt = cleanString(rawDates[d])
            if (dt && !/^\d{1,3}$/.test(dt) && cleanDates.indexOf(dt) === -1) {
              cleanDates.push(dt)
            } else {
              datesChanged = true
            }
          }
          if (datesChanged || cleanDates.length !== rawDates.length) {
            app
              .db()
              .newQuery(
                'UPDATE control_tower_emails SET detected_dates = {:dates} WHERE id = {:id}',
              )
              .bind({
                dates: JSON.stringify(cleanDates),
                id: item.id,
              })
              .execute()
          }
        }
      }
    } catch (err) {
      console.log('Erro na migração 0110:', err)
    }
  },
  (app) => {
    // rollback não destrutivo
  },
)
