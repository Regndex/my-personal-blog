export default function Pagination({ page, totalPages, onChange }) {
  if (totalPages <= 1) return null

  return (
    <div className="mt-10 flex items-center justify-center gap-2">
      <button
        type="button"
        disabled={page <= 1}
        onClick={() => onChange(page - 1)}
        className="rounded-full px-4 py-2 text-sm font-medium text-stone-500 transition-colors hover:bg-stone-100 disabled:opacity-40 disabled:hover:bg-transparent dark:hover:bg-white/5"
      >
        السابق
      </button>

      <span className="text-sm text-stone-400">
        {page} / {totalPages}
      </span>

      <button
        type="button"
        disabled={page >= totalPages}
        onClick={() => onChange(page + 1)}
        className="rounded-full px-4 py-2 text-sm font-medium text-stone-500 transition-colors hover:bg-stone-100 disabled:opacity-40 disabled:hover:bg-transparent dark:hover:bg-white/5"
      >
        التالي
      </button>
    </div>
  )
}
