import { useMemo, useState } from 'react'
import { Card, CardHeader, CardTitle, CardContent } from '@/components/ui/card'
import { Badge } from '@/components/ui/badge'
import { Button } from '@/components/ui/button'
import { ServiceRecord } from '@/types/service_record'
import { TIMEZONE } from '@/lib/timezone'
import { Clock, Calendar, Info, Flame, Eye, EyeOff } from 'lucide-react'
import { Tooltip, TooltipContent, TooltipTrigger } from '@/components/ui/tooltip'

interface ProductivityHeatmapProps {
  records: ServiceRecord[]
  className?: string
}

// Dias da semana: Segunda a Domingo (índices 0 a 6)
// Em JS Date.getDay(): 0=Dom, 1=Seg, 2=Ter, 3=Qua, 4=Qui, 5=Sex, 6=Sáb
const DAYS = [
  { key: 1, label: 'Seg', full: 'Segunda-feira' },
  { key: 2, label: 'Ter', full: 'Terça-feira' },
  { key: 3, label: 'Qua', full: 'Quarta-feira' },
  { key: 4, label: 'Qui', full: 'Quinta-feira' },
  { key: 5, label: 'Sex', full: 'Sexta-feira' },
  { key: 6, label: 'Sáb', full: 'Sábado' },
  { key: 0, label: 'Dom', full: 'Domingo' },
]

// Horas do dia: 0h a 23h
const HOURS = Array.from({ length: 24 }, (_, i) => i)

// Extrai dia da semana (0-6) e hora (0-23) no fuso GMT-3 (America/Sao_Paulo)
function getDayAndHourGMT3(isoString: string): { day: number; hour: number } | null {
  if (!isoString) return null
  const d = new Date(isoString)
  if (isNaN(d.getTime())) return null

  try {
    const parts = new Intl.DateTimeFormat('en-US', {
      timeZone: TIMEZONE,
      weekday: 'short',
      hour: 'numeric',
      hour12: false,
    }).formatToParts(d)

    const weekdayStr = parts.find((p) => p.type === 'weekday')?.value
    const hourStr = parts.find((p) => p.type === 'hour')?.value
    const hour = hourStr ? parseInt(hourStr, 10) % 24 : 0

    let day = 0
    switch (weekdayStr) {
      case 'Sun':
        day = 0
        break
      case 'Mon':
        day = 1
        break
      case 'Tue':
        day = 2
        break
      case 'Wed':
        day = 3
        break
      case 'Thu':
        day = 4
        break
      case 'Fri':
        day = 5
        break
      case 'Sat':
        day = 6
        break
      default:
        day = d.getUTCDay()
    }

    return { day, hour }
  } catch {
    // Fallback aproximado com offset -3h
    const shifted = new Date(d.getTime() - 3 * 3600 * 1000)
    return { day: shifted.getUTCDay(), hour: shifted.getUTCHours() }
  }
}

export function ProductivityHeatmap({ records, className }: ProductivityHeatmapProps) {
  // Filtro de horário comercial vs todas as horas para facilitar visualização
  const [onlyBusinessHours, setOnlyBusinessHours] = useState(false)

  // Matriz [hour][dayKey] -> count
  const matrixData = useMemo(() => {
    // Inicializa grade: 24 horas x 7 dias
    const grid: number[][] = Array.from({ length: 24 }, () => Array(7).fill(0))
    let max = 0
    let total = 0

    // Mapeamento rápido do dia da semana (0=Dom -> índice 6; 1=Seg -> índice 0, etc.)
    const dayKeyToIndex: Record<number, number> = {
      1: 0, // Seg
      2: 1, // Ter
      3: 2, // Qua
      4: 3, // Qui
      5: 4, // Sex
      6: 5, // Sáb
      0: 6, // Dom
    }

    const dayTotals = Array(7).fill(0)
    const hourTotals = Array(24).fill(0)

    for (const r of records) {
      if (!r.created) continue
      const parsed = getDayAndHourGMT3(r.created)
      if (!parsed) continue

      const dayIdx = dayKeyToIndex[parsed.day]
      if (dayIdx !== undefined && parsed.hour >= 0 && parsed.hour < 24) {
        grid[parsed.hour][dayIdx] += 1
        dayTotals[dayIdx] += 1
        hourTotals[parsed.hour] += 1
        total += 1
        if (grid[parsed.hour][dayIdx] > max) {
          max = grid[parsed.hour][dayIdx]
        }
      }
    }

    // Achar hora de pico e dia de pico
    let peakHour = 0
    let peakHourVal = -1
    hourTotals.forEach((val, h) => {
      if (val > peakHourVal) {
        peakHourVal = val
        peakHour = h
      }
    })

    let peakDayIdx = 0
    let peakDayVal = -1
    dayTotals.forEach((val, d) => {
      if (val > peakDayVal) {
        peakDayVal = val
        peakDayIdx = d
      }
    })

    return {
      grid,
      maxVal: max,
      total,
      dayTotals,
      hourTotals,
      peakHour,
      peakHourVal,
      peakDay: DAYS[peakDayIdx],
      peakDayVal,
    }
  }, [records])

  const displayedHours = useMemo(() => {
    if (onlyBusinessHours) {
      return HOURS.filter((h) => h >= 7 && h <= 19)
    }
    return HOURS
  }, [onlyBusinessHours])

  // Escala de cores baseada no valor relativo ao máximo (0 a 100%)
  // Paleta Indigo moderna (volume baixo = claro, alto = escuro e vibrante)
  const getCellColor = (count: number, max: number) => {
    if (count === 0 || max === 0) {
      return 'bg-slate-50 text-slate-300 border-slate-100 hover:border-slate-300'
    }
    const ratio = count / max
    if (ratio < 0.2) {
      return 'bg-indigo-50 text-indigo-700 border-indigo-100 hover:border-indigo-300 font-medium'
    }
    if (ratio < 0.4) {
      return 'bg-indigo-100 text-indigo-800 border-indigo-200 hover:border-indigo-400 font-semibold'
    }
    if (ratio < 0.6) {
      return 'bg-indigo-300 text-indigo-900 border-indigo-400 hover:border-indigo-500 font-bold'
    }
    if (ratio < 0.8) {
      return 'bg-indigo-500 text-white border-indigo-600 hover:border-indigo-700 font-bold shadow-xs'
    }
    return 'bg-indigo-700 text-white border-indigo-800 hover:border-indigo-900 font-extrabold shadow-sm'
  }

  return (
    <Card className={`border-slate-200 shadow-subtle ${className || ''}`}>
      <CardHeader className="pb-3 border-b border-slate-100">
        <div className="flex flex-col sm:flex-row sm:items-center sm:justify-between gap-3">
          <div>
            <CardTitle className="text-sm font-bold text-slate-900 flex items-center gap-2">
              <Clock className="h-4 w-4 text-indigo-600" />
              <span>Heatmap de Produtividade por Horário</span>
            </CardTitle>
            <p className="text-xs text-slate-500 mt-0.5">
              Densidade de volume de atendimentos cruzando horários (0h–23h) com dias da semana
              (GMT-3)
            </p>
          </div>

          <div className="flex items-center gap-2">
            <Button
              variant="outline"
              size="sm"
              onClick={() => setOnlyBusinessHours((prev) => !prev)}
              className="h-7 text-xs gap-1 border-slate-200"
            >
              {onlyBusinessHours ? (
                <>
                  <Eye className="h-3 w-3 text-slate-600" /> Ver 24 Horas
                </>
              ) : (
                <>
                  <EyeOff className="h-3 w-3 text-slate-600" /> Horário Comercial (7h–19h)
                </>
              )}
            </Button>
          </div>
        </div>

        {/* Resumo Rápido de Picos */}
        <div className="grid grid-cols-2 sm:grid-cols-4 gap-2 pt-2 text-xs">
          <div className="p-2 rounded bg-slate-50 border border-slate-100">
            <span className="text-[10px] text-slate-500 block">Total Mapeado</span>
            <span className="font-bold text-slate-900 text-sm">{matrixData.total}</span>
          </div>
          <div className="p-2 rounded bg-slate-50 border border-slate-100">
            <span className="text-[10px] text-slate-500 block">Dia com Maior Volume</span>
            <span className="font-bold text-indigo-700 text-sm flex items-center gap-1">
              <Calendar className="h-3 w-3" />
              {matrixData.peakDay.full} ({matrixData.peakDayVal})
            </span>
          </div>
          <div className="p-2 rounded bg-slate-50 border border-slate-100">
            <span className="text-[10px] text-slate-500 block">Horário de Pico Geral</span>
            <span className="font-bold text-indigo-700 text-sm flex items-center gap-1">
              <Flame className="h-3 w-3 text-amber-500" />
              {String(matrixData.peakHour).padStart(2, '0')}:00 ({matrixData.peakHourVal})
            </span>
          </div>
          <div className="p-2 rounded bg-slate-50 border border-slate-100">
            <span className="text-[10px] text-slate-500 block">Pico Máximo na Célula</span>
            <span className="font-bold text-slate-900 text-sm">
              {matrixData.maxVal} atendimentos
            </span>
          </div>
        </div>
      </CardHeader>

      <CardContent className="pt-4 space-y-4">
        {matrixData.total === 0 ? (
          <div className="py-12 text-center text-xs text-slate-400">
            Nenhum atendimento disponível no período selecionado para exibir o heatmap.
          </div>
        ) : (
          <div className="overflow-x-auto">
            <div className="min-w-[620px]">
              {/* Tabela do Heatmap matricial */}
              <table className="w-full border-collapse">
                <thead>
                  <tr>
                    <th className="w-16 pb-2 text-[11px] font-bold text-slate-500 text-left uppercase tracking-wider">
                      Hora
                    </th>
                    {DAYS.map((d, dIdx) => (
                      <th key={d.key} className="pb-2 text-center px-1">
                        <div className="text-xs font-bold text-slate-700">{d.label}</div>
                        <div className="text-[10px] text-slate-400 font-normal">
                          {matrixData.dayTotals[dIdx]} total
                        </div>
                      </th>
                    ))}
                    <th className="w-16 pb-2 text-center text-[10px] font-semibold text-slate-500">
                      Total
                    </th>
                  </tr>
                </thead>
                <tbody className="divide-y divide-slate-100">
                  {displayedHours.map((hour) => {
                    const rowTotal = matrixData.hourTotals[hour]
                    return (
                      <tr key={hour} className="group hover:bg-slate-50/50">
                        {/* Linha da Hora */}
                        <td className="py-1 text-xs font-mono font-semibold text-slate-600 whitespace-nowrap">
                          {String(hour).padStart(2, '0')}:00
                        </td>

                        {/* Células por Dia da Semana */}
                        {DAYS.map((d, dIdx) => {
                          const count = matrixData.grid[hour][dIdx]
                          const colorClasses = getCellColor(count, matrixData.maxVal)
                          const pct =
                            matrixData.total > 0
                              ? Math.round((count / matrixData.total) * 1000) / 10
                              : 0

                          return (
                            <td key={d.key} className="p-0.5 text-center">
                              <Tooltip delayDuration={150}>
                                <TooltipTrigger asChild>
                                  <div
                                    className={`h-7 rounded border transition-all flex items-center justify-center text-[11px] cursor-pointer select-none ${colorClasses}`}
                                  >
                                    {count > 0 ? count : ''}
                                  </div>
                                </TooltipTrigger>
                                <TooltipContent side="top" className="text-xs p-2">
                                  <p className="font-bold text-slate-900">
                                    {d.full} às {String(hour).padStart(2, '0')}:00 -{' '}
                                    {String(hour).padStart(2, '0')}:59
                                  </p>
                                  <p className="text-slate-600 text-[11px] mt-0.5">
                                    <span className="font-semibold text-indigo-600">{count}</span>{' '}
                                    atendimento{count !== 1 ? 's' : ''} ({pct}% do total)
                                  </p>
                                </TooltipContent>
                              </Tooltip>
                            </td>
                          )
                        })}

                        {/* Total da Linha (Hora) */}
                        <td className="py-1 text-center text-xs font-mono font-medium text-slate-500">
                          {rowTotal > 0 ? (
                            <span className="px-1.5 py-0.5 rounded bg-slate-100 text-slate-700 text-[10px]">
                              {rowTotal}
                            </span>
                          ) : (
                            <span className="text-slate-300">-</span>
                          )}
                        </td>
                      </tr>
                    )
                  })}
                </tbody>
              </table>
            </div>
          </div>
        )}

        {/* Legenda de Densidade */}
        <div className="flex flex-col sm:flex-row items-start sm:items-center justify-between gap-3 pt-3 border-t border-slate-100 text-xs">
          <div className="flex items-center gap-1.5 text-slate-500 text-[11px]">
            <Info className="h-3.5 w-3.5 shrink-0 text-slate-400" />
            <span>
              Passe o cursor sobre qualquer célula para ver detalhes de volume e percentual.
            </span>
          </div>

          <div className="flex items-center gap-1 text-[11px] text-slate-600">
            <span className="mr-1 font-medium">Densidade:</span>
            <div className="flex items-center gap-1">
              <span className="text-[10px] text-slate-400">0</span>
              <div
                className="w-4 h-4 rounded bg-slate-50 border border-slate-200"
                title="Sem atendimentos"
              />
              <div
                className="w-4 h-4 rounded bg-indigo-50 border border-indigo-100"
                title="1 - 20%"
              />
              <div
                className="w-4 h-4 rounded bg-indigo-100 border border-indigo-200"
                title="21 - 40%"
              />
              <div
                className="w-4 h-4 rounded bg-indigo-300 border border-indigo-400"
                title="41 - 60%"
              />
              <div
                className="w-4 h-4 rounded bg-indigo-500 border border-indigo-600"
                title="61 - 80%"
              />
              <div
                className="w-4 h-4 rounded bg-indigo-700 border border-indigo-800"
                title="81 - 100%"
              />
              <span className="text-[10px] text-slate-400 font-bold">
                Máx ({matrixData.maxVal})
              </span>
            </div>
          </div>
        </div>
      </CardContent>
    </Card>
  )
}
