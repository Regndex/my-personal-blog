import { useState } from 'react'
import { useAuth } from '../lib/AuthContext'

export default function Login() {
  const { signIn } = useAuth()
  const [email, setEmail] = useState('')
  const [password, setPassword] = useState('')
  const [error, setError] = useState(null)
  const [submitting, setSubmitting] = useState(false)

  async function handleSubmit(event) {
    event.preventDefault()
    setError(null)
    setSubmitting(true)

    try {
      await signIn(email, password)
    } catch {
      setError('البريد الإلكتروني أو كلمة المرور غير صحيحة')
    } finally {
      setSubmitting(false)
    }
  }

  return (
    <div className="mx-auto max-w-sm px-4 py-16 sm:py-24">
      <div className="mb-8 text-center">
        <h1 className="font-display mb-2 text-2xl font-medium text-ink">تسجيل الدخول</h1>
        <p className="text-stone-500">هذه المساحة مخصصة لصاحب المدونة فقط</p>
      </div>

      <form
        onSubmit={handleSubmit}
        className="space-y-4 rounded-2xl border border-stone-200/80 bg-white p-6 shadow-sm sm:p-8"
      >
        <div>
          <label htmlFor="email" className="mb-2 block text-sm font-medium text-ink">
            البريد الإلكتروني
          </label>
          <input
            id="email"
            type="email"
            required
            autoComplete="email"
            value={email}
            onChange={(event) => setEmail(event.target.value)}
            className="w-full rounded-xl border border-stone-200 px-4 py-3 text-ink transition focus:border-pine-400 focus:outline-none focus:ring-2 focus:ring-pine-500/30"
          />
        </div>

        <div>
          <label htmlFor="password" className="mb-2 block text-sm font-medium text-ink">
            كلمة المرور
          </label>
          <input
            id="password"
            type="password"
            required
            autoComplete="current-password"
            value={password}
            onChange={(event) => setPassword(event.target.value)}
            className="w-full rounded-xl border border-stone-200 px-4 py-3 text-ink transition focus:border-pine-400 focus:outline-none focus:ring-2 focus:ring-pine-500/30"
          />
        </div>

        {error && (
          <div className="rounded-xl border border-red-100 bg-red-50 px-4 py-3 text-sm text-red-600">
            {error}
          </div>
        )}

        <button
          type="submit"
          disabled={submitting}
          className="w-full rounded-xl bg-pine-500 px-6 py-3.5 font-medium text-paper transition-colors hover:bg-pine-600 disabled:cursor-not-allowed disabled:bg-stone-300"
        >
          {submitting ? 'جارٍ الدخول...' : 'دخول'}
        </button>
      </form>
    </div>
  )
}
