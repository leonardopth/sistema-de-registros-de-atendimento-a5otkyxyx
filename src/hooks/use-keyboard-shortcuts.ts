import { useEffect } from 'react'

interface ShortcutHandler {
  key: string
  ctrlKey?: boolean
  altKey?: boolean
  shiftKey?: boolean
  handler: () => void
}

export function useKeyboardShortcuts(shortcuts: ShortcutHandler[]) {
  useEffect(() => {
    const handleKeyDown = (e: KeyboardEvent) => {
      for (const shortcut of shortcuts) {
        const ctrlMatch = shortcut.ctrlKey ? e.ctrlKey || e.metaKey : !e.ctrlKey && !e.metaKey
        const altMatch = shortcut.altKey ? e.altKey : !e.altKey
        const shiftMatch = shortcut.shiftKey ? e.shiftKey : !e.shiftKey
        if (
          e.key.toLowerCase() === shortcut.key.toLowerCase() &&
          ctrlMatch &&
          altMatch &&
          shiftMatch
        ) {
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
