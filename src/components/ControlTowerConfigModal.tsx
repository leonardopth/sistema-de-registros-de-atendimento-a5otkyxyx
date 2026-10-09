import { useState, useEffect } from 'react'
import {
  Dialog,
  DialogContent,
  DialogHeader,
  DialogTitle,
  DialogDescription,
  DialogFooter,
} from '@/components/ui/dialog'
import { Button } from '@/components/ui/button'
import { Input } from '@/components/ui/input'
import { Label } from '@/components/ui/label'
import { useToast } from '@/hooks/use-toast'
import { ControlTowerConfigRecord } from '@/types/control_tower'
import { updateControlTowerConfig } from '@/services/control_tower'
import { Sliders, Save, Loader2, Clock, ShieldAlert, Sparkles, Check } from 'lucide-react'

interface ControlTowerConfigModalProps {
  open: boolean
  onOpenChange: (open: boolean) => void
  config: ControlTowerConfigRecord | null
  onSaved: () => void
}

export function ControlTowerConfigModal({
  open,
  onOpenChange,
  config,
  onSaved,
}: ControlTowerConfigModalProps) {
  const { toast } = useToast()
  const [saving, setSaving] = useState(false)

  // Pesos
  const [wDep24, setWDep24] = useState(50)
  const [wDep48, setWDep48] = useState(30)
  const [wCancel, setWCancel] = useState(35)
  const [wVip, setWVip] = useState(25)
  const [wHourInbox, setWHourInbox] = useState(5)
  const [wDeadline, setWDeadline] = useState(20)
  const [wComplaint, setWComplaint] = useState(40)
  const [wRepeat, setWRepeat] = useState(15)

  // Thresholds
  const [thP1, setThP1] = useState(60)
  const [thP2, setThP2] = useState(30)

  // Expediente
  const [hoursStart, setHoursStart] = useState('08:00')
  const [hoursEnd, setHoursEnd] = useState('18:00')
  const [businessDays, setBusinessDays] = useState<number[]>([1, 2, 3, 4, 5])

  // SLAs Alvo em horas úteis
  const [slaP1, setSlaP1] = useState(2)
  const [slaP2, setSlaP2] = useState(4)
  const [slaP3, setSlaP3] = useState(8)

  useEffect(() => {
    if (config) {
      setWDep24(config.weight_departure_24h ?? 50)
      setWDep48(config.weight_departure_48h ?? 30)
      setWCancel(config.weight_cancellation ?? 35)
      setWVip(config.weight_priority_client ?? 25)
      setWHourInbox(config.weight_per_hour_inbox ?? 5)
      setWDeadline(config.weight_promised_deadline ?? 20)
      setWComplaint(config.weight_formal_complaint ?? 40)
      setWRepeat(config.weight_repeat_contact ?? 15)
      setThP1(config.score_threshold_p1 ?? 60)
      setThP2(config.score_threshold_p2 ?? 30)
      setHoursStart(config.business_hours_start || '08:00')
      setHoursEnd(config.business_hours_end || '18:00')
      if (Array.isArray(config.business_days)) {
        setBusinessDays(config.business_days)
      }
      setSlaP1(config.target_sla_p1_hours ?? 2)
      setSlaP2(config.target_sla_p2_hours ?? 4)
      setSlaP3(config.target_sla_p3_hours ?? 8)
    }
  }, [config, open])

  const toggleDay = (day: number) => {
    if (businessDays.includes(day)) {
      if (businessDays.length > 1) {
        setBusinessDays(businessDays.filter((d) => d !== day))
      }
    } else {
      setBusinessDays([...businessDays, day].sort())
    }
  }

  const handleSave = async () => {
    if (!config) return
    setSaving(true)
    try {
      await updateControlTowerConfig(config.id, {
        weight_departure_24h: Number(wDep24),
        weight_departure_48h: Number(wDep48),
        weight_cancellation: Number(wCancel),
        weight_priority_client: Number(wVip),
        weight_per_hour_inbox: Number(wHourInbox),
        weight_promised_deadline: Number(wDeadline),
        weight_formal_complaint: Number(wComplaint),
        weight_repeat_contact: Number(wRepeat),
        score_threshold_p1: Number(thP1),
        score_threshold_p2: Number(thP2),
        business_hours_start: hoursStart.trim(),
        business_hours_end: hoursEnd.trim(),
        business_days: businessDays,
        target_sla_p1_hours: Number(slaP1),
        target_sla_p2_hours: Number(slaP2),
        target_sla_p3_hours: Number(slaP3),
      })
      toast({
        title: 'Parâmetros atualizados!',
        description: 'Os novos pesos e regras de SLA entraram em vigor na Torre de Controle.',
      })
      onSaved()
      onOpenChange(false)
    } catch (err) {
      toast({
        variant: 'destructive',
        title: 'Erro ao salvar parâmetros',
        description: 'Verifique se você possui permissão de Líder ou Master/Admin.',
      })
    } finally {
      setSaving(false)
    }
  }

  const daysLabel = [
    { id: 0, label: 'Dom' },
    { id: 1, label: 'Seg' },
    { id: 2, label: 'Ter' },
    { id: 3, label: 'Qua' },
    { id: 4, label: 'Qui' },
    { id: 5, label: 'Sex' },
    { id: 6, label: 'Sáb' },
  ]

  return (
    <Dialog open={open} onOpenChange={onOpenChange}>
      <DialogContent className="sm:max-w-[700px] max-h-[90vh] overflow-y-auto">
        <DialogHeader>
          <DialogTitle className="flex items-center gap-2 text-indigo-950 text-lg">
            <Sliders className="h-5 w-5 text-indigo-600" />
            Parâmetros da Torre de Controle
          </DialogTitle>
          <DialogDescription className="text-xs text-slate-500">
            Ajuste os pesos dos sinais detectados pelo motor, os thresholds para faixas P1/P2/P3, os
            horários de expediente comercial e as metas de SLA. Visível apenas para Líderes e
            Master/Admin.
          </DialogDescription>
        </DialogHeader>

        <div className="space-y-6 py-2 text-xs">
          {/* Seção 1: Pesos por Sinal */}
          <div className="space-y-3 p-4 bg-slate-50 border border-slate-200 rounded-lg">
            <h4 className="font-bold text-slate-800 flex items-center gap-1.5 text-xs">
              <Sparkles className="h-4 w-4 text-amber-500" />
              Pesos dos Sinais Detectados (Pontos no Score)
            </h4>
            <div className="grid grid-cols-1 sm:grid-cols-2 gap-3">
              <div>
                <Label className="text-[11px] text-slate-600">
                  Embarque &lt; 24h (Urgência Máxima)
                </Label>
                <Input
                  type="number"
                  min="0"
                  max="100"
                  value={wDep24}
                  onChange={(e) => setWDep24(Number(e.target.value))}
                  className="h-8 text-xs mt-1"
                />
              </div>
              <div>
                <Label className="text-[11px] text-slate-600">Embarque &lt; 48h</Label>
                <Input
                  type="number"
                  min="0"
                  max="100"
                  value={wDep48}
                  onChange={(e) => setWDep48(Number(e.target.value))}
                  className="h-8 text-xs mt-1"
                />
              </div>
              <div>
                <Label className="text-[11px] text-slate-600">Cancelamento / Remarcação</Label>
                <Input
                  type="number"
                  min="0"
                  max="100"
                  value={wCancel}
                  onChange={(e) => setWCancel(Number(e.target.value))}
                  className="h-8 text-xs mt-1"
                />
              </div>
              <div>
                <Label className="text-[11px] text-slate-600">
                  Cliente Prioritário (VIP no cadastro)
                </Label>
                <Input
                  type="number"
                  min="0"
                  max="100"
                  value={wVip}
                  onChange={(e) => setWVip(Number(e.target.value))}
                  className="h-8 text-xs mt-1"
                />
              </div>
              <div>
                <Label className="text-[11px] text-slate-600">
                  Reclamação Formal / Procon / Jurídico
                </Label>
                <Input
                  type="number"
                  min="0"
                  max="100"
                  value={wComplaint}
                  onChange={(e) => setWComplaint(Number(e.target.value))}
                  className="h-8 text-xs mt-1"
                />
              </div>
              <div>
                <Label className="text-[11px] text-slate-600">
                  Prazo Prometido / Retorno Exigido
                </Label>
                <Input
                  type="number"
                  min="0"
                  max="100"
                  value={wDeadline}
                  onChange={(e) => setWDeadline(Number(e.target.value))}
                  className="h-8 text-xs mt-1"
                />
              </div>
              <div>
                <Label className="text-[11px] text-slate-600">
                  Reincidente (contatos recentes repetidos)
                </Label>
                <Input
                  type="number"
                  min="0"
                  max="100"
                  value={wRepeat}
                  onChange={(e) => setWRepeat(Number(e.target.value))}
                  className="h-8 text-xs mt-1"
                />
              </div>
              <div>
                <Label className="text-[11px] text-slate-600">Peso por Hora Útil na Caixa</Label>
                <Input
                  type="number"
                  min="0"
                  max="20"
                  value={wHourInbox}
                  onChange={(e) => setWHourInbox(Number(e.target.value))}
                  className="h-8 text-xs mt-1"
                />
              </div>
            </div>
          </div>

          {/* Seção 2: Faixas de Prioridade (P1 / P2 / P3) */}
          <div className="space-y-3 p-4 bg-indigo-50/40 border border-indigo-200 rounded-lg">
            <h4 className="font-bold text-indigo-950 flex items-center gap-1.5 text-xs">
              <ShieldAlert className="h-4 w-4 text-indigo-600" />
              Faixas de Pontuação e Prioridade
            </h4>
            <div className="grid grid-cols-1 sm:grid-cols-2 gap-3">
              <div>
                <Label className="text-[11px] text-slate-600">
                  Pontuação Mínima para P1 (Alta)
                </Label>
                <Input
                  type="number"
                  min="1"
                  max="150"
                  value={thP1}
                  onChange={(e) => setThP1(Number(e.target.value))}
                  className="h-8 text-xs mt-1"
                />
                <p className="text-[10px] text-slate-400 mt-1">
                  E-mails com score ≥ {thP1} recebem P1.
                </p>
              </div>
              <div>
                <Label className="text-[11px] text-slate-600">
                  Pontuação Mínima para P2 (Média)
                </Label>
                <Input
                  type="number"
                  min="1"
                  max="150"
                  value={thP2}
                  onChange={(e) => setThP2(Number(e.target.value))}
                  className="h-8 text-xs mt-1"
                />
                <p className="text-[10px] text-slate-400 mt-1">
                  E-mails entre {thP2} e {thP1 - 1} recebem P2 (abaixo é P3).
                </p>
              </div>
            </div>
          </div>

          {/* Seção 3: Expediente Comercial e SLAs Alvo */}
          <div className="space-y-3 p-4 bg-slate-50 border border-slate-200 rounded-lg">
            <h4 className="font-bold text-slate-800 flex items-center gap-1.5 text-xs">
              <Clock className="h-4 w-4 text-cyan-600" />
              Expediente Comercial (Pausa Fora do Horário)
            </h4>
            <div className="grid grid-cols-1 sm:grid-cols-2 gap-3">
              <div>
                <Label className="text-[11px] text-slate-600">Início do Expediente</Label>
                <Input
                  type="text"
                  placeholder="08:00"
                  value={hoursStart}
                  onChange={(e) => setHoursStart(e.target.value)}
                  className="h-8 text-xs mt-1"
                />
              </div>
              <div>
                <Label className="text-[11px] text-slate-600">Término do Expediente</Label>
                <Input
                  type="text"
                  placeholder="18:00"
                  value={hoursEnd}
                  onChange={(e) => setHoursEnd(e.target.value)}
                  className="h-8 text-xs mt-1"
                />
              </div>
            </div>

            <div className="space-y-1.5 pt-2">
              <Label className="text-[11px] text-slate-600">Dias Úteis de Operação</Label>
              <div className="flex items-center gap-1.5 flex-wrap">
                {daysLabel.map((d) => {
                  const active = businessDays.includes(d.id)
                  return (
                    <button
                      key={d.id}
                      type="button"
                      onClick={() => toggleDay(d.id)}
                      className={`px-2.5 py-1 text-xs rounded-md font-semibold border transition-colors ${
                        active
                          ? 'bg-indigo-600 text-white border-indigo-600 shadow-sm'
                          : 'bg-white text-slate-600 border-slate-200 hover:bg-slate-100'
                      }`}
                    >
                      {active && <Check className="inline h-3 w-3 mr-1" />}
                      {d.label}
                    </button>
                  )
                })}
              </div>
            </div>

            <div className="pt-2 border-t border-slate-200 grid grid-cols-1 sm:grid-cols-3 gap-3">
              <div>
                <Label className="text-[11px] text-red-700 font-semibold">
                  SLA Alvo P1 (Horas Úteis)
                </Label>
                <Input
                  type="number"
                  min="0.5"
                  step="0.5"
                  value={slaP1}
                  onChange={(e) => setSlaP1(Number(e.target.value))}
                  className="h-8 text-xs mt-1"
                />
              </div>
              <div>
                <Label className="text-[11px] text-amber-700 font-semibold">
                  SLA Alvo P2 (Horas Úteis)
                </Label>
                <Input
                  type="number"
                  min="1"
                  step="0.5"
                  value={slaP2}
                  onChange={(e) => setSlaP2(Number(e.target.value))}
                  className="h-8 text-xs mt-1"
                />
              </div>
              <div>
                <Label className="text-[11px] text-emerald-700 font-semibold">
                  SLA Alvo P3 (Horas Úteis)
                </Label>
                <Input
                  type="number"
                  min="1"
                  step="1"
                  value={slaP3}
                  onChange={(e) => setSlaP3(Number(e.target.value))}
                  className="h-8 text-xs mt-1"
                />
              </div>
            </div>
          </div>
        </div>

        <DialogFooter className="gap-2">
          <Button variant="outline" size="sm" onClick={() => onOpenChange(false)}>
            Cancelar
          </Button>
          <Button
            size="sm"
            onClick={handleSave}
            disabled={saving}
            className="bg-indigo-600 hover:bg-indigo-700 text-white font-bold"
          >
            {saving ? (
              <Loader2 className="h-3.5 w-3.5 animate-spin mr-1.5" />
            ) : (
              <Save className="h-3.5 w-3.5 mr-1.5" />
            )}
            Salvar Parâmetros
          </Button>
        </DialogFooter>
      </DialogContent>
    </Dialog>
  )
}
