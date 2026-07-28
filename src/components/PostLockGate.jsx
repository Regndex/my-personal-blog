import { useState } from 'react'
import { decryptContent } from '../utils/postLock'

export default function PostLockGate({ encryptedPayload, onUnlock }) {
  const [password, setPassword] = useState('')
  const [error, setError] = useState(null)
  const [checking, setChecking] = useState(false)

  async function handleSubmit(event) {
    event.preventDefault()
    setError(null)
    setChecking(true)

    try {
      const plainText = await decryptContent(encryptedPayload, password)
      onUnlock(plainText)
    } catch (err) {
      setError(err.message)
    } finally {
      setChecking(false)
    }
  }

  return (
    <div className="rounded-2xl border border-stone-200/80 bg-white p-6 text-center sm:p-8 dark:border-stone-700 dark:bg-surface">
      <p className="mb-4 text-3xl">🔒</p>
      <p className="mb-4 font-bold text-ink">هذا المقال محمي بكلمة مرور</p>
      <form onSubmit={handleSubmit} className="mx-auto max-w-xs space-y-3">
        <input
          type="password"
          value={password}
          onChange={(event) => setPassword(event.target.value)}
          placeholder="كلمة المرور"
          autoFocus
          className="w-full rounded-xl border border-stone-200 bg-transparent px-4 py-2.5 text-center text-ink transition focus:border-pine-400 focus:outline-none focus:ring-2 focus:ring-pine-500/30 dark:border-stone-600"
        />
        {error && <p className="text-sm text-red-600 dark:text-red-400">{error}</p>}
        <button
          type="submit"
          disabled={checking || !password}
          className="w-full rounded-xl bg-pine-500 px-6 py-2.5 font-medium text-paper transition-colors hover:bg-pine-600 disabled:cursor-not-allowed disabled:bg-stone-300"
        >
          {checking ? 'جارٍ التحقق...' : 'فتح المقال'}
        </button>
      </form>
    </div>
  )
}
