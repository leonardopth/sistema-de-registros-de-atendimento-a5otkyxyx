import { createContext, useContext, useEffect, useState, ReactNode } from 'react'
import pb from '@/lib/pocketbase/client'
import { useRealtime } from '@/hooks/use-realtime'
import { UserRole } from '@/types/service_record'

interface AuthContextType {
  user: any
  isAuthenticated: boolean
  isMaster: boolean
  isActualMasterRole: boolean
  signUp: (
    email: string,
    password: string,
    name: string,
    role: UserRole,
    serviceGroups: string[],
    bases?: string[],
  ) => Promise<{ error: any }>
  signIn: (email: string, password: string) => Promise<{ error: any; approvalStatus?: string }>
  signOut: () => void
  requestPasswordReset: (email: string) => Promise<{ error: any }>
  loading: boolean
}

const AuthContext = createContext<AuthContextType | undefined>(undefined)

export const useAuth = () => {
  const context = useContext(AuthContext)
  if (!context) throw new Error('useAuth must be used within an AuthProvider')
  return context
}

export const AuthProvider = ({ children }: { children: ReactNode }) => {
  const [user, setUser] = useState<any>(pb.authStore.isValid ? pb.authStore.record : null)
  const [isAuthenticated, setIsAuthenticated] = useState(pb.authStore.isValid)
  const [loading, setLoading] = useState(true)

  const isMaster = user?.role === 'Master' || user?.master_access === true
  const isActualMasterRole = user?.role === 'Master'

  useEffect(() => {
    const unsubscribe = pb.authStore.onChange((_token, record) => {
      setUser(pb.authStore.isValid ? record : null)
      setIsAuthenticated(pb.authStore.isValid)
    })

    if (pb.authStore.isValid) {
      pb.collection('users')
        .authRefresh()
        .then((authData: any) => {
          const approvalStatus = authData?.record?.approval_status
          if (approvalStatus === 'Pendente' || approvalStatus === 'Rejeitado') {
            pb.authStore.clear()
          }
        })
        .catch(() => pb.authStore.clear())
        .finally(() => setLoading(false))
    } else {
      if (pb.authStore.record) pb.authStore.clear()
      setLoading(false)
    }
    return () => {
      unsubscribe()
    }
  }, [])

  useRealtime('users', (e) => {
    if (e.action === 'update' && e.record.id === pb.authStore.record?.id) {
      pb.collection('users')
        .authRefresh()
        .catch(() => {})
    }
  })

  const signUp = async (
    email: string,
    password: string,
    name: string,
    role: UserRole,
    serviceGroups: string[],
    bases: string[] = [],
  ) => {
    try {
      await pb.collection('users').create({
        email,
        password,
        passwordConfirm: password,
        name,
        role,
        approval_status: 'Pendente',
        service_groups: ['Gerentes', 'Supervisores', 'Líderes', 'Consultores'].includes(role)
          ? serviceGroups
          : [],
        bases: ['Gestor Comercial', 'Executivo de contas'].includes(role) ? bases : [],
      })
      return { error: null }
    } catch (error) {
      return { error }
    }
  }

  const signIn = async (email: string, password: string) => {
    try {
      const authData = await pb.collection('users').authWithPassword(email, password)
      const approvalStatus = authData.record?.approval_status || 'Aprovado'

      if (approvalStatus === 'Pendente') {
        pb.authStore.clear()
        return { error: { message: 'pending' }, approvalStatus: 'Pendente' }
      }

      if (approvalStatus === 'Rejeitado') {
        pb.authStore.clear()
        return { error: { message: 'rejected' }, approvalStatus: 'Rejeitado' }
      }

      return { error: null }
    } catch (error) {
      return { error }
    }
  }

  const signOut = () => {
    pb.authStore.clear()
  }

  const requestPasswordReset = async (email: string) => {
    try {
      await pb.collection('users').requestPasswordReset(email)
      return { error: null }
    } catch (error) {
      return { error }
    }
  }

  return (
    <AuthContext.Provider
      value={{
        user,
        isAuthenticated,
        isMaster,
        isActualMasterRole,
        signUp,
        signIn,
        signOut,
        requestPasswordReset,
        loading,
      }}
    >
      {children}
    </AuthContext.Provider>
  )
}
