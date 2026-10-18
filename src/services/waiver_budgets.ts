import pb from '@/lib/pocketbase/client'
import type { WaiverBudgetRecord, WaiverBudgetStatus } from '@/types/waiver'
import { createAuditLog } from '@/services/audit-log'

export interface CreateBudgetDTO {
  airline_key: string
  airline_name?: string
  category: string
  period_label: string
  start_date?: string
  end_date?: string
  budget_amount: number
  used_amount?: number
  currency: 'USD' | 'BRL' | 'EUR'
  unit?: string
  status?: WaiverBudgetStatus
  notes?: string
}

/**
 * Lista todas as verbas orçadas configuradas
 */
export async function getWaiverBudgets(filter?: string): Promise<WaiverBudgetRecord[]> {
  try {
    return await pb.collection('waiver_budgets').getFullList<WaiverBudgetRecord>({
      filter: filter || undefined,
      sort: '-created',
      expand: 'created_by',
    })
  } catch (error) {
    console.error('Erro ao buscar waiver_budgets:', error)
    return []
  }
}

/**
 * Cria uma nova linha de verba comercial
 */
export async function createWaiverBudget(data: CreateBudgetDTO): Promise<WaiverBudgetRecord> {
  const currentUserId = pb.authStore.record?.id

  const record = await pb.collection('waiver_budgets').create<WaiverBudgetRecord>({
    ...data,
    used_amount: data.used_amount || 0,
    status: data.status || 'Ativo',
    created_by: currentUserId,
  })

  await createAuditLog({
    action: 'Verba Comercial Cadastrada',
    entity: 'waiver_budgets',
    entity_id: record.id,
    details: {
      airline_key: data.airline_key,
      category: data.category,
      budget_amount: data.budget_amount,
      currency: data.currency,
      period: data.period_label,
    },
  })

  return record
}

/**
 * Atualiza dados de uma verba
 */
export async function updateWaiverBudget(
  id: string,
  data: Partial<CreateBudgetDTO>,
): Promise<WaiverBudgetRecord> {
  const updated = await pb.collection('waiver_budgets').update<WaiverBudgetRecord>(id, data)

  await createAuditLog({
    action: 'Verba Comercial Atualizada',
    entity: 'waiver_budgets',
    entity_id: id,
    details: data,
  })

  return updated
}

/**
 * Exclui uma verba comercial
 */
export async function deleteWaiverBudget(id: string): Promise<boolean> {
  await pb.collection('waiver_budgets').delete(id)
  await createAuditLog({
    action: 'Verba Comercial Removida',
    entity: 'waiver_budgets',
    entity_id: id,
  })
  return true
}

/**
 * Importa múltiplas linhas de verba (a partir de planilha CSV/XLSX)
 */
export async function batchImportBudgets(rows: CreateBudgetDTO[]): Promise<{
  successCount: number
  errors: string[]
}> {
  let successCount = 0
  const errors: string[] = []
  const currentUserId = pb.authStore.record?.id

  for (let i = 0; i < rows.length; i++) {
    const row = rows[i]
    try {
      await pb.collection('waiver_budgets').create<WaiverBudgetRecord>({
        ...row,
        used_amount: row.used_amount || 0,
        status: row.status || 'Ativo',
        created_by: currentUserId,
      })
      successCount++
    } catch (err: any) {
      console.error(`Erro ao importar linha ${i + 1}:`, err)
      errors.push(
        `Linha ${i + 1} (${row.airline_key} - ${row.category}): ${err?.message || 'Falha ao salvar'}`,
      )
    }
  }

  if (successCount > 0) {
    await createAuditLog({
      action: 'Importação em Lote de Verbas Comerciais',
      entity: 'waiver_budgets',
      details: {
        totalRows: rows.length,
        successCount,
        errorsCount: errors.length,
      },
    })
  }

  return { successCount, errors }
}

/**
 * Busca a verba ativa correspondente para uma companhia e opcionalmente unidade/categoria.
 * Se houver verba específica para a unidade/categoria, dá preferência; senão pega a verba geral ativa da cia.
 */
export async function findMatchingActiveBudget(params: {
  airline_key: string
  unit?: string
  currency?: string
}): Promise<WaiverBudgetRecord | null> {
  try {
    const filters: string[] = [`status = "Ativo"`, `airline_key = "${params.airline_key}"`]
    if (params.currency) {
      filters.push(`currency = "${params.currency}"`)
    }

    const budgets = await pb.collection('waiver_budgets').getFullList<WaiverBudgetRecord>({
      filter: filters.join(' && '),
      sort: '-created',
    })

    if (!budgets || budgets.length === 0) return null

    // 1. Tenta achar verba compatível com a mesma unidade
    if (params.unit) {
      const matchUnit = budgets.find(
        (b) => b.unit && b.unit.toLowerCase() === params.unit?.toLowerCase(),
      )
      if (matchUnit) return matchUnit
    }

    // 2. Retorna a primeira verba ativa da companhia (verba geral / corporativa)
    const generalBudget = budgets.find((b) => !b.unit || b.unit.trim() === '')
    return generalBudget || budgets[0]
  } catch (error) {
    console.error('Erro ao buscar verba compatível:', error)
    return null
  }
}

/**
 * Debita consumo de verba comercial ao aprovar ou negociar uma solicitação
 */
export async function consumeWaiverBudget(params: {
  airline_key: string
  amount: number
  unit?: string
  currency?: string
}): Promise<{
  consumed: boolean
  budgetId?: string
  category?: string
  remainingBalance?: number
  message: string
}> {
  if (params.amount <= 0) {
    return {
      consumed: false,
      message: 'Valor zero ou negativo, nenhum débito efetuado.',
    }
  }

  const budget = await findMatchingActiveBudget({
    airline_key: params.airline_key,
    unit: params.unit,
    currency: params.currency,
  })

  if (!budget) {
    return {
      consumed: false,
      message:
        'Aprovada sem verba vinculada (não há verba ativa configurada para esta companhia/moeda).',
    }
  }

  const currentUsed = budget.used_amount || 0
  const newUsed = currentUsed + params.amount
  const remaining = budget.budget_amount - newUsed

  await pb.collection('waiver_budgets').update<WaiverBudgetRecord>(budget.id, {
    used_amount: newUsed,
  })

  return {
    consumed: true,
    budgetId: budget.id,
    category: budget.category,
    remainingBalance: remaining,
    message: `Debitado ${params.amount} ${budget.currency} da verba "${budget.category}" (${budget.period_label}). Saldo disponível restante: ${remaining.toFixed(2)} ${budget.currency}.`,
  }
}
