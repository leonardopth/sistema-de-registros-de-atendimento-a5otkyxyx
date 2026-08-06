import { useState, useEffect } from 'react'
import { Card } from '@/components/ui/card'
import { Badge } from '@/components/ui/badge'
import { Button } from '@/components/ui/button'
import {
  Table,
  TableHeader,
  TableBody,
  TableRow,
  TableHead,
  TableCell,
} from '@/components/ui/table'
import { Loader2, Stethoscope, AlertCircle, CheckCircle2, Mail } from 'lucide-react'
import pb from '@/lib/pocketbase/client'

const TEST_EMAILS = [
  'teste1@rexturadvance.com.br',
  'teste2@rexturadvance.com.br',
  'teste3@rexturadvance.com.br',
]

interface DiagnosticUser {
  id: string
  name: string
  email: string
  role: string
  isTestUser: boolean
  emailPresent: boolean
  emailPopulated: boolean
}

export default function DiagnosticoEmail() {
  const [users, setUsers] = useState<DiagnosticUser[]>([])
  const [rawJson, setRawJson] = useState('')
  const [loading, setLoading] = useState(true)
  const [showRaw, setShowRaw] = useState(false)

  useEffect(() => {
    const loadData = async () => {
      setLoading(true)
      try {
        const sdkData = await pb.collection('users').getFullList({ sort: 'name' })
        const raw = await pb.send('/api/collections/users/records?perPage=500', { method: 'GET' })
        setRawJson(JSON.stringify(raw, null, 2))

        const rawItems = raw.items || []
        const rawMap: Record<string, any> = {}
        for (const item of rawItems) {
          rawMap[item.id] = item
        }

        const mapped: DiagnosticUser[] = sdkData.map((u: any) => {
          const rawItem = rawMap[u.id] || {}
          const hasEmailKey = 'email' in rawItem
          const emailVal = u.email || ''
          return {
            id: u.id,
            name: u.name || '(sem nome)',
            email: emailVal,
            role: u.role || '(sem role)',
            isTestUser: TEST_EMAILS.includes(emailVal),
            emailPresent: hasEmailKey,
            emailPopulated: !!emailVal && emailVal.trim() !== '',
          }
        })
        setUsers(mapped)
      } catch (e) {
        console.error(e)
      } finally {
        setLoading(false)
      }
    }
    loadData()
  }, [])

  const testUsers = users.filter((u) => u.isTestUser)
  const existingUsers = users.filter((u) => !u.isTestUser)
  const testWithEmail = testUsers.filter((u) => u.emailPopulated)
  const existingWithEmail = existingUsers.filter((u) => u.emailPopulated)
  const allEmailPresent = users.every((u) => u.emailPresent)

  let rootCause = ''
  let fixAction = ''
  let causeType: 'backfill' | 'config' | 'resolved' = 'resolved'

  if (
    testWithEmail.length === testUsers.length &&
    existingWithEmail.length < existingUsers.length
  ) {
    rootCause =
      'Falha no backfill de e-mails existentes. Usuários de teste têm e-mail, mas usuários existentes não.'
    fixAction = 'Re-executar migration de backfill idempotente para preencher e-mails faltantes.'
    causeType = 'backfill'
  } else if (testWithEmail.length < testUsers.length || !allEmailPresent) {
    rootCause =
      'Configuração do banco (emailVisibility) ou hooks de privacidade bloqueando o campo email.'
    fixAction =
      'Confirmar que emailVisibility=true está persistido e que os hooks de privacidade estão desativados.'
    causeType = 'config'
  } else {
    rootCause =
      'Todos os usuários possuem e-mail visível. O problema foi resolvido com as correções aplicadas.'
    fixAction =
      'Reativar os hooks de privacidade com a política correta: apenas Master vê todos os e-mails.'
    causeType = 'resolved'
  }

  if (loading) {
    return (
      <div className="flex justify-center py-12">
        <Loader2 className="h-6 w-6 animate-spin text-slate-400" />
      </div>
    )
  }

  return (
    <div className="space-y-6">
      <div>
        <h2 className="text-2xl font-extrabold tracking-tight text-slate-900 flex items-center gap-2">
          <Stethoscope className="h-6 w-6 text-indigo-600" />
          Diagnóstico de E-mail
        </h2>
        <p className="text-xs text-slate-500 mt-1">
          Investigação da causa raiz para e-mails não exibidos na Gestão de Usuários
        </p>
      </div>

      <div className="grid grid-cols-2 sm:grid-cols-4 gap-3">
        <Card className="p-3 border-slate-200">
          <p className="text-xs text-slate-500">Total de Usuários</p>
          <p className="text-xl font-bold text-slate-900">{users.length}</p>
        </Card>
        <Card className="p-3 border-slate-200">
          <p className="text-xs text-slate-500">Com E-mail</p>
          <p className="text-xl font-bold text-emerald-600">
            {users.filter((u) => u.emailPopulated).length}
          </p>
        </Card>
        <Card className="p-3 border-slate-200">
          <p className="text-xs text-slate-500">Sem E-mail</p>
          <p className="text-xl font-bold text-rose-500">
            {users.filter((u) => !u.emailPopulated).length}
          </p>
        </Card>
        <Card className="p-3 border-slate-200">
          <p className="text-xs text-slate-500">Campo Presente (API)</p>
          <p className="text-xl font-bold text-slate-900">{allEmailPresent ? 'Sim' : 'Não'}</p>
        </Card>
      </div>

      <Card
        className={`p-4 border-l-4 ${
          causeType === 'backfill'
            ? 'border-l-amber-400'
            : causeType === 'config'
              ? 'border-l-rose-400'
              : 'border-l-emerald-400'
        }`}
      >
        <div className="flex items-start gap-3">
          {causeType === 'resolved' ? (
            <CheckCircle2 className="h-5 w-5 text-emerald-600 shrink-0 mt-0.5" />
          ) : (
            <AlertCircle className="h-5 w-5 text-amber-600 shrink-0 mt-0.5" />
          )}
          <div className="space-y-1">
            <p className="text-sm font-bold text-slate-900">Causa Raiz Identificada</p>
            <p className="text-xs text-slate-700">{rootCause}</p>
            <p className="text-xs text-slate-500">
              <strong>Ação corretiva:</strong> {fixAction}
            </p>
            <p className="text-xs text-slate-400 mt-2">
              Teste: {testWithEmail.length}/{testUsers.length} com e-mail · Existentes:{' '}
              {existingWithEmail.length}/{existingUsers.length} com e-mail
            </p>
          </div>
        </div>
      </Card>

      <Card className="p-4 border-slate-200 shadow-subtle">
        <div className="overflow-x-auto">
          <Table>
            <TableHeader>
              <TableRow className="bg-slate-50">
                <TableHead className="text-xs font-bold">Nome</TableHead>
                <TableHead className="text-xs font-bold">E-mail</TableHead>
                <TableHead className="text-xs font-bold">Role</TableHead>
                <TableHead className="text-xs font-bold">Tipo</TableHead>
                <TableHead className="text-xs font-bold">Status</TableHead>
              </TableRow>
            </TableHeader>
            <TableBody>
              {users.map((u) => (
                <TableRow key={u.id} className="hover:bg-slate-50">
                  <TableCell className="text-xs font-semibold text-slate-900">{u.name}</TableCell>
                  <TableCell className="text-xs text-slate-600">
                    {u.emailPopulated ? (
                      <span className="flex items-center gap-1">
                        <Mail className="h-3 w-3 text-slate-400 shrink-0" />
                        {u.email}
                      </span>
                    ) : (
                      <span className="text-slate-400">—</span>
                    )}
                  </TableCell>
                  <TableCell className="text-xs text-slate-600">{u.role}</TableCell>
                  <TableCell>
                    {u.isTestUser ? (
                      <Badge className="bg-indigo-100 text-indigo-700 hover:bg-indigo-100">
                        Teste
                      </Badge>
                    ) : (
                      <Badge variant="secondary">Existente</Badge>
                    )}
                  </TableCell>
                  <TableCell>
                    {u.emailPopulated ? (
                      <Badge className="bg-emerald-100 text-emerald-700 hover:bg-emerald-100">
                        OK
                      </Badge>
                    ) : u.emailPresent ? (
                      <Badge className="bg-rose-100 text-rose-700 hover:bg-rose-100">Vazio</Badge>
                    ) : (
                      <Badge className="bg-amber-100 text-amber-700 hover:bg-amber-100">
                        Ausente
                      </Badge>
                    )}
                  </TableCell>
                </TableRow>
              ))}
            </TableBody>
          </Table>
        </div>
      </Card>

      <div>
        <Button variant="outline" size="sm" onClick={() => setShowRaw(!showRaw)}>
          {showRaw ? 'Ocultar' : 'Mostrar'} JSON bruto da API
        </Button>
        {showRaw && (
          <pre className="mt-3 p-4 bg-slate-900 text-slate-100 text-xs rounded-lg overflow-x-auto max-h-96">
            {rawJson}
          </pre>
        )}
      </div>
    </div>
  )
}
