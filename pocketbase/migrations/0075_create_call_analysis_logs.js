migrate(
  (app) => {
    if (!app.hasTable('call_analysis_logs')) {
      const callAnalysisLogs = new Collection({
        name: 'call_analysis_logs',
        type: 'base',
        listRule: '@request.auth.id != ""',
        viewRule: '@request.auth.id != ""',
        createRule: '@request.auth.id != ""',
        updateRule: '@request.auth.id != ""',
        deleteRule: '@request.auth.id != ""',
        fields: [
          { name: 'call_sid', type: 'text', required: false },
          { name: 'provider', type: 'text', required: false }, // 'twilio' | 'vonage' | 'internal' | 'simulation'
          { name: 'from_number', type: 'text', required: false },
          { name: 'to_number', type: 'text', required: false },
          { name: 'recording_url', type: 'text', required: false },
          { name: 'duration', type: 'number', required: false }, // em segundos
          { name: 'transcription', type: 'text', required: false },
          { name: 'summary', type: 'text', required: false },
          { name: 'category', type: 'text', required: false },
          { name: 'sentiment', type: 'text', required: false },
          { name: 'keywords', type: 'json', required: false },
          { name: 'quality_score', type: 'number', required: false }, // 0 a 100
          {
            name: 'service_record',
            type: 'relation',
            required: false,
            collectionId: app.findCollectionByNameOrId('service_records').id,
            maxSelect: 1,
          },
          {
            name: 'client',
            type: 'relation',
            required: false,
            collectionId: app.findCollectionByNameOrId('clients').id,
            maxSelect: 1,
          },
          {
            name: 'processed_by',
            type: 'relation',
            required: false,
            collectionId: '_pb_users_auth_',
            maxSelect: 1,
          },
          { name: 'received_at', type: 'date', required: false },
          { name: 'created', type: 'autodate', onCreate: true, onUpdate: false },
          { name: 'updated', type: 'autodate', onCreate: true, onUpdate: true },
        ],
        indexes: [
          'CREATE INDEX idx_cal_sid ON call_analysis_logs (call_sid)',
          'CREATE INDEX idx_cal_category ON call_analysis_logs (category)',
          'CREATE INDEX idx_cal_sr ON call_analysis_logs (service_record)',
          'CREATE INDEX idx_cal_client ON call_analysis_logs (client)',
          'CREATE INDEX idx_cal_created ON call_analysis_logs (created DESC)',
        ],
      })
      app.save(callAnalysisLogs)
    }
  },
  (app) => {
    try {
      app.delete(app.findCollectionByNameOrId('call_analysis_logs'))
    } catch (_) {}
  },
)
