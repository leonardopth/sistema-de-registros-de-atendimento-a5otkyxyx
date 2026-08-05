import { useState } from 'react'
import { useAuth } from '@/hooks/use-auth'
import { Button } from '@/components/ui/button'
import { Input } from '@/components/ui/input'
import { Label } from '@/components/ui/label'
import { Mail, Loader2, ArrowRight, ArrowLeft, CheckCircle2 } from 'lucide-react'
import { extractFieldErrors, type FieldErrors } from '@/lib/pocketbase/errors'

interface PasswordRecoveryFormProps {
  onBack: () => void
  initialEmail?: string
}

export function PasswordRecoveryForm({ onBack, initialEmail }: PasswordRecoveryFormProps) {
  const [email, setEmail] = useState(initialEmail || '')
  const [loading, setLoading] = useState(false)
  const [fieldErrors, setFieldErrors] = useState<FieldErrors>({})
  const [success, setSuccess] = useState(false)
  const { requestPasswordReset } = useAuth()

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault()
    setFieldErrors({})

    if (!email.trim()) {
      setFieldErrors({ email: 'O e-mail é obrigatório.' })
      return
    }
    if (!/^[^\s@]+@[^\s@]+\.[^\s@]+$/.test(email.trim())) {
      setFieldErrors({ email: 'Informe um e-mail válido.' })
      return
    }

    setLoading(true)
    const { error } = await requestPasswordReset(email.trim())
    setLoading(false)

    if (error) {
      const errors = extractFieldErrors(error)
      if (Object.keys(errors).length > 0) {
        setFieldErrors(errors)
      } else {
        setFieldErrors({ email: 'Não foi possível enviar o e-mail de recuperação.' })
      }
    } else {
      setSuccess(true)
    }
  }

  if (success) {
    return (
      <div className="space-y-4 text-center pt-2 animate-fade-in">
        <div className="mx-auto w-16 h-16 rounded-full bg-emerald-500/20 flex items-center justify-center">
          <CheckCircle2 className="h-8 w-8 text-emerald-400" />
        </div>
        <h3 className="text-lg font-bold text-slate-100">E-mail Enviado!</h3>
        <p className="text-sm text-slate-400">
          Se existe uma conta cadastrada com{' '}
          <span className="text-cyan-400 font-medium">{email}</span>, você receberá um link para
          redefinir sua senha. Verifique sua caixa de entrada e pasta de spam.
        </p>
        <Button
          onClick={onBack}
          variant="outline"
          className="w-full border-slate-700 text-slate-300 hover:bg-slate-800 hover:text-slate-100 h-10"
        >
          <ArrowLeft className="h-4 w-4 mr-2" />
          Voltar para Login
        </Button>
      </div>
    )
  }

  return (
    <form onSubmit={handleSubmit} className="space-y-4 pt-2">
      <div className="text-center mb-2">
        <h3 className="text-lg font-bold text-slate-100">Recuperar Senha</h3>
        <p className="text-xs text-slate-400 mt-1">
          Informe seu e-mail para receber o link de redefinição.
        </p>
      </div>

      <div className="space-y-1.5">
        <Label htmlFor="recovery-email" className="text-slate-300 text-xs font-medium">
          E-mail de Recuperação
        </Label>
        <div className="relative">
          <Mail className="absolute left-3 top-3 h-4 w-4 text-slate-500" />
          <Input
            id="recovery-email"
            type="email"
            required
            className="pl-9 bg-slate-950 border-slate-800 text-slate-100 placeholder:text-slate-600 focus:border-cyan-500"
            value={email}
            onChange={(e) => setEmail(e.target.value)}
            placeholder="seu.email@rexturadvance.com.br"
          />
        </div>
        {fieldErrors.email && <p className="text-xs text-rose-400">{fieldErrors.email}</p>}
      </div>

      <div className="p-2.5 bg-cyan-950/40 border border-cyan-900/50 rounded-lg">
        <p className="text-[11px] text-cyan-300 text-center">
          Enviaremos um link para redefinição de senha no seu e-mail cadastrado.
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
            Enviar Link de Recuperação <ArrowRight className="h-4 w-4" />
          </span>
        )}
      </Button>

      <button
        type="button"
        onClick={onBack}
        className="w-full text-center text-xs text-slate-400 hover:text-slate-200 transition-colors flex items-center justify-center gap-1.5"
      >
        <ArrowLeft className="h-3.5 w-3.5" />
        Voltar para Login
      </button>
    </form>
  )
}
