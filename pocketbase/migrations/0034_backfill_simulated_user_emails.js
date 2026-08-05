migrate(
  (app) => {
    var masterEmail = 'leonardo.thereziano@rexturadvance.com.br'

    var userNames = [
      'Marcelo Ribeiro',
      'Ana Paula Costa',
      'Felipe Alves',
      'Juliana Freitas',
      'Ricardo Nunes',
      'Patrícia Santos',
      'Gustavo Pinto',
      'Camila Ferreira',
      'Lucas Oliveira',
      'Bruno Carvalho',
      'Daniela Martins',
      'Eduardo Gomes',
      'Ana Carolina Pereira',
      'Roberto Mendes',
      'Fernanda Lima',
    ]

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
      var first = removeAccents(parts[0])
      var last = removeAccents(parts[parts.length - 1])
      return first + '.' + last + '@rexturadvance.com.br'
    }

    var updated = 0

    for (var i = 0; i < userNames.length; i++) {
      var name = userNames[i]
      var expectedEmail = nameToEmail(name)

      var user = null

      try {
        user = app.findFirstRecordByData('_pb_users_auth_', 'name', name)
      } catch (_) {
        try {
          user = app.findAuthRecordByEmail('_pb_users_auth_', expectedEmail)
        } catch (_2) {
          continue
        }
      }

      if (!user) continue
      if (user.getString('email') === masterEmail) continue
      if (user.getString('email') === expectedEmail) continue

      user.setEmail(expectedEmail)
      user.setPassword('Skip@Pass')
      app.save(user)
      updated++
    }

    console.log('0034_backfill_simulated_user_emails: updated ' + updated + ' users')
  },
  (app) => {},
)
