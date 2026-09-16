import { useState, useEffect } from 'react'
import { Card, CardContent, CardHeader, CardTitle, CardDescription } from '@/components/ui/card'
import { Button } from '@/components/ui/button'
import { Input } from '@/components/ui/input'
import { Label } from '@/components/ui/label'
import { Slider } from '@/components/ui/slider'
import { Badge } from '@/components/ui/badge'
import {
  SlidersHorizontal,
  Clock,
  Palmtree,
  Scale,
  ShieldCheck,
  Save,
  RotateCcw,
} from 'lucide-react'
import { AbsenceAlertConfigRecord } from '@/types/banco-ferias'
import { updateAbsenceAlertConfig, DEFAULT_ABSENCE_ALERT_CONFIG } from '@/services/banco-ferias'
import { toast } from '@/hooks/use-toast'

interface AbsenceAlertSettingsProps {
  config: AbsenceAlertConfigRecord
  canEdit: boolean
  onSaved: () => void
}

export function AbsenceAlertSettings({ config, canEdit, onSaved }: AbsenceAlertSettingsProps) {
  const [hourBankLimit, setHourBankLimit] = useState<number>(config.hour_bank_limit_hours || 10)
  const [hourBankNegLimit, setHourBankNegLimit] = useState<number>(
    config.hour_bank_negative_limit_hours || 10,
  )
  const [vacationWarningDays, setVacationWarningDays] = useState<number>(
    config.vacation_warning_days_before_expiry || 60,
  )
  const [vacationWindowStart, setVacationWindowStart] = useState<number>(
    config.vacation_ideal_window_start_months || 6,
  )
  const [vacationWindowEnd, setVacationWindowEnd] = useState<number>(
    config.vacation_ideal_window_end_months || 11,
  )
  const [interjornadaHours, setInterjornadaHours] = useState<number>(
    config.min_interjornada_hours || 11,
  )
  const [consecutiveDays, setConsecutiveDays] = useState<number>(
    config.max_consecutive_work_days || 7,
  )
  const [teamAbsencePct, setTeamAbsencePct] = useState<number>(config.max_team_absence_pct || 30)
  const [isSaving, setIsSaving] = useState(false)

  useEffect(() => {
    setHourBankLimit(config.hour_bank_limit_hours || 10)
    setHourBankNegLimit(config.hour_bank_negative_limit_hours || 10)
    setVacationWarningDays(config.vacation_warning_days_before_expiry || 60)
    setVacationWindowStart(config.vacation_ideal_window_start_months || 6)
    setVacationWindowEnd(config.vacation_ideal_window_end_months || 11)
    setInterjornadaHours(config.min_interjornada_hours || 11)
    setConsecutiveDays(config.max_consecutive_work_days || 7)
    setTeamAbsencePct(config.max_team_absence_pct || 30)
  }, [config])

  const handleSave = async (e: React.FormEvent) => {
    e.preventDefault()
    if (!canEdit) return

    setIsSaving(true)
    try {
      await updateAbsenceAlertConfig(config.id, {
        hour_bank_limit_hours: hourBankLimit,
        hour_bank_negative_limit_hours: hourBankNegLimit,
        vacation_warning_days_before_expiry: vacationWarningDays,
        vacation_ideal_window_start_months: vacationWindowStart,
        vacation_ideal_window_end_months: vacationWindowEnd,
        min_interjornada_hours: interjornadaHours,
        max_consecutive_work_days: consecutiveDays,
        max_team_absence_pct: teamAbsencePct,
      })

      toast({
        title: 'Parâmetros atualizados com sucesso!',
        description: 'Os novos limites e alertas de banco de horas e férias foram salvos.',
      })
      onSaved()
    } catch (err: any) {
      console.error('Erro ao atualizar configurações:', err)
      toast({
        variant: 'destructive',
        title: 'Erro ao salvar parâmetros',
        description: err?.message || 'Falha na comunicação com o servidor.',
      })
    } finally {
      setIsSaving(false)
    }
  }

  const handleResetDefaults = () => {
    setHourBankLimit(DEFAULT_ABSENCE_ALERT_CONFIG.hour_bank_limit_hours)
    setHourBankNegLimit(DEFAULT_ABSENCE_ALERT_CONFIG.hour_bank_negative_limit_hours || 10)
    setVacationWarningDays(DEFAULT_ABSENCE_ALERT_CONFIG.vacation_warning_days_before_expiry)
    setVacationWindowStart(DEFAULT_ABSENCE_ALERT_CONFIG.vacation_ideal_window_start_months)
    setVacationWindowEnd(DEFAULT_ABSENCE_ALERT_CONFIG.vacation_ideal_window_end_months)
    setInterjornadaHours(DEFAULT_ABSENCE_ALERT_CONFIG.min_interjornada_hours)
    setConsecutiveDays(DEFAULT_ABSENCE_ALERT_CONFIG.max_consecutive_work_days)
    setTeamAbsencePct(DEFAULT_ABSENCE_ALERT_CONFIG.max_team_absence_pct)
  }

  return (
    <form onSubmit={handleSave} className="space-y-6">
      {/* 1. Banco de Horas (Requisito Explícito do Usuário: Limite de Acúmulo Editável) */}
      <Card className="border-slate-200 shadow-sm">
        <CardHeader className="pb-3 border-b border-slate-100">
          <div className="flex items-center justify-between">
            <div className="flex items-center gap-2.5">
              <div className="p-2 rounded-lg bg-blue-50 text-blue-600 border border-blue-100">
                <Clock className="h-5 w-5" />
              </div>
              <div>
                <CardTitle className="text-base font-bold text-slate-900">
                  Gatilhos de Acúmulo de Banco de Horas (Editável)
                </CardTitle>
                <CardDescription className="text-xs">
                  "A partir de 10h acumuladas, disparar o alerta. Esse número de horas é que precisa
                  ser editável."
                </CardDescription>
              </div>
            </div>
            <Badge className="bg-blue-100 text-blue-800 border-blue-200 text-xs font-semibold">
              Regra de Acúmulo
            </Badge>
          </div>
        </CardHeader>
        <CardContent className="pt-4 space-y-5">
          <div className="space-y-2">
            <div className="flex items-center justify-between">
              <Label className="text-xs font-semibold text-slate-800">
                Limite de Horas Acumuladas Positivas (Teto de Alerta)
              </Label>
              <span className="text-sm font-bold text-blue-700 bg-blue-50 px-2 py-0.5 rounded border border-blue-200">
                {hourBankLimit} horas
              </span>
            </div>
            <Slider
              value={[hourBankLimit]}
              min={2}
              max={40}
              step={1}
              disabled={!canEdit}
              onValueChange={([val]) => setHourBankLimit(val)}
              className="py-1"
            />
            <p className="text-[11px] text-slate-500">
              Quando o saldo acumulado do colaborador atinge ou ultrapassa este valor, é disparado
              um alerta no sino e e-mail para o colaborador e seus gestores agendarem compensação.
            </p>
          </div>

          <div className="space-y-2 pt-2 border-t border-slate-100">
            <div className="flex items-center justify-between">
              <Label className="text-xs font-semibold text-slate-800">
                Teto de Alerta para Saldo Negativo (Devedor)
              </Label>
              <span className="text-sm font-bold text-slate-700 bg-slate-100 px-2 py-0.5 rounded border border-slate-200">
                -{hourBankNegLimit} horas
              </span>
            </div>
            <Slider
              value={[hourBankNegLimit]}
              min={2}
              max={30}
              step={1}
              disabled={!canEdit}
              onValueChange={([val]) => setHourBankNegLimit(val)}
              className="py-1"
            />
            <p className="text-[11px] text-slate-500">
              Gatilho de alerta quando o saldo devedor do colaborador atinge esse patamar.
            </p>
          </div>
        </CardContent>
      </Card>

      {/* 2. Política de Férias e Cobertura da Equipe */}
      <Card className="border-slate-200 shadow-sm">
        <CardHeader className="pb-3 border-b border-slate-100">
          <div className="flex items-center justify-between">
            <div className="flex items-center gap-2.5">
              <div className="p-2 rounded-lg bg-amber-50 text-amber-600 border border-amber-100">
                <Palmtree className="h-5 w-5" />
              </div>
              <div>
                <CardTitle className="text-base font-bold text-slate-900">
                  Política de Férias &amp; Cobertura de Equipe
                </CardTitle>
                <CardDescription className="text-xs">
                  Alertas de período aquisitivo, proximidade de vencimento e limite de ausências
                  simultâneas por Núcleo.
                </CardDescription>
              </div>
            </div>
            <Badge className="bg-amber-100 text-amber-800 border-amber-200 text-xs font-semibold">
              Gestão Preventiva
            </Badge>
          </div>
        </CardHeader>
        <CardContent className="pt-4 space-y-5">
          <div className="space-y-2">
            <div className="flex items-center justify-between">
              <Label className="text-xs font-semibold text-slate-800">
                Antecedência do Alerta de Férias Vencendo (Prazo Concessivo)
              </Label>
              <span className="text-sm font-bold text-amber-700 bg-amber-50 px-2 py-0.5 rounded border border-amber-200">
                {vacationWarningDays} dias antes
              </span>
            </div>
            <Slider
              value={[vacationWarningDays]}
              min={15}
              max={120}
              step={5}
              disabled={!canEdit}
              onValueChange={([val]) => setVacationWarningDays(val)}
              className="py-1"
            />
            <p className="text-[11px] text-slate-500">
              Dispara notificações quando o colaborador estiver a menos de {vacationWarningDays}{' '}
              dias de estourar o limite concessivo legal (2 anos).
            </p>
          </div>

          <div className="grid grid-cols-1 md:grid-cols-2 gap-4 pt-2 border-t border-slate-100">
            <div className="space-y-1.5">
              <Label className="text-xs font-semibold text-slate-800">
                Início da Janela Ideal de Férias
              </Label>
              <Input
                type="number"
                min={1}
                max={12}
                value={vacationWindowStart}
                onChange={(e) => setVacationWindowStart(parseInt(e.target.value) || 6)}
                disabled={!canEdit}
                className="h-9 text-xs"
              />
              <p className="text-[10px] text-slate-400">
                Meses após a conclusão do período aquisitivo (default: 6 meses).
              </p>
            </div>

            <div className="space-y-1.5">
              <Label className="text-xs font-semibold text-slate-800">
                Término da Janela Ideal de Férias
              </Label>
              <Input
                type="number"
                min={2}
                max={12}
                value={vacationWindowEnd}
                onChange={(e) => setVacationWindowEnd(parseInt(e.target.value) || 11)}
                disabled={!canEdit}
                className="h-9 text-xs"
              />
              <p className="text-[10px] text-slate-400">
                Meses após aquisitivo para gozo ideal (default: 11 meses, antes do vencimento).
              </p>
            </div>
          </div>

          <div className="space-y-2 pt-2 border-t border-slate-100">
            <div className="flex items-center justify-between">
              <Label className="text-xs font-semibold text-slate-800">
                Teto Máximo de Ausências Simultâneas no Núcleo (Cobertura Mínima)
              </Label>
              <span className="text-sm font-bold text-indigo-700 bg-indigo-50 px-2 py-0.5 rounded border border-indigo-200">
                {teamAbsencePct}% da equipe
              </span>
            </div>
            <Slider
              value={[teamAbsencePct]}
              min={10}
              max={60}
              step={5}
              disabled={!canEdit}
              onValueChange={([val]) => setTeamAbsencePct(val)}
              className="py-1"
            />
            <p className="text-[11px] text-slate-500">
              Se ao agendar férias/dayoff mais de {teamAbsencePct}% dos consultores do mesmo Núcleo
              já estiverem ausentes na mesma data, o sistema emite alerta preventivo de falta de
              cobertura.
            </p>
          </div>
        </CardContent>
      </Card>

      {/* 3. Validações Trabalhistas CLT */}
      <Card className="border-slate-200 shadow-sm">
        <CardHeader className="pb-3 border-b border-slate-100">
          <div className="flex items-center justify-between">
            <div className="flex items-center gap-2.5">
              <div className="p-2 rounded-lg bg-emerald-50 text-emerald-600 border border-emerald-100">
                <Scale className="h-5 w-5" />
              </div>
              <div>
                <CardTitle className="text-base font-bold text-slate-900">
                  Validações Trabalhistas CLT (Interjornada &amp; DSR)
                </CardTitle>
                <CardDescription className="text-xs">
                  Regras da CLT calculadas a partir dos registros de atendimento (excluindo gestores
                  que não marcam ponto).
                </CardDescription>
              </div>
            </div>
            <Badge className="bg-emerald-100 text-emerald-800 border-emerald-200 text-xs font-semibold">
              Conformidade Legal
            </Badge>
          </div>
        </CardHeader>
        <CardContent className="pt-4 space-y-4">
          <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
            <div className="space-y-1.5">
              <Label className="text-xs font-semibold text-slate-800">
                Mínimo de Interjornada (Horas)
              </Label>
              <Input
                type="number"
                min={8}
                max={24}
                value={interjornadaHours}
                onChange={(e) => setInterjornadaHours(parseInt(e.target.value) || 11)}
                disabled={!canEdit}
                className="h-9 text-xs"
              />
              <p className="text-[10px] text-slate-400">
                Piso legal CLT Art. 66: mínimo de 11h consecutivas de descanso entre jornadas.
              </p>
            </div>

            <div className="space-y-1.5">
              <Label className="text-xs font-semibold text-slate-800">
                Limite de Dias Consecutivos sem Folga (DSR)
              </Label>
              <Input
                type="number"
                min={4}
                max={14}
                value={consecutiveDays}
                onChange={(e) => setConsecutiveDays(parseInt(e.target.value) || 7)}
                disabled={!canEdit}
                className="h-9 text-xs"
              />
              <p className="text-[10px] text-slate-400">
                CLT Art. 67: alerta quando o colaborador atuar em 7 ou mais dias seguidos sem
                descanso.
              </p>
            </div>
          </div>
        </CardContent>
      </Card>

      {/* Ações */}
      {canEdit && (
        <div className="flex items-center justify-between pt-2">
          <Button
            type="button"
            variant="outline"
            size="sm"
            onClick={handleResetDefaults}
            className="text-xs gap-1.5"
          >
            <RotateCcw className="h-3.5 w-3.5" />
            Restaurar Padrões Recomendados
          </Button>

          <Button
            type="submit"
            size="sm"
            disabled={isSaving}
            className="text-xs bg-indigo-600 hover:bg-indigo-700 text-white gap-1.5"
          >
            <Save className="h-3.5 w-3.5" />
            {isSaving ? 'Salvando...' : 'Salvar Alterações de Parâmetros'}
          </Button>
        </div>
      )}
    </form>
  )
}
