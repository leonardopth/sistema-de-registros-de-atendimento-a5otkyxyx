migrate(
  (app) => {
    var masterEmail = 'leonardo.thereziano@rexturadvance.com.br'
    var domain = '@rexturadvance.com.br'

    function removeAccents(s) {
      var map = {
        á: 'a',
        à: 'a',
        ã: 'a',
        â: 'a',
        ä: 'a',
        Á: 'a',
        À: 'a',
        Ã: 'a',
        Â: 'a',
        Ä: 'a',
        é: 'e',
        è: 'e',
        ê: 'e',
        ë: 'e',
        É: 'e',
        È: 'e',
        Ê: 'e',
        Ë: 'e',
        í: 'i',
        ì: 'i',
        î: 'i',
        ï: 'i',
        Í: 'i',
        Ì: 'i',
        Î: 'i',
        Ï: 'i',
        ó: 'o',
        ò: 'o',
        õ: 'o',
        ô: 'o',
        ö: 'o',
        Ó: 'o',
        Ò: 'o',
        Õ: 'o',
        Ô: 'o',
        Ö: 'o',
        ú: 'u',
        ù: 'u',
        û: 'u',
        ü: 'u',
        Ú: 'u',
        Ù: 'u',
        Û: 'u',
        Ü: 'u',
        ç: 'c',
        Ç: 'c',
      }
      var result = ''
      for (var i = 0; i < s.length; i++) {
        var ch = s.charAt(i)
        result += map[ch] || ch
      }
      return result
    }

    function nameToEmail(name) {
      var parts = name.toLowerCase().trim().split(/\s+/)
      if (parts.length === 0 || !parts[0]) return null
      var first = removeAccents(parts[0])
      var last = parts.length > 1 ? removeAccents(parts[parts.length - 1]) : ''
      if (last) {
        return first + '.' + last + domain
      }
      return first + domain
    }

    var allUsers = app.findRecordsByFilter('_pb_users_auth_', "id != ''", 'name', 0, 0)

    var existingEmails = {}
    for (var i = 0; i < allUsers.length; i++) {
      var em = allUsers[i].getString('email')
      if (em) {
        existingEmails[em.toLowerCase()] = true
      }
    }

    var updated = 0

    for (var j = 0; j < allUsers.length; j++) {
      var user = allUsers[j]
      var currentEmail = user.getString('email')

      if (currentEmail && currentEmail.trim() !== '') continue
      if (user.getString('email') === masterEmail) continue

      var name = user.getString('name')
      if (!name || name.trim() === '') {
        var fallback = 'usuario.' + user.id.substring(0, 6) + domain
        if (!existingEmails[fallback.toLowerCase()]) {
          user.setEmail(fallback)
          user.setPassword('Skip@Pass')
          app.save(user)
          existingEmails[fallback.toLowerCase()] = true
          updated++
        }
        continue
      }

      var baseEmail = nameToEmail(name)
      if (!baseEmail) continue

      var candidate = baseEmail
      var seq = 2
      var atIdx = baseEmail.lastIndexOf('@')
      var localPart = baseEmail.substring(0, atIdx)
      var domainPart = baseEmail.substring(atIdx)

      while (existingEmails[candidate.toLowerCase()]) {
        candidate = localPart + seq + domainPart
        seq++
      }

      user.setEmail(candidate)
      user.setPassword('Skip@Pass')
      app.save(user)
      existingEmails[candidate.toLowerCase()] = true
      updated++
    }

    console.log('0036_backfill_all_empty_emails: updated ' + updated + ' users')
  },
  (app) => {},
)
