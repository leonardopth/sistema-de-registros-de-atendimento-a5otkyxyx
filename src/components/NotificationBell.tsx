import { useState, useEffect } from 'react'
import { useNavigate } from 'react-router-dom'
import { Bell } from 'lucide-react'
import { Button } from '@/components/ui/button'
import { getUsers } from '@/services/users'
import { useRealtime } from '@/hooks/use-realtime'
import { useAuth } from '@/hooks/use-auth'
import { UserRecord } from '@/types/service_record'

export function NotificationBell() {
  const { user } = useAuth()
  const navigate = useNavigate()
  const [pendingCount, setPendingCount] = useState(0)

  const loadPending = async () => {
    try {
      const users = await getUsers()
      setPendingCount(users.filter((u: UserRecord) => u.approval_status === 'Pendente').length)
    } catch (e) {
      console.error(e)
    }
  }

  useEffect(() => {
    if (user?.role === 'Master') {
      loadPending()
    }
  }, [user])

  useRealtime('users', () => {
    if (user?.role === 'Master') {
      loadPending()
    }
  })

  if (user?.role !== 'Master') return null

  return (
    <Button
      variant="ghost"
      size="icon"
      className="relative h-9 w-9 shrink-0"
      onClick={() => navigate('/gestao-usuarios')}
    >
      <Bell className="h-5 w-5 text-slate-600" />
      {pendingCount > 0 && (
        <span className="absolute -top-0.5 -right-0.5 h-4 min-w-4 px-1 flex items-center justify-center rounded-full bg-rose-500 text-white text-[10px] font-bold animate-fade-in">
          {pendingCount > 99 ? '99+' : pendingCount}
        </span>
      )}
    </Button>
  )
}
