import { useState, useEffect } from 'react'
import { useNavigate } from 'react-router-dom'
import { Bell, CheckCheck, Trash2, BellOff, Settings, CheckCircle2 } from 'lucide-react'
import { Button } from '@/components/ui/button'
import { Popover, PopoverContent, PopoverTrigger } from '@/components/ui/popover'
import { Dialog, DialogContent, DialogHeader, DialogTitle } from '@/components/ui/dialog'
import { ScrollArea } from '@/components/ui/scroll-area'
import {
  getNotifications,
  markNotificationRead,
  markAllNotificationsRead,
  deleteNotification,
  markNotificationResolved,
} from '@/services/notifications'
import { useRealtime } from '@/hooks/use-realtime'
import { NotificationRecord } from '@/types/service_record'
import { TelegramSettings } from '@/components/TelegramSettings'
import { cn } from '@/lib/utils'
import { formatGMT3DateTimeAt } from '@/lib/timezone'

type FilterType = 'all' | 'pending' | 'resolved'

export function NotificationBell() {
  const [notifications, setNotifications] = useState<NotificationRecord[]>([])
  const [open, setOpen] = useState(false)
  const [filter, setFilter] = useState<FilterType>('all')
  const [telegramOpen, setTelegramOpen] = useState(false)
  const navigate = useNavigate()

  const loadNotifications = async () => {
    try {
      setNotifications(await getNotifications())
    } catch (e) {
      console.error(e)
    }
  }

  useEffect(() => {
    loadNotifications()
  }, [])
  useRealtime('notifications', () => loadNotifications())

  const unreadCount = notifications.filter((n) => !n.read).length

  const filtered = notifications.filter((n) => {
    if (filter === 'pending') return !n.resolved
    if (filter === 'resolved') return n.resolved === true
    return true
  })

  const handleClick = async (notif: NotificationRecord) => {
    if (!notif.read) await markNotificationRead(notif.id)
    setOpen(false)
    if (notif.link) navigate(notif.link)
    loadNotifications()
  }

  const handleMarkAll = async () => {
    await markAllNotificationsRead()
    loadNotifications()
  }

  const handleResolved = async (e: React.MouseEvent, id: string) => {
    e.stopPropagation()
    await markNotificationResolved(id)
    loadNotifications()
  }

  const handleDelete = async (e: React.MouseEvent, id: string) => {
    e.stopPropagation()
    await deleteNotification(id)
    loadNotifications()
  }

  return (
    <>
      <Popover open={open} onOpenChange={setOpen}>
        <PopoverTrigger asChild>
          <Button variant="ghost" size="icon" className="relative h-9 w-9 shrink-0">
            <Bell className="h-5 w-5 text-slate-600" />
            {unreadCount > 0 && (
              <span className="absolute -top-0.5 -right-0.5 h-4 min-w-4 px-1 flex items-center justify-center rounded-full bg-rose-500 text-white text-[10px] font-bold animate-fade-in">
                {unreadCount > 99 ? '99+' : unreadCount}
              </span>
            )}
          </Button>
        </PopoverTrigger>
        <PopoverContent align="end" className="w-80 p-0">
          <div className="flex items-center justify-between p-3 border-b">
            <span className="text-sm font-bold text-slate-900">Notificações</span>
            <div className="flex items-center gap-1">
              <Button
                variant="ghost"
                size="icon"
                className="h-7 w-7"
                onClick={() => setTelegramOpen(true)}
              >
                <Settings className="h-3.5 w-3.5 text-slate-500" />
              </Button>
              {unreadCount > 0 && (
                <Button variant="ghost" size="sm" className="text-xs h-7" onClick={handleMarkAll}>
                  <CheckCheck className="h-3.5 w-3.5 mr-1" /> Marcar todas
                </Button>
              )}
            </div>
          </div>
          <div className="flex gap-1 p-2 border-b bg-slate-50">
            {(['all', 'pending', 'resolved'] as FilterType[]).map((f) => (
              <Button
                key={f}
                variant={filter === f ? 'default' : 'ghost'}
                size="sm"
                className={cn(
                  'text-xs h-7 flex-1',
                  filter === f && 'bg-indigo-600 hover:bg-indigo-700',
                )}
                onClick={() => setFilter(f)}
              >
                {f === 'all' ? 'Todas' : f === 'pending' ? 'Pendentes' : 'Resolvidas'}
              </Button>
            ))}
          </div>
          <ScrollArea className="h-[280px]">
            {filtered.length === 0 ? (
              <div className="flex flex-col items-center justify-center py-8 text-slate-400">
                <BellOff className="h-8 w-8 mb-2" />
                <p className="text-xs">Nenhuma notificação</p>
              </div>
            ) : (
              <div className="divide-y">
                {filtered.map((notif) => (
                  <div
                    key={notif.id}
                    className={cn(
                      'p-3 hover:bg-slate-50 cursor-pointer group',
                      !notif.read && 'bg-cyan-50/50',
                      notif.resolved && 'opacity-60',
                    )}
                    onClick={() => handleClick(notif)}
                  >
                    <div className="flex items-start gap-2">
                      <span
                        className={cn(
                          'h-2 w-2 rounded-full mt-1.5 shrink-0',
                          notif.read ? 'bg-slate-300' : 'bg-cyan-500',
                        )}
                      />
                      <div className="flex-1 min-w-0">
                        <p className="text-xs font-bold text-slate-900">{notif.title}</p>
                        <p className="text-xs text-slate-600 mt-0.5">{notif.message}</p>
                        <p className="text-[10px] text-slate-400 mt-1">
                          {notif.created ? formatGMT3DateTimeAt(notif.created) : ''}
                        </p>
                      </div>
                      <div className="flex items-center gap-0.5 opacity-0 group-hover:opacity-100 transition-opacity">
                        {(notif.type === 'alert' ||
                          notif.type === 'warning' ||
                          notif.type === 'error') &&
                          !notif.resolved && (
                            <Button
                              variant="ghost"
                              size="icon"
                              className="h-6 w-6"
                              onClick={(e) => handleResolved(e, notif.id)}
                            >
                              <CheckCircle2 className="h-3 w-3 text-emerald-500" />
                            </Button>
                          )}
                        <Button
                          variant="ghost"
                          size="icon"
                          className="h-6 w-6"
                          onClick={(e) => handleDelete(e, notif.id)}
                        >
                          <Trash2 className="h-3 w-3 text-slate-400" />
                        </Button>
                      </div>
                    </div>
                  </div>
                ))}
              </div>
            )}
          </ScrollArea>
        </PopoverContent>
      </Popover>
      <Dialog open={telegramOpen} onOpenChange={setTelegramOpen}>
        <DialogContent className="sm:max-w-[400px]">
          <DialogHeader>
            <DialogTitle className="text-base font-bold">Configurar Telegram</DialogTitle>
          </DialogHeader>
          <TelegramSettings onSaved={() => setTelegramOpen(false)} />
        </DialogContent>
      </Dialog>
    </>
  )
}
