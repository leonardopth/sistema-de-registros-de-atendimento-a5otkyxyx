import { BrowserRouter, Routes, Route, Navigate } from 'react-router-dom'
import { Toaster } from '@/components/ui/toaster'
import { Toaster as Sonner } from '@/components/ui/sonner'
import { TooltipProvider } from '@/components/ui/tooltip'
import { AuthProvider } from '@/hooks/use-auth'
import { ProtectedRoute } from '@/components/ProtectedRoute'
import { MasterRoute } from '@/components/MasterRoute'
import { GestaoUsuariosRoute } from '@/components/GestaoUsuariosRoute'
import { ExecutivoRoute } from '@/components/ExecutivoRoute'
import { ManagerRoute } from '@/components/ManagerRoute'
import { ErrorBoundary } from '@/components/ErrorBoundary'
import Layout from '@/components/Layout'
import Index from '@/pages/Index'
import NovoAtendimento from '@/pages/NovoAtendimento'
import Atendimentos from '@/pages/Atendimentos'
import Clientes from '@/pages/Clientes'
import Autonomia from '@/pages/Autonomia'
import ExecutivosContas from '@/pages/ExecutivosContas'
import GestaoUsuarios from '@/pages/GestaoUsuarios'
import DiagnosticoEmail from '@/pages/DiagnosticoEmail'
import Integracoes from '@/pages/Integracoes'
import CentralRelatorios from '@/pages/CentralRelatorios'
import RelatorioEvitaveis from '@/pages/RelatorioEvitaveis'
import PublicCsat from '@/pages/PublicCsat'
import Ranking from '@/pages/Ranking'
import PainelExecutivo from '@/pages/PainelExecutivo'
import RelatoriosGrupo from '@/pages/RelatoriosGrupo'
import DashboardGeral from '@/pages/DashboardGeral'
import PainelTreinamento from '@/pages/PainelTreinamento'
import EvolucaoPosTreinamento from '@/pages/EvolucaoPosTreinamento'
import RelatorioConsultor from '@/pages/RelatorioConsultor'
import ComparativoAgentes from '@/pages/ComparativoAgentes'
import RelatorioMotivos from '@/pages/RelatorioMotivos'
import FilaAtendimentos from '@/pages/FilaAtendimentos'
import Auditoria from '@/pages/Auditoria'
import MetasDesempenho from '@/pages/MetasDesempenho'
import Login from '@/pages/Login'
import NotFound from '@/pages/NotFound'

const App = () => (
  <BrowserRouter>
    <AuthProvider>
      <TooltipProvider>
        <Toaster />
        <Sonner />
        <ErrorBoundary>
          <Routes>
            <Route path="/login" element={<Login />} />
            <Route path="/csat/:token" element={<PublicCsat />} />
            <Route
              element={
                <ProtectedRoute>
                  <Layout />
                </ProtectedRoute>
              }
            >
              {' '}
              <Route path="/" element={<Index />} />
              <Route path="/novo-atendimento" element={<NovoAtendimento />} />
              <Route path="/atendimentos" element={<Atendimentos />} />
              <Route path="/fila-atendimentos" element={<FilaAtendimentos />} />
              <Route path="/central-relatorios" element={<CentralRelatorios />} />
              <Route
                path="/relatorio-evitaveis"
                element={
                  <ManagerRoute>
                    <RelatorioEvitaveis />
                  </ManagerRoute>
                }
              />
              <Route path="/clientes" element={<Clientes />} />
              <Route path="/autonomia" element={<Autonomia />} />
              <Route
                path="/relatorios-grupo"
                element={
                  <ManagerRoute>
                    <RelatoriosGrupo />
                  </ManagerRoute>
                }
              />
              <Route path="/painel-treinamento" element={<PainelTreinamento />} />
              <Route path="/evolucao-treinamento" element={<EvolucaoPosTreinamento />} />
              <Route path="/relatorio-consultor" element={<RelatorioConsultor />} />
              <Route path="/ranking" element={<Ranking />} />
              <Route path="/dashboard-geral" element={<DashboardGeral />} />
              <Route
                path="/analise-motivos"
                element={
                  <ManagerRoute>
                    <RelatorioMotivos />
                  </ManagerRoute>
                }
              />
              <Route
                path="/comparativo"
                element={
                  <ManagerRoute>
                    <ComparativoAgentes />
                  </ManagerRoute>
                }
              />
              <Route path="/metas-desempenho" element={<MetasDesempenho />} />
              <Route path="/executivos" element={<ExecutivosContas />} />
              <Route
                path="/painel-executivo"
                element={
                  <ExecutivoRoute>
                    <PainelExecutivo />
                  </ExecutivoRoute>
                }
              />
              <Route
                path="/gestao-usuarios"
                element={
                  <GestaoUsuariosRoute>
                    <GestaoUsuarios />
                  </GestaoUsuariosRoute>
                }
              />
              <Route
                path="/integracoes"
                element={
                  <MasterRoute>
                    <Integracoes />
                  </MasterRoute>
                }
              />
              <Route
                path="/auditoria"
                element={
                  <GestaoUsuariosRoute>
                    <Auditoria />
                  </GestaoUsuariosRoute>
                }
              />
              <Route
                path="/diagnostico-email"
                element={
                  <MasterRoute>
                    <DiagnosticoEmail />
                  </MasterRoute>
                }
              />
            </Route>
            <Route path="*" element={<NotFound />} />
          </Routes>
        </ErrorBoundary>
      </TooltipProvider>
    </AuthProvider>
  </BrowserRouter>
)

export default App
