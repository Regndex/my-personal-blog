import { useEffect, useState } from 'react'
import { supabase } from '../lib/supabaseClient'
import { formatDate } from '../utils/formatDate'

export default function CommentSection({ postId }) {
  const [comments, setComments] = useState([])
  const [loading, setLoading] = useState(true)
  const [name, setName] = useState('')
  const [content, setContent] = useState('')
  const [submitting, setSubmitting] = useState(false)
  const [error, setError] = useState(null)
  const [justSubmitted, setJustSubmitted] = useState(false)

  useEffect(() => {
    let isMounted = true

    async function loadComments() {
      const { data } = await supabase
        .from('comments')
        .select('*')
        .eq('post_id', postId)
        .order('created_at', { ascending: true })

      if (isMounted) {
        setComments(data || [])
        setLoading(false)
      }
    }

    loadComments()
    return () => {
      isMounted = false
    }
  }, [postId])

  async function handleSubmit(event) {
    event.preventDefault()
    setError(null)

    if (!name.trim() || !content.trim()) {
      setError('الاسم والتعليق حقلان مطلوبان')
      return
    }

    setSubmitting(true)
    try {
      const { error: insertError } = await supabase.from('comments').insert({
        post_id: postId,
        author_name: name.trim(),
        content: content.trim(),
        is_approved: false,
      })
      if (insertError) throw insertError

      setName('')
      setContent('')
      setJustSubmitted(true)
    } catch (err) {
      setError('تعذر إرسال التعليق: ' + err.message)
    } finally {
      setSubmitting(false)
    }
  }

  return (
    <section className="mt-14 border-t border-stone-200 pt-10">
      <h2 className="font-display mb-6 text-xl font-medium text-ink">
        التعليقات{!loading && comments.length > 0 ? ` (${comments.length})` : ''}
      </h2>

      {!loading && comments.length === 0 && (
        <p className="mb-8 text-sm text-stone-400">لا توجد تعليقات بعد — كن أول من يعلّق.</p>
      )}

      {comments.length > 0 && (
        <div className="mb-10 space-y-4">
          {/* Comment text is rendered as plain text on purpose — unlike post
              content, this is untrusted visitor input, never Markdown/HTML. */}
          {comments.map((comment) => (
            <div key={comment.id} className="rounded-2xl border border-stone-200/70 bg-white p-4">
              <div className="mb-1.5 flex items-baseline gap-2">
                <span className="text-sm font-bold text-ink">{comment.author_name}</span>
                <span className="text-xs text-stone-400">{formatDate(comment.created_at)}</span>
              </div>
              <p className="whitespace-pre-wrap text-sm leading-relaxed text-stone-600">
                {comment.content}
              </p>
            </div>
          ))}
        </div>
      )}

      {justSubmitted ? (
        <div className="rounded-xl border border-pine-100 bg-pine-50 px-4 py-3 text-sm text-pine-700">
          شكراً لك! تعليقك بانتظار المراجعة وسيظهر بعد الموافقة عليه.
        </div>
      ) : (
        <form
          onSubmit={handleSubmit}
          className="space-y-4 rounded-2xl border border-stone-200/80 bg-white p-5"
        >
          <h3 className="text-sm font-bold text-ink">أضف تعليقاً</h3>
          <input
            type="text"
            value={name}
            onChange={(event) => setName(event.target.value)}
            placeholder="اسمك"
            className="w-full rounded-xl border border-stone-200 px-4 py-2.5 text-sm text-ink transition focus:border-pine-400 focus:outline-none focus:ring-2 focus:ring-pine-500/30"
          />
          <textarea
            value={content}
            onChange={(event) => setContent(event.target.value)}
            placeholder="اكتب تعليقك..."
            rows={3}
            className="w-full resize-y rounded-xl border border-stone-200 px-4 py-2.5 text-sm text-ink transition focus:border-pine-400 focus:outline-none focus:ring-2 focus:ring-pine-500/30"
          />
          {error && <p className="text-sm text-red-600">{error}</p>}
          <button
            type="submit"
            disabled={submitting}
            className="rounded-full bg-pine-500 px-5 py-2.5 text-sm font-medium text-paper transition-colors hover:bg-pine-600 disabled:cursor-not-allowed disabled:bg-stone-300"
          >
            {submitting ? 'جارٍ الإرسال...' : 'إرسال التعليق'}
          </button>
        </form>
      )}
    </section>
  )
}
