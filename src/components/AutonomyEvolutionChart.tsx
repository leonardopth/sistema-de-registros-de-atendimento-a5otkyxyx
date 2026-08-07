import { LineChart, Line, XAxis, YAxis, CartesianGrid } from 'recharts'
import {
  ChartContainer,
  ChartTooltip,
  ChartTooltipContent,
  type ChartConfig,
} from '@/components/ui/chart'
import type { AutonomyEvolutionPoint } from '@/lib/autonomy'

interface AutonomyEvolutionChartProps {
  data: AutonomyEvolutionPoint[]
}

const chartConfig = {
  autonomyRate: {
    label: 'Índice de Autonomia',
    color: 'hsl(var(--chart-2))',
  },
} satisfies ChartConfig

export function AutonomyEvolutionChart({ data }: AutonomyEvolutionChartProps) {
  if (data.length === 0) {
    return (
      <p className="text-xs text-slate-400 text-center py-8">
        Sem dados suficientes para exibir a evolução.
      </p>
    )
  }

  return (
    <ChartContainer config={chartConfig} className="h-[250px] w-full">
      <LineChart data={data} margin={{ left: 0, right: 12, top: 8, bottom: 8 }}>
        <CartesianGrid strokeDasharray="3 3" vertical={false} />
        <XAxis dataKey="monthLabel" tickLine={false} axisLine={false} tick={{ fontSize: 11 }} />
        <YAxis domain={[0, 100]} tickLine={false} axisLine={false} tick={{ fontSize: 11 }} />
        <ChartTooltip content={<ChartTooltipContent />} />
        <Line
          type="monotone"
          dataKey="autonomyRate"
          stroke="var(--color-autonomyRate)"
          strokeWidth={2}
          dot={{ r: 4 }}
          name="Autonomia %"
        />
      </LineChart>
    </ChartContainer>
  )
}
