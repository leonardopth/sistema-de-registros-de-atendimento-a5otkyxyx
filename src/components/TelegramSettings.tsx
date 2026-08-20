import { useState } from 'react'
import { Button } from '@/components/ui/button'
import { Input } from '@/components/ui/input'
import { Label } from '@/components/ui/label'
import { Switch } from '@/components/ui/switch'
import { useAuth } from '@/hooks/use-auth'
import { updateTelegramSettings, testTelegram } from '@/services/users'
import { toast } from '@/hooks/use-toast'
import { Send, Loader2 } from 'lucide-react'

export function TelegramSettings({ onSaved }: { onSaved?: () => void }) {
  const { user } = useAuth()
  const [telegramId, setTelegramId] = useState(user?.telegram_id || '')
  const [alerts, setAlerts] = useState(user?.telegram_alerts || false)
  const [saving, setSaving] = useState(false)
  const [testing, setTesting] = useState(false)

  const handleSave = async () => {
    setSaving(true)
    try {
      await updateTelegramSettings(user.id, telegramId, alerts)
      toast({ title: 'Configurações salvas!' })
      onSaved?.()
    } catch {
      toast({ title: 'Erro ao salvar', variant: 'destructive' })
    } finally {
      setSaving(false)
    }
  }

  const handleTest = async () => {
    if (!user?.id) return
    setTesting(true)
    try {
      await testTelegram(user.id)
      toast({ title: 'Mensagem de teste enviada!' })
    } catch {
      toast({ title: 'Falha no teste. Verifique seu Telegram ID.', variant: 'destructive' })
    } finally {
      setTesting(false)
    }
  }

  return (
    <div className="space-y-4 py-2">
      <div className="space-y-2">
        <Label className="text-xs font-semibold">Telegram ID</Label>
        <Input
          className="h-9 text-sm"
          placeholder="Ex: 123456789"
          value={telegramId}
          onChange={(e) => setTelegramId(e.target.value)}
        />
        <p className="text-[11px] text-slate-500">
          Encontre seu ID conversando com @userinfobot no Telegram.
        </p>
      </div>
      <div className="flex items-center justify-between p-3 bg-slate-50 rounded-lg">
        <div>
          <Label className="text-xs font-semibold">Alertas urgentes</Label>
          <p className="text-[11px] text-slate-500">
            Receber alertas de alta prioridade no Telegram
          </p>
        </div>
        <Switch checked={alerts} onCheckedChange={setAlerts} />
      </div>
      <div className="flex gap-2">
        <Button size="sm" className="flex-1" onClick={handleSave} disabled={saving}>
          {saving ? <Loader2 className="h-4 w-4 animate-spin" /> : 'Salvar'}
        </Button>
        <Button size="sm" variant="outline" onClick={handleTest} disabled={testing || !telegramId}>
          {testing ? (
            <Loader2 className="h-4 w-4 animate-spin" />
          ) : (
            <Send className="h-4 w-4 mr-1" />
          )}
          Testar
        </Button>
      </div>
    </div>
  )
}
