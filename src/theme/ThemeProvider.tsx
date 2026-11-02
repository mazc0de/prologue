import { createContext, useContext, useEffect, useMemo, useState, type ReactNode } from 'react'

export type ThemeMode = 'light' | 'dark' | 'system'

const STORAGE_KEY = 'prologue-theme'
const MODES: ThemeMode[] = ['light', 'dark', 'system']

interface ThemeApi {
  mode: ThemeMode
  /** The mode actually on screen once "system" is resolved. */
  resolved: 'light' | 'dark'
  setMode: (mode: ThemeMode) => void
}

const ThemeContext = createContext<ThemeApi | null>(null)

function readSaved(): ThemeMode {
  try {
    const saved = JSON.parse(localStorage.getItem(STORAGE_KEY) ?? '{}') as { mode?: ThemeMode }
    return MODES.includes(saved.mode as ThemeMode) ? (saved.mode as ThemeMode) : 'system'
  } catch {
    return 'system'
  }
}

const darkQuery = () => window.matchMedia('(prefers-color-scheme: dark)')

/** Light paper, dark paper, or follow the OS. The ink palette itself is fixed (DESIGN.md). */
export function ThemeProvider({ children }: { children: ReactNode }) {
  const [mode, setMode] = useState<ThemeMode>(readSaved)
  const [systemDark, setSystemDark] = useState(() => darkQuery().matches)

  useEffect(() => {
    const query = darkQuery()
    const onChange = () => setSystemDark(query.matches)
    query.addEventListener('change', onChange)
    return () => query.removeEventListener('change', onChange)
  }, [])

  const resolved = mode === 'system' ? (systemDark ? 'dark' : 'light') : mode

  useEffect(() => {
    document.documentElement.classList.toggle('dark', resolved === 'dark')
    document.querySelector('meta[name="theme-color"]')?.setAttribute('content', resolved === 'dark' ? '#151412' : '#f4f1ea')
    try {
      localStorage.setItem(STORAGE_KEY, JSON.stringify({ mode }))
    } catch {
      // Private mode or blocked storage: the theme still applies for this visit.
    }
  }, [mode, resolved])

  const api = useMemo<ThemeApi>(() => ({ mode, resolved, setMode }), [mode, resolved])
  return <ThemeContext.Provider value={api}>{children}</ThemeContext.Provider>
}

export function useTheme(): ThemeApi {
  const ctx = useContext(ThemeContext)
  if (!ctx) throw new Error('useTheme must be used inside ThemeProvider')
  return ctx
}
