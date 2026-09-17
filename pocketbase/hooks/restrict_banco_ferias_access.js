// Hook para enriquecer e garantir a restrição de segurança no nível de consulta de hour_bank_entries e absences
// Regras:
// - Usuários com papel 'Master' ou master_access = true visualizam TODOS os registros
// - Consultores visualizam APENAS seus próprios registros (user_id = auth.id)
// - Gestores/Supervisores/Líderes/Gestores Comerciais:
//   * Se tiverem service_groups: visualizam registros de colaboradores que compartilham ao menos um grupo ou do próprio usuário
//   * Se não tiverem restrição de grupos (ex: Gerente geral): visualizam todos os registros
//   * Também inclui registros onde user_id = auth.id (eles próprios)
//
// O PocketBase executa as coleções list/view requests passando pelo filtro do hook.

// -------------------------------------------------------------
// 1. HOUR_BANK_ENTRIES (List & View)
// -------------------------------------------------------------

onRecordsListRequest((e) => {
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
  if (!authId) {
    return e.next()
  }

  var role = auth.getString('role')
  var isManager =
    role === 'Gerente' || role === 'Supervisor' || role === 'Líder' || role === 'Gestor Comercial'

  var securityFilter = ''
  if (!isManager) {
    // Consultor ou outros colaboradores: somente os próprios registros
    securityFilter = "user_id = '" + authId + "'"
  } else {
    var serviceGroups = auth.get('service_groups') || []
    var groupArr = []
    if (Array.isArray(serviceGroups)) {
      groupArr = serviceGroups
    } else if (typeof serviceGroups === 'string' && serviceGroups.length > 0) {
      try {
        groupArr = JSON.parse(serviceGroups)
      } catch (_) {
        groupArr = [serviceGroups]
      }
    }

    if (groupArr.length === 0 && (role === 'Gerente' || role === 'Gestor Comercial')) {
      // Gestor irrestrito
      return e.next()
    }

    var allowedUserIds = [authId]
    if (groupArr.length > 0) {
      try {
        var groupConditions = []
        for (var g = 0; g < groupArr.length; g++) {
          var grp = groupArr[g]
          if (grp) {
            groupConditions.push("service_groups ~ '" + grp + "'")
          }
        }
        var filterStr =
          groupConditions.length > 0 ? groupConditions.join(' || ') : "id = '" + authId + "'"
        var teamUsers = $app.findRecordsByFilter('users', filterStr, '', 500, 0)
        if (teamUsers && teamUsers.length > 0) {
          for (var u = 0; u < teamUsers.length; u++) {
            var uid = teamUsers[u].id
            if (uid && allowedUserIds.indexOf(uid) === -1) {
              allowedUserIds.push(uid)
            }
          }
        }
      } catch (err) {
        $app.logger().warn('Erro ao consultar equipe no hook de hour_bank_entries: ' + err)
      }
    }

    var parts = []
    for (var i = 0; i < allowedUserIds.length; i++) {
      parts.push("user_id = '" + allowedUserIds[i] + "'")
    }
    securityFilter = '(' + parts.join(' || ') + ')'
  }

  var existingFilter = (e.filter || '').trim()
  if (existingFilter) {
    e.filter = '(' + existingFilter + ') && ' + securityFilter
  } else {
    e.filter = securityFilter
  }

  return e.next()
}, 'hour_bank_entries')

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
  if (recordUserId === authId) {
    return e.next()
  }

  var role = auth.getString('role')
  var isManager =
    role === 'Gerente' || role === 'Supervisor' || role === 'Líder' || role === 'Gestor Comercial'

  if (!isManager) {
    return e.forbiddenError(
      'Você não tem permissão para visualizar este registro de banco de horas.',
    )
  }

  var serviceGroups = auth.get('service_groups') || []
  var groupArr = []
  if (Array.isArray(serviceGroups)) {
    groupArr = serviceGroups
  } else if (typeof serviceGroups === 'string' && serviceGroups.length > 0) {
    try {
      groupArr = JSON.parse(serviceGroups)
    } catch (_) {
      groupArr = [serviceGroups]
    }
  }

  if (groupArr.length === 0 && (role === 'Gerente' || role === 'Gestor Comercial')) {
    return e.next()
  }

  var allowedUserIds = [authId]
  if (groupArr.length > 0) {
    try {
      var groupConditions = []
      for (var g = 0; g < groupArr.length; g++) {
        var grp = groupArr[g]
        if (grp) {
          groupConditions.push("service_groups ~ '" + grp + "'")
        }
      }
      var filterStr =
        groupConditions.length > 0 ? groupConditions.join(' || ') : "id = '" + authId + "'"
      var teamUsers = $app.findRecordsByFilter('users', filterStr, '', 500, 0)
      if (teamUsers && teamUsers.length > 0) {
        for (var u = 0; u < teamUsers.length; u++) {
          var uid = teamUsers[u].id
          if (uid && allowedUserIds.indexOf(uid) === -1) {
            allowedUserIds.push(uid)
          }
        }
      }
    } catch (err) {
      $app.logger().warn('Erro ao consultar equipe no hook de hour_bank_entries view: ' + err)
    }
  }

  if (allowedUserIds.indexOf(recordUserId) !== -1) {
    return e.next()
  }

  return e.forbiddenError(
    'Você não tem permissão para visualizar o banco de horas de colaboradores fora do seu escopo.',
  )
}, 'hour_bank_entries')

// -------------------------------------------------------------
// 2. ABSENCES (List & View)
// -------------------------------------------------------------

onRecordsListRequest((e) => {
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
  if (!authId) {
    return e.next()
  }

  var role = auth.getString('role')
  var isManager =
    role === 'Gerente' || role === 'Supervisor' || role === 'Líder' || role === 'Gestor Comercial'

  var securityFilter = ''
  if (!isManager) {
    // Consultor ou outros colaboradores: apenas suas próprias ausências
    securityFilter = "user_id = '" + authId + "'"
  } else {
    var serviceGroups = auth.get('service_groups') || []
    var groupArr = []
    if (Array.isArray(serviceGroups)) {
      groupArr = serviceGroups
    } else if (typeof serviceGroups === 'string' && serviceGroups.length > 0) {
      try {
        groupArr = JSON.parse(serviceGroups)
      } catch (_) {
        groupArr = [serviceGroups]
      }
    }

    if (groupArr.length === 0 && (role === 'Gerente' || role === 'Gestor Comercial')) {
      return e.next()
    }

    var allowedUserIds = [authId]
    if (groupArr.length > 0) {
      try {
        var groupConditions = []
        for (var g = 0; g < groupArr.length; g++) {
          var grp = groupArr[g]
          if (grp) {
            groupConditions.push("service_groups ~ '" + grp + "'")
          }
        }
        var filterStr =
          groupConditions.length > 0 ? groupConditions.join(' || ') : "id = '" + authId + "'"
        var teamUsers = $app.findRecordsByFilter('users', filterStr, '', 500, 0)
        if (teamUsers && teamUsers.length > 0) {
          for (var u = 0; u < teamUsers.length; u++) {
            var uid = teamUsers[u].id
            if (uid && allowedUserIds.indexOf(uid) === -1) {
              allowedUserIds.push(uid)
            }
          }
        }
      } catch (err) {
        $app.logger().warn('Erro ao consultar equipe no hook de absences: ' + err)
      }
    }

    var parts = []
    for (var i = 0; i < allowedUserIds.length; i++) {
      parts.push("user_id = '" + allowedUserIds[i] + "'")
    }
    securityFilter = '(' + parts.join(' || ') + ')'
  }

  var existingFilter = (e.filter || '').trim()
  if (existingFilter) {
    e.filter = '(' + existingFilter + ') && ' + securityFilter
  } else {
    e.filter = securityFilter
  }

  return e.next()
}, 'absences')

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
  if (recordUserId === authId) {
    return e.next()
  }

  var role = auth.getString('role')
  var isManager =
    role === 'Gerente' || role === 'Supervisor' || role === 'Líder' || role === 'Gestor Comercial'

  if (!isManager) {
    return e.forbiddenError('Você não tem permissão para visualizar esta ausência.')
  }

  var serviceGroups = auth.get('service_groups') || []
  var groupArr = []
  if (Array.isArray(serviceGroups)) {
    groupArr = serviceGroups
  } else if (typeof serviceGroups === 'string' && serviceGroups.length > 0) {
    try {
      groupArr = JSON.parse(serviceGroups)
    } catch (_) {
      groupArr = [serviceGroups]
    }
  }

  if (groupArr.length === 0 && (role === 'Gerente' || role === 'Gestor Comercial')) {
    return e.next()
  }

  var allowedUserIds = [authId]
  if (groupArr.length > 0) {
    try {
      var groupConditions = []
      for (var g = 0; g < groupArr.length; g++) {
        var grp = groupArr[g]
        if (grp) {
          groupConditions.push("service_groups ~ '" + grp + "'")
        }
      }
      var filterStr =
        groupConditions.length > 0 ? groupConditions.join(' || ') : "id = '" + authId + "'"
      var teamUsers = $app.findRecordsByFilter('users', filterStr, '', 500, 0)
      if (teamUsers && teamUsers.length > 0) {
        for (var u = 0; u < teamUsers.length; u++) {
          var uid = teamUsers[u].id
          if (uid && allowedUserIds.indexOf(uid) === -1) {
            allowedUserIds.push(uid)
          }
        }
      }
    } catch (err) {
      $app.logger().warn('Erro ao consultar equipe no hook de absences view: ' + err)
    }
  }

  if (allowedUserIds.indexOf(recordUserId) !== -1) {
    return e.next()
  }

  return e.forbiddenError(
    'Você não tem permissão para visualizar ausências de colaboradores fora do seu escopo.',
  )
}, 'absences')
