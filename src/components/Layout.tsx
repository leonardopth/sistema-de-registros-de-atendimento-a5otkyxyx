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
} from 'lucide-react'
import { cn } from '@/lib/utils'

export function Layout() {
  const { user, signOut } = useAuth()
  const location = useLocation()
  const navigate = useNavigate()
  const [collapsed, setCollapsed] = useState(false)
  const [searchTerm, setSearchTerm] = useState('')
  const [mobileOpen, setMobileOpen] = useState(false)

  const navItems = [
    { label: 'Dashboard', path: '/', icon: LayoutDashboard },
    { label: 'Novo Atendimento', path: '/novo-atendimento', icon: PlusCircle },
    { label: 'Atendimentos', path: '/atendimentos', icon: Headset },
    { label: 'Clientes', path: '/clientes', icon: Users },
  ]

  const handleSearch = (e: React.FormEvent) => {
    e.preventDefault()
    if (searchTerm.trim()) {
      navigate(`/atendimentos?search=${encodeURIComponent(searchTerm.trim())}`)
    }
  }

  const getInitials = (name?: string) => {
    if (!name) return 'AT'
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
          'hidden md:flex flex-col bg-white border-r border-slate-200 transition-all duration-300 z-20 sticky top-0 h-screen',
          collapsed ? 'w-20' : 'w-[250px]',
        )}
      >
        <div className="p-4 border-b border-slate-100 flex items-center justify-between">
          <Link to="/" className="flex items-center gap-2.5 overflow-hidden">
            <div className="h-9 w-9 rounded-lg bg-indigo-600 text-white flex items-center justify-center font-extrabold text-lg shadow-md shrink-0">
              S
            </div>
            {!collapsed && (
              <div className="flex flex-col leading-tight">
                <span className="font-bold text-slate-900 text-sm tracking-tight">Atendimento</span>
                <span className="text-[10px] text-indigo-600 font-semibold uppercase tracking-wider">
                  Gestão Pro
                </span>
              </div>
            )}
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
                    ? 'bg-indigo-50 text-indigo-700 border-l-4 border-indigo-600 font-semibold'
                    : 'text-slate-600 hover:bg-slate-50 hover:text-slate-900',
                )}
              >
                <Icon
                  className={cn(
                    'h-5 w-5 shrink-0',
                    isActive ? 'text-indigo-600' : 'text-slate-400 group-hover:text-slate-600',
                  )}
                />
                {!collapsed && <span>{item.label}</span>}
              </Link>
            )
          })}
        </nav>

        <div className="p-3 border-t border-slate-100 space-y-2">
          <Button
            variant="ghost"
            size="sm"
            className="w-full justify-center text-slate-400 hover:text-slate-700"
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
              'flex items-center gap-2.5 p-2 rounded-lg bg-slate-50 border border-slate-100',
              collapsed && 'justify-center',
            )}
          >
            <Avatar className="h-8 w-8 bg-indigo-600 text-white font-semibold text-xs">
              <AvatarFallback className="bg-indigo-600 text-white">
                {getInitials(user?.name)}
              </AvatarFallback>
            </Avatar>
            {!collapsed && (
              <div className="flex-1 min-w-0">
                <p className="text-xs font-semibold text-slate-800 truncate">
                  {user?.name || 'Atendente'}
                </p>
                <p className="text-[10px] text-slate-500 truncate">{user?.email || 'online'}</p>
              </div>
            )}
          </div>
        </div>
      </aside>

      <div className="flex-1 flex flex-col min-w-0">
        <header className="sticky top-0 z-10 bg-white/80 backdrop-blur-md border-b border-slate-200 px-4 py-3 flex items-center justify-between gap-4">
          <div className="flex items-center gap-3">
            <Sheet open={mobileOpen} onOpenChange={setMobileOpen}>
              <SheetTrigger asChild>
                <Button variant="ghost" size="icon" className="md:hidden">
                  <Menu className="h-5 w-5" />
                </Button>
              </SheetTrigger>
              <SheetContent side="left" className="w-[260px] p-0">
                <div className="p-4 border-b border-slate-100 flex items-center gap-2">
                  <div className="h-8 w-8 rounded-md bg-indigo-600 text-white flex items-center justify-center font-bold">
                    S
                  </div>
                  <span className="font-bold text-slate-900 text-sm">Registro de Atendimento</span>
                </div>
                <nav className="p-2 space-y-1">
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
                            ? 'bg-indigo-50 text-indigo-700 font-semibold'
                            : 'text-slate-600',
                        )}
                      >
                        <Icon className="h-5 w-5 text-indigo-600" />
                        {item.label}
                      </Link>
                    )
                  })}
                </nav>
              </SheetContent>
            </Sheet>

            <h1 className="text-lg font-bold text-slate-900 hidden sm:block">
              {location.pathname === '/' && 'Painel de Controle'}
              {location.pathname === '/novo-atendimento' && 'Novo Atendimento'}
              {location.pathname === '/atendimentos' && 'Histórico de Atendimentos'}
              {location.pathname === '/clientes' && 'Gestão de Clientes'}
            </h1>
          </div>

          <div className="flex items-center gap-3 flex-1 justify-end max-w-md">
            <form onSubmit={handleSearch} className="relative flex-1">
              <Search className="absolute left-2.5 top-2.5 h-4 w-4 text-slate-400" />
              <Input
                type="search"
                placeholder="Buscar cliente ou atendimento..."
                className="pl-9 h-9 text-xs bg-slate-50 border-slate-200 focus:bg-white"
                value={searchTerm}
                onChange={(e) => setSearchTerm(e.target.value)}
              />
            </form>

            <DropdownMenu>
              <DropdownMenuTrigger asChild>
                <Button variant="ghost" className="relative h-9 w-9 rounded-full">
                  <Avatar className="h-9 w-9 bg-indigo-600 text-white">
                    <AvatarFallback className="bg-indigo-600 text-white">
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
                  className="text-xs text-red-600 gap-2 cursor-pointer"
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

        <footer className="py-3 px-6 text-center text-xs text-slate-400 border-t border-slate-200 bg-white">
          Sistema de Registro de Atendimento v1.0 &copy; {new Date().getFullYear()} — Todos os
          direitos reservados.
        </footer>
      </div>
    </div>
  )
}

export default Layout
