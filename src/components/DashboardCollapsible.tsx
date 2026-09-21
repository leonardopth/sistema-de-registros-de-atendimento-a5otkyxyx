import React, { useState, useEffect, useCallback, createContext, useContext } from 'react'
import { ChevronDown, ChevronRight, ChevronsDownUp, ChevronsUpDown } from 'lucide-react'
import { Button } from '@/components/ui/button'
import { Badge } from '@/components/ui/badge'

interface DashboardCollapsibleContextType {
  registerSection: (id: string, defaultOpen: boolean) => void
  isSectionOpen: (id: string) => boolean
  toggleSection: (id: string) => void
  expandAll: () => void
  collapseAll: () => void
  allExpanded: boolean
  allCollapsed: boolean
  hasRegisteredSections: boolean
}

const DashboardCollapsibleContext = createContext<DashboardCollapsibleContextType | null>(null)

export function useDashboardCollapsible() {
  const ctx = useContext(DashboardCollapsibleContext)
  return ctx
}

interface DashboardCollapsibleProviderProps {
  children: React.ReactNode
  userId?: string
}

export function DashboardCollapsibleProvider({
  children,
  userId = 'default',
}: DashboardCollapsibleProviderProps) {
  const [sections, setSections] = useState<Record<string, boolean>>({})
  const [defaults, setDefaults] = useState<Record<string, boolean>>({})

  // Helper para ler localStorage com fallback
  const getStoredState = useCallback(
    (id: string, fallback: boolean): boolean => {
      if (typeof window === 'undefined') return fallback
      try {
        const key = `dashboard-section-${userId}-${id}`
        const item = window.localStorage.getItem(key)
        if (item === null) return fallback
        return item === 'true'
      } catch {
        return fallback
      }
    },
    [userId],
  )

  const registerSection = useCallback(
    (id: string, defaultOpen: boolean) => {
      setDefaults((prev) => (prev[id] !== undefined ? prev : { ...prev, [id]: defaultOpen }))
      setSections((prev) => {
        if (prev[id] !== undefined) return prev
        const stored = getStoredState(id, defaultOpen)
        return { ...prev, [id]: stored }
      })
    },
    [getStoredState],
  )

  const isSectionOpen = useCallback(
    (id: string): boolean => {
      if (sections[id] !== undefined) return sections[id]
      return defaults[id] ?? true
    },
    [sections, defaults],
  )

  const toggleSection = useCallback(
    (id: string) => {
      setSections((prev) => {
        const nextState = !(prev[id] !== undefined ? prev[id] : (defaults[id] ?? true))
        if (typeof window !== 'undefined') {
          try {
            window.localStorage.setItem(`dashboard-section-${userId}-${id}`, String(nextState))
          } catch {
            // noop
          }
        }
        return { ...prev, [id]: nextState }
      })
    },
    [userId, defaults],
  )

  const expandAll = useCallback(() => {
    setSections((prev) => {
      const next: Record<string, boolean> = {}
      const keys = Object.keys({ ...defaults, ...prev })
      keys.forEach((k) => {
        next[k] = true
        if (typeof window !== 'undefined') {
          try {
            window.localStorage.setItem(`dashboard-section-${userId}-${k}`, 'true')
          } catch {
            // noop
          }
        }
      })
      return next
    })
  }, [defaults, userId])

  const collapseAll = useCallback(() => {
    setSections((prev) => {
      const next: Record<string, boolean> = {}
      const keys = Object.keys({ ...defaults, ...prev })
      keys.forEach((k) => {
        next[k] = false
        if (typeof window !== 'undefined') {
          try {
            window.localStorage.setItem(`dashboard-section-${userId}-${k}`, 'false')
          } catch {
            // noop
          }
        }
      })
      return next
    })
  }, [defaults, userId])

  const sectionKeys = Object.keys(sections)
  const allExpanded = sectionKeys.length > 0 && sectionKeys.every((k) => sections[k])
  const allCollapsed = sectionKeys.length > 0 && sectionKeys.every((k) => !sections[k])
  const hasRegisteredSections = sectionKeys.length > 0

  return (
    <DashboardCollapsibleContext.Provider
      value={{
        registerSection,
        isSectionOpen,
        toggleSection,
        expandAll,
        collapseAll,
        allExpanded,
        allCollapsed,
        hasRegisteredSections,
      }}
    >
      {children}
    </DashboardCollapsibleContext.Provider>
  )
}

/**
 * Seletor rápido discreto no topo para expandir / recolher todas as seções colapsáveis
 */
export function DashboardExpandCollapseToggle({ className = '' }: { className?: string }) {
  const ctx = useDashboardCollapsible()
  if (!ctx || !ctx.hasRegisteredSections) return null

  const { allExpanded, expandAll, collapseAll } = ctx

  return (
    <div className={`flex items-center gap-1.5 text-xs text-slate-500 ${className}`}>
      {allExpanded ? (
        <Button
          type="button"
          variant="ghost"
          size="sm"
          onClick={collapseAll}
          className="h-7 text-xs text-slate-600 hover:text-slate-900 hover:bg-slate-100 gap-1 px-2"
          title="Recolher seções secundárias para visualização compacta"
        >
          <ChevronsDownUp className="h-3.5 w-3.5 text-slate-500" />
          <span>Recolher seções secundárias</span>
        </Button>
      ) : (
        <Button
          type="button"
          variant="ghost"
          size="sm"
          onClick={expandAll}
          className="h-7 text-xs text-slate-600 hover:text-slate-900 hover:bg-slate-100 gap-1 px-2"
          title="Expandir todas as seções do dashboard"
        >
          <ChevronsUpDown className="h-3.5 w-3.5 text-slate-500" />
          <span>Expandir tudo</span>
        </Button>
      )}
    </div>
  )
}

interface DashboardSectionProps {
  id: string
  title: string
  subtitle?: string
  icon?: React.ReactNode
  badge?: React.ReactNode
  defaultOpen?: boolean
  children: React.ReactNode
  className?: string
  headerExtra?: React.ReactNode
}

/**
 * Seção colapsável elegante com memória por usuário
 */
export function DashboardSection({
  id,
  title,
  subtitle,
  icon,
  badge,
  defaultOpen = false,
  children,
  className = '',
  headerExtra,
}: DashboardSectionProps) {
  const ctx = useDashboardCollapsible()

  // Se não estiver dentro do Provider, usa estado local com localStorage direto
  const [localOpen, setLocalOpen] = useState(() => {
    if (typeof window === 'undefined') return defaultOpen
    try {
      const stored = window.localStorage.getItem(`dashboard-section-${id}`)
      return stored !== null ? stored === 'true' : defaultOpen
    } catch {
      return defaultOpen
    }
  })

  useEffect(() => {
    if (ctx) {
      ctx.registerSection(id, defaultOpen)
    }
  }, [ctx, id, defaultOpen])

  const isOpen = ctx ? ctx.isSectionOpen(id) : localOpen

  const handleToggle = () => {
    if (ctx) {
      ctx.toggleSection(id)
    } else {
      const next = !localOpen
      setLocalOpen(next)
      try {
        window.localStorage.setItem(`dashboard-section-${id}`, String(next))
      } catch {
        // noop
      }
    }
  }

  return (
    <div
      className={`rounded-xl border border-slate-200 bg-white shadow-subtle overflow-hidden transition-all ${className}`}
    >
      <div
        onClick={handleToggle}
        className="w-full flex items-center justify-between p-3 sm:p-3.5 bg-slate-50/70 hover:bg-slate-100/70 cursor-pointer select-none transition-colors border-b border-transparent data-[open=true]:border-slate-100"
        data-open={isOpen}
      >
        <div className="flex items-center gap-2.5 min-w-0">
          <div className="p-1 rounded text-slate-500 shrink-0">
            {isOpen ? <ChevronDown className="h-4 w-4" /> : <ChevronRight className="h-4 w-4" />}
          </div>
          {icon && <div className="text-indigo-600 shrink-0">{icon}</div>}
          <div className="min-w-0">
            <div className="flex items-center gap-2 flex-wrap">
              <h3 className="text-xs sm:text-sm font-bold text-slate-900 leading-none">{title}</h3>
              {badge}
            </div>
            {subtitle && (
              <p className="text-[11px] text-slate-500 mt-0.5 line-clamp-1">{subtitle}</p>
            )}
          </div>
        </div>

        <div className="flex items-center gap-2 shrink-0 ml-2" onClick={(e) => e.stopPropagation()}>
          {headerExtra}
          <span className="text-[11px] font-medium text-slate-400 hover:text-slate-600 hidden sm:inline">
            {isOpen ? 'Recolher' : 'Expandir'}
          </span>
        </div>
      </div>

      {isOpen && <div className="p-3 sm:p-4 border-t border-slate-100">{children}</div>}
    </div>
  )
}
