import { useEffect, useState } from 'react'
import { supabase } from '../lib/supabaseClient'
import { formatDate } from '../utils/formatDate'

export default function RevisionHistory({ postId, onRestore }) {
  const [revisions, setRevisions] = useState([])
  const [loading, setLoading] = useState(true)
  const [open, setOpen] = useState(false)

  useEffect(() => {
    let isMounted = true

    async function loadRevisions() {
      const { data } = await supabase
        .from('post_revisions')
        .select('*')
        .eq('post_id', postId)
        .order('created_at', { ascending: false })

      if (isMounted) {
        setRevisions(data || [])
        setLoading(false)
      }
    }

    loadRevisions()
    return () => {
      isMounted = false
    }
  }, [postId])

  if (loading || revisions.length === 0) return null

  return (
    <div className="mb-6 rounded-2xl border border-stone-200/80 bg-white p-5 dark:border-stone-700 dark:bg-surface">
      <button
        type="button"
        onClick={() => setOpen((prev) => !prev)}
        className="flex w-full items-center justify-between text-sm font-bold text-ink"
      >
        <span>سجل التعديلات ({revisions.length})</span>
        <span className="text-stone-400">{open ? '−' : '+'}</span>
      </button>

      {open && (
        <ul className="mt-4 space-y-2">
          {revisions.map((revision) => (
            <li
              key={revision.id}
              className="flex items-center justify-between gap-3 rounded-xl border border-stone-200/70 px-3 py-2 text-sm dark:border-stone-700"
            >
              <span className="text-stone-500 dark:text-stone-400">
                {formatDate(revision.created_at)} — {revision.title}
              </span>
              <button
                type="button"
                onClick={() => onRestore(revision)}
                className="shrink-0 rounded-full px-3 py-1 text-xs font-medium text-pine-600 hover:bg-pine-50 dark:hover:bg-pine-500/10"
              >
                استعادة
              </button>
            </li>
          ))}
        </ul>
      )}
    </div>
  )
}
