import { useState } from 'react'
import {
  ResponsiveContainer,
  ComposedChart,
  Bar,
  Line,
  XAxis,
  YAxis,
  CartesianGrid,
  Tooltip,
  ReferenceLine,
  Cell,
} from 'recharts'
import { Button } from '@/components/ui/button'
import { Badge } from '@/components/ui/badge'
import { BarChart3, LineChart as LineChartIcon } from 'lucide-react'
import type { AutonomyEvolutionPoint } from '@/lib/autonomy'

interface AutonomyEvolutionChartProps {
  data: AutonomyEvolutionPoint[]
  threshold?: number
}

export function AutonomyEvolutionChart({ data, threshold = 80 }: AutonomyEvolutionChartProps) {
  const [chartType, setChartType] = useState<'line' | 'bar'>('line')

  if (data.length === 0) {
    return (
      <p className="text-xs text-slate-400 text-center py-8">
        Sem dados suficientes para exibir a evolução dos últimos 12 meses.
      </p>
    )
  }

  // Threshold efetivo: garante um número válido
  const effectiveThreshold = typeof threshold === 'number' && threshold > 0 ? threshold : 80

  return (
    <div className="space-y-3">
      <div className="flex items-center justify-between">
        <div className="flex items-center gap-2">
          <Badge
            variant="outline"
            className="text-[11px] font-normal border-indigo-200 text-indigo-700 bg-indigo-50"
          >
            Meta / Threshold: <strong className="ml-1 font-bold">{effectiveThreshold}%</strong>
          </Badge>
          <div className="flex items-center gap-3 text-[11px] text-slate-500">
            <span className="flex items-center gap-1">
              <span className="h-2.5 w-2.5 rounded-full bg-emerald-500 inline-block" /> ≥ Meta
              (Verde)
            </span>
            <span className="flex items-center gap-1">
              <span className="h-2.5 w-2.5 rounded-full bg-rose-500 inline-block" /> &lt; Meta
              (Vermelho)
            </span>
          </div>
        </div>

        <div className="flex items-center gap-1 bg-slate-100 rounded-lg p-0.5">
          <Button
            size="sm"
            variant={chartType === 'line' ? 'default' : 'ghost'}
            className="h-6 px-2 text-[11px]"
            onClick={() => setChartType('line')}
          >
            <LineChartIcon className="h-3 w-3 mr-1" /> Linha
          </Button>
          <Button
            size="sm"
            variant={chartType === 'bar' ? 'default' : 'ghost'}
            className="h-6 px-2 text-[11px]"
            onClick={() => setChartType('bar')}
          >
            <BarChart3 className="h-3 w-3 mr-1" /> Barras
          </Button>
        </div>
      </div>

      <div className="h-[260px] w-full pt-2">
        <ResponsiveContainer width="100%" height="100%">
          <ComposedChart data={data} margin={{ top: 12, right: 16, left: -10, bottom: 0 }}>
            <CartesianGrid strokeDasharray="3 3" vertical={false} stroke="#e2e8f0" />
            <XAxis
              dataKey="monthLabel"
              tickLine={false}
              axisLine={{ stroke: '#cbd5e1' }}
              tick={{ fontSize: 11, fill: '#64748b' }}
            />
            <YAxis
              domain={[0, 100]}
              tickLine={false}
              axisLine={{ stroke: '#cbd5e1' }}
              tick={{ fontSize: 11, fill: '#64748b' }}
              unit="%"
            />
            <Tooltip
              content={({ active, payload }) => {
                if (!active || !payload || !payload.length) return null
                const item = payload[0].payload as AutonomyEvolutionPoint
                const isAbove = item.autonomyRate >= effectiveThreshold
                return (
                  <div className="rounded-lg border border-slate-200 bg-white p-2.5 shadow-md text-xs">
                    <p className="font-bold text-slate-800 mb-1">{item.monthLabel}</p>
                    <div className="space-y-1">
                      <div className="flex items-center justify-between gap-4">
                        <span className="text-slate-500">Índice de Autonomia:</span>
                        <span
                          className={`font-black ${isAbove ? 'text-emerald-600' : 'text-rose-600'}`}
                        >
                          {item.autonomyRate}%
                        </span>
                      </div>
                      <div className="flex items-center justify-between gap-4">
                        <span className="text-slate-500">Meta configurada:</span>
                        <span className="font-semibold text-indigo-600">{effectiveThreshold}%</span>
                      </div>
                      <div className="flex items-center justify-between gap-4 text-[10px] text-slate-400 border-t border-slate-100 pt-1">
                        <span>Total: {item.total} atend.</span>
                        <span>Evitáveis: {item.avoidable}</span>
                      </div>
                    </div>
                  </div>
                )
              }}
            />

            <ReferenceLine
              y={effectiveThreshold}
              stroke="#6366f1"
              strokeDasharray="4 4"
              strokeWidth={2}
              label={{
                value: `Meta: ${effectiveThreshold}%`,
                position: 'insideTopRight',
                fill: '#4f46e5',
                fontSize: 11,
                fontWeight: 'bold',
              }}
            />

            {chartType === 'line' ? (
              <Line
                type="monotone"
                dataKey="autonomyRate"
                stroke="#6366f1"
                strokeWidth={2.5}
                dot={(props: any) => {
                  const { cx, cy, payload } = props
                  const isAbove = payload.autonomyRate >= effectiveThreshold
                  return (
                    <circle
                      key={`dot-${payload.month}`}
                      cx={cx}
                      cy={cy}
                      r={5}
                      fill={isAbove ? '#10b981' : '#f43f5e'}
                      stroke="#ffffff"
                      strokeWidth={2}
                    />
                  )
                }}
                activeDot={{ r: 7 }}
                name="Autonomia"
              />
            ) : (
              <Bar dataKey="autonomyRate" radius={[4, 4, 0, 0]} maxBarSize={32}>
                {data.map((entry) => (
                  <Cell
                    key={`cell-${entry.month}`}
                    fill={entry.autonomyRate >= effectiveThreshold ? '#10b981' : '#f43f5e'}
                  />
                ))}
              </Bar>
            )}
          </ComposedChart>
        </ResponsiveContainer>
      </div>
    </div>
  )
}
