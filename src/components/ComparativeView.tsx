import { useState, useEffect, useMemo } from 'react'
import { Card, CardContent } from '@/components/ui/card'
import { Button } from '@/components/ui/button'
import { Popover, PopoverContent, PopoverTrigger } from '@/components/ui/popover'
import { Checkbox } from '@/components/ui/checkbox'
import { ScrollArea } from '@/components/ui/scroll-area'
import {
  ChartContainer,
  ChartTooltip,
  ChartTooltipContent,
  type ChartConfig,
} from '@/components/ui/chart'
import { Bar, BarChart, XAxis, YAxis, CartesianGrid } from 'recharts'
import { ServiceRecord, ClientRecord, AccountExecutiveRecord } from '@/types/service_record'
import { SERVICE_GROUP_OPTIONS } from '@/lib/service-groups'
import {
  Users2,
  Layers,
  ChevronDown,
  TrendingUp,
  TrendingDown,
  Minus,
  BarChart3,
} from 'lucide-react'
import { cn } from '@/lib/utils'

type Dimension = 'executive' | 'group'

interface EntityStats {
  id: string
  label: string
  total: number
  avoidable: number
  rate: number
  totalVariation: number | null
  avoidableVariation: number | null
}

function computeVariation(recs: ServiceRecord[]): number | null {
  if (recs.length < 2) return null
  const sorted = [...recs].sort((a, b) => (a.created || '').localeCompare(b.created || ''))
  const mid = Math.floor(sorted.length / 2)
  const prev = sorted.slice(0, mid).length
  const curr = sorted.slice(mid).length
  if (prev === 0) return curr > 0 ? 100 : null
  return Math.round(((curr - prev) / prev) * 100)
}

function VariationIndicator({ value }: { value: number | null }) {
  if (value === null) return <Minus className="h-3 w-3 text-slate-400" />
  if (value > 0)
    return (
      <span className="flex items-center text-emerald-600 text-xs font-bold">
        <TrendingUp className="h-3 w-3 mr-0.5" />+{value}%
      </span>
    )
  if (value < 0)
    return (
      <span className="flex items-center text-rose-600 text-xs font-bold">
        <TrendingDown className="h-3 w-3 mr-0.5" />
        {value}%
      </span>
    )
  return <span className="text-slate-400 text-xs font-bold">0%</span>
}

interface Props {
  records: ServiceRecord[]
  clients: ClientRecord[]
  executives: AccountExecutiveRecord[]
}

export function ComparativeView({ records, clients, executives }: Props) {
  const [dimension, setDimension] = useState<Dimension>('executive')
  const [selectedIds, setSelectedIds] = useState<string[]>([])

  const entities = useMemo(() => {
    if (dimension === 'executive') return executives.map((e) => ({ id: e.id, label: e.name }))
    return SERVICE_GROUP_OPTIONS.map((g) => ({ id: g.value, label: g.label }))
  }, [dimension, executives])

  useEffect(() => {
    setSelectedIds(entities.slice(0, 3).map((e) => e.id))
  }, [dimension])

  const clientMap = useMemo(() => new Map(clients.map((c) => [c.id, c])), [clients])

  const stats = useMemo<EntityStats[]>(() => {
    return selectedIds.map((id) => {
      let label = id
      let entityRecords: ServiceRecord[] = []

      if (dimension === 'executive') {
        const exec = executives.find((e) => e.id === id)
        label = exec?.name || id
        entityRecords = records.filter(
          (r) => r.expand?.account_executive?.id === id || r.account_executive === id,
        )
      } else {
        const group = SERVICE_GROUP_OPTIONS.find((g) => g.value === id)
        label = group?.label || id
        entityRecords = records.filter((r) => {
          const cid = r.client || r.expand?.client?.id
          if (cid) {
            const cl = clientMap.get(cid)
            if (cl?.service_group === id) return true
          }
          return false
        })
      }

      const total = entityRecords.length
      const avoidable = entityRecords.filter((r) => r.avoidable_contact).length
      const rate = total > 0 ? Math.round((avoidable / total) * 100) : 0

      return {
        id,
        label,
        total,
        avoidable,
        rate,
        totalVariation: computeVariation(entityRecords),
        avoidableVariation: computeVariation(entityRecords.filter((r) => r.avoidable_contact)),
      }
    })
  }, [selectedIds, dimension, records, executives, clientMap])

  const chartData = stats.map((s) => ({ name: s.label, Total: s.total, Evitaveis: s.avoidable }))
  const chartConfig: ChartConfig = {
    Total: { label: 'Total', color: 'hsl(var(--chart-1))' },
    Evitaveis: { label: 'Evitáveis', color: 'hsl(var(--chart-3))' },
  }

  const toggleEntity = (id: string) =>
    setSelectedIds((prev) => (prev.includes(id) ? prev.filter((x) => x !== id) : [...prev, id]))

  return (
    <div className="space-y-4">
      <div className="flex flex-wrap items-center gap-3">
        <div className="flex gap-1 bg-slate-100 rounded-lg p-1">
          <Button
            size="sm"
            variant={dimension === 'executive' ? 'default' : 'ghost'}
            className={cn(
              'text-xs h-8',
              dimension === 'executive' && 'bg-indigo-600 hover:bg-indigo-700',
            )}
            onClick={() => setDimension('executive')}
          >
            <Users2 className="h-3.5 w-3.5 mr-1.5" /> Executivos
          </Button>
          <Button
            size="sm"
            variant={dimension === 'group' ? 'default' : 'ghost'}
            className={cn(
              'text-xs h-8',
              dimension === 'group' && 'bg-indigo-600 hover:bg-indigo-700',
            )}
            onClick={() => setDimension('group')}
          >
            <Layers className="h-3.5 w-3.5 mr-1.5" /> Grupos
          </Button>
        </div>

        <Popover>
          <PopoverTrigger asChild>
            <Button variant="outline" size="sm" className="text-xs h-8">
              Selecionar ({selectedIds.length}) <ChevronDown className="h-3.5 w-3.5 ml-1.5" />
            </Button>
          </PopoverTrigger>
          <PopoverContent className="w-64 p-0">
            <ScrollArea className="h-[240px]">
              <div className="p-2 space-y-1">
                {entities.map((e) => (
                  <label
                    key={e.id}
                    className="flex items-center gap-2 px-2 py-1.5 rounded hover:bg-slate-50 cursor-pointer"
                  >
                    <Checkbox
                      checked={selectedIds.includes(e.id)}
                      onCheckedChange={() => toggleEntity(e.id)}
                    />
                    <span className="text-xs font-medium text-slate-700">{e.label}</span>
                  </label>
                ))}
              </div>
            </ScrollArea>
          </PopoverContent>
        </Popover>
      </div>

      {stats.length >= 2 ? (
        <>
          <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-3 xl:grid-cols-4 gap-3">
            {stats.map((s) => (
              <Card key={s.id} className="border-slate-200 shadow-subtle">
                <CardContent className="p-3">
                  <h4 className="text-xs font-bold text-slate-900 truncate mb-2">{s.label}</h4>
                  <div className="space-y-1.5">
                    <div className="flex items-center justify-between">
                      <span className="text-[11px] text-slate-500">Total</span>
                      <div className="flex items-center gap-1.5">
                        <span className="text-sm font-black text-slate-900">{s.total}</span>
                        <VariationIndicator value={s.totalVariation} />
                      </div>
                    </div>
                    <div className="flex items-center justify-between">
                      <span className="text-[11px] text-slate-500">Evitáveis</span>
                      <div className="flex items-center gap-1.5">
                        <span className="text-sm font-black text-amber-600">{s.avoidable}</span>
                        <VariationIndicator value={s.avoidableVariation} />
                      </div>
                    </div>
                    <div className="flex items-center justify-between">
                      <span className="text-[11px] text-slate-500">Taxa</span>
                      <span
                        className={cn(
                          'text-sm font-black',
                          s.rate > 30 ? 'text-rose-600' : 'text-slate-900',
                        )}
                      >
                        {s.rate}%
                      </span>
                    </div>
                  </div>
                </CardContent>
              </Card>
            ))}
          </div>

          <Card className="border-slate-200 shadow-subtle">
            <CardContent className="p-4">
              <h3 className="text-sm font-bold text-slate-900 mb-3">Comparativo Visual</h3>
              <ChartContainer config={chartConfig} className="h-[280px] w-full">
                <BarChart data={chartData}>
                  <CartesianGrid vertical={false} strokeDasharray="3 3" />
                  <XAxis dataKey="name" tick={{ fontSize: 11 }} tickLine={false} axisLine={false} />
                  <YAxis tick={{ fontSize: 11 }} tickLine={false} axisLine={false} width={30} />
                  <ChartTooltip content={<ChartTooltipContent />} />
                  <Bar dataKey="Total" fill="hsl(var(--chart-1))" radius={[4, 4, 0, 0]} />
                  <Bar dataKey="Evitaveis" fill="hsl(var(--chart-3))" radius={[4, 4, 0, 0]} />
                </BarChart>
              </ChartContainer>
            </CardContent>
          </Card>
        </>
      ) : (
        <Card className="p-8 text-center border-slate-200">
          <BarChart3 className="h-10 w-10 text-slate-300 mx-auto mb-2" />
          <p className="text-xs text-slate-400">Selecione 2 ou mais entidades para comparar.</p>
        </Card>
      )}
    </div>
  )
}
