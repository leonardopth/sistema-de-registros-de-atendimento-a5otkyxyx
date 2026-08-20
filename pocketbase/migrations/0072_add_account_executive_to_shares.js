migrate(
  (app) => {
    // 1. Torna user opcional em service_record_shares e adiciona account_executive (relação com account_executives)
    const sharesCol = app.findCollectionByNameOrId('service_record_shares')
    const userField = sharesCol.fields.getByName('user')
    if (userField) {
      userField.required = false
    }

    if (!sharesCol.fields.getByName('account_executive')) {
      const execsCol = app.findCollectionByNameOrId('account_executives')
      sharesCol.fields.add(
        new RelationField({
          name: 'account_executive',
          collectionId: execsCol.id,
          required: false,
          maxSelect: 1,
        }),
      )
    }

    sharesCol.listRule =
      "@request.auth.id != '' && (user = @request.auth.id || shared_by = @request.auth.id || @request.auth.role = 'Master' || @request.auth.master_access = true || @request.auth.role = 'Gerentes' || @request.auth.role = 'Supervisores' || @request.auth.role = 'Líderes' || @request.auth.role = 'Executivo de contas')"
    sharesCol.viewRule =
      "@request.auth.id != '' && (user = @request.auth.id || shared_by = @request.auth.id || @request.auth.role = 'Master' || @request.auth.master_access = true || @request.auth.role = 'Gerentes' || @request.auth.role = 'Supervisores' || @request.auth.role = 'Líderes' || @request.auth.role = 'Executivo de contas')"

    app.save(sharesCol)
  },
  (app) => {
    try {
      const sharesCol = app.findCollectionByNameOrId('service_record_shares')
      const execField = sharesCol.fields.getByName('account_executive')
      if (execField) {
        sharesCol.fields.removeByName('account_executive')
        app.save(sharesCol)
      }
    } catch (_) {}
  },
)
