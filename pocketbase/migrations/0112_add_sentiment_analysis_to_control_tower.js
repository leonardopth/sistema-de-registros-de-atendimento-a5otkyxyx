migrate(
  (app) => {
    // 1. Atualizar control_tower_configs com peso para cliente frustrado
    try {
      const configCol = app.findCollectionByNameOrId('control_tower_configs')
      if (!configCol.fields.getByName('weight_frustrated_client')) {
        configCol.fields.add(
          new NumberField({
            name: 'weight_frustrated_client',
            min: 0,
            max: 100,
          }),
        )
        app.save(configCol)
      }

      // Inicializar o peso padrão nos registros de configuração existentes caso esteja nulo ou zerado
      const existingConfigs = app.findRecordsByFilter('control_tower_configs', '', '', 10, 0)
      for (let i = 0; i < existingConfigs.length; i++) {
        const c = existingConfigs[i]
        if (!c.getFloat('weight_frustrated_client')) {
          c.set('weight_frustrated_client', 20)
          app.save(c)
        }
      }
    } catch (err) {
      console.log('[Migration 0112] Erro ao atualizar control_tower_configs: ' + err)
    }

    // 2. Atualizar control_tower_emails com campos de análise de sentimento
    try {
      const emailsCol = app.findCollectionByNameOrId('control_tower_emails')

      if (!emailsCol.fields.getByName('sentiment_score')) {
        emailsCol.fields.add(
          new NumberField({
            name: 'sentiment_score',
            min: -100,
            max: 100,
          }),
        )
      }

      if (!emailsCol.fields.getByName('sentiment_label')) {
        emailsCol.fields.add(
          new SelectField({
            name: 'sentiment_label',
            values: ['Positivo', 'Neutro', 'Frustrado', 'Crítico'],
            maxSelect: 1,
          }),
        )
      }

      if (!emailsCol.fields.getByName('sentiment_intensity')) {
        emailsCol.fields.add(
          new SelectField({
            name: 'sentiment_intensity',
            values: ['Leve', 'Moderado', 'Forte'],
            maxSelect: 1,
          }),
        )
      }

      if (!emailsCol.fields.getByName('sentiment_reasons')) {
        emailsCol.fields.add(
          new JSONField({
            name: 'sentiment_reasons',
          }),
        )
      }

      app.save(emailsCol)
    } catch (err) {
      console.log(
        '[Migration 0112] Erro ao adicionar campos de sentimento em control_tower_emails: ' + err,
      )
    }

    // 3. Backfill idempotente: analisar sentimento dos e-mails já existentes
    try {
      function analyzeSentiment(subject, bodySnippet) {
        const fullText = ((subject || '') + ' ' + (bodySnippet || '')).toLowerCase()
        if (!fullText.trim()) {
          return { score: 0, label: 'Neutro', intensity: 'Leve', reasons: [] }
        }

        const criticalPatterns = [
          'procon',
          'processo judicial',
          'advogado',
          'ação judicial',
          'juizado especial',
          'danos morais',
          'reclame aqui',
          'ministério público',
          'polícia',
          'estelionato',
          'golpe',
          'fraude',
          'vou processar',
        ]

        const strongPatterns = [
          'absurdo',
          'inadmissível',
          'vergonha',
          'falta de respeito',
          'desrespeito',
          'palhaçada',
          'humilhação',
          'ridículo',
          'descaso total',
          'prejuízo enorme',
          'incompetência',
          'nunca mais',
          'terceira vez',
          'quarta vez',
          'ninguém resolve',
          'ninguem resolve',
          'quero cancelar',
          'quero meu dinheiro de volta',
          'estorno imediato',
          'não aguento mais',
          'nao aguento mais',
        ]

        const moderatePatterns = [
          'insatisfação',
          'insatisfeito',
          'insatisfeita',
          'muito insatisfeito',
          'indignado',
          'indignada',
          'revoltado',
          'revoltada',
          'decepcionado',
          'decepcionada',
          'estou esperando há dias',
          'segunda vez',
          'novamente com problema',
          'não tive retorno',
          'nao tive retorno',
          'sem resposta',
          'demora excessiva',
          'urgência descumprida',
          'atraso inaceitável',
        ]

        const positivePatterns = [
          'muito obrigado',
          'excelente atendimento',
          'parabéns',
          'perfeito',
          'ótimo',
          'otimo',
          'maravilhoso',
          'sensacional',
          'rápido e eficiente',
          'super recomendo',
          'tudo certo',
          'resolvido com sucesso',
          'agradeço a atenção',
        ]

        let score = 0
        const matched = []

        for (let i = 0; i < criticalPatterns.length; i++) {
          if (fullText.indexOf(criticalPatterns[i]) !== -1) {
            score -= 50
            matched.push(criticalPatterns[i])
          }
        }

        for (let i = 0; i < strongPatterns.length; i++) {
          if (fullText.indexOf(strongPatterns[i]) !== -1) {
            score -= 30
            matched.push(strongPatterns[i])
          }
        }

        for (let i = 0; i < moderatePatterns.length; i++) {
          if (fullText.indexOf(moderatePatterns[i]) !== -1) {
            score -= 15
            matched.push(moderatePatterns[i])
          }
        }

        const exclMatch = ((subject || '') + ' ' + (bodySnippet || '')).match(/!{2,}/g)
        if (exclMatch) {
          score -= 10
          matched.push('pontos de exclamação múltiplos')
        }

        const capsMatch = ((subject || '') + ' ' + (bodySnippet || '')).match(
          /\b[A-ZÁÉÍÓÚÂÊÔÃÕÇ]{4,}\b/g,
        )
        if (capsMatch && capsMatch.length >= 2) {
          score -= 10
          matched.push('palavras em maiúsculas excessivas')
        }

        for (let i = 0; i < positivePatterns.length; i++) {
          if (fullText.indexOf(positivePatterns[i]) !== -1) {
            score += 25
            matched.push(positivePatterns[i])
          }
        }

        if (score < -100) score = -100
        if (score > 100) score = 100

        let label = 'Neutro'
        let intensity = 'Leve'

        if (score <= -60) {
          label = 'Crítico'
          intensity = 'Forte'
        } else if (score <= -25) {
          label = 'Frustrado'
          intensity = score <= -40 ? 'Forte' : 'Moderado'
        } else if (score < -5) {
          label = 'Frustrado'
          intensity = 'Leve'
        } else if (score >= 20) {
          label = 'Positivo'
          intensity = score >= 50 ? 'Forte' : 'Moderado'
        }

        return {
          score: score,
          label: label,
          intensity: intensity,
          reasons: matched.slice(0, 5),
        }
      }

      const pendingEmails = app.findRecordsByFilter(
        'control_tower_emails',
        "sentiment_label = '' || sentiment_label = null",
        '',
        500,
        0,
      )

      for (let eIdx = 0; eIdx < pendingEmails.length; eIdx++) {
        const rec = pendingEmails[eIdx]
        const subj = rec.getString('subject')
        const snip = rec.getString('body_snippet')
        const analysis = analyzeSentiment(subj, snip)

        rec.set('sentiment_score', analysis.score)
        rec.set('sentiment_label', analysis.label)
        rec.set('sentiment_intensity', analysis.intensity)
        rec.set('sentiment_reasons', analysis.reasons)

        // Se for Frustrado ou Crítico, acrescentar o sinal "Cliente Frustrado" nos detected_signals se ainda não tiver
        if (analysis.label === 'Frustrado' || analysis.label === 'Crítico') {
          let sigs = []
          try {
            const raw = rec.get('detected_signals')
            if (Array.isArray(raw)) sigs = raw.slice()
            else if (typeof raw === 'string') sigs = JSON.parse(raw)
          } catch (_) {}

          const frustSignal = 'Cliente Frustrado'
          let hasSignal = false
          for (let s = 0; s < sigs.length; s++) {
            if (String(sigs[s]).indexOf('Cliente Frustrado') !== -1) {
              hasSignal = true
              break
            }
          }
          if (!hasSignal) {
            sigs.push(frustSignal)
            rec.set('detected_signals', sigs)
            // Incrementa score com peso sugerido
            const curScore = rec.getFloat('score') || 0
            rec.set('score', curScore + 20)
          }
        }

        app.save(rec)
      }
    } catch (backfillErr) {
      console.log('[Migration 0112] Erro no backfill de sentimento: ' + backfillErr)
    }
  },
  (app) => {
    // Reversão limpa
    try {
      const configCol = app.findCollectionByNameOrId('control_tower_configs')
      if (configCol.fields.getByName('weight_frustrated_client')) {
        configCol.fields.removeByName('weight_frustrated_client')
        app.save(configCol)
      }
    } catch (_) {}

    try {
      const emailsCol = app.findCollectionByNameOrId('control_tower_emails')
      if (emailsCol.fields.getByName('sentiment_score'))
        emailsCol.fields.removeByName('sentiment_score')
      if (emailsCol.fields.getByName('sentiment_label'))
        emailsCol.fields.removeByName('sentiment_label')
      if (emailsCol.fields.getByName('sentiment_intensity'))
        emailsCol.fields.removeByName('sentiment_intensity')
      if (emailsCol.fields.getByName('sentiment_reasons'))
        emailsCol.fields.removeByName('sentiment_reasons')
      app.save(emailsCol)
    } catch (_) {}
  },
)
