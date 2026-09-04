import React, { useState, useEffect } from 'react'
import { useNavigate } from 'react-router-dom'
import {
  Compass,
  ArrowRight,
  ArrowLeft,
  X,
  CheckCircle2,
  LayoutDashboard,
  PlusCircle,
  Headset,
  Target,
  Trophy,
} from 'lucide-react'
import {
  Dialog,
  DialogContent,
  DialogHeader,
  DialogTitle,
  DialogDescription,
  DialogFooter,
} from '@/components/ui/dialog'
import { Button } from '@/components/ui/button'

interface TourStep {
  title: string
  subtitle: string
  description: string
  icon: React.ElementType
  targetRoute: string
  highlightTip: string
}

const TOUR_STEPS: TourStep[] = [
  {
    title: 'Bem-vindo ao Sistema de Atendimentos!',
    subtitle: 'Visão Geral & Dashboard',
    description:
      'A página inicial traz os indicadores-chave em tempo real: atendimentos do dia, alertas operacionais, fila de backlog, tendências e o mural de conquistas da equipe.',
    icon: LayoutDashboard,
    targetRoute: '/',
    highlightTip:
      'Dica: use os filtros rápidos no topo do Dashboard para alternar entre sua visão e a visão do time.',
  },
  {
    title: 'Novo Atendimento',
    subtitle: 'Registro Detalhado & Canal',
    description:
      'Abra chamados completos vinculando clientes, motivos de contato, tipo de viagem, executivos de contas e gravações de voz ou transcrições.',
    icon: PlusCircle,
    targetRoute: '/novo-atendimento',
    highlightTip:
      'Atalho: pressione Alt + E em qualquer tela para abrir o Registro Expresso em janela flutuante!',
  },
  {
    title: 'Gestão de Atendimentos',
    subtitle: 'Listagem, Edição em Massa e Histórico',
    description:
      'Pesquise, filtre por status, atribua responsáveis, exporte relatórios em Excel/PDF e reabra chamados com controle rigoroso de SLA.',
    icon: Headset,
    targetRoute: '/atendimentos',
    highlightTip:
      'Você pode selecionar vários atendimentos simultaneamente para alterar status ou reatribuir consultor.',
  },
  {
    title: 'Metas de Desempenho',
    subtitle: 'SLA de Primeira Resposta (TFR) e TMA',
    description:
      'Acompanhe o atingimento de metas individuais e coletivas, histórico por período e distribuição de carga de trabalho entre os consultores.',
    icon: Target,
    targetRoute: '/metas-desempenho',
    highlightTip:
      'Gestores podem ajustar metas globais e individuais com sugestões automáticas baseadas no histórico.',
  },
  {
    title: 'Ranking & Gamificação',
    subtitle: 'Níveis, Medalhas e Reconhecimento',
    description:
      'Suba de nível acumulando XP através de atendimentos rápidos, altas notas de CSAT e resolução no primeiro contato. Celebre conquistas com a equipe!',
    icon: Trophy,
    targetRoute: '/ranking',
    highlightTip:
      'No final de cada mês, os três melhores consultores recebem os troféus de ouro, prata e bronze no Pódio.',
  },
]

const STORAGE_KEY = 'user_tour_completed'

export function GuidedTourModal() {
  const [isOpen, setIsOpen] = useState(false)
  const [currentStepIndex, setCurrentStepIndex] = useState(0)
  const navigate = useNavigate()

  useEffect(() => {
    try {
      const completed = localStorage.getItem(STORAGE_KEY)
      if (!completed) {
        // Primeira sessão: aguardar 1 segundo para não interferir no carregamento inicial
        const timer = setTimeout(() => {
          setIsOpen(true)
        }, 1200)
        return () => clearTimeout(timer)
      }
    } catch {
      /* intentionally ignored */
    }
  }, [])

  // Escuta evento personalizado para reabrir o tour via botão na tela ou Ajuda
  useEffect(() => {
    const handleRestart = () => {
      setCurrentStepIndex(0)
      setIsOpen(true)
    }
    window.addEventListener('restart-tour', handleRestart)
    return () => window.removeEventListener('restart-tour', handleRestart)
  }, [])

  const currentStep = TOUR_STEPS[currentStepIndex]
  const isLastStep = currentStepIndex === TOUR_STEPS.length - 1
  const StepIcon = currentStep.icon

  const handleNext = () => {
    if (isLastStep) {
      handleComplete()
    } else {
      const nextIdx = currentStepIndex + 1
      setCurrentStepIndex(nextIdx)
    }
  }

  const handlePrev = () => {
    if (currentStepIndex > 0) {
      setCurrentStepIndex(currentStepIndex - 1)
    }
  }

  const handleComplete = () => {
    try {
      localStorage.setItem(STORAGE_KEY, 'true')
    } catch {
      /* intentionally ignored */
    }
    setIsOpen(false)
  }

  const handleJumpToSection = () => {
    navigate(currentStep.targetRoute)
    handleComplete()
  }

  if (!isOpen) return null

  return (
    <Dialog open={isOpen} onOpenChange={(open) => !open && handleComplete()}>
      <DialogContent className="max-w-lg p-0 overflow-hidden sm:rounded-2xl border-slate-200">
        {/* Banner superior com gradiente */}
        <div className="bg-gradient-to-r from-indigo-600 to-violet-600 p-6 text-white relative">
          <div className="flex items-center justify-between">
            <span className="inline-flex items-center gap-1.5 px-2.5 py-1 rounded-full bg-white/20 backdrop-blur-sm text-xs font-medium text-white">
              <Compass className="h-3.5 w-3.5" />
              Passo {currentStepIndex + 1} de {TOUR_STEPS.length}
            </span>
            <button
              onClick={handleComplete}
              className="text-white/80 hover:text-white transition-colors p-1 rounded-lg hover:bg-white/10"
              title="Pular tour"
            >
              <X className="h-4 w-4" />
            </button>
          </div>

          <div className="mt-4 flex items-center gap-3">
            <div className="h-12 w-12 rounded-xl bg-white/10 backdrop-blur-sm flex items-center justify-center shrink-0 border border-white/20">
              <StepIcon className="h-6 w-6 text-white" />
            </div>
            <div>
              <p className="text-xs uppercase tracking-wider text-indigo-200 font-semibold">
                {currentStep.subtitle}
              </p>
              <DialogTitle className="text-xl font-bold text-white mt-0.5">
                {currentStep.title}
              </DialogTitle>
            </div>
          </div>
        </div>

        {/* Corpo do passo */}
        <div className="p-6 space-y-4">
          <DialogDescription className="text-sm text-slate-600 leading-relaxed">
            {currentStep.description}
          </DialogDescription>

          <div className="p-3 bg-amber-50 rounded-xl border border-amber-200 text-xs text-amber-900 flex items-start gap-2.5">
            <span className="font-bold text-amber-700 shrink-0">💡</span>
            <span>{currentStep.highlightTip}</span>
          </div>

          {/* Indicadores de progresso (bolinhas) */}
          <div className="flex items-center justify-center gap-1.5 pt-2">
            {TOUR_STEPS.map((step, idx) => (
              <button
                key={step.title}
                onClick={() => setCurrentStepIndex(idx)}
                className={`h-2 rounded-full transition-all ${
                  idx === currentStepIndex
                    ? 'w-6 bg-indigo-600'
                    : 'w-2 bg-slate-200 hover:bg-slate-300'
                }`}
                aria-label={`Ir para passo ${idx + 1}`}
              />
            ))}
          </div>
        </div>

        {/* Rodapé de navegação */}
        <DialogFooter className="px-6 py-4 bg-slate-50 border-t border-slate-100 sm:justify-between flex-row items-center gap-2">
          <Button
            variant="ghost"
            size="sm"
            onClick={handleComplete}
            className="text-xs text-slate-500 hover:text-slate-700"
          >
            Pular Tour
          </Button>

          <div className="flex items-center gap-2">
            {currentStepIndex > 0 && (
              <Button
                variant="outline"
                size="sm"
                onClick={handlePrev}
                className="h-8 text-xs gap-1"
              >
                <ArrowLeft className="h-3 w-3" /> Anterior
              </Button>
            )}

            <Button
              size="sm"
              onClick={handleNext}
              className="h-8 text-xs bg-indigo-600 hover:bg-indigo-700 text-white gap-1"
            >
              {isLastStep ? (
                <>
                  <CheckCircle2 className="h-3.5 w-3.5 mr-1" /> Concluir
                </>
              ) : (
                <>
                  Próximo <ArrowRight className="h-3 w-3 ml-1" />
                </>
              )}
            </Button>
          </div>
        </DialogFooter>
      </DialogContent>
    </Dialog>
  )
}
