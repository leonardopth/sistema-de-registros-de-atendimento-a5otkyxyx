import React, { useState, useMemo } from 'react'
import {
  DollarSign,
  Plus,
  Upload,
  Edit2,
  Trash2,
  Filter,
  Search,
  CheckCircle2,
  AlertTriangle,
  Building,
  TrendingDown,
  Percent,
  Calendar,
  Layers,
} from 'lucide-react'
import { Button } from '@/components/ui/button'
import { Input } from '@/components/ui/input'
import { Badge } from '@/components/ui/badge'
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card'
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from '@/components/ui/select'
import {
  AlertDialog,
  AlertDialogAction,
  AlertDialogCancel,
  AlertDialogContent,
  AlertDialogDescription,
  AlertDialogFooter,
  AlertDialogHeader,
  AlertDialogTitle,
} from '@/components/ui/alert-dialog'
import { useToast } from '@/hooks/use-toast'
import type { WaiverBudgetRecord } from '@/types/waiver'
import { deleteWaiverBudget } from '@/services/waiver_budgets'
import { ImportBudgetsModal } from '@/components/ImportBudgetsModal'
import { WaiverBudgetFormModal } from '@/components/WaiverBudgetFormModal'
import { cn } from '@/lib/utils'

interface WaiverBudgetsViewProps {
  budgets: WaiverBudgetRecord[]
  loading: boolean
  canEdit: boolean
  onRefresh: () => void
}

export function WaiverBudgetsView({
  budgets,
  loading,
  canEdit,
  onRefresh,
}: WaiverBudgetsViewProps) {
  const { toast } = useToast()

  // Filtros
  const [searchTerm, setSearchTerm] = useState('')
  const [airlineFilter, setAirlineFilter] = useState('ALL')
  const [currencyFilter, setCurrencyFilter] = useState('ALL')
  const [periodFilter, setPeriodFilter] = useState('ALL')

  // Modais
  const [importOpen, setImportOpen] = useState(false)
  const [formOpen, setFormOpen] = useState(false)
  const [budgetToEdit, setBudgetToEdit] = useState<WaiverBudgetRecord | null>(null)
  const [budgetToDelete, setBudgetToDelete] = useState<WaiverBudgetRecord | null>(null)
  const [deleting, setDeleting] = useState(false)

  // Lista de períodos únicos disponíveis
  const periodOptions = useMemo(() => {
    const set = new Set<string>()
    budgets.forEach((b) => {
      if (b.period_label) set.add(b.period_label)
    })
    return Array.from(set)
  }, [budgets])

  // Filtragem
  const filteredBudgets = useMemo(() => {
    return budgets.filter((b) => {
      if (airlineFilter !== 'ALL' && b.airline_key !== airlineFilter) return false
      if (currencyFilter !== 'ALL' && b.currency !== currencyFilter) return false
      if (periodFilter !== 'ALL' && b.period_label !== periodFilter) return false

      if (searchTerm.trim()) {
        const term = searchTerm.toLowerCase()
        const matchCat = b.category.toLowerCase().includes(term)
        const matchCia = b.airline_key.toLowerCase().includes(term)
        const matchUnit = b.unit?.toLowerCase().includes(term)
        const matchPer = b.period_label.toLowerCase().includes(term)
        if (!matchCat && !matchCia && !matchUnit && !matchPer) return false
      }

      return true
    })
  }, [budgets, airlineFilter, currencyFilter, periodFilter, searchTerm])

  // KPIs agregados
  const kpis = useMemo(() => {
    let totalBudgetUSD = 0
    let totalUsedUSD = 0

    filteredBudgets.forEach((b) => {
      // Para fins de agregação nos KPIs, soma valores
      totalBudgetUSD += b.budget_amount
      totalUsedUSD += b.used_amount || 0
    })

    const pct = totalBudgetUSD > 0 ? Math.round((totalUsedUSD / totalBudgetUSD) * 100) : 0
    const available = totalBudgetUSD - totalUsedUSD

    return {
      totalBudgetUSD,
      totalUsedUSD,
      available,
      pct,
      activeCount: filteredBudgets.filter((b) => b.status === 'Ativo').length,
    }
  }, [filteredBudgets])

  const handleDelete = async () => {
    if (!budgetToDelete) return
    setDeleting(true)
    try {
      await deleteWaiverBudget(budgetToDelete.id)
      toast({
        title: 'Verba removida',
        description: 'A verba orçamentária foi excluída com sucesso.',
      })
      onRefresh()
      setBudgetToDelete(null)
    } catch (err: any) {
      console.error(err)
      toast({
        title: 'Erro ao excluir',
        description: err?.message || 'Falha ao remover verba.',
        variant: 'destructive',
      })
    } finally {
      setDeleting(false)
    }
  }

  const getAirlineDisplayName = (key: string) => {
    switch (key) {
      case 'latam':
        return 'LATAM Airlines'
      case 'afkl':
        return 'Air France / KLM'
      case 'gol':
        return 'GOL Linhas Aéreas'
      case 'aa':
        return 'American Airlines'
      case 'sky':
        return 'SKY Airline'
      case 'assistencia':
        return 'Assistência Aeroportos'
      default:
        return key.toUpperCase()
    }
  }

  return (
    <div className="space-y-5">
      {/* KPIs no Topo */}
      <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-4 gap-3">
        <Card className="border-slate-200 shadow-sm bg-white">
          <CardContent className="p-3.5 space-y-1">
            <span className="text-[11px] font-semibold text-slate-500 uppercase tracking-tight">
              Total Orçado (Verbas Listadas)
            </span>
            <div className="flex items-center justify-between">
              <span className="text-xl font-black text-slate-900 font-mono">
                {kpis.totalBudgetUSD.toLocaleString('pt-BR', { minimumFractionDigits: 2 })}
              </span>
              <DollarSign className="h-4 w-4 text-slate-400" />
            </div>
            <p className="text-[10px] text-slate-400">Soma de orçamentos configurados</p>
          </CardContent>
        </Card>

        <Card className="border-amber-200 bg-amber-50/50 shadow-sm">
          <CardContent className="p-3.5 space-y-1">
            <span className="text-[11px] font-semibold text-amber-700 uppercase tracking-tight">
              Total Utilizado / Debitado
            </span>
            <div className="flex items-center justify-between">
              <span className="text-xl font-black text-amber-800 font-mono">
                {kpis.totalUsedUSD.toLocaleString('pt-BR', { minimumFractionDigits: 2 })}
              </span>
              <TrendingDown className="h-4 w-4 text-amber-600" />
            </div>
            <p className="text-[10px] text-amber-600">Consumido em waivers aprovados</p>
          </CardContent>
        </Card>

        <Card className="border-emerald-200 bg-emerald-50/50 shadow-sm">
          <CardContent className="p-3.5 space-y-1">
            <span className="text-[11px] font-semibold text-emerald-700 uppercase tracking-tight">
              Saldo Disponível Restante
            </span>
            <div className="flex items-center justify-between">
              <span
                className={cn(
                  'text-xl font-black font-mono',
                  kpis.available >= 0 ? 'text-emerald-800' : 'text-red-700',
                )}
              >
                {kpis.available.toLocaleString('pt-BR', { minimumFractionDigits: 2 })}
              </span>
              <CheckCircle2 className="h-4 w-4 text-emerald-600" />
            </div>
            <p className="text-[10px] text-emerald-600">Disponível = Orçado − Utilizado</p>
          </CardContent>
        </Card>

        <Card className="border-indigo-200 bg-indigo-50/50 shadow-sm">
          <CardContent className="p-3.5 space-y-1">
            <span className="text-[11px] font-semibold text-indigo-700 uppercase tracking-tight">
              % Consumido no Período
            </span>
            <div className="flex items-center justify-between">
              <span className="text-xl font-black text-indigo-900 font-mono">{kpis.pct}%</span>
              <Percent className="h-4 w-4 text-indigo-600" />
            </div>
            <div className="h-1.5 w-full bg-indigo-200/50 rounded-full overflow-hidden mt-1">
              <div
                className={cn(
                  'h-full rounded-full transition-all',
                  kpis.pct < 70 ? 'bg-emerald-500' : kpis.pct < 90 ? 'bg-amber-500' : 'bg-red-500',
                )}
                style={{ width: `${Math.min(100, kpis.pct)}%` }}
              />
            </div>
          </CardContent>
        </Card>
      </div>

      {/* Barra de Filtros e Ações */}
      <div className="bg-white p-4 rounded-xl border border-slate-200 shadow-sm space-y-3">
        <div className="flex flex-col md:flex-row md:items-center justify-between gap-3">
          <div className="grid grid-cols-1 sm:grid-cols-2 md:grid-cols-4 gap-2.5 flex-1">
            <div className="relative">
              <Search className="absolute left-2.5 top-2.5 h-3.5 w-3.5 text-slate-400" />
              <Input
                placeholder="Buscar por categoria ou unidade..."
                value={searchTerm}
                onChange={(e) => setSearchTerm(e.target.value)}
                className="pl-8 text-xs h-8"
              />
            </div>

            <Select value={airlineFilter} onValueChange={setAirlineFilter}>
              <SelectTrigger className="text-xs h-8">
                <SelectValue placeholder="Companhia" />
              </SelectTrigger>
              <SelectContent>
                <SelectItem value="ALL">Todas as Companhias</SelectItem>
                <SelectItem value="latam">LATAM Airlines</SelectItem>
                <SelectItem value="afkl">Air France / KLM</SelectItem>
                <SelectItem value="gol">GOL Linhas Aéreas</SelectItem>
                <SelectItem value="aa">American Airlines</SelectItem>
                <SelectItem value="sky">SKY Airline</SelectItem>
                <SelectItem value="assistencia">Assistência Aeroportos</SelectItem>
              </SelectContent>
            </Select>

            <Select value={currencyFilter} onValueChange={setCurrencyFilter}>
              <SelectTrigger className="text-xs h-8">
                <SelectValue placeholder="Moeda" />
              </SelectTrigger>
              <SelectContent>
                <SelectItem value="ALL">Todas as Moedas</SelectItem>
                <SelectItem value="USD">USD</SelectItem>
                <SelectItem value="BRL">BRL</SelectItem>
                <SelectItem value="EUR">EUR</SelectItem>
              </SelectContent>
            </Select>

            <Select value={periodFilter} onValueChange={setPeriodFilter}>
              <SelectTrigger className="text-xs h-8">
                <SelectValue placeholder="Período" />
              </SelectTrigger>
              <SelectContent>
                <SelectItem value="ALL">Todos os Períodos</SelectItem>
                {periodOptions.map((p) => (
                  <SelectItem key={p} value={p}>
                    {p}
                  </SelectItem>
                ))}
              </SelectContent>
            </Select>
          </div>

          {canEdit && (
            <div className="flex items-center gap-2 shrink-0">
              <Button
                variant="outline"
                size="sm"
                onClick={() => setImportOpen(true)}
                className="text-xs border-slate-300 text-slate-700 hover:bg-slate-50 h-8"
              >
                <Upload className="h-3.5 w-3.5 mr-1 text-slate-500" />
                Importar Planilha
              </Button>
              <Button
                size="sm"
                onClick={() => {
                  setBudgetToEdit(null)
                  setFormOpen(true)
                }}
                className="bg-indigo-600 hover:bg-indigo-700 text-white text-xs h-8"
              >
                <Plus className="h-3.5 w-3.5 mr-1" />
                Nova Verba
              </Button>
            </div>
          )}
        </div>
      </div>

      {/* Cards de Verba por Companhia / Categoria */}
      {loading ? (
        <div className="py-12 text-center text-xs text-slate-400">Carregando verbas...</div>
      ) : filteredBudgets.length === 0 ? (
        <div className="bg-white rounded-xl border border-slate-200 p-12 text-center space-y-3">
          <DollarSign className="h-10 w-10 text-slate-300 mx-auto" />
          <div className="space-y-1">
            <p className="text-sm font-semibold text-slate-800">
              Nenhuma verba comercial cadastrada
            </p>
            <p className="text-xs text-slate-500 max-w-sm mx-auto">
              Cadastre manualmente ou utilize o botão "Importar Planilha" para carregar as colunas
              de orçamento das companhias.
            </p>
          </div>
          {canEdit && (
            <div className="flex items-center justify-center gap-2 pt-2">
              <Button
                variant="outline"
                size="sm"
                onClick={() => setImportOpen(true)}
                className="text-xs"
              >
                <Upload className="h-3.5 w-3.5 mr-1" /> Importar Planilha
              </Button>
              <Button
                size="sm"
                onClick={() => {
                  setBudgetToEdit(null)
                  setFormOpen(true)
                }}
                className="bg-indigo-600 text-white text-xs"
              >
                <Plus className="h-3.5 w-3.5 mr-1" /> Adicionar Verba
              </Button>
            </div>
          )}
        </div>
      ) : (
        <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-4">
          {filteredBudgets.map((b) => {
            const used = b.used_amount || 0
            const available = b.budget_amount - used
            const pct = b.budget_amount > 0 ? Math.round((used / b.budget_amount) * 100) : 0

            return (
              <Card
                key={b.id}
                className="border-slate-200 shadow-sm bg-white hover:border-indigo-200 transition-all overflow-hidden flex flex-col justify-between"
              >
                <CardHeader className="p-4 pb-3 border-b border-slate-100">
                  <div className="flex items-start justify-between gap-2">
                    <div>
                      <div className="flex items-center gap-1.5">
                        <Badge
                          variant="secondary"
                          className="text-[10px] uppercase font-bold bg-indigo-50 text-indigo-700 border-indigo-100"
                        >
                          {getAirlineDisplayName(b.airline_key)}
                        </Badge>
                        <Badge
                          variant="outline"
                          className={cn(
                            'text-[10px]',
                            b.status === 'Ativo'
                              ? 'bg-emerald-50 text-emerald-700 border-emerald-200'
                              : 'bg-slate-100 text-slate-600',
                          )}
                        >
                          {b.status}
                        </Badge>
                      </div>
                      <CardTitle className="text-sm font-bold text-slate-900 mt-1.5 line-clamp-1">
                        {b.category}
                      </CardTitle>
                    </div>

                    {canEdit && (
                      <div className="flex items-center gap-1">
                        <Button
                          variant="ghost"
                          size="icon"
                          className="h-7 w-7 text-slate-400 hover:text-indigo-600"
                          onClick={() => {
                            setBudgetToEdit(b)
                            setFormOpen(true)
                          }}
                          title="Editar verba"
                        >
                          <Edit2 className="h-3.5 w-3.5" />
                        </Button>
                        <Button
                          variant="ghost"
                          size="icon"
                          className="h-7 w-7 text-slate-400 hover:text-red-600"
                          onClick={() => setBudgetToDelete(b)}
                          title="Excluir verba"
                        >
                          <Trash2 className="h-3.5 w-3.5" />
                        </Button>
                      </div>
                    )}
                  </div>
                </CardHeader>

                <CardContent className="p-4 pt-3 space-y-3">
                  <div className="flex items-center justify-between text-xs text-slate-500">
                    <span className="flex items-center gap-1">
                      <Calendar className="h-3 w-3 text-slate-400" />
                      {b.period_label}
                    </span>
                    {b.unit && (
                      <span className="flex items-center gap-1 font-semibold text-slate-700">
                        <Building className="h-3 w-3 text-slate-400" />
                        {b.unit}
                      </span>
                    )}
                  </div>

                  {/* Números: Orçado / Utilizado / Disponível */}
                  <div className="grid grid-cols-3 gap-2 bg-slate-50 p-2.5 rounded-lg border border-slate-100 text-xs">
                    <div>
                      <span className="text-[10px] text-slate-400 uppercase block">Orçado</span>
                      <span className="font-bold font-mono text-slate-800">
                        {b.budget_amount.toLocaleString('pt-BR', { minimumFractionDigits: 2 })}{' '}
                        <span className="text-[10px] text-slate-500">{b.currency}</span>
                      </span>
                    </div>

                    <div>
                      <span className="text-[10px] text-slate-400 uppercase block">Utilizado</span>
                      <span className="font-bold font-mono text-amber-700">
                        {used.toLocaleString('pt-BR', { minimumFractionDigits: 2 })}{' '}
                        <span className="text-[10px] text-slate-500">{b.currency}</span>
                      </span>
                    </div>

                    <div>
                      <span className="text-[10px] text-slate-400 uppercase block">Disponível</span>
                      <span
                        className={cn(
                          'font-bold font-mono',
                          available > 0 ? 'text-emerald-700' : 'text-red-700',
                        )}
                      >
                        {available.toLocaleString('pt-BR', { minimumFractionDigits: 2 })}{' '}
                        <span className="text-[10px] text-slate-500">{b.currency}</span>
                      </span>
                    </div>
                  </div>

                  {/* Barra de Progresso com Cores Semafóricas */}
                  <div className="space-y-1">
                    <div className="flex items-center justify-between text-[11px]">
                      <span className="text-slate-500">Consumo da Verba</span>
                      <span
                        className={cn(
                          'font-bold font-mono',
                          pct < 70
                            ? 'text-emerald-600'
                            : pct < 90
                              ? 'text-amber-600'
                              : 'text-red-600',
                        )}
                      >
                        {pct}%
                      </span>
                    </div>
                    <div className="h-2 w-full bg-slate-100 rounded-full overflow-hidden">
                      <div
                        className={cn(
                          'h-full rounded-full transition-all',
                          pct < 70 ? 'bg-emerald-500' : pct < 90 ? 'bg-amber-500' : 'bg-red-500',
                        )}
                        style={{ width: `${Math.min(100, pct)}%` }}
                      />
                    </div>
                  </div>

                  {b.notes && (
                    <p className="text-[11px] text-slate-400 italic line-clamp-2">{b.notes}</p>
                  )}
                </CardContent>
              </Card>
            )
          })}
        </div>
      )}

      {/* Modal de Formulário (Criar / Editar) */}
      <WaiverBudgetFormModal
        open={formOpen}
        onOpenChange={setFormOpen}
        budgetToEdit={budgetToEdit}
        onSaved={onRefresh}
      />

      {/* Modal de Importação de Planilha */}
      <ImportBudgetsModal
        open={importOpen}
        onOpenChange={setImportOpen}
        onImportComplete={onRefresh}
      />

      {/* Diálogo de Confirmação de Exclusão */}
      <AlertDialog open={!!budgetToDelete} onOpenChange={(o) => !o && setBudgetToDelete(null)}>
        <AlertDialogContent>
          <AlertDialogHeader>
            <AlertDialogTitle className="text-sm font-bold text-slate-900">
              Confirmar Exclusão de Verba
            </AlertDialogTitle>
            <AlertDialogDescription className="text-xs text-slate-500">
              Deseja realmente remover a verba "{budgetToDelete?.category}" (
              {budgetToDelete?.period_label})? Esta ação não pode ser desfeita.
            </AlertDialogDescription>
          </AlertDialogHeader>
          <AlertDialogFooter>
            <AlertDialogCancel disabled={deleting} className="text-xs">
              Cancelar
            </AlertDialogCancel>
            <AlertDialogAction
              onClick={handleDelete}
              disabled={deleting}
              className="bg-red-600 hover:bg-red-700 text-white text-xs"
            >
              {deleting ? 'Excluindo...' : 'Sim, excluir'}
            </AlertDialogAction>
          </AlertDialogFooter>
        </AlertDialogContent>
      </AlertDialog>
    </div>
  )
}
