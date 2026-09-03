// Hook server-side no update de service_records:
// Se first_response_time ainda é 0/vazio e o status passa para "Em Andamento" ou "Concluído",
// grava o TFR em minutos = (agora - created), mínimo 0.1.
// Captura alterações de qualquer origem (modal, lista, lote, API).

onRecordUpdateRequest((e) => {
  try {
    var record = e.record
    var currentTfr = record.getFloat('first_response_time')

    // Só processa se TFR for 0 ou nulo/vazio
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
        }
      }
    }
  } catch (err) {
    $app.logger().error('Erro no hook on_service_record_tfr:', 'error', String(err))
  }

  return e.next()
}, 'service_records')
