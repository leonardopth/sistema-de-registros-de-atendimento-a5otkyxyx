import React, { useState } from 'react'
import {
  HelpCircle,
  Clock,
  CheckCircle2,
  AlertTriangle,
  Award,
  Zap,
  Target,
  Smile,
  FileText,
  Keyboard,
  Compass,
  ChevronDown,
  Search,
  BookOpen,
} from 'lucide-react'
import { Card, CardHeader, CardTitle, CardContent } from '@/components/ui/card'
import { Input } from '@/components/ui/input'
import { Button } from '@/components/ui/button'
import { Badge } from '@/components/ui/badge'

interface GlossaryItem {
  term: string
  sigla: string
  category: 'Metas e SLA' | 'Qualidade e Autonomia' | 'Gamificação'
  shortDesc: string
  calculation: string
  details: string
}

const GLOSSARY_ITEMS: GlossaryItem[] = [
  {
    term: 'Tempo Médio de Atendimento',
    sigla: 'TMA',
    category: 'Metas e SLA',
    shortDesc: 'Duração média gasta em cada atendimento (em minutos).',
    calculation:
      'Soma do tempo (minutos) de todos os atendimentos dividida pelo total de atendimentos realizados.',
    details:
      'Serve para monitorar o ritmo operacional da equipe e garantir que os contatos não fiquem estagnados além do esperado para cada categoria de suporte.',
  },
  {
    term: 'Tempo de Primeira Resposta',
    sigla: 'TFR',
    category: 'Metas e SLA',
    shortDesc:
      'Tempo transcorrido desde a criação da solicitação até a primeira intervenção do consultor.',
    calculation:
      'Diferença em minutos entre a chegada do contato e o primeiro retorno registrado pelo agente.',
    details:
      'Fator crítico para a percepção de agilidade do cliente. No painel de metas, a meta padrão gira em torno de 15 minutos.',
  },
  {
    term: 'Contato Evitável',
    sigla: 'Contato Evitável',
    category: 'Qualidade e Autonomia',
    shortDesc:
      'Atendimento que poderia ter sido evitado caso houvesse treinamento do cliente, estabilidade ou direcionamento correto.',
    calculation:
      'Classificação manual ou assistida por IA durante o encerramento do chamado, marcando motivo evitável (ex.: Dúvida Operacional Básica, Reenvio de Boleto).',
    details:
      'Identificar contatos evitáveis ajuda na estruturação de treinamentos para clientes com baixa autonomia, desafogando o suporte.',
  },
  {
    term: 'Autonomia do Cliente',
    sigla: 'Autonomia',
    category: 'Qualidade e Autonomia',
    shortDesc:
      'Índice de independência de uma empresa contratante em relação ao suporte da equipe.',
    calculation:
      'Baseia-se no volume de atendimentos abertos pelo cliente vs. complexidade e motivos evitáveis ao longo dos últimos 30 a 90 dias.',
    details:
      'Clientes com baixa autonomia são candidatos prioritários para sessões de reciclagem e treinamento no módulo Treinamentos.',
  },
  {
    term: 'Taxa de Resolução no Primeiro Contato',
    sigla: 'FCR / Resolução',
    category: 'Metas e SLA',
    shortDesc:
      'Percentual de atendimentos solucionados sem necessidade de reabertura ou múltiplos contatos.',
    calculation:
      '(Atendimentos resolvidos sem reabertura / Total de atendimentos concluídos) × 100%.',
    details:
      'Mede a eficácia e profundidade técnica da assistência prestada na primeira oportunidade.',
  },
  {
    term: 'Taxa de Reabertura',
    sigla: 'Reabertura',
    category: 'Qualidade e Autonomia',
    shortDesc:
      'Percentual de chamados marcados como Concluídos que foram posteriormente reabertos por insatisfação ou reincidência.',
    calculation: '(Atendimentos que passaram pelo status Reaberto / Total de atendimentos) × 100%.',
    details:
      'Taxas altas de reabertura indicam encerramentos prematuros ou falta de alinhamento com o usuário final.',
  },
  {
    term: 'Customer Satisfaction Score',
    sigla: 'CSAT',
    category: 'Qualidade e Autonomia',
    shortDesc:
      'Métrica de satisfação do cliente avaliada via nota de 1 a 5 ou estrelas após o término do suporte.',
    calculation:
      '(Soma das notas recebidas / (Total de avaliações × 5)) × 100%, ou média simples de 1 a 5.',
    details:
      'Os links públicos de avaliação são gerados automaticamente para compartilhamento via WhatsApp ou e-mail.',
  },
  {
    term: 'Pontos de Experiência e Conquistas',
    sigla: 'XP & Badges',
    category: 'Gamificação',
    shortDesc:
      'Pontuação atribuída ao consultor por produtividade, rapidez de resposta e resolutividade.',
    calculation:
      'Pontos acumulados por atendimentos concluídos (+10 XP), TFR abaixo da meta (+15 XP), CSAT 5 estrelas (+25 XP), liberando níveis e medalhas.',
    details:
      'Acompanhe no Ranking mensal e no componente de Progresso individual para competir pelos prêmios do mês.',
  },
]

export default function Ajuda() {
  const [searchTerm, setSearchTerm] = useState('')
  const [selectedCategory, setSelectedCategory] = useState<string>('Todos')

  const filteredGlossary = GLOSSARY_ITEMS.filter((item) => {
    const matchesCategory = selectedCategory === 'Todos' || item.category === selectedCategory
    const q = searchTerm.toLowerCase()
    const matchesSearch =
      item.term.toLowerCase().includes(q) ||
      item.sigla.toLowerCase().includes(q) ||
      item.shortDesc.toLowerCase().includes(q) ||
      item.calculation.toLowerCase().includes(q)
    return matchesCategory && matchesSearch
  })

  const restartTour = () => {
    localStorage.removeItem('user_tour_completed')
    window.dispatchEvent(new CustomEvent('restart-tour'))
  }

  return (
    <div className="space-y-6 max-w-6xl mx-auto pb-12">
      {/* Header */}
      <div className="flex flex-col md:flex-row md:items-center justify-between gap-4 border-b border-slate-200 pb-5">
        <div>
          <div className="flex items-center gap-2">
            <BookOpen className="h-6 w-6 text-indigo-600" />
            <h1 className="text-2xl font-bold tracking-tight text-slate-900">Central de Ajuda</h1>
          </div>
          <p className="text-sm text-slate-500 mt-1">
            Glossário completo de métricas, guias rápidos operacionais e atalhos do sistema.
          </p>
        </div>
        <Button
          onClick={restartTour}
          variant="outline"
          className="border-indigo-200 text-indigo-700 hover:bg-indigo-50 flex items-center gap-2 self-start md:self-auto"
        >
          <Compass className="h-4 w-4" />
          Reiniciar Tour Guiado
        </Button>
      </div>

      {/* Seções Práticas: Como fazer */}
      <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
        <Card className="border-slate-200 shadow-sm hover:border-indigo-200 transition-colors">
          <CardHeader className="pb-3">
            <CardTitle className="text-base flex items-center gap-2 text-slate-900">
              <FileText className="h-4 w-4 text-indigo-600" />
              Como registrar um atendimento
            </CardTitle>
          </CardHeader>
          <CardContent className="text-sm text-slate-600 space-y-2">
            <p>
              1. Acesse o menu lateral <strong>Novo Atendimento</strong> ou clique no botão rápido
              no topo da página inicial.
            </p>
            <p>
              2. Digite ou selecione o <strong>Cliente</strong> (o sistema autocompleta razão
              social, CNPJ e executivo de contas responsável).
            </p>
            <p>
              3. Informe o canal (WhatsApp, Telefone, E-mail, Portal), o motivo do contato e a
              descrição do ocorrido.
            </p>
            <p>
              4. Caso resolvido de imediato, selecione o status <strong>Concluído</strong>, informe
              a duração e clique em <strong>Salvar</strong>.
            </p>
          </CardContent>
        </Card>

        <Card className="border-slate-200 shadow-sm hover:border-indigo-200 transition-colors">
          <CardHeader className="pb-3">
            <CardTitle className="text-base flex items-center gap-2 text-slate-900">
              <Keyboard className="h-4 w-4 text-emerald-600" />
              Registro Expresso (Atalho Alt + E)
            </CardTitle>
          </CardHeader>
          <CardContent className="text-sm text-slate-600 space-y-2">
            <p>
              Em qualquer tela do sistema, pressione simultaneamente as teclas{' '}
              <kbd className="px-1.5 py-0.5 bg-slate-100 border border-slate-300 rounded text-xs font-mono">
                Alt
              </kbd>{' '}
              +{' '}
              <kbd className="px-1.5 py-0.5 bg-slate-100 border border-slate-300 rounded text-xs font-mono">
                E
              </kbd>
              .
            </p>
            <p>
              Uma janela flutuante e ultrarrápida será exibida para você registrar um atendimento em
              menos de 10 segundos sem perder a página de contexto atual.
            </p>
            <p>
              Ideal para atendimentos telefônicos curtos e dúvidas rápidas em paralelo a outras
              tarefas.
            </p>
          </CardContent>
        </Card>

        <Card className="border-slate-200 shadow-sm hover:border-indigo-200 transition-colors">
          <CardHeader className="pb-3">
            <CardTitle className="text-base flex items-center gap-2 text-slate-900">
              <Target className="h-4 w-4 text-amber-600" />
              Onde vejo minhas metas
            </CardTitle>
          </CardHeader>
          <CardContent className="text-sm text-slate-600 space-y-2">
            <p>
              Seus objetivos individuais (TMA, TFR, Volume e Resolução) ficam visíveis no menu{' '}
              <strong>Metas de Desempenho</strong>.
            </p>
            <p>
              Na própria página inicial (Dashboard), o widget <strong>Meu Progresso</strong> resume
              seu progresso do mês atual e o percentual de atingimento das metas individuais.
            </p>
            <p>
              Gestores podem ajustar parâmetros no painel superior clicando em{' '}
              <em>Configurar Metas Globais / do Consultor</em>.
            </p>
          </CardContent>
        </Card>

        <Card className="border-slate-200 shadow-sm hover:border-indigo-200 transition-colors">
          <CardHeader className="pb-3">
            <CardTitle className="text-base flex items-center gap-2 text-slate-900">
              <Award className="h-4 w-4 text-purple-600" />
              Como reagir e celebrar conquistas
            </CardTitle>
          </CardHeader>
          <CardContent className="text-sm text-slate-600 space-y-2">
            <p>
              No topo da página inicial, o <strong>Mural Social de Conquistas</strong> mostra quando
              colegas sobem de nível ou desbloqueiam medalhas raras.
            </p>
            <p>
              Você pode clicar nos emojis (👏, 🔥, 🎉, 🚀) para parabenizar seus colegas em tempo
              real.
            </p>
            <p>
              No menu <strong>Ranking</strong>, você confere o pódio mensal de pontuação, o ranking
              geral e a vitrine de medalhas ativas.
            </p>
          </CardContent>
        </Card>
      </div>

      {/* Glossário Interativo */}
      <Card className="border-slate-200 shadow-sm mt-8">
        <CardHeader>
          <div className="flex flex-col md:flex-row md:items-center justify-between gap-4">
            <div>
              <CardTitle className="text-lg flex items-center gap-2 text-slate-900">
                <HelpCircle className="h-5 w-5 text-indigo-600" />
                Glossário de Termos e Fórmulas de Cálculo
              </CardTitle>
              <p className="text-xs text-slate-500 mt-1">
                Entenda o que cada métrica representa e a fórmula exata usada pelo motor de cálculo
                do sistema.
              </p>
            </div>
            {/* Filtros por categoria */}
            <div className="flex flex-wrap items-center gap-1.5">
              {['Todos', 'Metas e SLA', 'Qualidade e Autonomia', 'Gamificação'].map((cat) => (
                <Button
                  key={cat}
                  variant={selectedCategory === cat ? 'default' : 'outline'}
                  size="sm"
                  onClick={() => setSelectedCategory(cat)}
                  className="h-7 text-xs"
                >
                  {cat}
                </Button>
              ))}
            </div>
          </div>
          <div className="mt-4 relative">
            <Search className="h-4 w-4 absolute left-3 top-2.5 text-slate-400" />
            <Input
              placeholder="Buscar termo, sigla ou conceito (ex: TFR, CSAT, Evitável)..."
              value={searchTerm}
              onChange={(e) => setSearchTerm(e.target.value)}
              className="pl-9 bg-slate-50 border-slate-200 text-sm"
            />
          </div>
        </CardHeader>
        <CardContent>
          <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
            {filteredGlossary.map((item) => (
              <div
                key={item.sigla}
                className="p-4 rounded-xl border border-slate-200 bg-white hover:border-indigo-300 hover:shadow-sm transition-all flex flex-col justify-between"
              >
                <div>
                  <div className="flex items-center justify-between gap-2 mb-1.5">
                    <span className="font-bold text-slate-900 text-base">{item.term}</span>
                    <Badge
                      variant="secondary"
                      className="font-mono text-xs bg-indigo-50 text-indigo-700"
                    >
                      {item.sigla}
                    </Badge>
                  </div>
                  <Badge variant="outline" className="text-[10px] text-slate-500 mb-2">
                    {item.category}
                  </Badge>
                  <p className="text-xs text-slate-600 mb-3">{item.shortDesc}</p>
                  <div className="p-2.5 rounded-lg bg-slate-50 border border-slate-100 text-xs text-slate-700 mb-2">
                    <span className="font-semibold text-slate-900 block mb-1">
                      Como é calculado no sistema:
                    </span>
                    <code className="text-[11px] font-sans text-indigo-900 block">
                      {item.calculation}
                    </code>
                  </div>
                </div>
                <p className="text-[11px] text-slate-400 mt-2 border-t border-slate-100 pt-2">
                  {item.details}
                </p>
              </div>
            ))}
            {filteredGlossary.length === 0 && (
              <div className="col-span-2 text-center py-8 text-slate-400 text-sm">
                Nenhum termo encontrado para &quot;{searchTerm}&quot;.
              </div>
            )}
          </div>
        </CardContent>
      </Card>
    </div>
  )
}
