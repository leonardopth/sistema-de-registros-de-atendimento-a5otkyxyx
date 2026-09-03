import { useState, useEffect, useMemo } from 'react'
import { Card, CardHeader, CardTitle, CardContent } from '@/components/ui/card'
import { Button } from '@/components/ui/button'
import { Layers, RefreshCw, ArrowLeft, ShieldAlert } from 'lucide-react'
import { useNavigate } from 'react-router-dom'
import { getServiceRecords } from '@/services/service_records'
import { ServiceRecord } from '@/types/service_record'
import { useAuth } from '@/hooks/use-auth'
import { useRealtime } from '@/hooks/use-realtime'
import { filterRecordsByUserAccess } from '@/lib/service-group-access'
import { ActiveBacklogQueue } from '@/components/ActiveBacklogQueue'

export default function FilaAtendimentos() {
  const { user } = useAuth()
  const navigate = useNavigate()
  const [records, setRecords] = useState<ServiceRecord[]>([])
  const [loading, setLoading] = useState(true)

  const loadData = async () => {
    try {
      setLoading(true)
      // Buscar registros que não estão Concluídos, ordenados por updated/created
      const data = await getServiceRecords('-created', "status != 'Concluído'")
      setRecords(data)
    } catch (err) {
      console.error('Erro ao carregar fila de atendimentos:', err)
    } finally {
      setLoading(false)
    }
  }

  useEffect(() => {
    loadData()
  }, [])

  useRealtime('service_records', () => {
    loadData()
  })

  // Respeita RBAC existente
  const accessibleRecords = useMemo(() => {
    return filterRecordsByUserAccess(records, user)
  }, [records, user])

  return (
    <div className="space-y-6">
      <div className="flex flex-col sm:flex-row sm:items-center sm:justify-between gap-4">
        <div>
          <div className="flex items-center gap-2">
            <Button
              variant="ghost"
              size="sm"
              onClick={() => navigate('/atendimentos')}
              className="h-8 px-2 text-slate-500 hover:text-slate-900"
            >
              <ArrowLeft className="h-4 w-4 mr-1" /> Voltar
            </Button>
            <h2 className="text-2xl font-extrabold tracking-tight text-slate-900 flex items-center gap-2">
              <Layers className="h-6 w-6 text-indigo-600" /> Fila & Backlog Ativo
            </h2>
          </div>
          <p className="text-xs text-slate-500 mt-1">
            Gestão de tempo parado (aging) de todos os atendimentos em aberto
          </p>
        </div>

        <div className="flex items-center gap-2">
          <Button
            variant="outline"
            size="sm"
            onClick={loadData}
            disabled={loading}
            className="text-xs gap-1.5"
          >
            <RefreshCw className={`h-3.5 w-3.5 ${loading ? 'animate-spin' : ''}`} />
            Atualizar Fila
          </Button>
        </div>
      </div>

      <ActiveBacklogQueue records={accessibleRecords} isWidget={false} onUpdateRecord={loadData} />
    </div>
  )
}
