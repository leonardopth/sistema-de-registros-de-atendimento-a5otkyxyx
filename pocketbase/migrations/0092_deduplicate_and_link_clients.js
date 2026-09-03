migrate(
  (app) => {
    // Normalizador de texto: minúsculo, sem acentos, sem espaços extras
    function normalize(str) {
      if (!str) return ''
      return str
        .toLowerCase()
        .normalize('NFD')
        .replace(/[\u0300-\u036f]/g, '')
        .trim()
    }

    // 1. Deduplicar clientes existentes caso haja grafias idênticas ignorando caixa e acentos
    const allClients = app.findRecordsByFilter('clients', "id != ''", 'created', 0, 0)
    const clientGroups = {}

    for (let i = 0; i < allClients.length; i++) {
      const c = allClients[i]
      const comp = c.getString('company') || c.getString('name') || ''
      const key = normalize(comp)
      if (!key) continue
      if (!clientGroups[key]) {
        clientGroups[key] = []
      }
      clientGroups[key].push(c)
    }

    let deduplicatedClientsCount = 0
    let redirectedRecordsCount = 0

    // Para cada grupo com mais de 1 cliente, calcular o uso em service_records e eleger o canônico
    for (const key in clientGroups) {
      const group = clientGroups[key]
      if (group.length > 1) {
        // Encontra o registro de maior uso ou mais antigo
        let bestClient = group[0]
        let maxUsage = -1

        for (let j = 0; j < group.length; j++) {
          const c = group[j]
          try {
            const count = app.countRecords('service_records', "client = '" + c.id + "'")
            if (count > maxUsage) {
              maxUsage = count
              bestClient = c
            }
          } catch (_) {}
        }

        // Para os outros clientes do grupo, redirecionar service_records e agents para bestClient
        for (let k = 0; k < group.length; k++) {
          const duplicate = group[k]
          if (duplicate.id === bestClient.id) continue

          // Redirecionar service_records
          try {
            const affectedSr = app.findRecordsByFilter(
              'service_records',
              "client = '" + duplicate.id + "'",
              '',
              0,
              0,
            )
            for (let s = 0; s < affectedSr.length; s++) {
              affectedSr[s].set('client', bestClient.id)
              if (bestClient.getString('company')) {
                affectedSr[s].set('client_company', bestClient.getString('company'))
              }
              app.save(affectedSr[s])
              redirectedRecordsCount++
            }
          } catch (e) {
            console.log('Erro ao redirecionar service_records:', e)
          }

          // Redirecionar agents do cliente duplicado
          try {
            const affectedAgents = app.findRecordsByFilter(
              'agents',
              "client_id = '" + duplicate.id + "'",
              '',
              0,
              0,
            )
            for (let a = 0; a < affectedAgents.length; a++) {
              affectedAgents[a].set('client_id', bestClient.id)
              app.save(affectedAgents[a])
            }
          } catch (_) {}

          // Remove o cliente duplicado
          try {
            app.delete(duplicate)
            deduplicatedClientsCount++
          } catch (delErr) {
            console.log('Erro ao deletar cliente duplicado:', delErr)
          }
        }
      }
    }

    // 2. Apontar service_records sem relação 'client' que possuem client_company ou client_name
    // correspondente a algum cliente cadastrado
    const remainingClients = app.findRecordsByFilter('clients', "id != ''", '', 0, 0)
    const clientLookup = {}
    for (let c = 0; c < remainingClients.length; c++) {
      const rec = remainingClients[c]
      const comp = normalize(rec.getString('company'))
      const nm = normalize(rec.getString('name'))
      if (comp) clientLookup[comp] = rec
      if (nm && !clientLookup[nm]) clientLookup[nm] = rec
    }

    const unlinkedRecords = app.findRecordsByFilter(
      'service_records',
      "client = '' || client = null",
      '',
      0,
      0,
    )

    for (let u = 0; u < unlinkedRecords.length; u++) {
      const sr = unlinkedRecords[u]
      const srComp = normalize(sr.getString('client_company'))
      const srName = normalize(sr.getString('client_name'))

      const matchedClient = (srComp && clientLookup[srComp]) || (srName && clientLookup[srName])
      if (matchedClient) {
        sr.set('client', matchedClient.id)
        if (!sr.getString('client_company') && matchedClient.getString('company')) {
          sr.set('client_company', matchedClient.getString('company'))
        }
        app.save(sr)
        redirectedRecordsCount++
      }
    }

    console.log(
      'Migracao 0092 concluida: ' +
        deduplicatedClientsCount +
        ' clientes deduplicados, ' +
        redirectedRecordsCount +
        ' atendimentos redirecionados.',
    )
  },
  () => {
    // Reversão não aplicável a migração de saneamento de dados irreversível
  },
)
