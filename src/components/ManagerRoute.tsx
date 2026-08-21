import { Navigate } from 'react-router-dom'
import { useAuth } from '@/hooks/use-auth'

const MANAGER_ROLES = ['Gerente', 'Supervisor', 'Líder']

export function ManagerRoute({ children }: { children: React.ReactNode }) {
  const { user, loading } = useAuth()

  if (loading) return null
  if (!user) return <Navigate to="/" replace />
  const hasAccess =
    MANAGER_ROLES.includes(user.role) || user.role === 'Master' || user.master_access === true
  if (!hasAccess) {
    return <Navigate to="/" replace />
  }
  return <>{children}</>
}
