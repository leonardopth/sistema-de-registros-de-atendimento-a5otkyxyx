// PocketBase hook: on_absence_workflow_notification.js
// Dispara notificações (sino) e e-mails no ciclo de vida de ausências:
// 1. Criação de ausência Pendente -> notifica os gestores do Núcleo / Master
// 2. Atualização de status para 'Aprovada' ou 'Rejeitada' -> notifica o colaborador solicitante

// Ao criar ausência
onRecordAfterCreateSuccess((e) => {
  try {
    var absence = e.record
    var status = absence.getString('status')
    var userId = absence.getString('user_id')
    var reason = absence.getString('reason')
    var start = absence.getString('start_date').substring(0, 10)
    var end = absence.getString('end_date').substring(0, 10)

    var requester = $app.findRecordById('users', userId)
    var requesterName = requester.getString('name') || 'Colaborador'

    // Se foi criada como Pendente de aprovação, avisa os gestores
    if (status === 'Pendente') {
      var matchedManagers = []
      try {
        var uGroups = requester.get('service_groups') || []
        var allManagers = $app.findRecordsByFilter(
          'users',
          "role = 'Gerente' || role = 'Supervisor' || role = 'Líder' || role = 'Master' || master_access = true",
          'name',
          0,
          0,
        )

        for (var mg = 0; mg < allManagers.length; mg++) {
          var mgr = allManagers[mg]
          if (mgr.id === requester.id) continue

          var mgrRole = mgr.getString('role') || ''
          var mgrGroups = mgr.get('service_groups') || []

          if (
            mgrRole === 'Master' ||
            mgr.getBool('master_access') ||
            (mgrRole === 'Gerente' && mgrGroups.length === 0)
          ) {
            matchedManagers.push(mgr)
            continue
          }

          var match = false
          for (var a = 0; a < uGroups.length; a++) {
            for (var b = 0; b < mgrGroups.length; b++) {
              if (uGroups[a] === mgrGroups[b]) {
                match = true
                break
              }
            }
            if (match) break
          }

          if (match) {
            matchedManagers.push(mgr)
          }
        }
      } catch (mFindErr) {
        $app
          .logger()
          .error('Erro ao buscar gestores no hook de ausência create:', 'error', String(mFindErr))
      }

      var title = 'Nova solicitação de ausência: ' + requesterName
      var msg =
        requesterName +
        ' solicitou agendamento de ' +
        reason +
        ' para o período de ' +
        start +
        ' a ' +
        end +
        '. Acesse a Central de Aprovações para avaliar.'
      var link = '/banco-horas-ferias?tab=aprovacoes'

      var notifCol = $app.findCollectionByNameOrId('notifications')

      for (var i = 0; i < matchedManagers.length; i++) {
        var targetUser = matchedManagers[i]
        // 1. Sino
        try {
          var notif = new Record(notifCol)
          notif.set('user_id', targetUser.id)
          notif.set('title', title)
          notif.set('message', msg)
          notif.set('type', 'approval')
          notif.set('read', false)
          notif.set('link', link)
          $app.save(notif)
        } catch (sinoErr) {
          $app.logger().error('Erro ao criar sino de ausência pendente:', 'error', String(sinoErr))
        }

        // 2. Email
        var email = targetUser.getString('email')
        var notifEnabled = targetUser.get('email_notifications')
        if (notifEnabled !== false && email && email.indexOf('@') > 0) {
          try {
            var senderAddress = 'noreply@rexturadvance.com.br'
            var senderName = 'Sistema de Registros de Atendimento'
            try {
              if ($app.settings() && $app.settings().meta && $app.settings().meta.senderAddress) {
                senderAddress = $app.settings().meta.senderAddress
                senderName = $app.settings().meta.senderName || senderName
              }
            } catch (_) {}

            var html =
              '<!DOCTYPE html><html><head><meta charset="utf-8"></head>' +
              '<body style="font-family: -apple-system, BlinkMacSystemFont, Segoe UI, Roboto, sans-serif; background: #f8fafc; padding: 20px; color: #334155;">' +
              '<div style="max-width: 560px; margin: 0 auto; background: #ffffff; border: 1px solid #e2e8f0; border-radius: 8px; overflow: hidden;">' +
              '<div style="background-color: #4f46e5; padding: 16px 20px; color: #ffffff;">' +
              '<h2 style="margin: 0; font-size: 16px;">' +
              title +
              '</h2>' +
              '</div>' +
              '<div style="padding: 20px;">' +
              '<p style="font-size: 14px; margin-top: 0;">Olá ' +
              targetUser.getString('name') +
              ',</p>' +
              '<p style="font-size: 14px; line-height: 1.5;">' +
              msg +
              '</p>' +
              '<div style="margin-top: 24px; text-align: center;">' +
              '<a href="/banco-horas-ferias?tab=aprovacoes" style="background: #4f46e5; color: #ffffff; text-decoration: none; padding: 10px 18px; border-radius: 6px; font-weight: 600; font-size: 13px; display: inline-block;">Acessar Central de Aprovações</a>' +
              '</div>' +
              '</div></div></body></html>'

            var mail = new MailerMessage({
              from: { address: senderAddress, name: senderName },
              to: [{ address: email, name: targetUser.getString('name') }],
              subject: '[Banco de Horas & Férias] ' + title,
              html: html,
            })
            $app.newMailClient().send(mail)
          } catch (mErr) {
            $app
              .logger()
              .error('Erro ao enviar e-mail de ausência pendente:', 'error', String(mErr))
          }
        }
      }
    }
  } catch (err) {
    $app.logger().error('Erro no hook onRecordAfterCreateSuccess (absences):', 'error', String(err))
  }
  return e.next()
}, 'absences')

// Ao atualizar ausência (Aprovação / Rejeição / Cancelamento)
onRecordAfterUpdateSuccess((e) => {
  try {
    var oldStatus = e.record.original().getString('status')
    var newStatus = e.record.getString('status')

    if (oldStatus === newStatus) return e.next()

    var userId = e.record.getString('user_id')
    var requester = $app.findRecordById('users', userId)
    var reason = e.record.getString('reason')
    var start = e.record.getString('start_date').substring(0, 10)
    var end = e.record.getString('end_date').substring(0, 10)
    var notes = e.record.getString('approval_notes')
    var rejectionReason = e.record.getString('rejection_reason')

    var notifCol = $app.findCollectionByNameOrId('notifications')

    function notifyUser(targetUser, title, msg, link, type) {
      if (!targetUser) return
      try {
        var notif = new Record(notifCol)
        notif.set('user_id', targetUser.id)
        notif.set('title', title)
        notif.set('message', msg)
        notif.set('type', type || 'info')
        notif.set('read', false)
        notif.set('link', link || '/banco-horas-ferias?tab=minha-situacao')
        $app.save(notif)
      } catch (sinoErr) {
        $app
          .logger()
          .error('Erro ao criar notificação de ausência (update):', 'error', String(sinoErr))
      }

      var email = targetUser.getString('email')
      var notifEnabled = targetUser.get('email_notifications')
      if (notifEnabled !== false && email && email.indexOf('@') > 0) {
        try {
          var senderAddress = 'noreply@rexturadvance.com.br'
          var senderName = 'Sistema de Registros de Atendimento'
          try {
            if ($app.settings() && $app.settings().meta && $app.settings().meta.senderAddress) {
              senderAddress = $app.settings().meta.senderAddress
              senderName = $app.settings().meta.senderName || senderName
            }
          } catch (_) {}

          var html =
            '<!DOCTYPE html><html><head><meta charset="utf-8"></head>' +
            '<body style="font-family: -apple-system, BlinkMacSystemFont, Segoe UI, Roboto, sans-serif; background: #f8fafc; padding: 20px; color: #334155;">' +
            '<div style="max-width: 560px; margin: 0 auto; background: #ffffff; border: 1px solid #e2e8f0; border-radius: 8px; overflow: hidden;">' +
            '<div style="background-color: #4f46e5; padding: 16px 20px; color: #ffffff;">' +
            '<h2 style="margin: 0; font-size: 16px;">' +
            title +
            '</h2>' +
            '</div>' +
            '<div style="padding: 20px;">' +
            '<p style="font-size: 14px; margin-top: 0;">Olá ' +
            targetUser.getString('name') +
            ',</p>' +
            '<p style="font-size: 14px; line-height: 1.5;">' +
            msg +
            '</p>' +
            '<div style="margin-top: 24px; text-align: center;">' +
            '<a href="' +
            link +
            '" style="background: #4f46e5; color: #ffffff; text-decoration: none; padding: 10px 18px; border-radius: 6px; font-weight: 600; font-size: 13px; display: inline-block;">Ver Detalhes no Sistema</a>' +
            '</div>' +
            '</div></div></body></html>'

          var mail = new MailerMessage({
            from: { address: senderAddress, name: senderName },
            to: [{ address: email, name: targetUser.getString('name') }],
            subject: '[Banco de Horas & Férias] ' + title,
            html: html,
          })
          $app.newMailClient().send(mail)
        } catch (mErr) {
          $app.logger().error('Erro ao enviar e-mail de ausência update:', 'error', String(mErr))
        }
      }
    }

    var defaultLink = '/banco-horas-ferias?tab=minha-situacao'

    if (newStatus === 'Aprovada') {
      var okTitle = 'Ausência Aprovada: ' + reason
      var okMsg =
        'Sua solicitação de ' +
        reason +
        ' para o período de ' +
        start +
        ' a ' +
        end +
        ' foi aprovada pelo gestor!'
      if (notes) {
        okMsg += ' Observação: ' + notes
      }
      notifyUser(requester, okTitle, okMsg, defaultLink, 'success')
    } else if (newStatus === 'Rejeitada') {
      var rejTitle = 'Solicitação de Ausência Rejeitada: ' + reason
      var rejMsg =
        'Sua solicitação de ' +
        reason +
        ' para o período de ' +
        start +
        ' a ' +
        end +
        ' foi rejeitada pelo gestor.'
      if (rejectionReason) {
        rejMsg += ' Motivo da rejeição: ' + rejectionReason + '.'
      }
      if (notes) {
        rejMsg += ' Observações: ' + notes + '.'
      }
      notifyUser(requester, rejTitle, rejMsg, defaultLink, 'error')
    } else if (newStatus === 'Cancelada') {
      if (oldStatus === 'Aprovada' || oldStatus === 'Pendente') {
        var uGroups = requester.get('service_groups') || []
        var allManagers = $app.findRecordsByFilter(
          'users',
          "role = 'Gerente' || role = 'Supervisor' || role = 'Líder' || role = 'Master' || master_access = true",
          'name',
          0,
          0,
        )
        var cancTitle = 'Ausência Cancelada: ' + requester.getString('name')
        var cancMsg =
          requester.getString('name') +
          ' cancelou a solicitação de ' +
          reason +
          ' (' +
          start +
          ' a ' +
          end +
          ').'

        for (var c = 0; c < allManagers.length; c++) {
          var m = allManagers[c]
          if (m.id === requester.id) continue
          var mRole = m.getString('role') || ''
          var mGroups = m.get('service_groups') || []

          var canSee =
            mRole === 'Master' ||
            m.getBool('master_access') ||
            (mRole === 'Gerente' && mGroups.length === 0)

          if (!canSee) {
            for (var x = 0; x < uGroups.length; x++) {
              for (var y = 0; y < mGroups.length; y++) {
                if (uGroups[x] === mGroups[y]) {
                  canSee = true
                  break
                }
              }
              if (canSee) break
            }
          }

          if (canSee) {
            notifyUser(m, cancTitle, cancMsg, '/banco-horas-ferias?tab=calendario', 'info')
          }
        }
      }
    }
  } catch (err) {
    $app.logger().error('Erro no hook onRecordAfterUpdateSuccess (absences):', 'error', String(err))
  }
  return e.next()
}, 'absences')
