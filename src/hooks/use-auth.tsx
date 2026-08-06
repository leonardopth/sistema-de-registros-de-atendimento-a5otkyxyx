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
  const getInitialUser = () => {
    if (pb.authStore.isValid && pb.authStore.record) {
      const status = pb.authStore.record.approval_status
      if (status === 'Pendente' || status === 'Rejeitado') return null
      return pb.authStore.record
    }
    return null
  }

  const getInitialIsAuth = () => {
    if (pb.authStore.isValid && pb.authStore.record) {
      const status = pb.authStore.record.approval_status
      return !status || status === 'Aprovado'
    }
    return false
  }

  const [user, setUser] = useState<any>(getInitialUser)
  const [isAuthenticated, setIsAuthenticated] = useState<boolean>(getInitialIsAuth)
  const [loading, setLoading] = useState<boolean>(true)

  const isMaster = user?.role === 'Master' || user?.master_access === true
  const isActualMasterRole = user?.role === 'Master'

  useEffect(() => {
    const unsubscribe = pb.authStore.onChange((_token, record) => {
      if (pb.authStore.isValid && record) {
        const status = record.approval_status
        if (status === 'Pendente' || status === 'Rejeitado') {
          setUser(null)
          setIsAuthenticated(false)
        } else {
          setUser(record)
          setIsAuthenticated(true)
        }
      } else {
        setUser(null)
        setIsAuthenticated(false)
      }
    })

    if (pb.authStore.isValid) {
      pb.collection('users')
        .authRefresh()
        .then((authData: any) => {
          const rec = authData?.record || pb.authStore.record
          const approvalStatus = rec?.approval_status
          if (approvalStatus === 'Pendente' || approvalStatus === 'Rejeitado') {
            pb.authStore.clear()
            setUser(null)
            setIsAuthenticated(false)
          } else {
            setUser(rec)
            setIsAuthenticated(true)
          }
        })
        .catch(() => {
          pb.authStore.clear()
          setUser(null)
          setIsAuthenticated(false)
        })
        .finally(() => setLoading(false))
    } else {
      if (pb.authStore.record) pb.authStore.clear()
      setUser(null)
      setIsAuthenticated(false)
      setLoading(false)
    }

    return () => {
      unsubscribe()
    }
  }, [])

  useRealtime('users', (e) => {
    if (e.action === 'update' && e.record?.id === pb.authStore.record?.id) {
      pb.collection('users')
        .authRefresh()
        .then((authData: any) => {
          if (authData?.record) {
            const status = authData.record.approval_status
            if (status === 'Pendente' || status === 'Rejeitado') {
              pb.authStore.clear()
              setUser(null)
              setIsAuthenticated(false)
            } else {
              setUser(authData.record)
              setIsAuthenticated(true)
            }
          }
        })
        .catch(() => {})
    }
  })

  const signUp = async (
    emailInput: string,
    passwordInput: string,
    name: string,
    role: UserRole,
    serviceGroups: string[],
    bases: string[] = [],
  ) => {
    try {
      const cleanEmail = emailInput.trim().toLowerCase()
      await pb.collection('users').create({
        email: cleanEmail,
        password: passwordInput,
        passwordConfirm: passwordInput,
        name: name.trim(),
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

  const signIn = async (emailInput: string, passwordInput: string) => {
    try {
      const cleanEmail = emailInput.trim().toLowerCase()
      const authData = await pb.collection('users').authWithPassword(cleanEmail, passwordInput)
      const approvalStatus = authData.record?.approval_status || 'Aprovado'

      if (approvalStatus === 'Pendente') {
        pb.authStore.clear()
        setUser(null)
        setIsAuthenticated(false)
        return { error: { message: 'pending' }, approvalStatus: 'Pendente' }
      }

      if (approvalStatus === 'Rejeitado') {
        pb.authStore.clear()
        setUser(null)
        setIsAuthenticated(false)
        return { error: { message: 'rejected' }, approvalStatus: 'Rejeitado' }
      }

      setUser(authData.record)
      setIsAuthenticated(true)
      return { error: null }
    } catch (error) {
      pb.authStore.clear()
      setUser(null)
      setIsAuthenticated(false)
      return { error }
    }
  }

  const signOut = () => {
    pb.authStore.clear()
    setUser(null)
    setIsAuthenticated(false)
  }

  const requestPasswordReset = async (emailInput: string) => {
    try {
      const cleanEmail = emailInput.trim().toLowerCase()
      await pb.collection('users').requestPasswordReset(cleanEmail)
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
