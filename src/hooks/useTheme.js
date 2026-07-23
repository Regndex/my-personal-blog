import { useEffect, useState } from 'react'

const STORAGE_KEY = 'blog-theme'

function getInitialTheme() {
  if (typeof window === 'undefined') return 'light'

  const saved = window.localStorage.getItem(STORAGE_KEY)
  if (saved === 'dark' || saved === 'light') return saved

  return window.matchMedia?.('(prefers-color-scheme: dark)').matches ? 'dark' : 'light'
}

/**
 * Class-based dark mode: toggles `.dark` on <html>, which flips every
 * custom color token defined in index.css (--color-paper, --color-ink,
 * etc.) since components reference those variables rather than hardcoded
 * colors. Persisted in localStorage — this is a real deployed site the
 * visitor's own browser stores it in, not a claude.ai artifact.
 */
export function useTheme() {
  const [theme, setTheme] = useState(getInitialTheme)

  useEffect(() => {
    const root = document.documentElement
    if (theme === 'dark') {
      root.classList.add('dark')
    } else {
      root.classList.remove('dark')
    }
    window.localStorage.setItem(STORAGE_KEY, theme)
  }, [theme])

  function toggleTheme() {
    setTheme((prev) => (prev === 'dark' ? 'light' : 'dark'))
  }

  return { theme, toggleTheme }
}
