import { useState, useMemo } from 'react'
import { Card, CardContent } from '@/components/ui/card'
import { Button } from '@/components/ui/button'
import { Input } from '@/components/ui/input'
import { Label } from '@/components/ui/label'
import {
  Table,
  TableHeader,
  TableBody,
  TableRow,
  TableHead,
  TableCell,
} from '@/components/ui/table'
import {
  ChartContainer,
  ChartTooltip,
  ChartTooltipContent,
  type ChartConfig,
} from '@/components/ui/chart'
import { Bar, BarChart, XAxis, YAxis, CartesianGrid } from 'recharts'
import { ServiceRecord, ClientRecord, AccountExecutiveRecord } from '@/types/service_record'
import { SERVICE_GROUP_OPTIONS } from '@/lib/service-groups'
import { Users2, Layers, TrendingUp, TrendingDown, Minus, Calendar } from 'lucide-react'
import { cn } from '@/lib/utils'

type Dimension = 'executive' | 'group'

interface Props {
  records: ServiceRecord[]
  clients: ClientRecord[]
  executives: AccountExecutiveRecord[]
}

function filterByDate(records: ServiceRecord[], from: string, to: string): ServiceRecord[] {
  if (!from || !to) return []
  return records.filter(
    (r) => r.created && r.created.substring(0, 10) >= from && r.created.substring(0, 10) <= to,
  )
}

function getEntityRecords(
  records: ServiceRecord[],
  id: string,
  dim: Dimension,
  clientMap: Map<string, ClientRecord>,
): ServiceRecord[] {
  if (dim === 'executive')
    return records.filter(
      (r) => r.expand?.account_executive?.id === id || r.account_executive === id,
    )
  return records.filter((r) => {
    const cid = r.client || r.expand?.client?.id
    return cid ? clientMap.get(cid)?.service_group === id : false
  })
}

function computeStats(recs: ServiceRecord[]) {
  const total = recs.length
  const avoidable = recs.filter((r) => r.avoidable_contact).length
  return { total, avoidable, rate: total > 0 ? Math.round((avoidable / total) * 100) : 0 }
}

function VarIndicator({ value }: { value: number | null }) {
  if (value === null) return <Minus className="h-3 w-3 text-slate-400 inline" />
  if (value > 0)
    return (
      <span className="text-emerald-600 text-xs font-bold">
        <TrendingUp className="h-3 w-3 inline mr-0.5" />+{value}%
      </span>
    )
  if (value < 0)
    return (
      <span className="text-rose-600 text-xs font-bold">
        <TrendingDown className="h-3 w-3 inline mr-0.5" />
        {value}%
      </span>
    )
  return <span className="text-slate-400 text-xs font-bold">0%</span>
}

export function PeriodComparisonView({ records, clients, executives }: Props) {
  const [dimension, setDimension] = useState<Dimension>('executive')
  const [p1From, setP1From] = useState('')
  const [p1To, setP1To] = useState('')
  const [p2From, setP2From] = useState('')
  const [p2To, setP2To] = useState('')

  const clientMap = useMemo(() => new Map(clients.map((c) => [c.id, c])), [clients])

  const entities = useMemo(() => {
    if (dimension === 'executive') return executives.map((e) => ({ id: e.id, label: e.name }))
    return SERVICE_GROUP_OPTIONS.map((g) => ({ id: g.value, label: g.label }))
  }, [dimension, executives])

  const p1Records = useMemo(() => filterByDate(records, p1From, p1To), [records, p1From, p1To])
  const p2Records = useMemo(() => filterByDate(records, p2From, p2To), [records, p2From, p2To])

  const results = useMemo(() => {
    return entities
      .map((e) => {
        const s1 = computeStats(getEntityRecords(p1Records, e.id, dimension, clientMap))
        const s2 = computeStats(getEntityRecords(p2Records, e.id, dimension, clientMap))
        const variation = s1.total > 0 ? Math.round(((s2.total - s1.total) / s1.total) * 100) : null
        return { ...e, p1: s1, p2: s2, variation }
      })
      .filter((r) => r.p1.total > 0 || r.p2.total > 0)
  }, [entities, p1Records, p2Records, dimension, clientMap])

  const chartData = results.map((r) => ({ name: r.label, P1: r.p1.total, P2: r.p2.total }))
  const chartConfig: ChartConfig = {
    P1: { label: 'Período 1', color: 'hsl(var(--chart-1))' },
    P2: { label: 'Período 2', color: 'hsl(var(--chart-2))' },
  }
  const hasData = p1From && p1To && p2From && p2To

  return (
    <div className="space-y-4">
      <div className="flex gap-1 bg-slate-100 rounded-lg p-1 w-fit">
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
      <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
        <Card className="border-slate-200 shadow-subtle">
          <CardContent className="p-3">
            <Label className="text-xs font-bold text-slate-700 flex items-center gap-1.5 mb-2">
              <Calendar className="h-3.5 w-3.5" /> Período 1
            </Label>
            <div className="flex gap-2">
              <Input
                type="date"
                className="h-8 text-xs"
                value={p1From}
                onChange={(e) => setP1From(e.target.value)}
              />
              <Input
                type="date"
                className="h-8 text-xs"
                value={p1To}
                onChange={(e) => setP1To(e.target.value)}
              />
            </div>
          </CardContent>
        </Card>
        <Card className="border-slate-200 shadow-subtle">
          <CardContent className="p-3">
            <Label className="text-xs font-bold text-slate-700 flex items-center gap-1.5 mb-2">
              <Calendar className="h-3.5 w-3.5" /> Período 2
            </Label>
            <div className="flex gap-2">
              <Input
                type="date"
                className="h-8 text-xs"
                value={p2From}
                onChange={(e) => setP2From(e.target.value)}
              />
              <Input
                type="date"
                className="h-8 text-xs"
                value={p2To}
                onChange={(e) => setP2To(e.target.value)}
              />
            </div>
          </CardContent>
        </Card>
      </div>
      {!hasData ? (
        <Card className="p-8 text-center border-slate-200">
          <Calendar className="h-10 w-10 text-slate-300 mx-auto mb-2" />
          <p className="text-xs text-slate-400">Selecione os dois períodos para comparar.</p>
        </Card>
      ) : results.length === 0 ? (
        <Card className="p-8 text-center border-slate-200">
          <p className="text-xs text-slate-400">
            Nenhum dado encontrado nos períodos selecionados.
          </p>
        </Card>
      ) : (
        <>
          <Card className="border-slate-200 shadow-subtle">
            <CardContent className="p-4">
              <Table>
                <TableHeader className="bg-slate-50">
                  <TableRow>
                    <TableHead className="text-xs font-bold">
                      {dimension === 'executive' ? 'Executivo' : 'Grupo'}
                    </TableHead>
                    <TableHead className="text-xs font-bold text-center">P1 Total</TableHead>
                    <TableHead className="text-xs font-bold text-center">P1 Evit.</TableHead>
                    <TableHead className="text-xs font-bold text-center">P2 Total</TableHead>
                    <TableHead className="text-xs font-bold text-center">P2 Evit.</TableHead>
                    <TableHead className="text-xs font-bold text-center">Var.</TableHead>
                  </TableRow>
                </TableHeader>
                <TableBody>
                  {results.map((r) => (
                    <TableRow key={r.id} className="hover:bg-slate-50">
                      <TableCell className="text-xs font-semibold">{r.label}</TableCell>
                      <TableCell className="text-xs text-center">{r.p1.total}</TableCell>
                      <TableCell className="text-xs text-center text-amber-600">
                        {r.p1.avoidable}
                      </TableCell>
                      <TableCell className="text-xs text-center">{r.p2.total}</TableCell>
                      <TableCell className="text-xs text-center text-amber-600">
                        {r.p2.avoidable}
                      </TableCell>
                      <TableCell className="text-xs text-center">
                        <VarIndicator value={r.variation} />
                      </TableCell>
                    </TableRow>
                  ))}
                </TableBody>
              </Table>
            </CardContent>
          </Card>
          <Card className="border-slate-200 shadow-subtle">
            <CardContent className="p-4">
              <h3 className="text-sm font-bold text-slate-900 mb-3">Comparativo Visual</h3>
              <ChartContainer config={chartConfig} className="h-[280px] w-full">
                <BarChart data={chartData}>
                  <CartesianGrid vertical={false} strokeDasharray="3 3" />
                  <XAxis dataKey="name" tick={{ fontSize: 11 }} tickLine={false} axisLine={false} />
                  <YAxis tick={{ fontSize: 11 }} tickLine={false} axisLine={false} width={30} />
                  <ChartTooltip content={<ChartTooltipContent />} />
                  <Bar dataKey="P1" fill="hsl(var(--chart-1))" radius={[4, 4, 0, 0]} />
                  <Bar dataKey="P2" fill="hsl(var(--chart-2))" radius={[4, 4, 0, 0]} />
                </BarChart>
              </ChartContainer>
            </CardContent>
          </Card>
        </>
      )}
    </div>
  )
}
