import { useState, useMemo } from 'react'
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card'
import { Button } from '@/components/ui/button'
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from '@/components/ui/select'
import { ServiceRecord } from '@/types/service_record'
import { generateTrainingPlan } from '@/services/training-plan'
import { useToast } from '@/hooks/use-toast'
import { GraduationCap, Loader2, FileText } from 'lucide-react'

interface TrainingPanelProps {
  records: ServiceRecord[]
}

export function TrainingPanel({ records }: TrainingPanelProps) {
  const { toast } = useToast()
  const [selectedCompany, setSelectedCompany] = useState('')
  const [plan, setPlan] = useState('')
  const [loading, setLoading] = useState(false)

  const companies = useMemo(() => {
    const set = new Set<string>()
    for (const r of records) {
      if (r.client_company) set.add(r.client_company)
      if (r.expand?.client?.company) set.add(r.expand.client.company)
    }
    return Array.from(set).sort()
  }, [records])

  const companyStats = useMemo(() => {
    if (!selectedCompany) return null
    const recs = records.filter(
      (r) => r.client_company === selectedCompany || r.expand?.client?.company === selectedCompany,
    )
    const reasonCount: Record<string, number> = {}
    for (const r of recs) reasonCount[r.contact_reason] = (reasonCount[r.contact_reason] || 0) + 1
    const topReasons = Object.entries(reasonCount)
      .sort(([, a], [, b]) => b - a)
      .slice(0, 5)
      .map(([reason, count]) => ({ reason, count }))
    const avoidable = recs.filter((r) => r.avoidable_contact).length
    const rate = recs.length > 0 ? Math.round((avoidable / recs.length) * 100) : 0
    return { total: recs.length, topReasons, avoidableRate: rate }
  }, [selectedCompany, records])

  const handleGeneratePlan = async () => {
    if (!selectedCompany || !companyStats) return
    setLoading(true)
    setPlan('')
    try {
      const result = await generateTrainingPlan({
        company: selectedCompany,
        totalRecords: companyStats.total,
        topReasons: companyStats.topReasons,
        avoidableRate: companyStats.avoidableRate,
      })
      setPlan(result.plan)
      toast({ title: 'Plano de treinamento gerado!' })
    } catch {
      toast({ variant: 'destructive', title: 'Erro ao gerar plano' })
    } finally {
      setLoading(false)
    }
  }

  return (
    <Card className="border-slate-200 shadow-subtle">
      <CardHeader className="pb-3">
        <CardTitle className="text-sm font-bold text-slate-900 flex items-center gap-2">
          <GraduationCap className="h-4 w-4 text-indigo-600" /> Painel de Treinamento
        </CardTitle>
      </CardHeader>
      <CardContent className="space-y-3">
        <Select
          value={selectedCompany}
          onValueChange={(v) => {
            setSelectedCompany(v)
            setPlan('')
          }}
        >
          <SelectTrigger className="h-9 text-xs">
            <SelectValue placeholder="Selecione uma agência..." />
          </SelectTrigger>
          <SelectContent>
            {companies.map((c) => (
              <SelectItem key={c} value={c}>
                {c}
              </SelectItem>
            ))}
          </SelectContent>
        </Select>
        {companyStats && (
          <div className="space-y-2">
            <div className="grid grid-cols-2 gap-2">
              <div className="rounded-lg bg-slate-50 p-2 text-center">
                <p className="text-[10px] font-bold text-slate-500 uppercase">Total</p>
                <p className="text-lg font-black text-slate-900">{companyStats.total}</p>
              </div>
              <div className="rounded-lg bg-amber-50 p-2 text-center">
                <p className="text-[10px] font-bold text-amber-700 uppercase">Evitáveis</p>
                <p className="text-lg font-black text-slate-900">{companyStats.avoidableRate}%</p>
              </div>
            </div>
            <div className="space-y-1">
              <p className="text-[10px] font-bold text-slate-500 uppercase">Top 5 Motivos</p>
              {companyStats.topReasons.map((r) => (
                <div key={r.reason} className="flex items-center justify-between text-xs">
                  <span className="text-slate-700">{r.reason}</span>
                  <span className="font-bold text-slate-900">{r.count}</span>
                </div>
              ))}
            </div>
            <Button
              onClick={handleGeneratePlan}
              disabled={loading}
              size="sm"
              className="w-full bg-indigo-600 hover:bg-indigo-700 text-xs font-bold"
            >
              {loading ? (
                <Loader2 className="h-3.5 w-3.5 animate-spin mr-1.5" />
              ) : (
                <FileText className="h-3.5 w-3.5 mr-1.5" />
              )}
              Gerar Plano com IA
            </Button>
          </div>
        )}
        {plan && (
          <div className="p-3 bg-indigo-50 border border-indigo-100 rounded-lg">
            <p className="text-[10px] font-bold text-indigo-700 uppercase mb-1">
              Plano de Treinamento
            </p>
            <p className="text-xs text-slate-700 whitespace-pre-wrap">{plan}</p>
          </div>
        )}
      </CardContent>
    </Card>
  )
}
