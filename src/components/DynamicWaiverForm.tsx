import React, { useState, useEffect } from 'react'
import { Info, ChevronDown, ChevronUp, AlertCircle, FileText } from 'lucide-react'
import { Card, CardContent } from '@/components/ui/card'
import { Button } from '@/components/ui/button'
import { Input } from '@/components/ui/input'
import { Label } from '@/components/ui/label'
import { Textarea } from '@/components/ui/textarea'
import { RadioGroup, RadioGroupItem } from '@/components/ui/radio-group'
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from '@/components/ui/select'
import { Badge } from '@/components/ui/badge'
import type { AirlineFormConfig, DynamicFormField, WaiverConfigRecord } from '@/types/waiver'
import { cn } from '@/lib/utils'
import { getUsers } from '@/services/users'
import type { UserRecord } from '@/types/service_record'

interface DynamicWaiverFormProps {
  config: AirlineFormConfig
  waiverConfig: WaiverConfigRecord | null
  values: Record<string, any>
  onChange: (field: string, value: any) => void
  errors: Record<string, string>
  disabled?: boolean
}

export function DynamicWaiverForm({
  config,
  waiverConfig,
  values,
  onChange,
  errors,
  disabled = false,
}: DynamicWaiverFormProps) {
  const [rulesOpen, setRulesOpen] = useState(true)
  const [operationalUsers, setOperationalUsers] = useState<UserRecord[]>([])

  // Busca usuários cadastrados no sistema com papéis "Gerente" e "Supervisor" (Gerente e Supervisor Operacional)
  useEffect(() => {
    let isMounted = true
    getUsers()
      .then((users) => {
        if (!isMounted) return
        const filtered = users.filter(
          (u) =>
            u.approval_status === 'Aprovado' && (u.role === 'Gerente' || u.role === 'Supervisor'),
        )
        setOperationalUsers(filtered)
      })
      .catch((err) => {
        console.warn('Erro ao carregar aprovadores operacionais:', err)
      })
    return () => {
      isMounted = false
    }
  }, [])

  // Resolve options para campos parametrizáveis: UNIDADE e APROVADOR
  const getFieldOptions = (field: DynamicFormField) => {
    if (field.name === 'unit') {
      const unitsFromConfig = waiverConfig?.units
      if (Array.isArray(unitsFromConfig) && unitsFromConfig.length > 0) {
        return unitsFromConfig.map((u) => ({ label: u, value: u }))
      }
      return [
        { label: 'Concierge', value: 'Concierge' },
        { label: 'Exclusivo', value: 'Exclusivo' },
        { label: 'LOT', value: 'LOT' },
        { label: 'BR1', value: 'BR1' },
        { label: 'BR2', value: 'BR2' },
        { label: 'SAO', value: 'SAO' },
        { label: 'SPI', value: 'SPI' },
        { label: 'SUL', value: 'SUL' },
      ]
    }

    if (field.name === 'approver_name') {
      const listOptions: { label: string; value: string; userId?: string }[] = []
      const addedNames = new Set<string>()

      // 1. Prioriza os usuários reais do sistema dos papéis "Gerente" e "Supervisor" (Gerente Operacional e Supervisor Operacional)
      operationalUsers.forEach((u) => {
        const roleLabel = u.role === 'Gerente' ? 'Gerente Operacional' : 'Supervisor Operacional'
        const label = `${u.name} (${roleLabel})`
        listOptions.push({ label, value: u.name, userId: u.id })
        addedNames.add(u.name.toLowerCase().trim())
      })

      // 2. Parâmetros específicos por companhia (waiver_configs), alinhando e complementando
      const approversList = (waiverConfig && (waiverConfig as any)[config.approversKey]) || []
      if (Array.isArray(approversList) && approversList.length > 0) {
        approversList.forEach((a: string) => {
          const trimmed = String(a).trim()
          if (!trimmed) return
          if (!addedNames.has(trimmed.toLowerCase())) {
            listOptions.push({ label: trimmed, value: trimmed })
            addedNames.add(trimmed.toLowerCase())
          }
        })
      }

      // 3. Fallback genérico operacional caso a lista esteja vazia
      if (listOptions.length === 0) {
        return [
          { label: 'Gerente Operacional', value: 'Gerente Operacional' },
          { label: 'Supervisor Operacional', value: 'Supervisor Operacional' },
        ]
      }

      return listOptions
    }

    if (!field.options) return []
    return field.options.map((opt) => {
      if (typeof opt === 'string') {
        return { label: opt, value: opt }
      }
      return opt
    })
  }

  const renderField = (field: DynamicFormField) => {
    // Avalia dependência condicional
    if (field.dependsOn) {
      const parentVal = values[field.dependsOn.field]
      if (!field.dependsOn.condition(parentVal)) {
        return null
      }
    }

    const value = values[field.name] ?? ''
    const error = errors[field.name]
    const options = getFieldOptions(field)

    const colSpanClass = {
      1: 'col-span-1',
      2: 'col-span-1 md:col-span-2',
      3: 'col-span-1 md:col-span-3',
      4: 'col-span-1 md:col-span-4',
    }[field.gridCols || 2]

    return (
      <div key={field.name} className={cn('space-y-1.5', colSpanClass)}>
        <div className="flex items-center justify-between">
          <Label htmlFor={field.name} className="text-xs font-semibold text-slate-700">
            {field.label} {field.required && <span className="text-red-500">*</span>}
          </Label>
        </div>

        {(field.type === 'text' || field.type === 'email') && (
          <Input
            id={field.name}
            type={field.type === 'email' ? 'email' : 'text'}
            value={value}
            disabled={disabled}
            placeholder={field.placeholder}
            onChange={(e) => onChange(field.name, e.target.value)}
            className={cn('text-sm', error && 'border-red-500 focus-visible:ring-red-400')}
          />
        )}

        {field.type === 'number' && (
          <Input
            id={field.name}
            type="number"
            step={field.step || 'any'}
            min={field.min}
            max={field.max}
            value={value}
            disabled={disabled}
            placeholder={field.placeholder}
            onChange={(e) => onChange(field.name, e.target.value)}
            className={cn(
              'text-sm font-mono',
              error && 'border-red-500 focus-visible:ring-red-400',
            )}
          />
        )}

        {field.type === 'date' && (
          <Input
            id={field.name}
            type="date"
            value={value}
            disabled={disabled}
            placeholder={field.placeholder}
            onChange={(e) => onChange(field.name, e.target.value)}
            className={cn('text-sm', error && 'border-red-500 focus-visible:ring-red-400')}
          />
        )}

        {field.type === 'textarea' && (
          <Textarea
            id={field.name}
            value={value}
            disabled={disabled}
            placeholder={field.placeholder}
            rows={3}
            onChange={(e) => onChange(field.name, e.target.value)}
            className={cn('text-sm resize-y', error && 'border-red-500 focus-visible:ring-red-400')}
          />
        )}

        {field.type === 'code_paste' && (
          <div className="space-y-1">
            <Textarea
              id={field.name}
              value={value}
              disabled={disabled}
              placeholder={field.placeholder || 'Cole o print/texto do GDS ou sistema aqui...'}
              rows={4}
              onChange={(e) => onChange(field.name, e.target.value)}
              className={cn(
                'font-mono text-xs bg-slate-900 text-emerald-400 placeholder:text-slate-500 resize-y rounded-md p-3',
                error && 'border-red-500 focus-visible:ring-red-400',
              )}
            />
            <p className="text-[11px] text-slate-400">
              Copie diretamente da tela do GDS (Sabre, Amadeus etc.) e cole acima.
            </p>
          </div>
        )}

        {field.type === 'select' && (
          <Select
            value={value || ''}
            disabled={disabled}
            onValueChange={(val) => {
              onChange(field.name, val)
              if (field.name === 'approver_name') {
                // Localiza o ID do usuário correspondente (se existir) para sincronizar approver_id
                const matched = operationalUsers.find(
                  (u) => u.name.toLowerCase().trim() === val.toLowerCase().trim(),
                )
                if (matched) {
                  onChange('approver_id', matched.id)
                } else {
                  onChange('approver_id', '')
                }
              }
            }}
          >
            <SelectTrigger
              id={field.name}
              className={cn('text-sm', error && 'border-red-500 focus-visible:ring-red-400')}
            >
              <SelectValue placeholder={field.placeholder || 'Selecione uma opção'} />
            </SelectTrigger>
            <SelectContent>
              {options.map((opt) => {
                const optVal = typeof opt === 'string' ? opt : opt.value
                const optLab = typeof opt === 'string' ? opt : opt.label
                return (
                  <SelectItem key={optVal} value={optVal}>
                    {optLab}
                  </SelectItem>
                )
              })}
            </SelectContent>
          </Select>
        )}

        {field.type === 'radio' && (
          <RadioGroup
            value={value || ''}
            disabled={disabled}
            onValueChange={(val) => onChange(field.name, val)}
            className="grid grid-cols-1 sm:grid-cols-2 gap-2 pt-1"
          >
            {options.map((opt) => {
              const optId = `${field.name}-${opt.value}`
              const isSelected = value === opt.value
              return (
                <label
                  key={opt.value}
                  htmlFor={optId}
                  className={cn(
                    'flex items-center gap-2.5 p-2.5 rounded-md border text-xs font-medium cursor-pointer transition-colors',
                    isSelected
                      ? 'border-indigo-600 bg-indigo-50/70 text-indigo-900'
                      : 'border-slate-200 bg-white hover:bg-slate-50 text-slate-700',
                    disabled && 'opacity-60 cursor-not-allowed',
                  )}
                >
                  <RadioGroupItem value={opt.value} id={optId} className="text-indigo-600" />
                  <span className="flex-1 leading-snug">{opt.label}</span>
                </label>
              )
            })}
          </RadioGroup>
        )}

        {field.helperText && (
          <p className="text-[11px] text-slate-500 leading-tight">{field.helperText}</p>
        )}

        {error && (
          <div className="flex items-center gap-1 text-[11px] font-medium text-red-600">
            <AlertCircle className="h-3 w-3 shrink-0" />
            <span>{error}</span>
          </div>
        )}
      </div>
    )
  }

  return (
    <div className="space-y-6">
      {/* Painel Expansível de Regras da Cia */}
      {config.rules && config.rules.length > 0 && (
        <Card className="border-amber-200 bg-amber-50/60 overflow-hidden shadow-none">
          <div
            className="flex items-center justify-between px-4 py-3 cursor-pointer select-none hover:bg-amber-100/50 transition-colors"
            onClick={() => setRulesOpen((prev) => !prev)}
          >
            <div className="flex items-center gap-2">
              <Info className="h-4 w-4 text-amber-700 shrink-0" />
              <span className="text-xs font-bold text-amber-900 uppercase tracking-wide">
                Regras & Diretrizes da Cia ({config.airlineName})
              </span>
              <Badge
                variant="outline"
                className="text-[10px] bg-amber-100 text-amber-800 border-amber-300"
              >
                {config.rules.length} itens
              </Badge>
            </div>
            <Button variant="ghost" size="sm" className="h-7 w-7 p-0 text-amber-800">
              {rulesOpen ? <ChevronUp className="h-4 w-4" /> : <ChevronDown className="h-4 w-4" />}
            </Button>
          </div>

          {rulesOpen && (
            <CardContent className="px-4 pb-4 pt-1 text-xs text-amber-900/90 space-y-1.5 border-t border-amber-200/60 bg-amber-50/40">
              <div className="grid grid-cols-1 md:grid-cols-2 gap-2 mt-2">
                {config.rules.map((rule, idx) => (
                  <div
                    key={idx}
                    className="flex items-start gap-2 bg-white/70 p-2 rounded border border-amber-200/50 text-[11.5px] leading-relaxed"
                  >
                    <span className="font-bold text-amber-700 text-xs shrink-0">•</span>
                    <span className="text-slate-800 font-normal">{rule}</span>
                  </div>
                ))}
              </div>
            </CardContent>
          )}
        </Card>
      )}

      {/* Grid de Campos Dinâmicos */}
      <div className="bg-white p-5 rounded-xl border border-slate-200 shadow-sm space-y-5">
        <div className="flex items-center justify-between border-b border-slate-100 pb-3">
          <div className="flex items-center gap-2">
            <FileText className="h-4 w-4 text-indigo-600" />
            <h3 className="text-sm font-bold text-slate-800">Preenchimento da Solicitação</h3>
          </div>
          <span className="text-xs text-slate-500">
            Campos com <span className="text-red-500">*</span> são obrigatórios
          </span>
        </div>

        <div className="grid grid-cols-1 md:grid-cols-4 gap-4">
          {config.fields.map(renderField)}
        </div>
      </div>
    </div>
  )
}
