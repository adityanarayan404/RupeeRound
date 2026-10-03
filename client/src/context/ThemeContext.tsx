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
const THEME_COLORS: Record<Theme, string> = { light: '#F1F0E2', dark: '#1E1714' }

export default function ThemeProvider({ children }: { children: ReactNode }) {
  // index.html already applied the saved/system theme before React loaded.
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
    ? { line: '#C39D88', fill: '#A47864', second: '#BAAA91', grid: '#3D302A', text: '#BAAA91', tooltipBg: '#2A211D' }
    : { line: '#8B645A', fill: '#A47864', second: '#BAAA91', grid: '#E0D6C6', text: '#8B645A', tooltipBg: '#FBF8F1' }
}
