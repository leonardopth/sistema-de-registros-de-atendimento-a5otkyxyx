import { type ReactNode } from 'react'
import { Navigate, useLocation } from 'react-router-dom'
import { useAuth } from '@/hooks/use-auth'
import { Loader2, Clock, AlertOctagon } from 'lucide-react'
import { Button } from '@/components/ui/button'
import { Card } from '@/components/ui/card'

export function ProtectedRoute({ children }: { children: ReactNode }) {
  const { isAuthenticated, loading, user, signOut } = useAuth()
  const location = useLocation()

  if (loading) {
    return (
      <div className="min-h-screen flex items-center justify-center bg-slate-950 text-cyan-500">
        <Loader2 className="h-8 w-8 animate-spin" />
      </div>
    )
  }

  if (!isAuthenticated || !user) {
    return <Navigate to="/login" state={{ from: location }} replace />
  }

  if (user.approval_status === 'Pendente') {
    return (
      <div className="min-h-screen flex items-center justify-center bg-slate-950 p-4 text-slate-100">
        <Card className="max-w-md w-full p-6 text-center space-y-4 bg-slate-900 border-slate-800 shadow-2xl">
          <div className="w-12 h-12 rounded-full bg-amber-500/10 text-amber-400 flex items-center justify-center mx-auto">
            <Clock className="h-6 w-6" />
          </div>
          <h2 className="text-lg font-bold text-slate-100">Cadastro Aguardando Aprovação</h2>
          <p className="text-xs text-slate-400 leading-relaxed">
            Sua conta de usuário foi registrada com sucesso, porém ainda requer a aprovação do
            gestor do sistema. Você receberá acesso completo assim que for aprovado.
          </p>
          <Button
            onClick={() => signOut()}
            className="w-full bg-slate-800 hover:bg-slate-700 text-slate-200 text-xs font-semibold"
          >
            Voltar para o Login
          </Button>
        </Card>
      </div>
    )
  }

  if (user.approval_status === 'Rejeitado') {
    return (
      <div className="min-h-screen flex items-center justify-center bg-slate-950 p-4 text-slate-100">
        <Card className="max-w-md w-full p-6 text-center space-y-4 bg-slate-900 border-slate-800 shadow-2xl">
          <div className="w-12 h-12 rounded-full bg-rose-500/10 text-rose-400 flex items-center justify-center mx-auto">
            <AlertOctagon className="h-6 w-6" />
          </div>
          <h2 className="text-lg font-bold text-slate-100">Acesso Não Aprovado</h2>
          <p className="text-xs text-slate-400 leading-relaxed">
            O seu cadastro foi analisado e rejeitado pelo gestor. Entre em contato com a equipe de
            administração se achar que isto é um engano.
          </p>
          <Button
            onClick={() => signOut()}
            className="w-full bg-slate-800 hover:bg-slate-700 text-slate-200 text-xs font-semibold"
          >
            Voltar para o Login
          </Button>
        </Card>
      </div>
    )
  }

  return <>{children}</>
}
