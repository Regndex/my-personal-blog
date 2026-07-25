import { Link } from 'react-router-dom'

export default function NotFound() {
  return (
    <div className="mx-auto flex max-w-2xl flex-col items-center px-4 py-24 text-center">
      <p className="font-display mb-3 text-6xl text-pine-500">٤٠٤</p>
      <h1 className="mb-3 text-2xl font-bold text-ink">هذه الصفحة غير موجودة</h1>
      <p className="mb-8 text-stone-500 dark:text-stone-400">
        قد يكون الرابط قديماً أو كُتب بشكل غير صحيح.
      </p>
      <Link
        to="/"
        className="rounded-full bg-pine-500 px-6 py-3 font-medium text-paper transition-colors hover:bg-pine-600"
      >
        العودة إلى الصفحة الرئيسية
      </Link>
    </div>
  )
}
