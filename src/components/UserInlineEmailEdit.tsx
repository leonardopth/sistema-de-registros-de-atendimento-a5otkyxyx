import { useState, useEffect } from 'react'
import { Input } from '@/components/ui/input'
import { Button } from '@/components/ui/button'
import { updateUserEmail } from '@/services/users'
import { extractFieldErrors } from '@/lib/pocketbase/errors'
import { useToast } from '@/hooks/use-toast'
import { cn } from '@/lib/utils'
import { Mail, Check, X, Loader2, Pencil } from 'lucide-react'

const EMAIL_REGEX = /^[^\s@]+@[^\s@]+\.[^\s@]+$/

interface UserInlineEmailEditProps {
  userId: string
  email: string
  canEdit: boolean
  onSaved: () => void
}

export function UserInlineEmailEdit({ userId, email, canEdit, onSaved }: UserInlineEmailEditProps) {
  const [editing, setEditing] = useState(false)
  const [value, setValue] = useState(email)
  const [error, setError] = useState<string | null>(null)
  const [saving, setSaving] = useState(false)
  const { toast } = useToast()

  useEffect(() => {
    if (!editing) setValue(email)
  }, [email, editing])

  const handleSave = async () => {
    const trimmed = value.trim()
    if (!trimmed) {
      setError('E-mail é obrigatório.')
      return
    }
    if (!EMAIL_REGEX.test(trimmed)) {
      setError('Formato de e-mail inválido.')
      return
    }
    if (trimmed === email) {
      setEditing(false)
      return
    }
    setSaving(true)
    setError(null)
    try {
      await updateUserEmail(userId, trimmed)
      toast({ title: 'E-mail atualizado com sucesso' })
      setEditing(false)
      onSaved()
    } catch (err) {
      const errors = extractFieldErrors(err)
      setError(errors.email || 'Erro ao atualizar e-mail.')
    } finally {
      setSaving(false)
    }
  }

  const handleCancel = () => {
    setEditing(false)
    setError(null)
    setValue(email)
  }

  if (editing) {
    return (
      <div className="flex flex-col gap-1">
        <div className="flex items-center gap-1">
          <Input
            type="email"
            value={value}
            onChange={(e) => setValue(e.target.value)}
            onKeyDown={(e) => {
              if (e.key === 'Enter') handleSave()
              if (e.key === 'Escape') handleCancel()
            }}
            className={cn(
              'h-7 text-xs flex-1',
              error && 'border-rose-400 focus-visible:ring-rose-400',
            )}
            autoFocus
            disabled={saving}
          />
          <Button
            size="sm"
            variant="ghost"
            className="h-7 w-7 p-0 text-emerald-600"
            onClick={handleSave}
            disabled={saving}
          >
            {saving ? (
              <Loader2 className="h-3.5 w-3.5 animate-spin" />
            ) : (
              <Check className="h-3.5 w-3.5" />
            )}
          </Button>
          <Button
            size="sm"
            variant="ghost"
            className="h-7 w-7 p-0 text-rose-500"
            onClick={handleCancel}
            disabled={saving}
          >
            <X className="h-3.5 w-3.5" />
          </Button>
        </div>
        {error && <p className="text-[10px] text-rose-500">{error}</p>}
      </div>
    )
  }

  return (
    <div className="flex items-center gap-1 group">
      {email ? (
        <span className="flex items-center gap-1 text-xs text-slate-600 truncate max-w-[200px]">
          <Mail className="h-3 w-3 text-slate-400 shrink-0" />
          {email}
        </span>
      ) : (
        <span className="text-xs text-slate-400">—</span>
      )}
      {canEdit && (
        <Button
          size="sm"
          variant="ghost"
          className="h-6 w-6 p-0 opacity-0 group-hover:opacity-100 transition-opacity"
          onClick={() => {
            setValue(email)
            setError(null)
            setEditing(true)
          }}
        >
          <Pencil className="h-3 w-3 text-indigo-500" />
        </Button>
      )}
    </div>
  )
}
