migrate(
  (app) => {
    // 1. Adicionar campo flight_data na coleção control_tower_emails
    try {
      const cteCol = app.findCollectionByNameOrId('control_tower_emails')
      if (!cteCol.fields.getByName('flight_data')) {
        cteCol.fields.add(
          new JSONField({
            name: 'flight_data',
          }),
        )
        app.save(cteCol)
      }
    } catch (e) {
      console.log('[Migration 0118] Erro ao adicionar flight_data em control_tower_emails: ' + e)
    }

    // 2. Adicionar campo flight_data na coleção service_records
    try {
      const srCol = app.findCollectionByNameOrId('service_records')
      if (!srCol.fields.getByName('flight_data')) {
        srCol.fields.add(
          new JSONField({
            name: 'flight_data',
          }),
        )
        app.save(srCol)
      }
    } catch (e) {
      console.log('[Migration 0118] Erro ao adicionar flight_data em service_records: ' + e)
    }

    // 3. Backfill inteligente para registros existentes de control_tower_emails e service_records
    try {
      const knownFlightPresets = {
        KLM921: {
          pnr: 'KLM921',
          airline: 'KLM Royal Dutch Airlines',
          airline_code: 'KL',
          ticket_number: '074-9821437102',
          segments: [
            {
              airline: 'KLM Royal Dutch Airlines',
              airline_code: 'KL',
              flight_number: 'KL 792',
              origin_iata: 'GRU',
              origin_city: 'São Paulo (Guarulhos)',
              origin_terminal: 'Terminal 3',
              origin_gate: 'Portão 308',
              destination_iata: 'AMS',
              destination_city: 'Amsterdã (Schiphol)',
              destination_terminal: 'Terminal 1',
              destination_gate: 'Portão D12',
              departure_date: '2026-10-10',
              departure_time: '20:15',
              arrival_date: '2026-10-11',
              arrival_time: '13:00',
              duration: '11h 45m',
              duration_minutes: 705,
              cabin_class: 'Executiva (World Business)',
              fare_type: 'Flex',
              seat: '04A',
              status: 'Cancelado pela Cia (Reacomodação Urgente)',
              stops: 0,
              baggage: '2 malas despachadas (32kg cada) + 2 malas de mão',
              aircraft: 'Boeing 787-9 Dreamliner',
            },
            {
              airline: 'Air France',
              airline_code: 'AF',
              flight_number: 'AF 1240',
              origin_iata: 'AMS',
              origin_city: 'Amsterdã (Schiphol)',
              origin_terminal: 'Terminal 1',
              origin_gate: 'Portão B08',
              destination_iata: 'CDG',
              destination_city: 'Paris (Charles de Gaulle)',
              destination_terminal: 'Terminal 2F',
              destination_gate: 'Portão F32',
              departure_date: '2026-10-11',
              departure_time: '15:20',
              arrival_date: '2026-10-11',
              arrival_time: '16:45',
              duration: '1h 25m',
              duration_minutes: 85,
              cabin_class: 'Executiva',
              fare_type: 'Flex',
              seat: '02C',
              status: 'Conexão em Risco',
              stops: 0,
              baggage: 'Transferência direta de bagagem',
              aircraft: 'Airbus A321',
            },
          ],
          passengers: [
            {
              name: 'Dr. Roberto Silveira',
              type: 'Adulto',
              ticket_number: '074-9821437102',
              seat: '04A / 02C',
              frequent_flyer: 'Flying Blue Platinum #928374102',
            },
            {
              name: 'Dra. Helena Silveira',
              type: 'Adulto',
              ticket_number: '074-9821437103',
              seat: '04B / 02D',
              frequent_flyer: 'Flying Blue Gold #928374103',
            },
          ],
          total_duration: '15h 30m',
          status: 'Cancelado pela Cia',
        },
        TP4419: {
          pnr: 'TP4419',
          airline: 'TAP Air Portugal',
          airline_code: 'TP',
          ticket_number: '047-8819230114',
          segments: [
            {
              airline: 'TAP Air Portugal',
              airline_code: 'TP',
              flight_number: 'TP 88',
              origin_iata: 'GRU',
              origin_city: 'São Paulo (Guarulhos)',
              origin_terminal: 'Terminal 3',
              origin_gate: 'Portão 312',
              destination_iata: 'LIS',
              destination_city: 'Lisboa (Humberto Delgado)',
              destination_terminal: 'Terminal 1',
              destination_gate: 'Portão 41',
              departure_date: '2026-10-14',
              departure_time: '18:10',
              arrival_date: '2026-10-15',
              arrival_time: '07:30',
              duration: '9h 20m',
              duration_minutes: 560,
              cabin_class: 'Econômica (Classic)',
              fare_type: 'Plus',
              seat: '18A',
              status: 'Aguardando Reembolso BSP',
              stops: 0,
              baggage: '1 mala despachada (23kg) + 1 bagagem de mão (10kg)',
              aircraft: 'Airbus A330-900neo',
            },
          ],
          passengers: [
            {
              name: 'Lucas Antunes',
              type: 'Adulto',
              ticket_number: '047-8819230114',
              seat: '18A',
              frequent_flyer: 'TAP Miles&Go Silver #4409128',
            },
          ],
          total_duration: '9h 20m',
          status: 'Em Reembolso',
        },
        XPTO88: {
          pnr: 'XPTO88',
          airline: 'LATAM Airlines',
          airline_code: 'LA',
          ticket_number: '037-4401928301',
          segments: [
            {
              airline: 'LATAM Airlines',
              airline_code: 'LA',
              flight_number: 'LA 3310',
              origin_iata: 'CGH',
              origin_city: 'São Paulo (Congonhas)',
              origin_terminal: 'Terminal Principal',
              origin_gate: 'Portão 04',
              destination_iata: 'SDU',
              destination_city: 'Rio de Janeiro (Santos Dumont)',
              destination_terminal: 'Terminal 1',
              destination_gate: 'Portão 02',
              departure_date: '2026-10-12',
              departure_time: '09:00',
              arrival_date: '2026-10-12',
              arrival_time: '10:05',
              duration: '1h 05m',
              duration_minutes: 65,
              cabin_class: 'Premium Economy',
              fare_type: 'TOP',
              seat: '02B',
              status: 'Confirmado',
              stops: 0,
              baggage: '1 mala despachada (23kg) + 1 mala de mão (10kg)',
              aircraft: 'Airbus A319',
            },
          ],
          passengers: [
            {
              name: 'Mariana Duarte',
              type: 'Adulto',
              ticket_number: '037-4401928301',
              seat: '02B',
              frequent_flyer: 'LATAM Pass Black #99102834',
            },
          ],
          total_duration: '1h 05m',
          status: 'Confirmado',
        },
        AF8821: {
          pnr: 'AF8821',
          airline: 'Air France',
          airline_code: 'AF',
          ticket_number: '057-7729103841',
          segments: [
            {
              airline: 'Air France',
              airline_code: 'AF',
              flight_number: 'AF 457',
              origin_iata: 'GRU',
              origin_city: 'São Paulo (Guarulhos)',
              origin_terminal: 'Terminal 3',
              origin_gate: 'Portão 305',
              destination_iata: 'CDG',
              destination_city: 'Paris (Charles de Gaulle)',
              destination_terminal: 'Terminal 2E',
              destination_gate: 'Portão K42',
              departure_date: '2026-10-15',
              departure_time: '15:10',
              arrival_date: '2026-10-16',
              arrival_time: '07:35',
              duration: '11h 25m',
              duration_minutes: 685,
              cabin_class: 'Premium Economy',
              fare_type: 'Standard',
              seat: '12J',
              status: 'Confirmado',
              stops: 0,
              baggage: '2 malas despachadas (23kg) + 1 mala de mão (12kg)',
              aircraft: 'Boeing 777-300ER',
            },
          ],
          passengers: [
            {
              name: 'Carlos Drummond',
              type: 'Adulto',
              ticket_number: '057-7729103841',
              seat: '12J',
              frequent_flyer: 'Flying Blue Silver #33910284',
            },
          ],
          total_duration: '11h 25m',
          status: 'Confirmado',
        },
        G38812: {
          pnr: 'G38812',
          airline: 'Gol Linhas Aéreas',
          airline_code: 'G3',
          ticket_number: '127-9910293847',
          segments: [
            {
              airline: 'Gol Linhas Aéreas',
              airline_code: 'G3',
              flight_number: 'G3 1542',
              origin_iata: 'BSB',
              origin_city: 'Brasília (Juscelino Kubitschek)',
              origin_terminal: 'Terminal 1',
              origin_gate: 'Portão 14',
              destination_iata: 'FOR',
              destination_city: 'Fortaleza (Pinto Martins)',
              destination_terminal: 'Terminal 1',
              destination_gate: 'Portão 06',
              departure_date: '2026-10-11',
              departure_time: '11:20',
              arrival_date: '2026-10-11',
              arrival_time: '13:50',
              duration: '2h 30m',
              duration_minutes: 150,
              cabin_class: 'Gol + Conforto',
              fare_type: 'Plus',
              seat: '03C',
              status: 'Alteração Solicitada',
              stops: 0,
              baggage: '1 mala despachada (23kg) + 1 mala de mão (10kg)',
              aircraft: 'Boeing 737 MAX 8',
            },
          ],
          passengers: [
            {
              name: 'Fernanda Albuquerque',
              type: 'Adulto',
              ticket_number: '127-9910293847',
              seat: '03C',
              frequent_flyer: 'Smiles Diamante #88291023',
            },
          ],
          total_duration: '2h 30m',
          status: 'Em Alteração',
        },
        ALP992: {
          pnr: 'ALP992',
          airline: 'LATAM Airlines',
          airline_code: 'LA',
          ticket_number: '037-1129384910',
          segments: [
            {
              airline: 'LATAM Airlines',
              airline_code: 'LA',
              flight_number: 'LA 8104',
              origin_iata: 'GRU',
              origin_city: 'São Paulo (Guarulhos)',
              origin_terminal: 'Terminal 3',
              origin_gate: 'Portão 318',
              destination_iata: 'MIA',
              destination_city: 'Miami International',
              destination_terminal: 'Concourse J',
              destination_gate: 'Portão J10',
              departure_date: '2026-10-18',
              departure_time: '23:30',
              arrival_date: '2026-10-19',
              arrival_time: '06:55',
              duration: '8h 25m',
              duration_minutes: 505,
              cabin_class: 'Econômica',
              fare_type: 'Light',
              seat: '24D',
              status: 'Confirmado',
              stops: 0,
              baggage: '1 mala despachada (23kg) + 1 mala de mão (10kg)',
              aircraft: 'Boeing 777-300ER',
            },
          ],
          passengers: [
            {
              name: 'Juliana Paes de Barros',
              type: 'Adulto',
              ticket_number: '037-1129384910',
              seat: '24D',
              frequent_flyer: 'LATAM Pass Gold #55019283',
            },
          ],
          total_duration: '8h 25m',
          status: 'Confirmado',
        },
      }

      // Preencher control_tower_emails conhecidos
      const allEmails = app.findRecordsByFilter('control_tower_emails', '', '', 500, 0)
      for (let i = 0; i < allEmails.length; i++) {
        const emailRec = allEmails[i]
        const rNum = (emailRec.getString('reservation_number') || '').toUpperCase()
        const subj = emailRec.getString('subject') || ''

        let flightData = null
        if (rNum && knownFlightPresets[rNum]) {
          flightData = knownFlightPresets[rNum]
        } else if (subj.indexOf('GRU-MIA') !== -1 || subj.indexOf('MIA') !== -1) {
          flightData = {
            pnr: rNum || 'MIA892',
            airline: 'American Airlines',
            airline_code: 'AA',
            ticket_number: '001-9283019284',
            segments: [
              {
                airline: 'American Airlines',
                airline_code: 'AA',
                flight_number: 'AA 906',
                origin_iata: 'GRU',
                origin_city: 'São Paulo (Guarulhos)',
                origin_terminal: 'Terminal 3',
                origin_gate: 'Portão 320',
                destination_iata: 'MIA',
                destination_city: 'Miami International',
                destination_terminal: 'Concourse D',
                destination_gate: 'Portão D24',
                departure_date: '2026-10-10',
                departure_time: '23:55',
                arrival_date: '2026-10-11',
                arrival_time: '07:15',
                duration: '8h 20m',
                duration_minutes: 500,
                cabin_class: 'Executiva (Flagship Business)',
                fare_type: 'Flex',
                seat: '05A',
                status: 'Erro na Emissão / Bloqueado',
                stops: 0,
                baggage: '2 malas despachadas (32kg) + 1 mala de mão (10kg)',
                aircraft: 'Boeing 777-200',
              },
            ],
            passengers: [
              {
                name: 'Marcia Fontes (Agência Tour Brasil)',
                type: 'Adulto',
                ticket_number: '001-9283019284',
                seat: '05A',
                frequent_flyer: 'AAdvantage Platinum Pro #8820192',
              },
            ],
            total_duration: '8h 20m',
            status: 'Pendente de Emissão',
          }
          if (!rNum) {
            emailRec.set('reservation_number', 'MIA892')
          }
        } else if (
          subj.toLowerCase().indexOf('fortaleza') !== -1 ||
          subj.toLowerCase().indexOf('grupo') !== -1
        ) {
          flightData = {
            pnr: rNum || 'FOR551',
            airline: 'Azul Linhas Aéreas',
            airline_code: 'AD',
            ticket_number: '577-4491028341',
            segments: [
              {
                airline: 'Azul Linhas Aéreas',
                airline_code: 'AD',
                flight_number: 'AD 4210',
                origin_iata: 'VCP',
                origin_city: 'Campinas (Viracopos)',
                origin_terminal: 'Terminal 1',
                origin_gate: 'Portão B12',
                destination_iata: 'FOR',
                destination_city: 'Fortaleza (Pinto Martins)',
                destination_terminal: 'Terminal 1',
                destination_gate: 'Portão 04',
                departure_date: '2026-10-25',
                departure_time: '08:30',
                arrival_date: '2026-10-25',
                arrival_time: '11:45',
                duration: '3h 15m',
                duration_minutes: 195,
                cabin_class: 'Econômica (Espaço Azul)',
                fare_type: 'Grupo Corporativo',
                seat: 'Bloqueio Coletivo (12 assentos)',
                status: 'Cotação de Grupo',
                stops: 0,
                baggage: '1 mala despachada por passageiro (23kg)',
                aircraft: 'Airbus A320neo',
              },
            ],
            passengers: [
              {
                name: 'Grupo Corporativo (12 passageiros)',
                type: 'Grupo',
                seat: 'Fileiras 6 a 8',
              },
            ],
            total_duration: '3h 15m',
            status: 'Cotação em Andamento',
          }
          if (!rNum) {
            emailRec.set('reservation_number', 'FOR551')
          }
        }

        if (flightData) {
          emailRec.set('flight_data', flightData)
          app.save(emailRec)
        }
      }
    } catch (bfErr) {
      console.log('[Migration 0118] Erro no backfill de flight_data: ' + bfErr)
    }
  },
  (app) => {
    try {
      const cteCol = app.findCollectionByNameOrId('control_tower_emails')
      if (cteCol.fields.getByName('flight_data')) {
        cteCol.fields.removeByName('flight_data')
        app.save(cteCol)
      }
    } catch (_) {}

    try {
      const srCol = app.findCollectionByNameOrId('service_records')
      if (srCol.fields.getByName('flight_data')) {
        srCol.fields.removeByName('flight_data')
        app.save(srCol)
      }
    } catch (_) {}
  },
)
