import type { ContactReason, ServicePriority, TaskItem } from '@/types/service_record'

export interface ServiceTemplate {
  reason: ContactReason
  label: string
  description: string
  priority: ServicePriority
  tasks: TaskItem[]
}

export const SERVICE_TEMPLATES: ServiceTemplate[] = [
  {
    reason: 'Reembolso',
    label: 'Reembolso',
    description:
      'Cliente solicita reembolso de passagem/taxa. Verificar regras tarifárias e orientar sobre processo no RF.',
    priority: 'Média',
    tasks: [
      { title: 'Verificar regras tarifárias da passagem', done: false },
      { title: 'Confirmar valor e motivo do reembolso', done: false },
      { title: 'Orientar cliente sobre processo no RF', done: false },
    ],
  },
  {
    reason: 'Bagagem',
    label: 'Bagagem',
    description:
      'Dúvida ou problema relacionado a bagagem. Verificar política da companhia e orientar cliente.',
    priority: 'Média',
    tasks: [
      { title: 'Verificar política de bagagem da companhia', done: false },
      { title: 'Confirmar voo e classe tarifária', done: false },
    ],
  },
  {
    reason: 'Assento',
    label: 'Assento',
    description:
      'Cliente solicita alteração ou dúvida sobre assento. Verificar disponibilidade e taxas.',
    priority: 'Baixa',
    tasks: [
      { title: 'Verificar disponibilidade de assento', done: false },
      { title: 'Confirmar taxa de marcação', done: false },
    ],
  },
  {
    reason: 'Cotação',
    label: 'Cotação',
    description: 'Cliente solicita cotação de passagem. Verificar rotas, datas e disponibilidade.',
    priority: 'Média',
    tasks: [
      { title: 'Buscar melhores tarifas disponíveis', done: false },
      { title: 'Enviar cotação ao cliente', done: false },
    ],
  },
  {
    reason: 'Reserva',
    label: 'Reserva',
    description: 'Cliente solicita reserva de passagem. Coletar dados e confirmar disponibilidade.',
    priority: 'Alta',
    tasks: [
      { title: 'Coletar dados do passageiro', done: false },
      { title: 'Confirmar reserva no sistema', done: false },
      { title: 'Enviar confirmação ao cliente', done: false },
    ],
  },
  {
    reason: 'Cancelamento',
    label: 'Cancelamento',
    description: 'Cliente solicita cancelamento. Verificar regras e orientar sobre penalidades.',
    priority: 'Alta',
    tasks: [
      { title: 'Verificar regras de cancelamento', done: false },
      { title: 'Calcular multa/reembolso', done: false },
      { title: 'Processar cancelamento', done: false },
    ],
  },
  {
    reason: 'Erro RF',
    label: 'Erro RF',
    description: 'Cliente relata erro no sistema RF. Identificar o problema e orientar solução.',
    priority: 'Alta',
    tasks: [
      { title: 'Identificar erro reportado', done: false },
      { title: 'Verificar se é treinável ou bug', done: false },
    ],
  },
  {
    reason: 'Regras Tarifárias',
    label: 'Regras Tarifárias',
    description: 'Dúvida sobre regras tarifárias. Consultar regras e orientar cliente.',
    priority: 'Baixa',
    tasks: [{ title: 'Consultar regras da tarifa', done: false }],
  },
  {
    reason: 'Cálculo de Reemissão',
    label: 'Cálculo Reemissão',
    description: 'Cliente solicita cálculo de reemissão. Verificar tarifa original e nova.',
    priority: 'Média',
    tasks: [
      { title: 'Verificar tarifa original', done: false },
      { title: 'Calcular diferença tarifária', done: false },
    ],
  },
  {
    reason: 'Outros',
    label: 'Outros',
    description: 'Atendimento de natureza diversa não classificada nas categorias anteriores.',
    priority: 'Baixa',
    tasks: [],
  },
]
