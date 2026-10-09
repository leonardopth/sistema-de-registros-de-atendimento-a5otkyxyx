migrate(
  (app) => {
    // Migração 0108: Atualizar detected_signals e detected_dates via SQL direto na tabela SQLite
    if (!app.hasTable('control_tower_emails')) return

    try {
      // Usar app.db().newQuery para gravar diretamente o texto JSON na coluna detected_signals
      // Exemplo: '["Embarque <24h", "Cancelamento/Remarcação", "Cliente VIP", "Cliente insistente (3 msgs)"]'

      // 1. Thread 1 Root (dvvwx5mcqeq4io2)
      app
        .db()
        .newQuery(
          "UPDATE control_tower_emails SET detected_signals = {:sigs}, detected_dates = {:dates} WHERE id = 'dvvwx5mcqeq4io2'",
        )
        .bind({
          sigs: JSON.stringify([
            'Embarque <24h',
            'Cancelamento/Remarcação',
            'Cliente VIP',
            'Cliente insistente (3 msgs)',
          ]),
          dates: JSON.stringify(['10/10']),
        })
        .execute()

      // 2. Thread 1 Msg 2 (1vi5dgd0e0utv0g)
      app
        .db()
        .newQuery(
          "UPDATE control_tower_emails SET detected_signals = {:sigs}, detected_dates = {:dates} WHERE id = '1vi5dgd0e0utv0g'",
        )
        .bind({
          sigs: JSON.stringify([
            'Embarque <24h',
            'Cancelamento/Remarcação',
            'Cliente insistente (3 msgs)',
          ]),
          dates: JSON.stringify([]),
        })
        .execute()

      // 3. Thread 1 Msg 3 (gz2dbpf3t0gc6ss)
      app
        .db()
        .newQuery(
          "UPDATE control_tower_emails SET detected_signals = {:sigs}, detected_dates = {:dates} WHERE id = 'gz2dbpf3t0gc6ss'",
        )
        .bind({
          sigs: JSON.stringify([
            'Embarque <24h',
            'Reclamação Formal',
            'Cliente insistente (3 msgs)',
          ]),
          dates: JSON.stringify([]),
        })
        .execute()

      // 4. Thread 2 Root (w26y4rfik1ancrm)
      app
        .db()
        .newQuery(
          "UPDATE control_tower_emails SET detected_signals = {:sigs}, detected_dates = {:dates} WHERE id = 'w26y4rfik1ancrm'",
        )
        .bind({
          sigs: JSON.stringify([
            'Embarque <48h',
            'Cancelamento/Remarcação',
            'Cliente insistente (2 msgs)',
          ]),
          dates: JSON.stringify(['11/10']),
        })
        .execute()

      // 5. Thread 2 Msg 2 (69xqc629zea1jyh)
      app
        .db()
        .newQuery(
          "UPDATE control_tower_emails SET detected_signals = {:sigs}, detected_dates = {:dates} WHERE id = '69xqc629zea1jyh'",
        )
        .bind({
          sigs: JSON.stringify(['Embarque <48h', 'Cancelamento/Remarcação']),
          dates: JSON.stringify([]),
        })
        .execute()

      // 6. Demo 2 (9epjk8j0n8h3bck)
      app
        .db()
        .newQuery(
          "UPDATE control_tower_emails SET detected_signals = {:sigs}, detected_dates = {:dates} WHERE id = '9epjk8j0n8h3bck'",
        )
        .bind({
          sigs: JSON.stringify(['Reclamação Formal', 'Prazo Prometido', 'Reincidente']),
          dates: JSON.stringify([]),
        })
        .execute()

      // 7. Demo 4 (iz706caf3jxyfvo)
      app
        .db()
        .newQuery(
          "UPDATE control_tower_emails SET detected_signals = {:sigs}, detected_dates = {:dates} WHERE id = 'iz706caf3jxyfvo'",
        )
        .bind({
          sigs: JSON.stringify([]),
          dates: JSON.stringify([]),
        })
        .execute()
    } catch (err) {
      console.log('Erro na migração 0108:', err)
    }
  },
  (app) => {
    // rollback
  },
)
