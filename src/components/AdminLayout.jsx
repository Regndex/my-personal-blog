import { Link, Outlet, useLocation } from 'react-router-dom'
import { useAuth } from '../lib/AuthContext'
import Login from './Login'
import LoadingSpinner from './LoadingSpinner'

const TABS = [
  { to: '/admin', label: 'مقال جديد', end: true },
  { to: '/admin/posts', label: 'إدارة المقالات' },
  { to: '/admin/comments', label: 'التعليقات' },
]

export default function AdminLayout() {
  const { user, loading, signOut } = useAuth()
  const location = useLocation()

  if (loading) {
    return <LoadingSpinner label="جارٍ التحقق من الجلسة..." />
  }

  if (!user) {
    return <Login />
  }

  return (
    <div className="mx-auto max-w-3xl px-4 py-10 sm:px-6 lg:px-8 lg:py-14">
      <div className="mb-8 flex flex-wrap items-center justify-between gap-3">
        <nav className="flex flex-wrap gap-1">
          {TABS.map((tab) => {
            const active = tab.end
              ? location.pathname === tab.to
              : location.pathname.startsWith(tab.to)
            return (
              <Link
                key={tab.to}
                to={tab.to}
                className={`rounded-full px-4 py-2 text-sm font-medium transition-colors ${
                  active
                    ? 'bg-pine-50 text-pine-700'
                    : 'text-stone-500 hover:bg-stone-100 hover:text-ink'
                }`}
              >
                {tab.label}
              </Link>
            )
          })}
        </nav>
        <button
          type="button"
          onClick={signOut}
          className="shrink-0 rounded-full px-4 py-2 text-sm font-medium text-stone-500 transition-colors hover:bg-stone-100 hover:text-red-600"
        >
          تسجيل الخروج
        </button>
      </div>

      <Outlet />
    </div>
  )
}
