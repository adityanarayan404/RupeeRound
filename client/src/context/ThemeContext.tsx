import { createContext, useCallback, useContext, useEffect, useMemo, useState, type ReactNode } from 'react'
import { storage } from '@/lib/storage'

export type Theme = 'light' | 'dark'

interface ThemeContextValue {
  theme: Theme
  setTheme: (theme: Theme) => void
  toggleTheme: () => void
}

const ThemeContext = createContext<ThemeContextValue | null>(null)

const THEME_KEY = 'rr.theme'
const THEME_COLORS: Record<Theme, string> = { light: '#FAFAF9', dark: '#0A0807' }

export default function ThemeProvider({ children }: { children: ReactNode }) {
  // index.html already applied the saved theme (dark by default) before React loaded.
  const [theme, setThemeState] = useState<Theme>(() =>
    document.documentElement.classList.contains('dark') ? 'dark' : 'light',
  )

  useEffect(() => {
    document.documentElement.classList.toggle('dark', theme === 'dark')
    document.querySelector('meta[name="theme-color"]')?.setAttribute('content', THEME_COLORS[theme])
  }, [theme])

  const setTheme = useCallback((next: Theme) => {
    storage.set(THEME_KEY, next)
    setThemeState(next)
  }, [])

  const value = useMemo(
    () => ({ theme, setTheme, toggleTheme: () => setTheme(theme === 'dark' ? 'light' : 'dark') }),
    [theme, setTheme],
  )
  return <ThemeContext.Provider value={value}>{children}</ThemeContext.Provider>
}

export function useTheme(): ThemeContextValue {
  const context = useContext(ThemeContext)
  if (!context) throw new Error('useTheme must be used inside ThemeProvider')
  return context
}

/** Recharts needs concrete colours rather than CSS variables. */
export function useChartColors() {
  const { theme } = useTheme()
  return theme === 'dark'
    ? { line: '#F4F1EC', fill: '#F4F1EC', second: '#6F665E', grid: '#262019', text: '#958C84', ink: '#F4F1EC', tooltipBg: '#14100E' }
    : { line: '#0E0C0B', fill: '#0E0C0B', second: '#A39C95', grid: '#E6E2DD', text: '#6B645E', ink: '#0E0C0B', tooltipBg: '#FFFFFF' }
}
