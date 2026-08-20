// Hook para enriquecer e garantir a restrição de segurança no nível de consulta de service_records
// Regras:
// - Usuários com papel 'Master' ou master_access = true visualizam TODOS os atendimentos
// - Usuários comuns visualizam APENAS:
//   (a) seus próprios atendimentos (user_id ou assigned_user igual ao ID do usuário autenticado);
//   (b) atendimentos que foram compartilhados com ele (via service_record_shares)
//
// O PocketBase executa as coleções list/view requests passando pelo filtro do hook.

onRecordListRequest((e) => {
  var auth = e.auth
  if (!auth) {
    return e.next()
  }

  // Superusuário do PocketBase tem acesso irrestrito
  if (e.hasSuperuserAuth()) {
    return e.next()
  }

  var isMaster = auth.getString('role') === 'Master' || auth.getBool('master_access') === true

  // Master visualiza todos os atendimentos sem restrição
  if (isMaster) {
    return e.next()
  }

  var authId = auth.id
  if (!authId) {
    return e.next()
  }

  // Busca os IDs de atendimentos compartilhados com este usuário
  var sharedRecordIds = []
  try {
    var shares = $app.findRecordsByFilter(
      'service_record_shares',
      "user = '" + authId + "'",
      '',
      500,
      0,
    )
    if (shares && shares.length > 0) {
      for (var i = 0; i < shares.length; i++) {
        var sRecId = shares[i].getString('service_record')
        if (sRecId && sharedRecordIds.indexOf(sRecId) === -1) {
          sharedRecordIds.push(sRecId)
        }
      }
    }
  } catch (err) {
    $app.logger().warn('Erro ao consultar compartilhamentos no hook de service_records: ' + err)
  }

  // Monta a cláusula de permissão do usuário
  var securityFilter = "(user_id = '" + authId + "' || assigned_user = '" + authId + "')"
  if (sharedRecordIds.length > 0) {
    var shareConditions = []
    for (var j = 0; j < sharedRecordIds.length; j++) {
      shareConditions.push("id = '" + sharedRecordIds[j] + "'")
    }
    securityFilter = '(' + securityFilter + ' || (' + shareConditions.join(' || ') + '))'
  }

  // Se já houver um filtro na requisição, combina com AND (&&) garantindo que a restrição de segurança NUNCA seja ultrapassada
  var existingFilter = (e.filter || '').trim()
  if (existingFilter) {
    e.filter = '(' + existingFilter + ') && ' + securityFilter
  } else {
    e.filter = securityFilter
  }

  return e.next()
}, 'service_records')

onRecordViewRequest((e) => {
  var auth = e.auth
  if (!auth) {
    return e.next()
  }

  if (e.hasSuperuserAuth()) {
    return e.next()
  }

  var isMaster = auth.getString('role') === 'Master' || auth.getBool('master_access') === true
  if (isMaster) {
    return e.next()
  }

  var authId = auth.id
  var record = e.record
  if (!record || !authId) {
    return e.next()
  }

  var recordUserId = record.getString('user_id')
  var recordAssignedUser = record.getString('assigned_user')

  // Se for o dono ou responsável direto, permite
  if (recordUserId === authId || recordAssignedUser === authId) {
    return e.next()
  }

  // Verifica se está compartilhado
  try {
    var share = $app.findFirstRecordByData('service_record_shares', 'service_record', record.id)
    if (share && share.getString('user') === authId) {
      return e.next()
    }
    // Ou busca com filtro específico record + user
    var userShares = $app.findRecordsByFilter(
      'service_record_shares',
      "service_record = '" + record.id + "' && user = '" + authId + "'",
      '',
      1,
      0,
    )
    if (userShares && userShares.length > 0) {
      return e.next()
    }
  } catch (_) {}

  return e.forbiddenError('Você não tem permissão para visualizar este atendimento.')
}, 'service_records')
