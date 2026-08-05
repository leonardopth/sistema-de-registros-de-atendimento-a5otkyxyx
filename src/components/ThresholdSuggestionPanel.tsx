import { useState, useMemo } from 'react'
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card'
import { Button } from '@/components/ui/button'
import { Badge } from '@/components/ui/badge'
import { ServiceRecord, ClientRecord } from '@/types/service_record'
import { calculateThresholdSuggestions } from '@/lib/threshold-suggestion'
import { updateClient } from '@/services/clients'
import { toast } from '@/hooks/use-toast'
import { Brain, Loader2, Check, ArrowRight } from 'lucide-react'

interface Props {
  records: ServiceRecord[]
  clients: ClientRecord[]
}

export function ThresholdSuggestionPanel({ records, clients }: Props) {
  const suggestions = useMemo(
    () => calculateThresholdSuggestions(records, clients),
    [records, clients],
  )
  const [applying, setApplying] = useState<string | null>(null)
  const [applied, setApplied] = useState<Set<string>>(new Set())

  const handleApply = async (clientId: string, threshold: number) => {
    setApplying(clientId)
    try {
      await updateClient(clientId, { avoidable_contact_threshold: threshold })
      setApplied((prev) => new Set(prev).add(clientId))
      toast({ title: 'Limite atualizado!' })
    } catch {
      toast({ title: 'Erro ao atualizar', variant: 'destructive' })
    } finally {
      setApplying(null)
    }
  }

  if (suggestions.length === 0) return null

  return (
    <Card className="border-slate-200 shadow-subtle">
      <CardHeader className="pb-3">
        <CardTitle className="text-sm font-bold text-slate-900 flex items-center gap-2">
          <Brain className="h-4 w-4 text-indigo-600" /> Sugestão de Limite de Evitáveis
        </CardTitle>
      </CardHeader>
      <CardContent className="space-y-2">
        {suggestions.slice(0, 6).map((s) => (
          <div
            key={s.clientId}
            className="flex items-center justify-between p-2.5 rounded-lg bg-slate-50"
          >
            <div className="flex items-center gap-2 min-w-0">
              <span className="text-xs font-semibold text-slate-800 truncate">{s.clientName}</span>
              <Badge variant="secondary" className="text-[10px]">
                {s.serviceGroup}
              </Badge>
            </div>
            <div className="flex items-center gap-2 shrink-0">
              <span className="text-xs text-slate-500">{s.currentThreshold}</span>
              <ArrowRight className="h-3 w-3 text-slate-400" />
              <span className="text-xs font-bold text-indigo-600">{s.suggestedThreshold}</span>
              {applied.has(s.clientId) ? (
                <Badge className="text-[10px] bg-emerald-100 text-emerald-700">
                  <Check className="h-3 w-3 mr-0.5" />
                  Aplicado
                </Badge>
              ) : (
                <Button
                  size="sm"
                  variant="outline"
                  className="h-6 text-[10px] px-2"
                  disabled={applying === s.clientId}
                  onClick={() => handleApply(s.clientId, s.suggestedThreshold)}
                >
                  {applying === s.clientId ? (
                    <Loader2 className="h-3 w-3 animate-spin" />
                  ) : (
                    'Aplicar'
                  )}
                </Button>
              )}
            </div>
          </div>
        ))}
      </CardContent>
    </Card>
  )
}
