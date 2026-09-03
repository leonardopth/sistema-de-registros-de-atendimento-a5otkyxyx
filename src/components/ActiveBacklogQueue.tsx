import { useState, useMemo } from 'react'
import { Card, CardHeader, CardTitle, CardContent } from '@/components/ui/card'
import { Badge } from '@/components/ui/badge'
import { Button } from '@/components/ui/button'
import { Input } from '@/components/ui/input'
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from '@/components/ui/select'
import {
  Table,
  TableBody,
  TableCell,
  TableHead,
  TableHeader,
  TableRow,
} from '@/components/ui/table'
import { ServiceRecord } from '@/types/service_record'
import { StatusBadge } from '@/components/StatusBadge'
import { PriorityBadge } from '@/components/PriorityBadge'
import { ServiceRecordDetailModal } from '@/components/ServiceRecordDetailModal'
import { formatGMT3DateTime } from '@/lib/timezone'
import { isRecordReopened } from '@/lib/reopen-utils'
import {
  Clock,
  AlertCircle,
  Hourglass,
  Flame,
  CheckCircle2,
  Search,
  Filter,
  Eye,
  RotateCcw,
  User,
  Building2,
  HelpCircle,
  Layers,
} from 'lucide-react'

// Faixas de Aging:
// - < 30min: Verde (Recente / Dentro do esperado)
// - 30min–2h: Azul / Amarelo suave (Atenção inicial)
// - 2h–24h: Âmbar / Laranja (Atraso moderado)
// - > 24h: Vermelho (Crítico / Atrasado)
export type AgingTier = 'under30m' | '30mTo2h' | '2hTo24h' | 'over24h'

export interface AgingInfo {
  diffMinutes: number
  tier: AgingTier
  tierLabel: string
  formattedTime: string
  badgeClass: string
  bgClass: string
  borderClass: string
  textClass: string
  indicatorColor: string
}

export function computeRecordAging(record: ServiceRecord, now: number = Date.now()): AgingInfo {
  // Tempo parado desde a criação ou última atualização (o que for mais recente)
  const timestampStr = record.updated || record.created
  const recordTime = timestampStr ? new Date(timestampStr).getTime() : now
  const diffMs = Math.max(0, now - recordTime)
  const diffMinutes = Math.floor(diffMs / 60000)

  // Formatação legível do tempo parado
  let formattedTime = ''
  if (diffMinutes < 1) {
    formattedTime = 'agora há pouco'
  } else if (diffMinutes < 60) {
    formattedTime = `${diffMinutes}min parado`
  } else if (diffMinutes < 1440) {
    const hours = Math.floor(diffMinutes / 60)
    const mins = diffMinutes % 60
    formattedTime = mins > 0 ? `${hours}h ${mins}min parado` : `${hours}h parado`
  } else {
    const days = Math.floor(diffMinutes / 1440)
    const remHours = Math.floor((diffMinutes % 1440) / 60)
    formattedTime = remHours > 0 ? `${days}d ${remHours}h parado` : `${days}d parado`
  }

  if (diffMinutes < 30) {
    return {
      diffMinutes,
      tier: 'under30m',
      tierLabel: '< 30min',
      formattedTime,
      badgeClass: 'bg-emerald-50 text-emerald-700 border-emerald-200',
      bgClass: 'bg-emerald-50/40',
      borderClass: 'border-emerald-200',
      textClass: 'text-emerald-700',
      indicatorColor: 'bg-emerald-500',
    }
  }

  if (diffMinutes < 120) {
    return {
      diffMinutes,
      tier: '30mTo2h',
      tierLabel: '30min–2h',
      formattedTime,
      badgeClass: 'bg-sky-50 text-sky-700 border-sky-200',
      bgClass: 'bg-sky-50/40',
      borderClass: 'border-sky-200',
      textClass: 'text-sky-700',
      indicatorColor: 'bg-sky-500',
    }
  }

  if (diffMinutes < 1440) {
    return {
      diffMinutes,
      tier: '2hTo24h',
      tierLabel: '2h–24h',
      formattedTime,
      badgeClass: 'bg-amber-50 text-amber-700 border-amber-300',
      bgClass: 'bg-amber-50/40',
      borderClass: 'border-amber-200',
      textClass: 'text-amber-700',
      indicatorColor: 'bg-amber-500',
    }
  }

  return {
    diffMinutes,
    tier: 'over24h',
    tierLabel: '> 24h',
    formattedTime,
    badgeClass: 'bg-rose-50 text-rose-700 border-rose-300 font-bold',
    bgClass: 'bg-rose-50/50',
    borderClass: 'border-rose-300',
    textClass: 'text-rose-700',
    indicatorColor: 'bg-rose-600',
  }
}

interface ActiveBacklogQueueProps {
  records: ServiceRecord[]
  className?: string
  isWidget?: boolean
  maxWidgetItems?: number
  onUpdateRecord?: () => void
}

export function ActiveBacklogQueue({
  records,
  className,
  isWidget = false,
  maxWidgetItems = 10,
  onUpdateRecord,
}: ActiveBacklogQueueProps) {
  const [search, setSearch] = useState('')
  const [tierFilter, setTierFilter] = useState<string>('all')
  const [selectedRecord, setSelectedRecord] = useState<ServiceRecord | null>(null)
  const [detailOpen, setDetailOpen] = useState(false)

  // Somente atendimentos abertos (diferente de 'Concluído')
  const openRecords = useMemo(() => {
    return records.filter((r) => r && r.status !== 'Concluído')
  }, [records])

  // Calcula o aging de cada registro e ordena decrescente por tempo parado (mais antigos primeiro)
  const recordsWithAging = useMemo(() => {
    const now = Date.now()
    const mapped = openRecords.map((record) => {
      const aging = computeRecordAging(record, now)
      return { record, aging }
    })

    // Ordenar decrescente por tempo parado (diffMinutes desc)
    mapped.sort((a, b) => b.aging.diffMinutes - a.aging.diffMinutes)
    return mapped
  }, [openRecords])

  // Contagem por faixa
  const countsByTier = useMemo(() => {
    const counts = {
      under30m: 0,
      '30mTo2h': 0,
      '2hTo24h': 0,
      over24h: 0,
      total: recordsWithAging.length,
    }
    for (const item of recordsWithAging) {
      counts[item.aging.tier] += 1
    }
    return counts
  }, [recordsWithAging])

  // Filtragem por busca e por faixa de aging
  const filteredItems = useMemo(() => {
    return recordsWithAging.filter(({ record, aging }) => {
      if (tierFilter !== 'all' && aging.tier !== tierFilter) {
        return false
      }
      if (!search.trim()) return true
      const s = search.toLowerCase()
      const client = (record.client_name || '').toLowerCase()
      const company = (record.client_company || '').toLowerCase()
      const reason = (record.contact_reason || '').toLowerCase()
      const consultant = (
        record.expand?.assigned_user?.name ||
        record.assigned_agent ||
        ''
      ).toLowerCase()
      const desc = (record.description || '').toLowerCase()

      return (
        client.includes(s) ||
        company.includes(s) ||
        reason.includes(s) ||
        consultant.includes(s) ||
        desc.includes(s)
      )
    })
  }, [recordsWithAging, tierFilter, search])

  const displayedItems = isWidget ? filteredItems.slice(0, maxWidgetItems) : filteredItems

  const handleRowClick = (record: ServiceRecord) => {
    setSelectedRecord(record)
    setDetailOpen(true)
  }

  return (
    <Card className={`border-slate-200 shadow-subtle ${className || ''}`}>
      <CardHeader className="pb-3 border-b border-slate-100">
        <div className="flex flex-col sm:flex-row sm:items-center sm:justify-between gap-3">
          <div>
            <CardTitle className="text-sm font-bold text-slate-900 flex items-center gap-2">
              <Layers className="h-4 w-4 text-indigo-600" />
              <span>Fila / Backlog Ativo (Aging de Atendimentos)</span>
              <Badge
                variant="outline"
                className="text-xs bg-indigo-50 text-indigo-700 border-indigo-200 font-semibold"
              >
                {countsByTier.total} aberto{countsByTier.total !== 1 ? 's' : ''}
              </Badge>
            </CardTitle>
            <p className="text-xs text-slate-500 mt-0.5">
              Atendimentos pendentes e em andamento ordenados pelo maior tempo parado (mais antigos
              primeiro)
            </p>
          </div>
        </div>

        {/* Faixas Visuais por Idade com Contadores */}
        <div className="grid grid-cols-2 sm:grid-cols-4 gap-2 pt-2">
          {/* < 30min */}
          <button
            type="button"
            onClick={() => setTierFilter((prev) => (prev === 'under30m' ? 'all' : 'under30m'))}
            className={`p-2.5 rounded-lg border text-left transition-all ${
              tierFilter === 'under30m'
                ? 'bg-emerald-100 border-emerald-400 ring-2 ring-emerald-300'
                : 'bg-emerald-50/60 border-emerald-200 hover:bg-emerald-100/60'
            }`}
          >
            <div className="flex items-center justify-between">
              <span className="text-[11px] font-bold text-emerald-800 flex items-center gap-1">
                <span className="h-2 w-2 rounded-full bg-emerald-500 inline-block" />
                &lt; 30min
              </span>
              <span className="text-sm font-extrabold text-emerald-900">
                {countsByTier.under30m}
              </span>
            </div>
            <span className="text-[10px] text-emerald-700 block mt-0.5">Recentes / Em dia</span>
          </button>

          {/* 30min–2h */}
          <button
            type="button"
            onClick={() => setTierFilter((prev) => (prev === '30mTo2h' ? 'all' : '30mTo2h'))}
            className={`p-2.5 rounded-lg border text-left transition-all ${
              tierFilter === '30mTo2h'
                ? 'bg-sky-100 border-sky-400 ring-2 ring-sky-300'
                : 'bg-sky-50/60 border-sky-200 hover:bg-sky-100/60'
            }`}
          >
            <div className="flex items-center justify-between">
              <span className="text-[11px] font-bold text-sky-800 flex items-center gap-1">
                <span className="h-2 w-2 rounded-full bg-sky-500 inline-block" />
                30min–2h
              </span>
              <span className="text-sm font-extrabold text-sky-900">{countsByTier['30mTo2h']}</span>
            </div>
            <span className="text-[10px] text-sky-700 block mt-0.5">Atenção inicial</span>
          </button>

          {/* 2h–24h */}
          <button
            type="button"
            onClick={() => setTierFilter((prev) => (prev === '2hTo24h' ? 'all' : '2hTo24h'))}
            className={`p-2.5 rounded-lg border text-left transition-all ${
              tierFilter === '2hTo24h'
                ? 'bg-amber-100 border-amber-400 ring-2 ring-amber-300'
                : 'bg-amber-50/60 border-amber-200 hover:bg-amber-100/60'
            }`}
          >
            <div className="flex items-center justify-between">
              <span className="text-[11px] font-bold text-amber-800 flex items-center gap-1">
                <span className="h-2 w-2 rounded-full bg-amber-500 inline-block" />
                2h–24h
              </span>
              <span className="text-sm font-extrabold text-amber-900">
                {countsByTier['2hTo24h']}
              </span>
            </div>
            <span className="text-[10px] text-amber-700 block mt-0.5">Atraso moderado</span>
          </button>

          {/* > 24h */}
          <button
            type="button"
            onClick={() => setTierFilter((prev) => (prev === 'over24h' ? 'all' : 'over24h'))}
            className={`p-2.5 rounded-lg border text-left transition-all ${
              tierFilter === 'over24h'
                ? 'bg-rose-100 border-rose-400 ring-2 ring-rose-300'
                : 'bg-rose-50/60 border-rose-200 hover:bg-rose-100/60'
            }`}
          >
            <div className="flex items-center justify-between">
              <span className="text-[11px] font-bold text-rose-800 flex items-center gap-1">
                <span className="h-2 w-2 rounded-full bg-rose-600 inline-block animate-pulse" />
                &gt; 24h
              </span>
              <span className="text-sm font-extrabold text-rose-900">{countsByTier.over24h}</span>
            </div>
            <span className="text-[10px] text-rose-700 block mt-0.5">Crítico / Urgente</span>
          </button>
        </div>

        {/* Filtros rápidos: busca por texto e seleção de faixa */}
        <div className="flex flex-col sm:flex-row items-stretch sm:items-center justify-between gap-2 pt-2">
          <div className="relative flex-1 max-w-sm">
            <Search className="absolute left-2.5 top-2.5 h-3.5 w-3.5 text-slate-400" />
            <Input
              placeholder="Filtrar por cliente, motivo, consultor..."
              value={search}
              onChange={(e) => setSearch(e.target.value)}
              className="pl-8 h-8 text-xs w-full"
            />
          </div>

          <div className="flex items-center gap-2">
            <Select value={tierFilter} onValueChange={setTierFilter}>
              <SelectTrigger className="h-8 text-xs w-[160px]">
                <Filter className="h-3 w-3 mr-1 text-slate-400" />
                <SelectValue placeholder="Todas as faixas" />
              </SelectTrigger>
              <SelectContent>
                <SelectItem value="all">Todas as idades</SelectItem>
                <SelectItem value="under30m">&lt; 30min</SelectItem>
                <SelectItem value="30mTo2h">30min–2h</SelectItem>
                <SelectItem value="2hTo24h">2h–24h</SelectItem>
                <SelectItem value="over24h">&gt; 24h</SelectItem>
              </SelectContent>
            </Select>

            {tierFilter !== 'all' && (
              <Button
                variant="ghost"
                size="sm"
                onClick={() => setTierFilter('all')}
                className="h-8 text-xs text-slate-500 hover:text-slate-900"
              >
                Limpar
              </Button>
            )}
          </div>
        </div>
      </CardHeader>

      <CardContent className="pt-3 p-0">
        <div className="overflow-x-auto">
          <Table>
            <TableHeader className="bg-slate-50">
              <TableRow>
                <TableHead className="text-xs font-bold w-12 text-center">Faixa</TableHead>
                <TableHead className="text-xs font-bold min-w-[180px]">Cliente / Empresa</TableHead>
                <TableHead className="text-xs font-bold min-w-[140px]">Motivo</TableHead>
                <TableHead className="text-xs font-bold min-w-[140px]">
                  Consultor Responsável
                </TableHead>
                <TableHead className="text-xs font-bold min-w-[110px]">Status</TableHead>
                <TableHead className="text-xs font-bold min-w-[130px]">
                  Tempo Parado (Aging)
                </TableHead>
                <TableHead className="text-xs font-bold min-w-[110px]">Criado Em</TableHead>
                <TableHead className="text-xs font-bold text-right w-16">Ação</TableHead>
              </TableRow>
            </TableHeader>
            <TableBody>
              {displayedItems.length === 0 ? (
                <TableRow>
                  <TableCell colSpan={8} className="text-center py-10 text-xs text-slate-400">
                    {recordsWithAging.length === 0
                      ? 'Nenhum atendimento em aberto na fila. Parabéns!'
                      : 'Nenhum atendimento corresponde aos filtros selecionados.'}
                  </TableCell>
                </TableRow>
              ) : (
                displayedItems.map(({ record, aging }) => {
                  const consultantName =
                    record.expand?.assigned_user?.name || record.assigned_agent || 'Não atribuído'

                  return (
                    <TableRow
                      key={record.id}
                      onClick={() => handleRowClick(record)}
                      className="cursor-pointer hover:bg-slate-50/80 transition-colors"
                    >
                      {/* Indicador de faixa */}
                      <TableCell className="text-center py-2.5">
                        <span
                          className={`inline-block h-3 w-3 rounded-full ${aging.indicatorColor} ${
                            aging.tier === 'over24h' ? 'animate-pulse' : ''
                          }`}
                          title={`Faixa: ${aging.tierLabel}`}
                        />
                      </TableCell>

                      {/* Cliente */}
                      <TableCell className="py-2.5">
                        <div className="min-w-0">
                          <p className="text-xs font-bold text-slate-900 truncate flex items-center gap-1">
                            <Building2 className="h-3 w-3 text-slate-400 shrink-0" />
                            {record.client_company || record.client_name}
                          </p>
                          {record.client_company && record.client_name && (
                            <p className="text-[10px] text-slate-500 truncate">
                              {record.client_name}
                            </p>
                          )}
                        </div>
                      </TableCell>

                      {/* Motivo */}
                      <TableCell className="text-xs text-slate-700 py-2.5">
                        <div className="flex items-center gap-1.5 flex-wrap">
                          <span className="font-medium">{record.contact_reason}</span>
                          {record.avoidable_contact && (
                            <Badge
                              variant="outline"
                              className="text-[9px] py-0 px-1 bg-rose-50 text-rose-700 border-rose-200"
                            >
                              Evitável
                            </Badge>
                          )}
                        </div>
                      </TableCell>

                      {/* Consultor */}
                      <TableCell className="text-xs text-slate-700 py-2.5">
                        <div className="flex items-center gap-1">
                          <User className="h-3 w-3 text-slate-400 shrink-0" />
                          <span className="truncate">{consultantName}</span>
                        </div>
                      </TableCell>

                      {/* Status */}
                      <TableCell className="py-2.5">
                        <div className="flex items-center gap-1 flex-wrap">
                          <StatusBadge status={record.status} />
                          {isRecordReopened(record) && (
                            <Badge
                              variant="outline"
                              className="bg-amber-50 text-amber-800 border-amber-300 font-semibold text-[9px] py-0 px-1"
                              title="Atendimento reaberto"
                            >
                              <RotateCcw className="h-2 w-2 mr-0.5" /> Reaberto
                            </Badge>
                          )}
                        </div>
                      </TableCell>

                      {/* Aging */}
                      <TableCell className="py-2.5">
                        <Badge
                          variant="outline"
                          className={`text-xs px-2 py-0.5 flex items-center gap-1 w-fit ${aging.badgeClass}`}
                        >
                          <Hourglass className="h-3 w-3 shrink-0" />
                          <span>{aging.formattedTime}</span>
                        </Badge>
                      </TableCell>

                      {/* Criado em */}
                      <TableCell className="text-xs text-slate-500 py-2.5 whitespace-nowrap">
                        {record.created ? formatGMT3DateTime(record.created) : '-'}
                      </TableCell>

                      {/* Ação */}
                      <TableCell
                        className="text-right py-2.5"
                        onClick={(e) => {
                          e.stopPropagation()
                          handleRowClick(record)
                        }}
                      >
                        <Button
                          variant="ghost"
                          size="icon"
                          className="h-7 w-7 text-indigo-600 hover:text-indigo-800 hover:bg-indigo-50"
                          title="Ver detalhes do atendimento"
                        >
                          <Eye className="h-3.5 w-3.5" />
                        </Button>
                      </TableCell>
                    </TableRow>
                  )
                })
              )}
            </TableBody>
          </Table>
        </div>

        {isWidget && filteredItems.length > maxWidgetItems && (
          <div className="p-2 border-t border-slate-100 text-center bg-slate-50/50">
            <span className="text-xs text-slate-500">
              Exibindo os {maxWidgetItems} atendimentos mais antigos de {filteredItems.length} na
              fila.
            </span>
          </div>
        )}
      </CardContent>

      <ServiceRecordDetailModal
        record={selectedRecord}
        open={detailOpen}
        onOpenChange={setDetailOpen}
        onUpdateSuccess={() => {
          if (onUpdateRecord) onUpdateRecord()
        }}
      />
    </Card>
  )
}
