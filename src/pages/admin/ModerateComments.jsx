import { useEffect, useState } from 'react'
import { supabase } from '../../lib/supabaseClient'
import { formatDate } from '../../utils/formatDate'
import LoadingSpinner from '../../components/LoadingSpinner'

function CommentRow({ comment, busy, onApprove, onDelete }) {
  return (
    <div className="rounded-2xl border border-stone-200/80 bg-white p-4 shadow-sm">
      <div className="mb-2 flex flex-wrap items-center justify-between gap-2">
        <div>
          <p className="font-bold text-ink">{comment.author_name}</p>
          <p className="text-xs text-stone-400">
            {formatDate(comment.created_at)} · {comment.posts?.title || 'مقال محذوف'}
          </p>
        </div>
        <div className="flex shrink-0 gap-1">
          {onApprove && (
            <button
              type="button"
              disabled={busy}
              onClick={() => onApprove(comment)}
              className="rounded-full px-3 py-1.5 text-sm font-medium text-pine-600 transition-colors hover:bg-pine-50 disabled:opacity-50"
            >
              قبول
            </button>
          )}
          <button
            type="button"
            disabled={busy}
            onClick={() => onDelete(comment)}
            className="rounded-full px-3 py-1.5 text-sm font-medium text-red-500 transition-colors hover:bg-red-50 disabled:opacity-50"
          >
            حذف
          </button>
        </div>
      </div>
      <p className="whitespace-pre-wrap text-sm text-stone-600">{comment.content}</p>
    </div>
  )
}

export default function ModerateComments() {
  const [comments, setComments] = useState([])
  const [loading, setLoading] = useState(true)
  const [busyId, setBusyId] = useState(null)

  async function loadComments() {
    setLoading(true)
    const { data } = await supabase
      .from('comments')
      .select('*, posts(title)')
      .order('created_at', { ascending: false })
    setComments(data || [])
    setLoading(false)
  }

  useEffect(() => {
    loadComments()
  }, [])

  async function approve(comment) {
    setBusyId(comment.id)
    const { error } = await supabase
      .from('comments')
      .update({ is_approved: true })
      .eq('id', comment.id)
    if (!error) {
      setComments((prev) =>
        prev.map((c) => (c.id === comment.id ? { ...c, is_approved: true } : c))
      )
    }
    setBusyId(null)
  }

  async function remove(comment) {
    if (!window.confirm('حذف هذا التعليق نهائياً؟')) return
    setBusyId(comment.id)
    const { error } = await supabase.from('comments').delete().eq('id', comment.id)
    if (!error) {
      setComments((prev) => prev.filter((c) => c.id !== comment.id))
    }
    setBusyId(null)
  }

  if (loading) {
    return <LoadingSpinner label="جارٍ تحميل التعليقات..." />
  }

  const pending = comments.filter((c) => !c.is_approved)
  const approved = comments.filter((c) => c.is_approved)

  return (
    <div>
      <h1 className="font-display mb-6 text-2xl font-medium text-ink sm:text-3xl">التعليقات</h1>

      {comments.length === 0 && <p className="text-stone-400">لا توجد تعليقات بعد.</p>}

      {pending.length > 0 && (
        <section className="mb-8">
          <h2 className="mb-3 text-sm font-bold text-gold-600">
            بانتظار الموافقة ({pending.length})
          </h2>
          <div className="space-y-3">
            {pending.map((comment) => (
              <CommentRow
                key={comment.id}
                comment={comment}
                busy={busyId === comment.id}
                onApprove={approve}
                onDelete={remove}
              />
            ))}
          </div>
        </section>
      )}

      {approved.length > 0 && (
        <section>
          <h2 className="mb-3 text-sm font-bold text-stone-400">المنشورة ({approved.length})</h2>
          <div className="space-y-3">
            {approved.map((comment) => (
              <CommentRow
                key={comment.id}
                comment={comment}
                busy={busyId === comment.id}
                onDelete={remove}
              />
            ))}
          </div>
        </section>
      )}
    </div>
  )
}
