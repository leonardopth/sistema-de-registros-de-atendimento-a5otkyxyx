migrate(
  (app) => {
    const serviceRecordsCol = app.findCollectionByNameOrId('service_records')

    const csatCollection = new Collection({
      name: 'csat_responses',
      type: 'base',
      // Leitura pública SOMENTE via token válido (passado como parâmetro da consulta ou filtro)
      // Escrita pública/autenticada bloqueada diretamente via regras padrão; backend manipula ou token filter
      listRule: "token != '' && @request.query.token = token",
      viewRule: "token != '' && @request.query.token = token",
      createRule: null, // superuser/backend only
      updateRule: "token != '' && @request.query.token = token && rating = 0",
      deleteRule: null,
      fields: [
        {
          name: 'service_record_id',
          type: 'relation',
          required: true,
          collectionId: serviceRecordsCol.id,
          cascadeDelete: true,
          maxSelect: 1,
        },
        {
          name: 'token',
          type: 'text',
          required: true,
        },
        {
          name: 'rating',
          type: 'number',
          min: 0,
          max: 5,
        },
        {
          name: 'comment',
          type: 'text',
        },
        {
          name: 'client_name',
          type: 'text',
        },
        {
          name: 'client_email',
          type: 'text',
        },
        {
          name: 'responded_at',
          type: 'date',
        },
        {
          name: 'created',
          type: 'autodate',
          onCreate: true,
          onUpdate: false,
        },
        {
          name: 'updated',
          type: 'autodate',
          onCreate: true,
          onUpdate: true,
        },
      ],
      indexes: [
        'CREATE UNIQUE INDEX idx_csat_token ON csat_responses (token)',
        'CREATE INDEX idx_csat_record ON csat_responses (service_record_id)',
        'CREATE INDEX idx_csat_rating ON csat_responses (rating)',
      ],
    })

    app.save(csatCollection)
  },
  (app) => {
    try {
      const col = app.findCollectionByNameOrId('csat_responses')
      app.delete(col)
    } catch (_) {}
  },
)
