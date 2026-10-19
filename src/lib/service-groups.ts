import type { ServiceGroup } from '@/types/service_record'

export const SERVICE_GROUP_OPTIONS: { value: ServiceGroup; label: string; description?: string }[] =
  [
    {
      value: 'Concierge',
      label: 'Concierge',
      description: 'Cliente core com maior volume de vendas (prioridade máxima)',
    },
    { value: 'Exclusivo', label: 'Exclusivo', description: 'Cliente de alta prioridade' },
    { value: 'LOT', label: 'LOT', description: 'Cliente digital (API)' },
    { value: 'BR1', label: 'BR1' },
    { value: 'BR2', label: 'BR2' },
    { value: 'SAO', label: 'SAO' },
    { value: 'SPI', label: 'SPI' },
    { value: 'SUL', label: 'SUL' },
  ]

export const SERVICE_GROUP_VALUES = SERVICE_GROUP_OPTIONS.map((o) => o.value)

export const SERVICE_GROUP_INBOX_MAP: Record<ServiceGroup, string> = {
  SAO: 'atendimento.sao@rexturadvance.com.br',
  SPI: 'atendimento.spi@rexturadvance.com.br',
  SUL: 'atendimento.sul@rexturadvance.com.br',
  BR1: 'atendimento.br1@rexturadvance.com.br',
  BR2: 'atendimento.br2@rexturadvance.com.br',
  LOT: 'atendimento.lot@rexturadvance.com.br',
  Concierge: 'concierge@rexturadvance.com.br',
  Exclusivo: 'exclusivo@rexturadvance.com.br',
}

export function getServiceGroupInbox(group?: string | null): string {
  if (!group) return ''
  return SERVICE_GROUP_INBOX_MAP[group as ServiceGroup] || ''
}

export function getServiceGroupLabel(value: string): string {
  return SERVICE_GROUP_OPTIONS.find((o) => o.value === value)?.label ?? value
}
