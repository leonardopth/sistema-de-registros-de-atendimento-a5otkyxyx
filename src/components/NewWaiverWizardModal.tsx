import React, { useState, useEffect } from 'react'
import {
  Dialog,
  DialogContent,
  DialogHeader,
  DialogTitle,
  DialogFooter,
  DialogDescription,
} from '@/components/ui/dialog'
import { Button } from '@/components/ui/button'
import { Badge } from '@/components/ui/badge'
import { Card, CardContent } from '@/components/ui/card'
import {
  Plane,
  ArrowRight,
  ArrowLeft,
  CheckCircle2,
  Clock,
  Send,
  Building,
  Sparkles,
  HelpCircle,
  AlertCircle,
} from 'lucide-react'
import { useToast } from '@/hooks/use-toast'
import { DynamicWaiverForm } from '@/components/DynamicWaiverForm'
import { AIRLINE_CONFIGS } from '@/constants/waivers'
import type { AirlineFormConfig, WaiverConfigRecord, WaiverRequestRecord } from '@/types/waiver'
import { createWaiverRequest } from '@/services/waivers'
import { cn } from '@/lib/utils'

interface NewWaiverWizardModalProps {
  open: boolean
  onOpenChange: (open: boolean) => void
  waiverConfig: WaiverConfigRecord | null
  userDefaultUnit?: string
  onRequestCreated: (newRequest: WaiverRequestRecord) => void
}

export function NewWaiverWizardModal({
  open,
  onOpenChange,
  waiverConfig,
  userDefaultUnit,
  onRequestCreated,
}: NewWaiverWizardModalProps) {
  const { toast } = useToast()
  const [step, setStep] = useState<1 | 2>(1)
  const [selectedAirline, setSelectedAirline] = useState<AirlineFormConfig | null>(null)
  const [formData, setFormData] = useState<Record<string, any>>({})
  const [errors, setErrors] = useState<Record<string, string>>({})
  const [submitting, setSubmitting] = useState(false)

  // Reseta estado ao abrir
  useEffect(() => {
    if (open) {
      setStep(1)
      setSelectedAirline(null)
      setFormData(userDefaultUnit ? { unit: userDefaultUnit } : {})
      setErrors({})
    }
  }, [open, userDefaultUnit])

  const handleSelectAirline = (airline: AirlineFormConfig) => {
    if (airline.comingSoon || !airline.active) {
      toast({
        title: 'Formulário em breve',
        description: `O formulário digital da ${airline.name} está em homologação e estará disponível em breve.`,
      })
      return
    }
    setSelectedAirline(airline)
    // Pré-preenche campos iniciais
    setFormData((prev) => ({
      ...prev,
      unit: prev.unit || userDefaultUnit || 'Concierge',
      // Para AF/KL
      cia_validadora: prev.cia_validadora || 'AF-057',
      // Para LATAM Isenções
      mercado: prev.mercado || 'EUA - Katia Vieira',
      canal_analise: prev.canal_analise || 'MANUAL',
      priority: prev.priority || 'MÉDIA',
      // Para Assistência
      is_codeshare: prev.is_codeshare || 'NÃO',
      horario_voo: prev.horario_voo || 'NORMAL (entre 06h e 22h00)',
      // Para LATAM 2 Descontos Manuais
      tem_surcharge_q: prev.tem_surcharge_q || 'NÃO',
      manual_ou_portal: prev.manual_ou_portal || 'MANUAL',
      advp: prev.advp || 'D+30 ou mais',
    }))
    setStep(2)
  }

  const handleFieldChange = (name: string, value: any) => {
    setFormData((prev) => ({ ...prev, [name]: value }))
    if (errors[name]) {
      setErrors((prev) => {
        const next = { ...prev }
        delete next[name]
        return next
      })
    }
  }

  const validateForm = () => {
    if (!selectedAirline) return false
    const newErrors: Record<string, string> = {}

    for (const field of selectedAirline.fields) {
      // Pula campos ocultos por dependsOn
      if (field.dependsOn) {
        const parentVal = formData[field.dependsOn.field]
        if (!field.dependsOn.condition(parentVal)) {
          continue
        }
      }

      const val = formData[field.name]

      // Obrigatório
      if (field.required) {
        if (val === undefined || val === null || String(val).trim() === '') {
          newErrors[field.name] = 'Este campo é obrigatório'
          continue
        }
      }

      // Validação numérica
      if (
        field.type === 'number' &&
        val !== undefined &&
        val !== null &&
        String(val).trim() !== ''
      ) {
        const num = Number(val)
        if (isNaN(num)) {
          newErrors[field.name] = 'O valor deve ser um número'
          continue
        }
        if (field.min !== undefined && num < field.min) {
          newErrors[field.name] = `Valor mínimo: ${field.min}`
          continue
        }
        if (field.max !== undefined && num > field.max) {
          newErrors[field.name] = `Valor máximo: ${field.max}`
          continue
        }
      }

      // Validação customizada
      if (field.validation?.customValidator) {
        const err = field.validation.customValidator(val, formData)
        if (err) {
          newErrors[field.name] = err
          continue
        }
      }
    }

    setErrors(newErrors)
    return Object.keys(newErrors).length === 0
  }

  const handleSubmit = async () => {
    if (!selectedAirline) return
    if (!validateForm()) {
      toast({
        title: 'Verifique os campos obrigatórios',
        description: 'Alguns campos não foram preenchidos corretamente.',
        variant: 'destructive',
      })
      return
    }

    setSubmitting(true)
    try {
      // Extrai campos principais indexados
      const unit = formData.unit || userDefaultUnit || 'Geral'
      const gds_locator = formData.gds_locator
        ? String(formData.gds_locator).toUpperCase().trim()
        : undefined
      const airline_locator = formData.airline_locator
        ? String(formData.airline_locator).toUpperCase().trim()
        : undefined
      const approver_name = formData.approver_name || 'Gestão Operacional'
      const request_type =
        formData.request_type || (selectedAirline.key === 'latam' ? 'ISENÇÃO' : 'GERAL')
      const priority = formData.priority || 'MÉDIA'
      const pax_count = formData.pax_count ? Number(formData.pax_count) : undefined
      const pax_name = formData.pax_name || formData['SOBRENOME/NOME - PAX1/1'] || undefined

      // Valor e moeda
      let amount: number | undefined = undefined
      let currency: string = 'BRL'

      if (selectedAirline.key === 'latam') {
        currency = 'USD'
        if (formData.amount_per_pax_usd) {
          amount = parseFloat(formData.amount_per_pax_usd)
        }
      } else if (selectedAirline.key === 'afkl') {
        currency = 'EUR'
        if (formData.amount_eur) {
          amount = parseFloat(formData.amount_eur)
        }
      } else if (selectedAirline.key === 'gol') {
        currency = 'BRL'
        if (formData.amount_per_pax_brl) {
          amount = parseFloat(formData.amount_per_pax_brl)
        }
      } else if (selectedAirline.key === 'aa') {
        currency = 'USD'
        if (formData.amount_per_pax_usd) {
          amount = parseFloat(formData.amount_per_pax_usd)
        }
      } else if (selectedAirline.key === 'latam2') {
        currency = 'USD'
        if (formData.tarifa_original_usd) {
          amount = parseFloat(formData.tarifa_original_usd)
        }
      }

      const created = await createWaiverRequest({
        airline_key: selectedAirline.key,
        airline_name: selectedAirline.name,
        request_type,
        unit,
        gds_locator,
        airline_locator,
        pax_count,
        pax_name,
        amount,
        currency,
        priority,
        approver_name,
        form_data: formData,
      })

      toast({
        title: 'Solicitação enviada com sucesso!',
        description: `Seu pedido para ${selectedAirline.name} foi protocolado com status Pendente.`,
      })

      onRequestCreated(created)
      onOpenChange(false)
    } catch (err) {
      console.error(err)
      toast({
        title: 'Erro ao registrar solicitação',
        description: 'Ocorreu uma falha ao enviar o formulário. Tente novamente.',
        variant: 'destructive',
      })
    } finally {
      setSubmitting(false)
    }
  }

  return (
    <Dialog open={open} onOpenChange={onOpenChange}>
      <DialogContent className="max-w-4xl max-h-[92vh] overflow-y-auto">
        <DialogHeader>
          <div className="flex items-center gap-2">
            <div className="p-2 rounded-lg bg-indigo-50 border border-indigo-100 text-indigo-600">
              <Plane className="h-5 w-5" />
            </div>
            <div>
              <DialogTitle className="text-base font-bold text-slate-900">
                {step === 1
                  ? 'Nova Solicitação — Selecionar Companhia Aérea'
                  : `Formulário de Solicitação — ${selectedAirline?.name}`}
              </DialogTitle>
              <DialogDescription className="text-xs text-slate-500">
                {step === 1
                  ? 'Escolha a companhia aérea ou serviço desejado para carregar o formulário dinâmico.'
                  : 'Preencha com exatidão as informações e anexos para análise do aprovador.'}
              </DialogDescription>
            </div>
          </div>
        </DialogHeader>

        {/* Passo 1: Seleção da Cia Aérea */}
        {step === 1 && (
          <div className="space-y-4 py-2">
            <div className="grid grid-cols-1 sm:grid-cols-2 md:grid-cols-3 gap-3">
              {AIRLINE_CONFIGS.map((airline) => {
                const isAvailable = airline.active && !airline.comingSoon

                return (
                  <Card
                    key={airline.key}
                    onClick={() => handleSelectAirline(airline)}
                    className={cn(
                      'relative overflow-hidden transition-all duration-200 border-2 select-none',
                      isAvailable
                        ? 'cursor-pointer hover:border-indigo-500 hover:shadow-md bg-white border-slate-200'
                        : 'opacity-70 bg-slate-50 border-dashed border-slate-300 cursor-not-allowed',
                    )}
                  >
                    <CardContent className="p-4 space-y-3">
                      <div className="flex items-center justify-between">
                        <Badge
                          variant="secondary"
                          className={cn(
                            'text-xs font-bold px-2 py-0.5',
                            isAvailable
                              ? 'bg-indigo-50 text-indigo-700 border-indigo-200'
                              : 'bg-slate-200 text-slate-600',
                          )}
                        >
                          {airline.logoBadge || airline.key.toUpperCase()}
                        </Badge>
                        {isAvailable ? (
                          <span className="text-[11px] font-semibold text-emerald-600 flex items-center gap-1">
                            <CheckCircle2 className="h-3 w-3" /> Disponível
                          </span>
                        ) : (
                          <Badge
                            variant="outline"
                            className="text-[10px] text-slate-500 border-slate-300"
                          >
                            Em breve
                          </Badge>
                        )}
                      </div>

                      <div>
                        <h4 className="text-sm font-bold text-slate-900 leading-snug">
                          {airline.name}
                        </h4>
                        <p className="text-[11.5px] text-slate-500 mt-1 line-clamp-2">
                          {airline.description}
                        </p>
                      </div>

                      {isAvailable && (
                        <div className="pt-2 flex items-center justify-between text-xs font-semibold text-indigo-600 border-t border-slate-100">
                          <span>Preencher formulário</span>
                          <ArrowRight className="h-3.5 w-3.5" />
                        </div>
                      )}
                    </CardContent>
                  </Card>
                )
              })}
            </div>

            <div className="p-3 bg-indigo-50/60 rounded-lg border border-indigo-100 flex items-start gap-2.5 text-xs text-indigo-900">
              <Sparkles className="h-4 w-4 text-indigo-600 shrink-0 mt-0.5" />
              <div>
                <p className="font-semibold">Arquitetura Extensível Dinâmica</p>
                <p className="text-indigo-800/80 text-[11.5px]">
                  Os formulários são montados a partir de definições de dados configuráveis. GOL,
                  American Airlines e Descontos LATAM integrados e parametrizáveis.
                </p>
              </div>
            </div>
          </div>
        )}

        {/* Passo 2: Formulário Dinâmico */}
        {step === 2 && selectedAirline && (
          <div className="space-y-4 py-1">
            <DynamicWaiverForm
              config={selectedAirline}
              waiverConfig={waiverConfig}
              values={formData}
              onChange={handleFieldChange}
              errors={errors}
              disabled={submitting}
            />
          </div>
        )}

        <DialogFooter className="mt-4 gap-2 sm:gap-0 border-t border-slate-100 pt-3">
          {step === 2 ? (
            <>
              <Button
                variant="outline"
                size="sm"
                onClick={() => setStep(1)}
                disabled={submitting}
                className="mr-auto"
              >
                <ArrowLeft className="h-4 w-4 mr-1" /> Trocar Companhia
              </Button>
              <Button
                variant="outline"
                size="sm"
                onClick={() => onOpenChange(false)}
                disabled={submitting}
              >
                Cancelar
              </Button>
              <Button
                size="sm"
                onClick={handleSubmit}
                disabled={submitting}
                className="bg-indigo-600 hover:bg-indigo-700 text-white"
              >
                {submitting ? (
                  'Enviando...'
                ) : (
                  <>
                    <Send className="h-4 w-4 mr-1.5" /> Enviar Solicitação
                  </>
                )}
              </Button>
            </>
          ) : (
            <Button variant="outline" size="sm" onClick={() => onOpenChange(false)}>
              Fechar
            </Button>
          )}
        </DialogFooter>
      </DialogContent>
    </Dialog>
  )
}
