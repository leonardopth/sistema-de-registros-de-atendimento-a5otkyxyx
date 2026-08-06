import { Component, type ReactNode, type ErrorInfo } from 'react'
import pb from '@/lib/pocketbase/client'
import { Button } from '@/components/ui/button'
import { RefreshCw, LogOut, AlertTriangle } from 'lucide-react'

interface Props {
  children: ReactNode
}

interface State {
  hasError: boolean
  error?: Error
}

export class ErrorBoundary extends Component<Props, State> {
  constructor(props: Props) {
    super(props)
    this.state = { hasError: false }
  }

  static getDerivedStateFromError(error: Error): State {
    return { hasError: true, error }
  }

  componentDidCatch(error: Error, errorInfo: ErrorInfo) {
    console.error('ErrorBoundary caught an unhandled error:', error, errorInfo)
  }

  handleReload = () => {
    window.location.reload()
  }

  handleResetSession = () => {
    try {
      pb.authStore.clear()
      localStorage.clear()
      sessionStorage.clear()
    } catch (e) {
      console.error('Failed to clear auth state:', e)
    }
    window.location.href = '/login'
  }

  render() {
    if (this.state.hasError) {
      return (
        <div className="min-h-screen flex items-center justify-center p-4 bg-slate-950 text-slate-100">
          <div className="text-center max-w-md w-full space-y-4 p-6 bg-slate-900 border border-slate-800 rounded-xl shadow-2xl">
            <div className="w-12 h-12 rounded-full bg-rose-500/10 text-rose-400 flex items-center justify-center mx-auto">
              <AlertTriangle className="h-6 w-6" />
            </div>
            <h2 className="text-xl font-bold text-slate-100">Algo deu errado</h2>
            <p className="text-xs text-slate-400 leading-relaxed">
              Ocorreu um erro inesperado ao carregar a página. Você pode tentar recarregar ou limpar
              a sessão atual para tentar o login novamente.
            </p>
            {this.state.error?.message && (
              <div className="p-2 bg-slate-950 rounded text-[11px] font-mono text-slate-400 text-left overflow-x-auto max-h-24 border border-slate-800">
                {this.state.error.message}
              </div>
            )}
            <div className="flex flex-col sm:flex-row gap-2 pt-2">
              <Button
                onClick={this.handleReload}
                className="flex-1 bg-indigo-600 hover:bg-indigo-700 text-white text-xs font-semibold h-9"
              >
                <RefreshCw className="h-3.5 w-3.5 mr-1.5" /> Recarregar Página
              </Button>
              <Button
                onClick={this.handleResetSession}
                variant="outline"
                className="flex-1 border-slate-700 text-slate-300 hover:text-white hover:bg-slate-800 text-xs h-9"
              >
                <LogOut className="h-3.5 w-3.5 mr-1.5" /> Ir para Login
              </Button>
            </div>
          </div>
        </div>
      )
    }
    return this.props.children
  }
}
