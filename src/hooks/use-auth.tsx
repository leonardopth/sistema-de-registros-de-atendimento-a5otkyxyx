import { createContext, useContext, useEffect, useState, ReactNode } from 'react'
import pb from '@/lib/pocketbase/client'

interface AuthContextType {
  user: any
  isAuthenticated: boolean
  isMaster: boolean
  signUp: (
    email: string,
    password: string,
    name?: string,
    role?: string,
    serviceGroups?: string[],
    bases?: string[],
    departments?: string[],
  ) => Promise<{ error: any }>
  signIn: (email: string, password: string) => Promise<{ error: any; approvalStatus?: string }>
  signOut: () => void
  requestPasswordReset?: (email: string) => Promise<{ error: any }>
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

  useEffect(() => {
    const unsubscribe = pb.authStore.onChange((_token, record) => {
      setUser(pb.authStore.isValid ? record : null)
      setIsAuthenticated(pb.authStore.isValid)
    })
    if (pb.authStore.isValid) {
      pb.collection('users')
        .authRefresh()
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

  const signUp = async (
    email: string,
    password: string,
    name?: string,
    role?: string,
    serviceGroups?: string[],
    bases?: string[],
    departments?: string[],
  ) => {
    try {
      await pb.collection('users').create({
        email,
        password,
        passwordConfirm: password,
        name: name || '',
        role: role || 'Consultor',
        service_groups: serviceGroups || [],
        bases: bases || [],
        departments: departments || [],
        approval_status: 'Pendente',
      })
      return { error: null }
    } catch (error) {
      return { error }
    }
  }

  const signIn = async (email: string, password: string) => {
    try {
      const res = await pb.collection('users').authWithPassword(email, password)
      if (res.record?.approval_status === 'Pendente') {
        pb.authStore.clear()
        return { error: new Error('Pendente'), approvalStatus: 'Pendente' }
      }
      if (res.record?.approval_status === 'Rejeitado') {
        pb.authStore.clear()
        return { error: new Error('Rejeitado'), approvalStatus: 'Rejeitado' }
      }
      return { error: null }
    } catch (error: any) {
      return { error, approvalStatus: error?.data?.approval_status }
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
