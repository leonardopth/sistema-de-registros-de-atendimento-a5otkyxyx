import { useState, useEffect } from 'react'
import { Dialog, DialogContent, DialogHeader, DialogTitle } from '@/components/ui/dialog'
import { Button } from '@/components/ui/button'
import { Input } from '@/components/ui/input'
import { Label } from '@/components/ui/label'
import { Textarea } from '@/components/ui/textarea'
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from '@/components/ui/select'
import { createTraining } from '@/services/trainings'
import { useToast } from '@/hooks/use-toast'
import { Loader2 } from 'lucide-react'
import type { ClientRecord } from '@/types/service_record'

interface NewTrainingDialogProps {
  open: boolean
  onOpenChange: (open: boolean) => void
  clients?: ClientRecord[]
  onSuccess?: () => void
}

export function NewTrainingDialog({
  open,
  onOpenChange,
  clients: initialClients,
  onSuccess,
}: NewTrainingDialogProps) {
  const [name, setName] = useState('')
  const [clientId, setClientId] = useState('')
  const [date, setDate] = useState(new Date().toISOString().substring(0, 10))
  const [description, setDescription] = useState('')
  const [planContent, setPlanContent] = useState('')
  const [loading, setLoading] = useState(false)
  const [availableClients, setAvailableClients] = useState<ClientRecord[]>(initialClients || [])
  const { toast } = useToast()

  // Sincronizar clientes recebidos ou buscar diretamente se não vierem na prop
  useEffect(() => {
    if (initialClients && initialClients.length > 0) {
      setAvailableClients(initialClients)
    } else if (open) {
      import('@/services/clients').then(({ getClients }) => {
        getClients()
          .then((list) => {
            if (Array.isArray(list) && list.length > 0) {
              setAvailableClients(list)
            }
          })
          .catch((err) => {
            console.warn('Erro ao carregar clientes no NewTrainingDialog:', err)
          })
      })
    }
  }, [initialClients, open])

  const safeClients = Array.isArray(availableClients) ? availableClients : []
  const clientOptions = safeClients.filter(
    (c) => (c.company && c.company.trim()) || (c.name && c.name.trim()),
  )

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault()
    if (!name.trim() || !clientId || !date) return
    setLoading(true)
    try {
      await createTraining({
        name: name.trim(),
        client: clientId,
        training_date: new Date(date).toISOString(),
        description: description.trim(),
        plan_content: planContent.trim(),
      })
      toast({ title: 'Treinamento registrado!' })
      setName('')
      setClientId('')
      setDescription('')
      setPlanContent('')
      onOpenChange(false)
      onSuccess?.()
    } catch {
      toast({ variant: 'destructive', title: 'Erro ao registrar treinamento' })
    } finally {
      setLoading(false)
    }
  }

  return (
    <Dialog open={open} onOpenChange={onOpenChange}>
      <DialogContent className="sm:max-w-[480px]">
        <DialogHeader>
          <DialogTitle className="text-base font-bold text-slate-900">Novo Treinamento</DialogTitle>
        </DialogHeader>
        <form onSubmit={handleSubmit} className="space-y-3 py-2">
          <div className="space-y-1.5">
            <Label className="text-xs">Nome do Treinamento *</Label>
            <Input
              required
              value={name}
              onChange={(e) => setName(e.target.value)}
              placeholder="Ex: Treinamento sobre Bagagem"
              className="h-9 text-xs"
            />
          </div>
          <div className="grid grid-cols-2 gap-3">
            <div className="space-y-1.5">
              <Label className="text-xs">Agência *</Label>
              <Select value={clientId} onValueChange={setClientId}>
                <SelectTrigger className="h-9 text-xs">
                  <SelectValue placeholder="Selecionar..." />
                </SelectTrigger>
                <SelectContent>
                  {clientOptions.length === 0 ? (
                    <SelectItem value="__none__" disabled className="text-xs text-slate-400">
                      Nenhum cliente cadastrado
                    </SelectItem>
                  ) : (
                    clientOptions.map((c) => (
                      <SelectItem key={c.id} value={c.id}>
                        {c.company || c.name}{' '}
                        {c.company && c.name && c.company !== c.name ? `(${c.name})` : ''}
                      </SelectItem>
                    ))
                  )}
                </SelectContent>
              </Select>
            </div>
            <div className="space-y-1.5">
              <Label className="text-xs">Data *</Label>
              <Input
                type="date"
                required
                value={date}
                onChange={(e) => setDate(e.target.value)}
                className="h-9 text-xs"
              />
            </div>
          </div>
          <div className="space-y-1.5">
            <Label className="text-xs">Descrição</Label>
            <Textarea
              rows={2}
              value={description}
              onChange={(e) => setDescription(e.target.value)}
              placeholder="Breve descrição do treinamento..."
              className="text-xs"
            />
          </div>
          <div className="space-y-1.5">
            <Label className="text-xs">Plano de Treinamento (opcional)</Label>
            <Textarea
              rows={3}
              value={planContent}
              onChange={(e) => setPlanContent(e.target.value)}
              placeholder="Conteúdo programático, tópicos abordados..."
              className="text-xs"
            />
          </div>
          <div className="flex justify-end gap-2 pt-1">
            <Button type="button" variant="outline" size="sm" onClick={() => onOpenChange(false)}>
              Cancelar
            </Button>
            <Button
              type="submit"
              disabled={loading}
              size="sm"
              className="bg-indigo-600 hover:bg-indigo-700"
            >
              {loading && <Loader2 className="h-3.5 w-3.5 mr-1 animate-spin" />}
              Salvar
            </Button>
          </div>
        </form>
      </DialogContent>
    </Dialog>
  )
}
