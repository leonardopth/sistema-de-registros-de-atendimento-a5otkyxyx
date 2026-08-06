import { useState, useEffect, useCallback } from 'react'
import {
  getAuditLogs,
  getAuditLogActions,
  getAuditLogEntities,
  type AuditLogFilter,
} from '@/services/audit-log'
import { getUsers } from '@/services/users'
import { useRealtime } from '@/hooks/use-realtime'
import type { AuditLogRecord } from '@/types/audit-log'
import type { UserRecord } from '@/types/service_record'
import { Card } from '@/components/ui/card'
import { Input } from '@/components/ui/input'
import { Label } from '@/components/ui/label'
import { Button } from '@/components/ui/button'
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from '@/components/ui/select'
import { ScrollArea } from '@/components/ui/scroll-area'
import { Badge } from '@/components/ui/badge'
import { ShieldCheck, Search, Loader2, X } from 'lucide-react'
import { format } from 'date-fns'
import { ptBR } from 'date-fns/locale'

export default function Auditoria() {
  const [records, setRecords] = useState<AuditLogRecord[]>([])
  const [users, setUsers] = useState<UserRecord[]>([])
  const [actions, setActions] = useState<string[]>([])
  const [entities, setEntities] = useState<string[]>([])
  const [loading, setLoading] = useState(true)
  const [filter, setFilter] = useState<AuditLogFilter>({})

  const loadData = useCallback(async () => {
    try {
      const result = await getAuditLogs(filter, 1, 100)
      setRecords(result.items as AuditLogRecord[])
    } catch {
      setRecords([])
    } finally {
      setLoading(false)
    }
  }, [filter])

  useEffect(() => {
    getUsers()
      .then(setUsers)
      .catch(() => {})
    getAuditLogActions()
      .then(setActions)
      .catch(() => {})
    getAuditLogEntities()
      .then(setEntities)
      .catch(() => {})
  }, [])

  useEffect(() => {
    setLoading(true)
    loadData()
  }, [loadData])

  useRealtime('audit_log', () => loadData())

  const hasFilters = Object.values(filter).some((v) => v)

  return (
    <div className="space-y-4">
      <div className="flex items-center gap-2">
        <ShieldCheck className="h-6 w-6 text-indigo-600" />
        <h1 className="text-xl font-bold text-slate-900">Auditoria do Sistema</h1>
      </div>

      <Card className="p-4 space-y-3">
        <div className="grid grid-cols-1 md:grid-cols-4 gap-3">
          <div className="space-y-1">
            <Label className="text-xs">Usuário</Label>
            <Select
              value={filter.user || 'all'}
              onValueChange={(v) => setFilter({ ...filter, user: v === 'all' ? undefined : v })}
            >
              <SelectTrigger className="h-8 text-xs">
                <SelectValue placeholder="Todos" />
              </SelectTrigger>
              <SelectContent>
                <SelectItem value="all">Todos</SelectItem>
                {users.map((u) => (
                  <SelectItem key={u.id} value={u.id}>
                    {u.name}
                  </SelectItem>
                ))}
              </SelectContent>
            </Select>
          </div>
          <div className="space-y-1">
            <Label className="text-xs">Ação</Label>
            <Select
              value={filter.action || 'all'}
              onValueChange={(v) => setFilter({ ...filter, action: v === 'all' ? undefined : v })}
            >
              <SelectTrigger className="h-8 text-xs">
                <SelectValue placeholder="Todas" />
              </SelectTrigger>
              <SelectContent>
                <SelectItem value="all">Todas</SelectItem>
                {actions.map((a) => (
                  <SelectItem key={a} value={a}>
                    {a}
                  </SelectItem>
                ))}
              </SelectContent>
            </Select>
          </div>
          <div className="space-y-1">
            <Label className="text-xs">Entidade</Label>
            <Select
              value={filter.entity || 'all'}
              onValueChange={(v) => setFilter({ ...filter, entity: v === 'all' ? undefined : v })}
            >
              <SelectTrigger className="h-8 text-xs">
                <SelectValue placeholder="Todas" />
              </SelectTrigger>
              <SelectContent>
                <SelectItem value="all">Todas</SelectItem>
                {entities.map((e) => (
                  <SelectItem key={e} value={e}>
                    {e}
                  </SelectItem>
                ))}
              </SelectContent>
            </Select>
          </div>
          <div className="space-y-1">
            <Label className="text-xs">Data Inicial</Label>
            <Input
              type="date"
              className="h-8 text-xs"
              value={filter.startDate || ''}
              onChange={(e) =>
                setFilter({
                  ...filter,
                  startDate: e.target.value ? new Date(e.target.value).toISOString() : undefined,
                })
              }
            />
          </div>
        </div>
        {hasFilters && (
          <Button variant="ghost" size="sm" className="text-xs" onClick={() => setFilter({})}>
            <X className="h-3 w-3 mr-1" /> Limpar filtros
          </Button>
        )}
      </Card>

      <Card className="p-0">
        <ScrollArea className="h-[calc(100vh-320px)]">
          {loading ? (
            <div className="flex justify-center py-8">
              <Loader2 className="h-6 w-6 animate-spin text-indigo-600" />
            </div>
          ) : records.length === 0 ? (
            <div className="flex flex-col items-center py-8 text-slate-400">
              <Search className="h-8 w-8 mb-2 opacity-30" />
              <p className="text-sm">Nenhum registro encontrado.</p>
            </div>
          ) : (
            <div className="divide-y">
              {records.map((r) => (
                <div key={r.id} className="p-3 hover:bg-slate-50 flex items-start gap-3">
                  <div className="flex-1 min-w-0">
                    <div className="flex items-center gap-2 flex-wrap">
                      <Badge variant="secondary" className="text-xs">
                        {r.action}
                      </Badge>
                      <span className="text-xs text-slate-500">{r.entity}</span>
                      {r.entity_id && (
                        <span className="text-[10px] text-slate-400 font-mono">
                          {r.entity_id.slice(0, 8)}
                        </span>
                      )}
                    </div>
                    <p className="text-xs text-slate-600 mt-1">
                      <span className="font-medium">{r.expand?.user?.name || 'Sistema'}</span>
                      {typeof r.details === 'string'
                        ? (() => {
                            try {
                              const d = JSON.parse(r.details)
                              return d.client_name ? ` — ${d.client_name}` : ''
                            } catch {
                              return ''
                            }
                          })()
                        : ''}
                    </p>
                  </div>
                  <span className="text-[10px] text-slate-400 whitespace-nowrap">
                    {format(new Date(r.created), "dd/MM/yyyy 'às' HH:mm", { locale: ptBR })}
                  </span>
                </div>
              ))}
            </div>
          )}
        </ScrollArea>
      </Card>
    </div>
  )
}
