migrate(
  (app) => {
    try {
      var existing = app.findRecordsByFilter('clients', "id != ''", '-created', 1, 0)
      if (existing.length > 0) return
    } catch (_) {}

    var aeCol = app.findCollectionByNameOrId('account_executives')
    var aeData = [
      {
        name: 'Ana Carolina Pereira',
        email: 'ana.pereira@rextur.com.br',
        phone: '(11) 98877-6655',
      },
      { name: 'Roberto Mendes', email: 'roberto.mendes@rextur.com.br', phone: '(21) 99654-3322' },
      { name: 'Fernanda Lima', email: 'fernanda.lima@rextur.com.br', phone: '(31) 98765-4321' },
    ]
    var aeIds = []
    for (var i = 0; i < aeData.length; i++) {
      var aeRec = new Record(aeCol)
      aeRec.set('name', aeData[i].name)
      aeRec.set('email', aeData[i].email)
      aeRec.set('phone', aeData[i].phone)
      app.save(aeRec)
      aeIds.push(aeRec.id)
    }

    var clientsCol = app.findCollectionByNameOrId('clients')
    var clientData = [
      {
        name: 'Rextur Advance Viagens',
        email: 'contato@rextur.com.br',
        phone: '(11) 3456-7890',
        company: 'Rextur Advance',
        city: 'São Paulo',
        state: 'SP',
        notes: 'Agência de viagens corporativas de grande porte. Atendimento prioritário.',
        service_group: 'Concierge',
        aeIdx: 0,
        threshold: 3,
      },
      {
        name: 'CVC Corp Viagens',
        email: 'corporate@cvc.com.br',
        phone: '(21) 3234-5600',
        company: 'CVC Corp',
        city: 'Rio de Janeiro',
        state: 'RJ',
        notes: 'Cliente corporativo com alto volume de reservas mensais.',
        service_group: 'Exclusivo',
        aeIdx: 1,
        threshold: 10,
      },
      {
        name: 'Decolar Viagens Brasil',
        email: 'empresas@decolar.com.br',
        phone: '(31) 3567-8900',
        company: 'Decolar Brasil',
        city: 'Belo Horizonte',
        state: 'MG',
        notes: 'Operação de viagens nacionais e internacionais para empresas.',
        service_group: 'BR1',
        aeIdx: 2,
        threshold: 3,
      },
    ]
    var clientIds = []
    for (var ci = 0; ci < clientData.length; ci++) {
      var cd = clientData[ci]
      var clRec = new Record(clientsCol)
      clRec.set('name', cd.name)
      clRec.set('email', cd.email)
      clRec.set('phone', cd.phone)
      clRec.set('company', cd.company)
      clRec.set('city', cd.city)
      clRec.set('state', cd.state)
      clRec.set('notes', cd.notes)
      clRec.set('service_group', cd.service_group)
      clRec.set('account_executive', aeData[cd.aeIdx].name)
      clRec.set('account_executive_rel', aeIds[cd.aeIdx])
      clRec.set('avoidable_contact_threshold', cd.threshold)
      app.save(clRec)
      clientIds.push(clRec.id)
    }

    var agentsCol = app.findCollectionByNameOrId('agents')
    var agentData = [
      {
        name: 'Patrícia Almeida',
        email: 'patricia.almeida@rextur.com.br',
        phone: '(11) 97777-1111',
        clientIdx: 0,
      },
      {
        name: 'Rodrigo Ferreira',
        email: 'rodrigo.ferreira@rextur.com.br',
        phone: '(11) 97777-2222',
        clientIdx: 0,
      },
      {
        name: 'Camila Rocha',
        email: 'camila.rocha@rextur.com.br',
        phone: '(21) 97777-3333',
        clientIdx: 1,
      },
      {
        name: 'Bruno Carvalho',
        email: 'bruno.carvalho@rextur.com.br',
        phone: '(21) 97777-4444',
        clientIdx: 1,
      },
      {
        name: 'Daniela Martins',
        email: 'daniela.martins@rextur.com.br',
        phone: '(31) 97777-5555',
        clientIdx: 2,
      },
      {
        name: 'Eduardo Gomes',
        email: 'eduardo.gomes@rextur.com.br',
        phone: '(31) 97777-6666',
        clientIdx: 2,
      },
    ]
    var agentIds = []
    for (var ai = 0; ai < agentData.length; ai++) {
      var ad = agentData[ai]
      var agRec = new Record(agentsCol)
      agRec.set('name', ad.name)
      agRec.set('email', ad.email)
      agRec.set('phone', ad.phone)
      agRec.set('client_id', clientIds[ad.clientIdx])
      app.save(agRec)
      agentIds.push(agRec.id)
    }

    var usersCol = app.findCollectionByNameOrId('_pb_users_auth_')
    var userData = [
      { name: 'Marcelo Ribeiro', email: 'marcelo.ribeiro@rextur.com.br', role: 'Gerentes' },
      { name: 'Ana Paula Costa', email: 'ana.costa@rextur.com.br', role: 'Gerentes' },
      { name: 'Felipe Alves', email: 'felipe.alves@rextur.com.br', role: 'Gerentes' },
      { name: 'Juliana Freitas', email: 'juliana.freitas@rextur.com.br', role: 'Supervisores' },
      { name: 'Ricardo Nunes', email: 'ricardo.nunes@rextur.com.br', role: 'Supervisores' },
      { name: 'Patrícia Santos', email: 'patricia.santos@rextur.com.br', role: 'Supervisores' },
      { name: 'Gustavo Pinto', email: 'gustavo.pinto@rextur.com.br', role: 'Líderes' },
      { name: 'Camila Ferreira', email: 'camila.ferreira@rextur.com.br', role: 'Líderes' },
      { name: 'Lucas Oliveira', email: 'lucas.oliveira@rextur.com.br', role: 'Líderes' },
      { name: 'Bruno Carvalho', email: 'bruno.carvalho@rextur.com.br', role: 'Consultores' },
      { name: 'Daniela Martins', email: 'daniela.martins@rextur.com.br', role: 'Consultores' },
      { name: 'Eduardo Gomes', email: 'eduardo.gomes@rextur.com.br', role: 'Consultores' },
      {
        name: 'Ana Carolina Pereira',
        email: 'ana.pereira@rextur.com.br',
        role: 'Executivo de contas',
      },
      {
        name: 'Roberto Mendes',
        email: 'roberto.mendes@rextur.com.br',
        role: 'Executivo de contas',
      },
      { name: 'Fernanda Lima', email: 'fernanda.lima@rextur.com.br', role: 'Executivo de contas' },
    ]
    var userIds = []
    for (var ui = 0; ui < userData.length; ui++) {
      var ud = userData[ui]
      var uRec = new Record(usersCol)
      uRec.setEmail(ud.email)
      uRec.setPassword('Skip@Pass')
      uRec.setVerified(true)
      uRec.set('name', ud.name)
      uRec.set('role', ud.role)
      uRec.set('approval_status', 'Aprovado')
      app.save(uRec)
      userIds.push(uRec.id)
    }
  },
  (app) => {},
)
