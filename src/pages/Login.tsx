import { useState } from 'react'
import { useNavigate } from 'react-router-dom'
import { useAuth } from '@/hooks/use-auth'
import { Card, CardContent, CardHeader, CardTitle, CardDescription } from '@/components/ui/card'
import { Button } from '@/components/ui/button'
import { Input } from '@/components/ui/input'
import { Label } from '@/components/ui/label'
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from '@/components/ui/select'
import { Headset, Lock, Mail, Loader2, ArrowRight, User } from 'lucide-react'
import { useToast } from '@/hooks/use-toast'
import { extractFieldErrors, type FieldErrors } from '@/lib/pocketbase/errors'
import { UserRole } from '@/types/service_record'

export default function Login() {
  const [mode, setMode] = useState<'login' | 'signup'>('login')
  const [email, setEmail] = useState('leonardopth@gmail.com')
  const [password, setPassword] = useState('Skip@Pass')
  const [name, setName] = useState('')
  const [role, setRole] = useState<UserRole | ''>('')
  const [loading, setLoading] = useState(false)
  const [fieldErrors, setFieldErrors] = useState<FieldErrors>({})
  const { signIn, signUp } = useAuth()
  const navigate = useNavigate()
  const { toast } = useToast()

  const handleLogin = async (e: React.FormEvent) => {
    e.preventDefault()
    setLoading(true)
    const { error } = await signIn(email, password)
    setLoading(false)

    if (error) {
      toast({
        variant: 'destructive',
        title: 'Falha no login',
        description: 'E-mail ou senha incorretos. Verifique as credenciais.',
      })
    } else {
      toast({ title: 'Bem-vindo ao Sistema', description: 'Login realizado com sucesso.' })
      navigate('/')
    }
  }

  const handleSignup = async (e: React.FormEvent) => {
    e.preventDefault()
    setFieldErrors({})

    if (!name.trim()) {
      setFieldErrors({ name: 'O nome é obrigatório.' })
      return
    }
    if (!role) {
      setFieldErrors({ role: 'Selecione uma categoria.' })
      return
    }

    setLoading(true)
    const { error } = await signUp(email, password, name.trim(), role as UserRole)
    setLoading(false)

    if (error) {
      const errors = extractFieldErrors(error)
      if (Object.keys(errors).length > 0) {
        setFieldErrors(errors)
      } else {
        toast({
          variant: 'destructive',
          title: 'Falha no cadastro',
          description: 'Não foi possível criar a conta.',
        })
      }
    } else {
      toast({ title: 'Conta criada!', description: 'Bem-vindo ao sistema.' })
      navigate('/')
    }
  }

  const switchMode = (newMode: 'login' | 'signup') => {
    setMode(newMode)
    setFieldErrors({})
    if (newMode === 'signup') {
      setEmail('')
      setPassword('')
    } else {
      setEmail('leonardopth@gmail.com')
      setPassword('Skip@Pass')
    }
  }

  return (
    <div className="min-h-screen flex items-center justify-center bg-slate-100 p-4">
      <Card className="w-full max-w-md shadow-elevation border-slate-200">
        <CardHeader className="text-center space-y-2 pb-4">
          <div className="mx-auto h-12 w-12 rounded-xl bg-indigo-600 text-white flex items-center justify-center shadow-md">
            <Headset className="h-6 w-6" />
          </div>
          <CardTitle className="text-2xl font-extrabold text-slate-900">
            Registro de Atendimentos
          </CardTitle>
          <CardDescription className="text-slate-500 text-xs">
            {mode === 'login'
              ? 'Acesse seu painel operacional para registrar e gerenciar chamados'
              : 'Crie sua conta para começar a registrar atendimentos'}
          </CardDescription>
        </CardHeader>
        <CardContent>
          <div className="flex gap-2 mb-4 p-1 bg-slate-100 rounded-lg">
            <button
              type="button"
              onClick={() => switchMode('login')}
              className={`flex-1 py-2 text-xs font-semibold rounded-md transition-colors ${
                mode === 'login' ? 'bg-white text-indigo-600 shadow-sm' : 'text-slate-500'
              }`}
            >
              Entrar
            </button>
            <button
              type="button"
              onClick={() => switchMode('signup')}
              className={`flex-1 py-2 text-xs font-semibold rounded-md transition-colors ${
                mode === 'signup' ? 'bg-white text-indigo-600 shadow-sm' : 'text-slate-500'
              }`}
            >
              Cadastrar
            </button>
          </div>

          {mode === 'login' ? (
            <form onSubmit={handleLogin} className="space-y-4">
              <div className="space-y-1.5">
                <Label htmlFor="email">E-mail Corporativo</Label>
                <div className="relative">
                  <Mail className="absolute left-3 top-3 h-4 w-4 text-slate-400" />
                  <Input
                    id="email"
                    type="email"
                    required
                    className="pl-9"
                    value={email}
                    onChange={(e) => setEmail(e.target.value)}
                    placeholder="seu.email@empresa.com"
                  />
                </div>
              </div>

              <div className="space-y-1.5">
                <Label htmlFor="password">Senha de Acesso</Label>
                <div className="relative">
                  <Lock className="absolute left-3 top-3 h-4 w-4 text-slate-400" />
                  <Input
                    id="password"
                    type="password"
                    required
                    className="pl-9"
                    value={password}
                    onChange={(e) => setPassword(e.target.value)}
                    placeholder="••••••••"
                  />
                </div>
              </div>

              <Button
                type="submit"
                disabled={loading}
                className="w-full bg-indigo-600 hover:bg-indigo-700 h-10 font-semibold"
              >
                {loading ? (
                  <Loader2 className="h-4 w-4 animate-spin" />
                ) : (
                  <span className="flex items-center gap-2">
                    Entrar no Sistema <ArrowRight className="h-4 w-4" />
                  </span>
                )}
              </Button>

              <div className="mt-6 p-3 bg-indigo-50 border border-indigo-100 rounded-lg text-center">
                <p className="text-xs text-indigo-900 font-medium">Conta Demo Pré-configurada</p>
                <p className="text-[11px] text-indigo-700 mt-0.5">
                  Usando <strong>leonardopth@gmail.com</strong> / <strong>Skip@Pass</strong>
                </p>
              </div>
            </form>
          ) : (
            <form onSubmit={handleSignup} className="space-y-4">
              <div className="space-y-1.5">
                <Label htmlFor="name">Nome Completo</Label>
                <div className="relative">
                  <User className="absolute left-3 top-3 h-4 w-4 text-slate-400" />
                  <Input
                    id="name"
                    required
                    className="pl-9"
                    value={name}
                    onChange={(e) => setName(e.target.value)}
                    placeholder="Seu nome completo"
                  />
                </div>
                {fieldErrors.name && <p className="text-xs text-red-500">{fieldErrors.name}</p>}
              </div>

              <div className="space-y-1.5">
                <Label htmlFor="signup-email">E-mail</Label>
                <div className="relative">
                  <Mail className="absolute left-3 top-3 h-4 w-4 text-slate-400" />
                  <Input
                    id="signup-email"
                    type="email"
                    required
                    className="pl-9"
                    value={email}
                    onChange={(e) => setEmail(e.target.value)}
                    placeholder="seu.email@empresa.com"
                  />
                </div>
                {fieldErrors.email && <p className="text-xs text-red-500">{fieldErrors.email}</p>}
              </div>

              <div className="space-y-1.5">
                <Label htmlFor="signup-password">Senha</Label>
                <div className="relative">
                  <Lock className="absolute left-3 top-3 h-4 w-4 text-slate-400" />
                  <Input
                    id="signup-password"
                    type="password"
                    required
                    className="pl-9"
                    value={password}
                    onChange={(e) => setPassword(e.target.value)}
                    placeholder="Mínimo 8 caracteres"
                  />
                </div>
                {fieldErrors.password && (
                  <p className="text-xs text-red-500">{fieldErrors.password}</p>
                )}
              </div>

              <div className="space-y-1.5">
                <Label>Categoria do Usuário *</Label>
                <Select value={role} onValueChange={(v) => setRole(v as UserRole)}>
                  <SelectTrigger className="h-10">
                    <SelectValue placeholder="Selecione sua categoria" />
                  </SelectTrigger>
                  <SelectContent>
                    <SelectItem value="Gerentes">Gerentes</SelectItem>
                    <SelectItem value="Supervisores">Supervisores</SelectItem>
                    <SelectItem value="Líderes">Líderes</SelectItem>
                    <SelectItem value="Consultores">Consultores</SelectItem>
                  </SelectContent>
                </Select>
                {fieldErrors.role && <p className="text-xs text-red-500">{fieldErrors.role}</p>}
              </div>

              <Button
                type="submit"
                disabled={loading}
                className="w-full bg-indigo-600 hover:bg-indigo-700 h-10 font-semibold"
              >
                {loading ? (
                  <Loader2 className="h-4 w-4 animate-spin" />
                ) : (
                  <span className="flex items-center gap-2">
                    Criar Conta <ArrowRight className="h-4 w-4" />
                  </span>
                )}
              </Button>
            </form>
          )}
        </CardContent>
      </Card>
    </div>
  )
}
