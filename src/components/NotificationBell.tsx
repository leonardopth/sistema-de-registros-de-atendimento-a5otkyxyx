import { useState, useEffect } from 'react'
import { useNavigate } from 'react-router-dom'
import { Bell, CheckCheck, Trash2, BellOff } from 'lucide-react'
import { Button } from '@/components/ui/button'
import { Popover, PopoverContent, PopoverTrigger } from '@/components/ui/popover'
import { ScrollArea } from '@/components/ui/scroll-area'
import {
  getNotifications,
  markNotificationRead,
  markAllNotificationsRead,
  deleteNotification,
} from '@/services/notifications'
import { useRealtime } from '@/hooks/use-realtime'
import { NotificationRecord } from '@/types/service_record'
import { cn } from '@/lib/utils'
import { format } from 'date-fns'
import { ptBR } from 'date-fns/locale'

export function NotificationBell() {
  const [notifications, setNotifications] = useState<NotificationRecord[]>([])
  const [open, setOpen] = useState(false)
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

  const handleDelete = async (e: React.MouseEvent, id: string) => {
    e.stopPropagation()
    await deleteNotification(id)
    loadNotifications()
  }

  return (
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
          {unreadCount > 0 && (
            <Button variant="ghost" size="sm" className="text-xs h-7" onClick={handleMarkAll}>
              <CheckCheck className="h-3.5 w-3.5 mr-1" /> Marcar todas
            </Button>
          )}
        </div>
        <ScrollArea className="h-[320px]">
          {notifications.length === 0 ? (
            <div className="flex flex-col items-center justify-center py-8 text-slate-400">
              <BellOff className="h-8 w-8 mb-2" />
              <p className="text-xs">Nenhuma notificação</p>
            </div>
          ) : (
            <div className="divide-y">
              {notifications.map((notif) => (
                <div
                  key={notif.id}
                  className={cn(
                    'p-3 hover:bg-slate-50 cursor-pointer group',
                    !notif.read && 'bg-cyan-50/50',
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
                        {notif.created
                          ? format(new Date(notif.created), "dd/MM/yyyy 'às' HH:mm", {
                              locale: ptBR,
                            })
                          : ''}
                      </p>
                    </div>
                    <Button
                      variant="ghost"
                      size="icon"
                      className="h-6 w-6 opacity-0 group-hover:opacity-100 transition-opacity"
                      onClick={(e) => handleDelete(e, notif.id)}
                    >
                      <Trash2 className="h-3 w-3 text-slate-400" />
                    </Button>
                  </div>
                </div>
              ))}
            </div>
          )}
        </ScrollArea>
      </PopoverContent>
    </Popover>
  )
}
