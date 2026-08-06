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
        result += map[s.charAt(i)] || s.charAt(i)
      }
      return result
    }

    function nameToEmail(name) {
      var clean = removeAccents(name.toLowerCase().trim())
      clean = clean.replace(/[^a-z0-9\s]/g, '')
      var rawParts = clean.split(/\s+/)
      var parts = []
      for (var k = 0; k < rawParts.length; k++) {
        if (rawParts[k].length > 0) parts.push(rawParts[k])
      }
      if (parts.length === 0) return null
      var first = parts[0]
      var last = parts.length > 1 ? parts[parts.length - 1] : ''
      return last ? first + '.' + last + domain : first + domain
    }

    var allUsers
    try {
      allUsers = app.findRecordsByFilter('_pb_users_auth_', "id != ''", 'created', 0, 0)
    } catch (e) {
      console.log('0047: error fetching users: ' + e.message)
      return
    }

    var existingEmails = {}
    for (var i = 0; i < allUsers.length; i++) {
      var em = allUsers[i].getString('email')
      if (em && em.trim() !== '') {
        existingEmails[em.toLowerCase()] = true
      }
    }

    var updated = 0
    var skipped = 0

    for (var j = 0; j < allUsers.length; j++) {
      var user = allUsers[j]
      var currentEmail = user.getString('email')
      var hasValidEmail = currentEmail && currentEmail.trim() !== ''

      if (hasValidEmail) {
        skipped++
        continue
      }

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

      try {
        user.setEmail(candidate)
        if (!user.getString('role')) {
          user.set('role', 'Consultores')
        }
        app.save(user)
        existingEmails[candidate.toLowerCase()] = true
        updated++
      } catch (err) {
        console.log('0047: failed to save user ' + user.id + ': ' + err.message)
      }
    }

    console.log(
      '0047: emailVisibility=true, updated=' +
        updated +
        ' skipped=' +
        skipped +
        ' total=' +
        allUsers.length,
    )
  },
  (app) => {},
)
