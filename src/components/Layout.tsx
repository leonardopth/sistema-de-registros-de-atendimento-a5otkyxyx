import { Outlet, Link, useLocation } from 'react-router-dom'
import { useState, useEffect } from 'react'
import { useAuth } from '@/hooks/use-auth'
import { NotificationBell } from '@/components/NotificationBell'
import { FeedbackButton } from '@/components/FeedbackButton'
import { CollaboratorStatusSelector } from '@/components/CollaboratorStatusSelector'
import { Button } from '@/components/ui/button'
import { Sheet, SheetContent, SheetTrigger, SheetTitle } from '@/components/ui/sheet'
import { Avatar, AvatarFallback } from '@/components/ui/avatar'
import { cn } from '@/lib/utils'
import { useKeyboardShortcuts } from '@/hooks/use-keyboard-shortcuts'
import { QuickLog } from '@/components/QuickLog'
import {
  LayoutDashboard,
  Headset,
  ClipboardList,
  Users,
  BarChart3,
  PieChart,
  UserCheck,
  GraduationCap,
  TrendingUp,
  Briefcase,
  DollarSign,
  Target,
  UserCog,
  LogOut,
  Menu,
  Crown,
  ShieldCheck,
  Award,
  SlidersHorizontal,
  Trophy,
  ChevronLeft,
  ChevronRight,
} from 'lucide-react'
import { Tooltip, TooltipContent, TooltipTrigger } from '@/components/ui/tooltip'

const MANAGER_ROLES = ['Gerente', 'Supervisor', 'Líder']

interface NavItem {
  label: string
  to: string
  icon: typeof LayoutDashboard
  visible: (role: string, masterAccess?: boolean) => boolean
}

interface NavGroup {
  id: string
  label: string
  items: NavItem[]
}

const NAV_GROUPS: NavGroup[] = [
  {
    id: 'atendimentos-colaboradores',
    label: 'Atendimentos & Colaboradores',
    items: [
      { label: 'Dashboard', to: '/', icon: LayoutDashboard, visible: () => true },
      { label: 'Novo Atendimento', to: '/novo-atendimento', icon: Headset, visible: () => true },
      { label: 'Atendimentos', to: '/atendimentos', icon: ClipboardList, visible: () => true },
      {
        label: 'Relatório Consultor',
        to: '/relatorio-consultor',
        icon: UserCheck,
        visible: (r) => MANAGER_ROLES.includes(r) || r === 'Master',
      },
      { label: 'Dashboard Geral', to: '/dashboard-geral', icon: PieChart, visible: () => true },
      {
        label: 'Relatório por Grupo',
        to: '/relatorios-grupo',
        icon: BarChart3,
        visible: (r) => MANAGER_ROLES.includes(r),
      },
      {
        label: 'Análise por Motivo',
        to: '/analise-motivos',
        icon: HelpCircle,
        visible: (r) => MANAGER_ROLES.includes(r) || r === 'Master',
      },
      {
        label: 'Comparativo',
        to: '/comparativo',
        icon: BarChart3,
        visible: (r, masterAccess) =>
          MANAGER_ROLES.includes(r) || r === 'Master' || masterAccess === true,
      },
      { label: 'Ranking', to: '/ranking', icon: Trophy, visible: () => true },
      {
        label: 'Metas de Desempenho',
        to: '/metas-desempenho',
        icon: Target,
        visible: (r, masterAccess) =>
          MANAGER_ROLES.includes(r) || r === 'Master' || masterAccess === true,
      },
    ],
  },
  {
    id: 'clientes-treinamento',
    label: 'Clientes & Treinamento',
    items: [
      { label: 'Clientes', to: '/clientes', icon: Users, visible: () => true },
      { label: 'Autonomia', to: '/autonomia', icon: Award, visible: () => true },
      {
        label: 'Executivos',
        to: '/executivos',
        icon: Briefcase,
        visible: (r) => MANAGER_ROLES.includes(r) || r === 'Master',
      },
      {
        label: 'Painel Executivo',
        to: '/painel-executivo',
        icon: DollarSign,
        visible: (r) => r === 'Executivo de Contas',
      },
      {
        label: 'Treinamento',
        to: '/painel-treinamento',
        icon: GraduationCap,
        visible: (r) => MANAGER_ROLES.includes(r) || r === 'Master',
      },
      {
        label: 'Evolução',
        to: '/evolucao-treinamento',
        icon: TrendingUp,
        visible: (r) => MANAGER_ROLES.includes(r) || r === 'Master',
      },
    ],
  },
  {
    id: 'gestao-integracoes',
    label: 'Gestão & Integrações',
    items: [
      {
        label: 'Gestão de Usuários',
        to: '/gestao-usuarios',
        icon: UserCog,
        visible: (r, masterAccess) => r === 'Master' || masterAccess === true,
      },
      {
        label: 'Integrações',
        to: '/integracoes',
        icon: SlidersHorizontal,
        visible: (r, masterAccess) => r === 'Master' || masterAccess === true,
      },
      {
        label: 'Auditoria',
        to: '/auditoria',
        icon: ShieldCheck,
        visible: (r, masterAccess) => r === 'Master' || masterAccess === true,
      },
    ],
  },
]

export default function Layout() {
  const { user, signOut } = useAuth()
  const location = useLocation()
  const [isCollapsed, setIsCollapsed] = useState<boolean>(() => {
    try {
      const saved = localStorage.getItem('sidebar_collapsed')
      return saved === 'true'
    } catch {
      return false
    }
  })
  const [mobileOpen, setMobileOpen] = useState(false)
  const [quickLogOpen, setQuickLogOpen] = useState(false)

  const toggleCollapsed = () => {
    setIsCollapsed((prev) => {
      const next = !prev
      try {
        localStorage.setItem('sidebar_collapsed', String(next))
      } catch {
        /* intentionally ignored */
      }
      return next
    })
  }

  useKeyboardShortcuts([{ key: 'e', altKey: true, handler: () => setQuickLogOpen(true) }])

  useEffect(() => {
    const handler = () => setQuickLogOpen(true)
    window.addEventListener('open-quick-log', handler)
    return () => window.removeEventListener('open-quick-log', handler)
  }, [])

  const visibleGroups = NAV_GROUPS.map((group) => ({
    ...group,
    items: group.items.filter((item) => user && item.visible(user.role, user.master_access)),
  })).filter((group) => group.items.length > 0)

  const initials =
    user?.name
      ?.split(' ')
      .map((n: string) => n[0])
      .slice(0, 2)
      .join('')
      .toUpperCase() || '?'

  const renderNav = (collapsed = false) => (
    <nav className="flex flex-col space-y-4">
      {visibleGroups.map((group, groupIndex) => (
        <div key={group.id} className="flex flex-col">
          {groupIndex > 0 && <div className="border-t border-slate-200 mb-3" />}
          {!collapsed ? (
            <div className="px-3 pb-1.5 text-[10px] font-semibold uppercase tracking-wide text-slate-400">
              {group.label}
            </div>
          ) : (
            <div className="h-1" />
          )}
          <div className="flex flex-col gap-1">
            {group.items.map((item) => {
              const Icon = item.icon
              const isActive = location.pathname === item.to

              const linkNode = (
                <Link
                  key={item.to}
                  to={item.to}
                  onClick={() => setMobileOpen(false)}
                  className={cn(
                    'flex items-center rounded-lg text-sm font-medium transition-colors',
                    collapsed ? 'justify-center p-2.5' : 'gap-3 px-3 py-2',
                    isActive
                      ? 'bg-indigo-600 text-white'
                      : 'text-slate-600 hover:bg-slate-100 hover:text-slate-900',
                  )}
                >
                  <Icon className="h-4 w-4 shrink-0" />
                  {!collapsed && <span className="truncate">{item.label}</span>}
                </Link>
              )

              if (collapsed) {
                return (
                  <Tooltip key={item.to} delayDuration={0}>
                    <TooltipTrigger asChild>{linkNode}</TooltipTrigger>
                    <TooltipContent side="right" className="font-medium text-xs">
                      {item.label}
                    </TooltipContent>
                  </Tooltip>
                )
              }

              return linkNode
            })}
          </div>
        </div>
      ))}
    </nav>
  )

  return (
    <div className="flex min-h-screen bg-slate-50">
      <aside
        className={cn(
          'hidden md:flex shrink-0 flex-col border-r border-slate-200 bg-white select-none transition-all duration-300 relative',
          isCollapsed ? 'w-18' : 'w-64',
        )}
      >
        <div
          className={cn(
            'flex h-16 items-center border-b border-slate-200 shrink-0',
            isCollapsed ? 'justify-center px-2' : 'justify-between px-4',
          )}
        >
          <div className="flex items-center gap-2 overflow-hidden">
            <Headset className="h-6 w-6 text-indigo-600 shrink-0" />
            {!isCollapsed && (
              <span className="text-sm font-bold text-slate-900 truncate">
                Sistema de Atendimentos
              </span>
            )}
          </div>
          <Button
            variant="ghost"
            size="icon"
            onClick={toggleCollapsed}
            className={cn('h-8 w-8 text-slate-500 hover:text-slate-900', isCollapsed && 'hidden')}
            title="Recolher menu"
          >
            <ChevronLeft className="h-4 w-4" />
          </Button>
        </div>

        {/* Floating toggle button when collapsed */}
        {isCollapsed && (
          <div className="flex justify-center py-2 border-b border-slate-100">
            <Button
              variant="ghost"
              size="icon"
              onClick={toggleCollapsed}
              className="h-7 w-7 text-slate-500 hover:text-slate-900"
              title="Expandir menu"
            >
              <ChevronRight className="h-4 w-4" />
            </Button>
          </div>
        )}

        <div className="flex-1 overflow-y-auto p-3 [scrollbar-gutter:stable]">
          {renderNav(isCollapsed)}
        </div>

        <div className="border-t border-slate-200 p-3 space-y-2 shrink-0">
          {!isCollapsed ? (
            <>
              <div className="flex items-center gap-2">
                <Avatar className="h-8 w-8">
                  <AvatarFallback className="text-xs bg-indigo-100 text-indigo-700">
                    {initials}
                  </AvatarFallback>
                </Avatar>
                <div className="flex-1 min-w-0">
                  <p className="text-xs font-semibold text-slate-900 truncate">{user?.name}</p>
                  <div className="flex items-center gap-1">
                    <p className="text-[10px] text-slate-500 truncate">{user?.role}</p>
                    {user?.master_access && user?.role !== 'Master' && (
                      <span className="inline-flex items-center gap-0.5 rounded bg-amber-100 px-1 text-[9px] font-bold text-amber-700 shrink-0">
                        <Crown className="h-2.5 w-2.5" /> Master
                      </span>
                    )}
                  </div>
                </div>
              </div>
              <Button variant="outline" size="sm" className="w-full" onClick={signOut}>
                <LogOut className="h-3.5 w-3.5 mr-2" />
                Sair
              </Button>
            </>
          ) : (
            <div className="flex flex-col items-center gap-2">
              <Tooltip delayDuration={0}>
                <TooltipTrigger asChild>
                  <Avatar className="h-8 w-8 cursor-pointer">
                    <AvatarFallback className="text-xs bg-indigo-100 text-indigo-700">
                      {initials}
                    </AvatarFallback>
                  </Avatar>
                </TooltipTrigger>
                <TooltipContent side="right" className="text-xs">
                  <p className="font-semibold">{user?.name}</p>
                  <p className="text-slate-400">{user?.role}</p>
                </TooltipContent>
              </Tooltip>

              <Tooltip delayDuration={0}>
                <TooltipTrigger asChild>
                  <Button
                    variant="ghost"
                    size="icon"
                    className="h-8 w-8 text-slate-600 hover:text-red-600"
                    onClick={signOut}
                  >
                    <LogOut className="h-4 w-4" />
                  </Button>
                </TooltipTrigger>
                <TooltipContent side="right" className="text-xs">
                  Sair
                </TooltipContent>
              </Tooltip>
            </div>
          )}
        </div>
      </aside>

      <div className="flex-1 flex flex-col">
        <header className="flex h-16 items-center justify-between border-b border-slate-200 bg-white px-4 md:px-6">
          <Sheet open={mobileOpen} onOpenChange={setMobileOpen}>
            <SheetTrigger asChild>
              <Button variant="ghost" size="icon" className="md:hidden">
                <Menu className="h-5 w-5" />
              </Button>
            </SheetTrigger>
            <SheetContent side="left" className="w-64 p-0">
              <SheetTitle className="sr-only">Navegação</SheetTitle>
              <div className="flex h-16 items-center gap-2 border-b border-slate-200 px-6">
                <Headset className="h-6 w-6 text-indigo-600" />
                <span className="text-sm font-bold text-slate-900">Sistema de Atendimentos</span>
              </div>
              <div className="p-3">{renderNav(false)}</div>
            </SheetContent>
          </Sheet>

          <div className="flex items-center gap-2 ml-auto">
            <CollaboratorStatusSelector />
            <FeedbackButton />
            <NotificationBell />
          </div>
        </header>

        <main className="flex-1 overflow-y-auto p-4 md:p-6">
          <Outlet />
        </main>
      </div>
      <QuickLog open={quickLogOpen} onOpenChange={setQuickLogOpen} />
    </div>
  )
}
