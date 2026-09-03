import { useState, useEffect, useMemo } from 'react'
import { Card, CardContent } from '@/components/ui/card'
import { Badge } from '@/components/ui/badge'
import { getServiceRecords } from '@/services/service_records'
import { getClients } from '@/services/clients'
import { getAccountExecutives } from '@/services/account_executives'
import { ClientRecord, ServiceRecord, AccountExecutiveRecord } from '@/types/service_record'
import { useRealtime } from '@/hooks/use-realtime'
import { useAuth } from '@/hooks/use-auth'
import { Building2, Headset, AlertTriangle, ShieldAlert, FileText, Send } from 'lucide-react'
import { Button } from '@/components/ui/button'
import { exportExecutivePanelCSV } from '@/lib/executive-panel-export'
import { ExecutiveMonthlyReportModal } from '@/components/ExecutiveMonthlyReportModal'

const AVOIDABLE_RATE_THRESHOLD = 30
const AVOIDABLE_REASONS = ['Disponível no RF', 'Fora do Escopo', 'Erro RF', 'Outros']

export default function PainelExecutivo() {
  const { user } = useAuth()
  const [clients, setClients] = useState<ClientRecord[]>([])
  const [records, setRecords] = useState<ServiceRecord[]>([])
  const [executive, setExecutive] = useState<AccountExecutiveRecord | null>(null)
  const [executiveModalOpen, setExecutiveModalOpen] = useState(false)

  const loadData = async () => {
    try {
      const [execs, allClients, allRecords] = await Promise.all([
        getAccountExecutives(),
        getClients(),
        getServiceRecords(),
      ])
      if (user?.role === 'Master') {
        setExecutive(null)
        setClients(allClients)
      } else if (user?.role === 'Gestor Comercial') {
        setExecutive(null)
        const userBases = (user?.bases as string[] | undefined) || []
        const baseExecIds = execs
          .filter((e) => {
            const execBases = (e.bases as string[] | undefined) || []
            return execBases.some((b) => userBases.includes(b))
          })
          .map((e) => e.id)
        setClients(
          allClients.filter(
            (c) => c.account_executive_rel && baseExecIds.includes(c.account_executive_rel),
          ),
        )
      } else {
        const exec = execs.find((e) => e.email === user?.email || e.name === user?.name) || null
        setExecutive(exec)
        if (exec) {
          setClients(
            allClients.filter(
              (c) => c.account_executive_rel === exec.id || c.account_executive === exec.name,
            ),
          )
        } else {
          setClients([])
        }
      }
      setRecords(allRecords)
    } catch (err) {
      console.error(err)
    }
  }

  useEffect(() => {
    loadData()
  }, [])
  useRealtime('service_records', () => loadData())
  useRealtime('clients', () => loadData())

  const clientStats = useMemo(() => {
    const now = new Date()
    const monthStr = now.toISOString().substring(0, 7)
    return clients.map((client) => {
      const clientRecords = records.filter(
        (r) =>
          r.expand?.client?.id === client.id ||
          r.client === client.id ||
          r.client_company === client.company,
      )
      const total = clientRecords.length
      const avoidable = clientRecords.filter((r) => r.avoidable_contact).length
      const rate = total > 0 ? Math.round((avoidable / total) * 100) : 0
      const reasonBreakdown: Record<string, number> = {}
      AVOIDABLE_REASONS.forEach((r) => (reasonBreakdown[r] = 0))
      clientRecords.forEach((r) => {
        if (r.avoidable_contact && r.avoidable_contact_reason) {
          const reason = r.avoidable_contact_reason as string
          if (reasonBreakdown[reason] !== undefined) reasonBreakdown[reason]++
        }
      })
      const monthRecords = clientRecords.filter((r) => r.created && r.created.startsWith(monthStr))
      const monthAvoidable = monthRecords.filter((r) => r.avoidable_contact).length
      const monthRate =
        monthRecords.length > 0 ? Math.round((monthAvoidable / monthRecords.length) * 100) : 0
      return { client, total, avoidable, rate, reasonBreakdown, monthRate }
    })
  }, [clients, records])

  const handleExportCSV = () => {
    exportExecutivePanelCSV(clientStats)
  }

  if (!executive && user?.role !== 'Master' && user?.role !== 'Gestor Comercial') {
    return (
      <div className="space-y-6">
        <h2 className="text-2xl font-extrabold tracking-tight text-slate-900">
          Painel do Executivo
        </h2>
        <Card className="p-8 text-center">
          <p className="text-sm text-slate-500">
            Seu usuário não está vinculado a um perfil de Executivo de Contas.
          </p>
        </Card>
      </div>
    )
  }

  return (
    <div className="space-y-6">
      <div className="flex flex-col sm:flex-row sm:items-center sm:justify-between gap-4">
        <div>
          <h2 className="text-2xl font-extrabold tracking-tight text-slate-900">
            Painel do Executivo
          </h2>
          <p className="text-xs text-slate-500">
            {executive
              ? `Visão geral das agências gerenciadas por ${executive.name}`
              : 'Visão geral de todas as agências'}
          </p>
        </div>
        <div className="flex items-center gap-2">
          <Button
            onClick={() => setExecutiveModalOpen(true)}
            variant="outline"
            size="sm"
            className="text-xs border-indigo-200 text-indigo-700 bg-indigo-50/50 hover:bg-indigo-100 font-semibold"
          >
            <Send className="h-3.5 w-3.5 mr-1.5 text-indigo-600" /> Relatório Executivo Mensal
          </Button>
          <Button onClick={handleExportCSV} variant="outline" size="sm" className="text-xs">
            <FileText className="h-3.5 w-3.5 mr-1.5" /> Exportar
          </Button>
        </div>
      </div>
      {clientStats.length === 0 ? (
        <Card className="p-8 text-center">
          <p className="text-sm text-slate-400">Nenhuma agência vinculada a este executivo.</p>
        </Card>
      ) : (
        <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
          {clientStats.map(({ client, total, avoidable, rate, reasonBreakdown, monthRate }) => (
            <Card key={client.id} className="border-slate-200 shadow-subtle">
              <CardContent className="p-4 space-y-3">
                <div className="flex items-center justify-between">
                  <div className="flex items-center gap-2">
                    <div className="h-8 w-8 rounded-lg bg-indigo-50 text-indigo-700 flex items-center justify-center">
                      <Building2 className="h-4 w-4" />
                    </div>
                    <div>
                      <h4 className="text-sm font-bold text-slate-900">
                        {client.company || client.name}
                      </h4>
                      {monthRate > AVOIDABLE_RATE_THRESHOLD && (
                        <Badge variant="destructive" className="text-[10px] mt-0.5 gap-1">
                          <ShieldAlert className="h-3 w-3" /> Alerta de tendência
                        </Badge>
                      )}
                    </div>
                  </div>
                  <Badge variant="secondary" className="text-xs gap-1">
                    <Headset className="h-3 w-3" /> {total}
                  </Badge>
                </div>
                <div className="grid grid-cols-3 gap-2 text-center">
                  <div className="rounded-lg bg-slate-50 p-2">
                    <p className="text-[10px] font-bold text-slate-500 uppercase">Total</p>
                    <p className="text-lg font-black text-slate-900">{total}</p>
                  </div>
                  <div className="rounded-lg bg-amber-50 p-2">
                    <p className="text-[10px] font-bold text-amber-700 uppercase">Evitáveis</p>
                    <p className="text-lg font-black text-slate-900">{avoidable}</p>
                  </div>
                  <div className="rounded-lg bg-rose-50 p-2">
                    <p className="text-[10px] font-bold text-rose-700 uppercase">Taxa</p>
                    <p className="text-lg font-black text-slate-900">{rate}%</p>
                  </div>
                </div>
                <div className="space-y-1">
                  <p className="text-[10px] font-bold text-slate-500 uppercase">Por Motivo</p>
                  <div className="flex flex-wrap gap-1">
                    {AVOIDABLE_REASONS.map((r) => (
                      <span
                        key={r}
                        className="text-[10px] px-2 py-0.5 rounded bg-slate-100 text-slate-700"
                      >
                        {r}: {reasonBreakdown[r] || 0}
                      </span>
                    ))}
                  </div>
                </div>
                <div className="flex items-center gap-1 text-[11px] text-slate-500 pt-1 border-t">
                  <AlertTriangle className="h-3 w-3" />
                  Taxa mensal de evitáveis: <strong className="text-slate-700">{monthRate}%</strong>
                </div>
              </CardContent>
            </Card>
          ))}
        </div>
      )}

      <ExecutiveMonthlyReportModal open={executiveModalOpen} onOpenChange={setExecutiveModalOpen} />
    </div>
  )
}
