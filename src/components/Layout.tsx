import { useState } from 'react'
import { Link, Outlet, useLocation, useNavigate } from 'react-router-dom'
import { useAuth } from '@/hooks/use-auth'
import { Button } from '@/components/ui/button'
import { Input } from '@/components/ui/input'
import { Avatar, AvatarFallback } from '@/components/ui/avatar'
import { Sheet, SheetContent, SheetTrigger } from '@/components/ui/sheet'
import {
  DropdownMenu,
  DropdownMenuContent,
  DropdownMenuItem,
  DropdownMenuLabel,
  DropdownMenuSeparator,
  DropdownMenuTrigger,
} from '@/components/ui/dropdown-menu'
import {
  LayoutDashboard,
  PlusCircle,
  Headset,
  Users,
  Search,
  LogOut,
  Menu,
  ChevronLeft,
  ChevronRight,
  ShieldCheck,
  UserCog,
  UserCheck,
  TrendingUp,
  BarChart3,
  PieChart,
} from 'lucide-react'
import { cn } from '@/lib/utils'
import { NotificationBell } from '@/components/NotificationBell'
import logoImg from '../assets/image-b4a05.png'
import { QuickLog } from '@/components/QuickLog'
import { ConsultantAIWidget } from '@/components/ConsultantAIWidget'
import { useKeyboardShortcuts } from '@/hooks/use-keyboard-shortcuts'

export function Layout() {
  const { user, signOut } = useAuth()
  const location = useLocation()
  const navigate = useNavigate()
  const [collapsed, setCollapsed] = useState(false)
  const [searchTerm, setSearchTerm] = useState('')
  const [mobileOpen, setMobileOpen] = useState(false)
  const [quickLogOpen, setQuickLogOpen] = useState(false)

  useKeyboardShortcuts([{ key: 'n', ctrlKey: true, handler: () => setQuickLogOpen(true) }])

  const navItems = [
    { label: 'Dashboard', path: '/', icon: LayoutDashboard },
    { label: 'Novo Atendimento', path: '/novo-atendimento', icon: PlusCircle },
    { label: 'Atendimentos', path: '/atendimentos', icon: Headset },
    { label: 'Clientes', path: '/clientes', icon: Users },
    { label: 'Executivos de Contas', path: '/executivos', icon: UserCog },
  ]

  if (user?.role !== 'Consultores') {
    navItems.push({ label: 'Relatórios por Grupo', path: '/relatorios-grupo', icon: BarChart3 })
  }

  if (['Master', 'Gerentes', 'Supervisores', 'Líderes'].includes(user?.role)) {
    navItems.push({ label: 'Dashboard Geral', path: '/dashboard-geral', icon: PieChart })
  }

  if (user?.role === 'Master') {
    navItems.push({ label: 'Gestão de Usuários', path: '/gestao-usuarios', icon: UserCheck })
  }

  if (user?.role === 'Executivo de contas') {
    navItems.push({ label: 'Painel Executivo', path: '/painel-executivo', icon: TrendingUp })
  }

  const handleSearch = (e: React.FormEvent) => {
    e.preventDefault()
    if (searchTerm.trim()) {
      navigate(`/atendimentos?search=${encodeURIComponent(searchTerm.trim())}`)
    }
  }

  const getInitials = (name?: string) => {
    if (!name) return 'RA'
    return name
      .split(' ')
      .map((n) => n[0])
      .join('')
      .substring(0, 2)
      .toUpperCase()
  }

  return (
    <div className="min-h-screen flex bg-slate-50 text-slate-900 font-sans">
      <aside
        className={cn(
          'hidden md:flex flex-col bg-slate-900 border-r border-slate-800 text-slate-100 transition-all duration-300 z-20 sticky top-0 h-screen',
          collapsed ? 'w-20' : 'w-[250px]',
        )}
      >
        <div className="p-3 border-b border-slate-800 flex items-center justify-between">
          <Link to="/" className="flex items-center gap-2 overflow-hidden w-full">
            <div className="bg-slate-950/80 p-2 rounded-xl flex items-center justify-center border border-slate-800/80 w-full">
              <img
                src={logoImg}
                alt="RexturAdvance"
                className={cn(
                  'h-7 object-contain transition-all',
                  collapsed ? 'w-7 object-right' : 'w-auto',
                )}
              />
            </div>
          </Link>
        </div>

        <nav className="flex-1 py-4 px-2 space-y-1">
          {navItems.map((item) => {
            const Icon = item.icon
            const isActive = location.pathname === item.path
            return (
              <Link
                key={item.path}
                to={item.path}
                className={cn(
                  'flex items-center gap-3 px-3 py-2.5 rounded-lg text-sm font-medium transition-all group',
                  isActive
                    ? 'bg-gradient-to-r from-cyan-500/20 to-purple-500/20 text-cyan-300 border-l-4 border-cyan-400 font-semibold shadow-sm'
                    : 'text-slate-400 hover:bg-slate-800/60 hover:text-slate-100',
                )}
              >
                <Icon
                  className={cn(
                    'h-5 w-5 shrink-0 transition-colors',
                    isActive ? 'text-cyan-400' : 'text-slate-400 group-hover:text-cyan-300',
                  )}
                />
                {!collapsed && <span>{item.label}</span>}
              </Link>
            )
          })}
        </nav>

        <div className="p-3 border-t border-slate-800 space-y-2">
          <Button
            variant="ghost"
            size="sm"
            className="w-full justify-center text-slate-400 hover:text-slate-100 hover:bg-slate-800"
            onClick={() => setCollapsed(!collapsed)}
          >
            {collapsed ? (
              <ChevronRight className="h-4 w-4" />
            ) : (
              <ChevronLeft className="h-4 w-4 mr-2" />
            )}
            {!collapsed && <span className="text-xs">Recolher Menu</span>}
          </Button>

          <div
            className={cn(
              'flex items-center gap-2.5 p-2 rounded-lg bg-slate-950 border border-slate-800',
              collapsed && 'justify-center',
            )}
          >
            <Avatar className="h-8 w-8 bg-gradient-to-br from-cyan-500 to-indigo-600 text-white font-semibold text-xs border border-cyan-400/30">
              <AvatarFallback className="bg-transparent text-white">
                {getInitials(user?.name)}
              </AvatarFallback>
            </Avatar>
            {!collapsed && (
              <div className="flex-1 min-w-0">
                <p className="text-xs font-semibold text-slate-100 truncate">
                  {user?.name || 'Atendente'}
                </p>
                <p className="text-[10px] text-slate-400 truncate">{user?.email || 'online'}</p>
                {user?.role && (
                  <span className="text-[10px] text-cyan-400 font-semibold">{user.role}</span>
                )}
              </div>
            )}
          </div>
        </div>
      </aside>

      <div className="flex-1 flex flex-col min-w-0">
        <header className="sticky top-0 z-10 bg-white/90 backdrop-blur-md border-b border-slate-200 px-4 py-3 flex items-center justify-between gap-4 shadow-xs">
          <div className="flex items-center gap-3">
            <Sheet open={mobileOpen} onOpenChange={setMobileOpen}>
              <SheetTrigger asChild>
                <Button variant="ghost" size="icon" className="md:hidden">
                  <Menu className="h-5 w-5 text-slate-700" />
                </Button>
              </SheetTrigger>
              <SheetContent
                side="left"
                className="w-[270px] p-0 bg-slate-900 border-slate-800 text-slate-100"
              >
                <div className="p-4 bg-slate-950 border-b border-slate-800 flex items-center">
                  <img src={logoImg} alt="RexturAdvance" className="h-8 w-auto object-contain" />
                </div>
                <nav className="p-3 space-y-1">
                  {navItems.map((item) => {
                    const Icon = item.icon
                    const isActive = location.pathname === item.path
                    return (
                      <Link
                        key={item.path}
                        to={item.path}
                        onClick={() => setMobileOpen(false)}
                        className={cn(
                          'flex items-center gap-3 px-3 py-2.5 rounded-lg text-sm font-medium',
                          isActive
                            ? 'bg-gradient-to-r from-cyan-500/20 to-purple-500/20 text-cyan-300 font-semibold'
                            : 'text-slate-400 hover:text-slate-100',
                        )}
                      >
                        <Icon className="h-5 w-5 text-cyan-400" />
                        {item.label}
                      </Link>
                    )
                  })}
                </nav>
              </SheetContent>
            </Sheet>

            <div className="flex items-center gap-2">
              <h1 className="text-lg font-bold text-slate-900 hidden sm:block">
                {location.pathname === '/' && 'Painel Geral de Atendimentos'}
                {location.pathname === '/novo-atendimento' && 'Novo Registros de Atendimento'}
                {location.pathname === '/atendimentos' && 'Histórico de Atendimentos'}
                {location.pathname === '/clientes' && 'Gestão de Clientes'}
                {location.pathname === '/executivos' && 'Executivos de Contas'}
                {location.pathname === '/gestao-usuarios' && 'Gestão de Usuários'}
                {location.pathname === '/painel-executivo' && 'Painel do Executivo'}
                {location.pathname === '/relatorios-grupo' && 'Relatórios por Grupo de Atendimento'}
                {location.pathname === '/dashboard-geral' && 'Dashboard Geral'}
              </h1>
            </div>
          </div>

          <div className="flex items-center gap-3 flex-1 justify-end max-w-md">
            <form onSubmit={handleSearch} className="relative flex-1">
              <Search className="absolute left-2.5 top-2.5 h-4 w-4 text-slate-400" />
              <Input
                type="search"
                placeholder="Buscar cliente ou atendimento..."
                className="pl-9 h-9 text-xs bg-slate-50 border-slate-200 focus:border-cyan-500"
                value={searchTerm}
                onChange={(e) => setSearchTerm(e.target.value)}
              />
            </form>

            <NotificationBell />

            <DropdownMenu>
              <DropdownMenuTrigger asChild>
                <Button
                  variant="ghost"
                  className="relative h-9 w-9 rounded-full ring-2 ring-cyan-500/20"
                >
                  <Avatar className="h-9 w-9 bg-gradient-to-br from-cyan-500 to-indigo-600 text-white font-bold">
                    <AvatarFallback className="bg-transparent text-white">
                      {getInitials(user?.name)}
                    </AvatarFallback>
                  </Avatar>
                </Button>
              </DropdownMenuTrigger>
              <DropdownMenuContent align="end" className="w-56">
                <DropdownMenuLabel className="font-normal">
                  <div className="flex flex-col space-y-1">
                    <p className="text-sm font-medium leading-none">{user?.name || 'Atendente'}</p>
                    <p className="text-xs leading-none text-muted-foreground">{user?.email}</p>
                    {user?.role && (
                      <span className="text-[10px] text-cyan-600 font-semibold leading-none">
                        {user.role}
                      </span>
                    )}
                  </div>
                </DropdownMenuLabel>
                <DropdownMenuSeparator />
                <DropdownMenuItem className="text-xs gap-2">
                  <ShieldCheck className="h-4 w-4 text-emerald-600" />
                  Sessão Autenticada
                </DropdownMenuItem>
                <DropdownMenuSeparator />
                <DropdownMenuItem
                  onClick={signOut}
                  className="text-xs text-rose-600 gap-2 cursor-pointer"
                >
                  <LogOut className="h-4 w-4" />
                  Sair do Sistema
                </DropdownMenuItem>
              </DropdownMenuContent>
            </DropdownMenu>
          </div>
        </header>

        <main className="flex-1 p-4 md:p-6 max-w-7xl w-full mx-auto animate-fade-in-up">
          <Outlet />
        </main>

        <footer className="py-3 px-6 text-center text-xs text-slate-500 border-t border-slate-200 bg-white flex items-center justify-between">
          <span className="font-semibold text-slate-700">
            RexturAdvance &copy; {new Date().getFullYear()}
          </span>
          <span>Sistema de Registros de Atendimento — Todos os direitos reservados.</span>
        </footer>
      </div>
      <QuickLog open={quickLogOpen} onOpenChange={setQuickLogOpen} />
      <ConsultantAIWidget />
    </div>
  )
}

export default Layout
