import { useState, useEffect } from 'react'
import { useNavigate } from 'react-router-dom'
import { useAuth } from '@/hooks/use-auth'
import { Card, CardContent } from '@/components/ui/card'
import { Button } from '@/components/ui/button'
import { Input } from '@/components/ui/input'
import { Label } from '@/components/ui/label'
import { Checkbox } from '@/components/ui/checkbox'
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from '@/components/ui/select'
import {
  Lock,
  Mail,
  Loader2,
  ArrowRight,
  User,
  CheckCircle2,
  Clock,
  XCircle,
  Eye,
  EyeOff,
} from 'lucide-react'
import { useToast } from '@/hooks/use-toast'
import { extractFieldErrors, type FieldErrors } from '@/lib/pocketbase/errors'
import { UserRole } from '@/types/service_record'
import { PasswordRecoveryForm } from '@/components/PasswordRecoveryForm'
import logoImg from '../assets/image-b4a05.png'

const REMEMBER_EMAIL_KEY = 'rememberEmail'

export default function Login() {
  const [mode, setMode] = useState<'login' | 'signup' | 'recovery'>('login')
  const [email, setEmail] = useState('')
  const [password, setPassword] = useState('')
  const [name, setName] = useState('')
  const [role, setRole] = useState<UserRole | ''>('')
  const [loading, setLoading] = useState(false)
  const [fieldErrors, setFieldErrors] = useState<FieldErrors>({})
  const [signupSuccess, setSignupSuccess] = useState(false)
  const [loginMessage, setLoginMessage] = useState<{
    type: 'pending' | 'rejected'
    text: string
  } | null>(null)
  const [rememberMe, setRememberMe] = useState(false)
  const [showPassword, setShowPassword] = useState(false)
  const { signIn, signUp } = useAuth()
  const navigate = useNavigate()
  const { toast } = useToast()

  useEffect(() => {
    const saved = localStorage.getItem(REMEMBER_EMAIL_KEY)
    if (saved) {
      setEmail(saved)
      setRememberMe(true)
    }
  }, [])

  const handleLogin = async (e: React.FormEvent) => {
    e.preventDefault()
    setLoginMessage(null)
    setLoading(true)
    const { error, approvalStatus } = await signIn(email, password)

    if (error) {
      setLoading(false)
      if (approvalStatus === 'Pendente') {
        setLoginMessage({
          type: 'pending',
          text: 'Seu cadastro está aguardando aprovação do gestor. Você receberá acesso assim que for aprovado.',
        })
      } else if (approvalStatus === 'Rejeitado') {
        setLoginMessage({
          type: 'rejected',
          text: 'Seu cadastro foi rejeitado. Entre em contato com o gestor do sistema para mais informações.',
        })
      } else {
        toast({
          variant: 'destructive',
          title: 'Falha no login',
          description: 'E-mail ou senha incorretos. Verifique as credenciais.',
        })
      }
    } else {
      if (rememberMe) {
        localStorage.setItem(REMEMBER_EMAIL_KEY, email)
      } else {
        localStorage.removeItem(REMEMBER_EMAIL_KEY)
      }
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
      setSignupSuccess(true)
    }
  }

  const switchMode = (newMode: 'login' | 'signup') => {
    setMode(newMode)
    setFieldErrors({})
    setLoginMessage(null)
    setSignupSuccess(false)
    setShowPassword(false)
    setEmail('')
    setPassword('')
  }

  const goToRecovery = () => {
    setMode('recovery')
    setLoginMessage(null)
    setShowPassword(false)
  }

  const backToLogin = () => {
    setMode('login')
    const saved = localStorage.getItem(REMEMBER_EMAIL_KEY)
    if (saved) {
      setEmail(saved)
      setRememberMe(true)
    } else {
      setEmail('')
      setRememberMe(false)
    }
    setPassword('')
    setShowPassword(false)
  }

  if (signupSuccess) {
    return (
      <div className="min-h-screen flex items-center justify-center bg-slate-950 p-4 relative overflow-hidden">
        <div className="absolute top-[-10%] left-[-10%] w-[500px] h-[500px] bg-cyan-500/20 rounded-full blur-[120px] pointer-events-none" />
        <div className="absolute bottom-[-10%] right-[-10%] w-[500px] h-[500px] bg-purple-600/20 rounded-full blur-[120px] pointer-events-none" />
        <Card className="w-full max-w-md shadow-2xl border-slate-800 bg-slate-900/90 backdrop-blur-xl text-slate-100">
          <div className="p-6 bg-slate-950 border-b border-slate-800/80 text-center">
            <div className="mx-auto flex items-center justify-center py-2">
              <img src={logoImg} alt="RexturAdvance Logo" className="h-11 object-contain" />
            </div>
          </div>
          <CardContent className="p-6 text-center space-y-4">
            <div className="mx-auto w-16 h-16 rounded-full bg-emerald-500/20 flex items-center justify-center">
              <CheckCircle2 className="h-8 w-8 text-emerald-400" />
            </div>
            <h3 className="text-lg font-bold text-slate-100">Cadastro Enviado!</h3>
            <p className="text-sm text-slate-400">
              Seu registro foi enviado para aprovação do gestor. Você receberá acesso ao sistema
              assim que sua conta for aprovada.
            </p>
            <Button
              onClick={() => switchMode('login')}
              className="w-full bg-gradient-to-r from-cyan-500 via-indigo-600 to-purple-600 hover:from-cyan-600 hover:via-indigo-700 hover:to-purple-700 text-white h-10 font-bold"
            >
              Voltar para Login
            </Button>
          </CardContent>
        </Card>
      </div>
    )
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
          {mode === 'recovery' ? (
            <PasswordRecoveryForm onBack={backToLogin} initialEmail={email} />
          ) : (
            <>
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

              {loginMessage && (
                <div
                  className={`p-3 rounded-lg border text-xs flex items-start gap-2 ${
                    loginMessage.type === 'pending'
                      ? 'bg-amber-950/50 border-amber-800 text-amber-300'
                      : 'bg-rose-950/50 border-rose-800 text-rose-300'
                  }`}
                >
                  {loginMessage.type === 'pending' ? (
                    <Clock className="h-4 w-4 shrink-0 mt-0.5" />
                  ) : (
                    <XCircle className="h-4 w-4 shrink-0 mt-0.5" />
                  )}
                  <span>{loginMessage.text}</span>
                </div>
              )}

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
                        type={showPassword ? 'text' : 'password'}
                        required
                        className="pl-9 pr-9 bg-slate-950 border-slate-800 text-slate-100 placeholder:text-slate-600 focus:border-cyan-500"
                        value={password}
                        onChange={(e) => setPassword(e.target.value)}
                        placeholder="••••••••"
                      />
                      <button
                        type="button"
                        onClick={() => setShowPassword(!showPassword)}
                        className="absolute right-3 top-3 text-slate-500 hover:text-slate-300 transition-colors"
                        tabIndex={-1}
                        aria-label={showPassword ? 'Ocultar senha' : 'Mostrar senha'}
                      >
                        {showPassword ? (
                          <EyeOff className="h-4 w-4" />
                        ) : (
                          <Eye className="h-4 w-4" />
                        )}
                      </button>
                    </div>
                  </div>

                  <div className="flex items-center justify-between">
                    <div className="flex items-center gap-2">
                      <Checkbox
                        id="remember-me"
                        checked={rememberMe}
                        onCheckedChange={(checked) => setRememberMe(checked === true)}
                        className="border-slate-700 data-[state=checked]:bg-cyan-600 data-[state=checked]:border-cyan-600"
                      />
                      <Label
                        htmlFor="remember-me"
                        className="text-slate-300 text-xs cursor-pointer select-none"
                      >
                        Lembrar de mim
                      </Label>
                    </div>
                    <button
                      type="button"
                      onClick={goToRecovery}
                      className="text-xs text-cyan-400 hover:text-cyan-300 transition-colors"
                    >
                      Esqueci minha senha
                    </button>
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
                    {fieldErrors.name && (
                      <p className="text-xs text-rose-400">{fieldErrors.name}</p>
                    )}
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
                    {fieldErrors.email && (
                      <p className="text-xs text-rose-400">{fieldErrors.email}</p>
                    )}
                  </div>

                  <div className="space-y-1.5">
                    <Label htmlFor="signup-password" className="text-slate-300 text-xs font-medium">
                      Senha
                    </Label>
                    <div className="relative">
                      <Lock className="absolute left-3 top-3 h-4 w-4 text-slate-500" />
                      <Input
                        id="signup-password"
                        type={showPassword ? 'text' : 'password'}
                        required
                        className="pl-9 pr-9 bg-slate-950 border-slate-800 text-slate-100 focus:border-cyan-500"
                        value={password}
                        onChange={(e) => setPassword(e.target.value)}
                        placeholder="Mínimo 8 caracteres"
                      />
                      <button
                        type="button"
                        onClick={() => setShowPassword(!showPassword)}
                        className="absolute right-3 top-3 text-slate-500 hover:text-slate-300 transition-colors"
                        tabIndex={-1}
                        aria-label={showPassword ? 'Ocultar senha' : 'Mostrar senha'}
                      >
                        {showPassword ? (
                          <EyeOff className="h-4 w-4" />
                        ) : (
                          <Eye className="h-4 w-4" />
                        )}
                      </button>
                    </div>
                    {fieldErrors.password && (
                      <p className="text-xs text-rose-400">{fieldErrors.password}</p>
                    )}
                  </div>

                  <div className="space-y-1.5">
                    <Label className="text-slate-300 text-xs font-medium">
                      Categoria do Usuário *
                    </Label>
                    <Select value={role} onValueChange={(v) => setRole(v as UserRole)}>
                      <SelectTrigger className="h-10 bg-slate-950 border-slate-800 text-slate-100">
                        <SelectValue placeholder="Selecione sua categoria" />
                      </SelectTrigger>
                      <SelectContent className="bg-slate-900 border-slate-800 text-slate-100">
                        <SelectItem value="Gerentes">Gerentes</SelectItem>
                        <SelectItem value="Supervisores">Supervisores</SelectItem>
                        <SelectItem value="Líderes">Líderes</SelectItem>
                        <SelectItem value="Consultores">Consultores</SelectItem>
                        <SelectItem value="Executivo de contas">Executivo de contas</SelectItem>
                      </SelectContent>
                    </Select>
                    {fieldErrors.role && (
                      <p className="text-xs text-rose-400">{fieldErrors.role}</p>
                    )}
                  </div>

                  <div className="p-2.5 bg-amber-950/40 border border-amber-900/50 rounded-lg">
                    <p className="text-[11px] text-amber-300 text-center">
                      Seu cadastro será enviado para aprovação do gestor antes de liberar o acesso.
                    </p>
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
                        Enviar para Aprovação <ArrowRight className="h-4 w-4" />
                      </span>
                    )}
                  </Button>
                </form>
              )}
            </>
          )}
        </CardContent>
      </Card>
    </div>
  )
}
