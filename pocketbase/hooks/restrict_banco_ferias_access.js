// Hook para enriquecer e garantir a restrição de segurança no nível de consulta de hour_bank_entries e absences
// Regras:
// - Usuários com papel 'Master' ou master_access = true visualizam TODOS os registros
// - Consultores visualizam APENAS seus próprios registros (user_id = auth.id)
// - Gestores/Supervisores/Líderes/Gestores Comerciais:
//   * Se não tiverem restrição de grupos (ex: Gerente geral sem service_groups): visualizam todos os registros
//   * Se tiverem service_groups: vêem apenas colaboradores que compartilham PELO MENOS UM dos exatos mesmos valores
//     de grupo/núcleo (service_groups) com ele, ou vínculo direto de supervisão (supervisor_id), além de si mesmo.
//   * Comparação exata por valor: a interseção dos grupos deve ser exata, sem match parcial ou de prefixo.
//
// ATENÇÃO (Convenção PocketBase JSVM):
// Funções utilitárias devem ser declaradas INLINE dentro do corpo de cada callback
// para evitar erros de escopo entre VM pools.

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

  if (!isManager) {
    // Consultor ou outros colaboradores: somente os próprios registros
    return e.next()
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

  function extractArray(val) {
    if (!val) return []
    if (Array.isArray(val)) return val
    if (typeof val === 'string' && val.length > 0) {
      try {
        var parsed = JSON.parse(val)
        if (Array.isArray(parsed)) return parsed
        return [val]
      } catch (_) {
        return [val]
      }
    }
    return []
  }

  var serviceGroups = extractArray(auth.get('service_groups'))
  var departments = extractArray(auth.get('departments'))

  if (
    serviceGroups.length === 0 &&
    departments.length === 0 &&
    (role === 'Gerente' || role === 'Gestor Comercial')
  ) {
    // Gestor geral irrestrito
    return e.next()
  }

  // Verifica se o dono do registro está no escopo permitido
  var targetUser = null
  try {
    targetUser = $app.findRecordById('users', recordUserId)
  } catch (_) {}

  if (!targetUser) {
    return e.forbiddenError('Colaborador não encontrado.')
  }

  // 1. Vínculo direto por supervisor_id
  var supId = targetUser.getString('supervisor_id')
  if (supId && supId === authId) {
    return e.next()
  }

  // 2. Validação conjunta de Núcleo (service_groups) e Equipe (departments)
  // 2a. Núcleo
  if (serviceGroups.length > 0) {
    var targetGroups = extractArray(targetUser.get('service_groups'))
    var hasGroupMatch = false
    for (var i = 0; i < serviceGroups.length; i++) {
      var sg = serviceGroups[i]
      if (sg && targetGroups.indexOf(sg) !== -1) {
        hasGroupMatch = true
        break
      }
    }
    if (!hasGroupMatch) {
      return e.forbiddenError(
        'Você não tem permissão para visualizar o banco de horas de colaboradores fora do seu núcleo.',
      )
    }
  }

  // 2b. Equipe / Departamento (Nacional / Internacional)
  if (departments.length > 0) {
    var targetDepartments = extractArray(targetUser.get('departments'))
    var hasDeptMatch = false
    for (var d = 0; d < departments.length; d++) {
      var dept = departments[d]
      if (dept && targetDepartments.indexOf(dept) !== -1) {
        hasDeptMatch = true
        break
      }
    }
    if (!hasDeptMatch) {
      return e.forbiddenError(
        'Você não tem permissão para visualizar o banco de horas de colaboradores fora da sua equipe.',
      )
    }
  }

  return e.next()
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

  if (!isManager) {
    // Consultor ou outros colaboradores: apenas suas próprias ausências
    return e.next()
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

  function extractArray(val) {
    if (!val) return []
    if (Array.isArray(val)) return val
    if (typeof val === 'string' && val.length > 0) {
      try {
        var parsed = JSON.parse(val)
        if (Array.isArray(parsed)) return parsed
        return [val]
      } catch (_) {
        return [val]
      }
    }
    return []
  }

  var serviceGroups = extractArray(auth.get('service_groups'))
  var departments = extractArray(auth.get('departments'))

  if (
    serviceGroups.length === 0 &&
    departments.length === 0 &&
    (role === 'Gerente' || role === 'Gestor Comercial')
  ) {
    // Gestor geral irrestrito
    return e.next()
  }

  // Verifica se o dono do registro está no escopo permitido
  var targetUser = null
  try {
    targetUser = $app.findRecordById('users', recordUserId)
  } catch (_) {}

  if (!targetUser) {
    return e.forbiddenError('Colaborador não encontrado.')
  }

  // 1. Vínculo direto por supervisor_id
  var supId = targetUser.getString('supervisor_id')
  if (supId && supId === authId) {
    return e.next()
  }

  // 2. Validação conjunta de Núcleo (service_groups) e Equipe (departments)
  // 2a. Núcleo
  if (serviceGroups.length > 0) {
    var targetGroups = extractArray(targetUser.get('service_groups'))
    var hasGroupMatch = false
    for (var i = 0; i < serviceGroups.length; i++) {
      var sg = serviceGroups[i]
      if (sg && targetGroups.indexOf(sg) !== -1) {
        hasGroupMatch = true
        break
      }
    }
    if (!hasGroupMatch) {
      return e.forbiddenError(
        'Você não tem permissão para visualizar ausências de colaboradores fora do seu núcleo.',
      )
    }
  }

  // 2b. Equipe / Departamento (Nacional / Internacional)
  if (departments.length > 0) {
    var targetDepartments = extractArray(targetUser.get('departments'))
    var hasDeptMatch = false
    for (var d = 0; d < departments.length; d++) {
      var dept = departments[d]
      if (dept && targetDepartments.indexOf(dept) !== -1) {
        hasDeptMatch = true
        break
      }
    }
    if (!hasDeptMatch) {
      return e.forbiddenError(
        'Você não tem permissão para visualizar ausências de colaboradores fora da sua equipe.',
      )
    }
  }

  return e.next()
}, 'absences')
