import { Card, CardContent, CardHeader, CardTitle, CardDescription } from '@/components/ui/card'
import { Badge } from '@/components/ui/badge'
import { Button } from '@/components/ui/button'
import {
  Building2,
  CheckCircle2,
  Clock,
  ExternalLink,
  Layers,
  Lock,
  RefreshCw,
  Users2,
  Workflow,
} from 'lucide-react'
import { UserRecord } from '@/types/service_record'

interface LgIntegrationCardProps {
  users: UserRecord[]
}

export function LgIntegrationCard({ users }: LgIntegrationCardProps) {
  const usersWithExternalId = users.filter((u) => Boolean((u as any).external_id)).length

  return (
    <div className="space-y-6 min-w-0 w-full">
      <Card className="border-slate-200 shadow-sm min-w-0 w-full">
        <CardHeader className="pb-3 border-b border-slate-100">
          <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-3">
            <div className="flex items-center gap-3">
              <div className="p-2.5 rounded-xl bg-gradient-to-br from-indigo-500 to-indigo-700 text-white shadow-sm shrink-0">
                <Building2 className="h-6 w-6" />
              </div>
              <div className="min-w-0">
                <div className="flex flex-wrap items-center gap-2">
                  <CardTitle className="text-base font-bold text-slate-900">
                    Integração com RH LG Lugar de Gente
                  </CardTitle>
                  <Badge
                    variant="outline"
                    className="border-amber-400 text-amber-700 bg-amber-50 text-[10px] gap-1 font-semibold shrink-0"
                  >
                    <Clock className="h-3 w-3" /> Em Breve / Estrutura Pronta
                  </Badge>
                </div>
                <CardDescription className="text-xs mt-0.5">
                  Conector preparado para sincronização bidirecional de ponto, saldo de banco de
                  horas, solicitações de férias e atestados médicos via API LG (Lugar de Gente).
                </CardDescription>
              </div>
            </div>

            <Button
              variant="outline"
              size="sm"
              disabled
              className="text-xs h-8 gap-1.5 opacity-60 shrink-0"
            >
              <RefreshCw className="h-3.5 w-3.5" />
              Sincronizar Manualmente
            </Button>
          </div>
        </CardHeader>

        <CardContent className="pt-5 space-y-6">
          {/* Status do Modelo de Dados */}
          <div className="grid grid-cols-1 md:grid-cols-3 gap-3">
            <div className="p-3.5 rounded-lg border border-slate-200 bg-slate-50/50">
              <div className="flex items-center gap-2 text-indigo-700">
                <Users2 className="h-4 w-4" />
                <span className="text-xs font-bold">Usuários &amp; Hierarquia</span>
              </div>
              <p className="text-xs text-slate-600 mt-1">
                Aproveitamento total dos usuários e papéis existentes (Consultor, Líder, Supervisor,
                Gerente, Gestor Comercial e Master).
              </p>
              <div className="mt-2 text-[11px] font-semibold text-emerald-700 flex items-center gap-1">
                <CheckCircle2 className="h-3.5 w-3.5" /> {users.length} usuários mapeados
              </div>
            </div>

            <div className="p-3.5 rounded-lg border border-slate-200 bg-slate-50/50">
              <div className="flex items-center gap-2 text-indigo-700">
                <Workflow className="h-4 w-4" />
                <span className="text-xs font-bold">Campos de Vínculo Externo</span>
              </div>
              <p className="text-xs text-slate-600 mt-1">
                Coleções <code>users</code>, <code>hour_bank_entries</code> e <code>absences</code>{' '}
                com campos <code>external_id</code> e <code>source: "lg_sync"</code>.
              </p>
              <div className="mt-2 text-[11px] font-semibold text-emerald-700 flex items-center gap-1">
                <CheckCircle2 className="h-3.5 w-3.5" /> Modelo de dados compatível
              </div>
            </div>

            <div className="p-3.5 rounded-lg border border-slate-200 bg-slate-50/50">
              <div className="flex items-center gap-2 text-indigo-700">
                <Layers className="h-4 w-4" />
                <span className="text-xs font-bold">Regras e Políticas</span>
              </div>
              <p className="text-xs text-slate-600 mt-1">
                Gestores sem banco de horas, validação de interjornada (11h), descanso semanal (DSR)
                e períodos aquisitivos de férias.
              </p>
              <div className="mt-2 text-[11px] font-semibold text-emerald-700 flex items-center gap-1">
                <CheckCircle2 className="h-3.5 w-3.5" /> Regras ativas
              </div>
            </div>
          </div>

          {/* Área de Configuração Preparada (Desabilitada / Em Breve) */}
          <div className="rounded-lg border border-slate-200 p-4 bg-slate-50/70 space-y-3">
            <div className="flex items-center justify-between">
              <div>
                <h4 className="text-xs font-bold text-slate-800 flex items-center gap-1.5">
                  <Lock className="h-3.5 w-3.5 text-slate-500" /> Parâmetros de Conexão da API LG
                  (Lugar de Gente)
                </h4>
                <p className="text-[11px] text-slate-500 mt-0.5">
                  Quando as credenciais corporativas do LG forem liberadas pela equipe de RH/TI, a
                  sincronização automática via webhook/REST será habilitada nesta seção.
                </p>
              </div>
              <Badge variant="outline" className="text-[10px] text-slate-500">
                Aguardando Credenciais de RH
              </Badge>
            </div>

            <div className="grid grid-cols-1 md:grid-cols-2 gap-3 pt-2 opacity-60 pointer-events-none">
              <div>
                <label className="text-[11px] font-semibold text-slate-600">Endpoint Base LG</label>
                <input
                  type="text"
                  disabled
                  value="https://api.lugar-de-gente.com.br/v1/attendance"
                  className="w-full mt-1 px-3 py-1.5 text-xs bg-white border border-slate-200 rounded"
                />
              </div>
              <div>
                <label className="text-[11px] font-semibold text-slate-600">
                  Token de Autenticação / Client ID
                </label>
                <input
                  type="password"
                  disabled
                  value="••••••••••••••••••••••••••••••••"
                  className="w-full mt-1 px-3 py-1.5 text-xs bg-white border border-slate-200 rounded"
                />
              </div>
            </div>
          </div>
        </CardContent>
      </Card>
    </div>
  )
}
