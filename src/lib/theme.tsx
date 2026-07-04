/* ========================================================================== *
 *  Theme — light / dark toggle.
 *
 *  Default is "light". The choice is persisted to localStorage and applied as a
 *  `.dark` class on <html> (Tailwind `darkMode: "class"`). An inline script in
 *  index.html sets the class before first paint to avoid a flash.
 * ========================================================================== */
import {
  createContext,
  useCallback,
  useContext,
  useEffect,
  useState,
  type ReactNode,
} from "react"

export type Theme = "light" | "dark"

const STORAGE_KEY = "tutur.theme"

function readInitialTheme(): Theme {
  try {
    const v = localStorage.getItem(STORAGE_KEY)
    if (v === "light" || v === "dark") return v
  } catch {
    /* localStorage unavailable */
  }
  return "light"
}

function applyTheme(t: Theme) {
  const root = document.documentElement
  root.classList.toggle("dark", t === "dark")
}

interface ThemeCtx {
  theme: Theme
  setTheme: (t: Theme) => void
}

const ThemeContext = createContext<ThemeCtx>({
  theme: "light",
  setTheme: () => {},
})

export function ThemeProvider({ children }: { children: ReactNode }) {
  const [theme, setThemeState] = useState<Theme>(readInitialTheme)

  useEffect(() => {
    applyTheme(theme)
  }, [theme])

  const setTheme = useCallback((t: Theme) => {
    setThemeState(t)
    try {
      localStorage.setItem(STORAGE_KEY, t)
    } catch {
      /* ignore */
    }
  }, [])

  return (
    <ThemeContext.Provider value={{ theme, setTheme }}>
      {children}
    </ThemeContext.Provider>
  )
}

export function useTheme(): ThemeCtx {
  return useContext(ThemeContext)
}
