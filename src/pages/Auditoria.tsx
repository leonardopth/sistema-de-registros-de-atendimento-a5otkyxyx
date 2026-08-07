import { useState, useEffect, useMemo } from 'react'
import { getAuditLogs, getAuditLogActions, getAuditLogEntities } from '@/services/audit-log'
import { getUsers } from '@/services/users'
import type { AuditLogRecord } from '@/types/audit-log'
import type { UserRecord } from '@/types/service_record'
import { useAuth } from '@/hooks/use-auth'
import {
  Table,
  TableBody,
  TableCell,
  TableHead,
  TableHeader,
  TableRow,
} from '@/components/ui/table'
import { Button } from '@/components/ui/button'
import { Input } from '@/components/ui/input'
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from '@/components/ui/select'
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card'
import { Badge } from '@/components/ui/badge'
import { ShieldAlert, RefreshCw, Loader2, User, Filter, X } from 'lucide-react'
import { ExportMenu } from '@/components/ExportMenu'
import {
  downloadAuditLogCSV,
  downloadAuditLogExcel,
  downloadAuditLogPDF,
} from '@/lib/audit-log-export'
import { format } from 'date-fns'
import { ptBR } from 'date-fns/locale'

export default function Auditoria() {
  const { user } = useAuth()
  const [logs, setLogs] = useState<AuditLogRecord[]>([])
  const [users, setUsers] = useState<UserRecord[]>([])
  const [actions, setActions] = useState<string[]>([])
  const [entities, setEntities] = useState<string[]>([])
  const [loading, setLoading] = useState(true)

  const [selectedUser, setSelectedUser] = useState<string>('ALL')
  const [selectedAction, setSelectedAction] = useState<string>('ALL')
  const [selectedEntity, setSelectedEntity] = useState<string>('ALL')
  const [startDate, setStartDate] = useState<string>('')
  const [endDate, setEndDate] = useState<string>('')

  const isMaster = user?.role === 'Master' || user?.master_access === true

  const loadData = async () => {
    setLoading(true)
    try {
      const [logList, userList, actionList, entityList] = await Promise.all([
        getAuditLogs(),
        getUsers(),
        getAuditLogActions(),
        getAuditLogEntities(),
      ])
      setLogs(logList)
      setUsers(userList)
      setActions(actionList)
      setEntities(entityList)
    } catch (err) {
      console.error('Error loading audit logs:', err)
    } finally {
      setLoading(false)
    }
  }

  useEffect(() => {
    loadData()
  }, [])

  const filteredLogs = useMemo(() => {
    return logs.filter((log) => {
      if (selectedUser !== 'ALL' && log.user !== selectedUser) return false
      if (selectedAction !== 'ALL' && log.action !== selectedAction) return false
      if (selectedEntity !== 'ALL' && log.entity !== selectedEntity) return false
      if (startDate && new Date(log.created) < new Date(`${startDate}T00:00:00`)) return false
      if (endDate && new Date(log.created) > new Date(`${endDate}T23:59:59`)) return false
      return true
    })
  }, [logs, selectedUser, selectedAction, selectedEntity, startDate, endDate])

  const userNames = useMemo(() => {
    const m = new Map<string, string>()
    users.forEach((u) => m.set(u.id, u.name))
    return m
  }, [users])

  const handleExportCSV = () => {
    downloadAuditLogCSV(filteredLogs, userNames)
  }
  const handleExportExcel = () => {
    downloadAuditLogExcel(filteredLogs, userNames)
  }
  const handleExportPDF = () => {
    downloadAuditLogPDF(filteredLogs, userNames)
  }

  const clearFilters = () => {
    setSelectedUser('ALL')
    setSelectedAction('ALL')
    setSelectedEntity('ALL')
    setStartDate('')
    setEndDate('')
  }

  if (!isMaster) {
    return (
      <div className="flex flex-col items-center justify-center min-h-[60vh] space-y-4">
        <ShieldAlert className="h-16 w-16 text-amber-500" />
        <h2 className="text-xl font-bold text-slate-800">Acesso Restrito</h2>
        <p className="text-slate-600 text-sm">
          Apenas usuários Master ou com acesso Master têm permissão para visualizar os logs de
          auditoria.
        </p>
      </div>
    )
  }

  return (
    <div className="space-y-6 pb-12">
      <div className="flex items-center justify-between">
        <div>
          <h1 className="text-2xl font-bold text-slate-900 flex items-center gap-2">
            <ShieldAlert className="h-6 w-6 text-indigo-600" /> Audit Log (Logs de Auditoria)
          </h1>
          <p className="text-sm text-slate-500">
            Registro detalhado de ações sensíveis e alterações no sistema.
          </p>
        </div>
        <div className="flex items-center gap-2">
          <ExportMenu
            label="Exportar"
            onCSV={handleExportCSV}
            onExcel={handleExportExcel}
            onPDF={handleExportPDF}
          />
          <Button variant="outline" size="sm" onClick={loadData} disabled={loading}>
            <RefreshCw className={`h-4 w-4 mr-2 ${loading ? 'animate-spin' : ''}`} />
            Atualizar
          </Button>
        </div>
      </div>

      <Card>
        <CardHeader className="py-3 px-4 border-b">
          <CardTitle className="text-sm font-semibold flex items-center gap-2 text-slate-700">
            <Filter className="h-4 w-4" /> Filtros de Pesquisa
          </CardTitle>
        </CardHeader>
        <CardContent className="p-4 space-y-3">
          <div className="grid grid-cols-1 sm:grid-cols-2 md:grid-cols-5 gap-3">
            <div className="space-y-1">
              <label className="text-xs font-medium text-slate-600">Usuário</label>
              <Select value={selectedUser} onValueChange={setSelectedUser}>
                <SelectTrigger className="h-9 text-xs">
                  <SelectValue placeholder="Todos os usuários" />
                </SelectTrigger>
                <SelectContent>
                  <SelectItem value="ALL">Todos os usuários</SelectItem>
                  {users.map((u) => (
                    <SelectItem key={u.id} value={u.id}>
                      {u.name}
                    </SelectItem>
                  ))}
                </SelectContent>
              </Select>
            </div>

            <div className="space-y-1">
              <label className="text-xs font-medium text-slate-600">Ação</label>
              <Select value={selectedAction} onValueChange={setSelectedAction}>
                <SelectTrigger className="h-9 text-xs">
                  <SelectValue placeholder="Todas as ações" />
                </SelectTrigger>
                <SelectContent>
                  <SelectItem value="ALL">Todas as ações</SelectItem>
                  {actions.map((a) => (
                    <SelectItem key={a} value={a}>
                      {a}
                    </SelectItem>
                  ))}
                  {!actions.includes('Created Record') && (
                    <SelectItem value="Created Record">Created Record</SelectItem>
                  )}
                  {!actions.includes('Updated Record') && (
                    <SelectItem value="Updated Record">Updated Record</SelectItem>
                  )}
                  {!actions.includes('Deleted Record') && (
                    <SelectItem value="Deleted Record">Deleted Record</SelectItem>
                  )}
                  {!actions.includes('Granted Share') && (
                    <SelectItem value="Granted Share">Granted Share</SelectItem>
                  )}
                  {!actions.includes('Revoked Share') && (
                    <SelectItem value="Revoked Share">Revoked Share</SelectItem>
                  )}
                </SelectContent>
              </Select>
            </div>

            <div className="space-y-1">
              <label className="text-xs font-medium text-slate-600">Entidade</label>
              <Select value={selectedEntity} onValueChange={setSelectedEntity}>
                <SelectTrigger className="h-9 text-xs">
                  <SelectValue placeholder="Todas as entidades" />
                </SelectTrigger>
                <SelectContent>
                  <SelectItem value="ALL">Todas as entidades</SelectItem>
                  <SelectItem value="service_records">service_records</SelectItem>
                  <SelectItem value="service_record_shares">service_record_shares</SelectItem>
                  <SelectItem value="users">users</SelectItem>
                  {entities
                    .filter(
                      (e) => !['service_records', 'service_record_shares', 'users'].includes(e),
                    )
                    .map((e) => (
                      <SelectItem key={e} value={e}>
                        {e}
                      </SelectItem>
                    ))}
                </SelectContent>
              </Select>
            </div>

            <div className="space-y-1">
              <label className="text-xs font-medium text-slate-600">Data Inicial</label>
              <Input
                type="date"
                value={startDate}
                onChange={(e) => setStartDate(e.target.value)}
                className="h-9 text-xs"
              />
            </div>

            <div className="space-y-1">
              <label className="text-xs font-medium text-slate-600">Data Final</label>
              <Input
                type="date"
                value={endDate}
                onChange={(e) => setEndDate(e.target.value)}
                className="h-9 text-xs"
              />
            </div>
          </div>

          {(selectedUser !== 'ALL' ||
            selectedAction !== 'ALL' ||
            selectedEntity !== 'ALL' ||
            startDate ||
            endDate) && (
            <div className="flex justify-end pt-1">
              <Button
                variant="ghost"
                size="sm"
                onClick={clearFilters}
                className="h-7 text-xs text-red-600 hover:text-red-700 hover:bg-red-50"
              >
                <X className="h-3.5 w-3.5 mr-1" /> Limpar Filtros
              </Button>
            </div>
          )}
        </CardContent>
      </Card>

      <Card>
        <CardContent className="p-0">
          <Table>
            <TableHeader>
              <TableRow className="bg-slate-50">
                <TableHead className="w-[180px]">Data e Hora</TableHead>
                <TableHead>Usuário</TableHead>
                <TableHead>Ação</TableHead>
                <TableHead>Entidade</TableHead>
                <TableHead>ID da Entidade</TableHead>
                <TableHead>Detalhes</TableHead>
              </TableRow>
            </TableHeader>
            <TableBody>
              {loading ? (
                <TableRow>
                  <TableCell colSpan={6} className="text-center py-12">
                    <Loader2 className="h-6 w-6 animate-spin mx-auto text-indigo-600 mb-2" />
                    <span className="text-sm text-slate-500">
                      Carregando histórico de auditoria...
                    </span>
                  </TableCell>
                </TableRow>
              ) : filteredLogs.length === 0 ? (
                <TableRow>
                  <TableCell colSpan={6} className="text-center py-12 text-slate-500">
                    Nenhum log encontrado para os filtros selecionados.
                  </TableCell>
                </TableRow>
              ) : (
                filteredLogs.map((log) => {
                  const userName =
                    log.expand?.user?.name ||
                    users.find((u) => u.id === log.user)?.name ||
                    log.user ||
                    'Sistema'
                  return (
                    <TableRow key={log.id} className="text-xs">
                      <TableCell className="font-mono text-slate-600 whitespace-nowrap">
                        {log.created
                          ? format(new Date(log.created), 'dd/MM/yyyy HH:mm:ss', { locale: ptBR })
                          : '-'}
                      </TableCell>
                      <TableCell className="font-medium text-slate-800">
                        <span className="flex items-center gap-1.5">
                          <User className="h-3.5 w-3.5 text-slate-400" />
                          {userName}
                        </span>
                      </TableCell>
                      <TableCell>
                        <Badge
                          variant="outline"
                          className={
                            log.action.includes('Created') ||
                            log.action.includes('Granted') ||
                            log.action.includes('Approved')
                              ? 'bg-emerald-50 text-emerald-700 border-emerald-200'
                              : log.action.includes('Deleted') ||
                                  log.action.includes('Revoked') ||
                                  log.action.includes('Rejected')
                                ? 'bg-red-50 text-red-700 border-red-200'
                                : 'bg-indigo-50 text-indigo-700 border-indigo-200'
                          }
                        >
                          {log.action}
                        </Badge>
                      </TableCell>
                      <TableCell className="font-mono text-slate-600">{log.entity}</TableCell>
                      <TableCell className="font-mono text-slate-500 text-[11px]">
                        {log.entity_id || '—'}
                      </TableCell>
                      <TableCell className="max-w-xs truncate text-slate-600">
                        {log.details ? (
                          <pre className="text-[10px] bg-slate-50 p-1 rounded border border-slate-100 max-h-16 overflow-y-auto font-mono whitespace-pre-wrap">
                            {JSON.stringify(log.details, null, 2)}
                          </pre>
                        ) : (
                          '—'
                        )}
                      </TableCell>
                    </TableRow>
                  )
                })
              )}
            </TableBody>
          </Table>
        </CardContent>
      </Card>
    </div>
  )
}
