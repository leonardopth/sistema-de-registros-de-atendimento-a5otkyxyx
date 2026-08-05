import { useState, useEffect } from 'react'
import {
  Dialog,
  DialogContent,
  DialogHeader,
  DialogTitle,
  DialogTrigger,
} from '@/components/ui/dialog'
import { Button } from '@/components/ui/button'
import { Input } from '@/components/ui/input'
import { Label } from '@/components/ui/label'
import {
  Select,
  SelectTrigger,
  SelectValue,
  SelectContent,
  SelectItem,
} from '@/components/ui/select'
import { Switch } from '@/components/ui/switch'
import { Badge } from '@/components/ui/badge'
import {
  getScheduledReports,
  createScheduledReport,
  updateScheduledReport,
  deleteScheduledReport,
  sendReportEmail,
} from '@/services/scheduled-reports'
import { ScheduledReportRecord } from '@/types/service_record'
import { useAuth } from '@/hooks/use-auth'
import { useToast } from '@/hooks/use-toast'
import { Mail, Clock, Trash2, Send, CalendarClock } from 'lucide-react'

const FREQUENCIES = [
  { value: 'daily', label: 'Diário' },
  { value: 'weekly', label: 'Semanal' },
  { value: 'monthly', label: 'Mensal' },
]
const FORMATS = [
  { value: 'csv', label: 'CSV' },
  { value: 'excel', label: 'Excel' },
  { value: 'pdf', label: 'PDF' },
]

export function ScheduledExportDialog() {
  const { user } = useAuth()
  const { toast } = useToast()
  const [open, setOpen] = useState(false)
  const [schedules, setSchedules] = useState<ScheduledReportRecord[]>([])
  const [email, setEmail] = useState('')
  const [frequency, setFrequency] = useState('weekly')
  const [format, setFormat] = useState('csv')
  const [sending, setSending] = useState(false)

  const loadData = async () => {
    try {
      setSchedules(await getScheduledReports())
    } catch (e) {
      console.error(e)
    }
  }

  useEffect(() => {
    if (open) {
      loadData()
      setEmail(user?.email || '')
    }
  }, [open, user])

  const handleCreate = async (e: React.FormEvent) => {
    e.preventDefault()
    try {
      await createScheduledReport({
        user_id: user!.id,
        frequency,
        email,
        format,
        active: true,
      })
      toast({ title: 'Agendamento criado com sucesso' })
      loadData()
    } catch {
      toast({ variant: 'destructive', title: 'Erro ao criar agendamento' })
    }
  }

  const handleToggle = async (id: string, active: boolean) => {
    try {
      await updateScheduledReport(id, { active: !active })
      loadData()
    } catch (e) {
      console.error(e)
    }
  }

  const handleDelete = async (id: string) => {
    try {
      await deleteScheduledReport(id)
      loadData()
    } catch (e) {
      console.error(e)
    }
  }

  const handleSendNow = async () => {
    setSending(true)
    try {
      const result = await sendReportEmail(email)
      toast({ title: `Relatório enviado para ${email} (${result.count} atendimentos)` })
    } catch {
      toast({ variant: 'destructive', title: 'Erro ao enviar relatório' })
    } finally {
      setSending(false)
    }
  }

  return (
    <Dialog open={open} onOpenChange={setOpen}>
      <DialogTrigger asChild>
        <Button variant="outline" size="sm" className="text-xs">
          <CalendarClock className="h-3.5 w-3.5 mr-1.5" /> Agendar Relatório
        </Button>
      </DialogTrigger>
      <DialogContent className="sm:max-w-[520px]">
        <DialogHeader>
          <DialogTitle className="flex items-center gap-2">
            <CalendarClock className="h-5 w-5 text-indigo-600" /> Exportação Agendada
          </DialogTitle>
        </DialogHeader>
        <div className="space-y-4">
          <form onSubmit={handleCreate} className="space-y-3 p-3 bg-slate-50 rounded-lg">
            <div className="grid grid-cols-2 gap-3">
              <div className="space-y-1">
                <Label className="text-xs">E-mail</Label>
                <Input
                  type="email"
                  className="h-8 text-xs"
                  value={email}
                  onChange={(e) => setEmail(e.target.value)}
                  required
                />
              </div>
              <div className="space-y-1">
                <Label className="text-xs">Frequência</Label>
                <Select value={frequency} onValueChange={setFrequency}>
                  <SelectTrigger className="h-8 text-xs">
                    <SelectValue />
                  </SelectTrigger>
                  <SelectContent>
                    {FREQUENCIES.map((f) => (
                      <SelectItem key={f.value} value={f.value}>
                        {f.label}
                      </SelectItem>
                    ))}
                  </SelectContent>
                </Select>
              </div>
            </div>
            <div className="flex items-end gap-3">
              <div className="space-y-1 flex-1">
                <Label className="text-xs">Formato</Label>
                <Select value={format} onValueChange={setFormat}>
                  <SelectTrigger className="h-8 text-xs">
                    <SelectValue />
                  </SelectTrigger>
                  <SelectContent>
                    {FORMATS.map((f) => (
                      <SelectItem key={f.value} value={f.value}>
                        {f.label}
                      </SelectItem>
                    ))}
                  </SelectContent>
                </Select>
              </div>
              <Button type="submit" size="sm" className="text-xs">
                Agendar
              </Button>
            </div>
          </form>
          <Button
            variant="outline"
            size="sm"
            className="text-xs w-full"
            onClick={handleSendNow}
            disabled={sending}
          >
            <Send className="h-3.5 w-3.5 mr-1.5" />{' '}
            {sending ? 'Enviando...' : 'Enviar relatório agora'}
          </Button>
          <div className="space-y-2">
            <p className="text-xs font-bold text-slate-700">Agendamentos</p>
            {schedules.length === 0 ? (
              <p className="text-xs text-slate-400 text-center py-3">Nenhum agendamento.</p>
            ) : (
              schedules.map((s) => (
                <div key={s.id} className="flex items-center gap-2 p-2 bg-slate-50 rounded-lg">
                  <Mail className="h-3.5 w-3.5 text-slate-500 shrink-0" />
                  <div className="flex-1 min-w-0">
                    <p className="text-xs font-semibold text-slate-900 truncate">{s.email}</p>
                    <div className="flex items-center gap-2 mt-0.5">
                      <Badge variant="secondary" className="text-[10px] h-4">
                        <Clock className="h-2.5 w-2.5 mr-0.5" />
                        {FREQUENCIES.find((f) => f.value === s.frequency)?.label || s.frequency}
                      </Badge>
                      <span className="text-[10px] text-slate-400">{s.format.toUpperCase()}</span>
                      {s.last_sent && (
                        <span className="text-[10px] text-slate-400">
                          Último: {new Date(s.last_sent).toLocaleDateString('pt-BR')}
                        </span>
                      )}
                    </div>
                  </div>
                  <Switch checked={s.active} onCheckedChange={() => handleToggle(s.id, s.active)} />
                  <Button
                    variant="ghost"
                    size="icon"
                    className="h-6 w-6"
                    onClick={() => handleDelete(s.id)}
                  >
                    <Trash2 className="h-3 w-3 text-slate-400" />
                  </Button>
                </div>
              ))
            )}
          </div>
        </div>
      </DialogContent>
    </Dialog>
  )
}
