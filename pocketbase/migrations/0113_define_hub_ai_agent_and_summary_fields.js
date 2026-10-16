/// <reference path="../pb_data/types.d.ts" />
migrate(
  (app) => {
    // 1. Campos em service_records para rastreio do Resumo de IA:
    //    - ai_summary (text): Resumo estruturado gerado pelo HUB AI a partir da conversa
    //    - ai_summary_generated_at (date): Data/hora da última geração do resumo
    //    - ai_summary_messages_count (number): Quantidade de mensagens que foram resumidas
    //    - ai_summary_edited_by_user (bool): Flag indicando se o consultor editou manualmente a descrição
    const srCol = app.findCollectionByNameOrId('service_records')

    if (!srCol.fields.getByName('ai_summary')) {
      srCol.fields.add(
        new TextField({
          name: 'ai_summary',
        }),
      )
    }

    if (!srCol.fields.getByName('ai_summary_generated_at')) {
      srCol.fields.add(
        new DateField({
          name: 'ai_summary_generated_at',
        }),
      )
    }

    if (!srCol.fields.getByName('ai_summary_messages_count')) {
      srCol.fields.add(
        new NumberField({
          name: 'ai_summary_messages_count',
          onlyInt: true,
        }),
      )
    }

    if (!srCol.fields.getByName('ai_summary_edited_by_user')) {
      srCol.fields.add(
        new BoolField({
          name: 'ai_summary_edited_by_user',
        }),
      )
    }

    app.save(srCol)

    // 2. Definir Agente Nativo Skip Cloud: "hub-ai-assistant"
    // Com acesso às coleções de atendimentos, clientes, e-mails da torre, banco de horas e ausências
    $ai.agents.define(app, {
      slug: 'hub-ai-assistant',
      name: 'HUB AI Assistente',
      description:
        'Assistente corporativo inteligente do HUB AI para consultores, líderes e gestores da agência de viagens.',
      systemPrompt:
        'Você é o Assistente Interno de IA do sistema HUB AI (RexturAdvance / agência de viagens corporativa).\n' +
        'Seu objetivo é ajudar consultores e gestores fornecendo respostas claras, precisas, empáticas e objetivas baseadas nos dados do sistema.\n\n' +
        'DIRETRIZES DE ATUAÇÃO E SEGURANÇA:\n' +
        '1. Idioma: Sempre responda em Português do Brasil de forma profissional e prestativa.\n' +
        '2. Segregação e Escopo: Você consulta as ferramentas respeitando as permissões do usuário autenticado no sistema. Não invente dados de atendimentos ou clientes que não existam.\n' +
        '3. Histórico de Cliente: Ao ser questionado sobre o histórico de um cliente/empresa, resuma os atendimentos recentes (motivos de contato mais frequentes, se o cliente é VIP/prioritário, agências/contatos vinculados, se houve contatos evitáveis ou reclamações, e status dos chamados).\n' +
        '4. Torre de Controle e Fila: Informe e-mails prioritários (P1/P2/P3), sinais críticos detectados (embarque próximo <24h/48h, cancelamentos, prazos prometidos), sentimento (frustrado/crítico) e SLA restante.\n' +
        '5. Meus Atendimentos / Metas: Apresente os atendimentos em andamento do usuário, resoluções pendentes e prazos de resposta.\n' +
        '6. Ausências e Banco de Horas: Responda sobre saldo, férias aprovadas ou programadas e dias de folga conforme os registros do colaborador.\n' +
        '7. Formatação: Use tópicos (bullet points) e destaques em negrito para facilitar a leitura rápida pelo consultor.',
      tier: 'fast',
      tools: [
        {
          collection: 'service_records',
          perms: { read: true, list: true },
        },
        {
          collection: 'clients',
          perms: { read: true, list: true },
        },
        {
          collection: 'control_tower_emails',
          perms: { read: true, list: true },
        },
        {
          collection: 'absences',
          perms: { read: true, list: true },
        },
        {
          collection: 'hour_bank_entries',
          perms: { read: true, list: true },
        },
        {
          collection: 'meta_snapshots',
          perms: { read: true, list: true },
        },
      ],
      memory: [
        {
          type: 'text',
          payload: {
            text:
              'HUB AI é a plataforma operacional de registros de atendimento e torre de controle de e-mails da RexturAdvance. ' +
              'Núcleos de atendimento atendem caixas compartilhadas regionais: SAO, SPI, SUL, Concierge, Exclusivo, LOT, BR1, BR2. ' +
              'Prioridades da Torre: P1 (SLA 2h úteis), P2 (SLA 4h úteis), P3 (SLA 8h úteis). ' +
              'Sinais críticos monitorados: Embarque <24h, Embarque <48h, Cancelamento/Remarcação, Reclamação Formal, Prazo Prometido, Cliente VIP e Reincidente.',
          },
        },
        {
          type: 'faq',
          payload: {
            qa: [
              {
                question: 'Como consultar o histórico de um cliente?',
                answer:
                  'Você pode me perguntar "Qual o histórico da empresa X?" ou "Mostre os atendimentos recentes do cliente Y". Buscarei os registros vinculados ao cadastro do cliente na base.',
              },
              {
                question: 'Como vejo meus atendimentos pendentes?',
                answer:
                  'Pergunte "Quais são meus atendimentos em aberto?" ou "O que tenho pendente na fila?". Listarei os atendimentos com status Aberto ou Em Andamento atribuídos a você.',
              },
            ],
          },
        },
      ],
    })
  },
  (app) => {
    try {
      $ai.agents.delete(app, 'hub-ai-assistant')
    } catch (_) {}

    try {
      const srCol = app.findCollectionByNameOrId('service_records')
      const f1 = srCol.fields.getByName('ai_summary')
      if (f1) srCol.fields.remove(f1)
      const f2 = srCol.fields.getByName('ai_summary_generated_at')
      if (f2) srCol.fields.remove(f2)
      const f3 = srCol.fields.getByName('ai_summary_messages_count')
      if (f3) srCol.fields.remove(f3)
      const f4 = srCol.fields.getByName('ai_summary_edited_by_user')
      if (f4) srCol.fields.remove(f4)
      app.save(srCol)
    } catch (_) {}
  },
)
