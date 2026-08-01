import { useState } from 'react'
import { useNavigate } from 'react-router-dom'
import { useAuth } from '@/hooks/use-auth'
import { Card, CardContent } from '@/components/ui/card'
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
import { Lock, Mail, Loader2, ArrowRight, User } from 'lucide-react'
import { useToast } from '@/hooks/use-toast'
import { extractFieldErrors, type FieldErrors } from '@/lib/pocketbase/errors'
import { UserRole } from '@/types/service_record'
import logoImg from '../assets/image-b4a05.png'

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
    <div className="min-h-screen flex items-center justify-center bg-slate-950 p-4 relative overflow-hidden">
      <div className="absolute top-[-10%] left-[-10%] w-[500px] h-[500px] bg-cyan-500/20 rounded-full blur-[120px] pointer-events-none" />
      <div className="absolute bottom-[-10%] right-[-10%] w-[500px] h-[500px] bg-purple-600/20 rounded-full blur-[120px] pointer-events-none" />

      <Card className="w-full max-w-md shadow-2xl border-slate-800 bg-slate-900/90 backdrop-blur-xl text-slate-100 overflow-hidden">
        <div className="p-6 bg-slate-950 border-b border-slate-800/80 text-center relative">
          <div className="mx-auto flex items-center justify-center py-2">
            <img src={logoImg} alt="RexturAdvance Logo" className="h-11 object-contain" />
          </div>
          <p className="text-xs text-slate-400 mt-2 font-medium">
            Sistema de Registros e Gestão de Atendimento
          </p>
        </div>

        <CardContent className="p-6 space-y-4">
          <div className="flex gap-2 p-1 bg-slate-950 rounded-lg border border-slate-800">
            <button
              type="button"
              onClick={() => switchMode('login')}
              className={`flex-1 py-2 text-xs font-bold rounded-md transition-all ${
                mode === 'login'
                  ? 'bg-gradient-to-r from-cyan-600 to-indigo-600 text-white shadow-md'
                  : 'text-slate-400 hover:text-slate-200'
              }`}
            >
              Entrar
            </button>
            <button
              type="button"
              onClick={() => switchMode('signup')}
              className={`flex-1 py-2 text-xs font-bold rounded-md transition-all ${
                mode === 'signup'
                  ? 'bg-gradient-to-r from-cyan-600 to-indigo-600 text-white shadow-md'
                  : 'text-slate-400 hover:text-slate-200'
              }`}
            >
              Cadastrar
            </button>
          </div>

          {mode === 'login' ? (
            <form onSubmit={handleLogin} className="space-y-4 pt-2">
              <div className="space-y-1.5">
                <Label htmlFor="email" className="text-slate-300 text-xs font-medium">
                  E-mail Corporativo
                </Label>
                <div className="relative">
                  <Mail className="absolute left-3 top-3 h-4 w-4 text-slate-500" />
                  <Input
                    id="email"
                    type="email"
                    required
                    className="pl-9 bg-slate-950 border-slate-800 text-slate-100 placeholder:text-slate-600 focus:border-cyan-500"
                    value={email}
                    onChange={(e) => setEmail(e.target.value)}
                    placeholder="seu.email@rexturadvance.com.br"
                  />
                </div>
              </div>

              <div className="space-y-1.5">
                <Label htmlFor="password" className="text-slate-300 text-xs font-medium">
                  Senha de Acesso
                </Label>
                <div className="relative">
                  <Lock className="absolute left-3 top-3 h-4 w-4 text-slate-500" />
                  <Input
                    id="password"
                    type="password"
                    required
                    className="pl-9 bg-slate-950 border-slate-800 text-slate-100 placeholder:text-slate-600 focus:border-cyan-500"
                    value={password}
                    onChange={(e) => setPassword(e.target.value)}
                    placeholder="••••••••"
                  />
                </div>
              </div>

              <Button
                type="submit"
                disabled={loading}
                className="w-full bg-gradient-to-r from-cyan-500 via-indigo-600 to-purple-600 hover:from-cyan-600 hover:via-indigo-700 hover:to-purple-700 text-white h-10 font-bold shadow-lg transition-all"
              >
                {loading ? (
                  <Loader2 className="h-4 w-4 animate-spin" />
                ) : (
                  <span className="flex items-center gap-2">
                    Acessar Painel <ArrowRight className="h-4 w-4" />
                  </span>
                )}
              </Button>

              <div className="mt-4 p-3 bg-slate-950/80 border border-slate-800 rounded-lg text-center">
                <p className="text-xs text-cyan-400 font-semibold">Conta Demo RexturAdvance</p>
                <p className="text-[11px] text-slate-400 mt-0.5">
                  <strong>leonardopth@gmail.com</strong> / <strong>Skip@Pass</strong>
                </p>
              </div>
            </form>
          ) : (
            <form onSubmit={handleSignup} className="space-y-4 pt-2">
              <div className="space-y-1.5">
                <Label htmlFor="name" className="text-slate-300 text-xs font-medium">
                  Nome Completo
                </Label>
                <div className="relative">
                  <User className="absolute left-3 top-3 h-4 w-4 text-slate-500" />
                  <Input
                    id="name"
                    required
                    className="pl-9 bg-slate-950 border-slate-800 text-slate-100 focus:border-cyan-500"
                    value={name}
                    onChange={(e) => setName(e.target.value)}
                    placeholder="Seu nome completo"
                  />
                </div>
                {fieldErrors.name && <p className="text-xs text-rose-400">{fieldErrors.name}</p>}
              </div>

              <div className="space-y-1.5">
                <Label htmlFor="signup-email" className="text-slate-300 text-xs font-medium">
                  E-mail
                </Label>
                <div className="relative">
                  <Mail className="absolute left-3 top-3 h-4 w-4 text-slate-500" />
                  <Input
                    id="signup-email"
                    type="email"
                    required
                    className="pl-9 bg-slate-950 border-slate-800 text-slate-100 focus:border-cyan-500"
                    value={email}
                    onChange={(e) => setEmail(e.target.value)}
                    placeholder="seu.email@rexturadvance.com.br"
                  />
                </div>
                {fieldErrors.email && <p className="text-xs text-rose-400">{fieldErrors.email}</p>}
              </div>

              <div className="space-y-1.5">
                <Label htmlFor="signup-password" className="text-slate-300 text-xs font-medium">
                  Senha
                </Label>
                <div className="relative">
                  <Lock className="absolute left-3 top-3 h-4 w-4 text-slate-500" />
                  <Input
                    id="signup-password"
                    type="password"
                    required
                    className="pl-9 bg-slate-950 border-slate-800 text-slate-100 focus:border-cyan-500"
                    value={password}
                    onChange={(e) => setPassword(e.target.value)}
                    placeholder="Mínimo 8 caracteres"
                  />
                </div>
                {fieldErrors.password && (
                  <p className="text-xs text-rose-400">{fieldErrors.password}</p>
                )}
              </div>

              <div className="space-y-1.5">
                <Label className="text-slate-300 text-xs font-medium">Categoria do Usuário *</Label>
                <Select value={role} onValueChange={(v) => setRole(v as UserRole)}>
                  <SelectTrigger className="h-10 bg-slate-950 border-slate-800 text-slate-100">
                    <SelectValue placeholder="Selecione sua categoria" />
                  </SelectTrigger>
                  <SelectContent className="bg-slate-900 border-slate-800 text-slate-100">
                    <SelectItem value="Gerentes">Gerentes</SelectItem>
                    <SelectItem value="Supervisores">Supervisores</SelectItem>
                    <SelectItem value="Líderes">Líderes</SelectItem>
                    <SelectItem value="Consultores">Consultores</SelectItem>
                  </SelectContent>
                </Select>
                {fieldErrors.role && <p className="text-xs text-rose-400">{fieldErrors.role}</p>}
              </div>

              <Button
                type="submit"
                disabled={loading}
                className="w-full bg-gradient-to-r from-cyan-500 via-indigo-600 to-purple-600 hover:from-cyan-600 hover:via-indigo-700 hover:to-purple-700 text-white h-10 font-bold shadow-lg"
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
