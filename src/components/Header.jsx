import { Link, useLocation } from 'react-router-dom'
import { useAuth } from '../lib/AuthContext'
import ThemeToggle from './ThemeToggle'

export default function Header() {
  const location = useLocation()
  const { user } = useAuth()
  const isAdmin = location.pathname.startsWith('/admin')
  const isArchive = location.pathname === '/archive'

  return (
    <header className="sticky top-0 z-30 border-b border-stone-200/80 bg-paper/85 backdrop-blur-md dark:border-stone-700">
      <div className="mx-auto flex h-16 max-w-6xl items-center justify-between px-4 sm:px-6 lg:px-8">
        <Link to="/" className="group flex items-center gap-2.5">
          <span className="flex h-9 w-9 items-center justify-center rounded-full bg-pine-500 text-paper shadow-sm transition-colors group-hover:bg-pine-600">
            <svg viewBox="0 0 24 24" className="h-4 w-4" fill="none">
              <path
                d="M6 17 L16 7 M16 7 L16 10.5 M16 7 L12.5 7"
                stroke="currentColor"
                strokeWidth="1.8"
                strokeLinecap="round"
                strokeLinejoin="round"
              />
              <circle cx="6" cy="17" r="1.2" fill="var(--color-gold-400)" />
            </svg>
          </span>
          <span className="font-display text-xl font-medium tracking-wide text-ink">
            مدونتي
          </span>
        </Link>

        <nav className="flex items-center gap-1">
          <Link
            to="/"
            className={`rounded-full px-4 py-2 text-sm font-medium transition-colors ${
              !isAdmin && !isArchive
                ? 'bg-pine-50 text-pine-700 dark:bg-pine-500/15 dark:text-pine-400'
                : 'text-stone-500 hover:bg-stone-100 hover:text-ink dark:hover:bg-white/5'
            }`}
          >
            المقالات
          </Link>
          <Link
            to="/archive"
            className={`hidden rounded-full px-4 py-2 text-sm font-medium transition-colors sm:inline-block ${
              isArchive
                ? 'bg-pine-50 text-pine-700 dark:bg-pine-500/15 dark:text-pine-400'
                : 'text-stone-500 hover:bg-stone-100 hover:text-ink dark:hover:bg-white/5'
            }`}
          >
            الأرشيف
          </Link>
          {/* Only shown once signed in — anonymous visitors aren't invited to
              click their way into the admin area at all. The owner reaches
              it by navigating to /admin directly, where Login takes over. */}
          {user && (
            <Link
              to="/admin"
              className={`rounded-full px-4 py-2 text-sm font-medium transition-colors ${
                isAdmin
                  ? 'bg-pine-50 text-pine-700 dark:bg-pine-500/15 dark:text-pine-400'
                  : 'text-stone-500 hover:bg-stone-100 hover:text-ink dark:hover:bg-white/5'
              }`}
            >
              لوحة التحكم
            </Link>
          )}
          <ThemeToggle />
        </nav>
      </div>
    </header>
  )
}
