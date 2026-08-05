import { useEffect } from 'react'

interface ShortcutHandler {
  key: string
  ctrlKey?: boolean
  handler: () => void
}

export function useKeyboardShortcuts(shortcuts: ShortcutHandler[]) {
  useEffect(() => {
    const handleKeyDown = (e: KeyboardEvent) => {
      for (const shortcut of shortcuts) {
        const ctrlMatch = shortcut.ctrlKey ? e.ctrlKey || e.metaKey : true
        if (e.key.toLowerCase() === shortcut.key.toLowerCase() && ctrlMatch) {
          const target = e.target as HTMLElement
          if (target.tagName === 'INPUT' || target.tagName === 'TEXTAREA') return
          e.preventDefault()
          shortcut.handler()
          break
        }
      }
    }
    window.addEventListener('keydown', handleKeyDown)
    return () => window.removeEventListener('keydown', handleKeyDown)
  }, [shortcuts])
}
