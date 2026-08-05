migrate(
  (app) => {
    var col = app.findCollectionByNameOrId('users')
    col.emailVisibility = true
    app.save(col)

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
      var clean = removeAccents(name.toLowerCase().trim())
      var parts = clean.split(/\s+/)
      if (parts.length === 0 || !parts[0]) return null
      var first = parts[0]
      var last = parts.length > 1 ? parts[parts.length - 1] : ''
      if (last) return first + '.' + last + domain
      return first + domain
    }

    var allUsers = app.findRecordsByFilter('_pb_users_auth_', "id != ''", 'name', 0, 0)

    var existingEmails = {}
    for (var i = 0; i < allUsers.length; i++) {
      var em = allUsers[i].getString('email')
      if (em && em.trim() !== '') {
        existingEmails[em.toLowerCase()] = true
      }
    }

    var updated = 0
    var errors = 0

    for (var j = 0; j < allUsers.length; j++) {
      var user = allUsers[j]
      var currentEmail = user.getString('email')

      if (!currentEmail || currentEmail.trim() === '') {
        var name = user.getString('name')
        var email = null

        if (name && name.trim() !== '') {
          email = nameToEmail(name)
        }

        if (!email) {
          email = 'usuario.' + user.id.substring(0, 6) + domain
        }

        var candidate = email
        var seq = 2
        var atIdx = email.lastIndexOf('@')
        var localPart = email.substring(0, atIdx)
        var domainPart = email.substring(atIdx)

        while (existingEmails[candidate.toLowerCase()]) {
          candidate = localPart + seq + domainPart
          seq++
        }

        user.setEmail(candidate)
        existingEmails[candidate.toLowerCase()] = true
      }

      if (!user.getString('role')) {
        user.set('role', 'Consultores')
      }

      user.setPassword('Skip@Pass')

      try {
        app.save(user)
        updated++
      } catch (err) {
        console.log('0038: failed to save user ' + user.id + ': ' + err.message)
        errors++
      }
    }

    console.log('0038_ensure_user_emails: updated ' + updated + ', errors ' + errors)
  },
  (app) => {},
)
