import { Navigate } from 'react-router-dom'
import { useAuth } from '@/hooks/use-auth'

const MANAGER_ROLES = ['Gerentes', 'Supervisores', 'Líderes']

export function ManagerRoute({ children }: { children: React.ReactNode }) {
  const { user, loading } = useAuth()

  if (loading) return null
  if (!user || !MANAGER_ROLES.includes(user.role)) {
    return <Navigate to="/" replace />
  }
  return <>{children}</>
}
