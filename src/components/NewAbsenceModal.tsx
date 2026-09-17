import { useState, useEffect } from 'react'
import {
  Dialog,
  DialogContent,
  DialogHeader,
  DialogTitle,
  DialogFooter,
} from '@/components/ui/dialog'
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
import { Alert, AlertDescription, AlertTitle } from '@/components/ui/alert'
import { AlertCircle, AlertTriangle, CheckCircle2, Palmtree, Users } from 'lucide-react'
import { UserRecord } from '@/types/service_record'
import { AbsenceRecord, AbsenceReason, AbsenceAlertConfigRecord } from '@/types/banco-ferias'
import { createAbsence } from '@/services/banco-ferias'
import { checkTeamCoverage, isManagerRole } from '@/services/clt-validation'
import { useAuth } from '@/hooks/use-auth'
import { toast } from '@/hooks/use-toast'

interface NewAbsenceModalProps {
  open: boolean
  onOpenChange: (open: boolean) => void
  users: UserRecord[]
  allAbsences: AbsenceRecord[]
  config: AbsenceAlertConfigRecord
  prefilledDate?: string
  prefilledUserId?: string
  onSaved: () => void
}

export function NewAbsenceModal({
  open,
  onOpenChange,
  users,
  allAbsences,
  config,
  prefilledDate,
  prefilledUserId,
  onSaved,
}: NewAbsenceModalProps) {
  const { user: currentUser } = useAuth()
  const [userId, setUserId] = useState<string>('')
  const [reason, setReason] = useState<AbsenceReason>('Férias')
  const [startDate, setStartDate] = useState<string>('')
  const [endDate, setEndDate] = useState<string>('')
  const [notes, setNotes] = useState<string>('')
  const [autoApprove, setAutoApprove] = useState<boolean>(true)
  const [isSubmitting, setIsSubmitting] = useState(false)

  const isCurrentUserLeader =
    isManagerRole(currentUser?.role) ||
    currentUser?.role === 'Master' ||
    currentUser?.master_access === true

  // Ao abrir ou receber novos preenchimentos
  useEffect(() => {
    if (open) {
      const defaultDate = prefilledDate || new Date().toISOString().substring(0, 10)
      setStartDate(defaultDate)
      setEndDate(defaultDate)
      const initialUser = prefilledUserId || currentUser?.id || (users[0]?.id ?? '')
      setUserId(initialUser)
      setReason('Férias')
      setNotes('')
      // Gestor pode auto-aprovar diretamente na criação se a configuração permitir ou se for o gestor agendando
      setAutoApprove(isCurrentUserLeader)
    }
  }, [open, prefilledDate, prefilledUserId, users, currentUser, isCurrentUserLeader])

  const selectedUser = users.find((u) => u.id === userId)

  // Membros do mesmo Núcleo do usuário selecionado para verificação de cobertura
  const sameTeamUsers = selectedUser
    ? users.filter((u) => {
        const selGroups = (selectedUser.service_groups as string[] | undefined) || []
        if (selGroups.length === 0) return true
        const uGroups = (u.service_groups as string[] | undefined) || []
        return uGroups.some((g) => selGroups.includes(g))
      })
    : []

  // Verificação de Cobertura da Equipe na data de início e fim
  const coverageCheck = startDate
    ? checkTeamCoverage(startDate, sameTeamUsers, allAbsences, config.max_team_absence_pct || 30)
    : null

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault()
    if (!userId || !startDate || !endDate) {
      toast({
        variant: 'destructive',
        title: 'Campos obrigatórios',
        description: 'Selecione o colaborador e o período de início e fim da ausência.',
      })
      return
    }

    if (endDate < startDate) {
      toast({
        variant: 'destructive',
        title: 'Data inválida',
        description: 'A data de término não pode ser anterior à data de início.',
      })
      return
    }

    setIsSubmitting(true)
    try {
      // Regra 2 do requisito:
      // Ausências criadas por colaboradores entram como "Pendente";
      // Gestores/liderança podem aprovar diretamente na criação (auto-aprovada quando o próprio gestor agenda ou toggle).
      const shouldApproveNow = isCurrentUserLeader && autoApprove
      const initialStatus = shouldApproveNow ? 'Aprovada' : 'Pendente'

      await createAbsence({
        user_id: userId,
        reason,
        start_date: `${startDate} 00:00:00.000Z`,
        end_date: `${endDate} 23:59:59.000Z`,
        status: initialStatus,
        notes: notes || undefined,
        source: 'manual',
        coverage_checked: true,
        approved_by: shouldApproveNow ? currentUser?.id : undefined,
        approved_at: shouldApproveNow ? new Date().toISOString() : undefined,
        approval_notes: shouldApproveNow
          ? 'Aprovado diretamente na criação pelo gestor'
          : undefined,
      })

      if (shouldApproveNow) {
        toast({
          title: 'Ausência agendada e aprovada!',
          description: `${reason} confirmada no calendário para ${selectedUser?.name || 'colaborador'}.`,
        })
      } else {
        toast({
          title: 'Solicitação enviada com sucesso!',
          description: `Sua solicitação de ${reason} foi enviada para aprovação da liderança.`,
        })
      }
      onSaved()
      onOpenChange(false)
    } catch (err: any) {
      console.error('Erro ao agendar ausência:', err)
      toast({
        variant: 'destructive',
        title: 'Erro ao agendar ausência',
        description: err?.message || 'Falha ao comunicar com o servidor.',
      })
    } finally {
      setIsSubmitting(false)
    }
  }

  return (
    <Dialog open={open} onOpenChange={onOpenChange}>
      <DialogContent className="max-w-lg">
        <DialogHeader>
          <DialogTitle className="text-base font-bold text-slate-900 flex items-center gap-2">
            <Palmtree className="h-5 w-5 text-indigo-600" />
            Agendar Nova Ausência
          </DialogTitle>
        </DialogHeader>

        <form onSubmit={handleSubmit} className="space-y-4 pt-2">
          {/* Seleção do Colaborador */}
          <div className="space-y-1.5">
            <Label className="text-xs font-semibold text-slate-700">Colaborador *</Label>
            <Select value={userId} onValueChange={setUserId}>
              <SelectTrigger className="h-9 text-xs">
                <SelectValue placeholder="Selecione o colaborador" />
              </SelectTrigger>
              <SelectContent className="max-h-60">
                {users.map((u) => (
                  <SelectItem key={u.id} value={u.id} className="text-xs">
                    {u.name} — {u.role}
                    {Array.isArray(u.service_groups) && u.service_groups.length > 0
                      ? ` (${u.service_groups.join(', ')})`
                      : ''}
                  </SelectItem>
                ))}
              </SelectContent>
            </Select>
          </div>

          {/* Motivo */}
          <div className="space-y-1.5">
            <Label className="text-xs font-semibold text-slate-700">Motivo da Ausência *</Label>
            <Select value={reason} onValueChange={(v: any) => setReason(v)}>
              <SelectTrigger className="h-9 text-xs">
                <SelectValue placeholder="Selecione o motivo" />
              </SelectTrigger>
              <SelectContent>
                <SelectItem value="Férias" className="text-xs">
                  🌴 Férias
                </SelectItem>
                <SelectItem value="Banco de horas" className="text-xs">
                  ⏱️ Folga de Banco de Horas
                </SelectItem>
                <SelectItem value="Dayoff" className="text-xs">
                  ☕ Dayoff
                </SelectItem>
                <SelectItem value="Atestado" className="text-xs">
                  🩺 Atestado Médico
                </SelectItem>
              </SelectContent>
            </Select>
          </div>

          {/* Período */}
          <div className="grid grid-cols-2 gap-3">
            <div className="space-y-1.5">
              <Label className="text-xs font-semibold text-slate-700">Data de Início *</Label>
              <Input
                type="date"
                value={startDate}
                onChange={(e) => setStartDate(e.target.value)}
                className="h-9 text-xs"
                required
              />
            </div>
            <div className="space-y-1.5">
              <Label className="text-xs font-semibold text-slate-700">Data de Fim *</Label>
              <Input
                type="date"
                value={endDate}
                onChange={(e) => setEndDate(e.target.value)}
                className="h-9 text-xs"
                required
              />
            </div>
          </div>

          {/* Validação de Cobertura da Equipe (Em Tempo Real) */}
          {coverageCheck && (
            <div className="pt-1">
              {coverageCheck.hasConflict ? (
                <Alert className="border-amber-300 bg-amber-50 text-amber-900 py-2.5">
                  <AlertTriangle className="h-4 w-4 text-amber-600" />
                  <AlertTitle className="text-xs font-bold text-amber-900">
                    Alerta de Cobertura Mínima da Equipe ({coverageCheck.absencePct}% ausentes)
                  </AlertTitle>
                  <AlertDescription className="text-xs text-amber-800 mt-1">
                    A ausência agendada deixará a equipe do Núcleo acima do teto permitido de{' '}
                    <strong>{coverageCheck.maxAllowedAbsencePct}%</strong> de ausências simultâneas.
                    Já há {coverageCheck.absentCount} colaborador(es) ausente(s) em {startDate}:{' '}
                    {coverageCheck.conflictingUsers.map((c) => c.userName).join(', ')}.
                  </AlertDescription>
                </Alert>
              ) : (
                <div className="p-2.5 rounded-lg bg-emerald-50 border border-emerald-200 flex items-center gap-2 text-xs text-emerald-800">
                  <CheckCircle2 className="h-4 w-4 text-emerald-600 shrink-0" />
                  <span>
                    Cobertura da equipe validada ({coverageCheck.absencePct}% ausentes neste dia —
                    limite: {coverageCheck.maxAllowedAbsencePct}%).
                  </span>
                </div>
              )}
            </div>
          )}

          {/* Observações */}
          <div className="space-y-1.5">
            <Label className="text-xs font-semibold text-slate-700">Observações / Detalhes</Label>
            <Textarea
              value={notes}
              onChange={(e) => setNotes(e.target.value)}
              placeholder="Ex.: Período referente ao ciclo 2024/2025 ou alinhamento com liderança"
              className="text-xs min-h-20"
            />
          </div>

          {/* Opção para Gestores: Aprovar diretamente */}
          {isCurrentUserLeader && (
            <div className="p-3 rounded-lg border border-indigo-100 bg-indigo-50/50 flex items-center justify-between">
              <div>
                <p className="text-xs font-semibold text-indigo-950">Aprovação Direta</p>
                <p className="text-[11px] text-indigo-700">
                  {autoApprove
                    ? 'A ausência será confirmada no calendário como Aprovada imediatamente.'
                    : 'A ausência entrará como Pendente para avaliação posterior.'}
                </p>
              </div>
              <Button
                type="button"
                variant={autoApprove ? 'default' : 'outline'}
                size="sm"
                onClick={() => setAutoApprove(!autoApprove)}
                className={`text-xs h-7 ${autoApprove ? 'bg-indigo-600 hover:bg-indigo-700' : ''}`}
              >
                {autoApprove ? 'Auto-aprovar: Sim' : 'Auto-aprovar: Não'}
              </Button>
            </div>
          )}

          {!isCurrentUserLeader && (
            <div className="p-2.5 rounded-lg border border-amber-200 bg-amber-50 text-[11px] text-amber-800 flex items-center gap-2">
              <AlertCircle className="h-4 w-4 text-amber-600 shrink-0" />
              <span>
                Sua solicitação entrará com status <strong>Pendente</strong> e será avaliada pelo
                seu gestor antes de constar como confirmada no calendário.
              </span>
            </div>
          )}

          <DialogFooter className="pt-2 border-t border-slate-100">
            <Button
              type="button"
              variant="outline"
              size="sm"
              onClick={() => onOpenChange(false)}
              className="text-xs"
            >
              Cancelar
            </Button>
            <Button
              type="submit"
              size="sm"
              disabled={isSubmitting}
              className="text-xs bg-indigo-600 hover:bg-indigo-700"
            >
              {isSubmitting ? 'Salvando...' : 'Confirmar Agendamento'}
            </Button>
          </DialogFooter>
        </form>
      </DialogContent>
    </Dialog>
  )
}
